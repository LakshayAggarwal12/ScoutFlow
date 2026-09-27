import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  nodeEnv: process.env.NODE_ENV || "development",
  demoMode: String(process.env.DEMO_MODE || "false").toLowerCase() === "true",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  workerMode: process.env.WORKER_MODE || "in-process",
  taskConcurrency: parseInt(process.env.TASK_CONCURRENCY || "3", 10),
  taskMaxAttempts: parseInt(process.env.TASK_MAX_ATTEMPTS || "2", 10),
  allowedOrigin: process.env.ALLOWED_ORIGIN || "",
  adminToken: process.env.ADMIN_TOKEN || "scoutflow-secret-token",
  jwtSecret: process.env.JWT_SECRET || "scoutflow-dev-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
