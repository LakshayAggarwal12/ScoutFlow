import express from "express";
import cors from "cors";
import morgan from "morgan";
import taskRoutes from "./routes/taskRoutes.js";
import sourceRoutes from "./routes/sourceRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";
import { env } from "./config/env.js";

export const app = express();

// CORS: allow the configured frontend origin(s). In development, allow localhost ports.
const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (e.g. same-origin, curl, Render health checks)
    if (!origin) return callback(null, true);

    const allowed = new Set([
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:4173",
      "http://localhost:3000",
    ]);
    if (env.allowedOrigin) {
      // Support comma-separated list of origins
      env.allowedOrigin.split(",").forEach((o) => allowed.add(o.trim()));
    }

    if (allowed.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

// Remove server-identifying header
app.disable("x-powered-by");

// Public endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "scoutflow-backend", demoMode: env.demoMode, time: new Date().toISOString() });
});

// Auth endpoints (public - register + login; /me is protected inside authRoutes)
app.use("/api/auth", authRoutes);

// All other API routes require JWT authentication
app.use("/api/tasks", requireAuth, taskRoutes);
app.use("/api/sources", requireAuth, sourceRoutes);
app.use("/api/stats", requireAuth, statsRoutes);

app.use(notFound);
app.use(errorHandler);
