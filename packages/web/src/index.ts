import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WEB_APP_ROUTE = "/";
export const WEB_APP_SCRIPT_ROUTE = "/web/app.js";
export const WEB_APP_DASHBOARD_ROUTE = "/api/web/dashboard";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const appScriptPath = path.join(packageDir, "app.js");

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
  return fs.readFile(appScriptPath, "utf8");
}
