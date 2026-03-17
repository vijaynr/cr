import { Hono, type Context } from "hono";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WEB_APP_ROOT_ROUTE = "/";
export const WEB_APP_ALT_ROUTE = "/web";
export const WEB_APP_SCRIPT_ROUTE = "/web/app.js";
export const WEB_APP_DASHBOARD_ROUTE = "/api/dashboard";

export type WebRoutesOptions = {
  loadDashboard: () => Promise<unknown>;
};

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const appEntryPath = path.join(packageDir, "app.ts");
let webAppScriptPromise: Promise<string> | null = null;

export function getWebAppHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CR Web</title>
    <meta name="color-scheme" content="light" />
    <style>
      :root {
        color: #1f2923;
        background: #f4f0e8;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(118, 142, 123, 0.18), transparent 28rem),
          linear-gradient(180deg, #f9f6ef 0%, #efe7d7 100%);
      }
    </style>
  </head>
  <body>
    <cr-dashboard-app></cr-dashboard-app>
    <script type="module" src="${WEB_APP_SCRIPT_ROUTE}"></script>
  </body>
</html>`;
}

export async function readWebAppScript(): Promise<string> {
  if (!webAppScriptPromise) {
    webAppScriptPromise = bundleWebAppScript();
  }

  return webAppScriptPromise;
}

async function bundleWebAppScript(): Promise<string> {
  if (typeof Bun === "undefined") {
    throw new Error("CR web bundling requires Bun runtime.");
  }

  const result = await Bun.build({
    entrypoints: [appEntryPath],
    target: "browser",
    format: "esm",
    minify: false,
    splitting: false,
  });

  if (!result.success) {
    const buildLog = result.logs.map((log: { message: string }) => log.message).join("\n");
    throw new Error(`Failed to bundle CR web app.\n${buildLog}`);
  }

  const output = result.outputs[0];
  if (!output) {
    throw new Error("Failed to bundle CR web app: no output generated.");
  }

  return output.text();
}

export async function createWebRoutes(options: WebRoutesOptions): Promise<Hono> {
  const app = new Hono();
  const webAppHtml = getWebAppHtml();
  const webAppScript = await readWebAppScript();

  app.get(WEB_APP_DASHBOARD_ROUTE, async () => {
    try {
      const dashboard = await options.loadDashboard();
      return Response.json(dashboard, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return Response.json(
        {
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        },
        {
          status: 500,
        }
      );
    }
  });

  app.get(WEB_APP_SCRIPT_ROUTE, () => {
    return new Response(webAppScript, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  });

  const renderHtml = (c: Context) =>
    c.html(webAppHtml, 200, {
      "Cache-Control": "no-store",
    });

  app.get(WEB_APP_ROOT_ROUTE, renderHtml);
  app.get(WEB_APP_ALT_ROUTE, renderHtml);

  return app;
}
