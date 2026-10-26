import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { RazorpayService } from './razorpay.service';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

describe('WebhookController', () => {
  let controller: WebhookController;
  let webhookService: { handleWebhook: jest.Mock };
  let razorpayService: { verifyWebhookSignature: jest.Mock };
  let reflector: Reflector;

  beforeEach(async () => {
    webhookService = { handleWebhook: jest.fn() };
    razorpayService = { verifyWebhookSignature: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: WebhookService, useValue: webhookService },
        { provide: RazorpayService, useValue: razorpayService },
        Reflector,
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    reflector = module.get<Reflector>(Reflector);
  });

  it('is decorated with @Public() so JwtAuthGuard permits Razorpay requests', () => {
    const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, WebhookController);
    expect(isPublic).toBe(true);
  });

  it('rejects when x-razorpay-signature header is missing', async () => {
    const req: any = { headers: {}, rawBody: Buffer.from('{}') };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.handleRazorpayWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing signature' });
    expect(webhookService.handleWebhook).not.toHaveBeenCalled();
  });

  it('rejects when raw body is missing', async () => {
    const req: any = { headers: { 'x-razorpay-signature': 'sig' }, rawBody: null };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.handleRazorpayWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing raw body' });
    expect(webhookService.handleWebhook).not.toHaveBeenCalled();
  });

  it('rejects when signature verification fails', async () => {
    razorpayService.verifyWebhookSignature.mockReturnValue(false);
    const req: any = {
      headers: { 'x-razorpay-signature': 'bad_sig' },
      rawBody: Buffer.from('{"event":"subscription.charged"}'),
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.handleRazorpayWebhook(req, res);

    expect(razorpayService.verifyWebhookSignature).toHaveBeenCalledWith(
      '{"event":"subscription.charged"}',
      'bad_sig',
    );
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    expect(webhookService.handleWebhook).not.toHaveBeenCalled();
  });

  it('processes valid webhook and responds with HTTP 200', async () => {
    razorpayService.verifyWebhookSignature.mockReturnValue(true);
    webhookService.handleWebhook.mockResolvedValue(undefined);
    const payload = JSON.stringify({ event: 'subscription.charged', id: 'evt_123' });
    const req: any = {
      headers: { 'x-razorpay-signature': 'valid_sig' },
      rawBody: Buffer.from(payload),
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.handleRazorpayWebhook(req, res);

    expect(webhookService.handleWebhook).toHaveBeenCalledWith(JSON.parse(payload));
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('responds with HTTP 500 when webhook processing fails so Razorpay can retry', async () => {
    razorpayService.verifyWebhookSignature.mockReturnValue(true);
    webhookService.handleWebhook.mockRejectedValue(new Error('DB failure'));
    const payload = JSON.stringify({ event: 'subscription.charged' });
    const req: any = {
      headers: { 'x-razorpay-signature': 'valid_sig' },
      rawBody: Buffer.from(payload),
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.handleRazorpayWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ error: 'Webhook processing failed' });
  });
});
