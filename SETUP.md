# PrintSlice — sign-up + subscription setup

Everything is scaffolded and committed locally. Here's exactly what's left, in order. None of these steps can be done for you — they involve creating accounts and entering real payment/API credentials, which only you should handle.

## 1. Create your Supabase project (free)

1. Go to [supabase.com](https://supabase.com) → sign up → "New project."
2. Once it's created, go to **SQL Editor** → New query → paste the contents of `supabase-schema.sql` (in this folder) → Run. This creates the `subscriptions` table that tracks who's paid.
3. Go to **Authentication → Providers** and make sure "Email" is enabled (it is by default). Optionally turn off "Confirm email" under Authentication → Settings if you don't want the email-confirmation step during testing.
4. Go to **Settings → API**. You'll need two values from here in step 4 below:
   - **Project URL**
   - **anon / public key**
   (There's also a **service_role** key — copy that too, you'll need it for Netlify, but never put it in `index.html` or anywhere client-side; it's secret.)

## 2. Create your Stripe product (free to set up; test mode first)

1. Go to [stripe.com](https://stripe.com) → sign up.
2. Stay in **Test mode** (toggle top-right) while you get everything working — you can switch to Live mode later once it all works.
3. Go to **Product catalog → Add product**. Name it (e.g. "PrintSlice Pro"), set pricing to **Recurring, Monthly**, whatever price you want (the page currently shows "$9/month" — update that in `index.html` if you pick a different number). Save, then copy the **Price ID** (starts with `price_`).
4. Go to **Developers → API keys**. Copy the **Secret key** (starts with `sk_test_`).
5. You'll set up the **webhook** in step 4, after the site is deployed (Stripe needs a real URL to send events to).

## 3. Fill in the public config in `index.html`

Open `index.html`, find this near the top of the auth script (search for `SUPABASE_URL`):

```js
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Replace both with the values from step 1.4. These two are safe to be public/committed — real protection comes from Supabase's Row Level Security policy (already set up by the schema), not from hiding these.

## 4. Deploy to Netlify and set the secret environment variables

1. Push this folder to GitHub (or connect it directly — Netlify can also deploy straight from a local folder via drag-and-drop, but you'll want GitHub eventually so pushes auto-deploy).
2. On [app.netlify.com](https://app.netlify.com), "Add new site" → connect the repo (or drag-drop the folder for a first deploy).
3. Go to **Site configuration → Environment variables** and add these (all secret — never put these in the HTML file or commit them):
   - `SUPABASE_URL` — same project URL as before
   - `SUPABASE_SERVICE_ROLE_KEY` — the service_role key from step 1.4
   - `STRIPE_SECRET_KEY` — from step 2.4
   - `STRIPE_PRICE_ID` — from step 2.3
   - `STRIPE_WEBHOOK_SECRET` — you'll get this in the next step
4. Redeploy (Netlify → Deploys → Trigger deploy) so the functions pick up the new environment variables.
5. Now that you have a real URL (e.g. `https://your-site.netlify.app`), go back to Stripe → **Developers → Webhooks → Add endpoint**:
   - Endpoint URL: `https://your-site.netlify.app/.netlify/functions/stripe-webhook`
   - Events to send: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - After creating it, copy the **Signing secret** (starts with `whsec_`) and set it as `STRIPE_WEBHOOK_SECRET` in Netlify (step 4.3), then redeploy once more.

## 5. Test the whole flow

1. Visit your site → Sign up with a test email → log in.
2. You should land on the paywall screen ("PrintSlice Pro — $9/month").
3. Click Subscribe → Stripe Checkout opens → use a [Stripe test card](https://stripe.com/docs/testing) (`4242 4242 4242 4242`, any future expiry, any CVC).
4. After payment, you're redirected back and — within a couple seconds while the webhook lands — the tool itself should unlock.
5. "Manage billing" should open Stripe's portal where you can cancel; canceling should re-lock the tool the next time the subscription period ends (or immediately, depending on how you configure cancellation in Stripe).

## 6. Go live

Once everything works in Stripe test mode, flip Stripe to **Live mode**, create the same product/price there, and swap `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` in Netlify for the live-mode equivalents (you'll need a separate live-mode webhook endpoint too, same URL, created the same way).

## 7. Maintenance: auditing subscriber data

`scripts/audit-subscriptions.js` checks every row in the `subscriptions` table against Stripe and flags any with a `stripe_customer_id` that no longer exists there (the same issue found on 2026-08-18, where a webhook crash left some rows stale). Read-only — it never writes anything, just prints SQL for you to run on any row it flags. Run it locally with your own keys:

```bash
npm install
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... STRIPE_SECRET_KEY=... node scripts/audit-subscriptions.js
```

---

**If you get stuck on any step, tell me what you're seeing and I'll help debug it** — I just can't complete the account-creation/credential-entry steps themselves on your behalf.
