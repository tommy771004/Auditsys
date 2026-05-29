import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateAuditIntelligence } from "./src/Server/Services/auditIntelligence";
import {
  buildLiveScanSummaryFromDeterministic,
  estimateDomIssueCount,
  scanDomIssues,
  type SSELogLevel,
} from "./src/Server/Services/liveScanCollector";
import { collectDeterministicEvidence } from "./src/Server/Services/deterministicCollector";
import { fetchCruxReport } from "./src/Server/Services/cruxCollector";
import type { LiveScanSummary } from "./src/types/liveAudit.types";
import { AUDIT_TARGET_REDIRECT_LIMIT_ERROR, canSelfServePlanChange, getRequiredJwtSecret, parseSubscriptionPlan, UNSAFE_AUDIT_TARGET_ERROR } from "./src/Server/Services/securityPolicies";
import { initDb, getDb } from "./src/db/index";
import { users, audits, planSettings, intakeLeads } from "./src/db/schema";
import { eq, desc, and } from "drizzle-orm";

async function startServer() {
  const JWT_SECRET = getRequiredJwtSecret();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Initialize DB if URL is present
  try {
    const initialized = await initDb();
    if (initialized) {
      console.log("Database initialized");
    } else {
      console.warn("Database initialization skipped because DATABASE_URL is not configured.");
    }
  } catch (error) {
    console.error("Database initialization failed. Waiting for configuration.");
  }

  // Auth Middleware
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const headerToken = req.headers.authorization?.split(" ")[1];
    const token = headerToken || req.cookies?.auth_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      (req as any).user = user;
      next();
    });
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!(req as any).user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  // Auth Routes
  app.post("/api/auth/login", async (req, res) => {
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

      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin, subscriptionPlan: user.subscriptionPlan }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie("auth_token", token, { 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000, 
        secure: true,
        sameSite: 'none'
      });
      return res.json({ success: true, token, user: { id: user.id, username: user.username, isAdmin: user.isAdmin, subscriptionPlan: user.subscriptionPlan } });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const { username, password } = req.body;
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: "Invalid username or password (min length 6)" });
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
        subscriptionPlan: 'free'
      }).returning();
      
      const user = inserted[0];
      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin, subscriptionPlan: user.subscriptionPlan }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie("auth_token", token, { 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000, 
        secure: true,
        sameSite: 'none'
      });
      return res.json({ success: true, token, user: { id: user.id, username: user.username, isAdmin: user.isAdmin, subscriptionPlan: user.subscriptionPlan } });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json({ user: (req as any).user });
  });

  app.post("/api/subscription/upgrade", authenticateToken, async (req, res) => {
    try {
      const db = getDb();
      const user = (req as any).user;
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

      await db.update(users).set({ subscriptionPlan: requestedPlan }).where(eq(users.id, user.id));

      const updatedUserList = await db.select().from(users).where(eq(users.id, user.id));
      const updatedUser = updatedUserList[0];

      if (!updatedUser) {
        return res.status(404).json({ error: "user_not_found" });
      }

      const token = jwt.sign(
        { id: updatedUser.id, username: updatedUser.username, isAdmin: updatedUser.isAdmin, subscriptionPlan: updatedUser.subscriptionPlan },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          isAdmin: updatedUser.isAdmin,
          subscriptionPlan: updatedUser.subscriptionPlan
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // User Audits Routes
  app.get("/api/audits", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const db = getDb();
      const userAudits = await db.select()
        .from(audits)
        .where(eq(audits.userId, user.id))
        .orderBy(desc(audits.createdAt));
      res.json(userAudits.map(a => ({
        ...a,
        result: a.result ? JSON.parse(a.result) : null
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/audits/:id", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const db = getDb();
      const auditRecord = await db.select()
        .from(audits)
        .where(and(eq(audits.id, req.params.id), eq(audits.userId, user.id)))
        .then(rows => rows[0]);
      
      if (!auditRecord) {
        return res.status(404).json({ error: "audit_not_found" });
      }
      res.json({
        ...auditRecord,
        result: auditRecord.result ? JSON.parse(auditRecord.result) : null
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Routes
  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const db = getDb();
      const userList = await db.select({
        id: users.id,
        username: users.username,
        isAdmin: users.isAdmin,
        subscriptionPlan: users.subscriptionPlan,
        createdAt: users.createdAt
      }).from(users);
      res.json(userList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const db = getDb();
      const { subscriptionPlan, isAdmin } = req.body;
      const updates: any = {};
      if (subscriptionPlan !== undefined) updates.subscriptionPlan = subscriptionPlan;
      if (isAdmin !== undefined) updates.isAdmin = isAdmin;

      await db.update(users).set(updates).where(eq(users.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/leads", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const db = getDb();
      const leadsList = await db.select().from(intakeLeads).orderBy(desc(intakeLeads.createdAt));
      res.json(leadsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/leads/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const db = getDb();
      await db.delete(intakeLeads).where(eq(intakeLeads.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/plans", async (req, res) => {
    try {
      const db = getDb();
      const settings = await db.select({
        planId: planSettings.planId,
        allowedModels: planSettings.allowedModels,
        price: planSettings.price
      }).from(planSettings);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/plan-settings", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const db = getDb();
      const settings = await db.select().from(planSettings);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/plan-settings/:planId", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const db = getDb();
      const { openRouterApiKey, allowedModels, price } = req.body;
      const updates: any = {};
      if (openRouterApiKey !== undefined) updates.openRouterApiKey = openRouterApiKey;
      if (allowedModels !== undefined) updates.allowedModels = allowedModels;
      if (price !== undefined) updates.price = price;

      await db.update(planSettings).set(updates).where(eq(planSettings.planId, req.params.planId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/stats", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const db = getDb();
      const userList = await db.select().from(users);
      const auditList = await db.select().from(audits);
      
      const stats = {
        totalUsers: userList.length,
        totalAudits: auditList.length,
        completedAudits: auditList.filter(a => a.status === 'completed').length,
        pendingAudits: auditList.filter(a => a.status === 'pending').length,
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/audits", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const db = getDb();
      const auditList = await db.select().from(audits).orderBy(desc(audits.createdAt));
      res.json(auditList.map(a => ({
        ...a,
        result: a.result ? JSON.parse(a.result) : null
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/audits/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const db = getDb();
      await db.delete(audits).where(eq(audits.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting audit:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Audit API proxy
  app.post("/api/audit", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const db = getDb();
      const dbUser = await db.select().from(users).where(eq(users.id, user.id)).then(rows => rows[0]);
      const currentPlan = dbUser?.subscriptionPlan || 'free';
      const userPlanSettings = await db.select().from(planSettings).where(eq(planSettings.planId, currentPlan)).then(rows => rows[0]);

      const config = userPlanSettings ? {
        openRouterApiKey: userPlanSettings.openRouterApiKey,
        allowedModels: userPlanSettings.allowedModels ? userPlanSettings.allowedModels.split(',').map(m => m.trim()).filter(Boolean) : undefined
      } : undefined;

      // 1. Immediately create a pending audit record
      const insertedAudit = await db.insert(audits).values({
        url: req.body.url || "unknown",
        status: "pending",
        result: JSON.stringify({}),
        userId: user.id
      }).returning({ id: audits.id });
      
      const auditId = insertedAudit[0].id;

      try {
        const result = await generateAuditIntelligence(req.body, config);
        
        // 2. Update audit record upon success
        await db.update(audits).set({
          status: result.queued ? "pending" : "completed",
          result: JSON.stringify(result)
        }).where(eq(audits.id, auditId));

        res.status(result.queued ? 202 : 200).json(result);
      } catch (innerError: any) {
        // 3. Update audit record upon failure
        await db.update(audits).set({
          status: "failed",
          result: JSON.stringify({ error: innerError.message })
        }).where(eq(audits.id, auditId));
        throw innerError;
      }
    } catch (error: any) {
      const message = error.message;
      res.status(message === "INVALID_AUDIT_PAYLOAD" || message === "UNSAFE_AUDIT_TARGET" || message === "AUDIT_TARGET_REDIRECT_LIMIT" ? 400 : 502).json({ error: message });
    }
  });
  
  app.post("/api/intake", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const db = getDb();
      const dbUser = await db.select().from(users).where(eq(users.id, user.id)).then(rows => rows[0]);
      const currentPlan = dbUser?.subscriptionPlan || 'free';
      const userPlanSettings = await db.select().from(planSettings).where(eq(planSettings.planId, currentPlan)).then(rows => rows[0]);

      const config = userPlanSettings ? {
        openRouterApiKey: userPlanSettings.openRouterApiKey,
        allowedModels: userPlanSettings.allowedModels ? userPlanSettings.allowedModels.split(',').map(m => m.trim()).filter(Boolean) : undefined
      } : undefined;

      const body = req.body;

      // 1. Save intake lead to DB immediately
      if (body.companyName && body.contactEmail) {
        await db.insert(intakeLeads).values({
          userId: user.id,
          url: body.url || "unknown",
          companyName: body.companyName,
          contactEmail: body.contactEmail,
          goals: Array.isArray(body.goals) ? JSON.stringify(body.goals) : null,
          stack: Array.isArray(body.stack) ? JSON.stringify(body.stack) : null,
          teamSize: body.teamSize || null,
          notes: body.notes || null,
        });
      }

      // 2. Create pending audit record
      const insertedAudit = await db.insert(audits).values({
        url: body.url || "unknown",
        status: "pending",
        result: JSON.stringify({}),
        userId: user.id
      }).returning({ id: audits.id });

      const auditId = insertedAudit[0].id;

      try {
        const result = await generateAuditIntelligence(body, config);

        // 3. Update audit record upon success
        await db.update(audits).set({
          status: result.queued ? "pending" : "completed",
          result: JSON.stringify(result)
        }).where(eq(audits.id, auditId));

        res.status(result.queued ? 202 : 200).json(result);
      } catch (innerError: any) {
        // 4. Update audit record upon failure
        await db.update(audits).set({
          status: "failed",
          result: JSON.stringify({ error: innerError.message })
        }).where(eq(audits.id, auditId));
        throw innerError;
      }
    } catch (error: any) {
      const message = error.message;
      res.status(message === "INVALID_JSON_BODY" || message === "INVALID_AUDIT_PAYLOAD" || message === "UNSAFE_AUDIT_TARGET" || message === "AUDIT_TARGET_REDIRECT_LIMIT" ? 400 : 502).json({ error: message });
    }
  });

  // --- Live Execution Engine ---------------------------------------------

  // EventSource cannot send an Authorization header, so the live stream also
  // accepts the JWT via the `token` query parameter (falling back to header/cookie).
  const authenticateStream = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
    const token = queryToken || req.headers.authorization?.split(" ")[1] || req.cookies?.auth_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      (req as any).user = user;
      next();
    });
  };

  // Real-time scan log stream over Server-Sent Events.
  // Ensure your backend sets headers: Content-Type: text/event-stream
  app.get("/api/scan/stream", authenticateStream, async (req, res) => {
    const url = typeof req.query.url === "string" ? req.query.url : "";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // Disable proxy buffering so frames flush immediately (e.g. nginx).
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let counter = 0;
    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    const sendLog = (level: SSELogLevel, message: string) => {
      if (closed) return;
      const log = { id: `log-${Date.now()}-${counter++}`, timestamp: Date.now(), level, message };
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    };
    const sendPhase = (status: string) => {
      if (!closed) res.write(`event: phase\ndata: ${JSON.stringify({ status })}\n\n`);
    };
    const sendDone = (summary: LiveScanSummary | null) => {
      if (!closed) res.write(`event: done\ndata: ${JSON.stringify({ ok: true, summary })}\n\n`);
    };
    const sendFail = (message: string) => {
      if (!closed) res.write(`event: fail\ndata: ${JSON.stringify({ message })}\n\n`);
    };

    try {
      if (!url) {
        sendFail("missing_url");
        return res.end();
      }

      // ── Phase 1: scanning ──────────────────────────────────────────────
      // The EventSource `onopen` already transitions the client to "scanning".
      // We do NOT re-emit that phase here; instead we drive a single real
      // `collectDeterministicEvidence` call that fetches the HTML once and
      // extracts every signal we need for logging AND the score calculation.
      sendLog("info", `Connecting to target: ${url}`);
      sendLog("info", "Checking SSRF policy and resolving host…");

      const deterministic = await collectDeterministicEvidence({ url });
      if (closed) return res.end();

      const statusCode = deterministic.statusCode ?? 0;
      const responseTimeMs = deterministic.responseTimeMs ?? 0;
      const finalUrl = deterministic.finalUrl ?? url;

      sendLog(
        statusCode >= 400 ? "warn" : "success",
        `HTTP ${statusCode || "—"} · ${responseTimeMs} ms · ${deterministic.contentType ?? "unknown"}`,
      );
      if (finalUrl !== url) {
        sendLog("info", `Redirected → ${finalUrl}`);
      }

      if (deterministic.status === "failed" || !deterministic.document) {
        sendLog("warn", deterministic.error ?? "Target returned no parseable HTML body.");
        sendDone(null);
        return res.end();
      }

      const doc = deterministic.document;

      // Log document-level signals so the operator sees what the parser found.
      sendLog(doc.title ? "success" : "warn",
        `Title: ${doc.title ? `"${doc.title}"` : "missing"}`);
      sendLog(doc.metaDescription ? "success" : "warn",
        `Meta description: ${doc.metaDescription ? "present" : "missing"}`);
      sendLog(doc.canonical ? "success" : "warn",
        `Canonical: ${doc.canonical ?? "missing"}`);
      sendLog(doc.counts.h1 === 1 ? "success" : "warn",
        `H1 count: ${doc.counts.h1} ${doc.counts.h1 === 1 ? "✓" : "(expected 1)"}`);
      sendLog("info",
        `Assets — ${doc.counts.scripts} scripts · ${doc.counts.stylesheets} stylesheets · ${doc.counts.images} images`);
      if (doc.counts.imagesMissingAlt > 0) {
        sendLog("warn", `${doc.counts.imagesMissingAlt} image(s) missing alt text`);
      }
      if (doc.counts.structuredDataBlocks === 0) {
        sendLog("warn", "No structured data (JSON-LD) blocks detected");
      } else {
        sendLog("success", `Structured data: ${doc.counts.structuredDataBlocks} block(s)`);
      }

      // Deterministic warnings (slow response, missing fields, etc.)
      for (const warning of deterministic.warnings) {
        sendLog("warn", warning);
      }

      if (closed) return res.end();

      // Estimated DOM issue count from the parsed evidence (no extra fetch needed;
      // full snippets are served later by the /api/scan/dom-issues endpoint).
      const domIssueCount = estimateDomIssueCount(deterministic);
      if (domIssueCount === 0) {
        sendLog("success", "No critical DOM defects estimated from static analysis.");
      } else {
        sendLog("warn", `${domIssueCount} DOM defect(s) estimated — details available after stream.`);
      }

      // ── Phase 2: analyzing ────────────────────────────────────────────
      // Transition triggers the client-side Google PageSpeed fetch in parallel.
      sendPhase("analyzing");
      sendLog("info", "Lighthouse / PageSpeed measurement triggered in browser…");
      sendLog("info", "Launching browser evidence collector and architecture analyser…");

      const summary = await buildLiveScanSummaryFromDeterministic(deterministic, domIssueCount);
      if (closed) return res.end();

      if (summary) {
        sendLog("info",
          `Browser: ${summary.browserStatus} (${summary.browserMode})`);
        if (summary.routes.length > 1) {
          sendLog("info",
            `Crawled ${summary.routes.length} route(s) · avg ${summary.averageRouteResponseMs ?? "—"} ms`);
        }
        if (summary.warnings.length > 0) {
          sendLog("warn", `${summary.warnings.length} warning(s) collected from evidence`);
        }
        sendLog(
          summary.scores.overall >= 70 ? "success" : "warn",
          `Scores — overall: ${summary.scores.overall} · SEO: ${summary.scores.seo} · perf: ${summary.scores.performance} · arch: ${summary.scores.architecture}`,
        );
      } else {
        sendLog("warn", "Deep analysis unavailable — report charts will be limited.");
      }

      sendLog("success", "Stream complete. Summary ready.");
      sendDone(summary);
      res.end();
    } catch (error: any) {
      sendFail(error?.message || "scan_failed");
      res.end();
    }
  });

  // Backend HTML parser endpoint feeding the DOM Issue Inspector.
  app.get("/api/scan/dom-issues", authenticateToken, async (req, res) => {
    try {
      const url = typeof req.query.url === "string" ? req.query.url : "";
      if (!url) {
        return res.status(400).json({ error: "missing_url" });
      }
      const issues = await scanDomIssues(url);
      res.json(issues);
    } catch (error: any) {
      const message = error?.message;
      const isClientError = message === UNSAFE_AUDIT_TARGET_ERROR || message === AUDIT_TARGET_REDIRECT_LIMIT_ERROR;
      res.status(isClientError ? 400 : 502).json({ error: message || "dom_scan_failed" });
    }
  });

  // Real-user Core Web Vitals from the Chrome UX Report (field data + 6-month history).
  // Always 200 with { hasData } so the client can cleanly fall back to PageSpeed lab data.
  app.get("/api/scan/crux", authenticateToken, async (req, res) => {
    const url = typeof req.query.url === "string" ? req.query.url : "";
    if (!url) {
      return res.status(400).json({ error: "missing_url" });
    }
    const result = await fetchCruxReport(url);
    res.json(result);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
