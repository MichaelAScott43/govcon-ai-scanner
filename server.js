import "./tracer.js"; // must be first
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { tracer } from "./tracer.js";
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

app.set("trust proxy", 1);

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS: origin not allowed - " + origin));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." }
});

// API Routes
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/opportunities", apiLimiter, opportunitiesRouter);
app.use("/api/email", apiLimiter, emailRouter);
app.use("/api/email-preferences", apiLimiter, emailRouter);
app.use("/api/admin", adminRouter);
app.use("/api/docs", docsRouter);
app.use("/api/opportunity-intelligence", opportunityIntelligenceRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    app: "GovCon AI Scanner",
    env: process.env.NODE_ENV || "development"
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, "public"), { index: "app.html" }));

// Explicit login route
app.get("/login", apiLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Fallback to app.html for SPA
app.get("*", apiLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "app.html"));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
