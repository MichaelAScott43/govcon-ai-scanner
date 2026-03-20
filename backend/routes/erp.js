/**
 * ERP Connector Routes  –  /api/erp
 * Manages ERP configuration records and proxies data requests to Infor, Oracle, or SAP.
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import ErpConfig from "../models/ErpConfig.js";
import * as infor from "../connectors/infor.js";
import * as oracle from "../connectors/oracle.js";
import * as sap from "../connectors/sap.js";

const router = express.Router();

// Helper: map system identifier to connector module
const connectors = { infor_syteline: infor, oracle, sap };

// Helper: resolve a valid access token for a config (refresh if expired)
async function resolveToken(cfg) {
  const now = new Date();
  if (cfg.accessToken && cfg.tokenExpiresAt && cfg.tokenExpiresAt > now) {
    return cfg.accessToken;
  }
  const connector = connectors[cfg.system];
  const tokenData = await connector.getAccessToken({
    tokenUrl: cfg.tokenUrl,
    clientId: cfg.getClientId(),
    clientSecret: cfg.getClientSecret(),
    scope: cfg.scope
  });
  cfg.accessToken = tokenData.accessToken;
  cfg.tokenExpiresAt = new Date(Date.now() + (tokenData.expiresIn - 60) * 1000);
  await cfg.save();
  return cfg.accessToken;
}

// ── GET /api/erp ─────────────────────────────────────────────────
// List all ERP configs for the current user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const configs = await ErpConfig.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, configs: configs.map((c) => c.toPublic()) });
  } catch (err) {
    console.error("ERP list error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch ERP configurations." });
  }
});

// ── POST /api/erp ─────────────────────────────────────────────────
// Create a new ERP configuration
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { system, label, tenantUrl, clientId, clientSecret, tokenUrl, scope } = req.body;
    if (!system || !tenantUrl || !clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error: "system, tenantUrl, clientId, and clientSecret are required."
      });
    }
    if (!connectors[system]) {
      return res.status(400).json({ success: false, error: `Unsupported ERP system: ${system}` });
    }

    const cfg = new ErpConfig({
      system,
      label: label || system,
      tenantUrl,
      tokenUrl: tokenUrl || "",
      scope: scope || "",
      createdBy: req.user.id
    });
    cfg.setClientId(clientId);
    cfg.setClientSecret(clientSecret);
    await cfg.save();

    res.status(201).json({ success: true, config: cfg.toPublic() });
  } catch (err) {
    console.error("ERP create error:", err.message);
    res.status(500).json({ success: false, error: "Failed to create ERP configuration." });
  }
});

// ── DELETE /api/erp/:id ───────────────────────────────────────────
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const cfg = await ErpConfig.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!cfg) return res.status(404).json({ success: false, error: "ERP configuration not found." });
    res.json({ success: true });
  } catch (err) {
    console.error("ERP delete error:", err.message);
    res.status(500).json({ success: false, error: "Failed to delete ERP configuration." });
  }
});

// ── POST /api/erp/:id/test ────────────────────────────────────────
// Test connectivity for a saved ERP config
router.post("/:id/test", authenticateToken, async (req, res) => {
  try {
    const cfg = await ErpConfig.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!cfg) return res.status(404).json({ success: false, error: "ERP configuration not found." });

    const connector = connectors[cfg.system];
    const result = await connector.testConnection({
      tokenUrl: cfg.tokenUrl,
      clientId: cfg.getClientId(),
      clientSecret: cfg.getClientSecret(),
      scope: cfg.scope
    });

    cfg.lastTestAt = new Date();
    cfg.lastTestStatus = "ok";
    cfg.lastTestMessage = `Connection successful. Token expires in ${result.expiresIn}s.`;
    await cfg.save();

    res.json({ success: true, message: cfg.lastTestMessage });
  } catch (err) {
    const cfg = await ErpConfig.findOne({ _id: req.params.id, createdBy: req.user.id }).catch(() => null);
    if (cfg) {
      cfg.lastTestAt = new Date();
      cfg.lastTestStatus = "error";
      cfg.lastTestMessage = err.message;
      await cfg.save().catch(() => {});
    }
    console.error("ERP test error:", err.message);
    res.status(502).json({ success: false, error: `ERP connection test failed: ${err.message}` });
  }
});

// Build a normalised pagination options object from query parameters.
// Each connector reads only the fields it needs (page/pageSize, top/skip, offset/limit).
function buildPaginationOpts(query) {
  const pageSize = Number(query.pageSize) || 50;
  const page = Number(query.page) || 1;
  const skip = (page - 1) * pageSize;
  return { page, pageSize, top: pageSize, skip, offset: skip, limit: pageSize };
}

// ── GET /api/erp/:id/purchase-orders ─────────────────────────────
router.get("/:id/purchase-orders", authenticateToken, async (req, res) => {
  try {
    const cfg = await ErpConfig.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!cfg) return res.status(404).json({ success: false, error: "ERP configuration not found." });

    const token = await resolveToken(cfg);
    const connector = connectors[cfg.system];
    const data = await connector.getPurchaseOrders(cfg.tenantUrl, token, {
      ...buildPaginationOpts(req.query),
      status: req.query.status || undefined
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("ERP purchase-orders error:", err.message);
    res.status(502).json({ success: false, error: `ERP error: ${err.message}` });
  }
});

// ── GET /api/erp/:id/suppliers ────────────────────────────────────
router.get("/:id/suppliers", authenticateToken, async (req, res) => {
  try {
    const cfg = await ErpConfig.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!cfg) return res.status(404).json({ success: false, error: "ERP configuration not found." });

    const token = await resolveToken(cfg);
    const connector = connectors[cfg.system];
    const data = await connector.getSuppliers(cfg.tenantUrl, token, {
      ...buildPaginationOpts(req.query),
      search: req.query.search || undefined
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("ERP suppliers error:", err.message);
    res.status(502).json({ success: false, error: `ERP error: ${err.message}` });
  }
});

// ── GET /api/erp/:id/invoices ─────────────────────────────────────
router.get("/:id/invoices", authenticateToken, async (req, res) => {
  try {
    const cfg = await ErpConfig.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!cfg) return res.status(404).json({ success: false, error: "ERP configuration not found." });

    const token = await resolveToken(cfg);
    const connector = connectors[cfg.system];
    const data = await connector.getInvoices(cfg.tenantUrl, token, {
      ...buildPaginationOpts(req.query),
      status: req.query.status || undefined,
      fromDate: req.query.fromDate || undefined,
      toDate: req.query.toDate || undefined
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("ERP invoices error:", err.message);
    res.status(502).json({ success: false, error: `ERP error: ${err.message}` });
  }
});

export default router;
