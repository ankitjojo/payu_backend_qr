import { PaymentService } from '../payment.service';
import { PaymentController } from '../../api/controllers/payment.controller';
import { HttpHelper } from '../../utils/http.util';
import { Request, Response } from 'express';

jest.mock('../../utils/http.util');

describe('UPI VPA Validation & Collect Service and Controller', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('PaymentService.validateVPA', () => {
    it('validates VPA successfully when PayU reports valid VPA with isVPAValid: 1', async () => {
      jest.mocked(HttpHelper.postForm).mockResolvedValue({
        status: 'SUCCESS',
        vpa: 'ankitidfc1404@ybl',
        isVPAValid: 1,
        payerAccountName: 'Dabhi Ankit Hiteshbhai',
      });

      const service = new PaymentService();
      const result = await service.validateVPA('ankitidfc1404@ybl');

      expect(result.isValid).toBe(true);
      expect(result.vpa).toBe('ankitidfc1404@ybl');
      expect(result.payerAccountName).toBe('Dabhi Ankit Hiteshbhai');
    });

    it('identifies invalid VPA when PayU returns isVPAValid: 0', async () => {
      jest.mocked(HttpHelper.postForm).mockResolvedValue({
        status: 'SUCCESS',
        vpa: 'success@ybl',
        isVPAValid: 0,
        payerAccountName: 'NA',
      });

      const service = new PaymentService();
      const result = await service.validateVPA('success@ybl');

      expect(result.isValid).toBe(false);
      expect(result.payerAccountName).toBeNull();
      expect(result.message).toContain('rejected by bank');
    });

    it('rejects invalid VPA syntax without calling PayU', async () => {
      const service = new PaymentService();
      const result = await service.validateVPA('invalid-vpa-format');

      expect(result.isValid).toBe(false);
      expect(HttpHelper.postForm).not.toHaveBeenCalled();
    });

    it('returns invalid when PayU returns status 0', async () => {
      jest.mocked(HttpHelper.postForm).mockResolvedValue({
        status: 0,
        isVpaValid: 0,
        msg: 'Invalid VPA',
      });

      const service = new PaymentService();
      const result = await service.validateVPA('nonexistent@upi');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Invalid VPA');
    });
  });

  describe('PaymentService.generateUpiCollect', () => {
    it('generates one-time collect without SI mandate fields', async () => {
      jest.mocked(HttpHelper.postForm).mockResolvedValue({ status: 1 });

      const service = new PaymentService();
      const result = await service.generateUpiCollect({
        amount: '10.00',
        productinfo: 'Test Collect',
        firstname: 'Rahul',
        email: 'rahul@example.com',
        phone: '9876543210',
        vpa: 'success@ybl',
        paymentType: 'one-time',
      });

      expect(result.paymentType).toBe('one-time');
      expect(result.txnid).toMatch(/^TxnUPI/);
      expect(result.vpa).toBe('success@ybl');

      const payload = jest.mocked(HttpHelper.postForm).mock.calls[0]![1] as any;
      expect(payload.vpa).toBe('success@ybl');
      expect(payload.bankcode).toBe('UPI');
      expect(payload.pg).toBe('UPI');
      expect(payload.txn_s2s_flow).toBe(1);
      expect(payload).not.toHaveProperty('si');
      expect(payload).not.toHaveProperty('si_details');
    });

    it('generates subscription mandate collect with SI details', async () => {
      jest.mocked(HttpHelper.postForm).mockResolvedValue({ status: 1 });

      const service = new PaymentService();
      const result = await service.generateUpiCollect({
        amount: '10.00',
        productinfo: 'Test Collect Mandate',
        firstname: 'Rahul',
        email: 'rahul@example.com',
        phone: '9876543210',
        vpa: 'success@ybl',
        paymentType: 'subscription',
        siDetails: {
          billingAmount: '10.00',
          billingCurrency: 'INR',
          billingCycle: 'MONTHLY',
          billingInterval: 1,
          paymentStartDate: '2026-11-05',
          paymentEndDate: '2027-11-05',
        },
      });

      expect(result.paymentType).toBe('subscription');
      expect(result.txnid).toMatch(/^TxnUPIM/);

      const payload = jest.mocked(HttpHelper.postForm).mock.calls[0]![1] as any;
      expect(payload.vpa).toBe('success@ybl');
      expect(payload.si).toBe(1);
      expect(payload.api_version).toBe('7');
      expect(payload.si_details).toContain('MONTHLY');
    });
  });

  describe('PaymentController.validateVpa and generateUpiCollect', () => {
    it('validateVpa returns 200 with validation result', async () => {
      jest.mocked(HttpHelper.postForm).mockResolvedValue({
        status: 1,
        isVpaValid: 1,
        msg: 'VPA is valid',
      });

      const controller = new PaymentController();
      const req = {
        body: { vpa: 'success@ybl' },
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();

      await controller.validateVpa(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ isValid: true, vpa: 'success@ybl' }),
        }),
      );
    });

    it('generateUpiCollect rejects invalid VPA before initiating', async () => {
      const controller = new PaymentController();
      const req = {
        body: {
          amount: '10.00',
          productinfo: 'Test',
          firstname: 'User',
          email: 'user@test.com',
          phone: '9876543210',
          vpa: 'bad-vpa',
        },
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();

      await controller.generateUpiCollect(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });
  });
});
