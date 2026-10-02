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

## entries
| Column | Type | Notes |
|---|---|---|
| id | uuid | auto-generated |
| claim_id | uuid | references claims(id) |
| date | date | |
| from_date | date | start of the halting period |
| to_date | date | end of the halting period |
| number_of_nights | int | |
| work_description | text | |
| allowance_entitled | numeric | |

## RPC functions

| Function | Used by | Purpose |
|---|---|---|
| get_email_by_staff_no(input_staff_no) | Login | Lets staff sign in with their Staff ID instead of email |
| is_staff_no_taken(input_staff_no) | Signup | Blocks duplicate Staff IDs |
| mark_own_claims_seen() | My Requests | Clears the unseen-update badge for the signed-in employee |

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