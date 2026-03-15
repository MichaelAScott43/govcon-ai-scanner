/**
 * API Documentation Routes
 *
 * Serves:
 *  - GET /api-docs              → Swagger UI (interactive explorer)
 *  - GET /api-reference         → Beautiful HTML API reference
 *  - GET /api-docs/openapi.json → Raw OpenAPI spec (JSON)
 *  - GET /api-docs/openapi.yaml → Raw OpenAPI spec (YAML)
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import yaml from "js-yaml";
import rateLimit from "express-rate-limit";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openapiPath = path.join(__dirname, "../../docs/openapi.yaml");

// Load OpenAPI spec safely
let swaggerSpec = {};
let specYaml = "";

if (fs.existsSync(openapiPath)) {
  specYaml = fs.readFileSync(openapiPath, "utf8");
  swaggerSpec = yaml.load(specYaml);
}

// Rate limiter for docs endpoints
const docsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." }
});

// ---------------------------------------------------------------------------
// GET /api-docs — Swagger-style interactive explorer page
// ---------------------------------------------------------------------------
router.get("/api-docs", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GovCon AI Scanner — API Explorer</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .topbar { background: #1e3a5f !important; }
    .swagger-ui .info .title { color: #1e3a5f; }
    .swagger-ui .btn.authorize { background: #1e3a5f; border-color: #1e3a5f; }
    #banner {
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      color: white;
      padding: 20px 40px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    #banner h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    #banner p { margin: 4px 0 0; opacity: 0.85; font-size: 0.9rem; }
    #banner a {
      color: #93c5fd;
      text-decoration: none;
      margin-left: auto;
      font-size: 0.85rem;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 8px 16px;
      border-radius: 6px;
    }
    #banner a:hover { background: rgba(255,255,255,0.1); }
  </style>
</head>
<body>
  <div id="banner">
    <div>
      <h1>🏛️ GovCon AI Scanner</h1>
      <p>Interactive API Explorer · OpenAPI 3.0 · JWT Authentication</p>
    </div>
    <a href="/api-reference">📖 API Reference Docs →</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api-docs/openapi.yaml",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
        deepLinking: true,
        displayRequestDuration: true,
        persistAuthorization: true,
        tryItOutEnabled: true
      });
    };
  </script>
</body>
</html>`);
});

// ---------------------------------------------------------------------------
// GET /api-docs/openapi.yaml — Raw OpenAPI YAML
// ---------------------------------------------------------------------------
router.get("/api-docs/openapi.yaml", docsLimiter, (req, res) => {
  if (!fs.existsSync(openapiPath)) {
    return res.status(404).json({ success: false, error: "OpenAPI spec not found." });
  }
  res.setHeader("Content-Type", "application/yaml");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(openapiPath);
});

// ---------------------------------------------------------------------------
// GET /api-docs/openapi.json — Raw OpenAPI JSON
// ---------------------------------------------------------------------------
router.get("/api-docs/openapi.json", docsLimiter, (req, res) => {
  if (!swaggerSpec || Object.keys(swaggerSpec).length === 0) {
    return res.status(404).json({ success: false, error: "OpenAPI spec not found." });
  }
  res.json(swaggerSpec);
});

// ---------------------------------------------------------------------------
// GET /api-reference — Beautiful HTML API reference
// ---------------------------------------------------------------------------
router.get("/api-reference", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GovCon AI Scanner — API Reference</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; }
    .layout { display: flex; min-height: 100vh; }
    .sidebar { width: 260px; min-height: 100vh; background: #1e293b; border-right: 1px solid #334155; position: sticky; top: 0; overflow-y: auto; padding: 0 0 40px; flex-shrink: 0; }
    .content { flex: 1; max-width: 900px; padding: 40px 48px; }
    .sidebar-logo { padding: 24px 20px; border-bottom: 1px solid #334155; }
    .sidebar-logo h2 { margin: 0; font-size: 1rem; color: #f1f5f9; }
    .sidebar-logo p { margin: 4px 0 0; font-size: 0.75rem; color: #64748b; }
    .sidebar-section { padding: 16px 20px 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
    .sidebar-link { display: block; padding: 8px 20px; color: #94a3b8; text-decoration: none; font-size: 0.875rem; border-left: 3px solid transparent; transition: all 0.15s; }
    .sidebar-link:hover { color: #f1f5f9; background: #0f172a; border-left-color: #3b82f6; }
    .endpoint { background: #1e293b; border: 1px solid #334155; border-radius: 10px; margin-bottom: 20px; overflow: hidden; }
    .endpoint-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; }
    .method { padding: 4px 10px; border-radius: 5px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; min-width: 58px; text-align: center; }
    .method.get { background: #052e16; color: #4ade80; border: 1px solid #166534; }
    .method.post { background: #1e1b4b; color: #818cf8; border: 1px solid #3730a3; }
    .method.patch { background: #451a03; color: #fb923c; border: 1px solid #92400e; }
    .method.delete { background: #450a0a; color: #f87171; border: 1px solid #991b1b; }
    .endpoint-path { font-family: monospace; font-size: 0.9rem; color: #e2e8f0; }
    .endpoint-desc { margin-left: auto; font-size: 0.8rem; color: #64748b; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; background: #1e3a5f; color: #60a5fa; }
    h1 { font-size: 2.25rem; font-weight: 800; color: #f1f5f9; margin: 0 0 8px; }
    h2 { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; margin: 48px 0 16px; }
    p { color: #94a3b8; line-height: 1.7; margin: 0 0 16px; }
    a { color: #60a5fa; }
    pre { background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; overflow-x: auto; font-size: 0.85rem; line-height: 1.6; }
    code { font-family: monospace; }
    .hero-subtitle { font-size: 1.1rem; color: #64748b; margin: 0 0 32px; }
    .explorer-link { display: inline-flex; align-items: center; gap: 8px; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 8px 8px 0; font-size: 0.9rem; }
    .explorer-link.secondary { background: #1e293b; border: 1px solid #334155; }
  </style>
</head>
<body>
<div class="layout">
  <nav class="sidebar">
    <div class="sidebar-logo">
      <h2>🏛️ GovCon AI Scanner</h2>
      <p>API Reference</p>
    </div>
    <div class="sidebar-section">Resources</div>
    <a href="/api-docs" class="sidebar-link">Interactive Explorer →</a>
    <a href="/api-docs/openapi.yaml" class="sidebar-link">OpenAPI Spec (YAML)</a>
    <a href="/health" class="sidebar-link">Health Check</a>
  </nav>

  <main class="content">
    <h1>GovCon AI Scanner API</h1>
    <p class="hero-subtitle">Production REST API for government contracting intelligence · JWT Authentication</p>

    <a href="/api-docs" class="explorer-link">⚡ Open Interactive Explorer</a>
    <a href="/api-docs/openapi.yaml" class="explorer-link secondary">📄 Download OpenAPI Spec</a>

    <h2>Authentication</h2>
    <p>All protected endpoints require a <strong>JWT Bearer token</strong> in the Authorization header.</p>

    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/auth/login</span>
        <span class="endpoint-desc">Log in and get tokens</span>
      </div>
    </div>

    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/opportunities/search</span>
        <span class="endpoint-desc">Search SAM.gov <span class="badge">🔒 Auth</span></span>
      </div>
    </div>

    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/opportunities/analyze</span>
        <span class="endpoint-desc">AI bid/no-bid analysis <span class="badge">🔒 Auth</span></span>
      </div>
    </div>

    <pre><code>curl -X POST https://govcon-ai-scanner.onrender.com/api/opportunities/search \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"naics":"541512","keyword":"cybersecurity"}'</code></pre>
  </main>
</div>
</body>
</html>`);
});

export default router;
