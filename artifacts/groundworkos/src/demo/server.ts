/**
 * The demo "backend": the real GroundworkOS API route handlers
 * (artifacts/api-server/src/routes) running inside the visitor's browser,
 * against an in-memory SQLite database (sql.js) that is created from the
 * real D1 migrations and filled with fictional demo data.
 *
 * Nothing here talks to a network. Each browser tab gets its own copy of the
 * data (kept in sessionStorage so it survives a page refresh), and
 * "Reset demo" throws it away and re-seeds.
 */
import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { Hono } from "hono";
import { createDb } from "@workspace/db";
import type { AppEnv } from "../../../api-server/src/types";
import { logger } from "../../../api-server/src/lib/logger";

import healthRouter from "../../../api-server/src/routes/health";
import clientsRouter from "../../../api-server/src/routes/clients";
import jobsRouter from "../../../api-server/src/routes/jobs";
import quotesRouter from "../../../api-server/src/routes/quotes";
import invoicesRouter from "../../../api-server/src/routes/invoices";
import subcontractorsRouter from "../../../api-server/src/routes/subcontractors";
import documentsRouter from "../../../api-server/src/routes/documents";
import scheduleRouter from "../../../api-server/src/routes/schedule";
import plantRouter from "../../../api-server/src/routes/plant";
import ramsRouter from "../../../api-server/src/routes/rams";
import rateBookRouter from "../../../api-server/src/routes/rate_book";
import dashboardRouter from "../../../api-server/src/routes/dashboard";
import settingsRouter from "../../../api-server/src/routes/settings";
import cisRouter from "../../../api-server/src/routes/cis";
import portalRouter from "../../../api-server/src/routes/portal";
import adminRouter from "../../../api-server/src/routes/admin";
import timesheetsRouter from "../../../api-server/src/routes/timesheets";
import purchaseOrdersRouter from "../../../api-server/src/routes/purchase_orders";
import auditRouter from "../../../api-server/src/routes/audit";

import { DemoD1Database } from "./d1Shim";
import { seedBase } from "./seedBase";
import { seedExtras, DEMO_USER } from "./seedExtras";

// Bump this whenever the seed data or schema changes, so visitors with an
// old copy in sessionStorage get fresh data instead.
const STORAGE_KEY = "gw_demo_db_v1";

const migrations = import.meta.glob("../../../../lib/db/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const DEMO_DISABLED_MESSAGE =
  "This is disabled in the demo. In the full version it works normally.";

function toBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function fromBase64(b64: string) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function createDatabase() {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });

  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode etc. - just start fresh each load.
  }

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, toBase64(sqlite.export()));
      } catch {
        // Storage full/unavailable - the demo still works, it just won't
        // survive a refresh.
      }
    }, 300);
  };

  let sqlite;
  if (saved) {
    try {
      sqlite = new SQL.Database(fromBase64(saved));
      sqlite.exec("PRAGMA foreign_keys = ON");
      return new DemoD1Database(sqlite, scheduleSave);
    } catch {
      // Corrupt copy - fall through and rebuild.
    }
  }

  sqlite = new SQL.Database();
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const file of Object.keys(migrations).sort()) {
    sqlite.exec(migrations[file]);
  }
  const d1 = new DemoD1Database(sqlite, scheduleSave);
  const db = createDb(d1 as unknown as D1Database);
  await seedBase(db);
  await seedExtras(db);
  scheduleSave();
  return d1;
}

// Whether the visitor has pressed "Sign in" in this tab.
const SIGNED_IN_KEY = "gw_demo_signed_in";

function isSignedIn() {
  try {
    return sessionStorage.getItem(SIGNED_IN_KEY) === "1";
  } catch {
    return signedInFallback;
  }
}
let signedInFallback = false;

function setSignedIn(value: boolean) {
  signedInFallback = value;
  try {
    if (value) sessionStorage.setItem(SIGNED_IN_KEY, "1");
    else sessionStorage.removeItem(SIGNED_IN_KEY);
  } catch {
    // ignore
  }
}

/** Puts the sample data back to how it started (stays signed in). */
export function resetDemo() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("gw_onboarding_done");
  } catch {
    // ignore
  }
  window.location.href = `${BASE}/`;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const disabled = () => json({ error: DEMO_DISABLED_MESSAGE }, 403);

function buildApp(d1: DemoD1Database) {
  const app = new Hono<AppEnv>();

  // Stands in for app.ts's db + session middleware: every request is made
  // by the one signed-in demo user.
  app.use(async (c, next) => {
    c.set("db", createDb(d1 as unknown as D1Database));
    c.set("logger", logger);
    c.set("userId", DEMO_USER.id);
    c.set("_role", DEMO_USER.role as "admin");
    await next();
  });

  // --- Things that would reach the outside world: switched off. ---
  app.all("/api/email/*", disabled);
  app.all("/api/storage/*", disabled);
  app.all("/api/storage", disabled);
  for (const provider of ["xero", "quickbooks", "sage", "freeagent"]) {
    app.get(`/api/${provider}/status`, () => json({ connected: false }));
    app.get(`/api/${provider}/sync/log`, () => json({ entries: [] }));
    app.get(`/api/${provider}/accounts`, () => json({ accounts: [] }));
    app.all(`/api/${provider}/*`, disabled);
  }
  // User management and account creation.
  app.on(["POST", "PATCH", "PUT", "DELETE"], "/api/admin/*", disabled);
  app.post("/api/invitations/accept", disabled);
  app.post("/api/setup/first-admin", disabled);

  const api = new Hono<AppEnv>();
  for (const r of [
    healthRouter,
    clientsRouter,
    jobsRouter,
    quotesRouter,
    invoicesRouter,
    subcontractorsRouter,
    documentsRouter,
    scheduleRouter,
    plantRouter,
    ramsRouter,
    rateBookRouter,
    dashboardRouter,
    settingsRouter,
    cisRouter,
    portalRouter,
    adminRouter,
    timesheetsRouter,
    purchaseOrdersRouter,
    auditRouter,
  ]) {
    api.route("/", r);
  }
  app.route("/api", api);

  app.notFound(() => json({ error: { message: "Not found", status: 404 } }, 404));
  app.onError((err) => {
    console.error("[demo api]", err);
    return json({ error: { message: err.message, status: 500 } }, 500);
  });
  return app;
}

function session() {
  const now = new Date();
  const expires = new Date(Date.now() + 7 * 864e5);
  return {
    session: {
      id: "demo-session",
      userId: DEMO_USER.id,
      token: "demo",
      expiresAt: expires.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    user: {
      ...DEMO_USER,
      emailVerified: true,
      image: null,
      active: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  };
}

/**
 * Better Auth's endpoints (sign-in, session, sign-out), faked. Any email and
 * password are accepted - the demo login is only there so visitors see the
 * real sign-in screen.
 */
function handleAuth(path: string) {
  if (path.startsWith("/api/auth/get-session")) {
    return json(isSignedIn() ? session() : null);
  }
  if (path.startsWith("/api/auth/sign-in")) {
    setSignedIn(true);
    return json({ ...session(), redirect: false });
  }
  if (path.startsWith("/api/auth/sign-out")) {
    // Signing out also throws away this visitor's changes, so the next
    // person to sign in on this tab starts fresh.
    setSignedIn(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return json({ success: true });
  }
  return disabled();
}

let appPromise: Promise<Hono<AppEnv>> | null = null;

export async function handleDemoRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Strip the GitHub Pages sub-folder, if any, so routes see "/api/...".
  let path = url.pathname;
  if (BASE && path.startsWith(BASE + "/api/")) path = path.slice(BASE.length);

  if (path.startsWith("/api/auth/")) return handleAuth(path);

  appPromise ??= createDatabase().then(buildApp);
  const app = await appPromise;
  const body = ["GET", "HEAD"].includes(req.method)
    ? undefined
    : await req.arrayBuffer();
  const inner = new Request(new URL(path + url.search, url.origin), {
    method: req.method,
    headers: req.headers,
    body,
  });
  return app.fetch(inner, {
    APP_URL: `${window.location.origin}${BASE}`,
    BETTER_AUTH_SECRET: "demo-only-not-a-secret-000000000000",
  } as AppEnv["Bindings"]);
}

/** Starts building the database straight away, before the first request. */
export function warmUp() {
  appPromise ??= createDatabase().then(buildApp);
  return appPromise;
}
