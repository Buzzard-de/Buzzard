export interface AiChatProduct {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  price?: number;
  url: string;
  imageKey?: string;
}

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatResponse {
  success: boolean;
  sessionId: string;
  reply: string;
  intent?: string;
  escalate?: boolean;
  products?: AiChatProduct[];
  order?: {
    orderNumber: string;
    status: string;
    trackingNumber: string | null;
    trackingCarrier: string | null;
  } | null;
  rtl?: boolean;
  errorKey?: string;
}

export interface AiRecommendation {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  price?: number;
  url: string;
  imageKey?: string;
}

export interface AutomationEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
  status: string;
}

export interface AutomationStats {
  total: number;
  byType: Record<string, number>;
  deliveries: number;
}
