export * from "./types.js";
export * from "./storage.js";
export * from "./audit.js";
export * from "./policy.js";
export * from "./personas.js";
export * from "./exceptions.js";
export * from "./agents.js";
export * from "./orchestrator.js";
export * from "./voice-session.js";

import { AuditService } from "./audit.js";
import { CustomerAgent, InventoryAgent, OrderAgent, ProductAgent, ReturnsAgent, SupplierAgent, PricingAgent } from "./agents.js";
import { ExceptionService } from "./exceptions.js";
import { Orchestrator } from "./orchestrator.js";
import { PolicyEngine } from "./policy.js";
import { createRuntimeStore } from "./storage.js";
import { VoiceSessionManager } from "./voice-session.js";

export function createPusatRuntime() {
  const store = createRuntimeStore();
  const audit = new AuditService(store);
  const policy = new PolicyEngine();
  const exceptions = new ExceptionService(store, audit);
  const orchestrator = new Orchestrator(store, audit, policy, exceptions);
  const voice = new VoiceSessionManager(store);

  [
    new CustomerAgent(),
    new OrderAgent(),
    new ProductAgent(),
    new InventoryAgent(),
    new SupplierAgent(),
    new ReturnsAgent(),
    new PricingAgent()
  ].forEach(agent => orchestrator.register(agent));

  return { store, audit, policy, exceptions, orchestrator, voice };
}