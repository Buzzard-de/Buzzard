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

function runReasoning(lab) {
  const out = [];
  for (const c of cases()) {
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
    rate: passed / out.length,
    reasoningClaim: false,
    rows: out,
  };
}

module.exports = { cases, runReasoning };
