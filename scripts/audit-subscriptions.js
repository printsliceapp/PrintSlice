// One-off maintenance script — NOT deployed, never wired into the site or
// Netlify functions. Run this locally whenever you want to check whether
// any subscriber's stored stripe_customer_id has gone stale (the exact bug
// found on 2026-08-18: the webhook was silently crashing on every
// subscription event because Stripe moved current_period_end off the
// subscription object, so stripe_customer_id was never getting corrected
// after a customer's real ID changed).
//
// Usage (from the PrintSlice-site directory):
//   npm install                     (only needed once, for stripe + @supabase/supabase-js)
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... STRIPE_SECRET_KEY=... node scripts/audit-subscriptions.js
//
// Get the three values from:
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — Supabase dashboard → Project Settings → API
//   STRIPE_SECRET_KEY                        — the same live key Netlify's functions use
//
// This only READS data (from Supabase and Stripe) — it never writes
// anything. For any row it flags, it prints the SQL to fix it, but you
// run that yourself after checking it looks right.

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
  console.error('Missing one or more required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const stripe = Stripe(STRIPE_SECRET_KEY);

async function main(){
  const { data: rows, error } = await supabase
    .from('subscriptions')
    .select('user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, updated_at');
  if (error) {
    console.error('Failed to read subscriptions table:', error.message);
    process.exit(1);
  }

  console.log(`Checking ${rows.length} subscription row(s)...\n`);

  let flagged = 0;
  for (const row of rows) {
    if (!row.stripe_customer_id) {
      console.log(`- SKIP user_id=${row.user_id}: no stripe_customer_id on file (never subscribed, or an early-access-only grant).`);
      continue;
    }
    try {
      const customer = await stripe.customers.retrieve(row.stripe_customer_id);
      if (customer.deleted) {
        throw new Error('customer exists but was deleted');
      }
      console.log(`- OK   user_id=${row.user_id}: ${row.stripe_customer_id} (${customer.email || 'no email on Stripe record'})`);
    } catch (err) {
      flagged++;
      console.log(`- BAD  user_id=${row.user_id}: ${row.stripe_customer_id} — ${err.message}`);
      console.log('       Find their real customer ID in Stripe (search by email), then run:');
      console.log(`       update public.subscriptions set stripe_customer_id = 'cus_REPLACE_ME', updated_at = now() where user_id = '${row.user_id}';`);
    }
  }

  console.log(`\nDone. ${flagged} of ${rows.length} row(s) flagged.`);
  if (flagged > 0) {
    console.log('For each flagged row, also worth resending its recent failed webhook events from Stripe (Developers -> Webhooks -> your endpoint -> Resend) now that the crash is fixed, so future renewals sync automatically.');
  }
}

main();
