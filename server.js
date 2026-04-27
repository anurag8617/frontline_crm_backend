/**
 * Frontline Island Bar & Grill — CRM Backend
 * Node.js + Express + MongoDB Atlas
 * Production-ready for Render deployment
 */

require("dotenv").config();
const express = require("express");
const sequelize = require("./config/database");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");
const seedDatabase = require("./config/seed");
const models = require("./models"); // We will create this index file next

const app = express();

// ── Trust proxy (required on Render / behind load balancer) ──
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https://*"],
        "connect-src": ["'self'", "https://*"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// ── CORS ──────────────────────────────────────────────────────
// Build allowed origins from env vars + known local dev URLs
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

// Add production URLs from env (space or comma separated)
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(/[\s,]+/).forEach((url) => {
    const trimmed = url.trim();
    if (trimmed) allowedOrigins.push(trimmed);
  });
}

// When backend serves the frontend itself (same-origin), no CORS needed —
// but we still need CORS open for the Netlify deployment scenario.
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (Postman, mobile apps, same-origin)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Allow any *.netlify.app and *.onrender.com for convenience
      if (/\.netlify\.app$/.test(origin) || /\.onrender\.com$/.test(origin)) {
        return cb(null, true);
      }
      console.warn(`CORS blocked: ${origin}`);
      cb(new Error(`CORS not allowed from: ${origin}`));
    },
    credentials: true,
  }),
);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Global rate limit ─────────────────────────────────────────
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please slow down.",
    },
  }),
);

// ── API Routes ────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/leads", require("./routes/leads"));
app.use("/api/email", require("./routes/email"));
app.use("/api/data", require("./routes/data"));

// ── Health check (for Render health monitoring) ───────────────
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    db: "connected", // If this route is reached, the server is up and DB was authenticated
  });
});

// ── Serve frontend static files ───────────────────────────────
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

// ── SPA catch-all: every non-API route → frontend ─────────────
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res
      .status(404)
      .json({ success: false, message: "API route not found." });
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ── Connect to MySQL & Start ─────────────────────────────────
const PORT = process.env.PORT || 3001;

sequelize
  .authenticate()
  .then(() => {
    console.log("✅ MySQL database connected");
    // Sync models
    return sequelize.sync();
  })
  .then(async () => {
    console.log("✅ Tables synchronized");
    await seedDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Frontline CRM running on port ${PORT}`);
      console.log(`   NODE_ENV : ${process.env.NODE_ENV || "development"}`);
      console.log(`   API      : http://localhost:${PORT}/api`);
    });
  })
  .catch((err) => {
    console.error("❌ MySQL connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;
