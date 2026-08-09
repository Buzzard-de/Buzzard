export interface CustomerSupportStatus {
  version: string;
  enabled: boolean;
  totals: {
    tickets: number;
    openTickets: number;
    ticketMessages: number;
    trackingEvents: number;
    supportTemplates: number;
    queuedNotifications: number;
  };
}

export interface SupportTicket {
  id: number;
  ticket_number: string;
  user_id?: number;
  order_number?: string | null;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id?: number | null;
  sender_type: string;
  message: string;
  created_at: string;
}

export interface TrackingEvent {
  id: number;
  order_number: string;
  carrier?: string;
  tracking_number?: string;
  status: string;
  location?: string;
  event_time?: string;
  created_at: string;
}

export interface SupportTemplate {
  id: number;
  title: string;
  body: string;
  active: number;
}

export interface OrderTrackingTimeline {
  orderNumber: string;
  events: TrackingEvent[];
}
