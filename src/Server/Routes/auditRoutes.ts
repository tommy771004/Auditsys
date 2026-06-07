import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../../db/index";
import { users, audits, intakeLeads } from "../../db/schema";
import { safeJsonParse } from "../Helpers/jsonHelper";
import { generateAuditIntelligence } from "../Services/auditIntelligence";
import { authenticateToken } from "../Middleware/authMiddleware";
import { requirePlanLimits } from "../Middleware/planMiddleware";
import { isClientError } from "../Middleware/errorMiddleware";

// ---------------------------------------------------------------------------
// Shared audit request handler
// ---------------------------------------------------------------------------

interface AuditHandlerConfig {
  saveIntakeLead?: (body: Record<string, unknown>, userId: number, db: ReturnType<typeof getDb>) => Promise<void>;
  getUrl: (body: Record<string, unknown>) => string;
  clientErrorCodes: string[];
}

async function handleAuditRequest(
  req: import("express").Request,
  res: import("express").Response,
  config: AuditHandlerConfig,
): Promise<void> {
  try {
    const user = req.user!;
    const db = getDb();
    
    const auditConfig = req.auditConfig;

    const body = req.body as Record<string, unknown>;
    const url = config.getUrl(body);

    if (config.saveIntakeLead) {
      await config.saveIntakeLead(body, user.id, db);
    }

    // Create pending audit record before pipeline starts.
    const insertedAudit = await db
      .insert(audits)
      .values({ url, status: "pending", result: JSON.stringify({}), userId: user.id })
      .returning({ id: audits.id });
    const auditId = insertedAudit[0].id;

    try {
      const result = await generateAuditIntelligence(body, auditConfig);
      const auditStatus = result.queued ? "pending" : result.harness?.status === "failed" ? "failed" : "completed";
      await db.update(audits).set({ status: auditStatus, result: JSON.stringify(result) }).where(eq(audits.id, auditId));
      res.status(result.queued ? 202 : 200).json(result);
    } catch (innerError: unknown) {
      const message = innerError instanceof Error ? innerError.message : "pipeline_failed";
      await db
        .update(audits)
        .set({ status: "failed", result: JSON.stringify({ error: { code: "pipeline_failed", message } }) })
        .where(eq(audits.id, auditId));
      throw innerError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "audit_failed";
    const status = config.clientErrorCodes.includes(message) || isClientError(message) ? 400 : 502;
    res.status(status).json({ error: { code: status === 400 ? "client_error" : "server_error", message } });
  }
}

// ---------------------------------------------------------------------------
// auditRouter: mounted at /api/audit
// POST /api/audit           → auditRouter POST /
// POST /api/audit/presentation → handled by presentationRouter (mounted first in server.ts)
// ---------------------------------------------------------------------------

export const auditRouter = Router();

auditRouter.post("/", authenticateToken, requirePlanLimits, async (req, res) => {
  await handleAuditRequest(req, res, {
    getUrl: (body) => (typeof body.url === "string" ? body.url : "unknown"),
    clientErrorCodes: ["INVALID_AUDIT_PAYLOAD", "UNSAFE_AUDIT_TARGET", "AUDIT_TARGET_REDIRECT_LIMIT"],
  });
});

// ---------------------------------------------------------------------------
// intakeRouter: mounted at /api/intake
// POST /api/intake          → intakeRouter POST /
// ---------------------------------------------------------------------------

export const intakeRouter = Router();

intakeRouter.post("/", authenticateToken, requirePlanLimits, async (req, res) => {
  await handleAuditRequest(req, res, {
    saveIntakeLead: async (body, userId, db) => {
      if (body.companyName && body.contactEmail) {
        await db.insert(intakeLeads).values({
          userId,
          url: typeof body.url === "string" ? body.url : "unknown",
          companyName: String(body.companyName),
          contactEmail: String(body.contactEmail),
          goals: Array.isArray(body.goals) ? JSON.stringify(body.goals) : null,
          stack: Array.isArray(body.stack) ? JSON.stringify(body.stack) : null,
          teamSize: typeof body.teamSize === "string" ? body.teamSize : null,
          notes: typeof body.notes === "string" ? body.notes : null,
        });
      }
    },
    getUrl: (body) => (typeof body.url === "string" ? body.url : "unknown"),
    clientErrorCodes: ["INVALID_JSON_BODY", "INVALID_AUDIT_PAYLOAD", "UNSAFE_AUDIT_TARGET", "AUDIT_TARGET_REDIRECT_LIMIT"],
  });
});

// ---------------------------------------------------------------------------
// userAuditsRouter: mounted at /api/audits
// GET /api/audits       → userAuditsRouter GET /
// GET /api/audits/:id   → userAuditsRouter GET /:id
// ---------------------------------------------------------------------------

export const userAuditsRouter = Router();

userAuditsRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const db = getDb();
    const userAudits = await db
      .select()
      .from(audits)
      .where(eq(audits.userId, Number(user.id)))
      .orderBy(desc(audits.createdAt));
    res.json(userAudits.map(a => ({ ...a, result: safeJsonParse(a.result, null) })));
  } catch (error: unknown) {
    res.status(500).json({ error: { code: "server_error", message: error instanceof Error ? error.message : "fetch_audits_failed" } });
  }
});

userAuditsRouter.get("/:id", authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const db = getDb();
    const auditRecord = await db
      .select()
      .from(audits)
      .where(and(eq(audits.id, req.params.id as string), eq(audits.userId, Number(user.id))))
      .then(rows => rows[0]);
    if (!auditRecord) {
      return res.status(404).json({ error: { code: "client_error", message: "Audit not found" } });
    }
    res.json({ ...auditRecord, result: safeJsonParse(auditRecord.result, null) });
  } catch (error: unknown) {
    res.status(500).json({ error: { code: "server_error", message: error instanceof Error ? error.message : "fetch_audit_failed" } });
  }
});
