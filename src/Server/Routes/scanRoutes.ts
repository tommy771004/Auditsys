import { Router } from "express";
import {
  buildLiveScanSummaryFromDeterministic,
  estimateDomIssueCount,
  scanDomIssues,
  type SSELogLevel,
} from "../Services/liveScanCollector";
import { collectDeterministicEvidence } from "../Services/deterministicCollector";
import { fetchCruxReport } from "../Services/cruxCollector";
import { issueStreamToken, authenticateToken, authenticateStream } from "../Middleware/authMiddleware";
import { mapErrorToResponse } from "../Middleware/errorMiddleware";
import type { LiveScanSummary } from "../../types/liveAudit.types";

export const scanRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/scan/stream-token
// Issues a 30-second one-time stream token for the SSE endpoint.
// ---------------------------------------------------------------------------
scanRouter.get("/stream-token", authenticateToken, (req, res) => {
  const result = issueStreamToken(req.user!);
  res.json(result);
});

// ---------------------------------------------------------------------------
// GET /api/scan/stream  — real-time scan log stream over Server-Sent Events
// ---------------------------------------------------------------------------
scanRouter.get("/stream", authenticateStream, async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url : "";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
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

    sendLog(doc.title ? "success" : "warn", `Title: ${doc.title ? `"${doc.title}"` : "missing"}`);
    sendLog(doc.metaDescription ? "success" : "warn", `Meta description: ${doc.metaDescription ? "present" : "missing"}`);
    sendLog(doc.canonical ? "success" : "warn", `Canonical: ${doc.canonical ?? "missing"}`);
    sendLog(doc.counts.h1 === 1 ? "success" : "warn", `H1 count: ${doc.counts.h1} ${doc.counts.h1 === 1 ? "✓" : "(expected 1)"}`);
    sendLog("info", `Assets — ${doc.counts.scripts} scripts · ${doc.counts.stylesheets} stylesheets · ${doc.counts.images} images`);
    if (doc.counts.imagesMissingAlt > 0) {
      sendLog("warn", `${doc.counts.imagesMissingAlt} image(s) missing alt text`);
    }
    if (doc.counts.structuredDataBlocks === 0) {
      sendLog("warn", "No structured data (JSON-LD) blocks detected");
    } else {
      sendLog("success", `Structured data: ${doc.counts.structuredDataBlocks} block(s)`);
    }

    for (const warning of deterministic.warnings) {
      sendLog("warn", warning);
    }

    if (closed) return res.end();

    const domIssueCount = estimateDomIssueCount(deterministic);
    if (domIssueCount === 0) {
      sendLog("success", "No critical DOM defects estimated from static analysis.");
    } else {
      sendLog("warn", `${domIssueCount} DOM defect(s) estimated — details available after stream.`);
    }

    // ── Phase 2: analyzing ────────────────────────────────────────────
    sendPhase("analyzing");
    sendLog("info", "Lighthouse / PageSpeed measurement triggered in browser…");
    sendLog("info", "Launching browser evidence collector and architecture analyser…");

    const summary = await buildLiveScanSummaryFromDeterministic(deterministic, domIssueCount);
    if (closed) return res.end();

    if (summary) {
      sendLog("info", `Browser: ${summary.browserStatus} (${summary.browserMode})`);
      if (summary.routes.length > 1) {
        sendLog("info", `Crawled ${summary.routes.length} route(s) · avg ${summary.averageRouteResponseMs ?? "—"} ms`);
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
  } catch (error: unknown) {
    sendFail(error instanceof Error ? error.message : "scan_failed");
    res.end();
  }
});

// ---------------------------------------------------------------------------
// GET /api/scan/dom-issues
// ---------------------------------------------------------------------------
scanRouter.get("/dom-issues", authenticateToken, async (req, res) => {
  try {
    const url = typeof req.query.url === "string" ? req.query.url : "";
    if (!url) {
      return res.status(400).json({ error: "missing_url" });
    }
    const issues = await scanDomIssues(url);
    res.json(issues);
  } catch (error: unknown) {
    const mapped = mapErrorToResponse(error, "dom_scan_failed");
    res.status(mapped.status).json(mapped.body);
  }
});

// ---------------------------------------------------------------------------
// GET /api/scan/crux
// Real-user Core Web Vitals from Chrome UX Report.
// Always returns 200 with { hasData } so the client can fall back cleanly.
// ---------------------------------------------------------------------------
scanRouter.get("/crux", authenticateToken, async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url : "";
  if (!url) {
    return res.status(400).json({ error: "missing_url" });
  }
  const result = await fetchCruxReport(url);
  res.json(result);
});
