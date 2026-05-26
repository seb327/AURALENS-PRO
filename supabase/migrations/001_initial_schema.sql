-- AuraLens initial schema
-- Run via:  supabase db push   (or psql -f against your project)

-- Convenience: enable required extensions.
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revenuecat_customer_id text,
  cloud_sync_enabled boolean not null default false,
  photo_upload_consent boolean not null default false,
  consent_version text
);

create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── readings ────────────────────────────────────────────────────────────────
create table if not exists public.readings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  input_type text not null check (input_type in ('camera','upload')),
  aura_label text not null,
  aura_score integer not null check (aura_score between 0 and 100),
  dominant_colour text not null,
  secondary_colour text not null,
  element text not null,
  confidence integer not null check (confidence between 0 and 100),
  zone_scores jsonb not null,
  guidance jsonb not null,
  image_quality jsonb not null,
  disclaimer_version text not null,
  source_device_id text,
  deleted_at timestamptz
);

-- one local_id per user (idempotent upsert from device)
create unique index if not exists readings_user_local_id_idx
  on public.readings (user_id, local_id)
  where local_id is not null;

create index if not exists readings_user_created_idx
  on public.readings (user_id, created_at desc);

-- ─── reading_images ──────────────────────────────────────────────────────────
create table if not exists public.reading_images (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid references public.readings(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  consent_given boolean not null default false
);

create index if not exists reading_images_user_idx
  on public.reading_images (user_id, created_at desc);

-- ─── entitlement_snapshots ──────────────────────────────────────────────────
create table if not exists public.entitlement_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  revenuecat_customer_id text,
  has_monthly boolean not null default false,
  reading_credits integer not null default 0,
  active_product_ids text[] not null default '{}',
  last_synced_at timestamptz not null default now(),
  raw jsonb
);

create index if not exists entitlement_snapshots_user_idx
  on public.entitlement_snapshots (user_id, last_synced_at desc);

-- ─── ai_buddy_messages ──────────────────────────────────────────────────────
create table if not exists public.ai_buddy_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid references public.readings(id) on delete set null,
  role text not null check (role in ('user','buddy','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_buddy_messages_user_idx
  on public.ai_buddy_messages (user_id, created_at);

-- ─── updated_at maintenance ─────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists readings_touch on public.readings;
create trigger readings_touch before update on public.readings
  for each row execute function public.touch_updated_at();
