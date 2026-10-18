# Buzzard — Pusat Orchestrator Deep Audit

Date: 2026-10-16  
Mode: **READ-ONLY**. No code, commit, push, PR, deploy, sales, payments, or SoT change.  
HEAD: `b9d3ae835fdf0e31b1815dc577d6b98b07a1ce54`  
Branch: `cursor/software-completion-local-c293`

`handleRequest` **yoktur**. Ana yol: `submitTask` → `executeTask`.

Önceki genel “Pusat %92 / %95”: **ÖNCEKİ RAPOR DOĞRULANAMADI** (genel orchestrator skoru olarak). Register’da **92%** ve **95%** tek madde yüzdeleridir (ör. item ~53 HTTP `orchestrator_unreachable` keyed **92%**; item ~42 unique-race **95%**). Bunlar 21 maddelik band ortalaması değildir.

Tanımlı established-scope band **35–55** (üreteç: Pusat/ajan/görev): Σ Completion % = **1787** / 21 = **85.095… → 85.1%**. Bu, özgün 237 metni değil; ağırlıksız register aritmetiği. Orijinal kabul kriteri UNKNOWN.

Bu oturumda Yeni vitest **koşulmadı**. 16.10 tam denetimde aynı HEAD’de `pusatApprovalExceptions` + software suite **99 passed** (yeniden koşulmadı; bkz. verification raporu).

---

## 20 soru

1. **Ana giriş**  
   - Yazılım: `server/lib/pusat/index.js` → `submitTask` (`submit.js`), `executeTask` / `enqueueTask` (`lifecycle.js`).  
   - HTTP: `server/plugins/pusatPlugin.js` (`/api/health/pusat`, `/api/admin/pusat/*`).  
   - Eski sarmalayıcı: `server/lib/aiOrchestrator.js` `processTask` **Pusat `executeTask`’e delege** eder.  
   - İkinci, isteğe bağlı uzak: `server/lib/orchestratorBridge.js` (`BUZZARD_ORCHESTRATOR_URL` + `/health`). Varsayılan **yapılandırılmamış**.

2. **İstek alımı / yönlendirme**  
   Admin API veya `controlCenter.createAiTask` + `submitTask`. Sınıflama `agents.classifyAgent(title, payload)` (regex + `payload.agentCode`). HTTP müşteri sohbeti (`/api/ai/chat`) **Pusat `executeTask` çağırmaz**.

3. **`handleRequest`**  
   Repoda `function handleRequest` **yok**. **NOT_IMPLEMENTED** (bu isim).

4. **Görev sınıflandırması**  
   `agents.classifyAgent`: açık `agentCode`/`kind`, yoksa title/intent regex (price, stock, seo, …). Eşleşmezse **`aslan_bey`**. Meta: `core_ai_task_meta.classified_as` / `agent_code`.

5. **Yönlendirilebilen ajanlar**  
   18 `AGENT_CODES`: price, stock, seo, customer, sales, category, product, order, dogu_bey, esat_bey, aslan_bey, supplier, customs, returns, shipping, marketplace, localization, software_health. Hepsi `AGENT_BY_CODE` + `execute` bağlı (`specialistRosterStatus.complete` iddiası kodda).

6. **Gerçek işlev vs demo**  
   `executeAgent` her sonucu **`recommendationOnly: true`, `commercialSideEffects: false`, `liveMutations: false`** ile sarar. Motor okuma (fiyat formülü, stok evaluate, PIM validate) **yerel fonksiyon**; canlı LLM varsayılan **stub** (`aiProviders.js`: live HTTP yalnız key + `BUZZARD_AI_LIVE_PROBE=1`, ve `live: false` honesty). **Canlı ticari yan etki yok** (kod iddiası).

7. **Durum / sonuç deposu**  
   `core_ai_tasks` (controlCenter), `core_ai_task_meta` (idempotency, hash, timeout, agent), exception tabloları (`exceptions.js`).

8. **Central AI Memory**  
   `pusat/memory.js`; `executeTask` RUNNING ve COMPLETED yazarı. Ajanlar `remember()`. Guardian/policy reject hassas anahtarlar. **Entegre, yerel SQLite.** Uzak bellek yok.

9. **Guardian her önemli görevde?**  
   **`executeTask` içinde evet** — `guardian.evaluate` ajan çalışmadan önce. **Hayır** her HTTP için: checkout, phone JSON, webhooks Pusat’tan geçmez. Remote Python Guardian: **health sinyali** (`guardian.js` başlık).

10. **HAC neyi durdurur?**  
    `gate.requireApproval` veya `payload.requiresApproval` veya `priority === CRITICAL` → `WAITING_APPROVAL`; `consumeForExecution` action bağları. Self-approve yasak (`approval.js`). Hassas liste: `SENSITIVE_ACTIONS` (ödeme, PO, publish, müşteri mesajı, …).

11. **Onaysız hassas işlem?**  
    Pusat yoluyla: SENSITIVE + CRITICAL onay ister; Guardian dangerous pattern / izin fail-closed. **Risk:** `action` string listede yoksa onay atlanabilir. **Ticaret HTTP** (sipariş) ayrı `salesGuard` — satış kapalı. **`/api/ai/phone/*` public** Pusat/HAC dışı.

12. **Hata / istisna**  
    `exceptions.handleFailure`, sınıflama, `publicTaskError`. Guardian throw → deny.

13. **Retry, timeout, idempotency**  
    Timeout: `withTimeout`, `timeout_at`. Retry: `RETRY_BACKOFF_MS`, `max_retries`; **SENSITIVE_ACTIONS retry yok**. Idempotency: `submit.js` `idempotency_key` + input hash, 409 conflict.

14. **Log**  
    `controlCenter.recordSystemEvent` (`pusat.task.completed`), `securityLog` Guardian deny, `[pusat.lifecycle]` enqueue hata (anahtar, mesaj sızıntısı sınırlı).

15. **Başarı / başarısızlık izi**  
    Task status COMPLETED/FAILED/WAITING_APPROVAL; `failureKind`; exception id; dead-letter. **Üretim gözlemi yok.**

16. **Dış servis**  
    Varsayılan bağlı **değil**. Uzak orch URL opsiyonel. LLM stub. Twilio/Realtime Pusat’a bağlı **değil**.

17. **Node vs Python**  
    **İki yığın:** (a) Node Pusat kanonik. (b) `orchestratorBridge` / intelligence FastAPI / `buzzard_ai_complete` — senkron **değil**. `CANONICAL_ENGINES` + `canonical.assertCanonicalOrchestrator` ikinci Node orchestrator iddiasını reddeder; Python ayrı opsiyonel.

18. **Üretimde çalıştığı kanıtı**  
    **Yok.** `/api/health/pusat` auth’lu; prod probe bu görevde yok. CI #430 boş.

19. **Yalnızca yerel test**  
    `pusatApprovalExceptions`, `pusatOrchestrator`, `pusatMemoryGuardian`, `pusatWorkerIntegration`, `pusatMasterCompletion`, softwareCompletion Guardian (16.10 **99** içinde bir kısmı; tam Pusat suite bu oturumda koşulmadı).

20. **Satış için kritik eksik**  
    Canlı LLM şart değil. Kritik: satış/ödeme/SoT insan kapıları, prod DB, siparişin Pusat dışı fail-closed kalması, action string kaçakları, phone JSON yetkisi, CI.

---

## Alt başlıklar

**Tamamlanan (yerel kod + birim test iddiası):** submit/classify/execute iskeleti; Guardian `evaluate` on execute; HAC consume+action; idempotency; timeout; circuit + money `FINANCIAL_BLOCKED`; memory write; 18 ajan execute bağları; `aiOrchestrator` delege.

**Kısmi:** ajanlar recommendation-only; remote orch; HTTP yüzeyinin bir kısmı Pusat dışı; Esat SOC yok.

**Eksik:** `handleRequest`; canlı LLM; telefon→Pusat; prod gözlem; Python senkronu.

**Güvenlik:** Pusat yolu fail-closed tasarım. Kaçaklar: Pusat’a girmeyen HTTP; public phone; `action` eşleşmezse HAC.

**Dış:** `BUZZARD_ORCHESTRATOR_URL`, LLM anahtarları (bu env yok / probe kapalı).

**İnsan:** CRITICAL/SENSITIVE onay; satış bayrakları.

**Üretim kanıtı:** yok.

**Öncelikli 10:**  
1. Tüm ticari mutation’ın Guardian/salesGuard’da kalması (regresyon test).  
2. Public `/api/ai/phone` yetkisi.  
3. `SENSITIVE_ACTIONS` vs gerçek `payload.action` denetimi.  
4. CI bu SHA.  
5. Prod `/api/health/pusat` (yetkili).  
6. Python URL’yi kapalı tut veya tek kanon belgele.  
7. LLM stub’u satışta zorunlu kıl.  
8. HAC gerçek insan bağlama.  
9. Memory PII/retention.  
10. Idempotency tüm para yolları (Pusat dışı payment zaten ayrı).

---

## Yüzde

| İddia | Sonuç |
| --- | --- |
| Genel Pusat %92 / %95 | **ÖNCEKİ RAPOR DOĞRULANAMADI** (madde skoru ≠ sistem skoru) |
| Band 35–55 established-scope | **1787/21 = 85.1%** (register; özgün metin yok) |
| Esat 227–237 | **921/11 = 83.73%** (ayrı popülasyon) |
| LIVE_VERIFIED orchestrator | **0** |

`handleRequest` yok. Satış/ödeme/SoT **kapalı**.
