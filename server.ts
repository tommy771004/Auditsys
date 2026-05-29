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
import { collectNetworkProbe } from "./src/Server/Services/networkProbeCollector";
import { analyzeNetworkBottlenecks } from "./src/Server/Services/networkBottleneckAnalyzer";
import { formatBottleneckReport } from "./src/Server/Services/networkReportFormatter";
import { fetchOpenRouterWithFallback } from "./src/Server/Services/openrouterHelper";
import type { LiveScanSummary } from "./src/types/liveAudit.types";
import type { PresentationMeasuredEvidence } from "./src/types/presentation";
import { assertSafeAuditTargetUrl, AUDIT_TARGET_REDIRECT_LIMIT_ERROR, canSelfServePlanChange, getRequiredJwtSecret, parseSubscriptionPlan, UNSAFE_AUDIT_TARGET_ERROR } from "./src/Server/Services/securityPolicies";
import { initDb, getDb } from "./src/db/index";
import { users, audits, planSettings, intakeLeads } from "./src/db/schema";
import { eq, desc, and } from "drizzle-orm";
// Removed unused import

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
        allowedModels: currentPlan === 'free' ? undefined : (userPlanSettings.allowedModels ? userPlanSettings.allowedModels.split(',').map(m => m.trim()).filter(Boolean) : undefined)
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
        allowedModels: currentPlan === 'free' ? undefined : (userPlanSettings.allowedModels ? userPlanSettings.allowedModels.split(',').map(m => m.trim()).filter(Boolean) : undefined)
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

      // ── Network Bottleneck Deep-Dive (fetch probe) ─────────────────────
      sendLog("info", "Running network bottleneck deep-dive…");
      try {
        const htmlResponse = await fetch(finalUrl, { headers: { Accept: "text/html" } });
        const html = (htmlResponse.headers.get("content-type") ?? "").includes("text/html")
          ? await htmlResponse.text()
          : "";
        if (html) {
          const networkEvidence = await collectNetworkProbe(html, finalUrl);
          const findings = analyzeNetworkBottlenecks(networkEvidence);
          for (const line of formatBottleneckReport(findings)) {
            if (closed) return res.end();
            sendLog(line.level, line.message);
          }
          if (networkEvidence.truncated) {
            sendLog("info", "資源數超過上限，僅分析前 40 個。");
          }
        } else {
          sendLog("warn", "無法取得 HTML 內容，略過網路瓶頸分析。");
        }
      } catch {
        sendLog("warn", "網路瓶頸分析失敗，串流繼續。");
      }
      if (closed) return res.end();

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

  // Audit Presentation Slide Deck Auditor - AI driven or offline fallback
  app.post("/api/audit/presentation", authenticateToken, async (req, res) => {
    const { url, techStack, knownIssues, auditSummary } = req.body;
    if (!url) {
      return res.status(400).json({ error: "missing_url" });
    }

    const host = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    })();

    const normalizedTechStack = techStack || "React 前端, Node.js BFF, Azure App Service";
    const normalizedIssues = knownIssues || "首頁載入較慢、API 延遲不穩定";
    const providedSummary = auditSummary ? `\n          - 真實稽核掃描數據: ${auditSummary}` : "";

    // Gather REAL measurements for the deck target before prompting/synthesizing.
    // CrUX gives real-user Core Web Vitals; a deterministic HTTP probe gives TTFB
    // and document signals. The SSRF guard runs first because we now fetch the target.
    let presentationEvidence: PresentationEvidence | null = null;
    if (looksLikeHttpUrl(url)) {
      try {
        presentationEvidence = await collectPresentationEvidence(url);
      } catch (evidenceError: any) {
        if (evidenceError?.message === UNSAFE_AUDIT_TARGET_ERROR) {
          return res.status(400).json({ error: UNSAFE_AUDIT_TARGET_ERROR });
        }
        console.error("Presentation evidence collection failed:", evidenceError?.message);
      }
    }
    const measuredEvidence = buildPresentationMeasuredEvidence(presentationEvidence);
    const measuredContext = buildMeasuredPromptContext(presentationEvidence);

    const user = (req as any).user;
    const db = getDb();
    const dbUser = await db.select().from(users).where(eq(users.id, user.id)).then(rows => rows[0]);
    const currentPlan = dbUser?.subscriptionPlan || 'free';
    const userPlanSettings = await db.select().from(planSettings).where(eq(planSettings.planId, currentPlan)).then(rows => rows[0]);

    const config = userPlanSettings ? {
      openRouterApiKey: userPlanSettings.openRouterApiKey,
      allowedModels: currentPlan === 'free' ? undefined : (userPlanSettings.allowedModels ? userPlanSettings.allowedModels.split(',').map(m => m.trim()).filter(Boolean) : undefined)
    } : undefined;

    const apiKey = config?.openRouterApiKey || process.env.OPENROUTER_API_KEY;

    if (apiKey) {
      try {
        const prompt = `
          你是 15 年資歷的頂尖雲端架構師 (Principal Cloud Architect) 與網頁效能稽核專家 (Expert Web Performance Auditor)。
          現正為客戶準備一份以「網頁效能與速度 (Performance and Speed)」為核心的「稽核簡報 (Audit Presentation)」。
          
          請針對以下網站、技術棧、已知痛點以及真實的稽核掃描數據進行深度效能稽核與分析，並輸出 5 個精確、可直接用於 Keynote/PowerPoint 簡報的投影片資料。
          目標受眾：包含 C-level 高階主管與技術負責人 (Engineering Lead)。你的分析不僅要精確解析底層前端與後端瓶頸，還要緊密連結至商業價值。

          【稽核環境與真實脈絡】
          - 目標網站或系統: ${url}
          - 現行技術棧: ${normalizedTechStack}
          - 已知痛點/主要效能瓶頸: ${normalizedIssues}${providedSummary}

          【格式與術語規則】
          1. 必須嚴格使用台灣繁體中文 (zh-TW)，以及台灣標準 IT 術語（例如：伺服器、專案、效能瓶頸、核心網頁指標、快取、資料庫、執行緒、前端、後端、延遲、寬頻、網路傳輸）。
          2. 不要使用任何簡體字、大陸用語（不要用性能、內存、分辨率、響應等，用效能、記憶體、解析度、回應替代）。
          3. 必須輸出一個合法的、乾淨的 JSON 物件，完全匹配以下指定的 JSON Schema。請不要用 markdown 的 \`\`\`json ... \`\`\` 來封裝 output，只輸出純 JSON 字串即可，否則將無法解析。
          4. 語氣必須具備絕對的商業權威性、客觀、分析嚴密。
          5. 數據真實性原則（最重要）：下方【實測數據】是本次伺服器端真實量測到的數值，凡有提供者必須直接採用，不得竄改。對於未量測到的面向（如後端 N+1、CDN 命中率、壓縮率等），允許依技術棧做專業推估，但必須在該指標的 comparison 欄位明確標註「估算」二字。嚴禁將推估值偽裝成實測值。

          【實測數據（伺服器端真實量測）】
          ${measuredContext}

          【JSON 格式定義與結構（以下 JSON 僅示範「欄位結構與型別」，當中所有數字皆為佔位範例，嚴禁照抄；請改用上方實測數據或專業推估填入）】
          {
            "url": "當前稽核的網址/系統名稱",
            "techStack": "當前使用的技術棧",
            "knownIssues": "分析的已知痛點",
            "generatedAt": "產生時間 ISO 格式",
            "overallScore": 65,  // 客觀評比的整體效能健康度分數 (1-100)
            "slides": [
              {
                "slideId": 1,
                "title": "高階主管摘要與商業影響",
                "subtitle": "Executive Summary & Business Impact",
                "healthStatus": "red", // red/yellow/green
                "bullets": [
                  "首頁/關鍵頁面載入過長直接導致使用者跳出率增加，損害核心業務轉換。",
                  "核心關鍵字網頁速度低於競爭對手，已面臨 Google 搜尋引擎 (SEO) 指標懲罰。",
                  "效能拖累客戶留存率，在手機端低頻網路環境下跳出率尤為嚴重。"
                ],
                "explanations": [
                  "目前載入速度過慢已造成實質使用者流失，估計影響每日訂單轉換率降幅達 15% 以上。",
                  "SEO 的核心網頁指標 (Core Web Vitals) 評級為 'Poor'，將導致自然流量下降，進而增加付費廣告獲客成本。",
                  "高延遲對手機端行動客戶體驗造成重大打擊，影響商業推廣轉換率。"
                ],
                "chartType": "conversion",
                "chartData": [
                  { "name": "1秒 (優)", "conversion": 4.5, "bounce": 18, "latency": 100 },
                  { "name": "2秒 (良)", "conversion": 3.8, "bounce": 25, "latency": 250 },
                  { "name": "3秒 (中)", "conversion": 2.5, "bounce": 38, "latency": 500 },
                  { "name": "4秒 (差)", "conversion": 1.2, "bounce": 55, "latency": 1000 },
                  { "name": "5秒 (極差)", "conversion": 0.4, "bounce": 72, "latency": 2000 }
                ],
                "metrics": [
                  { "label": "轉換率預期落差", "value": "-1.5%", "unit": "百分比", "comparison": "相較於優化後基準" },
                  { "label": "行動端跳出率增幅", "value": "+45%", "unit": "百分比", "comparison": "當前實測" },
                  { "label": "SEO 效能降權風險", "value": "高", "unit": "風險", "comparison": "Google 基準判定" }
                ],
                "technicalInsight": "前端資源阻塞與高延遲阻礙了 FCP 首繪，導致使用者在感知上認為頁面不可用。",
                "businessTakeaway": "必須馬上修復核心載入路徑，將首頁載入縮短至 2.5 秒內，預期可拉回 10-20% 的潛在跳出使用者並提振營收。"
              },
              {
                "slideId": 2,
                "title": "前端渲染與使用者體驗分析",
                "subtitle": "Frontend UX & Rendering Metrics",
                "healthStatus": "red",
                "bullets": [
                  "LCP (最大內容繪製) 偏高：主要是未經壓縮的大型英雄圖片與未優化的關鍵 CSS 導致頻寬堵塞。",
                  "INP (與下個繪製的互動) 過慢：主執行緒受阻於 JavaScript 巨大 Bundle 的下載與 hydration 解析開銷。",
                  "CLS (累計版面配置位移) 未達標：延遲載入的動態 Banner、圖片卡片未指派寬高，造成頁面跳動與誤觸可能性。"
                ],
                "explanations": [
                  "經查，未壓縮的 Web 資源阻塞了瀏覽器關鍵路徑。關鍵 CSS / JS 未及時內聯或延遲，延緩了 LCP 的繪製效率。",
                  "React 或 Vue 大型元件與第三方套件（如外部 Tracker、分析 SDK、廣告代碼）同步載入，高開銷的 Hydration 在單執行緒主執行緒 (Main Thread) 被嚴重占滿，導致使用者點擊無響應、觸發 INP 警報。",
                  "CSS Web Font 的切換未設置 font-display: swap 導致字型閃爍，且懶載入廣告元件未定義區塊高度，當渲染時導致頁面下推產生 CLS 佈局大幅跳動。"
                ],
                "chartType": "cvw",
                "chartData": [
                  { "name": "LCP 最大內容繪製", "current": 4.8, "good": 2.5, "label": "LCP (秒)" },
                  { "name": "INP 與下個繪製互動", "current": 420, "good": 200, "label": "INP (毫秒)" },
                  { "name": "CLS 累計版面配置位移", "current": 0.28, "good": 0.1, "label": "CLS (位移值)" }
                ],
                "metrics": [
                  { "label": "LCP 最長繪製", "value": "4.8", "unit": "秒", "comparison": "業界標竿：2.5秒內" },
                  { "label": "INP 互動延遲", "value": "420", "unit": "毫秒", "comparison": "業界標竿：200毫秒內" },
                  { "label": "CLS 佈局晃動", "value": "0.28", "unit": "數值", "comparison": "業界標竿：0.1以下" }
                ],
                "technicalInsight": "瀏覽器主執行緒忙於處理大量未經 Bundle 拆分的 JS，導致畫面在 3-4 秒內對於使用者輸入毫無回應。",
                "businessTakeaway": "前端應進行資源延遲加載並限制第三方指令碼，提供更平滑的首次渲染體驗以滿足行動裝置使用者的耐性。"
              },
              {
                "slideId": 3,
                "title": "後端、API 與資料層稽核",
                "subtitle": "Backend, API & Data Layer Analysis",
                "healthStatus": "yellow",
                "bullets": [
                  "API Payload 存在 Over-fetching：回傳不需要的深層關聯物件，導致資料序列化與網路傳輸卡頓。",
                  "資料庫連接延遲（DB Latency）：ORM 常見的 N+1 查詢問題與缺索引，導致單次複雜讀取耗時數秒。",
                  "JSON 序列化/反序列化處理開銷過高，伺服器 CPU 使用率瞬時飆高，嚴重拖慢 API 響應時間。"
                ],
                "explanations": [
                  "API 架構在資料篩選與分頁策略上未做限流，過度獲取無用欄位，使得 Payload 體積膨脹，在低頻行動網路下極易塞車。",
                  "關係型資料庫在核心關聯表缺乏適當的複合索引。在多表 Join 時，未優化的 SQL / ORM 常觸發 N+1 迴圈查詢，耗盡資料庫連接集 (Connection Pool)。",
                  "後端反序列化大型 payload 佔用大量主線程，且在多工連線湧入時造成記憶體高載與 CPU 限制瓶頸。"
                ],
                "chartType": "backend",
                "chartData": [
                  { "name": "資料庫/SQL 查詢", "current": 1600, "target": 150 },
                  { "name": "API 回傳序列化", "current": 800, "target": 80 },
                  { "name": "伺服器框架開銷", "current": 400, "target": 40 },
                  { "name": "API 網路在途傳輸", "current": 600, "target": 180 }
                ],
                "metrics": [
                  { "label": "資料庫 N+1 查詢", "value": "有", "unit": "狀態", "comparison": "需要批次與 Select 剪裁" },
                  { "label": "API 平均回傳體積", "value": "2.1", "unit": "MB", "comparison": "業界建議小於 200KB" },
                  { "label": "DB 關聯索引狀態", "value": "不完整", "unit": "狀態", "comparison": "需要覆蓋索引（Covering Index）" }
                ],
                "technicalInsight": "後端缺乏嚴格的 DTO（資料傳輸物件）裁剪與分頁處理，讓不合比例的巨量 JSON 常態性在網路與記憶體間搬移。",
                "businessTakeaway": "剪裁 API 介面並引入多層次快取，可降低後端運算資源損耗 50% 以上，並避免瞬時高流量造成的伺服器崩潰。"
              },
              {
                "slideId": 4,
                "title": "基礎基礎架構與網路傳輸優化",
                "subtitle": "Infrastructure & Distribution Network",
                "healthStatus": "yellow",
                "bullets": [
                  "CDN 快取邊緣命中率 (Cache Hit Rate) 偏低：不適當的 Cache-Control 標頭導致靜態資源經常回源讀取。",
                  "網路傳輸協定未完全升級：TLS 交握開銷大，且缺乏對 HTTP/3 或 HTTP/2 頻寬多路複用的完整支援。",
                  "過時的檔案壓縮策略：靜態資源仍在使用 Gzip 或者是未經過壓縮的裸檔，而非效率更高的 Brotli。"
                ],
                "explanations": [
                  "分析發現，靜態檔案如 JS, CSS, 圖示與英雄圖片的 URL 缺少唯一的 Hash 版本號，導致快取時間設得太保守，使得 CDN 無法長效保存，造成伺服器源站 (Origin) 每天承受龐大流量與不必要頻寬耗損。",
                  "當前仍有部分 API 行經舊版 HTTP/1.1，導致瀏覽器受限於「最大連線數 6」的 TCP 連線限制，產生連線阻塞 (Head-of-Line Blocking)；同時，憑證 TLS 交握多次往返，造成昂貴的傳輸 RTT 開銷。",
                  "伺服器未啟用動態 Brotli 壓縮 (Level 5-11)，目前 50MB 的未壓縮 Bundle 透過基礎 Gzip 壓縮仍高達 8MB，若改用 Brotli 可再節省額外 30% 以上的寬頻頻寬。"
                ],
                "chartType": "network",
                "chartData": [
                  { "name": "CDN 邊緣命中", "value": 25, "label": "HIT" },
                  { "name": "CDN 穿透回源", "value": 55, "label": "MISS" },
                  { "name": "CDN 直接繞過", "value": 20, "label": "BYPASS" }
                ],
                "metrics": [
                  { "label": "網頁傳輸壓縮率", "value": "Gzip (約 45%)", "unit": "等級", "comparison": "建議採用 Brotli (可達 70%)" },
                  { "label": "CDN 邊緣命中率", "value": "25%", "unit": "命中率", "comparison": "業界優秀基準為 85% 以上" },
                  { "label": "HTTP 傳輸協定", "value": "HTTP/1.1 部分", "unit": "協定", "comparison": "強烈建議全面升級 HTTP/2 & 3" }
                ],
                "technicalInsight": "伺服器未針對資產做高強度快取標頭配置，且協定多路複用受阻，導致瀏覽器下載資產時呈現嚴重的瀑布流排隊遲滯。",
                "businessTakeaway": "透過精確的 CDN 快取的部署，原站流量與主機伺服器頻寬費至少可縮減 60%，顯著降低基礎設施維運成本。"
              },
              {
                "slideId": 5,
                "title": "效能優化分級修復戰略",
                "subtitle": "Graded Action Plan",
                "healthStatus": "green",
                "bullets": [
                  "黃金 48 小時短期速效戰 (Quick Wins)：藉由 Cloudflare/CDN 邊緣調整、開啟 Brotli、快取標頭重設與圖片 WebP 化，快速降低 LCP 首繪數秒。",
                  "中期敏捷優化戰 (1-2 Sprints)：進行 API 欄位剪裁 (Payload Shaving)、導入批次查詢解決 N+1 問題、為核心資料庫索引覆蓋，並置入 Redis 記憶體快取。",
                  "長期架構蛻變 (Structural Changes)：推動系統解耦、重要業務轉為靜態 SSR / ISR（增量靜態生成），並利用 Edge Computing 邊緣端本地快取分發。"
                ],
                "explanations": [
                  "短期方案不需要修改核心代碼：第一步透過圖片自動化處理轉成現代 WebP / AVIF 格式，第二步是在 CDN 端調整 TTL 與開啟壓縮，即可在一兩天內達成 30-50% 效能升級排版。",
                  "中期需要 1-2 週開發：透過 ORM 優化（如 Drizzle / Entity Framework 預加載）來消滅 N+1 查詢，並利用 DTO 切割，將原先數 MB 的 API JSON Payload 縮減至幾十 KB，並對熱點 Endpoint 加入 Redis 快取層。",
                  "長期進行系統漸進式變革：將高流量展示型頁面改採 Next.js/Remix 的 SSR/SSG，將運算直接下放到 Edge 雲伺服器邊緣端，藉此全面消除冷啟動延遲並提供極致的高可用性效能。"
                ],
                "chartType": "action",
                "chartData": [
                  { "name": "短期 48小時 QuickWins", "impact": 85, "effort": 20, "priority": "最高" },
                  { "name": "中期 1-2 Sprints", "impact": 90, "effort": 50, "priority": "高" },
                  { "name": "長期 結構架構調整", "impact": 95, "effort": 85, "priority": "中" }
                ],
                "metrics": [
                  { "label": "短期速效成效預估", "value": "FCP 提升 -40%", "unit": "秒數減少", "comparison": "首重 CDN 快取與圖片壓縮" },
                  { "label": "中期快取優化成效", "value": "API 延遲 -80%", "unit": "響應提速", "comparison": "首重 Redis 與 N+1 優化" },
                  { "label": "長期架構重塑目標", "value": "伺服器負載 -70%", "unit": "資源節省", "comparison": "首重 SSR / ISR 與 邊緣計算" }
                ],
                "technicalInsight": "修復順序應當是「先邊緣部署、再後端局部改進、最後核心架構解耦」，如此才能兼顧工程進度與商業回報率 (ROI)。",
                "businessTakeaway": "立即啟動『黃金 48 小時短期速效戰』可協助行銷與業務部門挽救高達七成的行動端流失客戶，帶來立竿見影的商業收益。"
              }
            ]
          }

          請嚴格根據你對這項技術棧 ${normalizedTechStack} 和這項已知痛點 ${normalizedIssues} 的理解進行客觀的、硬核的架構推理解析，並在 bullets、explanations、metrics 以及 chartData 中體現對應技術名詞與實踐（例如若是 .NET 8, 提及 LINQ 延遲或 EF Core、SQL Clustered Index, Kestrel 執行緒；若是 React 或者是其他，提及相對應的技術）。核心網頁指標（LCP/INP/CLS）若上方實測數據有提供，務必直接採用其數值與評級；未量測者標註「估算」。僅返回純 JSON。
        `;

          const response = await fetchOpenRouterWithFallback(apiKey, prompt, config?.allowedModels);

          const textResponse = response.text;
          if (textResponse) {
            let cleanText = textResponse.trim().replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "");
            const parsed = JSON.parse(cleanText);
            parsed.modelUsed = response.model;
            parsed.measuredEvidence = measuredEvidence;
            return res.json(parsed);
          }
      } catch (openRouterError: any) {
        console.error("OpenRouter API call failed, falling back to smart client generator:", openRouterError);
      }
    }

    // Comprehensive Fallback generator — uses real measurements where available.
    const fallbackData = generateSmartPresentationFallback(url, normalizedTechStack, normalizedIssues, presentationEvidence, measuredEvidence);
    return res.json(fallbackData);
  });

  function generateSmartPresentationFallback(url: string, techStack: string, knownIssues: string, evidence: PresentationEvidence | null, measuredEvidence: PresentationMeasuredEvidence) {
    const isNestDotNet = techStack.toLowerCase().includes(".net") || techStack.toLowerCase().includes("c#") || techStack.toLowerCase().includes("sql server");
    const isReact = techStack.toLowerCase().includes("react") || techStack.toLowerCase().includes("next.js") || techStack.toLowerCase().includes("nextjs");
    const isVercel = techStack.toLowerCase().includes("vercel") || techStack.toLowerCase().includes("azure");

    // Real-user Core Web Vitals from CrUX, when available. null = not measured → labelled "估算".
    const crux = evidence?.crux?.hasData ? evidence.crux : null;
    const realLcpSec = crux?.metrics.lcp.p75 != null ? Number((crux.metrics.lcp.p75 / 1000).toFixed(2)) : null;
    const realInpMs = crux?.metrics.inp.p75 != null ? Math.round(crux.metrics.inp.p75) : null;
    const realCls = crux?.metrics.cls.p75 != null ? Number(crux.metrics.cls.p75.toFixed(3)) : null;
    const ratingToScore = (rating: string | null | undefined): number | null =>
      rating === "good" ? 88 : rating === "needs-improvement" ? 68 : rating === "poor" ? 44 : null;
    const cwvRatingScores = crux
      ? [crux.metrics.lcp.rating, crux.metrics.inp.rating, crux.metrics.cls.rating].map(ratingToScore).filter((v): v is number => v != null)
      : [];
    const cwvHealth = (rating: string | null | undefined): "red" | "yellow" | "green" =>
      rating === "good" ? "green" : rating === "needs-improvement" ? "yellow" : rating === "poor" ? "red" : "red";
    const worstCwvRating = crux
      ? ([crux.metrics.lcp.rating, crux.metrics.inp.rating, crux.metrics.cls.rating].includes("poor")
          ? "poor"
          : [crux.metrics.lcp.rating, crux.metrics.inp.rating, crux.metrics.cls.rating].includes("needs-improvement")
            ? "needs-improvement"
            : "good")
      : null;
    const estTag = "（估算，無 CrUX 實測）";

    // Score: derive from real CWV ratings when measured, otherwise the heuristic estimate.
    const score = cwvRatingScores.length > 0
      ? Math.round(cwvRatingScores.reduce((a, b) => a + b, 0) / cwvRatingScores.length)
      : (knownIssues.length > 50 ? 56 : 64);

    const slides = [
      {
        slideId: 1,
        title: "高階主管摘要與商業影響",
        subtitle: "Executive Summary & Business Impact",
        healthStatus: score < 60 ? "red" : "yellow",
        bullets: [
          `針對評估系統「${url}」之效能審查，目前因為「${knownIssues.substring(0, 45)}」等瓶頸，已對關鍵業務目標造成重大阻礙。`,
          "頁面載入速度每延遲 1 秒，使用者轉換漏斗流失率也按比例攀升，特別嚴重壓抑開戶、結帳與註冊事件。",
          isReact ? "前端 JavaScript 資源包體積膨脹，在高延遲行動網路下引發嚴重的首次載入白屏問題。" : "前端由於阻塞腳本及載入瀑布流未優化，已阻礙搜尋引擎自然流量，增加付費廣告之獲客成本。"
        ],
        explanations: [
          `經過深度效能稽核，目前 ${url} 在主流裝置的加載評級落入警告空間（健康得分為 ${score}/100）。`,
          "當網頁載入時間超過 4 秒，使用者跳出率通常會比 1.5 秒網頁增加 60% 以上；當前過高的回應延遲已大幅拉低推廣預算的獲客報酬率 (ROI)。",
          "Google 已將 Core Web Vitals 納入 SEO 的強制排名考量。不達標的指標正在拖累自然成長流量，流失潛在商業機會。"
        ],
        chartType: "conversion",
        chartData: [
          { name: "1秒 (優)", conversion: 4.8, bounce: 15, latency: 120 },
          { name: "2秒 (良)", conversion: 4.1, bounce: 22, latency: 260 },
          { name: "3秒 (中)", conversion: 2.8, bounce: 36, latency: 510 },
          { name: "4秒 (差)", conversion: 1.4, bounce: 52, latency: 1100 },
          { name: "5秒 (極差)", conversion: 0.5, bounce: 75, latency: 2200 }
        ],
        metrics: [
          { label: "轉換率預期落差", value: `${score < 60 ? "-2.2%" : "-1.4%"}`, unit: "百分比", comparison: "相較於優秀效能標準" },
          { label: "行動端跳出率增幅", value: "+45%", unit: "百分比", comparison: "當前實測估值" },
          { label: "SEO 自然流量降權", value: "中高度風險", unit: "風險", comparison: "核心網頁指標基準" }
        ],
        technicalInsight: `使用「${techStack}」架構架設的系統，效能瓶頸在首字下載延遲 (TTFB) 與首繪時間 (FCP) 上拖累了整體互動性。`,
        businessTakeaway: "必須立刻展開短期與中期修復戰略，將核心頁面載入時間限縮至 2.5 秒以內，以拉回 15-20% 的跳出客群、提高付費轉換收益。"
      },
      {
        slideId: 2,
        title: "前端渲染與使用者體驗分析",
        subtitle: "Frontend UX & Rendering Metrics",
        healthStatus: crux ? cwvHealth(worstCwvRating) : "red",
        bullets: [
          crux
            ? `LCP (最大內容繪製) 實測 ${realLcpSec ?? "無數據"} 秒，CrUX 評級「${crux.metrics.lcp.rating ?? "無"}」。${(realLcpSec ?? 0) > 2.5 ? "高於 Google 綠色基準 2.5 秒，最大視覺區塊首屏載入受阻。" : "已達 Google 綠色基準。"}`
            : (isReact ? "LCP (最大內容繪製) 偏高：主 Bundle 包缺乏 Code-Splitting 分割，使最大視覺區塊首屏載入受阻。" : "LCP 指標偏低：大量關鍵渲染 CSS 與非優先腳本阻塞了瀏覽器的主渲染線索。"),
          crux
            ? `INP (與下個繪製互動) 實測 ${realInpMs ?? "無數據"} 毫秒，CrUX 評級「${crux.metrics.inp.rating ?? "無"}」。${(realInpMs ?? 0) > 200 ? "主執行緒受 JavaScript Hydration 鎖止，使用者輸入有延遲。" : "互動回應已達標。"}`
            : "INP (與下個繪製互動) 偏高：主線程在 Hydration 過程中被大型 JavaScript 元件樹的初始化解析鎖止，造成使用者輸入卡頓。",
          crux
            ? `CLS (累計版面配置位移) 實測 ${realCls ?? "無數據"}，CrUX 評級「${crux.metrics.cls.rating ?? "無"}」。${(realCls ?? 0) > 0.1 ? "動態資產缺少版面尺寸定義，造成版面晃動。" : "版面穩定度達標。"}`
            : "CLS (累計版面配置位移) 風險存在：缺少明確版面尺寸定義的動態資產（如 Banner 廣告、客製字型）造成版面晃動。"
        ],
        explanations: [
          crux
            ? `以上 LCP / INP / CLS 為 Chrome UX Report 真實使用者欄位數據（${crux.scope === "origin" ? "網站整體範圍" : "此網址範圍"}${crux.collectionPeriod ? `，採集期間 ${crux.collectionPeriod}` : ""}），代表實際使用者在真實裝置與網路下的體驗。`
            : "（注意：此目標無 CrUX 真實使用者欄位數據，以下 CWV 數值為基於技術棧的估算，僅供示意。）",
          isReact ? "React 應用載入時常伴隨巨量主 Bundle 包（如第三方分析、過時 Library），在行動端 CPU 弱裝置上往往耗費數秒載入並解析。" : "CSS Web Font 未配置 font-display: swap 導致字體載入前半白屏；多個外部 JavaScript 同步下載阻塞了瀏覽器的第一次繪製效率。",
          "在載入過程中，廣告版面或圖片完成加載後無預警伸展推下原有排版，在手機觸控上極易造成使用者誤觸，屬於嚴重的體驗與轉換硬傷。"
        ],
        chartType: "cvw",
        chartData: [
          { name: "LCP 最大內容繪製", current: realLcpSec ?? 4.6, good: 2.5, label: "LCP (秒)" },
          { name: "INP 與下個繪製互動", current: realInpMs ?? 450, good: 200, label: "INP (毫秒)" },
          { name: "CLS 累計版面配置位移", current: realCls ?? 0.25, good: 0.1, label: "CLS (位移值)" }
        ],
        metrics: [
          { label: "LCP 最大內容繪製", value: realLcpSec != null ? String(realLcpSec) : "4.6", unit: "秒", comparison: realLcpSec != null ? `CrUX 實測 · Google 綠色基準：2.5秒內` : `Google 綠色基準：2.5秒內 ${estTag}` },
          { label: "INP 互動響應延遲", value: realInpMs != null ? String(realInpMs) : "450", unit: "毫秒", comparison: realInpMs != null ? `CrUX 實測 · Google 綠色基準：200毫秒內` : `Google 綠色基準：200毫秒內 ${estTag}` },
          { label: "CLS 累計佈局位移", value: realCls != null ? String(realCls) : "0.25", unit: "位移值", comparison: realCls != null ? `CrUX 實測 · Google 綠色基準：0.1以下` : `Google 綠色基準：0.1以下 ${estTag}` }
        ],
        technicalInsight: "必須引進現代代碼拆分、延遲載入非核心 JS、內聯核心路徑 CSS，以及指定排版圖片的寬高，以改善三項 CWV。",
        businessTakeaway: "將 Core Web Vitals 優化至綠色安全值後，轉換率平均可提高 11% 以上，並全面改善行動裝置的使用流暢滿意度。"
      },
      {
        slideId: 3,
        title: "後端、API 與資料層稽核",
        subtitle: "Backend, API & Data Layer Analysis",
        healthStatus: "yellow",
        bullets: [
          isNestDotNet ? "Entity Framework ORM 在處理深關聯物件時觸發潛在 N+1 查詢，後端累計多次資料庫查詢往返造成的高延遲。" : "後端 ORM 架構在資料庫關聯表撈取時缺乏 SQL 優化，引發巢狀迴圈查詢問題（N+1），使連線池高載阻滯。",
          "API 缺乏 DTO 專用傳輸剪裁，過度過載推送了整個深度物件 tree 至前端，引發序列化/反序列化和傳輸高開銷。",
          "高流量或高耗能查詢 API 缺乏合適的快取或預加載設計，造成後端伺服器在尖峰連線時 CPU 使用率劇增卡死。"
        ],
        explanations: [
          isNestDotNet ? "在 .NET 8 使用 EF Core 若不謹慎，單個 API 就會重複呼叫 Kestrel 與 SQL Server 進行多次往返小 query，阻礙並發能力。" : "對大型表單進行過載查詢，且在關聯表字段缺乏關聯複合索引、或者存在全表掃描的情形下，使後端響應動輒拖延 1.5 秒以上。",
          "未剪裁的巨大 JSON payload 動輒數百 KB 甚至數 MB，不僅佔用行動頻寬，也增加了客戶端 JavaScript 的記憶體垃圾回收 (GC) 停頓。",
          "未針對靜態多讀、少寫端點引錄快取，使每一次重複的數據讀取皆重打底層資料庫，增加伺服器源站耗費與當機機率。"
        ],
        chartType: "backend",
        chartData: [
          { name: "資料庫 N+1 查詢", current: 1500, target: 120 },
          { name: "JSON 反序列開銷", current: 550, target: 40 },
          { name: "API 框架處理層", current: 250, target: 30 },
          { name: "API 網路下載延遲", current: 400, target: 150 }
        ],
        metrics: [
          { label: "資料 N+1 慢查詢", value: "偵測到預期瓶頸", unit: "警示", comparison: "亟需以 Join/Select 裁剪改進（模型推估）" },
          { label: "API payload 體積", value: "2.5", unit: "MB", comparison: "業界高標準：200KB 內（模型推估）" },
          { label: "後端快取配置", value: "目前無有效快取", unit: "狀態", comparison: "必須置入記憶體快取或預加載（模型推估）" }
        ],
        technicalInsight: `「${techStack}」之後端需要實施 DTO 全面裁剪與 SQL 集群預加載，杜絕多餘的關聯樹序列化和無謂內存浪費。`,
        businessTakeaway: "解決資料層慢查詢與引入 Redis 快取後，API 的回應速度普遍可提振 80%，不僅節省 65% 源伺服器開銷，更消除了高流量當機威脅。"
      },
      {
        slideId: 4,
        title: "基礎基礎架構與網路傳輸優化",
        subtitle: "Infrastructure & Distribution Network",
        healthStatus: "yellow",
        bullets: [
          "CDN (如 Cloudflare, Azure, AWS) 快取規則配置較保守，靜態資產命中率 (Cache Hit Rate) 下滑至 25% 以下，起不到邊緣防護作用。",
          "傳輸壓縮尚未完全升級，仍依賴舊式 Gzip 甚至是無壓縮，錯失了可以再縮小 ~30% 檔案尺寸之 Brotli 壓縮。",
          "API 交握與資源傳輸尚未完全普及 HTTP/2 或 HTTP/3 多路複用，受到傳統單一連線限制，阻塞在排隊階段。"
        ],
        explanations: [
          `分析指出目前靜態打包檔案 URL 未實施雜湊的版本控管（Immutable Hash Identifier），無法設定長效 edge caching，拖累了 CDN 本身應有的加速效果。`,
          "與高強度 Brotli 動態壓縮相比，無壓縮或單純 Gzip 使得客戶端被迫下載更多的 byte 數，這在不穩定的行動頻寬環境中特別致命。",
          "在舊版連線協定中，多路複用（Multiplexing）缺失，任何大 asset 的下載皆會遲滯後續 CSS 與 API 請求。全面實施 HTTP/2 和 HTTP/3 為當務之急。"
        ],
        chartType: "network",
        chartData: [
          { name: "CDN 快取命中", value: 25, label: "HIT" },
          { name: "CDN 穿透回源", value: 55, label: "MISS" },
          { name: "CDN 繞過 Bypass", value: 20, label: "BYPASS" }
        ],
        metrics: [
          { label: "CDN 快取命中率", value: "25%", unit: "百分比", comparison: "業界優良目標：80%以上（模型推估）" },
          { label: "靜態與 API 壓縮力", value: "限制普通 Gzip", unit: "狀態", comparison: "建議更換為 Brotli 極致壓縮（模型推估）" },
          { label: "連線協定", value: "HTTP/1.1 混雜", unit: "協定", comparison: "極佳推薦升級 HTTP/2 ＆ HTTP/3（模型推估）" }
        ],
        technicalInsight: "為部署資產加上永恆快取 Hash，並更換為動態 Brotli 壓縮（壓縮比高 30% 級別），是解決傳輸瀑布死鎖的不二法則。",
        businessTakeaway: "優化 CDN 快取命中率至 85% 後，除了大幅減輕伺服器原站頻寬費用負擔，還能在高流量促銷時確保全網極速加載不塞車。"
      },
      {
        slideId: 5,
        title: "效能優化分級修復戰略",
        subtitle: "Graded Action Plan",
        healthStatus: "green",
        bullets: [
          "黃金 48 小時短期速效戰 (Quick Wins)：在 CDN 邊緣設定高強度 Max-Age 快取規則、開啟自動 Brotli、對首屏核心圖片實施 WebP/AVIF 輕量化轉換、避免 LCP 繪製延宕。",
          "中期敏捷優化戰 (1-2 Sprints)：消滅 ORM 的多層慢 SQL N+1 查詢問題、增加關聯複合索引、並實施後端快取 (如 Redis/Local Cache) 機制、精簡 API 回傳 Payload。",
          "長期架構蛻變 (Structural Changes)：進行架構解耦、引入 SSR 服務端渲染或 ISR，或者把熱點運算邏輯部署至 Serverless CDN Edge Computing，提供極致流暢的首字 TTFB 時間。"
        ],
        explanations: [
          "短期速效修正可在無需更動任何後端商業邏輯下快速上工，極速提升客戶首頁的最大內容核心指標。",
          "中期敏捷優化針對數據庫性能瓶頸做精準手術，解決 N+1 並配合 API JSON 資料裁剪與後端快取，讓 API 支持高併發。",
          "長期架構改造則重塑前、後端耦合結構，全面引進 Edge 本地邊緣分發快取機制與靜態渲染模式，徹底消除高負載引起的卡死瓶頸。"
        ],
        chartType: "action",
        chartData: [
          { name: "短期 48小時 QuickWins", impact: 85, effort: 15, priority: "最高" },
          { name: "中期 1-2 Sprints", impact: 92, effort: 45, priority: "高" },
          { name: "長期 結構架構調整", impact: 95, effort: 80, priority: "中" }
        ],
        metrics: [
          { label: "短期速效成效", value: "LCP 縮減 ~1.5秒", unit: "加載提速", comparison: "CDN 快取與核心 CSS CSS 內聯" },
          { label: "中期 API 優化", value: "API 延遲縮減 ~80%", unit: "響應提速", comparison: "Redis 快取、SQL 索引與 N+1 修正" },
          { label: "長期架構重塑", value: "主機負荷預期 -65%", unit: "資源節省", comparison: "網頁靜態渲染與邊緣 Edge 端分發" }
        ],
        technicalInsight: "遵循「先邊緣部署、再後端代碼微改進、最後核心架構解耦」之戰略，能在最低開發成本與磨擦下獲取最高能效產出比。",
        businessTakeaway: "立即發動「黃金 48 小時短期速效戰」能幫助非工程團隊（如行銷、產品主管）快速感受到核心加載提升，挽回大流量流失客戶、拉高行銷預算回報率 (ROI)。"
      }
    ];

    return {
      url,
      techStack,
      knownIssues,
      generatedAt: new Date().toISOString(),
      overallScore: score,
      slides,
      modelUsed: crux ? "Offline Fallback Generator (CrUX-grounded)" : "Offline Fallback Generator",
      measuredEvidence,
    };
  }

  // --- Presentation evidence collection (real measurements for the deck) ---
  type PresentationEvidence = {
    deterministic: Awaited<ReturnType<typeof collectDeterministicEvidence>> | null;
    crux: Awaited<ReturnType<typeof fetchCruxReport>> | null;
  };

  function looksLikeHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function collectPresentationEvidence(targetUrl: string): Promise<PresentationEvidence> {
    // SSRF guard FIRST — we are about to fetch the target server-side. Throws
    // UNSAFE_AUDIT_TARGET_ERROR on private/reserved/credentialed/non-http targets.
    await assertSafeAuditTargetUrl(targetUrl);
    const [deterministic, crux] = await Promise.all([
      collectDeterministicEvidence({ url: targetUrl }).catch((err: any) => {
        console.error("Presentation deterministic probe failed:", err?.message);
        return null;
      }),
      fetchCruxReport(targetUrl).catch((err: any) => {
        console.error("Presentation CrUX fetch failed:", err?.message);
        return null;
      }),
    ]);
    return { deterministic, crux };
  }

  function buildPresentationMeasuredEvidence(evidence: PresentationEvidence | null): PresentationMeasuredEvidence {
    const crux = evidence?.crux?.hasData ? evidence.crux : null;
    const det = evidence?.deterministic ?? null;
    const note = crux
      ? `核心網頁指標 (LCP/INP/CLS) 來自 Chrome UX Report 真實使用者欄位數據${crux.scope === "origin" ? "（網站整體範圍）" : "（此網址範圍）"}${crux.collectionPeriod ? `，採集期間 ${crux.collectionPeriod}` : ""}。後端、資料層與基礎架構等無法遠端量測的項目為模型推估。`
      : `此目標無 CrUX 真實使用者欄位數據；所有效能數值均為基於技術棧與已知痛點的模型推估，僅供示意。`;
    return {
      source: crux ? "crux" : "modeled",
      crux: crux
        ? {
            hasData: true,
            scope: crux.scope,
            collectionPeriod: crux.collectionPeriod,
            lcp: { p75: crux.metrics.lcp.p75, rating: crux.metrics.lcp.rating },
            inp: { p75: crux.metrics.inp.p75, rating: crux.metrics.inp.rating },
            cls: { p75: crux.metrics.cls.p75, rating: crux.metrics.cls.rating },
          }
        : null,
      responseTimeMs: det?.responseTimeMs ?? null,
      server: det?.headers?.server ?? null,
      note,
    };
  }

  function buildMeasuredPromptContext(evidence: PresentationEvidence | null): string {
    if (!evidence) {
      return "（本次未取得任何伺服器端實測數據，請完全依據技術棧與已知痛點進行嚴謹推理，並在所有 metrics 的 comparison 欄位明確標註「估算」。）";
    }
    const lines: string[] = [];
    const crux = evidence.crux?.hasData ? evidence.crux : null;
    if (crux) {
      lines.push(`核心網頁指標 (Chrome UX Report${crux.scope === "origin" ? "，網站整體" : "，此網址"}${crux.collectionPeriod ? `，${crux.collectionPeriod}` : ""}):`);
      lines.push(`- LCP p75: ${crux.metrics.lcp.p75 == null ? "無數據" : `${(crux.metrics.lcp.p75 / 1000).toFixed(2)} 秒`}（評級 ${crux.metrics.lcp.rating ?? "無"}）`);
      lines.push(`- INP p75: ${crux.metrics.inp.p75 == null ? "無數據" : `${Math.round(crux.metrics.inp.p75)} 毫秒`}（評級 ${crux.metrics.inp.rating ?? "無"}）`);
      lines.push(`- CLS p75: ${crux.metrics.cls.p75 == null ? "無數據" : crux.metrics.cls.p75.toFixed(3)}（評級 ${crux.metrics.cls.rating ?? "無"}）`);
    } else {
      lines.push("核心網頁指標：此目標無 CrUX 真實使用者欄位數據；LCP/INP/CLS 必須標註為估算。");
    }
    const det = evidence.deterministic;
    if (det) {
      const probe: string[] = [];
      if (det.responseTimeMs != null) probe.push(`首次回應時間（近似 TTFB）${det.responseTimeMs} 毫秒`);
      if (det.statusCode != null) probe.push(`HTTP 狀態碼 ${det.statusCode}`);
      if (det.headers?.server) probe.push(`Server 標頭「${det.headers.server}」`);
      if (det.headers?.cacheControl) probe.push(`Cache-Control「${det.headers.cacheControl}」`);
      if (det.document?.counts) {
        const c = det.document.counts;
        probe.push(`文件資產：腳本 ${c.scripts}、樣式表 ${c.stylesheets}、圖片 ${c.images}（缺 alt ${c.imagesMissingAlt}）`);
      }
      if (probe.length > 0) {
        lines.push("伺服器端單次 HTTP 探測:");
        probe.forEach((entry) => lines.push(`- ${entry}`));
      }
    }
    return lines.length > 0 ? lines.join("\n") : "（無可用實測數據。）";
  }

  // Sitemap Generator
  app.get("/sitemap.xml", (req, res) => {
    try {
      const baseUrl = process.env.VITE_CLIENT_URL || `https://${req.get("host")}`;
      const routes = ["home", "pricing", "report", "intake", "console", "live", "campaign", "presentation"];
      
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${baseUrl}/#${route}</loc>
    <changefreq>daily</changefreq>
    <priority>${route === 'home' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (e: any) {
      console.error("Sitemap generation error:", e);
      res.status(500).end();
    }
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
