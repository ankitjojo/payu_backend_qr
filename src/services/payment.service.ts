import { PayUService } from './payu.service';
import { PayUSIDetails } from '../core/interfaces/payu.interface';
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
