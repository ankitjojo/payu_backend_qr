import { PaymentService } from '../payment.service';
import { PaymentController } from '../../api/controllers/payment.controller';
import { HttpHelper } from '../../utils/http.util';
import { Request, Response } from 'express';

jest.mock('../../utils/http.util');

describe('UPI Intent Service and Controller', () => {
  afterEach(() => jest.restoreAllMocks());

  const mockDetails = {
    amount: '15.00',
    productinfo: 'Test Intent Payment',
    firstname: 'Rohan',
    email: 'rohan@example.com',
    phone: '9876543210',
    s2s_client_ip: '192.168.1.100',
    s2s_device_info:
      'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
  };

  it('generates one-time upi intent and returns supported apps list', async () => {
    jest.mocked(HttpHelper.postForm).mockResolvedValue({
      status: 1,
      result: {
        intentURIData: 'pa=payu@icici&pn=PayU&am=15.00&cu=INR&tr=TxnINT12345',
      },
    });

    const service = new PaymentService();
    const result = await service.generateUpiIntent({
      ...mockDetails,
      paymentType: 'one-time',
    });

    expect(result.paymentType).toBe('one-time');
    expect(result.txnid).toMatch(/^TxnINT/);
    expect(result.intentUri).toBe(
      'upi://pay?pa=payu%40icici&pn=PayU&am=15.00&cu=INR&tr=TxnINT12345',
    );
    expect(result.device.isMobile).toBe(true);
    expect(result.device.os).toBe('android');
    expect(result.supportedApps.length).toBeGreaterThan(5);

    const gpay = result.supportedApps.find(a => a.id === 'gpay');
    expect(gpay?.packageName).toBe('com.google.android.apps.nbu.paisa.user');
    expect(gpay?.recommendedLaunchUrl).toContain('intent://pay?');
  });

  it('generates mandate upi intent when siDetails are provided', async () => {
    jest.mocked(HttpHelper.postForm).mockResolvedValue({
      status: 1,
      result: {
        intentURIData: 'pa=payu@icici&pn=PayU&am=15.00&cu=INR&tr=TxnINTM12345',
      },
    });

    const service = new PaymentService();
    const result = await service.generateUpiIntent({
      ...mockDetails,
      paymentType: 'subscription',
      siDetails: {
        billingAmount: '15.00',
        billingCurrency: 'INR',
        billingCycle: 'MONTHLY',
        billingInterval: 1,
        paymentStartDate: '2026-11-05',
        paymentEndDate: '2027-11-05',
      },
    });

    expect(result.paymentType).toBe('subscription');
    expect(result.txnid).toMatch(/^TxnINTM/);
    expect(result.intentUri).toContain('pa=payu%40icici');

    const payload = jest.mocked(HttpHelper.postForm).mock.calls[0]![1] as any;
    expect(payload.si).toBe(1);
    expect(payload.bankcode).toBe('INTENT');
    expect(payload.api_version).toBe('7');
  });

  it('controller handles generateUpiIntent request and sends json response', async () => {
    jest.mocked(HttpHelper.postForm).mockResolvedValue({
      status: 1,
      result: {
        intentURIData: 'pa=payu@icici&pn=PayU&am=15.00&cu=INR&tr=TxnINT999',
      },
    });

    const controller = new PaymentController();
    const req = {
      body: {
        amount: '15.00',
        productinfo: 'Subscription Mobile Intent',
        firstname: 'Rohan',
        email: 'rohan@example.com',
        phone: '9876543210',
        paymentType: 'one-time',
      },
      get: jest.fn().mockReturnValue(mockDetails.s2s_device_info),
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    await controller.generateUpiIntent(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        intentUri: expect.stringContaining('upi://pay?'),
        supportedApps: expect.any(Array),
      }),
    );
  });

  it('controller returns 400 for invalid amount or missing fields', async () => {
    const controller = new PaymentController();
    const req = {
      body: {
        amount: '-5.00',
        productinfo: '',
      },
      get: jest.fn().mockReturnValue(''),
      ip: '127.0.0.1',
    } as unknown as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    await controller.generateUpiIntent(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
