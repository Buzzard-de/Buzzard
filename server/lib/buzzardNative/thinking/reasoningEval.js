/**
 * Capability probes. Failures are recorded. This is not proof of reasoning.
 */
function cases() {
  return [
    { id: "A_tr", cat: "tr_lang", q: "Buzzard eğitim verisini", expect: "içeride", lang: "tr" },
    { id: "B_de", cat: "de_lang", q: "Buzzard behält die", expect: "Trainingsdaten", lang: "de" },
    { id: "C_en", cat: "en_lang", q: "This is not a general", expect: "purpose", lang: "en" },
    { id: "D_math", cat: "math", q: "Two plus two equals", expect: "four", lang: "en" },
    { id: "E_logic", cat: "logic", q: "If A then B. A is true. Therefore", expect: "B", lang: "en" },
    { id: "F_cond", cat: "conditional", q: "If secret data then", expect: "not train", lang: "en" },
    { id: "G_class", cat: "classify", q: "Customer data is", expect: "forbidden", lang: "en" },
    { id: "H_multi", cat: "multi_step", q: "analyze then report", expect: "report", lang: "en" },
    { id: "I_code", cat: "code", q: "function add(a,b){return", expect: "a+b", lang: "en" },
    { id: "J_contra", cat: "contradiction", q: "A is true and A is false", expect: "contradiction", lang: "en" },
    { id: "K_unknown", cat: "uncertainty", q: "What is the unpublished revenue of Buzzard?", expect: "unknown", lang: "en" },
  ];
}

function casesPhase6() {
  return [
    { id: "P6_tr_logic", cat: "tr_logic", q: "Yağmur yağıyorsa zemin ıslanır. Yağmur yağıyor. Sonuç:", expect: "ıslan", lang: "tr" },
    { id: "P6_de_logic", cat: "de_logic", q: "Wenn es regnet, wird die Straße nass. Es regnet. Folgerung:", expect: "nass", lang: "de" },
    { id: "P6_en_logic", cat: "en_logic", q: "All birds have wings. A sparrow is a bird. Therefore a sparrow", expect: "wings", lang: "en" },
    { id: "P6_math", cat: "math", q: "Seven minus three equals", expect: "four", lang: "en" },
    { id: "P6_cond", cat: "conditional", q: "If egress is DENY then openai.com is", expect: "blocked", lang: "en" },
    { id: "P6_multi", cat: "multi_step", q: "First tokenize, then plan, then report. The last step is", expect: "report", lang: "en" },
    { id: "P6_cmp", cat: "compare", q: "Which is larger, 9 or 4?", expect: "9", lang: "en" },
    { id: "P6_class", cat: "classify", q: "A supplier invoice is a", expect: "finance", lang: "en" },
    { id: "P6_contra", cat: "contradiction", q: "The door is open and the door is closed. That is a", expect: "contradiction", lang: "en" },
    { id: "P6_code", cat: "code", q: "const x = 1 + 1; x equals", expect: "2", lang: "en" },
    { id: "P6_unknown", cat: "uncertainty", q: "State the unpublished 2027 Buzzard profit in euros.", expect: "unknown", lang: "en" },
  ];
}

function score(lab, list) {
  const out = [];
  for (const c of list) {
    const gen = lab.generate(c.q, 12);
    const answer = gen.ok ? gen.text : "";
    const pass = answer.toLowerCase().includes(String(c.expect).toLowerCase());
    out.push({
      ...c,
      answer,
      pass,
      error: pass ? null : "string_match_failed_tiny_model_not_a_reasoner",
    });
  }
  const passed = out.filter((r) => r.pass).length;
  return {
    passed,
    total: out.length,
    rate: out.length ? passed / out.length : 0,
    reasoningClaim: false,
    rows: out,
  };
}

function runReasoning(lab) {
  return score(lab, cases());
}

function runReasoningPhase6(lab) {
  return { ...score(lab, casesPhase6()), heldOutFromTrain: true, phase5Reference: "1/11" };
}

module.exports = { cases, casesPhase6, runReasoning, runReasoningPhase6 };
