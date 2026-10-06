# Halting Claim System · SIC Life

A web app for SIC Life staff to submit **halting (overnight allowance) claims** and for managers to review them.

- **Employees** fill in a claim (up to 3 trips: places, dates and allowance), then review, sign and send it, or save it as a draft. Nights are counted from the dates. Accommodation claims need the PDF receipt. My Requests tracks each claim's status and shows the manager's comments.
- **Approvers** work in a chain. The employee sends a claim to a first-level manager; managers recommend and forward it to someone more senior, or disapprove it; only the highest level (e.g. the Managing Director) gives final approval. Each approver's inbox shows claims waiting on them and ones they've handled, with the full history on every claim.

### Setting up approvers

An approver is a `profiles` row with `role = 'manager'` and an `approval_level` (1 = first level, higher = more senior; the highest level gives final approval). New staff sign up as employees; to make someone an approver, edit their row in Supabase → Table Editor → profiles, or run:

```sql
update profiles set role = 'manager', job_title = 'Managing Director', approval_level = 2 where staff_no = 'SIC12345';
```

Built with React 19, Vite, Tailwind CSS, TanStack Query and Supabase (auth, Postgres, storage).

Data is cached in memory, so moving between pages is instant, and refreshes in the background: the manager inbox every 20 seconds, employee pages every 30, and whenever the tab comes back into view. Open tabs check for a newer deploy and offer a **Refresh** button when one is live.

## Getting started

```bash
npm install
cp .env.example .env.local   # then add your Supabase URL and anon key
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

The app is deployed on Vercel; `vercel.json` rewrites every path to `index.html` so client-side routes survive a refresh.

## Database setup

The app expects the tables, columns and storage bucket described in [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md). When a new file appears in `supabase/migrations/`, open Supabase → **SQL Editor** → **New query**, paste the file in and click **Run**, once, before deploying the code that needs it. The scripts are safe to run again.

## Project structure

```
src/
  components/      Shared UI
    AppLayout.jsx        Signed-in shell: sidebar, mobile top bar, logout
    AuthLayout.jsx       Branded split layout for Login / Signup
    FeedbackProvider.jsx Toasts and confirm dialogs (use via useFeedback)
    EntryEditor.jsx      Editable claim entry (New Claim, manager Amend)
    DatePicker.jsx       Calendar date field (dd/mm/yyyy) with an Ok/Cancel dialog
    EntryTable.jsx       Read-only entries list, adapts to its container width
    ReceiptField.jsx     Receipt PDF upload and "View receipt" link
    ReviewTrail.jsx      A claim's history: submitted, forwarded, approved…
    SignaturePad.jsx     Draw-to-sign box for mouse or finger
    UpdateBanner.jsx     "New version ready" prompt after a deploy
    ui.jsx               Small building blocks: badges, tabs, stat cards, stepper…
  hooks/
    useAppData.js     Cached Supabase queries (profile, claims, unseen count) with auto refresh
    useFeedback.js    toast() and confirm() from anywhere in the app
    useNewVersion.js  Detects a newer deploy via /version.json
  lib/
    approvals.js     Approval chain rules (levels, who can forward to whom, final approval)
    claims.js        Claim rules (limits, validation, nights, fixed all-inclusive rate, totals) and Supabase claim operations
    departments.js   Department list for the sign-up dropdown
    receipts.js      Receipt upload and signed links (Supabase Storage)
    format.js        Currency, date and name formatting
    queryClient.js   Cache settings, and refreshClaims() to call after changing claims
    status.js        Colours and icons for each claim status
  pages/             One file per route (see DATABASE_SCHEMA.md for the route list)
```

Brand colours live in `tailwind.config.js` as `brand` (SIC green, `brand-700`) and `sun` (SIC yellow, `sun-400`). Reusable class recipes such as `.card`, `.btn-primary` and `.field-input` are in `src/index.css`.

## Database

Table, column and RPC names are documented in [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md).
