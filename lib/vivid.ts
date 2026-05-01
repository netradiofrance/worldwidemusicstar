import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Vivid Money API client.
 *
 * Implements:
 *   - 2-step auth: POST /auth/gen-token returns a Bearer token
 *   - Payment link creation: POST /payment-link/create
 *   - Webhook signature validation (HMAC-SHA256 over the RAW body)
 *
 * Reverse-engineered from the official OpenCart and WooCommerce plugins.
 * Endpoints, header conventions, and the units/nanos amount split are
 * faithful to those plugins.
 *
 * Required env vars:
 *   - VIVID_API_TOKEN   format: "<client_id>::<secret>"
 *   - VIVID_ENV         "live" (default) or "test"
 */

const VIVID_API_LIVE = 'https://api.prime.vivid.money/cms/api/v1';
const VIVID_API_TEST = 'https://api.beta.vivid.money/cms/api/v1';

function getApiBase(): string {
  return process.env.VIVID_ENV === 'test' ? VIVID_API_TEST : VIVID_API_LIVE;
}

/**
 * Parse the API token. Vivid issues a single string of the form
 * "<client_id>::<secret>" (per their plugins). This util splits it.
 */
function getCredentials(): { clientId: string; secret: string } {
  const token = (process.env.VIVID_API_TOKEN ?? '').trim();
  if (!token) throw new Error('VIVID_API_TOKEN is not set');
  const parts = token.split('::');
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
    throw new Error('VIVID_API_TOKEN must be in format "<client_id>::<secret>"');
  }
  return { clientId: parts[0].trim(), secret: parts[1].trim() };
}

/**
 * Compute the X-Signature header for an outbound request.
 * The plugins HMAC-SHA256 a JSON.stringify of the body with the secret.
 */
function signOutbound(body: any, secret: string): string {
  const json = JSON.stringify(body);
  return createHmac('sha256', secret).update(json).digest('hex');
}

/**
 * Verify the X-Signature header on an inbound webhook.
 * IMPORTANT — we MUST sign the raw body bytes received, not a re-encoded
 * version. WooCommerce's Vivid plugin makes this explicit by passing
 * `$raw_input` (the unparsed body) to its validate_signature method.
 * This avoids any whitespace/escaping mismatch with the sender's JSON.
 */
export function verifyVividSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const { secret } = getCredentials();
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  // Constant-time comparison to thwart timing attacks
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Step 1 of the API dance: exchange the API key for a short-lived Bearer
 * token. We don't cache this — the Vivid plugins do a fresh /auth/gen-token
 * before every request, presumably because the lifetime is short or
 * unpredictable. Adding a cache later is a perf optimization, not correctness.
 */
async function getBearerToken(): Promise<string> {
  const { clientId, secret } = getCredentials();
  const body = {
    apiKey: clientId,
    createdAt: new Date().toISOString(),
  };
  const res = await fetch(`${getApiBase()}/auth/gen-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signOutbound(body, secret),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!res.ok || !data?.token) {
    const detail = data?.message || text || `HTTP ${res.status}`;
    throw new Error(`Vivid auth failed: ${detail}`);
  }
  return data.token as string;
}

/**
 * Format an amount as Vivid's units + nanos. 99.99 EUR becomes
 * { units: 99, nanos: 990_000_000 }. The .toFixed dance avoids floating
 * point drift that would otherwise turn 0.99 into 989999999 nanos.
 */
function splitAmount(amount: number): { units: number; nanos: number } {
  const fixed = Number(amount.toFixed(2)); // round to cents
  const units = Math.floor(fixed);
  const nanos = Math.round((fixed - units) * 1_000_000_000);
  return { units, nanos };
}

interface CreatePaymentLinkInput {
  amount: number;            // e.g. 99.99
  currencyCode: string;      // e.g. 'EUR'
  externalOrderId: string;   // our track id
  description: string;       // shown on Vivid's invoice page
  redirectUrl: string;       // where the user lands after paying
  webhookUrl: string;        // where Vivid POSTs payment status
  language?: string;         // 2-letter, defaults to 'en'
}

/**
 * Create a Vivid payment link for the given amount + reference.
 * Returns the URL the user should be redirected to to complete payment.
 */
export async function createVividPaymentLink(
  input: CreatePaymentLinkInput,
): Promise<{ url: string }> {
  const { secret } = getCredentials();
  const total = splitAmount(input.amount);

  const body = {
    meta: {
      cmsCode: 'WorldWideMusicStar',
      language: (input.language ?? 'en').slice(0, 2),
      redirectUrl: input.redirectUrl,
      webhookUrl: input.webhookUrl,
    },
    orderInfo: {
      amount: {
        currencyCode: input.currencyCode,
        units: total.units,
        nanos: total.nanos,
      },
      externalOrderId: input.externalOrderId,
      items: [
        {
          name: input.description,
          pricePerUnit: {
            currencyCode: input.currencyCode,
            units: String(total.units),
            nanos: total.nanos,
          },
          quantity: { value: '1' },
          units: 'pcs',
          description: input.description,
        },
      ],
    },
    createdAt: new Date().toISOString(),
  };

  const token = await getBearerToken();

  const res = await fetch(`${getApiBase()}/payment-link/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Signature': signOutbound(body, secret),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = null; }

  if (!res.ok) {
    const detail = data?.message || text || `HTTP ${res.status}`;
    throw new Error(`Vivid payment-link/create failed: ${detail}`);
  }
  if (!data?.url) {
    throw new Error('Vivid response did not include a payment URL');
  }
  return { url: data.url };
}

/**
 * Webhook payload — what Vivid POSTs to our endpoint.
 * Only fields we actually consume are typed; we keep `unknown` for the rest.
 */
export interface VividWebhookPayload {
  status?: string;          // 'STATUS_SUCCESS' on payment success
  externalOrderId?: string; // echo of what we sent (= our track id)
  amount?: { currencyCode?: string; units?: number; nanos?: number };
  paymentId?: string;       // Vivid's internal payment id, useful for receipts
  paidAt?: string;
  [k: string]: unknown;
}
