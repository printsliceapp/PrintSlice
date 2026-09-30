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

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      customer: existing?.stripe_customer_id || undefined,
      customer_email: existing?.stripe_customer_id ? undefined : user.email,
      success_url: `${siteUrl}/app.html?checkout=success`,
      cancel_url: `${siteUrl}/app.html?checkout=cancelled`,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
        ...(grantTrial ? { trial_period_days: 7 } : {}),
      },
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not start checkout.' }) };
  }
};
