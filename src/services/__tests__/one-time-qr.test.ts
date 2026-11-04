import { PaymentService } from '../payment.service';
import { PaymentController } from '../../api/controllers/payment.controller';
import { HttpHelper } from '../../utils/http.util';
import crypto from 'crypto';
import { payuConfig } from '../../config/payu.config';
import { Request, Response } from 'express';

jest.mock('../../utils/http.util');

const details = {
  amount: '10.00', productinfo: 'Purchase', firstname: 'Test',
  email: 'test@example.com', phone: '9876543210',
  s2s_client_ip: '127.0.0.1', s2s_device_info: 'Test browser',
};

afterEach(() => jest.restoreAllMocks());

it('generates a one-time intent with a standard hash and no mandate fields', async () => {
  jest.mocked(HttpHelper.postForm).mockResolvedValue({ status: 1 });
  const result = await new PaymentService().generateOneTimeQR(details);
  const payload = jest.mocked(HttpHelper.postForm).mock.calls[0]![1];
  expect(payload).toMatchObject({ ...details, txnid: result.txnid, bankcode: 'INTENT', txn_s2s_flow: '4' });
  expect(payload).not.toHaveProperty('api_version');
  expect(payload).not.toHaveProperty('si');
  expect(payload).not.toHaveProperty('si_details');
  // Independent provider-contract assertion: ten empty UDF positions before salt.
  const hashInput = [payuConfig.merchantKey, result.txnid, details.amount,
    details.productinfo, details.firstname, details.email,
    ...Array(10).fill(''), payuConfig.salt].join('|');
  expect(payload.hash).toBe(crypto.createHash('sha512').update(hashInput).digest('hex'));
  expect(result.payuResponse).toEqual({ status: 1 });
});

function request(body: unknown): Request {
  return { body, ip: '127.0.0.1', get: () => 'Test browser' } as unknown as Request;
}
function response(): Response {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
}

it.each([undefined, {}, { ...details, amount: 0 }, { ...details, amount: '1.001' },
  { ...details, amount: 'Infinity' }, { ...details, email: 'invalid' }, { ...details, phone: {} }])(
  'rejects invalid payment input without calling PayU: %j', async body => {
    const service = jest.spyOn(PaymentService.prototype, 'generateOneTimeQR');
    const res = response();
    await new PaymentController().generateOneTimeQR(request(body), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(service).not.toHaveBeenCalled();
  },
);

it('returns the existing QR response shape and excludes caller-supplied mandate data', async () => {
  const service = jest.spyOn(PaymentService.prototype, 'generateOneTimeQR').mockResolvedValue({ txnid: 'test', payuResponse: { status: 1 } });
  const res = response();
  await new PaymentController().generateOneTimeQR(request({ ...details, siDetails: { billingAmount: 100 } }), res, jest.fn());
  expect(service).toHaveBeenCalledWith(details);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: { status: 1 }, txnid: 'test' });
});

it('forwards provider failures to the error middleware', async () => {
  const error = new Error('Provider unavailable');
  jest.spyOn(PaymentService.prototype, 'generateOneTimeQR').mockRejectedValue(error);
  const next = jest.fn();
  await new PaymentController().generateOneTimeQR(request(details), response(), next);
  expect(next).toHaveBeenCalledWith(error);
});


it.each(['failed', 'failure', 0, '0'])('reports PayU rejection as failure for status %s', async status => {
  const payuResponse = { result: null, status, error: 'EX087', message: 'Incorrect hash' };
  jest.spyOn(PaymentService.prototype, 'generateOneTimeQR').mockResolvedValue({ txnid: 'test', payuResponse });
  const res = response();
  await new PaymentController().generateOneTimeQR(request(details), res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(502);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    error: 'PayU rejected the QR payment request. See data for details.',
    data: payuResponse,
    txnid: 'test',
  });
});
