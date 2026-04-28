# WorldWide Music Star

The global music chart platform — fan-vote-driven rankings, Spotify and YouTube integration, paid artist submissions, AI-generated blog, monthly awards.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Storage) · Vercel · Anthropic (Claude) · OpenAI (gpt-image-1) · PayPal · Mailjet · Google IMA SDK

---

## What is in this repo

```
app/
  (public)/         Public site — home, charts, blog, archives, add-a-song, track detail, legal
  admin/            Backoffice — login, dashboard, artists, articles, awards
  api/              All API routes
    spotify/        Search + refresh
    youtube/        Refresh
    votes/          Vote casting (anti-fraud, IMA-validated)
    payment/        PayPal create + webhook (Stripe placeholder)
    blog/           AI article generation
    cron/           Refresh counters, monthly archive, generate articles
    admin/          Auth + tracks + articles management
    subscribe/      Newsletter signup
components/         UI components (charts, layout, admin)
lib/                supabase, scoring, spotify, youtube, paypal, email, voting, admin-auth, charts, articles, markdown
public/             logo.png, favicon.png, images/trophy.jpg
supabase/migrations/ 001_init.sql (schema), 002_seed.sql (sample data)
scripts/            seed.ts (creates first admin user)
middleware.ts       Protects /admin
vercel.json         Cron schedules
```

---

## Deployment — step by step

### 1) Create the Supabase project

1. Go to [https://app.supabase.com](https://app.supabase.com), create a new project.
2. In the SQL editor, paste and run `supabase/migrations/001_init.sql`.
3. (Optional but recommended for launch) Run `supabase/migrations/002_seed.sql` to pre-populate sample charts.
4. Go to Storage → create a bucket called `blog-covers`, set it **public**.
5. In Settings → API, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never commit)

### 2) Get the third-party API keys

| Service | What you need | Where |
|---|---|---|
| Spotify | Client ID + Client Secret | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → Create App |
| YouTube Data API v3 | API key | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Enable "YouTube Data API v3" → Credentials |
| Anthropic | API key | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | API key with image generation access | [platform.openai.com](https://platform.openai.com) |
| Mailjet | API key + Secret key | [app.mailjet.com](https://app.mailjet.com) → Account → API Keys |
| PayPal | Client ID + Secret + Webhook ID | [developer.paypal.com](https://developer.paypal.com) → My Apps & Credentials |

For PayPal, also create a webhook in the PayPal dashboard pointing to:
```
https://your-domain.com/api/payment/paypal/webhook
```
Subscribe to events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`. Save and copy the Webhook ID into `PAYPAL_WEBHOOK_ID`.

### 3) Push to GitHub

```bash
cd wwms
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:YOUR_USERNAME/worldwidemusicstar.git
git push -u origin main
```

### 4) Create the Vercel project

1. Go to [vercel.com/new](https://vercel.com/new), import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. **Environment Variables**: copy each value from your filled `.env.example` into Vercel project settings → Environment Variables. Set them for **Production** and **Preview**.
4. Click **Deploy**. First deploy will succeed even without a custom domain.

### 5) Point your domain to Vercel

In Vercel → your project → Settings → Domains, add `worldwidemusicstar.com` and `www.worldwidemusicstar.com`. Vercel will display the exact records to set at your registrar:

- Apex `worldwidemusicstar.com` → **A record** to `76.76.21.21`
- `www.worldwidemusicstar.com` → **CNAME** to `cname.vercel-dns.com`

SSL certificate is provisioned automatically by Vercel after DNS propagates.

### 6) Create the first admin user

Locally, with the `.env.local` file populated:

```bash
npm install
ADMIN_EMAIL='admin@worldwidemusicstar.com' \
ADMIN_PASSWORD='choose-a-strong-password' \
npm run seed
```

Then visit `https://worldwidemusicstar.com/admin/login` to log in.

### 7) Verify cron jobs

In Vercel → your project → Settings → Crons, you should see:

- **Refresh counters** — every 6 hours
- **Generate articles** — 4 times a day (06:00, 12:00, 18:00, 22:00 UTC)
- **Monthly archive** — at 00:05 UTC on the 1st of each month

Set `CRON_SECRET` in env so cron requests are authenticated.

---

## Local development

```bash
npm install
cp .env.example .env.local       # then fill in your keys
npm run dev                       # http://localhost:3000
```

Run a chart refresh manually:
```bash
curl -X POST http://localhost:3000/api/cron/refresh-counters \
     -H "x-cron-secret: $CRON_SECRET"
```

Generate one article:
```bash
curl -X POST http://localhost:3000/api/blog/generate \
     -H "x-cron-secret: $CRON_SECRET"
```

---

## How the platform works

### The score
For each track:
```
score = (votes × 3) + (Spotify followers × 1) + (YouTube subscribers × 1)
```
Tweak the weights in `lib/scoring.ts`.

### The vote
Fans click "Vote", a Google IMA SDK ad is loaded with the VAST tag from `NEXT_PUBLIC_VAST_TAG_URL`. Only when the ad fires the `COMPLETE` event does the front-end POST to `/api/votes/cast`. The server stores `sha256(ip || user-agent || day)` as the voter hash, with a unique constraint per `(track, voter)`. One vote per (IP+UA+day) per track.

### The submission
Artist fills the form (Spotify autocomplete + YouTube URL + genre + email), is redirected to PayPal. On payment confirmation (PayPal webhook), the track is activated and emails are sent via Mailjet (chart confirmation + receipt).

### The articles
Cron triggers `/api/blog/generate` 4× daily. Claude writes a 600-800-word article in JSON output, OpenAI generates a cover, the article is saved as **draft**. Admin reviews and clicks "Publish".

### The monthly archive
On the 1st of each month at 00:05 UTC, the `monthly-archive` cron freezes the previous month's charts (overall + per genre) into `chart_archives`, and records the overall #1 as the **WorldWide Music Star award winner** in the `awards` table.

---

## Going live checklist

- [ ] Supabase project created, schema migrations run, `blog-covers` bucket public
- [ ] All env vars set in Vercel
- [ ] Vercel project deployed and accessible at `*.vercel.app`
- [ ] Custom domain pointed and SSL provisioned
- [ ] Admin user seeded
- [ ] PayPal webhook tested in sandbox (use `PAYPAL_ENV=sandbox` first)
- [ ] One real `npm run dev` end-to-end submission tested locally
- [ ] Switch `PAYPAL_ENV=live` and update `PAYPAL_CLIENT_ID/SECRET/WEBHOOK_ID` to live values
- [ ] Replace placeholder copy in `/legal` with real Terms / Privacy
- [ ] Confirm cron jobs are firing (Vercel → Logs)

---

## Notes

- **Stripe** is wired as a placeholder (`STRIPE_ENABLED=false`). Implementation in `app/api/payment/stripe/webhook/route.ts` is a stub; the rest of the flow is identical to PayPal.
- **The IMA / VAST tag** is currently the one used on tackendo.com. For production volume on this site, request a dedicated ad unit from your ad operator and replace `NEXT_PUBLIC_VAST_TAG_URL`.
- **Rate-limiting & advanced anti-fraud** (Cloudflare Turnstile, per-/24 throttling, etc.) are not in this MVP — add them on top of `/api/votes/cast` once traffic justifies it.
- The **score recomputation** on counter refresh assumes `score` lives on the row; if the formula changes, the next cron will rewrite all scores correctly.
