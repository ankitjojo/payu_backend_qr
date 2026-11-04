import { PayUService } from './payu.service';
import {
  PayUSIDetails,
  PayUOneTimeQRDetails,
  PayUUpiIntentRequest,
  PayUUpiIntentResult,
  PayUValidateVPAResponse,
} from '../core/interfaces/payu.interface';
import { buildUpiPaymentUri, detectDevice, getSupportedUpiApps } from '../utils/upi.util';
import { logger } from '../utils/logger.util';
import { config } from '../config/index';
import crypto from 'crypto';

export class PaymentService {
  private payuService: PayUService;

  constructor() {
    this.payuService = new PayUService();
  }

  /**
   * Initiates a new subscription mandate.
   * This would typically save the transaction to the database before calling PayU.
   */
  public initiateMandate(
    amount: string,
    productinfo: string,
    firstname: string,
    email: string,
    phone: string,
    siDetails: PayUSIDetails,
  ) {
    // Generate a unique transaction ID
    const txnid = 'Txn' + crypto.randomBytes(8).toString('hex');

    const surl = `${config.checkoutUrl}/api/payments/success`;
    const furl = `${config.checkoutUrl}/api/payments/failure`;

    const payload = this.payuService.generateMandatePayload(
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      siDetails,
    );

    // Normally: await this.repository.save({ txnid, status: 'pending', ... })

    return payload;
  }

  /**
   * Initiates either a one-time hosted checkout or a recurring mandate checkout.
   */
  public initiatePayment(
    amount: string,
    productinfo: string,
    firstname: string,
    email: string,
    phone: string,
    paymentType?: 'subscription' | 'one-time',
    siDetails?: PayUSIDetails,
  ) {
    const isSubscription = paymentType === 'subscription' || Boolean(siDetails);
    if (isSubscription && siDetails) {
      return this.initiateMandate(amount, productinfo, firstname, email, phone, siDetails);
    }

    const txnid = 'Txn' + crypto.randomBytes(8).toString('hex');
    const surl = `${config.checkoutUrl}/api/payments/success`;
    const furl = `${config.checkoutUrl}/api/payments/failure`;

    return this.payuService.generateOneTimePaymentPayload(
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
    );
  }

  /**
   * Validates a UPI VPA string both locally via format check and via PayU postservice API.
   */
  public async validateVPA(vpa: string) {
    const trimmed = (vpa || '').trim();
    const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/;

    if (!trimmed || !vpaRegex.test(trimmed)) {
      return {
        isValid: false,
        vpa: trimmed,
        message: 'Invalid VPA format. Format must be handle@bank (e.g. success@ybl or user@okhdfcbank)',
      };
    }

    try {
      const response = (await this.payuService.validateVPA(trimmed)) as
        | Partial<PayUValidateVPAResponse>
        | Record<string, any>
        | undefined;

      const rawFlag = response?.isVPAValid ?? response?.isVpaValid;
      const vpaFlag: number | undefined =
        typeof rawFlag === 'number'
          ? rawFlag
          : typeof rawFlag === 'string' && rawFlag.trim() !== ''
            ? Number(rawFlag)
            : undefined;

      const isVpaValid = vpaFlag === 1;

      const payerAccountName =
        response?.payerAccountName && response.payerAccountName !== 'NA'
          ? String(response.payerAccountName)
          : null;

      let message = response?.msg;
      if (!message) {
        if (isVpaValid) {
          message = payerAccountName
            ? `VPA verified for ${payerAccountName}`
            : 'VPA is valid and verified';
        } else if (vpaFlag === 0) {
          message = 'VPA handle does not exist or was rejected by bank';
        } else {
          message = 'VPA could not be verified by provider';
        }
      }

      return {
        isValid: isVpaValid,
        vpa: trimmed,
        payerAccountName,
        message,
        raw: response,
      };
    } catch (err: any) {
      logger.warn(`PayU validateVPA command failed: ${err.message}. Format check passed.`);
      return {
        isValid: true,
        vpa: trimmed,
        message: 'VPA format is valid (provider verification skipped or offline)',
      };
    }
  }

  /**
   * Unified UPI collect handler supporting both one-time collect and recurring mandate collect.
   */
  public async generateUpiCollect(params: {
    amount: string;
    productinfo: string;
    firstname: string;
    email: string;
    phone: string;
    vpa: string;
    paymentType?: 'subscription' | 'one-time';
    siDetails?: PayUSIDetails;
  }) {
    const isSubscription = params.paymentType === 'subscription' || Boolean(params.siDetails);
    const txnid = (isSubscription ? 'TxnUPIM' : 'TxnUPI') + crypto.randomBytes(8).toString('hex');
    const surl = `${config.checkoutUrl}/api/payments/success`;
    const furl = `${config.checkoutUrl}/api/payments/failure`;

    let payuResponse: any;
    if (isSubscription && params.siDetails) {
      payuResponse = await this.payuService.generateUpiCollectS2S(
        txnid,
        params.amount,
        params.productinfo,
        params.firstname,
        params.email,
        params.phone,
        params.vpa,
        surl,
        furl,
        params.siDetails,
      );
    } else {
      payuResponse = await this.payuService.generateOneTimeUpiCollectS2S(
        txnid,
        params.amount,
        params.productinfo,
        params.firstname,
        params.email,
        params.phone,
        params.vpa,
        surl,
        furl,
      );
    }

    return {
      txnid,
      vpa: params.vpa,
      paymentType: isSubscription ? 'subscription' : 'one-time',
      payuResponse,
    };
  }

  /**
   * Initiates a new subscription mandate using QR code.
   */
  public async generateQRMandate(
    amount: string,
    productinfo: string,
    firstname: string,
    email: string,
    phone: string,
    siDetails: PayUSIDetails,
  ) {
    const txnid = 'TxnQR' + crypto.randomBytes(8).toString('hex');

    const surl = `${config.checkoutUrl}/api/payments/success`;
    const furl = `${config.checkoutUrl}/api/payments/failure`;

    const result = await this.payuService.generateQRMandateS2S(
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      siDetails,
    );

    return { txnid, payuResponse: result };
  }

  public async generateOneTimeQR(details: PayUOneTimeQRDetails) {
    const txnid = 'TxnQR' + crypto.randomBytes(8).toString('hex');
    const result = await this.payuService.generateOneTimeQRS2S(
      txnid,
      details,
      `${config.checkoutUrl}/api/payments/success`,
      `${config.checkoutUrl}/api/payments/failure`,
    );
    return { txnid, payuResponse: result };
  }

  public async generateUpiIntent(request: PayUUpiIntentRequest): Promise<PayUUpiIntentResult> {
    const isSubscription = request.paymentType === 'subscription' || Boolean(request.siDetails);
    const txnid = (isSubscription ? 'TxnINTM' : 'TxnINT') + crypto.randomBytes(8).toString('hex');
    const surl = `${config.checkoutUrl}/api/payments/success`;
    const furl = `${config.checkoutUrl}/api/payments/failure`;

    let payuResponse: any;
    if (isSubscription && request.siDetails) {
      payuResponse = await this.payuService.generateQRMandateS2S(
        txnid,
        request.amount,
        request.productinfo,
        request.firstname,
        request.email,
        request.phone,
        surl,
        furl,
        request.siDetails,
      );
    } else {
      payuResponse = await this.payuService.generateOneTimeQRS2S(
        txnid,
        {
          amount: request.amount,
          productinfo: request.productinfo,
          firstname: request.firstname,
          email: request.email,
          phone: request.phone,
          s2s_client_ip: request.s2s_client_ip,
          s2s_device_info: request.s2s_device_info,
        },
        surl,
        furl,
      );
    }

    const rawIntent =
      payuResponse && typeof payuResponse === 'object' && payuResponse.result
        ? payuResponse.result.intentURIData ||
          payuResponse.result.intentUrl ||
          payuResponse.result.qrString
        : null;

    const intentUri = rawIntent ? buildUpiPaymentUri(rawIntent) : null;
    const device = detectDevice(request.s2s_device_info);
    const supportedApps = intentUri ? getSupportedUpiApps(intentUri, request.s2s_device_info) : [];

    return {
      txnid,
      paymentType: isSubscription ? 'subscription' : 'one-time',
      intentUri,
      supportedApps,
      device,
      payuResponse,
    };
  }

  public async generateUpiCollectMandate(
    amount: string,
    productinfo: string,
    firstname: string,
    email: string,
    phone: string,
    vpa: string,
    siDetails: PayUSIDetails,
  ) {
    const txnid = 'TxnUPI' + crypto.randomBytes(8).toString('hex');

    const surl = `${config.checkoutUrl}/api/payments/success`;
    const furl = `${config.checkoutUrl}/api/payments/failure`;

    const result = await this.payuService.generateUpiCollectS2S(
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      vpa,
      surl,
      furl,
      siDetails,
    );

    return { txnid, payuResponse: result };
  }

  public async verifyPayment(txnid: string) {
    return await this.payuService.verifyTransaction(txnid);
  }
}
