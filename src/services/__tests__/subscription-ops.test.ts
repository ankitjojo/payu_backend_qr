import crypto from 'crypto';
import { Request, Response } from 'express';
import { SubscriptionController } from '../../api/controllers/subscription.controller';
import { HttpHelper } from '../../utils/http.util';
import { payuConfig } from '../../config/payu.config';

jest.mock('../../utils/http.util');

const ok = { status: 1, message: 'Request Processed Successfully' };

function req(body: unknown): Request {
  return { body } as unknown as Request;
}
function res(): Response {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
}
function sent() {
  const call = jest.mocked(HttpHelper.postForm).mock.calls[0]!;
  return { url: call[0], payload: call[1] as Record<string, string> };
}
function replyOf(r: Response) {
  expect(r.status).toHaveBeenCalledWith(200);
  return jest.mocked(r.json).mock.calls[0]![0] as any;
}
function expectedHash(command: string, var1: string) {
  return crypto
    .createHash('sha512')
    .update(`${payuConfig.merchantKey}|${command}|${var1}|${payuConfig.salt}`)
    .digest('hex');
}

let controller: SubscriptionController;
beforeEach(() => {
  controller = new SubscriptionController();
  jest.mocked(HttpHelper.postForm).mockResolvedValue(ok);
});

describe('① mandate status (upi_mandate_status)', () => {
  it('sends typed authPayuId, hashes the exact var1 and returns raw response + curl', async () => {
    const r = res();
    await controller.mandateStatus(req({ authPayuId: '25600438037', requestId: 'REQ1' }), r);
    const { payload } = sent();
    expect(payload.command).toBe('upi_mandate_status');
    expect(JSON.parse(payload.var1!)).toEqual({ authPayuId: '25600438037', requestId: 'REQ1' });
    expect(payload.hash).toBe(expectedHash('upi_mandate_status', payload.var1!));
    const out = replyOf(r);
    expect(out.response).toEqual(ok);
    expect(out.step).toBe('mandateStatus');
  });

  it('accepts authpayuid as the key too and generates requestId when blank', async () => {
    await controller.mandateStatus(req({ authpayuid: '1', requestId: '' }), res());
    const v = JSON.parse(sent().payload.var1!);
    expect(v.authPayuId).toBe('1');
    expect(v.requestId).toMatch(/^REQ[0-9a-f]{16}$/);
  });
});

describe('② pre-debit (pre_debit_SI)', () => {
  it('sends typed values, drops empty ones, numeric mandateSeqNo', async () => {
    await controller.preDebit(
      req({ authpayuid: '9', requestId: 'R', debitDate: '2026-12-01', amount: '1.00', mandateSeqNo: '2', action: '' }),
      res(),
    );
    const { payload } = sent();
    expect(payload.command).toBe('pre_debit_SI');
    expect(JSON.parse(payload.var1!)).toEqual({
      authpayuid: '9', requestId: 'R', debitDate: '2026-12-01', amount: '1.00', mandateSeqNo: 2,
    });
    expect(payload.hash).toBe(expectedHash('pre_debit_SI', payload.var1!));
  });
});

describe('③ recurring payment (si_transaction)', () => {
  it('sends udf fields only when typed and generates txnid when blank', async () => {
    await controller.recurringPayment(req({ authpayuid: '9', amount: '1.00', udf1: 'a', udf2: '' }), res());
    const { payload } = sent();
    const v = JSON.parse(payload.var1!);
    expect(payload.command).toBe('si_transaction');
    expect(v.udf1).toBe('a');
    expect(v).not.toHaveProperty('udf2');
    expect(v.txnid).toMatch(/^TxnSI[0-9a-f]{16}$/);
    expect(payload.hash).toBe(expectedHash('si_transaction', payload.var1!));
  });
});

describe('④ verify payment', () => {
  it('joins txnids with | for verify_payment', async () => {
    await controller.verifyPayment(req({ mode: 'txnid', txnids: 'a\nb\n c ' }), res());
    const { payload } = sent();
    expect(payload.command).toBe('verify_payment');
    expect(payload.var1).toBe('a|b|c');
    expect(payload.hash).toBe(expectedHash('verify_payment', 'a|b|c'));
  });

  it('range mode sends from as var1 and to as var2', async () => {
    await controller.verifyPayment(req({ mode: 'range', from: '2026-11-01', to: '2026-11-25' }), res());
    const { payload } = sent();
    expect(payload.command).toBe('get_Transaction_Details');
    expect(payload.var1).toBe('2026-11-01');
    expect(payload.var2).toBe('2026-11-25');
  });
});

describe('curl', () => {
  it('has url, headers and every sent field, never the salt', async () => {
    const r = res();
    await controller.mandateStatus(req({ authPayuId: "1'2", requestId: 'R' }), r);
    const { curl } = replyOf(r);
    const { payload } = sent();
    expect(curl).toContain(`curl --location '${payuConfig.endpoints.apiUrl}'`);
    expect(curl).toContain("--header 'Content-Type: application/x-www-form-urlencoded'");
    expect(curl).toContain(`--data-urlencode 'hash=${payload.hash}'`);
    expect(curl).toContain(`--data-urlencode 'key=${payuConfig.merchantKey}'`);
    expect(curl).toContain("1'\\''2"); // single quote escaped for the shell
    if (payuConfig.salt) expect(curl).not.toContain(payuConfig.salt);
  });
});

describe('no validation, always 200', () => {
  it('still sends garbage input to PayU', async () => {
    const r = res();
    await controller.preDebit(req({ authpayuid: 'abc', amount: '-5', debitDate: 'tomorrow', mandateSeqNo: 'x' }), r);
    expect(HttpHelper.postForm).toHaveBeenCalledTimes(1);
    replyOf(r);
    expect(JSON.parse(sent().payload.var1!)).toMatchObject({ amount: '-5', debitDate: 'tomorrow', mandateSeqNo: 'x' });
  });

  it('passes PayU failure through unchanged with HTTP 200', async () => {
    const failure = { status: 0, message: 'Mandate is not active' };
    jest.mocked(HttpHelper.postForm).mockResolvedValue(failure);
    const r = res();
    await controller.mandateStatus(req({ authPayuId: '1' }), r);
    expect(replyOf(r).response).toEqual(failure);
  });

  it('turns a thrown PayU/network error into the raw response', async () => {
    jest.mocked(HttpHelper.postForm).mockRejectedValue({ message: 'boom', response: { data: { msg: 'Invalid Hash.' } } });
    const r = res();
    await controller.verifyPayment(req({ txnids: 'x' }), r);
    expect(replyOf(r).response).toEqual({ msg: 'Invalid Hash.' });

    jest.mocked(HttpHelper.postForm).mockRejectedValue(new Error('network down'));
    const r2 = res();
    await controller.verifyPayment(req({ txnids: 'x' }), r2);
    expect(replyOf(r2).response).toEqual({ error: 'network down' });
  });

  it('handles an empty body', async () => {
    const r = res();
    await controller.mandateStatus({} as Request, r);
    replyOf(r);
  });
});
