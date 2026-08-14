-- Run this once in the Supabase SQL editor for your project.
-- Single-row table holding the whole spin-wheel state as JSONB,
-- kept in sync live across the admin tab and audience display via Realtime.

create table if not exists public.wheel_state (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.wheel_state enable row level security;

-- Public demo app: anyone with the anon key can read/write the single shared row.
-- Tighten this (e.g. require auth) if the wheel needs real access control.
create policy "wheel_state read" on public.wheel_state for select using (true);
create policy "wheel_state write" on public.wheel_state for insert with check (true);
create policy "wheel_state update" on public.wheel_state for update using (true);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wheel_state_updated_at on public.wheel_state;
create trigger wheel_state_updated_at
  before update on public.wheel_state
  for each row execute function public.set_updated_at();

-- Enable Realtime for this table: Database > Replication > supabase_realtime > add wheel_state.

-- Merges only the changed fields into the row, atomically, server-side.
-- Using this instead of a full-row overwrite prevents one browser tab/device
-- from clobbering changes another tab made concurrently (last-write-wins on
-- the whole blob was overwriting members/settings set by other open tabs).
create or replace function public.merge_wheel_state(patch jsonb)
returns void language sql as $$
  update public.wheel_state set data = data || patch where id = 1;
$$;

-- Storage bucket for member photos. Photos are cropped/resized client-side
-- to small JPEGs and uploaded here, so the shared state row only ever holds
-- a short URL — not multi-MB base64 blobs (which was overloading the
-- realtime broadcast payload and causing syncs to silently stop working).
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', true)
on conflict (id) do nothing;

create policy "member photos public read" on storage.objects
  for select using (bucket_id = 'member-photos');
create policy "member photos public upload" on storage.objects
  for insert with check (bucket_id = 'member-photos');
create policy "member photos public update" on storage.objects
  for update using (bucket_id = 'member-photos');
