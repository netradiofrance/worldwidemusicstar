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
    <tr><td style="padding:0 0 32px 0;text-align:center">
      <span style="font-family:Anton,Impact,sans-serif;font-size:32px;letter-spacing:-0.02em;color:#F5F5F5">WORLDWIDE <span style="color:#D62828">MUSIC</span> STAR</span>
    </td></tr>
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
    <tr><td style="padding:24px 0;text-align:center;font-size:12px;color:#5A5A5A">
      <p style="margin:0">© 2026 WorldWide Music Star. The Power to Be Charted.</p>
    </td></tr>
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
  return {
    subject: `Receipt — WorldWide Music Star ($${amount.toFixed(2)})`,
    html: `<!doctype html><html><body style="background:#0A0A0A;color:#F5F5F5;font-family:Inter,Arial,sans-serif;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111;border-radius:16px">
    <tr><td style="padding:40px 32px">
      <h2 style="font-family:Anton,Impact,sans-serif;font-size:24px;margin:0 0 16px;color:#fff">Payment received</h2>
      <p style="color:#C9C9C9;margin:0 0 16px">Hi ${artistName}, here is the receipt for your chart entry.</p>
      <table width="100%" style="border-top:1px solid #262626;margin-top:16px">
        <tr><td style="padding:12px 0;color:#9A9A9A">Track</td><td style="padding:12px 0;text-align:right;color:#fff">${songTitle}</td></tr>
        <tr><td style="padding:12px 0;color:#9A9A9A">Amount</td><td style="padding:12px 0;text-align:right;color:#fff">$${amount.toFixed(2)} USD</td></tr>
        <tr><td style="padding:12px 0;color:#9A9A9A">Order ID</td><td style="padding:12px 0;text-align:right;color:#fff;font-family:monospace;font-size:13px">${orderId}</td></tr>
      </table>
    </td></tr>
  </table>
</td></tr></table></body></html>`,
  };
}
