/**
 * Replaces artifacts/api-server/src/lib/betterAuth.ts in the demo build
 * (see vite.config.ts). Real sign-in/account creation never runs in the
 * demo - the routes that would call this are switched off in server.ts.
 */
export function createAuth(): never {
  throw new Error("Authentication is not available in the demo.");
}
export type Auth = never;
