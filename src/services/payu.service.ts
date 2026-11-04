import { payuConfig } from '../config/payu.config';
import { PayUMandateRequest, PayUSIDetails, PayUOneTimeQRDetails } from '../core/interfaces/payu.interface';
import { generateHashForPayment, generateHashForCommand } from '../utils/hash.util';
import { HttpHelper } from '../utils/http.util';
import { PayUCommand } from '../core/enums/payu.enum';
import { logger } from '../utils/logger.util';

export class PayUService {
  /**
   * Generates the payload required to initiate a Zion Subscription Mandate setup
   * via Merchant Hosted Checkout.
   */
  public generateMandatePayload(
    txnid: string,
    amount: string,
    productinfo: string,
    firstname: string,
    email: string,
    phone: string,
    surl: string,
    furl: string,
    siDetails: PayUSIDetails,
  ) {
    const hash = generateHashForPayment(txnid, amount, productinfo, firstname, email);

    const payload: PayUMandateRequest = {
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      si: 1, // 1 for setting up standing instruction
      si_details: JSON.stringify(siDetails),
    };

    return {
      url: payuConfig.endpoints.paymentUrl,
      key: payuConfig.merchantKey,
      hash,
      ...payload,
    };
  }

  /**
   * Generates the payload required to initiate a Zion Subscription Mandate setup
   * via Merchant Hosted Checkout using UPI QR.
   */
  public async generateQRMandateS2S(
    txnid: string,
    amount: string,
    productinfo: string,
    firstname: string,
    email: string,
    phone: string,
    surl: string,
    furl: string,
    siDetails: PayUSIDetails,
  ): Promise<any> {
    const siDetailsStr = JSON.stringify(siDetails);
    console.log({siDetailsStr});
    const hash = generateHashForPayment(txnid, amount, productinfo, firstname, email, siDetailsStr);

    const payload: any = {
      key: payuConfig.merchantKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      si: 1, // 1 for setting up standing instruction
      si_details: siDetailsStr,
      pg: 'UPI',
      bankcode: 'INTENT',
      txn_s2s_flow: 4,
      api_version: '7',
      hash,
    };

    logger.info(`Generating S2S QR Mandate for txnid: ${txnid}`);
    return await HttpHelper.postForm(payuConfig.endpoints.paymentUrl, payload);
  }

  public async generateOneTimeQRS2S(
    txnid: string,
    details: PayUOneTimeQRDetails,
    surl: string,
    furl: string,
  ): Promise<unknown> {
    const { amount, productinfo, firstname, email, phone, s2s_client_ip, s2s_device_info } = details;
    const payload = {
      key: payuConfig.merchantKey,
      txnid, amount, productinfo, firstname, email, phone, surl, furl,
      s2s_client_ip, s2s_device_info,
      pg: 'UPI',
      bankcode: 'INTENT',
      txn_s2s_flow: '4',
      // Use the default payment API hash sequence for this non-mandate request.
      // Do not inherit api_version=7 from the subscription integration.
      hash: generateHashForPayment(txnid, amount, productinfo, firstname, email),
    };
    return HttpHelper.postForm(payuConfig.endpoints.paymentUrl, payload);
  }

  public async generateUpiCollectS2S(
    txnid: string,
    amount: string,
    productinfo: string,
    firstname: string,
    email: string,
    phone: string,
    vpa: string,
    surl: string,
    furl: string,
    siDetails: PayUSIDetails,
  ): Promise<any> {
    const siDetailsStr = JSON.stringify(siDetails);
    const hash = generateHashForPayment(txnid, amount, productinfo, firstname, email, siDetailsStr);

    const payload: any = {
      key: payuConfig.merchantKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      si: 1,
      si_details: siDetailsStr,
      pg: 'UPI',
      bankcode: 'UPI',
      vpa: vpa,
      txn_s2s_flow: 1,
      api_version: '7',
      hash,
    };

    logger.info(`Generating S2S UPI Collect Mandate for txnid: ${txnid} to VPA: ${vpa}`);
    return await HttpHelper.postForm(payuConfig.endpoints.paymentUrl, payload);
  }

  public async generateOneTimeUpiCollectS2S(
    txnid: string,
    amount: string,
    productinfo: string,
    firstname: string,
    email: string,
    phone: string,
    vpa: string,
    surl: string,
    furl: string,
  ): Promise<any> {
    const hash = generateHashForPayment(txnid, amount, productinfo, firstname, email);

    const payload: any = {
      key: payuConfig.merchantKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      pg: 'UPI',
      bankcode: 'UPI',
      vpa,
      txn_s2s_flow: 1,
      hash,
    };

    logger.info(`Generating S2S One-Time UPI Collect for txnid: ${txnid} to VPA: ${vpa}`);
    return await HttpHelper.postForm(payuConfig.endpoints.paymentUrl, payload);
  }

  public generateOneTimePaymentPayload(
    txnid: string,
    amount: string,
    productinfo: string,
    firstname: string,
    email: string,
    phone: string,
    surl: string,
    furl: string,
  ): Record<string, string> {
    const hash = generateHashForPayment(txnid, amount, productinfo, firstname, email);
    return {
      key: payuConfig.merchantKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      hash,
      service_provider: 'payu_paisa',
      url: payuConfig.endpoints.paymentUrl,
    };
  }

  /**
   * Validates a UPI VPA with PayU PostService API
   */
  public async validateVPA(vpa: string): Promise<any> {
    const command = PayUCommand.VALIDATE_VPA;
    const hash = generateHashForCommand(command, vpa);

    const data = {
      key: payuConfig.merchantKey,
      command,
      var1: vpa,
      hash,
    };

    logger.info(`Validating VPA with PayU: ${vpa}`);
    return await HttpHelper.postForm(payuConfig.endpoints.apiUrl, data);
  }

  /**
   * Verifies a transaction status with PayU
   */
  public async verifyTransaction(txnid: string): Promise<any> {
    const command = PayUCommand.VERIFY_PAYMENT;
    const hash = generateHashForCommand(command, txnid);

    const data = {
      key: payuConfig.merchantKey,
      command,
      var1: txnid,
      hash,
    };

    logger.info(`Verifying transaction: ${txnid}`);
    return await HttpHelper.postForm(payuConfig.endpoints.apiUrl, data);
  }
}
