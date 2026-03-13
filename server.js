import "./tracer.js"; // must be first — initializes Datadog APM
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import connectDB from "./backend/config/db.js";
import authRouter from "./backend/routes/auth.js";
import opportunitiesRouter from "./backend/routes/opportunities.js";
import emailRouter from "./backend/routes/email.js";
import adminRouter from "./backend/routes/admin.js";
import docsRouter from "./backend/routes/docs.js";
import opportunityIntelligenceRouter from "./backend/routes/opportunityIntelligence.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS: origin not allowed — " + origin));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

// Strict limit for auth endpoints — prevents brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." }
});

// General API limit for all other authenticated routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." }
});

// Stricter limit for admin endpoints — reduces blast radius if an admin token is compromised
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many admin requests. Please try again later." }
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/opportunities", apiLimiter, opportunitiesRouter);
app.use("/api/opportunity-intelligence", apiLimiter, opportunityIntelligenceRouter);
app.use("/api/email", apiLimiter, emailRouter);
app.use("/api/email-preferences", apiLimiter, emailRouter);
app.use("/api/admin", adminLimiter, adminRouter);

// API Documentation (no auth required — publicly accessible, rate-limited within docsRouter)
app.use(docsRouter);

// Health check (no auth required)
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    app: "GovCon AI Scanner",
    env: process.env.NODE_ENV || "development",
    samConfigured: !!process.env.SAM_API_KEY,
    mongoConfigured: !!process.env.MONGODB_URI
  });
});

// ---------------------------------------------------------------------------
// Serve React frontend (production build)
// ---------------------------------------------------------------------------
// General page rate limiter for the SPA fallback
const pageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
});

const frontendDist = path.join(__dirname, "frontend", "dist");
app.use(express.static(frontendDist));

// SPA fallback — serve index.html for all non-API routes
app.get("*", pageLimiter, (req, res) => {
  const indexPath = path.join(frontendDist, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>GovCon AI Scanner</title></head>
          <body style="font-family:sans-serif;max-width:600px;margin:80px auto;text-align:center;">
            <h1>GovCon AI Scanner</h1>
            <p>API is running. Build the frontend with:</p>
            <pre style="background:#f1f5f9;padding:16px;border-radius:8px;text-align:left;">cd frontend &amp;&amp; npm install &amp;&amp; npm run build</pre>
            <p><a href="/health">/health</a></p>
          </body>
        </html>`);
    }
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
async function start() {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    } else {
      console.warn("MONGODB_URI not set — running without database. Auth endpoints will not work.");
    }

    app.listen(PORT, () => {
      console.log(`GovCon AI Scanner running on port ${PORT}`);
      console.log("SAM_API_KEY configured:", !!process.env.SAM_API_KEY);
      console.log("MongoDB configured:", !!process.env.MONGODB_URI);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
