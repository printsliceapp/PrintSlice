// Lets an already-subscribed user open Stripe's hosted Customer Portal to
// update their card, view invoices, or cancel — Stripe handles all of that
// UI itself, so none of it needs to be built here.
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
// see create-checkout-session.js for why this is needed — Supabase's
// client crashes on Netlify's Node 20 runtime without an explicit
// WebSocket transport, even though this function never uses realtime.
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

  // TEMP diagnostic tag while tracking down a live "wrong customer id"
  // report — included on every response below so the client can see
  // exactly which authenticated user/row this request actually resolved,
  // without needing server log access. Remove once resolved.
  const debugTag = 'uid=' + userData.user.id + ' email=' + userData.user.email;

  const { data: sub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return { statusCode: 404, body: JSON.stringify({ error: 'No subscription on file. [' + debugTag + (subErr ? ' dberr=' + subErr.message : '') + ']' }) };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${siteUrl}/app.html`,
    });
    return { statusCode: 200, body: JSON.stringify({ url: portalSession.url }) };
  } catch (err) {
    console.error('create-portal-session error:', err);
    // Temporarily surfacing the real Stripe error message (not just a
    // generic one) to the client while diagnosing a live failure — safe
    // here since only the already-authenticated owner of this subscription
    // ever sees it, never a stranger.
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not open billing portal: ' + (err.message || 'unknown error') + ' [' + debugTag + ']' }) };
  }
};
