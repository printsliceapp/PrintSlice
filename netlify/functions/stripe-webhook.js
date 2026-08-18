// The single source of truth for "is this user actually subscribed" is
// Stripe, not anything the client claims — this function is the only place
// that ever writes to the subscriptions table (using the service-role key,
// which bypasses the read-only RLS policy every other caller is bound by),
// and it only does so in response to a signed, verified event from Stripe
// itself. Point your Stripe webhook at:
//   https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook
// listening for: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted.
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

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = event.headers['stripe-signature'];
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );

  async function upsertFromSubscription(subscription, fallbackUserId){
    const userId = subscription.metadata?.supabase_user_id || fallbackUserId;
    if (!userId){
      console.error('No supabase_user_id on subscription', subscription.id);
      return;
    }
    // As of Stripe's newer API versions, current_period_end lives on the
    // subscription ITEM, not the subscription itself — the old top-level
    // field is gone. Reading only the old field silently produced NaN here,
    // and .toISOString() on an Invalid Date throws, crashing this whole
    // handler before the database write ever ran (confirmed by direct
    // testing against a real failed webhook delivery — every subscription
    // sync was failing this way, not just one user's). Falling back to the
    // old field keeps this working if Stripe's shape ever reverts.
    const periodEndRaw = subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end;
    await supabaseAdmin.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      status: subscription.status, // 'active' | 'trialing' | 'past_due' | 'canceled' | ...
      current_period_end: periodEndRaw ? new Date(periodEndRaw * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    });
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        if (session.mode === 'subscription' && session.subscription){
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await upsertFromSubscription(subscription, session.client_reference_id);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object;
        await upsertFromSubscription(subscription);
        break;
      }
      default:
        // other event types are ignored on purpose — this app only cares
        // about whether a subscription is currently active.
        break;
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('stripe-webhook handling error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Webhook handling failed.' }) };
  }
};
