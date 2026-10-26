/**
 * Documented Razorpay subscription webhook shape, using the reported incident
 * IDs/amount. Not a raw production export: timestamps, plan/customer/user notes,
 * and invoice/order IDs below are synthetic. Replace/compare with the recorded
 * JSON when supplied. In particular payment.subscription_id is intentionally
 * absent, as in https://razorpay.com/docs/webhooks/subscriptions/ .
 */
export function subscriptionContractEvent(
  event: 'subscription.charged' | 'subscription.activated' | 'subscription.cancelled',
  planId: string,
  localUserId: string,
  localPlanId: string,
) {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    entity: 'event',
    account_id: 'acc_contract_fixture',
    event,
    contains: ['subscription', 'payment'],
    created_at: timestamp,
    payload: {
      subscription: {
        entity: {
          id: 'sub_TsRCS4prgPP799',
          entity: 'subscription',
          plan_id: planId,
          customer_id: 'cust_contract_fixture',
          status: event === 'subscription.cancelled' ? 'cancelled' : 'active',
          current_start: timestamp,
          current_end: timestamp + 30 * 86400,
          ended_at: event === 'subscription.cancelled' ? timestamp : null,
          quantity: 1,
          notes: { userId: localUserId, planId: localPlanId },
          charge_at: timestamp + 30 * 86400,
          start_at: timestamp,
          end_at: timestamp + 365 * 86400,
          auth_attempts: 0,
          total_count: 12,
          paid_count: 1,
          customer_notify: true,
          created_at: timestamp - 60,
          expire_by: null,
          short_url: null,
          has_scheduled_changes: false,
          change_scheduled_at: null,
          source: 'api',
          offer_id: null,
          remaining_count: 11,
        },
      },
      payment: {
        entity: {
          id: 'pay_TsRCfsR92Wl5Wq',
          entity: 'payment',
          amount: 29900,
          currency: 'INR',
          status: 'captured',
          order_id: 'order_contract_fixture',
          invoice_id: 'inv_contract_fixture',
          international: false,
          method: 'upi',
          amount_refunded: 0,
          refund_status: null,
          captured: true as boolean | string | number,
          description: 'Recurring Payment via Subscription',
          card_id: null,
          bank: null,
          wallet: null,
          vpa: null,
          email: null,
          contact: null,
          customer_id: 'cust_contract_fixture',
          notes: [],
          fee: 0,
          tax: 0,
          error_code: null,
          error_description: null,
          created_at: timestamp,
        },
      },
    },
  };
}
