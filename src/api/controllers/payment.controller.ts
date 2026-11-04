import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../../services/payment.service';
import { validateReverseHash } from '../../utils/hash.util';
import { detectDevice, getSupportedUpiApps } from '../../utils/upi.util';
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
      const { amount, productinfo, firstname, email, phone, paymentType, siDetails } = req.body;

      const payload = this.paymentService.initiatePayment(
        amount,
        productinfo,
        firstname,
        email,
        phone,
        paymentType,
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

  public generateOneTimeQR = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, productinfo, firstname, email, phone } = req.body ?? {};
      const amountString = typeof amount === 'number' ? String(amount) : amount;
      if (typeof amountString !== 'string' || !/^\d+(\.\d{1,2})?$/.test(amountString) ||
          !Number.isFinite(Number(amountString)) || Number(amountString) <= 0) {
        return res.status(400).json({ success: false, error: 'amount must be positive with at most two decimal places' });
      }
      if (![productinfo, firstname, email, phone].every(
        value => typeof value === 'string' && value.trim().length > 0 && !value.includes('|'),
      ) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[0-9]{7,15}$/.test(phone)) {
        return res.status(400).json({ success: false, error: 'Valid productinfo, firstname, email and phone are required' });
      }
      const deviceInfo = req.get('user-agent');
      if (!req.ip || !deviceInfo?.trim()) {
        return res.status(400).json({ success: false, error: 'Client IP and User-Agent are required' });
      }

      const payload = await this.paymentService.generateOneTimeQR({
        amount: amountString, productinfo, firstname, email, phone,
        s2s_client_ip: req.ip,
        s2s_device_info: deviceInfo,
      });
      const payuResponse = payload.payuResponse;
      if (payuResponse && typeof payuResponse === 'object' && 'status' in payuResponse &&
          ['failed', 'failure', '0'].includes(String(payuResponse.status).toLowerCase())) {
        return res.status(502).json({
          success: false,
          error: 'PayU rejected the QR payment request. See data for details.',
          data: payuResponse,
          txnid: payload.txnid,
        });
      }
      return res.status(200).json({ success: true, data: payload.payuResponse, txnid: payload.txnid });
    } catch (error) {
      next(error);
    }
  };

  public generateUpiIntent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, productinfo, firstname, email, phone, paymentType, siDetails } = req.body ?? {};
      const amountString = typeof amount === 'number' ? String(amount) : amount;
      if (
        typeof amountString !== 'string' ||
        !/^\d+(\.\d{1,2})?$/.test(amountString) ||
        !Number.isFinite(Number(amountString)) ||
        Number(amountString) <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: 'amount must be positive with at most two decimal places',
        });
      }
      if (
        ![productinfo, firstname, email, phone].every(
          value => typeof value === 'string' && value.trim().length > 0 && !value.includes('|'),
        ) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !/^\+?[0-9]{7,15}$/.test(phone)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Valid productinfo, firstname, email and phone are required',
        });
      }

      const deviceInfo = req.get('user-agent') || 'Mobile Web App';
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const payload = await this.paymentService.generateUpiIntent({
        amount: amountString,
        productinfo,
        firstname,
        email,
        phone,
        paymentType,
        siDetails,
        s2s_client_ip: clientIp,
        s2s_device_info: deviceInfo,
      });

      const payuResponse = payload.payuResponse;
      if (
        payuResponse &&
        typeof payuResponse === 'object' &&
        'status' in payuResponse &&
        ['failed', 'failure', '0'].includes(String(payuResponse.status).toLowerCase())
      ) {
        return res.status(502).json({
          success: false,
          error: 'PayU rejected the UPI intent request. See data for details.',
          data: payuResponse,
          txnid: payload.txnid,
        });
      }

      return res.status(200).json({
        success: true,
        txnid: payload.txnid,
        paymentType: payload.paymentType,
        intentUri: payload.intentUri,
        device: payload.device,
        supportedApps: payload.supportedApps,
        data: payload.payuResponse,
      });
    } catch (error) {
      next(error);
    }
  };

  public getSupportedUpiApps = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const intent =
        typeof req.query.intent === 'string'
          ? req.query.intent
          : 'upi://pay?pa=demo@payu&pn=Merchant&am=1.00&cu=INR';
      const userAgent = req.get('user-agent') || '';
      const device = detectDevice(userAgent);
      const supportedApps = getSupportedUpiApps(intent, userAgent);

      return res.status(200).json({
        success: true,
        device,
        supportedApps,
      });
    } catch (error) {
      next(error);
    }
  };

  public validateVpa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vpa } = req.body ?? {};
      if (typeof vpa !== 'string' || !vpa.trim()) {
        return res.status(400).json({ success: false, error: 'A valid vpa string is required' });
      }
      const result = await this.paymentService.validateVPA(vpa);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public generateUpiCollect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, productinfo, firstname, email, phone, vpa, paymentType, siDetails } = req.body ?? {};
      const amountString = typeof amount === 'number' ? String(amount) : amount;
      if (
        typeof amountString !== 'string' ||
        !/^\d+(\.\d{1,2})?$/.test(amountString) ||
        !Number.isFinite(Number(amountString)) ||
        Number(amountString) <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: 'amount must be positive with at most two decimal places',
        });
      }

      if (
        ![productinfo, firstname, email, phone, vpa].every(
          val => typeof val === 'string' && val.trim().length > 0 && !val.includes('|'),
        ) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !/^\+?[0-9]{7,15}$/.test(phone)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Valid productinfo, firstname, email, phone, and vpa are required',
        });
      }

      // Validate VPA with PayU / format
      const vpaCheck = await this.paymentService.validateVPA(vpa);
      if (!vpaCheck.isValid) {
        return res.status(400).json({
          success: false,
          error: vpaCheck.message || 'Invalid VPA handle',
          vpaDetails: vpaCheck,
        });
      }

      const payload = await this.paymentService.generateUpiCollect({
        amount: amountString,
        productinfo,
        firstname,
        email,
        phone,
        vpa: vpa.trim(),
        paymentType,
        siDetails,
      });

      res.status(200).json({
        success: true,
        data: payload.payuResponse,
        txnid: payload.txnid,
        vpa: payload.vpa,
        paymentType: payload.paymentType,
        vpaValidation: vpaCheck,
      });
    } catch (error: any) {
      logger.error('Error generating UPI Collect: ' + error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        payuData: error.response?.data,
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
