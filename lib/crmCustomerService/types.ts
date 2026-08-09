export interface CrmOverview {
  customers: number;
  activeCustomers: number;
  vip: number;
  openTickets: number;
  urgentTickets: number;
  slaRisk: number;
}

export interface CrmCustomerRow {
  id: number;
  external_user_id: number | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  country_code: string;
  language: string;
  segment: string;
  status: string;
  marketing_email: number;
  marketing_sms: number;
  created_at: string;
  updated_at: string;
}

export interface CrmTicketRow {
  id: number;
  ticket_number: string;
  customer_id: number | null;
  subject: string;
  category: string;
  priority: string;
  status: string;
  channel: string;
  assigned_agent: string | null;
  sla_due_at: string | null;
  order_number: string | null;
  created_at: string;
  updated_at: string;
  customer_email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface CrmCustomerServiceStatus {
  version: string;
  enabled: boolean;
  totals: {
    customers: number;
    activeCustomers: number;
    vip: number;
    openTickets: number;
    urgentTickets: number;
    slaRisk: number;
    events: number;
    messages: number;
  };
  overview: CrmOverview;
}
