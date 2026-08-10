-- Run this once in your Supabase project's SQL editor (Project -> SQL Editor -> New query).
-- It creates a table tracking each user's subscription status, kept in sync by the
-- Stripe webhook function (netlify/functions/stripe-webhook.js).

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  status text not null default 'inactive', -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive'
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- Row Level Security: a user can only ever read their OWN subscription row.
-- Nothing can INSERT/UPDATE from the client side at all — only the webhook
-- function (using the service role key, which bypasses RLS) is allowed to
-- write, so a user can never grant themselves access by calling the API directly.
alter table public.subscriptions enable row level security;

create policy "Users can read their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Convenience view the app queries to decide whether to show the tool or the paywall.
create or replace view public.my_subscription as
  select status, current_period_end
  from public.subscriptions
  where user_id = auth.uid();
