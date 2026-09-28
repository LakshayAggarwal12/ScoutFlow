import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Verifies the JWT from the Authorization header (Bearer <token>)
 * or the ?token= query param (for file downloads like export endpoints).
 *
 * Sets req.user = { id, email } on success. Never trusts userId from body/query.
 */
export function requireAuth(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    // payload.sub is the userId we signed in authController
    req.user = { id: payload.sub };

    // Short-lived download tokens are only valid for dataset export
    // downloads - never as a general session credential.
    if (payload.use === "download") {
      const pathOnly = (req.originalUrl || "").split("?")[0];
      if (!pathOnly.includes("/export/")) {
        return res.status(403).json({ error: "Download token is only valid for export downloads" });
      }
    }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired - please log in again" });
    }
    return res.status(401).json({ error: "Invalid authentication token" });
  }
}
