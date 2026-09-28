/**
 * Imported first thing in main.tsx. Replaces window.fetch so that every
 * same-origin request to /api/... is answered by the in-browser demo backend
 * (see server.ts) instead of going over the network. Everything else
 * (fonts, the app's own JS/CSS) is fetched normally.
 */
import { handleDemoRequest, warmUp } from "./server";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const realFetch = window.fetch.bind(window);

function isApiRequest(url: URL) {
  if (url.origin !== window.location.origin) return false;
  return (
    url.pathname.startsWith("/api/") ||
    (!!BASE && url.pathname.startsWith(BASE + "/api/"))
  );
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const req = new Request(input, init);
  const url = new URL(req.url);
  if (!isApiRequest(url)) return realFetch(input, init);
  try {
    return await handleDemoRequest(req);
  } catch (err) {
    console.error("[demo] request failed", req.method, url.pathname, err);
    return new Response(
      JSON.stringify({ error: "Demo backend error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

void warmUp();
