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

export interface PayUOneTimeQRDetails {
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  s2s_client_ip: string;
  s2s_device_info: string;
}

export interface DeviceInfo {
  isMobile: boolean;
  os: 'android' | 'ios' | 'desktop' | 'other';
  browser: string;
}

export interface UpiAppInfo {
  id: string;
  name: string;
  shortName: string;
  packageName?: string | undefined;
  scheme: string;
  deepLink: string;
  androidIntent?: string | undefined;
  recommendedLaunchUrl: string;
  color: string;
  bgColor: string;
  isUniversal?: boolean | undefined;
}

export interface PayUUpiIntentRequest {
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  paymentType?: 'subscription' | 'one-time';
  siDetails?: PayUSIDetails;
  s2s_client_ip: string;
  s2s_device_info: string;
}

export interface PayUUpiIntentResult {
  txnid: string;
  paymentType: 'subscription' | 'one-time';
  intentUri: string | null;
  supportedApps: UpiAppInfo[];
  device: DeviceInfo;
  payuResponse: any;
}

export interface PayUValidateVPAResponse {
  status: string;
  vpa: string;
  isVPAValid: number; // 1 for valid, 0 for invalid
  isVpaValid?: number;
  payerAccountName?: string;
  msg?: string;
}

// ── UPI subscription S2S test operations (postservice commands) ──
/** What we sent to PayU, the Postman curl of it, and PayU's raw answer. */
export interface PayUCommandResult<T = any> {
  command: string;
  request: Record<string, string>; // key, command, var1, hash (no salt)
  curl: string;
  response: T;
}
