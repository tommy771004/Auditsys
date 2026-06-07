import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/index";
import { users, planSettings } from "../../db/schema";
import { getRequiredJwtSecret, parseSubscriptionPlan, canSelfServePlanChange } from "../Services/securityPolicies";
import { authenticateToken } from "../Middleware/authMiddleware";
import { setAuthCookie, clearAuthCookie } from "../Helpers/cookieHelper";

const JWT_SECRET = getRequiredJwtSecret();

/** Builds the public user object for API responses (never exposes passwordHash). */
function publicUser(user: { id: number; username: string; isAdmin: boolean; subscriptionPlan: string }) {
  return { id: user.id, username: user.username, isAdmin: user.isAdmin, subscriptionPlan: user.subscriptionPlan };
}

/** Signs a 24-hour JWT for the given user record. */
function signUserToken(user: { id: number; username: string; isAdmin: boolean; subscriptionPlan: string }) {
  return jwt.sign(publicUser(user), JWT_SECRET, { expiresIn: "24h" });
}

export const authRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
authRouter.post("/login", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Database not configured. Set DATABASE_URL in secrets." });
  }
  const { username, password } = req.body;
  try {
    const db = getDb();
    const userList = await db.select().from(users).where(eq(users.username, username));
    const user = userList[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signUserToken(user);
    setAuthCookie(res, token);
    return res.json({ success: true, token, user: publicUser(user) });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "login_failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
authRouter.post("/register", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Database not configured" });
  }
  const { username, password } = req.body;
  if (!username || !password || password.length < 8) {
    return res.status(400).json({ error: "Invalid username or password (min length 8)" });
  }
  try {
    const db = getDb();
    const existingUser = await db.select().from(users).where(eq(users.username, username));
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await db.insert(users).values({
      username,
      passwordHash,
      isAdmin: false,
      subscriptionPlan: "free",
    }).returning();
    const user = inserted[0];
    const token = signUserToken(user);
    setAuthCookie(res, token);
    return res.json({ success: true, token, user: publicUser(user) });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "register_failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
authRouter.get("/me", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const userList = await db.select().from(users).where(eq(users.id, Number(req.user!.id)));
    const user = userList[0];
    if (!user) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }
    const token = signUserToken(user);
    setAuthCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (e: unknown) {
    res.status(500).json({ status: "error", message: "Failed to fetch user" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/health  (public)
// ---------------------------------------------------------------------------
export const healthRouter = Router();
healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// ---------------------------------------------------------------------------
// POST /api/subscription/upgrade
// ---------------------------------------------------------------------------
export const subscriptionRouter = Router();
subscriptionRouter.post("/upgrade", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const user = req.user!;
    const requestedPlan = parseSubscriptionPlan(req.body?.plan);
    const currentPlan = parseSubscriptionPlan(user.subscriptionPlan);
    if (!requestedPlan) {
      return res.status(400).json({ error: "invalid_plan" });
    }
    if (!currentPlan) {
      return res.status(500).json({ error: "invalid_user_plan" });
    }
    const decision = canSelfServePlanChange(currentPlan, requestedPlan);
    if (!decision.allowed) {
      return res.status(403).json({ error: decision.reason });
    }
    await db.update(users).set({ subscriptionPlan: requestedPlan }).where(eq(users.id, Number(user.id)));
    const updatedUserList = await db.select().from(users).where(eq(users.id, Number(user.id)));
    const updatedUser = updatedUserList[0];
    if (!updatedUser) {
      return res.status(404).json({ error: "user_not_found" });
    }
    const token = signUserToken(updatedUser);
    return res.json({ success: true, token, user: publicUser(updatedUser) });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "upgrade_failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/plans  (public — returns only planId, allowedModels, price)
// ---------------------------------------------------------------------------
export const plansRouter = Router();
plansRouter.get("/", async (_req, res) => {
  try {
    const db = getDb();
    const settings = await db.select({
      planId: planSettings.planId,
      allowedModels: planSettings.allowedModels,
      price: planSettings.price,
    }).from(planSettings);
    res.json(settings);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "plans_fetch_failed" });
  }
});
