# Halting Claim System · SIC Life

A web app for SIC Life staff to submit **halting (overnight allowance) claims** and for managers to review them.

- **Employees** fill in a claim (up to 3 trips: places, dates and allowance), then review, sign and send it, or save it as a draft. Nights are counted from the dates. Accommodation claims need the PDF receipt. My Requests tracks each claim's status and shows the manager's comments.
- **Managers** get an inbox of every claim, filtered by status and searchable by name, staff number or department. From there they approve, disapprove, amend entries or delete claims.

Built with React 19, Vite, Tailwind CSS and Supabase (auth + Postgres).

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
    EntryTable.jsx       Read-only entries list, adapts to its container width
    ReceiptField.jsx     Receipt PDF upload and "View receipt" link
    SignaturePad.jsx     Draw-to-sign box for mouse or finger
    ui.jsx               Small building blocks: badges, tabs, stat cards, stepper…
  hooks/useFeedback.js  toast() and confirm() from anywhere in the app
  lib/
    claims.js        Claim rules (limits, validation, nights, allowance totals) and Supabase claim operations
    departments.js   Department list for the sign-up dropdown
    receipts.js      Receipt upload and signed links (Supabase Storage)
    format.js        Currency, date and name formatting
    status.js        Colours and icons for each claim status
  pages/             One file per route (see DATABASE_SCHEMA.md for the route list)
```

Brand colours live in `tailwind.config.js` as `brand` (SIC green, `brand-700`) and `sun` (SIC yellow, `sun-400`). Reusable class recipes such as `.card`, `.btn-primary` and `.field-input` are in `src/index.css`.

## Database

Table, column and RPC names are documented in [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md).
