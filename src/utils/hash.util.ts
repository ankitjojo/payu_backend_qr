import crypto from 'crypto';
import { payuConfig } from '../config/payu.config';

/**
 * Generates a SHA-512 hash string.
 * @param hashString The string to hash
 * @returns The hashed string
 */
export const generateHash = (hashString: string): string => {
  const hash = crypto.createHash('sha512');
  hash.update(hashString);
  return hash.digest('hex');
};

/**
 * Generates the hash required for initiating a PayU transaction (including Zion Mandate).
 * The sequence for payment hash is: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
 */
export const generateHashForPayment = (
  txnid: string,
  amount: string,
  productinfo: string,
  firstname: string,
  email: string,
  si_details: string = '',
  udf1: string = '',
  udf2: string = '',
  udf3: string = '',
  udf4: string = '',
  udf5: string = '',
): string => {
  const { merchantKey, salt } = payuConfig;
  if (si_details) {
      const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${si_details}|${salt}`;
      return generateHash(hashString);
  } else {
      const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
      return generateHash(hashString);
  }
};

/**
 * Validates the hash received from PayU (reverse hash).
 * The sequence for reverse hash is: SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
 */
export const validateReverseHash = (
  status: string,
  txnid: string,
  amount: string,
  productinfo: string,
  firstname: string,
  email: string,
  receivedHash: string,
  udf1: string = '',
  udf2: string = '',
  udf3: string = '',
  udf4: string = '',
  udf5: string = '',
): boolean => {
  const { merchantKey, salt } = payuConfig;
  const hashString = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${merchantKey}`;
  const calculatedHash = generateHash(hashString);
  return calculatedHash === receivedHash;
};

/**
 * Generates hash for generic API commands (like verify_payment).
 * Formula: key|command|var1|salt
 */
export const generateHashForCommand = (command: string, var1: string): string => {
  const { merchantKey, salt } = payuConfig;
  const hashString = `${merchantKey}|${command}|${var1}|${salt}`;
  return generateHash(hashString);
};
