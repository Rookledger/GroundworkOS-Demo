# GroundworkOS — Demo

A clickable demo of GroundworkOS that runs entirely in the browser. No server,
no database and no accounts: it's a static site, hosted on GitHub Pages.

**Everything in it is sample data.** The company, clients, people and figures are fictional.

## How it works

- The GroundworkOS frontend is unchanged, apart from a small `DEMO` badge.
- Every `/api/...` request it makes is caught in the browser
  (`artifacts/groundworkos/src/demo/install.ts`) and answered by the **real
  GroundworkOS API route handlers** (`artifacts/api-server/src/routes`),
  running in the browser against SQLite compiled to WebAssembly (sql.js).
  So creating quotes, updating jobs, logging timesheets and so on all behave
  the way they do in the real product.
- The database is built from the real migrations (`lib/db/migrations`) and
  filled with sample data (`src/demo/seedBase.ts` + `src/demo/seedExtras.ts`).
- Each visitor gets their own copy. It survives a page refresh, is thrown away
  when the tab closes, and the **Reset** button on the badge starts it over.
  Visitors never see each other's changes.
- Visitors land on the real sign-in page with the demo login already filled
  in (`demo@groundworkos.example` / `demo1234`, set in `src/demo/seedExtras.ts`);
  one click signs them in as "Demo Manager" (admin role). Signing out also
  resets their sample data.

### Switched off in the demo

These would reach the outside world, so they return
"This is disabled in the demo":

- Sending quotes/invoices by email
- Xero / QuickBooks / Sage / FreeAgent connections (they show "not connected")
- File uploads (documents, logo)
- Inviting users and changing roles

PDF export, the client portal link, CSV export and reports all work.

## Publish it on GitHub Pages

1. Create a new repository on GitHub (e.g. `GroundworkOS-Demo`) and push this
   folder to its `main` branch.
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. The **Deploy demo to GitHub Pages** workflow runs on every push to `main`
   (see the **Actions** tab). When it finishes, the demo is live at
   `https://<your-username>.github.io/<repo-name>/`.

## Run it locally

Needs Node 22 and pnpm 9.

```bash
pnpm install
pnpm run dev        # http://localhost:5173
```

## Changing the sample data

Edit `artifacts/groundworkos/src/demo/seedBase.ts` or `seedExtras.ts`, then
bump `STORAGE_KEY` in `src/demo/server.ts` (e.g. `gw_demo_db_v2`) so that
visitors with an open tab get the new data instead of their saved copy.

## License

Private — not open source. All rights reserved.
