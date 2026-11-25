import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';

export const subscriptionRoutes = Router();
const controller = new SubscriptionController();

subscriptionRoutes.post('/mandate-status', controller.mandateStatus);
subscriptionRoutes.post('/pre-debit', controller.preDebit);
subscriptionRoutes.post('/recurring-payment', controller.recurringPayment);
subscriptionRoutes.post('/verify-payment', controller.verifyPayment);
