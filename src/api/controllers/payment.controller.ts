import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../../services/payment.service';
import { validateReverseHash } from '../../utils/hash.util';
import { logger } from '../../utils/logger.util';
import fs from 'fs';
import path from 'path';
import { config } from '../../config';

const appendLogToFile = (data: any, type: 'success' | 'failure') => {
  const logFilePath = path.resolve(process.cwd(), 'payment_logs.json');
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    data
  };

  try {
    let logs: any[] = [];
    if (fs.existsSync(logFilePath)) {
      const fileContent = fs.readFileSync(logFilePath, 'utf8');
      if (fileContent) {
        logs = JSON.parse(fileContent);
      }
    }
    logs.push(logEntry);
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
  } catch (err) {
    logger.error('Failed to write log to file: ' + err);
  }
};

// In-memory store for recent transaction callback statuses (populated by PayU surl/furl callbacks)
const transactionStore = new Map<string, { status: string; data: any; timestamp: number }>();

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  public initiateMandate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, productinfo, firstname, email, phone, siDetails } = req.body;

      const payload = this.paymentService.initiateMandate(
        amount,
        productinfo,
        firstname,
        email,
        phone,
        siDetails,
      );

      res.status(200).json({
        success: true,
        data: payload,
      });
    } catch (error) {
      next(error);
    }
  };

  public generateQR = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, productinfo, firstname, email, phone, siDetails } = req.body;

      const payload = await this.paymentService.generateQRMandate(
        amount,
        productinfo,
        firstname,
        email,
        phone,
        siDetails,
      );

      res.status(200).json({
        success: true,
        data: payload.payuResponse,
        txnid: payload.txnid,
      });
    } catch (error: any) {
      logger.error('Error generating QR Mandate: ' + error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        payuData: error.response?.data,
      });
    }
  };

  public generateUpiCollect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, productinfo, firstname, email, phone, vpa, siDetails } = req.body;

      const payload = await this.paymentService.generateUpiCollectMandate(
        amount,
        productinfo,
        firstname,
        email,
        phone,
        vpa,
        siDetails,
      );

      res.status(200).json({
        success: true,
        data: payload.payuResponse,
        txnid: payload.txnid,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: error.message,
        payuData: error.response?.data
      });
    }
  };

  public handleSuccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, txnid, amount, productinfo, firstname, email, hash } = req.body;

      logger.info(`Received success callback for txnid: ${txnid}`);

      // Optional: Verify the reverse hash to ensure the response is authentically from PayU
      const isValid = validateReverseHash(
        String(status),
        String(txnid),
        String(amount),
        String(productinfo),
        String(firstname),
        String(email),
        String(hash),
      );

      if (!isValid) {
        logger.warn(`Hash validation failed for txnid: ${txnid}`);
        return res.status(400).send('Hash validation failed');
      }

      // Record status in-memory for instant frontend polling resolution
      transactionStore.set(String(txnid), {
        status: 'success',
        data: req.body,
        timestamp: Date.now(),
      });

      // Write log to payment_logs.json
      appendLogToFile(req.body, 'success');

      // Redirect user to the success confirmation page
      const qs = `?txnid=${encodeURIComponent(txnid)}&status=${encodeURIComponent(status)}&amount=${encodeURIComponent(amount)}`;
      res.redirect(`${config.checkoutUrl}/success${qs}`);
    } catch (error) {
      next(error);
    }
  };

  public handleFailure = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { txnid, error_Message } = req.body;
      logger.error(`Received failure callback for txnid: ${txnid}. Reason: ${error_Message}`);

      // Record failure in-memory
      transactionStore.set(String(txnid), {
        status: 'failure',
        data: req.body,
        timestamp: Date.now(),
      });

      // Write log to payment_logs.json
      appendLogToFile(req.body, 'failure');

      const qs = `?txnid=${encodeURIComponent(txnid)}&error=${encodeURIComponent(error_Message || 'Unknown error')}`;
      res.redirect(`${config.checkoutUrl}/failure${qs}`);
    } catch (error) {
      next(error);
    }
  };

  public verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { txnid } = req.params;
      const strTxnid = String(txnid);

      // 1. Check in-memory store from callback first (fastest)
      const cached = transactionStore.get(strTxnid);
      if (cached) {
        return res.status(200).json({
          success: true,
          status: cached.status,
          data: cached.data,
          source: 'callback',
        });
      }

      // 2. Query PayU verify_payment API directly
      const result = await this.paymentService.verifyPayment(strTxnid);
      
      let parsedStatus = 'pending';
      if (result && result.transaction_details && result.transaction_details[strTxnid]) {
        const details = result.transaction_details[strTxnid];
        parsedStatus = details.status || 'pending';
      }

      res.status(200).json({
        success: true,
        status: parsedStatus,
        data: result,
        source: 'payu_api',
      });
    } catch (error) {
      next(error);
    }
  };
}
