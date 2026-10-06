# Database Schema — Halting Claim App (Supabase)

⚠️ Always use these EXACT table and column names. Do not invent alternate names (e.g. no `full_name`, use `staff_name`).

## profiles
| Column | Type | Notes |
|---|---|---|
| id | uuid | matches auth.users id |
| staff_name | text | |
| department | text | |
| grade | text | |
| staff_no | text | |
| role | text | 'employee' or 'manager' only |
| job_title | text | approvers only, e.g. Manager, Managing Director |
| approval_level | int | approvers only: 1 = first level; the highest level gives final approval. Managers without one can't receive claims |

## claims
| Column | Type | Notes |
|---|---|---|
| id | uuid | auto-generated |
| employee_id | uuid | references profiles(id) |
| staff_name | text | |
| department | text | |
| grade | text | |
| staff_no | text | |
| status | text | 'Draft', 'Pending', 'Approved', 'Disapproved', 'Amended' |
| manager_comment | text | optional |
| submitted_at | timestamp | auto |
| reviewed_at | timestamp | optional |
| seen_by_employee | boolean | set to false when a manager decides; cleared by `mark_own_claims_seen()` |
| signature | text | employee's signature as a PNG data URL, required when sending |
| current_approver_id | uuid | the approver the claim is waiting on (null once decided) |
| current_approver_name | text | their name, kept on the claim so employees can see it |
| current_approver_title | text | their job title |
| review_trail | jsonb | every step so far: `{ action: submitted / forwarded / amended / approved / disapproved, at, by_id, by_name, by_title, to_id, to_name, to_title, comment }` |

## entries
| Column | Type | Notes |
|---|---|---|
| id | uuid | auto-generated |
| claim_id | uuid | references claims(id) |
| date | date | the day the claim was saved or sent (set automatically) |
| from_date | date | start of the halting period |
| to_date | date | end of the halting period |
| from_location | text | where the trip started, e.g. Accra, Head Office |
| to_location | text | where the trip went, e.g. Kumasi branch |
| number_of_nights | int | calculated from from_date and to_date |
| work_description | text | |
| allowance_type | text | 'all_inclusive' or 'accommodation' (null on entries from before this existed) |
| accommodation_amount | numeric | accommodation entries only: per day × nights |
| pocket_allowance | numeric | accommodation entries only: per day × nights |
| tnt_allowance | numeric | T&T, accommodation entries only: one way × 2 (there and back) |
| accommodation_per_day | numeric | what was typed for accommodation |
| pocket_per_day | numeric | what was typed for pocket allowance |
| tnt_one_way | numeric | what was typed for T&T |
| receipt_path | text | path of the PDF receipt in the `receipts` bucket, required for accommodation |
| allowance_entitled | numeric | entry total: nights × the fixed all-inclusive rate (`ALL_INCLUSIVE_RATE_PER_NIGHT` in `src/lib/claims.js`), or accommodation_amount + pocket_allowance + tnt_allowance |

## Storage

| Bucket | Access | Notes |
|---|---|---|
| receipts | private | PDF only, 5 MB max. Files live at `<user id>/<timestamp>-<name>.pdf`. Employees can upload, read and delete their own; managers can read all. Links are short-lived signed URLs. |

Database changes live in `supabase/migrations/`. Run each new file once in the Supabase SQL Editor.

## RPC functions

| Function | Used by | Purpose |
|---|---|---|
| get_email_by_staff_no(input_staff_no) | Login | Lets staff sign in with their Staff ID instead of email |
| is_staff_no_taken(input_staff_no) | Signup | Blocks duplicate Staff IDs |
| mark_own_claims_seen() | My Requests | Clears the unseen-update badge for the signed-in employee |
| list_approvers() | Review, Manager Inbox | Names, titles and levels of managers who can review claims (security definer, so employees can see who to send to) |

## Routes (React Router paths)

⚠️ Always use these EXACT paths. Do not invent alternate route names.

| Path | Screen | Who sees it |
|---|---|---|
| / | Login | Everyone (shared) |
| /signup | Signup | Employees only |
| /employee/new-claim | New Claim Form | Employee |
| /employee/review | Review Summary | Employee |
| /employee/my-requests | My Requests (list + detail) | Employee |
| /manager/inbox | Inbox (list + detail) | Manager |

"Here's our exact database schema — use these exact column names: [paste the file]. Now build the Review Summary screen that inserts a new claim using these tables..."