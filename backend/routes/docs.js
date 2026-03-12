import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import rateLimit from "express-rate-limit";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the OpenAPI spec
const openapiPath = path.join(__dirname, "../../docs/openapi.yaml");

// Rate limiter for documentation endpoints
const docsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." }
});

// ---------------------------------------------------------------------------
// GET /api-docs — Swagger UI interactive explorer
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
    .topbar-wrapper img { content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'); height: 30px; }
    .swagger-ui .info .title { color: #1e3a5f; }
    .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #61affe; }
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
    #banner a { color: #93c5fd; text-decoration: none; margin-left: auto; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 6px; }
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
        tryItOutEnabled: true,
        requestSnippetsEnabled: true,
        requestSnippets: {
          generators: {
            curl_bash: { title: "cURL (bash)", syntax: "bash" },
            node_native: { title: "Node.js", syntax: "javascript" }
          },
          defaultExpanded: false
        }
      });
    };
  </script>
</body>
</html>`);
});

// Serve the raw OpenAPI YAML spec (consumed by Swagger UI and API clients)
router.get("/api-docs/openapi.yaml", docsLimiter, (req, res) => {
  if (!fs.existsSync(openapiPath)) {
    return res.status(404).json({ success: false, error: "OpenAPI spec not found." });
  }
  res.setHeader("Content-Type", "application/yaml");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(openapiPath);
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

    /* Layout */
    .layout { display: flex; min-height: 100vh; }
    .sidebar { width: 260px; min-height: 100vh; background: #1e293b; border-right: 1px solid #334155; position: sticky; top: 0; overflow-y: auto; padding: 0 0 40px; flex-shrink: 0; }
    .content { flex: 1; max-width: 900px; padding: 40px 48px; }

    /* Sidebar */
    .sidebar-logo { padding: 24px 20px; border-bottom: 1px solid #334155; }
    .sidebar-logo h2 { margin: 0; font-size: 1rem; color: #f1f5f9; }
    .sidebar-logo p { margin: 4px 0 0; font-size: 0.75rem; color: #64748b; }
    .sidebar-section { padding: 16px 20px 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
    .sidebar-link { display: block; padding: 8px 20px; color: #94a3b8; text-decoration: none; font-size: 0.875rem; border-left: 3px solid transparent; transition: all 0.15s; }
    .sidebar-link:hover { color: #f1f5f9; background: #0f172a; border-left-color: #3b82f6; }
    .sidebar-link.active { color: #60a5fa; border-left-color: #3b82f6; background: rgba(59,130,246,0.08); }

    /* Content */
    h1 { font-size: 2.25rem; font-weight: 800; color: #f1f5f9; margin: 0 0 8px; }
    h2 { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; margin: 48px 0 16px; padding-top: 48px; border-top: 1px solid #1e293b; }
    h2:first-of-type { border-top: none; padding-top: 0; }
    h3 { font-size: 1.1rem; font-weight: 600; color: #cbd5e1; margin: 32px 0 12px; }
    p { color: #94a3b8; line-height: 1.7; margin: 0 0 16px; }
    a { color: #60a5fa; }

    /* Endpoint cards */
    .endpoint { background: #1e293b; border: 1px solid #334155; border-radius: 10px; margin-bottom: 20px; overflow: hidden; }
    .endpoint-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; cursor: pointer; }
    .method { padding: 4px 10px; border-radius: 5px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; min-width: 58px; text-align: center; }
    .method.get { background: #052e16; color: #4ade80; border: 1px solid #166534; }
    .method.post { background: #1e1b4b; color: #818cf8; border: 1px solid #3730a3; }
    .method.patch { background: #451a03; color: #fb923c; border: 1px solid #92400e; }
    .method.delete { background: #450a0a; color: #f87171; border: 1px solid #991b1b; }
    .endpoint-path { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.9rem; color: #e2e8f0; }
    .endpoint-desc { margin-left: auto; font-size: 0.8rem; color: #64748b; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; background: #1e3a5f; color: #60a5fa; }

    /* Code blocks */
    pre { background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; overflow-x: auto; font-size: 0.85rem; line-height: 1.6; }
    code { font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; }
    .lang-tabs { display: flex; gap: 4px; margin-bottom: -1px; }
    .lang-tab { padding: 6px 14px; border-radius: 6px 6px 0 0; font-size: 0.8rem; cursor: pointer; border: 1px solid #1e293b; background: #0f172a; color: #64748b; }
    .lang-tab.active { background: #020617; color: #e2e8f0; border-bottom-color: #020617; }

    /* Alert box */
    .alert { background: #0f2d4a; border: 1px solid #1d4ed8; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .alert.warning { background: #2d1a00; border-color: #92400e; }
    .alert-title { font-weight: 700; color: #93c5fd; margin-bottom: 6px; font-size: 0.9rem; }
    .alert.warning .alert-title { color: #fbbf24; }
    .alert p { margin: 0; font-size: 0.875rem; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin: 16px 0; }
    th { text-align: left; padding: 10px 12px; background: #0f172a; color: #64748b; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #1e293b; }
    td { padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; vertical-align: top; }
    td code { color: #a78bfa; font-size: 0.8rem; }

    .hero-subtitle { font-size: 1.1rem; color: #64748b; margin: 0 0 32px; }
    .tag-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin: 24px 0; }
    .tag-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; }
    .tag-card h4 { margin: 0 0 6px; color: #e2e8f0; font-size: 0.9rem; }
    .tag-card p { margin: 0; font-size: 0.8rem; color: #64748b; }
    .explorer-link { display: inline-flex; align-items: center; gap: 8px; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 8px 8px 0; font-size: 0.9rem; }
    .explorer-link:hover { background: #1d4ed8; color: white; }
    .explorer-link.secondary { background: #1e293b; border: 1px solid #334155; }
  </style>
</head>
<body>
<div class="layout">
  <!-- Sidebar -->
  <nav class="sidebar">
    <div class="sidebar-logo">
      <h2>🏛️ GovCon AI Scanner</h2>
      <p>API Reference v2.0</p>
    </div>
    <div class="sidebar-section">Getting Started</div>
    <a href="#overview" class="sidebar-link">Overview</a>
    <a href="#authentication" class="sidebar-link">Authentication</a>
    <a href="#rate-limits" class="sidebar-link">Rate Limits</a>
    <a href="#errors" class="sidebar-link">Error Handling</a>
    <div class="sidebar-section">API Endpoints</div>
    <a href="#auth-endpoints" class="sidebar-link">Auth</a>
    <a href="#opportunities" class="sidebar-link">Opportunities</a>
    <a href="#email" class="sidebar-link">Email Preferences</a>
    <div class="sidebar-section">Admin API</div>
    <a href="#admin-dashboard" class="sidebar-link">Dashboard</a>
    <a href="#admin-users" class="sidebar-link">User Management</a>
    <a href="#admin-analytics" class="sidebar-link">Analytics</a>
    <a href="#admin-subscriptions" class="sidebar-link">Subscriptions</a>
    <a href="#admin-health" class="sidebar-link">System Health</a>
    <div class="sidebar-section">Resources</div>
    <a href="/api-docs" class="sidebar-link">Interactive Explorer →</a>
    <a href="/api-docs/openapi.yaml" class="sidebar-link">OpenAPI Spec (YAML)</a>
    <a href="/health" class="sidebar-link">Health Check</a>
  </nav>

  <!-- Main content -->
  <main class="content">
    <h1>GovCon AI Scanner API</h1>
    <p class="hero-subtitle">Production REST API for government contracting intelligence · OpenAPI 3.0 · JWT Authentication</p>

    <a href="/api-docs" class="explorer-link">⚡ Open Interactive Explorer</a>
    <a href="/api-docs/openapi.yaml" class="explorer-link secondary">📄 Download OpenAPI Spec</a>

    <div class="tag-grid">
      <div class="tag-card"><h4>🔍 SAM.gov Search</h4><p>Search thousands of federal opportunities with NAICS, PSC, and keyword filters</p></div>
      <div class="tag-card"><h4>📄 Document Analysis</h4><p>AI-powered bid/no-bid scoring for solicitation documents</p></div>
      <div class="tag-card"><h4>📊 Admin Dashboard</h4><p>Platform metrics, user management, and subscription controls</p></div>
      <div class="tag-card"><h4>📧 Email Alerts</h4><p>Configurable daily/weekly digests with NAICS filtering</p></div>
    </div>

    <!-- Authentication -->
    <h2 id="authentication">Authentication</h2>
    <p>All protected endpoints require a <strong>JWT Bearer token</strong> in the Authorization header.</p>

    <div class="lang-tabs"><div class="lang-tab active">cURL</div></div>
    <pre><code class="language-bash"># 1. Log in to get tokens
curl -X POST https://govcon-ai-scanner.onrender.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@company.com","password":"YourPassword"}'

# Response:
# { "accessToken": "eyJ...", "refreshToken": "eyJ..." }

# 2. Use the access token in subsequent requests
curl https://govcon-ai-scanner.onrender.com/api/opportunities \\
  -H "Authorization: Bearer eyJ..."</code></pre>

    <p>Access tokens expire after <strong>15 minutes</strong>. Use the refresh token to get a new pair:</p>
    <pre><code class="language-bash">curl -X POST https://govcon-ai-scanner.onrender.com/api/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{"refreshToken":"eyJ..."}'</code></pre>

    <!-- Rate limits -->
    <h2 id="rate-limits">Rate Limits</h2>
    <table>
      <thead><tr><th>Endpoint Group</th><th>Limit</th><th>Window</th></tr></thead>
      <tbody>
        <tr><td><code>/api/auth/*</code></td><td>30 requests</td><td>15 minutes</td></tr>
        <tr><td><code>/api/opportunities/*</code></td><td>200 requests</td><td>15 minutes</td></tr>
        <tr><td><code>/api/admin/*</code></td><td>200 requests</td><td>15 minutes</td></tr>
      </tbody>
    </table>
    <p>Rate-limited responses return <strong>HTTP 429</strong> with a <code>Retry-After</code> header.</p>

    <!-- Errors -->
    <h2 id="errors">Error Handling</h2>
    <p>All errors follow a consistent JSON format:</p>
    <pre><code>{
  "success": false,
  "error": "Human-readable message",
  "errorCode": "MACHINE_READABLE_CODE"   // optional
}</code></pre>
    <table>
      <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td><code>400</code></td><td>Validation error — check request body/params</td></tr>
        <tr><td><code>401</code></td><td>Missing or expired access token</td></tr>
        <tr><td><code>403</code></td><td>Forbidden — insufficient permissions</td></tr>
        <tr><td><code>404</code></td><td>Resource not found</td></tr>
        <tr><td><code>409</code></td><td>Conflict — e.g. email already registered</td></tr>
        <tr><td><code>429</code></td><td>Rate limit exceeded</td></tr>
        <tr><td><code>500</code></td><td>Internal server error</td></tr>
      </tbody>
    </table>

    <!-- Auth endpoints -->
    <h2 id="auth-endpoints">Auth Endpoints</h2>

    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/auth/register</span>
        <span class="endpoint-desc">Create a new account</span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/auth/login</span>
        <span class="endpoint-desc">Log in — returns access + refresh tokens</span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/auth/refresh</span>
        <span class="endpoint-desc">Exchange refresh token for new access token</span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/auth/logout</span>
        <span class="endpoint-desc">Invalidate refresh token <span class="badge">🔒 Auth</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/auth/profile</span>
        <span class="endpoint-desc">Get current user profile <span class="badge">🔒 Auth</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method patch">PATCH</span>
        <span class="endpoint-path">/api/auth/profile</span>
        <span class="endpoint-desc">Update name, company, NAICS codes <span class="badge">🔒 Auth</span></span>
      </div>
    </div>

    <!-- Opportunities -->
    <h2 id="opportunities">Opportunities</h2>
    <p>Search SAM.gov for federal contracting opportunities and manage your saved pipeline.</p>

    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/opportunities/search</span>
        <span class="endpoint-desc">Search SAM.gov <span class="badge">🔒 Auth</span></span>
      </div>
    </div>

    <h3>Example — Search by NAICS code</h3>
    <pre><code class="language-bash">curl -X POST https://govcon-ai-scanner.onrender.com/api/opportunities/search \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "postedFrom": "01/01/2024",
    "postedTo": "01/31/2024",
    "naics": "541512",
    "keyword": "cybersecurity",
    "limit": 25
  }'</code></pre>

    <pre><code class="language-javascript">// JavaScript / Node.js
const response = await fetch('/api/opportunities/search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + accessToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    postedFrom: '01/01/2024',
    postedTo: '01/31/2024',
    naics: '541512'
  })
});
const { opportunities, totalRecords } = await response.json();</code></pre>

    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/opportunities</span>
        <span class="endpoint-desc">Get saved opportunities <span class="badge">🔒 Auth</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/opportunities/save</span>
        <span class="endpoint-desc">Save an opportunity <span class="badge">🔒 Auth</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/opportunities/analyze</span>
        <span class="endpoint-desc">AI bid/no-bid document analysis <span class="badge">🔒 Auth</span></span>
      </div>
    </div>

    <h3>Example — Analyze a document</h3>
    <pre><code class="language-bash"># Upload a PDF
curl -X POST https://govcon-ai-scanner.onrender.com/api/opportunities/analyze \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file=@solicitation.pdf"

# Or submit raw text
curl -X POST https://govcon-ai-scanner.onrender.com/api/opportunities/analyze \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "SECTION B – SUPPLIES OR SERVICES..."}'</code></pre>

    <pre><code class="language-python"># Python
import requests

headers = {'Authorization': 'Bearer ' + access_token}

# PDF upload
with open('solicitation.pdf', 'rb') as f:
    response = requests.post(
        'https://govcon-ai-scanner.onrender.com/api/opportunities/analyze',
        headers=headers,
        files={'file': f}
    )

result = response.json()
print(f"Bid Score: {result['bidScore']}/100")
print(f"Recommendation: {result['recommendation']}")
print(f"FAR Clauses: {result['clausesDetected']}")</code></pre>

    <!-- Email Preferences -->
    <h2 id="email">Email Preferences</h2>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/email-preferences/preferences</span>
        <span class="endpoint-desc">Get email preferences <span class="badge">🔒 Auth</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/email-preferences/preferences/update</span>
        <span class="endpoint-desc">Update email preferences <span class="badge">🔒 Auth</span></span>
      </div>
    </div>

    <!-- Admin – Dashboard -->
    <h2 id="admin-dashboard">Admin — Dashboard</h2>
    <div class="alert"><div class="alert-title">🔐 Admin Role Required</div><p>All <code>/api/admin/*</code> endpoints require a valid JWT for a user with <code>role: "admin"</code>. Admin actions are fully audit-logged.</p></div>

    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/dashboard</span>
        <span class="endpoint-desc">Platform KPIs — users, opportunities, email <span class="badge">🔑 Admin</span></span>
      </div>
    </div>

    <pre><code class="language-bash">curl https://govcon-ai-scanner.onrender.com/api/admin/dashboard \\
  -H "Authorization: Bearer ADMIN_TOKEN"

# Response:
# {
#   "metrics": {
#     "users": { "total": 342, "active": 318, "newThisMonth": 47 },
#     "opportunities": { "cached": 15420, "saved": 891 },
#     "email": { "subscribed": 287 }
#   }
# }</code></pre>

    <!-- Admin – Users -->
    <h2 id="admin-users">Admin — User Management</h2>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/users</span>
        <span class="endpoint-desc">List users with pagination &amp; search <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/users/:id</span>
        <span class="endpoint-desc">User details + usage stats <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/users/:id/activity</span>
        <span class="endpoint-desc">User activity log <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method patch">PATCH</span>
        <span class="endpoint-path">/api/admin/users/:id</span>
        <span class="endpoint-desc">Update user (role, status, company) <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method delete">DELETE</span>
        <span class="endpoint-path">/api/admin/users/:id</span>
        <span class="endpoint-desc">Deactivate user account <span class="badge">🔑 Admin</span></span>
      </div>
    </div>

    <!-- Admin – Analytics -->
    <h2 id="admin-analytics">Admin — Analytics</h2>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/analytics/usage</span>
        <span class="endpoint-desc">Daily registration trends (default: 30d) <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/analytics/features</span>
        <span class="endpoint-desc">Feature adoption statistics <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/analytics/search-trends</span>
        <span class="endpoint-desc">Popular NAICS codes &amp; saved opportunity trends <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/analytics/export</span>
        <span class="endpoint-desc">Export user data as CSV or JSON <span class="badge">🔑 Admin</span></span>
      </div>
    </div>

    <!-- Admin – Subscriptions -->
    <h2 id="admin-subscriptions">Admin — Subscriptions</h2>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/subscriptions</span>
        <span class="endpoint-desc">All subscriptions <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/subscriptions/:userId</span>
        <span class="endpoint-desc">Subscription details for a user <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/admin/subscriptions/:userId/extend-trial</span>
        <span class="endpoint-desc">Extend trial period <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/admin/subscriptions/:userId/issue-refund</span>
        <span class="endpoint-desc">Record a refund <span class="badge">🔑 Admin</span></span>
      </div>
    </div>

    <!-- Admin – Health -->
    <h2 id="admin-health">Admin — System Health</h2>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/health/system</span>
        <span class="endpoint-desc">Server CPU, memory, uptime <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/health/integrations</span>
        <span class="endpoint-desc">MongoDB, SAM API, Stripe, email status <span class="badge">🔑 Admin</span></span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/admin/logs</span>
        <span class="endpoint-desc">System log viewer (Datadog integration) <span class="badge">🔑 Admin</span></span>
      </div>
    </div>

    <h2>Code Examples</h2>
    <p>Full working examples for every endpoint are available in the <a href="/api-docs">Interactive API Explorer</a>. Use the "Try it out" button to execute requests directly against the live API.</p>
    <pre><code class="language-python"># Python — complete admin workflow example
import requests

BASE = 'https://govcon-ai-scanner.onrender.com'

# 1. Log in as admin
auth = requests.post(f'{BASE}/api/auth/login',
    json={'email': 'admin@company.com', 'password': 'AdminPass123'}).json()
token = auth['accessToken']
headers = {'Authorization': f'Bearer {token}'}

# 2. Get dashboard metrics
dashboard = requests.get(f'{BASE}/api/admin/dashboard', headers=headers).json()
print(f"Total users: {dashboard['metrics']['users']['total']}")

# 3. List users
users = requests.get(f'{BASE}/api/admin/users?page=1&limit=10', headers=headers).json()
for u in users['users']:
    print(f"  {u['email']} — {u['company']}")

# 4. Extend a trial for a demo prospect
user_id = users['users'][0]['id']
result = requests.post(f'{BASE}/api/admin/subscriptions/{user_id}/extend-trial',
    headers=headers,
    json={'days': 15, 'note': 'Demo call follow-up'}).json()
print(result['message'])</code></pre>
  </main>
</div>
</body>
</html>`);
});

export default router;
