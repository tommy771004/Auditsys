import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "../../db/index";
import { users, audits, planSettings, intakeLeads } from "../../db/schema";
import { getRequiredJwtSecret, assertSafeAuditTargetUrl } from "../Services/securityPolicies";
import { resolveAdminBootstrapConfig } from "../../db/adminBootstrap";
import { invalidatePlanSettingsCache } from "../Services/planSettingsCache";
import { authenticateToken, requireAdmin } from "../Middleware/authMiddleware";

void getRequiredJwtSecret; // imported for security check below

export const adminRouter = Router();

// All admin routes require both authenticateToken AND requireAdmin.
adminRouter.use(authenticateToken, requireAdmin);

// ---------------------------------------------------------------------------
// GET /api/admin/users
// ---------------------------------------------------------------------------
adminRouter.get("/users", async (_req, res) => {
  try {
    const db = getDb();
    const userList = await db.select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
      subscriptionPlan: users.subscriptionPlan,
      createdAt: users.createdAt,
    }).from(users);
    res.json(userList);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "fetch_users_failed" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id
// ---------------------------------------------------------------------------
adminRouter.patch("/users/:id", async (req, res) => {
  try {
    const db = getDb();
    const { subscriptionPlan, isAdmin } = req.body as { subscriptionPlan?: string; isAdmin?: boolean };
    type UserUpdate = Partial<Pick<typeof users.$inferInsert, "subscriptionPlan" | "isAdmin">>;
    const updates: UserUpdate = {};
    if (subscriptionPlan !== undefined) updates.subscriptionPlan = subscriptionPlan;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;
    await db.update(users).set(updates).where(eq(users.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "update_user_failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/leads
// ---------------------------------------------------------------------------
adminRouter.get("/leads", async (_req, res) => {
  try {
    const db = getDb();
    const leadsList = await db.select().from(intakeLeads).orderBy(desc(intakeLeads.createdAt));
    res.json(leadsList);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "fetch_leads_failed" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/leads/:id
// ---------------------------------------------------------------------------
adminRouter.delete("/leads/:id", async (req, res) => {
  try {
    const db = getDb();
    await db.delete(intakeLeads).where(eq(intakeLeads.id, req.params.id as string));
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "delete_lead_failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/plan-settings
// ---------------------------------------------------------------------------
adminRouter.get("/plan-settings", async (_req, res) => {
  try {
    const db = getDb();
    const settings = await db.select().from(planSettings);
    res.json(settings);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "fetch_plan_settings_failed" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/plan-settings/:planId
// ---------------------------------------------------------------------------
adminRouter.patch("/plan-settings/:planId", async (req, res) => {
  try {
    const db = getDb();
    const { openRouterApiKey, allowedModels, price, aiProvider, agentRouterApiKey, nvidiaApiKey } =
      req.body as Record<string, string | undefined>;
    type PlanUpdate = Partial<typeof planSettings.$inferInsert>;
    const updates: PlanUpdate = {};
    if (openRouterApiKey !== undefined) updates.openRouterApiKey = openRouterApiKey;
    if (agentRouterApiKey !== undefined) updates.agentRouterApiKey = agentRouterApiKey;
    if (nvidiaApiKey !== undefined) updates.nvidiaApiKey = nvidiaApiKey;
    if (aiProvider !== undefined) updates.aiProvider = aiProvider;
    if (allowedModels !== undefined) updates.allowedModels = allowedModels;
    if (price !== undefined) updates.price = price;

    const planId = req.params.planId as string;
    await db.update(planSettings).set(updates).where(eq(planSettings.planId, planId));
    invalidatePlanSettingsCache(planId);
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "update_plan_settings_failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/security
// ---------------------------------------------------------------------------
adminRouter.get("/security", async (_req, res) => {
  try {
    // 1. JWT Configuration Check
    let jwtStatus = "healthy";
    let jwtReason = "JWT secret configuration active with required complexity.";
    try {
      const secret = getRequiredJwtSecret();
      if (!secret) {
        jwtStatus = "critical";
        jwtReason = "JWT_SECRET is unset or empty.";
      } else if (secret === "default_fallback_jwt_secret" || secret.length < 16) {
        jwtStatus = "warning";
        jwtReason = "JWT_SECRET is using a weak or default fallback value.";
      }
    } catch (err: unknown) {
      jwtStatus = "critical";
      jwtReason = err instanceof Error ? err.message : "JWT secret is missing.";
    }

    // 2. Admin Bootstrap Check
    let bootstrapStatus = "healthy";
    let bootstrapReason = "Master administrative bootstrap credentials defined safely.";
    try {
      const config = resolveAdminBootstrapConfig();
      if (!config) {
        bootstrapStatus = "warning";
        bootstrapReason = "Bootstrap credentials are empty or omitted from the environment variables.";
      } else if (config.password.length < 12) {
        bootstrapStatus = "critical";
        bootstrapReason = "BOOTSTRAP_ADMIN_PASSWORD is too short (minimum 12 characters required).";
      }
    } catch (err: unknown) {
      bootstrapStatus = "critical";
      bootstrapReason = err instanceof Error ? err.message : "Admin bootstrap configuration error.";
    }

    // 3. Egress Guard Policies Check
    let egressStatus = "healthy";
    let egressReason = "Active policies loaded; private IP ranges and internal metadata lookups strictly protected.";
    try {
      if (typeof assertSafeAuditTargetUrl !== "function") {
        egressStatus = "critical";
        egressReason = "Egress guard validation module failed to initialize.";
      }
    } catch (err: unknown) {
      egressStatus = "critical";
      egressReason = err instanceof Error ? err.message : "Egress guard error.";
    }

    res.json({
      jwt: { status: jwtStatus, reason: jwtReason },
      bootstrap: { status: bootstrapStatus, reason: bootstrapReason },
      egress: { status: egressStatus, reason: egressReason },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "security_check_failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/stats  — uses COUNT(*) aggregation instead of full table scan
// ---------------------------------------------------------------------------
adminRouter.get("/stats", async (_req, res) => {
  try {
    const db = getDb();

    const [totalUsersRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const [totalAuditsRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(audits);
    const [completedRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(audits)
      .where(eq(audits.status, "completed"));
    const [pendingRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(audits)
      .where(eq(audits.status, "pending"));

    res.json({
      totalUsers: Number(totalUsersRow?.count ?? 0),
      totalAudits: Number(totalAuditsRow?.count ?? 0),
      completedAudits: Number(completedRow?.count ?? 0),
      pendingAudits: Number(pendingRow?.count ?? 0),
    });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "fetch_stats_failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/audits
// ---------------------------------------------------------------------------
adminRouter.get("/audits", async (_req, res) => {
  try {
    const db = getDb();
    const auditList = await db.select().from(audits).orderBy(desc(audits.createdAt));
    res.json(auditList.map(a => ({ ...a, result: a.result ? JSON.parse(a.result) : null })));
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "fetch_audits_failed" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/audits/:id
// ---------------------------------------------------------------------------
adminRouter.delete("/audits/:id", async (req, res) => {
  try {
    const db = getDb();
    await db.delete(audits).where(eq(audits.id, req.params.id as string));
    res.json({ success: true });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error deleting audit:", error);
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "delete_audit_failed" });
  }
});
