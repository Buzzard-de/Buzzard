import type { AiAgent, TaskRequest, TaskResult } from "./types.js";

abstract class BaseAgent implements AiAgent {
  abstract id: string;
  abstract capabilities: string[];

  async execute(request: TaskRequest): Promise<TaskResult> {
    return {
      taskId: request.taskId,
      correlationId: request.correlationId,
      status: "SUCCESS",
      result: { agent: this.id, action: request.action, payload: request.payload },
      evidence: []
    };
  }
}

export class CustomerAgent extends BaseAgent {
  id = "customer-ai";
  capabilities = ["IDENTIFY_CUSTOMER"];
}

export class OrderAgent extends BaseAgent {
  id = "order-ai";
  capabilities = ["GET_ORDER", "CHANGE_ORDER", "CANCEL_ORDER"];
}

export class ProductAgent extends BaseAgent {
  id = "product-ai";
  capabilities = ["GET_PRODUCT", "CHECK_VARIANT"];
}

export class InventoryAgent extends BaseAgent {
  id = "inventory-ai";
  capabilities = ["CHECK_AVAILABILITY"];
}

export class SupplierAgent extends BaseAgent {
  id = "supplier-ai";
  capabilities = ["CHECK_SUPPLIER", "REQUEST_SUPPLIER_ACTION"];
}

export class ReturnsAgent extends BaseAgent {
  id = "returns-ai";
  capabilities = ["CHECK_RETURN_POLICY", "CREATE_RETURN", "CREATE_EXCHANGE"];
}

export class PricingAgent extends BaseAgent {
  id = "pricing-ai";
  capabilities = ["CHECK_PRICE"];
}