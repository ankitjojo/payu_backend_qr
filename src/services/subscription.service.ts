import crypto from 'crypto';
import { PayUService } from './payu.service';
import { PayUCommand } from '../core/enums/payu.enum';
import { PayUCommandResult } from '../core/interfaces/payu.interface';

type Body = Record<string, unknown>;

const newId = (prefix: string) => prefix + crypto.randomBytes(8).toString('hex');
const text = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

/** Keep only fields that have a value. Values are sent exactly as typed. */
const present = (obj: Body): Body =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => text(v) !== ''));

/** A seq number looks like a number -> send number, otherwise send the typed text. */
const seq = (v: unknown): unknown => (text(v) !== '' && !Number.isNaN(Number(v)) ? Number(v) : v);

/**
 * Builds var1 for each UPI subscription command from the form values as typed.
 * No validation. Blank requestId / txnid get a generated value so the call can still go out.
 */
export class SubscriptionService {
  constructor(private readonly payu: PayUService = new PayUService()) {}

  public checkMandateStatus(b: Body): Promise<PayUCommandResult> {
    const var1 = present({ authPayuId: b.authPayuId ?? b.authpayuid, requestId: text(b.requestId) || newId('REQ') });
    return this.payu.postCommand(PayUCommand.UPI_MANDATE_STATUS, JSON.stringify(var1));
  }

  public sendPreDebit(b: Body): Promise<PayUCommandResult> {
    const var1 = present({
      authpayuid: b.authpayuid,
      requestId: text(b.requestId) || newId('REQ'),
      debitDate: b.debitDate,
      amount: b.amount,
      mandateSeqNo: seq(b.mandateSeqNo),
      action: b.action,
    });
    return this.payu.postCommand(PayUCommand.PRE_DEBIT_SI, JSON.stringify(var1));
  }

  public executeRecurring(b: Body): Promise<PayUCommandResult> {
    const var1 = present({
      authpayuid: b.authpayuid,
      amount: b.amount,
      txnid: text(b.txnid) || newId('TxnSI'),
      phone: b.phone,
      email: b.email,
      mandateSeqNo: seq(b.mandateSeqNo),
      udf1: b.udf1,
      udf2: b.udf2,
      udf3: b.udf3,
      udf4: b.udf4,
      udf5: b.udf5,
    });
    return this.payu.postCommand(PayUCommand.SI_TRANSACTION, JSON.stringify(var1));
  }

  /** mode "range": var1 = from, var2 = to. Otherwise var1 = txnids joined with | */
  public verifyPayment(b: Body): Promise<PayUCommandResult> {
    if (b.mode === 'range') {
      return this.payu.postCommand(PayUCommand.GET_TRANSACTION_DETAILS, text(b.from), { var2: text(b.to) });
    }
    const list = Array.isArray(b.txnids) ? b.txnids.map(text) : text(b.txnids).split(/[\s,]+/);
    return this.payu.postCommand(PayUCommand.VERIFY_PAYMENT, list.filter(Boolean).join('|'));
  }
}
