import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';

export const paymentRoutes = Router();
const paymentController = new PaymentController();

// API to generate payload for PayU form submission
paymentRoutes.post('/initiate-mandate', paymentController.initiateMandate);

// API to generate QR payload for PayU
paymentRoutes.post('/generate-qr', paymentController.generateQR);
paymentRoutes.post('/generate-upi-collect', paymentController.generateUpiCollect);

// Webhook/Callback routes for PayU to post back the result
paymentRoutes.post('/success', paymentController.handleSuccess);
paymentRoutes.post('/failure', paymentController.handleFailure);

// API to manually verify a payment status
paymentRoutes.get('/verify/:txnid', paymentController.verifyPayment);

