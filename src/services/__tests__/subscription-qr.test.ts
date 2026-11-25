import crypto from 'crypto';
import { Request, Response } from 'express';
import { PaymentController } from '../../api/controllers/payment.controller';
import { HttpHelper } from '../../utils/http.util';
import { payuConfig } from '../../config/payu.config';

jest.mock('../../utils/http.util');

const siDetails = {
  billingAmount: '10.00', billingCurrency: 'INR', billingCycle: 'MONTHLY',
  billingInterval: 1, paymentStartDate: '2026-11-05', paymentEndDate: '2027-11-05',
};
const details = {
  amount: '10.00', productinfo: 'Subscription', firstname: 'Test',
  email: 'test@example.com', phone: '9876543210', siDetails,
};
function request(body: unknown = details): Request {
  return { body, ip: '192.0.2.1', get: () => 'Test browser' } as unknown as Request;
}
function response(): Response {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
}

it('sends client context and signed mandate details to PayU and preserves the QR response', async () => {
  const payuResponse = { status: 1, result: { intentURIData: 'pa=merchant@upi&tr=test' } };
  jest.mocked(HttpHelper.postForm).mockResolvedValue(payuResponse);
  const res = response();
  await new PaymentController().generateQR(request(), res, jest.fn());
  const payload = jest.mocked(HttpHelper.postForm).mock.calls[0]![1];
  expect(payload).toMatchObject({
    s2s_client_ip: '192.0.2.1', s2s_device_info: 'Test browser',
    si: 1, si_details: JSON.stringify(siDetails), api_version: '7', bankcode: 'INTENT', txn_s2s_flow: 4,
  });
  const hashInput = [payuConfig.merchantKey, payload.txnid, details.amount, details.productinfo,
    details.firstname, details.email, ...Array(10).fill(''), JSON.stringify(siDetails), payuConfig.salt].join('|');
  expect(payload.hash).toBe(crypto.createHash('sha512').update(hashInput).digest('hex'));
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: payuResponse, txnid: payload.txnid });
});

it.each(['failed', 'failure', 0, '0'])('does not report success when PayU rejects the mandate: %s', async status => {
  const payuResponse = { status, result: null, error: 'EX087', message: 'Incorrect hash' };
  jest.mocked(HttpHelper.postForm).mockResolvedValue(payuResponse);
  const res = response();
  await new PaymentController().generateQR(request(), res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(502);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, data: payuResponse }));
});

it.each([{}, { ...details, amount: 0 }, { ...details, siDetails: null },
  { ...details, siDetails: {} }, { ...details, siDetails: { ...siDetails, billingInterval: 0 } }])(
  'rejects invalid mandate input before contacting PayU: %j', async body => {
    const res = response();
    await new PaymentController().generateQR(request(body), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(HttpHelper.postForm).not.toHaveBeenCalled();
  },
);

it('requires real request context before contacting PayU', async () => {
  const req = { body: details, get: () => undefined } as unknown as Request;
  const res = response();
  await new PaymentController().generateQR(req, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(400);
  expect(HttpHelper.postForm).not.toHaveBeenCalled();
});
