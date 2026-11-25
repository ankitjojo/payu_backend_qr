import { Request, Response } from 'express';
import { SubscriptionService } from '../../services/subscription.service';
import { PayUCommandResult } from '../../core/interfaces/payu.interface';

type Step = 'mandateStatus' | 'preDebit' | 'recurringPayment' | 'verifyPayment';

/**
 * Pass-through test controller. No validation. Always replies 200 with
 * { step, command, sentAt, curl, request, response } where response is PayU's raw answer.
 */
export class SubscriptionController {
  constructor(private readonly service: SubscriptionService = new SubscriptionService()) {}

  private handle(step: Step, run: (body: Record<string, unknown>) => Promise<PayUCommandResult>) {
    return async (req: Request, res: Response) => {
      const sentAt = new Date().toISOString();
      try {
        const result = await run((req.body ?? {}) as Record<string, unknown>);
        res.status(200).json({ step, sentAt, ...result });
      } catch (err: any) {
        res.status(200).json({ step, sentAt, command: null, curl: '', request: null, response: { error: err?.message ?? 'Unexpected error' } });
      }
    };
  }

  public mandateStatus = this.handle('mandateStatus', b => this.service.checkMandateStatus(b));
  public preDebit = this.handle('preDebit', b => this.service.sendPreDebit(b));
  public recurringPayment = this.handle('recurringPayment', b => this.service.executeRecurring(b));
  public verifyPayment = this.handle('verifyPayment', b => this.service.verifyPayment(b));
}
