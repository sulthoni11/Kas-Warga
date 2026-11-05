import { Router } from 'express';
import { z } from 'zod';
import { getPaymentProvider } from '../integrations/payments/index.js';
import { PaymentError, settleInvoice } from '../services/payments.js';

export const webhooksRouter = Router();

const paymentEventSchema = z.object({
  providerRef: z.string().min(1).max(120),
  status: z.enum(['PAID', 'FAILED', 'EXPIRED']),
  amount: z.coerce.number().int().positive().max(1_000_000_000).optional(),
});

/**
 * Webhook payment gateway dummy (FR-09).
 * Signature: header `X-Dummy-Signature` = HMAC-SHA256(rawBody, DUMMY_WEBHOOK_SECRET).
 *
 * Idempoten: event PAID yang dikirim berulang hanya menghasilkan satu entri
 * ledger. Signature diverifikasi dari body mentah, bukan hasil parse JSON.
 */
webhooksRouter.post('/payment/dummy', async (req, res, next) => {
  try {
    const provider = getPaymentProvider();
    const signature = req.get('X-Dummy-Signature') ?? '';

    if (!provider.verifyWebhook({ rawBody: req.rawBody, signature })) {
      return res.status(401).json({ error: 'INVALID_SIGNATURE' });
    }

    const parsed = paymentEventSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });
    }

    const result = await settleInvoice({
      provider: provider.name,
      providerRef: parsed.data.providerRef,
      status: parsed.data.status,
      amount: parsed.data.amount ?? null,
    });

    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    if (error instanceof PaymentError) {
      return res.status(error.status).json({ error: error.code, ...error.details });
    }
    return next(error);
  }
});
