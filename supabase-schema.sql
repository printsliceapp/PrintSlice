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

-- Silent client-side error log: when the connector-placement geometry code
-- hits an unexpected exception (a real bug, not an expected rejection like
-- "too far away"), the app fire-and-forgets a row here instead of the
-- error only ever reaching the user's own DevTools console, invisible to
-- anyone else. No personal data beyond the user id and whatever mesh
-- stats are relevant to reproducing the bug (triangle counts, connector
-- type/size) — never the model geometry itself.
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  stack text,
  context jsonb
);

-- Row Level Security: any signed-in user can INSERT a report (that's the
-- whole point — this is how bugs get surfaced), but nobody, including the
-- user who wrote it, can SELECT/UPDATE/DELETE any row via the client API.
-- Reading these is a Supabase-dashboard-only action (or via the service
-- role key), matching how subscriptions is locked down above.
alter table public.client_errors enable row level security;

create policy "Signed-in users can report an error"
  on public.client_errors for insert
  with check (auth.uid() = user_id);
