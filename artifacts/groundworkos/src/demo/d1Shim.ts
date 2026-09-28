/**
 * A tiny stand-in for Cloudflare's D1 binding, backed by sql.js (SQLite
 * compiled to WebAssembly) running in the visitor's browser.
 *
 * It implements just the slice of the D1 API that drizzle-orm's d1 driver
 * calls (prepare().bind().all()/raw()/run()/first() and batch()), so the real
 * API route handlers from artifacts/api-server can run unchanged against it.
 */
import type { Database as SqlJsDatabase, SqlValue } from "sql.js";

type Param = SqlValue | boolean | undefined | Date;

function normalise(params: Param[]): SqlValue[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p instanceof Date) return p.getTime();
    return p as SqlValue;
  });
}

export class DemoD1Statement {
  constructor(
    private readonly db: SqlJsDatabase,
    private readonly onWrite: () => void,
    readonly sql: string,
    private readonly params: SqlValue[] = [],
  ) {}

  bind(...params: Param[]) {
    return new DemoD1Statement(this.db, this.onWrite, this.sql, normalise(params));
  }

  private exec<T>(
    read: (stmt: ReturnType<SqlJsDatabase["prepare"]>) => T,
  ): T {
    const stmt = this.db.prepare(this.sql);
    try {
      stmt.bind(this.params);
      return read(stmt);
    } finally {
      stmt.free();
      if (!/^\s*(select|with)\b/i.test(this.sql)) this.onWrite();
    }
  }

  async all<T = Record<string, unknown>>() {
    return this.allSync<T>();
  }

  allSync<T = Record<string, unknown>>() {
    const results = this.exec((stmt) => {
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    });
    return {
      results,
      success: true,
      meta: { changes: this.db.getRowsModified(), duration: 0 },
    };
  }

  async raw<T = unknown[]>() {
    return this.exec((stmt) => {
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.get() as T);
      return rows;
    });
  }

  async run() {
    return this.allSync();
  }

  async first<T = Record<string, unknown>>(column?: string) {
    const { results } = this.allSync<Record<string, unknown>>();
    const row = results[0];
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }
}

export class DemoD1Database {
  constructor(
    readonly sqlite: SqlJsDatabase,
    private readonly onWrite: () => void = () => {},
  ) {}

  prepare(sql: string) {
    return new DemoD1Statement(this.sqlite, this.onWrite, sql);
  }

  /** D1's batch() runs every statement atomically, in order. */
  async batch(statements: DemoD1Statement[]) {
    this.sqlite.exec("BEGIN");
    try {
      const out = statements.map((s) => s.allSync());
      this.sqlite.exec("COMMIT");
      return out;
    } catch (err) {
      this.sqlite.exec("ROLLBACK");
      throw err;
    }
  }

  async exec(sql: string) {
    this.sqlite.exec(sql);
    this.onWrite();
    return { count: 0, duration: 0 };
  }
}
