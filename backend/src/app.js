import express from "express";
import cors from "cors";
import morgan from "morgan";
import taskRoutes from "./routes/taskRoutes.js";
import sourceRoutes from "./routes/sourceRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { env } from "./config/env.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "backend", demoMode: env.demoMode, time: new Date().toISOString() });
});

app.use("/api/tasks", taskRoutes);
app.use("/api/sources", sourceRoutes);
app.use("/api/stats", statsRoutes);

app.use(notFound);
app.use(errorHandler);
