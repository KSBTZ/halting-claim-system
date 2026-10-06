-- Trip locations, allowance breakdown, accommodation receipts and signatures.
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Only adds columns, a bucket and policies, so the current site keeps working. Safe to run again.

-- Tables are changed in the order the app reads them (claims, then entries)
-- so the script doesn't deadlock with someone using the site.
-- If it ever does, nothing is applied: just click Run again.

-- 1. Claims: the employee's signature, stored as a PNG data URL
alter table public.claims add column if not exists signature text;

-- 2. Entries: where the trip went and how the allowance is made up
alter table public.entries
  add column if not exists from_location text,
  add column if not exists to_location text,
  add column if not exists allowance_type text,
  add column if not exists accommodation_amount numeric,
  add column if not exists pocket_allowance numeric,
  add column if not exists tnt_allowance numeric,
  add column if not exists receipt_path text;

alter table public.entries drop constraint if exists entries_allowance_type_check;
alter table public.entries
  add constraint entries_allowance_type_check
  check (allowance_type is null or allowance_type in ('all_inclusive', 'accommodation'));

-- 3. Private bucket for accommodation receipts: PDF only, 5 MB max
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 4. Who can use the bucket. Files are stored as receipts/<user id>/<file>.pdf
drop policy if exists "Employees upload own receipts" on storage.objects;
create policy "Employees upload own receipts" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Employees read own receipts" on storage.objects;
create policy "Employees read own receipts" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Employees delete own receipts" on storage.objects;
create policy "Employees delete own receipts" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Managers read all receipts" on storage.objects;
create policy "Managers read all receipts" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager')
  );
