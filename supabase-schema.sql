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

-- Auto-grant every new signup a 7-day trial, instead of leaving them on
-- 'inactive' until someone manually reviews and runs a one-off SQL grant.
-- That manual gate was adding a multi-step, human-in-the-loop delay between
-- signing up and actually getting to use a "free trial" tool — this makes
-- it instant. SECURITY DEFINER is required because this needs to write to
-- public.subscriptions, which RLS otherwise locks to the webhook alone.

-- Permanent record of which (normalized) emails have ever claimed a trial —
-- kept even if the account behind it is later deleted, so someone can't
-- just delete-and-resignup with the same email for another free week.
-- This can't stop someone using an entirely different real email address
-- (nothing short of requiring a card can), but it closes the easy/obvious
-- loophole of Gmail's dot and "+tag" tricks (you@gmail.com,
-- you+trial2@gmail.com and y.o.u@gmail.com all land in the same inbox).
create table if not exists public.trial_grants (
  email_normalized text primary key,
  first_user_id uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now()
);

-- Row Level Security with no policies at all = fully locked from the
-- client API in every direction — only the SECURITY DEFINER function
-- below (and the Supabase dashboard) can ever touch this table.
alter table public.trial_grants enable row level security;

create or replace function public.grant_signup_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  norm_email text;
begin
  norm_email := lower(new.email);
  if norm_email like '%@gmail.com' then
    norm_email := replace(split_part(split_part(norm_email, '@', 1), '+', 1), '.', '') || '@gmail.com';
  end if;

  -- Try to claim this normalized email. If it's already been claimed,
  -- this silently does nothing and FOUND ends up false below — meaning
  -- an equivalent email already got its one trial, so this account
  -- stays on the 'inactive' default instead of getting another.
  insert into public.trial_grants (email_normalized, first_user_id)
  values (norm_email, new.id)
  on conflict (email_normalized) do nothing;

  if found then
    insert into public.subscriptions (user_id, status, current_period_end)
    values (new.id, 'trialing', now() + interval '7 days')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_trial on auth.users;
create trigger on_auth_user_created_grant_trial
  after insert on auth.users
  for each row execute function public.grant_signup_trial();
