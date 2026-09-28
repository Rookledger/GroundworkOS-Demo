import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { Plugin } from "vite";

/**
 * Demo build: the real API route handlers are bundled into the frontend
 * (see src/demo/server.ts). Their one server-only dependency, Better Auth,
 * is swapped for a stub, since sign-in is faked in the demo.
 */
function stubBetterAuth(): Plugin {
  const stub = path.resolve(import.meta.dirname, "src/demo/betterAuthStub.ts");
  return {
    name: "demo-stub-better-auth",
    enforce: "pre",
    resolveId(source, importer) {
      if (importer?.includes("api-server") && /\/betterAuth(\.js)?$/.test(source))
        return stub;
      return null;
    },
  };
}

export default defineConfig(({ command, isPreview }) => {
  const needsPort = command === "serve" || isPreview;

  let port: number | undefined;

  if (needsPort) {
    const rawPort = process.env.PORT;

    if (!rawPort) {
      throw new Error(
        "PORT environment variable is required but was not provided.",
      );
    }

    port = Number(rawPort);

    if (Number.isNaN(port) || port <= 0) {
      throw new Error(`Invalid PORT value: "${rawPort}"`);
    }
  }

  let basePath = process.env.BASE_PATH;

  if (!basePath) {
    console.warn(
      'BASE_PATH environment variable was not provided; defaulting to "/".',
    );
    basePath = "/";
  }

  return {
    base: basePath,
    plugins: [stubBetterAuth(), react(), tailwindcss({ optimize: false })],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom", "hono", "drizzle-orm", "zod"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (/[\\/]node_modules[\\/]react(-dom)?[\\/]/.test(id))
              return "react";
            if (id.includes("@react-pdf/renderer")) return "react-pdf";
            if (id.includes("recharts")) return "recharts";
            if (id.includes("@radix-ui/")) return "radix";
          },
        },
      },
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
        // The demo imports the API routes and DB migrations from elsewhere
        // in the monorepo.
        allow: [path.resolve(import.meta.dirname, "../..")],
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
