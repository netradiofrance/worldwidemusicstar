import Mailjet from 'node-mailjet';

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

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const fromEmail = process.env.MAILJET_FROM_EMAIL ?? 'noreply@worldwidemusicstar.com';
  const fromName = process.env.MAILJET_FROM_NAME ?? 'WorldWide Music Star';

  const result = await getClient().post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: { Email: fromEmail, Name: fromName },
        To: [{ Email: to }],
        Subject: subject,
        HTMLPart: html,
        TextPart: text ?? html.replace(/<[^>]+>/g, ''),
      },
    ],
  });
  return result.body;
}

// --- Email templates ---
// All three templates share the same dark/red branding and Anton headline
// so the visual identity stays consistent across the lifecycle.

const HEADER_BLOCK = `
<tr><td style="padding:0 0 32px 0;text-align:center">
  <span style="font-family:Anton,Impact,sans-serif;font-size:32px;letter-spacing:-0.02em;color:#F5F5F5">WORLDWIDE <span style="color:#D62828">MUSIC</span> STAR</span>
</td></tr>`;

const FOOTER_BLOCK = `
<tr><td style="padding:24px 0;text-align:center;font-size:12px;color:#5A5A5A">
  <p style="margin:0">© 2026 WorldWide Music Star. The Power to Be Charted.</p>
</td></tr>`;

export function chartConfirmationEmail(opts: {
  artistName: string;
  songTitle: string;
  genreName: string;
  trackUrl: string;
}): { subject: string; html: string } {
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
      <p style="font-size:16px;line-height:1.6;color:#C9C9C9;margin:0 0 32px">Now it's all about your fans. Share your chart page and rally your community to vote — every vote pushes you up the ranking.</p>
      <p style="text-align:center;margin:0 0 32px">
        <a href="${trackUrl}" style="display:inline-block;background:#D62828;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px">View your chart page</a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#9A9A9A;margin:0">Pro tip: post the link in your bio, your stories, and your newsletter. Fans need to be told where to vote.</p>
    </td></tr>
    ${FOOTER_BLOCK}
  </table>
</td></tr></table></body></html>`,
  };
}

export function paymentReceiptEmail(opts: {
  artistName: string;
  songTitle: string;
  amount: number;
  orderId: string;
}): { subject: string; html: string } {
  const { artistName, songTitle, amount, orderId } = opts;
  // Format amount as European currency (99,99 €)
  const amountStr = `${amount.toFixed(2).replace('.', ',')} €`;
  return {
    subject: `Receipt — WorldWide Music Star (${amountStr})`,
    html: `<!doctype html><html><body style="background:#0A0A0A;color:#F5F5F5;font-family:Inter,Arial,sans-serif;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111;border-radius:16px">
    <tr><td style="padding:40px 32px">
      <h2 style="font-family:Anton,Impact,sans-serif;font-size:24px;margin:0 0 16px;color:#fff">Payment received</h2>
      <p style="color:#C9C9C9;margin:0 0 16px">Hi ${artistName}, here is the receipt for your chart entry.</p>
      <table width="100%" style="border-top:1px solid #262626;margin-top:16px">
        <tr><td style="padding:12px 0;color:#9A9A9A">Track</td><td style="padding:12px 0;text-align:right;color:#fff">${songTitle}</td></tr>
        <tr><td style="padding:12px 0;color:#9A9A9A">Amount</td><td style="padding:12px 0;text-align:right;color:#fff">${amountStr}</td></tr>
        <tr><td style="padding:12px 0;color:#9A9A9A">Order ID</td><td style="padding:12px 0;text-align:right;color:#fff;font-family:monospace;font-size:13px">${orderId}</td></tr>
      </table>
    </td></tr>
  </table>
</td></tr></table></body></html>`,
  };
}

/**
 * "Abandoned cart" reminder — sent 30 min after a track is created in
 * pending_payment state, then once a day for up to 7 days.
 *
 * Pulls the artist back to a /recover page that re-creates a fresh Vivid
 * payment link (the link expires after a few hours on Vivid's side, so
 * we always issue a new one rather than store the original).
 */
export function paymentReminderEmail(opts: {
  artistName: string;
  songTitle: string;
  genreName: string;
  recoverUrl: string;
  attemptNumber: number; // 1 = first reminder, ascending
}): { subject: string; html: string } {
  const { artistName, songTitle, genreName, recoverUrl, attemptNumber } = opts;

  // Subject + intro adapt subtly with each attempt — friendly first,
  // then more concrete, never pushy
  let subject: string;
  let intro: string;
  if (attemptNumber === 1) {
    subject = `Almost there — finish charting "${songTitle}"`;
    intro = `Your registration for <strong style="color:#fff">"${songTitle}"</strong> on the <strong style="color:#fff">${genreName}</strong> chart is one click away. The payment step did not complete — here is a quick way back to it.`;
  } else if (attemptNumber <= 3) {
    subject = `"${songTitle}" is waiting to be charted`;
    intro = `Just a quick reminder — your track <strong style="color:#fff">"${songTitle}"</strong> is reserved on the <strong style="color:#fff">${genreName}</strong> chart, but the registration is not yet finalized.`;
  } else {
    subject = `Last chance — your spot for "${songTitle}"`;
    intro = `We are holding your spot for <strong style="color:#fff">"${songTitle}"</strong> on the <strong style="color:#fff">${genreName}</strong> chart, but it will not stay reserved much longer. Here is the secure link to finalize.`;
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
        <a href="${recoverUrl}" style="display:inline-block;background:#D62828;color:#fff;padding:16px 32px;border-radius:999px;text-decoration:none;font-weight:600;font-size:16px">Complete the registration — 99,99 €</a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#9A9A9A;margin:0 0 12px">Secure payment by card, Apple Pay or Google Pay — powered by Vivid.</p>
      <p style="font-size:12px;line-height:1.6;color:#5A5A5A;margin:0">If you no longer wish to chart this track, simply ignore this email.</p>
    </td></tr>
    ${FOOTER_BLOCK}
  </table>
</td></tr></table></body></html>`,
  };
}
