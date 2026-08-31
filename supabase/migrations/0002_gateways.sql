-- Privacy — gateways + deposits.
-- Run this in the Supabase SQL editor (or via `supabase db push` / psql).

-- Singleton row keyed by `id = 'global'` (we only support one set of gateway
-- credentials right now). `data` holds provider-specific blobs:
--   data.waymb = { client_id, client_secret, account_email }
--   data.notify_url_created = string
--   data.notify_url_paid    = string
create table if not exists public.gateway_settings (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

insert into public.gateway_settings (id, data)
values ('global', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.gateway_settings enable row level security;
-- No public policies: SERVICE_ROLE bypasses RLS, browsers can't read this.

-- One row per checkout attempt. provider_transaction_id is the WayMB id we get
-- back; status mirrors WayMB's PENDING|COMPLETED|DECLINED but uppercase.
create table if not exists public.deposits (
  id                       uuid primary key default gen_random_uuid(),
  provider                 text not null default 'waymb',
  provider_transaction_id  text,
  model_slug               text references public.models(slug) on delete set null,
  amount                   numeric(12,2) not null,
  currency                 text not null,
  method                   text not null,
  status                   text not null default 'PENDING',
  payer                    jsonb,
  reference_data           jsonb,
  raw_create_response      jsonb,
  raw_webhook              jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index if not exists deposits_provider_tx_idx
  on public.deposits (provider, provider_transaction_id)
  where provider_transaction_id is not null;
create index if not exists deposits_model_slug_idx on public.deposits (model_slug);
create index if not exists deposits_status_idx on public.deposits (status);
create index if not exists deposits_created_at_idx on public.deposits (created_at desc);

alter table public.deposits enable row level security;
-- No public policies: deposits are admin/server-only.
