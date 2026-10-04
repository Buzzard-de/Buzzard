const crypto = require("crypto");
const { getFlags } = require("./flags");
const { CHANNELS, REQUEST_STATE, INTENTS, RISK, CONVERSATION_STATUS } = require("./constants");
const { classifyIntent, requiresHumanHandoff } = require("./intentEngine");
const { routeAgent } = require("./agentRegistry");
const { toolsForIntent, validateToolInput } = require("./toolRegistry");
const { canUseTool, DEFAULT_GRANTS } = require("./permissions");
const { detectPromptInjection, classifySecurityEvent, redactObject, containsSensitivePayment } = require("./securityGuard");
const conversations = require("./conversationManager");
const memory = require("./memoryManager");
const tasks = require("./taskManager");
const approvals = require("./approvalManager");
const exceptions = require("./exceptionManager");
const audit = require("./auditLogger");
const engines = require("./engineBridge");
const { checkLimit } = require("./rateLimit");
const cost = require("./costControl");
const { remember } = require("./idempotency");
const { retryRead } = require("./timeout");
const phone = require("./phoneSession");
const stt = require("./providers/stt");
const tts = require("./providers/tts");

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function buildPlan(intent) {
  if (intent === INTENTS.SEARCH_PRODUCT || intent === INTENTS.VEHICLE_LOOKUP) {
    return [
      "vehicle_identification",
      "compatibility_search",
      "supplier_stock_read",
      "price_comparison",
      "result_ranking",
    ];
  }
  return toolsForIntent(intent);
}

function userFacingError(code) {
  const map = {
    ORCHESTRATOR_DISABLED: "Der Assistent ist derzeit deaktiviert.",
    VOICE_DISABLED: "Ses hizmeti şu anda kullanılamıyor. Yazılı olarak devam edebilirsiniz.",
    PHONE_PROVIDER_NOT_CONFIGURED: "Telefon hizmeti yapılandırılmadı.",
    RATE_LIMITED: "Bitte versuchen Sie es in einem Moment erneut.",
    COST_LIMIT: "Die Anfragelimit wurde erreicht.",
  };
  return map[code] || "Die Anfrage konnte nicht abgeschlossen werden.";
}

function executeTool(name, input) {
  const schema = validateToolInput(name, input);
  if (!schema.ok && !["searchProducts", "getVehicleCompatibility"].includes(name)) {
    return schema;
  }
  switch (name) {
    case "searchProducts":
      return { ok: true, data: engines.searchCatalog(input.q || input.query) };
    case "getProduct":
      return engines.getProduct(input.id || input.productId);
    case "getPrice":
      return retryRead(() => engines.getPrice(input.productId || input.id));
    case "getStock":
      return retryRead(() => engines.getStock(input.productId || input.id));
    case "getVehicleCompatibility":
      return engines.lookupVehicle(input.query || input.q);
    case "getOrderStatus":
      return engines.getOrderStatus(input.orderId || input.id);
    case "getSupplierOffer":
      return engines.getSupplierOffers(input.sku);
    case "purchaseSupplierStock":
      return engines.blockSupplierPurchase({ customerOrderId: input.customerOrderId });
    case "createCartItem":
      return { ok: false, code: "CART_HANDOFF", message: "Cart mutations stay on the storefront cart API." };
    case "createOrder":
    case "cancelOrder":
    case "createReturn":
    case "requestRefund":
    case "initiatePhoneCall":
      return { ok: false, code: "APPROVAL_REQUIRED", tool: name };
    default:
      return { ok: false, code: "UNKNOWN_TOOL" };
  }
}

function formatSearchReply(language, search, prices, stock) {
  const items = search?.data?.items || search?.items || [];
  const names = items.slice(0, 3).map((item) => item.title || item.name || item.sku).filter(Boolean);
  if (!names.length) {
    return language === "tr"
      ? "Uygun ürün bulunamadı. Yıl veya motor bilgisi verebilir misiniz?"
      : language === "en"
        ? "I could not find matching parts. Do you know the year or engine?"
        : "Ich habe keine passenden Teile gefunden. Kennen Sie Baujahr oder Motor?";
  }
  const extras = [];
  if (prices?.[0]?.data?.amount != null) extras.push(`Preis lt. Pricing Engine`);
  if (stock?.[0]?.data?.saleable != null) extras.push(`Bestand lt. Inventory Engine`);
  const prefix =
    language === "tr"
      ? `Aracınıza uygun ${names.length} seçenek: `
      : language === "en"
        ? `I found ${names.length} matching option(s): `
        : `Passende Optionen: `;
  return `${prefix}${names.join("; ")}${extras.length ? ` (${extras.join(", ")})` : ""}.`;
}

async function handleRequest(input = {}) {
  const flags = getFlags();
  const requestId = input.requestId || newId("req");
  const traceId = input.traceId || requestId;
  const started = Date.now();
  const lifecycle = [REQUEST_STATE.RECEIVED];

  if (!flags.ORCHESTRATOR_ENABLED) {
    return {
      ok: false,
      code: "ORCHESTRATOR_DISABLED",
      message: userFacingError("ORCHESTRATOR_DISABLED"),
      requestId,
      state: REQUEST_STATE.FAILED,
    };
  }

  const limit = checkLimit({
    userId: input.userId,
    ip: input.ip,
    phone: input.phone,
    sessionId: input.sessionId,
    scope: input.channel || CHANNELS.TEXT,
  });
  if (!limit.allowed) {
    return { ok: false, code: "RATE_LIMITED", message: userFacingError("RATE_LIMITED"), requestId };
  }

  const budget = cost.withinLimits({ customerId: input.userId || "anon" });
  if (!budget.ok) {
    return { ok: false, code: budget.code, message: userFacingError("COST_LIMIT"), requestId };
  }

  if (input.idempotencyKey) {
    const replay = remember("orchestrator", input.idempotencyKey, { requestId });
    if (replay.duplicate) {
      return { ok: true, duplicate: true, requestId, result: replay.result };
    }
  }

  lifecycle.push(REQUEST_STATE.AUTHENTICATED);
  const channel = input.channel || CHANNELS.TEXT;
  const language = conversations.resolveLanguage(input.language || input.locale);
  let conversation = input.conversationId
    ? conversations.getConversation(input.conversationId)
    : null;
  if (!conversation) {
    conversation = conversations.createConversation({
      userId: input.userId,
      channel,
      language,
      sessionId: input.sessionId,
    });
  }

  let text = String(input.message || input.text || "").trim();
  if (!text && input.transcript) text = String(input.transcript);
  if (!text && (input.audio || input.testTranscript) && channel !== CHANNELS.TEXT) {
    const heard = await stt.transcribe({
      audio: input.audio,
      language,
      testTranscript: input.testTranscript,
      conversationId: conversation.id,
      customerId: input.userId,
    });
    if (!heard.ok) {
      return {
        ok: false,
        code: heard.code,
        message: userFacingError("VOICE_DISABLED"),
        requestId,
        conversationId: conversation.id,
      };
    }
    text = heard.transcript || heard.text;
    if (heard.language) {
      conversations.updateConversation(conversation.id, { language: heard.language });
    }
  }

  const injection = detectPromptInjection(text);
  const security = classifySecurityEvent(text);
  const classification = classifyIntent(text, { injectionDetected: injection.detected });
  lifecycle.push(REQUEST_STATE.CLASSIFIED);

  conversations.appendMessage(conversation.id, {
    role: "user",
    content: text,
    intent: classification.intent,
  });

  if (containsSensitivePayment(text)) {
    const handoff = phone.handoff({
      conversationId: conversation.id,
      locale: language,
      reason: "PAYMENT_SECRET",
      channel,
      extra: { intent: classification.intent, risk: RISK.CRITICAL, sessionId: input.sessionId, callId: input.callId },
    });
    audit.writeAudit({
      who: input.userId,
      what: "payment_secret_blocked",
      channel,
      agent: "esat_bey",
      result: "BLOCKED",
      risk: RISK.CRITICAL,
      approval: "REQUIRED",
      conversationId: conversation.id,
      requestId,
    });
    return {
      ok: true,
      requestId,
      conversationId: conversation.id,
      state: REQUEST_STATE.ESCALATED,
      intent: classification,
      reply: "Ödeme bilgilerini buraya yazmayın. Güvenli ödeme akışına aktarılıyorum.",
      handoff,
      security,
    };
  }

  const agent = routeAgent(classification.intent, { risk: classification.risk });
  lifecycle.push(REQUEST_STATE.AUTHORIZED);

  if (requiresHumanHandoff(classification) || classification.intent === INTENTS.HUMAN_AGENT_REQUEST) {
    const handoff = phone.handoff({
      conversationId: conversation.id,
      locale: language,
      reason: classification.intent,
      channel,
      extra: { intent: classification.intent, risk: classification.risk, sessionId: input.sessionId, callId: input.callId },
    });
    conversations.updateConversation(conversation.id, {
      status: CONVERSATION_STATUS.HANDOFF,
      intent: classification.intent,
      activeAgent: agent.id,
    });
    audit.writeAudit({
      who: input.userId,
      what: "human_handoff",
      channel,
      agent: agent.id,
      result: "HANDOFF",
      risk: classification.risk,
      conversationId: conversation.id,
      requestId,
    });
    return {
      ok: true,
      requestId,
      conversationId: conversation.id,
      state: REQUEST_STATE.ESCALATED,
      intent: classification,
      agent,
      reply: handoff.message,
      handoff,
      lifecycle,
    };
  }

  const plan = buildPlan(classification.intent);
  lifecycle.push(REQUEST_STATE.PLANNED);
  const task = tasks.createTask({
    type: classification.intent,
    owner: input.userId,
    agent: agent.id,
    conversationId: conversation.id,
    input: { text, channel },
  });

  const toolNames = toolsForIntent(classification.intent);
  const grants = input.grants || DEFAULT_GRANTS;
  const toolResults = [];

  for (const toolName of toolNames) {
    const perm = canUseTool(toolName, grants);
    if (!perm.allowed) {
      toolResults.push({ tool: toolName, ok: false, code: "UNAUTHORIZED_TOOL", permission: perm.permission });
      audit.writeAudit({
        who: input.userId,
        what: "tool_blocked",
        channel,
        agent: agent.id,
        tool: toolName,
        result: "BLOCKED",
        risk: perm.risk,
        conversationId: conversation.id,
        requestId,
      });
      if (perm.risk === RISK.HIGH || perm.risk === RISK.CRITICAL || approvals.mustApprove(toolName, perm.risk)) {
        conversations.updateConversation(conversation.id, {
          status: CONVERSATION_STATUS.FAILED,
          intent: classification.intent,
          activeAgent: agent.id,
        });
        return {
          ok: true,
          requestId,
          conversationId: conversation.id,
          state: REQUEST_STATE.FAILED,
          code: "UNAUTHORIZED_TOOL",
          intent: classification,
          agent,
          approval: approvals.mustApprove(toolName, perm.risk)
            ? approvals.requestApproval({
                tool: toolName,
                reason: "UNAUTHORIZED_OR_HIGH_RISK",
                risk: perm.risk,
                conversationId: conversation.id,
                requestId,
              })
            : null,
          reply:
            language === "tr"
              ? "Bu işlem için yetki veya insan onayı gerekir."
              : "This action is blocked without permission or human approval.",
          lifecycle,
        };
      }
      continue;
    }
    if (approvals.mustApprove(toolName, perm.risk) || classification.approval === "REQUIRED") {
      lifecycle.push(REQUEST_STATE.WAITING_APPROVAL);
      const approval = approvals.requestApproval({
        tool: toolName,
        reason: `${classification.intent} via ${toolName}`,
        risk: perm.risk,
        conversationId: conversation.id,
        requestId,
      });
      tasks.updateTask(task.id, { status: "WAITING_APPROVAL", output: approval });
      conversations.updateConversation(conversation.id, {
        status: CONVERSATION_STATUS.APPROVAL,
        intent: classification.intent,
        activeAgent: agent.id,
        activeTask: task.id,
      });
      audit.writeAudit({
        who: input.userId,
        what: toolName,
        channel,
        agent: agent.id,
        tool: toolName,
        result: "BLOCKED",
        risk: perm.risk,
        approval: "REQUIRED",
        conversationId: conversation.id,
        requestId,
      });
      return {
        ok: true,
        requestId,
        conversationId: conversation.id,
        state: REQUEST_STATE.WAITING_APPROVAL,
        intent: classification,
        agent,
        approval,
        reply:
          language === "tr"
            ? "Bu işlem insan onayı gerektiriyor."
            : language === "en"
              ? "This action requires human approval."
              : "Dieser Vorgang erfordert eine menschliche Freigabe.",
        lifecycle,
      };
    }

    lifecycle.push(REQUEST_STATE.EXECUTING);
    const priorSearch = toolResults.find((row) => row.tool === "searchProducts" && row.ok);
    const firstItem = priorSearch?.data?.items?.[0] || priorSearch?.data?.[0];
    const inferredId = input.productId || firstItem?.id || firstItem?.sku || firstItem?.productId;
    const result = executeTool(toolName, {
      q: text,
      query: text,
      productId: inferredId,
      id: inferredId || input.orderId,
      orderId: input.orderId,
      sku: input.sku || firstItem?.sku,
    });
    if (result && result.code === "APPROVAL_REQUIRED") {
      const approval = approvals.requestApproval({
        tool: toolName,
        reason: result.code,
        risk: perm.risk,
        conversationId: conversation.id,
        requestId,
      });
      return {
        ok: true,
        requestId,
        conversationId: conversation.id,
        state: REQUEST_STATE.WAITING_APPROVAL,
        approval,
        intent: classification,
        agent,
      };
    }
    toolResults.push({ tool: toolName, ...result });
  }

  lifecycle.push(REQUEST_STATE.VALIDATING);
  const search = toolResults.find((row) => row.tool === "searchProducts");
  const prices = toolResults.filter((row) => row.tool === "getPrice" && row.ok);
  const stock = toolResults.filter((row) => row.tool === "getStock" && row.ok);
  let reply = formatSearchReply(language, search, prices, stock);
  if (classification.intent === INTENTS.ORDER_STATUS) {
    const order = toolResults.find((row) => row.tool === "getOrderStatus");
    reply = order?.ok
      ? `Bestellstatus: ${order.data?.status || order.data?.id}`
      : language === "de"
        ? "Bitte Bestellnummer und E-Mail nennen."
        : "Please provide the order number.";
  }
  if (!toolNames.length) {
    reply =
      language === "de"
        ? "Wie kann ich Ihnen helfen — Produkt, Bestellung oder Support?"
        : "How can I help — product, order, or support?";
  }

  conversations.appendMessage(conversation.id, {
    role: "assistant",
    content: reply,
    intent: classification.intent,
    agent: agent.id,
  });
  memory.put({
    kind: memory.KINDS.CONVERSATION,
    ownerId: input.userId,
    conversationId: conversation.id,
    summary: `${classification.intent} ${reply}`.slice(0, 180),
    payload: { intent: classification.intent, tools: toolResults.map((row) => row.tool) },
  });
  tasks.updateTask(task.id, { status: "COMPLETED", output: { reply, tools: toolResults } });
  conversations.updateConversation(conversation.id, {
    status: CONVERSATION_STATUS.ACTIVE,
    intent: classification.intent,
    activeAgent: agent.id,
    activeTask: task.id,
    context: {
      language,
      lastIntent: classification.intent,
      vehicleHint: /bmw|audi|vw|mercedes/i.test(text) ? text.slice(0, 80) : null,
    },
  });
  cost.recordUsage({
    customerId: input.userId || "anon",
    conversationId: conversation.id,
    tokens: text.length,
  });
  audit.writeAudit({
    who: input.userId,
    what: classification.intent,
    channel,
    agent: agent.id,
    tool: toolNames[0],
    result: "COMPLETED",
    risk: classification.risk,
    approval: "NONE",
    conversationId: conversation.id,
    requestId,
  });

  let voice;
  if (channel !== CHANNELS.TEXT && flags.VOICE_ENABLED) {
    voice = await tts.synthesize({ text: reply, language });
  }

  return {
    ok: true,
    requestId,
    traceId,
    conversationId: conversation.id,
    sessionId: conversation.session_id,
    channel,
    language,
    state: REQUEST_STATE.COMPLETED,
    intent: classification,
    agent: redactObject(agent),
    plan,
    tools: toolResults,
    reply,
    voice,
    security,
    latencyMs: Date.now() - started,
    lifecycle,
  };
}

function dashboard() {
  const flags = getFlags();
  return {
    flags,
    conversations: require("../db")
      .db.prepare("SELECT COUNT(*) n FROM orch_conversations WHERE status IN ('NEW','ACTIVE','WAITING','APPROVAL','HANDOFF')")
      .get().n,
    voiceSessions: require("./voiceSession").listActive(),
    calls: require("./phoneSession").listActiveCalls(),
    handoffs: require("./phoneSession").listHandoffs(10),
    tasks: tasks.listTasks({ limit: 20 }),
    pendingApprovals: require("../db")
      .db.prepare("SELECT COUNT(*) n FROM core_approvals WHERE status = 'PENDING'")
      .get().n,
    exceptions: exceptions.listOpen(10),
    costs: cost.snapshot(),
    providers: {
      ai: require("./providers/ai").health(),
      stt: stt.health(),
      tts: tts.health(),
      telephony: require("./providers/telephony").health(),
      webrtc: require("./providers/webrtc").health(),
    },
    real: {
      stt: require("./providers/stt").configured() && require("./providers/stt").lastLiveSuccess(),
      tts: require("./providers/tts").configured() && require("./providers/tts").lastLiveSuccess(),
      phone: require("./providers/telephony").liveAllowed() && require("./providers/telephony").lastLiveSuccess(),
    },
  };
}

module.exports = {
  handleRequest,
  executeTool,
  dashboard,
  userFacingError,
  buildPlan,
};
