import { BadRequestException } from '@nestjs/common';

export interface SubscriptionEvidence {
  id: string;
  plan_id: string;
  status?: string;
  customer_id?: string | null;
  notes?: Record<string, unknown> | unknown[] | null;
}
export interface PaymentEvidence {
  id: string;
  status: string;
  captured: boolean | number | string;
  amount: number | string;
  currency: string;
  subscription_id?: string | null;
  customer_id?: string | null;
  invoice_id?: string | null;
  notes?: Record<string, unknown> | unknown[] | null;
}

export function isCapturedPayment(payment: PaymentEvidence): boolean {
  return (
    typeof payment.id === 'string' &&
    payment.id.length > 0 &&
    payment.status === 'captured' &&
    [true, 1, '1'].includes(payment.captured)
  );
}

// Only call with a signature-verified webhook envelope, or a gateway subscription
// fetched after verifying Checkout's payment_id|subscription_id HMAC. Absence of
// payment.subscription_id is normal; a contradictory value is never accepted.
export function assertSubscriptionEvidence(
  local: {
    id: string;
    userId: string;
    planId: string;
    razorpaySubscriptionId: string | null;
    plan: { razorpayPlanId: string | null };
  },
  subscription: SubscriptionEvidence,
  payment: PaymentEvidence,
): void {
  if (
    local.razorpaySubscriptionId !== subscription.id ||
    !local.plan.razorpayPlanId ||
    local.plan.razorpayPlanId !== subscription.plan_id ||
    (payment.subscription_id != null && payment.subscription_id !== subscription.id)
  ) {
    throw new BadRequestException(
      'Payment/subscription/plan binding does not match local checkout',
    );
  }
  if (
    subscription.customer_id &&
    payment.customer_id &&
    subscription.customer_id !== payment.customer_id
  ) {
    throw new BadRequestException('Payment customer does not match subscription');
  }
  for (const notes of [subscription.notes, payment.notes]) {
    if (!notes || Array.isArray(notes)) continue;
    if (
      (notes.userId !== undefined && notes.userId !== local.userId) ||
      (notes.planId !== undefined && notes.planId !== local.planId)
    ) {
      throw new BadRequestException('Gateway user/plan notes do not match local checkout');
    }
  }
}

export function assertLocalPaymentEvidence(
  payment: {
    userId: string;
    subscriptionId: string | null;
    razorpaySubscriptionId: string | null;
    amount: unknown;
    currency: string;
    metadata: unknown;
  },
  subscription: {
    id: string;
    userId: string;
    planId: string;
    razorpaySubscriptionId: string | null;
  },
  captured: PaymentEvidence,
): void {
  const metadata = payment.metadata as { planId?: string } | null;
  if (
    payment.userId !== subscription.userId ||
    payment.subscriptionId !== subscription.id ||
    payment.razorpaySubscriptionId !== subscription.razorpaySubscriptionId ||
    (metadata?.planId !== undefined && metadata.planId !== subscription.planId)
  ) {
    throw new BadRequestException('Local payment user/plan/subscription does not match');
  }
  if (
    !Number.isSafeInteger(Number(captured.amount)) ||
    Number(captured.amount) <= 0 ||
    Math.round(Number(payment.amount) * 100) !== Number(captured.amount) ||
    payment.currency !== captured.currency
  ) {
    throw new BadRequestException('Captured payment amount or currency mismatch');
  }
}
