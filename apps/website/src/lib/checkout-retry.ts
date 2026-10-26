export async function cancelCheckout(
  paymentId: string,
  failPayment: (id: string) => Promise<{ status: string }>,
): Promise<void> {
  const result = await failPayment(paymentId);
  if (result.status !== 'FAILED')
    throw new Error('Checkout cleanup is not confirmed; refresh payment status');
}

/** Cleanup must finish before creating a new session, including after a lost response. */
export async function retryCheckout<T>(
  session: {
    paymentId: string;
    planId?: string | null;
    vaultId?: string | null;
    couponCode?: string | null;
    recurring?: boolean;
    razorpaySubscriptionId?: string | null;
  },
  api: {
    failPayment: (id: string) => Promise<{ status: string }>;
    purchasePlan: (
      planId: string,
      vaultId?: string,
      couponCode?: string,
      recurring?: boolean,
    ) => Promise<T>;
  },
): Promise<T> {
  await cancelCheckout(session.paymentId, api.failPayment);
  return api.purchasePlan(
    session.planId ?? '',
    session.vaultId || undefined,
    session.couponCode || undefined,
    session.recurring === true || !!session.razorpaySubscriptionId,
  );
}
