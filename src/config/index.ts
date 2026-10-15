import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  payu: {
    merchantKey: process.env.PAYU_MERCHANT_KEY || '',
    salt: process.env.PAYU_SALT || '',
    baseUrl: process.env.PAYU_BASE_URL || 'https://test.payu.in',
  },
  checkoutUrl: process.env.CHECKOUT_URL || `http://localhost:${process.env.PORT || '3000'}`,
};
