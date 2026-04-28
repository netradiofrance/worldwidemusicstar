/**
 * Minimal PayPal REST API wrapper.
 * Uses Orders v2 + Webhooks v1.
 *
 * Sandbox: PAYPAL_ENV=sandbox  -> https://api-m.sandbox.paypal.com
 * Live:    PAYPAL_ENV=live     -> https://api-m.paypal.com
 */

function baseUrl(): string {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

let cached: { token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cached && cached.expires_at > Date.now() + 30_000) return cached.token;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PayPal credentials missing');
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`PayPal token error: ${res.status}`);
  const data = await res.json() as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

export interface CreateOrderInput {
  amount: number;       // USD
  description: string;
  customId: string;     // we put the track UUID here so the webhook can resolve it
  returnUrl: string;
  cancelUrl: string;
}

export interface CreateOrderOutput {
  id: string;
  approveUrl: string;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        custom_id: input.customId,
        description: input.description,
        amount: { currency_code: 'USD', value: input.amount.toFixed(2) },
      }],
      application_context: {
        brand_name: 'WorldWide Music Star',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal create order failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  const approveUrl = (data.links ?? []).find((l: any) => l.rel === 'approve')?.href;
  if (!approveUrl) throw new Error('PayPal approve URL missing');
  return { id: data.id, approveUrl };
}

export async function captureOrder(orderId: string): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal capture failed: ${res.status} ${t}`);
  }
  return res.json();
}

/**
 * Verify a webhook event signature using PayPal's verify-webhook-signature endpoint.
 * Requires PAYPAL_WEBHOOK_ID set in env (from PayPal dashboard).
 */
export async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn('[paypal] PAYPAL_WEBHOOK_ID missing — webhook signature NOT verified');
    return false;
  }
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
    cache: 'no-store',
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}
