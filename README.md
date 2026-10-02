# Halting Claim System · SIC Life

A web app for SIC Life staff to submit **halting (overnight allowance) claims** and for managers to review them.

- **Employees** fill in a claim (up to 3 entries), review it, then send it or save it as a draft. My Requests tracks each claim's status and shows the manager's comments.
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

## Project structure

```
src/
  components/      Shared UI
    AppLayout.jsx        Signed-in shell: sidebar, mobile top bar, logout
    AuthLayout.jsx       Branded split layout for Login / Signup
    FeedbackProvider.jsx Toasts and confirm dialogs (use via useFeedback)
    EntryEditor.jsx      Editable claim entry (New Claim, manager Amend)
    EntryTable.jsx       Read-only entries list, adapts to its container width
    ui.jsx               Small building blocks: badges, tabs, stat cards, stepper…
  hooks/useFeedback.js  toast() and confirm() from anywhere in the app
  lib/
    claims.js        Claim rules (limits, validation) and Supabase claim operations
    format.js        Currency, date and name formatting
    status.js        Colours and icons for each claim status
  pages/             One file per route (see DATABASE_SCHEMA.md for the route list)
```

Brand colours live in `tailwind.config.js` as `brand` (SIC green, `brand-700`) and `sun` (SIC yellow, `sun-400`). Reusable class recipes such as `.card`, `.btn-primary` and `.field-input` are in `src/index.css`.

## Database

Table, column and RPC names are documented in [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md).
