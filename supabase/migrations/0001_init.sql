-- Privacy — initial schema.
-- Run this in the Supabase SQL editor (or via `supabase db push` / psql).

create table if not exists public.models (
  slug        text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists models_locale_idx on public.models ((data->>'locale'));
create index if not exists models_updated_at_idx on public.models (updated_at desc);

-- Public Storage bucket for avatars/covers. Server uploads via service role;
-- anyone can read.
insert into storage.buckets (id, name, public)
values ('model-images', 'model-images', true)
on conflict (id) do update set public = true;

-- RLS: keep table locked down. The API uses the SERVICE_ROLE key which bypasses
-- RLS, so we only need a public read path if we ever want browser-direct reads.
alter table public.models enable row level security;

drop policy if exists "models_public_read" on public.models;
create policy "models_public_read"
  on public.models for select
  to anon
  using (true);
