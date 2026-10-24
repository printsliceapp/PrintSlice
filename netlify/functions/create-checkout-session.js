// Creates a Stripe Checkout Session (subscription mode) for the currently
// logged-in Supabase user, and returns the URL the browser should redirect
// to. The user's identity is verified server-side from their Supabase
// access token — never trusted from anything the client sends directly.
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
// Supabase's client always sets up a realtime/WebSocket connection
// internally, even though this function never uses it — Netlify's Node 20
// functions runtime has no native WebSocket global, so without an explicit
// transport it crashes every request with "Node.js 20 detected without
// native WebSocket support" (confirmed by direct testing). Passing the
// `ws` package in explicitly is the fix Supabase's own error suggests.
const ws = require('ws');

// Referral codes come in two kinds:
//   creator  — a short code like MAKERJOE: a Stripe promotion code for a
//              creator / affiliate (3–16 letters or digits);
//   customer — "u" + the referring user's id in base 62 (from referrals.js),
//              for "give a week, get a week".
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function referralFromCode(code){
  if (/^[A-Za-z0-9]{3,16}$/.test(code)) return { type: 'creator', code };
  if (/^u[0-9A-Za-z]{22}$/.test(code)){
    let n = 0n;
    for (const ch of code.slice(1)) n = n * 62n + BigInt(B62.indexOf(ch));
    const hex = n.toString(16).padStart(32, '0');
    if (hex.length !== 32) return null;
    return { type: 'customer', userId: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` };
  }
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in.' }) };
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid session.' }) };
  }
  const user = userData.user;

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';

  let withTrial = false;
  try {
    const body = JSON.parse(event.body || '{}');
    withTrial = body.withTrial === true;
  } catch { /* no body / not JSON — treat as a plain (no-trial) checkout */ }

  // Referral code, if they arrived through a /r/<code> link (referrals.js
  // stores it in the printslice_ref cookie, which comes along on this
  // same-site request). Two kinds — see referralFromCode below.
  const refCookie = (event.headers.cookie || '').split(/;\s*/).find(c => c.startsWith('printslice_ref='));
  const ref = refCookie ? decodeURIComponent(refCookie.slice('printslice_ref='.length)) : '';
  const referral = referralFromCode(ref);

  try {
    // Reuse an existing Stripe customer for this user if one is already on
    // file, instead of creating a new one on every checkout attempt.
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Only a genuinely first-time customer (no Stripe customer on file yet)
    // can get the trial — otherwise anyone could cancel and re-checkout
    // their way into repeated free weeks. This is the ONLY place a trial
    // gets granted now: card is collected up front via Checkout, and Stripe
    // itself auto-charges when trial_period_days runs out (see the webhook,
    // which just mirrors whatever status Stripe reports — it doesn't need
    // to know anything special about trials).
    const grantTrial = withTrial && !existing?.stripe_customer_id;

    // "Give a week, get a week": a friend referred by an existing customer
    // gets a 14-day trial instead of 7. Their referrer is credited a week
    // once this subscription is first paid (see stripe-webhook.js), which
    // is why the referrer is recorded on the subscription. No self-referrals.
    const friendOf = referral?.type === 'customer' && referral.userId !== user.id ? referral.userId : null;
    const trialDays = friendOf ? 14 : 7;

    // A creator's code is applied automatically. If it isn't a live Stripe
    // promotion code (typo, expired, or not valid for this customer), fall
    // back to the normal "Add promotion code" box so checkout still works.
    let promo = null;
    if (referral?.type === 'creator'){
      const found = await stripe.promotionCodes.list({ code: referral.code, active: true, limit: 1 });
      promo = found.data[0] || null;
    }

    const params = (withPromo) => ({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      customer: existing?.stripe_customer_id || undefined,
      customer_email: existing?.stripe_customer_id ? undefined : user.email,
      success_url: `${siteUrl}/app.html?checkout=success`,
      cancel_url: `${siteUrl}/app.html?checkout=cancelled`,
      metadata: { supabase_user_id: user.id },
      // Either the creator's code is already applied, or there's an "Add
      // promotion code" link for typing one in. Stripe allows one or the other.
      // Codes are made in the Stripe dashboard (Product catalogue -> Coupons),
      // which also tracks each one's redemptions.
      ...(withPromo ? { discounts: [{ promotion_code: withPromo.id }] } : { allow_promotion_codes: true }),
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          ...(withPromo ? { affiliate_code: withPromo.code } : {}),
          ...(friendOf && grantTrial ? { referred_by: friendOf } : {}),
        },
        ...(grantTrial ? { trial_period_days: trialDays } : {}),
      },
      // Shown right by Stripe's pay button. Nobody abandoning checkout had
      // even tried entering a card — the worry is "am I being charged now?",
      // so answer that at the exact moment they're deciding.
      ...(grantTrial ? { custom_text: { submit: {
        message: `You won't be charged today. Your ${trialDays}-day free trial starts now, and you'll only pay £3.99/month if you don't cancel before it ends. Cancel anytime from "Manage billing" in the app.`,
      } } } : {}),
    });

    let session;
    try {
      session = await stripe.checkout.sessions.create(params(promo));
    } catch (err) {
      if (!promo) throw err;
      console.warn('Promotion code not applicable, continuing without it:', referral.code, err.message);
      session = await stripe.checkout.sessions.create(params(null));
    }

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not start checkout.' }) };
  }
};
