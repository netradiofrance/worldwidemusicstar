import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook placeholder.
 *
 * Stripe is not active yet. To enable later:
 *   1) Set STRIPE_ENABLED=true and add STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET.
 *   2) Implement signature verification with `stripe.webhooks.constructEvent`.
 *   3) Mirror the flow in /api/payment/paypal/webhook (activate track + send emails).
 */
export async function POST() {
  if (process.env.STRIPE_ENABLED !== 'true') {
    return NextResponse.json({ ok: true, disabled: true });
  }
  return NextResponse.json({ ok: true, todo: 'implement stripe' });
}
