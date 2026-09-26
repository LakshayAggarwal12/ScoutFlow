import { env } from "../config/env.js";

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    error: err.message || "Internal server error",
  };
  if (err.details) payload.details = err.details;
  if (env.nodeEnv === "development" && !err.isOperational) {
    payload.stack = err.stack;
  }
  if (!err.isOperational) {
    console.error(err);
  }
  res.status(statusCode).json(payload);
}

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}
