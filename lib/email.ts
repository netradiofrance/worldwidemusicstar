import Mailjet from 'node-mailjet';

/**
 * Mail sending lib for WorldWide Music Star.
 *
 * Deliverability tuning baked in:
 *   - Rich plain-text alternative on every send (not just HTML stripped):
 *     fixes the SpamAssassin "HTML_IMAGE_ONLY" / low-text complaint.
 *   - List-Unsubscribe header (RFC 8058 one-click + mailto): gives Gmail
 *     and Outlook a clear "this sender respects unsubscribe" signal.
 *     Hugely positive on inbox placement. Auto-injected for any send
 *     whose subject hints at a non-receipt category — receipts stay pure
 *     transactional and skip the header.
 *   - Subjects avoid spam-trigger phrases ("Last chance", high "payment"
 *     density) — registration-flavored wording carries less risk.
 *   - Footer carries a postal address: required by CAN-SPAM (US) and
 *     a soft signal everywhere else.
 *
 * Env knobs:
 *   - MAILJET_FROM_EMAIL / MAILJET_FROM_NAME  (sender identity)
 *   - MAIL_POSTAL_ADDRESS                     (footer postal address)
 *   - NEXT_PUBLIC_SITE_URL                    (base for unsubscribe URL)
 */

let client: ReturnType<typeof Mailjet.apiConnect> | null = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('MAILJET_API_KEY / MAILJET_API_SECRET missing');
  }
  client = Mailjet.apiConnect(apiKey, apiSecret);
  return client;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldwidemusicstar.com').replace(/\/$/, '');
const SUPPORT_EMAIL = process.env.MAILJET_FROM_EMAIL ?? 'contact@worldwidemusicstar.com';

// Postal address shown in every email footer — required by anti-spam laws
// (CAN-SPAM US, GDPR EU best practice) and improves deliverability scoring.
const POSTAL_ADDRESS = process.env.MAIL_POSTAL_ADDRESS ?? 'WorldWide Music Star — NetRadio Network';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Optional explicit unsubscribe URL. If absent, auto-inferred for non-receipts. */
  unsubscribeUrl?: string;
}

export async function sendEmail({ to, subject, html, text, unsubscribeUrl }: SendEmailParams) {
  const fromEmail = process.env.MAILJET_FROM_EMAIL ?? 'contact@worldwidemusicstar.com';
  const fromName = process.env.MAILJET_FROM_NAME ?? 'WorldWide Music Star';

  // For non-receipt emails (anything that is not a hard transactional doc
  // the user explicitly bought), we auto-attach a List-Unsubscribe header.
  // Receipts skip it because they are post-purchase records the user
  // legally needs to keep.
  const isReceipt = /\breceipt\b/i.test(subject);
  const finalUnsubUrl = unsubscribeUrl
    ?? (isReceipt ? undefined : `${SITE_URL}/unsubscribe?email=${encodeURIComponent(to)}`);

  const message: any = {
    From: { Email: fromEmail, Name: fromName },
    To: [{ Email: to }],
    Subject: subject,
    HTMLPart: html,
    TextPart: text ?? htmlToPlainText(html),
  };

  if (finalUnsubUrl) {
    // Two-step List-Unsubscribe: HTTP one-click (RFC 8058) + mailto fallback.
    // Gmail honors the HTTP one-click and shows the "Unsubscribe" chip in
    // the inbox header when this is present and well-formed.
    message.Headers = {
      'List-Unsubscribe': `<${finalUnsubUrl}>, <mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }

  const result = await getClient().post('send', { version: 'v3.1' }).request({
    Messages: [message],
  });
  return result.body;
}

/**
 * Better fallback than naive tag-stripping: collapses whitespace, decodes
 * common entities, removes style/script blocks. Used only when a template
 * does not provide its own plain-text counterpart.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// --- Email templates ---
// All three templates share the same dark/red branding and Anton headline.

const HEADER_BLOCK = `
<tr><td style="padding:0 0 32px 0;text-align:center">
  <span style="font-family:Anton,Impact,sans-serif;font-size:32px;letter-spacing:-0.02em;color:#F5F5F5">WORLDWIDE <span style="color:#D62828">MUSIC</span> STAR</span>
</td></tr>`;

const FOOTER_BLOCK = `
<tr><td style="padding:24px 0;text-align:center;font-size:12px;color:#5A5A5A;line-height:1.6">
  <p style="margin:0 0 4px">© 2026 WorldWide Music Star. The Power to Be Charted.</p>
  <p style="margin:0">${POSTAL_ADDRESS}</p>
</td></tr>`;

// =========================================================================
// 1. Confirmation email — sent right after a successful payment.
// =========================================================================

export function chartConfirmationEmail(opts: {
  artistName: string;
  songTitle: string;
  genreName: string;
  trackUrl: string;
}): { subject: string; html: string; text: string } {
  const { artistName, songTitle, genreName, trackUrl } = opts;
  return {
    subject: `You're charted on WorldWide Music Star — "${songTitle}"`,
    html: `<!doctype html><html><body style="background:#0A0A0A;color:#F5F5F5;font-family:Inter,Arial,sans-serif;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px">
    ${HEADER_BLOCK}
    <tr><td style="background:#111;border-radius:16px;padding:40px 32px">
      <h1 style="font-family:Anton,Impact,sans-serif;font-size:32px;line-height:1.05;margin:0 0 16px;color:#F5F5F5">You're on the chart.</h1>
      <p style="font-size:16px;line-height:1.6;color:#C9C9C9;margin:0 0 24px">Hi ${artistName},</p>
      <p style="font-size:16px;line-height:1.6;color:#C9C9C9;margin:0 0 24px">Your track <strong style="color:#fff">"${songTitle}"</strong> has been added to the <strong style="color:#fff">${genreName}</strong> chart on WorldWide Music Star.</p>
      <p style="font-size:16px;line-height:1.6;color:#C9C9C9;margin:0 0 32px">Now it's all about your fans. Share your chart page and rally your community to vote — every vote pushes you up the ranking. Spotify followers and YouTube subscribers also count toward your score, so make sure your profiles stay alive.</p>
      <p style="text-align:center;margin:0 0 32px">
        <a href="${trackUrl}" style="display:inline-block;background:#D62828;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px">View your chart page</a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#9A9A9A;margin:0 0 8px">Pro tip: post the link in your bio, your stories, and your newsletter. Fans need to be told where to vote.</p>
      <p style="font-size:13px;line-height:1.6;color:#9A9A9A;margin:0">Need a hand? Just reply to this email — a real human reads every reply.</p>
    </td></tr>
    ${FOOTER_BLOCK}
  </table>
</td></tr></table></body></html>`,
    text: [
      `You're on the chart.`,
      ``,
      `Hi ${artistName},`,
      ``,
      `Your track "${songTitle}" has been added to the ${genreName} chart on WorldWide Music Star.`,
      ``,
      `Now it's all about your fans. Share your chart page and rally your community to vote — every vote pushes you up the ranking. Spotify followers and YouTube subscribers also count toward your score, so make sure your profiles stay alive.`,
      ``,
      `View your chart page: ${trackUrl}`,
      ``,
      `Pro tip: post the link in your bio, your stories, and your newsletter. Fans need to be told where to vote.`,
      ``,
      `Need a hand? Just reply to this email — a real human reads every reply.`,
      ``,
      `--`,
      `WorldWide Music Star — ${SITE_URL}`,
      POSTAL_ADDRESS,
    ].join('\n'),
  };
}

// =========================================================================
// 2. Receipt email — also sent on successful payment.
// =========================================================================

export function paymentReceiptEmail(opts: {
  artistName: string;
  songTitle: string;
  amount: number;
  orderId: string;
}): { subject: string; html: string; text: string } {
  const { artistName, songTitle, amount, orderId } = opts;
  const amountStr = `${amount.toFixed(2).replace('.', ',')} €`;
  return {
    // The word "receipt" tells our sendEmail wrapper to skip the
    // List-Unsubscribe header (this is a hard transactional message).
    subject: `Your receipt — WorldWide Music Star (${amountStr})`,
    html: `<!doctype html><html><body style="background:#0A0A0A;color:#F5F5F5;font-family:Inter,Arial,sans-serif;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px">
    ${HEADER_BLOCK}
    <tr><td style="background:#111;border-radius:16px;padding:40px 32px">
      <h2 style="font-family:Anton,Impact,sans-serif;font-size:24px;margin:0 0 16px;color:#fff">Your receipt</h2>
      <p style="color:#C9C9C9;margin:0 0 16px;font-size:15px;line-height:1.6">Hi ${artistName}, thanks — your chart entry is confirmed. Here are the details for your records.</p>
      <table width="100%" style="border-top:1px solid #262626;margin-top:16px">
        <tr><td style="padding:12px 0;color:#9A9A9A">Track</td><td style="padding:12px 0;text-align:right;color:#fff">${songTitle}</td></tr>
        <tr><td style="padding:12px 0;color:#9A9A9A">Amount</td><td style="padding:12px 0;text-align:right;color:#fff">${amountStr}</td></tr>
        <tr><td style="padding:12px 0;color:#9A9A9A">Order ID</td><td style="padding:12px 0;text-align:right;color:#fff;font-family:monospace;font-size:13px">${orderId}</td></tr>
      </table>
      <p style="color:#9A9A9A;margin:24px 0 0;font-size:13px;line-height:1.6">Keep this email for your records. Need an invoice with VAT details? Reply to this message and we'll send one within 24h.</p>
    </td></tr>
    ${FOOTER_BLOCK}
  </table>
</td></tr></table></body></html>`,
    text: [
      `Your receipt`,
      ``,
      `Hi ${artistName}, thanks — your chart entry is confirmed. Here are the details for your records.`,
      ``,
      `Track:    ${songTitle}`,
      `Amount:   ${amountStr}`,
      `Order ID: ${orderId}`,
      ``,
      `Keep this email for your records. Need an invoice with VAT details? Reply to this message and we'll send one within 24h.`,
      ``,
      `--`,
      `WorldWide Music Star — ${SITE_URL}`,
      POSTAL_ADDRESS,
    ].join('\n'),
  };
}

// =========================================================================
// 3. Recovery email — sent when an artist starts a registration but does
//    not complete the payment step. 30 min after, then once a day for up
//    to 7 days. Subject + intro adapt by attempt number to stay friendly
//    rather than pushy (no "Last chance!" — that triggers spam filters).
// =========================================================================

export function paymentReminderEmail(opts: {
  artistName: string;
  songTitle: string;
  genreName: string;
  recoverUrl: string;
  attemptNumber: number; // 1 = first reminder, ascending
}): { subject: string; html: string; text: string } {
  const { artistName, songTitle, genreName, recoverUrl, attemptNumber } = opts;

  // Subject lines tuned to avoid spammy triggers:
  //   - no "Last chance", "Final notice", "Don't miss out", urgency caps
  //   - no $/€ or numbers in subject (lower spam score)
  //   - "registration" instead of "payment" — softer transactional tone
  let subject: string;
  let intro: string;
  let introText: string;

  if (attemptNumber === 1) {
    subject = `Almost there — finish charting "${songTitle}"`;
    intro =
      `Your registration for <strong style="color:#fff">"${songTitle}"</strong> on the <strong style="color:#fff">${genreName}</strong> chart is one click away. The registration step did not complete — here is a quick way back to it.`;
    introText =
      `Your registration for "${songTitle}" on the ${genreName} chart is one click away. The registration step did not complete — here is a quick way back to it.`;
  } else if (attemptNumber <= 3) {
    subject = `"${songTitle}" is waiting for you`;
    intro =
      `Just a quick reminder — your track <strong style="color:#fff">"${songTitle}"</strong> is reserved on the <strong style="color:#fff">${genreName}</strong> chart, but the registration is not yet finalized.`;
    introText =
      `Just a quick reminder — your track "${songTitle}" is reserved on the ${genreName} chart, but the registration is not yet finalized.`;
  } else {
    // Softer than "Last chance" — still conveys we're nearing the end
    subject = `We're holding your spot for "${songTitle}"`;
    intro =
      `We are still holding your spot for <strong style="color:#fff">"${songTitle}"</strong> on the <strong style="color:#fff">${genreName}</strong> chart. Here is the secure link to finalize whenever you are ready.`;
    introText =
      `We are still holding your spot for "${songTitle}" on the ${genreName} chart. Here is the secure link to finalize whenever you are ready.`;
  }

  return {
    subject,
    html: `<!doctype html><html><body style="background:#0A0A0A;color:#F5F5F5;font-family:Inter,Arial,sans-serif;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px">
    ${HEADER_BLOCK}
    <tr><td style="background:#111;border-radius:16px;padding:40px 32px">
      <h1 style="font-family:Anton,Impact,sans-serif;font-size:30px;line-height:1.05;margin:0 0 20px;color:#F5F5F5">One step left.</h1>
      <p style="font-size:16px;line-height:1.6;color:#C9C9C9;margin:0 0 24px">Hi ${artistName},</p>
      <p style="font-size:16px;line-height:1.6;color:#C9C9C9;margin:0 0 28px">${intro}</p>
      <p style="text-align:center;margin:0 0 28px">
        <a href="${recoverUrl}" style="display:inline-block;background:#D62828;color:#fff;padding:16px 32px;border-radius:999px;text-decoration:none;font-weight:600;font-size:16px">Complete the registration</a>
      </p>
      <p style="font-size:14px;line-height:1.6;color:#C9C9C9;margin:0 0 12px">As a reminder, registering on a chart costs 99,99 €. Secure checkout by card, Apple Pay or Google Pay — powered by Vivid.</p>
      <p style="font-size:13px;line-height:1.6;color:#9A9A9A;margin:0 0 8px">Need help? Just reply to this email — a real human reads every reply.</p>
      <p style="font-size:12px;line-height:1.6;color:#5A5A5A;margin:0">If you no longer wish to chart this track, simply ignore this email and we will not contact you again about it.</p>
    </td></tr>
    ${FOOTER_BLOCK}
  </table>
</td></tr></table></body></html>`,
    text: [
      `One step left.`,
      ``,
      `Hi ${artistName},`,
      ``,
      introText,
      ``,
      `Complete the registration: ${recoverUrl}`,
      ``,
      `As a reminder, registering on a chart costs 99,99 €. Secure checkout by card, Apple Pay or Google Pay — powered by Vivid.`,
      ``,
      `Need help? Just reply to this email — a real human reads every reply.`,
      ``,
      `If you no longer wish to chart this track, simply ignore this email and we will not contact you again about it.`,
      ``,
      `--`,
      `WorldWide Music Star — ${SITE_URL}`,
      POSTAL_ADDRESS,
    ].join('\n'),
  };
}
