import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) throw new AppError("email and password are required", 422);
  if (password.length < 8) throw new AppError("password must be at least 8 characters", 422);

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) throw new AppError("An account with this email already exists", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name: name?.trim() || null, email: email.toLowerCase().trim(), passwordHash },
  });

  const token = signToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError("email and password are required", 422);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) throw new AppError("Invalid email or password", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid email or password", 401);

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!user) throw new AppError("User not found", 404);
  res.json(user);
});

// Short-lived token for export/download links (?token=...). The session JWT
// (default 7d expiry) must never appear in URLs - it lands in access logs and
// potentially Referer headers. A 10-minute token is plenty to start a browser
// download and is worthless afterwards.
export const downloadToken = asyncHandler(async (req, res) => {
  // `use: "download"` scopes this token: requireAuth rejects it outside
  // export routes, so a leaked download URL (browser history, Referer
  // header) can't be replayed as a full session token.
  const token = jwt.sign({ sub: req.user.id, use: "download" }, env.jwtSecret, { expiresIn: "10m" });
  res.json({ token, expiresIn: 600 });
});
