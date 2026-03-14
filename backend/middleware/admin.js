import { authenticateToken } from "./auth.js";

/**
 * Admin-only middleware.
 *
 * 1. Validates the JWT (reuses authenticateToken).
 * 2. Checks that the decoded token belongs to an admin user.
 * 3. Logs every admin request for audit purposes.
 */
export function requireAdmin(req, res, next) {
  // First validate the JWT and attach req.user
  authenticateToken(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required." });
    }

    // Audit log — write to console (can be forwarded to Datadog / log aggregator)
    console.log(
      JSON.stringify({
        type: "ADMIN_ACTION",
        adminId: req.user.id,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString()
      })
    );

    next();
  });
}

export default requireAdmin;
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Admin middleware — must be used AFTER authenticateToken.
 * Verifies the authenticated user has the "admin" role.
 */
export async function requireAdmin(req, res, next) {
  try {
    // req.user is populated by authenticateToken
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const user = await User.findById(req.user.id).select("role isActive email name");
    if (!user || !user.isActive) {
      return res.status(403).json({ success: false, error: "Account not found or inactive." });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required." });
    }

    // Attach full admin user to request for downstream use
    req.adminUser = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error.message);
    res.status(500).json({ success: false, error: "Authorization check failed." });
  }
}

/**
 * Audit-logging middleware — logs every admin action to stdout (Datadog picks it up).
 * Call AFTER requireAdmin so req.adminUser is available.
 */
export function auditLog(req, res, next) {
  const start = Date.now();
  const { method, originalUrl, body, params, query } = req;

  // Sanitize body before logging — never log passwords or tokens
  const safeBody = Object.fromEntries(
    Object.entries(body || {}).filter(([k]) => !["password", "token", "refreshToken", "secret"].includes(k))
  );

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    console.log(
      JSON.stringify({
        type: "admin_audit",
        ts: new Date().toISOString(),
        admin: req.adminUser?.email ?? req.user?.id ?? "unknown",
        method,
        path: originalUrl,
        params,
        query,
        body: safeBody,
        status: res.statusCode,
        durationMs
      })
    );
  });

  next();
}

export default { requireAdmin, auditLog };
