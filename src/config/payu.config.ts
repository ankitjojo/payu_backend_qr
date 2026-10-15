import { config } from './index';

export const payuConfig = {
  merchantKey: config.payu.merchantKey,
  salt: config.payu.salt,
  baseUrl: config.payu.baseUrl,

  // Specific endpoints
  endpoints: {
    paymentUrl: `${config.payu.baseUrl}/_payment`,
    apiUrl: `${config.payu.baseUrl}/merchant/postservice?form=2`, // For backend API calls
  },
};
