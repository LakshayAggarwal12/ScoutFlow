import { env } from "../config/env.js";

export function requireAuth(req, res, next) {
  if (req.path === "/api/health") return next();

  let token = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  if (token !== env.adminToken) {
    return res.status(403).json({ error: "Invalid token" });
  }

  // Hardcoded simple user context for ownership tracking
  req.user = { id: "admin-user", name: "Admin User" };
  next();
}
