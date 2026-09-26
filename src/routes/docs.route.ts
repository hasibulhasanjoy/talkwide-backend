import path from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";

const router = Router();

// Resolve the spec relative to this module so it works both from `src/`
// (ts-node/nodemon) and from the compiled `dist/` output.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.join(currentDir, "..", "..", "docs", "openapi.yaml");

// Helmet's default CSP blocks the Redoc CDN script, so the docs page gets a
// scoped policy that only allows what the documentation UI needs.
const docsCsp = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

const redocHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Talkwide API Reference</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Roboto:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <style>
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <redoc
      spec-url="/api-docs/openapi.yaml"
      expand-responses="200,201"
      theme='{"colors":{"primary":{"main":"#2563eb"}},"typography":{"fontFamily":"Roboto, sans-serif","headings":{"fontFamily":"Montserrat, sans-serif"}}}'
    ></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js"></script>
  </body>
</html>`;

// Interactive API reference (Redoc)
router.get("/", (_req, res) => {
  res.setHeader("Content-Security-Policy", docsCsp);
  res.type("html").send(redocHtml);
});

// Raw OpenAPI spec (importable into Postman/Insomnia, lintable with Redocly)
router.get("/openapi.yaml", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.type("yaml").sendFile(specPath);
});

export default router;
