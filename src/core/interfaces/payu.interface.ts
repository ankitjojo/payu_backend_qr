export interface PayUMandateRequest {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  si: number; // 1 for Standing Instruction
  si_details?: string; // JSON string for SI details
  user_credentials?: string;
  pg?: string;
  bankcode?: string;
}

export interface PayUSIDetails {
  billingAmount: string;
  billingCurrency: string;
  billingCycle: string; // e.g., 'MONTHLY', 'YEARLY'
  billingInterval: number; // e.g., 1
  paymentStartDate: string; // YYYY-MM-DD
  paymentEndDate: string; // YYYY-MM-DD
}
