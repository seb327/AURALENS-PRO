-- AuraLens RLS policies.
-- Run after 001_initial_schema.sql.

-- ─── profiles ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles: own select" on public.profiles;
create policy "profiles: own select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: own update" on public.profiles;
create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles: own insert" on public.profiles;
create policy "profiles: own insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ─── readings ────────────────────────────────────────────────────────────────
alter table public.readings enable row level security;

drop policy if exists "readings: own select" on public.readings;
create policy "readings: own select"
  on public.readings for select
  using (auth.uid() = user_id);

drop policy if exists "readings: own insert" on public.readings;
create policy "readings: own insert"
  on public.readings for insert
  with check (auth.uid() = user_id);

drop policy if exists "readings: own update" on public.readings;
create policy "readings: own update"
  on public.readings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "readings: own delete" on public.readings;
create policy "readings: own delete"
  on public.readings for delete
  using (auth.uid() = user_id);

-- ─── reading_images ─────────────────────────────────────────────────────────
alter table public.reading_images enable row level security;

drop policy if exists "reading_images: own all" on public.reading_images;
create policy "reading_images: own all"
  on public.reading_images for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── entitlement_snapshots ─────────────────────────────────────────────────
alter table public.entitlement_snapshots enable row level security;

drop policy if exists "entitlement_snapshots: own select" on public.entitlement_snapshots;
create policy "entitlement_snapshots: own select"
  on public.entitlement_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "entitlement_snapshots: own insert" on public.entitlement_snapshots;
create policy "entitlement_snapshots: own insert"
  on public.entitlement_snapshots for insert
  with check (auth.uid() = user_id);

drop policy if exists "entitlement_snapshots: own delete" on public.entitlement_snapshots;
create policy "entitlement_snapshots: own delete"
  on public.entitlement_snapshots for delete
  using (auth.uid() = user_id);

-- ─── ai_buddy_messages ─────────────────────────────────────────────────────
alter table public.ai_buddy_messages enable row level security;

drop policy if exists "ai_buddy_messages: own all" on public.ai_buddy_messages;
create policy "ai_buddy_messages: own all"
  on public.ai_buddy_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── storage bucket policies ───────────────────────────────────────────────
-- Bucket "reading-images" must be created as PRIVATE (Storage UI or:
--   insert into storage.buckets (id, name, public) values ('reading-images','reading-images', false);
-- )

-- Users may only read/write objects under their own user-id prefix.
drop policy if exists "reading-images: own select" on storage.objects;
create policy "reading-images: own select"
  on storage.objects for select
  using (
    bucket_id = 'reading-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "reading-images: own insert" on storage.objects;
create policy "reading-images: own insert"
  on storage.objects for insert
  with check (
    bucket_id = 'reading-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "reading-images: own delete" on storage.objects;
create policy "reading-images: own delete"
  on storage.objects for delete
  using (
    bucket_id = 'reading-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
