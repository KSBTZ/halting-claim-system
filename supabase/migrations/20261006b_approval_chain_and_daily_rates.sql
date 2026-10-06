-- Approval chain (who a claim is waiting on, and its review history),
-- approver levels on profiles, and per-day amounts for accommodation entries.
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Only adds things, so the current site keeps working. Safe to run again.
-- If it ever says "deadlock detected", nothing was applied: just click Run again.

-- 1. Profiles: approver title and level (1 = first level, e.g. Manager; higher = more senior)
alter table public.profiles
  add column if not exists job_title text,
  add column if not exists approval_level int;

-- Existing managers start as first-level approvers
update public.profiles
set approval_level = 1, job_title = coalesce(job_title, 'Manager')
where role = 'manager' and approval_level is null;

-- 2. Claims: who it is waiting on, and every step so far
alter table public.claims
  add column if not exists current_approver_id uuid,
  add column if not exists current_approver_name text,
  add column if not exists current_approver_title text,
  add column if not exists review_trail jsonb not null default '[]'::jsonb;

-- 3. Entries: what was typed for accommodation (per day), pocket allowance (per day) and T&T (one way).
--    accommodation_amount / pocket_allowance / tnt_allowance keep holding what each part comes to.
alter table public.entries
  add column if not exists accommodation_per_day numeric,
  add column if not exists pocket_per_day numeric,
  add column if not exists tnt_one_way numeric;

-- 4. Who can review claims: names, titles and levels only, for the "Send to" and "Forward to" lists
create or replace function public.list_approvers()
returns table (id uuid, staff_name text, job_title text, approval_level int)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.staff_name, p.job_title, p.approval_level
  from public.profiles p
  where p.role = 'manager' and p.approval_level is not null
  order by p.approval_level, p.staff_name;
$$;

-- Signed-in users only. Supabase grants new functions to anon by default, so revoke that explicitly.
revoke all on function public.list_approvers() from public, anon;
grant execute on function public.list_approvers() to authenticated;
