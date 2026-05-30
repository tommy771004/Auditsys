import { AUDIT_TARGET_REDIRECT_LIMIT_ERROR, assertSafeAuditTargetUrl } from "./securityPolicies";
import { collectDeterministicEvidence } from "./deterministicCollector";
import { collectBrowserEvidence } from "./browserCollector";
import type { BrowserCollectorResult, DeterministicCollectorResult } from "./auditPipelineTypes";
import type { LiveScanRoute, LiveScanScores, LiveScanSummary, SubagentsResults } from "../../types/liveAudit.types";

/** Mirrors the client-side `SSELog` log levels. */
export type SSELogLevel = "info" | "warn" | "error" | "success";

/** Mirrors the client-side `LiveDOMIssue` contract. */
export type DOMIssueType = "missing_alt" | "multiple_h1" | "invalid_canonical";

export interface LiveDOMIssue {
  element: string;
  issueType: DOMIssueType;
  snippet: string;
  highlightLine?: number;
}

export interface FetchedTarget {
  html: string;
  finalUrl: string;
  statusCode: number;
  contentType: string | null;
  responseTimeMs: number;
}

const REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
};

const MAX_ISSUES_PER_TYPE = 8;
const MAX_LINE_LENGTH = 200;
const INLINE_WINDOW = 160;

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

/** Fetches the target HTML, following same-origin-safe redirects (SSRF guarded). */
export async function fetchTargetHtml(targetUrl: string): Promise<FetchedTarget> {
  const startedTime = Date.now();
  let currentUrl = targetUrl;

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    await assertSafeAuditTargetUrl(currentUrl);

    const response = await fetch(currentUrl, { redirect: "manual", headers: REQUEST_HEADERS });

    if (isRedirectStatus(response.status)) {
      const location = response.headers.get("location");
      if (location) {
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
    }

    const contentType = response.headers.get("content-type");
    const html = contentType?.includes("text/html") ? await response.text() : "";

    return {
      html,
      finalUrl: response.url || currentUrl,
      statusCode: response.status,
      contentType,
      responseTimeMs: Date.now() - startedTime,
    };
  }

  throw new Error(AUDIT_TARGET_REDIRECT_LIMIT_ERROR);
}

/** Builds a short, highlighted snippet around a match within the full HTML. */
function buildSnippet(html: string, lines: string[], matchIndex: number, matchText: string): { snippet: string; highlightLine: number } {
  // Determine which line the match falls on.
  let lineNo = 0;
  let charCount = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const lineLength = lines[i].length + 1; // +1 for the stripped newline
    if (charCount + lineLength > matchIndex) {
      lineNo = i;
      break;
    }
    charCount += lineLength;
  }

  const line = lines[lineNo] ?? matchText;

  // Minified HTML: collapse to a focused window around the match on one line.
  if (line.length > MAX_LINE_LENGTH) {
    const columnInLine = matchIndex - charCount;
    const start = Math.max(0, columnInLine - INLINE_WINDOW / 2);
    const end = Math.min(line.length, columnInLine + matchText.length + INLINE_WINDOW / 2);
    const prefix = start > 0 ? "… " : "";
    const suffix = end < line.length ? " …" : "";
    return { snippet: `${prefix}${line.slice(start, end).trim()}${suffix}`, highlightLine: 0 };
  }

  // Pretty HTML: include one line of context on each side.
  const windowStart = Math.max(0, lineNo - 1);
  const windowEnd = Math.min(lines.length, lineNo + 2);
  const windowLines = lines.slice(windowStart, windowEnd);
  return { snippet: windowLines.join("\n"), highlightLine: lineNo - windowStart };
}

function findImagesMissingAlt(html: string, lines: string[]): LiveDOMIssue[] {
  const issues: LiveDOMIssue[] = [];
  const pattern = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null && issues.length < MAX_ISSUES_PER_TYPE) {
    const tag = match[0];
    // Skip if a non-empty alt attribute is present.
    if (/\balt\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i.test(tag) && !/\balt\s*=\s*("\s*"|'\s*')/i.test(tag)) {
      continue;
    }
    const { snippet, highlightLine } = buildSnippet(html, lines, match.index, tag);
    issues.push({ element: "img", issueType: "missing_alt", snippet, highlightLine });
  }

  return issues;
}

function findMultipleH1(html: string, lines: string[]): LiveDOMIssue[] {
  const pattern = /<h1\b[^>]*>/gi;
  const matches = [...html.matchAll(pattern)];

  if (matches.length <= 1) {
    return [];
  }

  // Emit a single issue, highlighting the second (duplicate) H1.
  const second = matches[1];
  const { snippet, highlightLine } = buildSnippet(html, lines, second.index ?? 0, second[0]);
  return [
    {
      element: `h1 (${matches.length} found)`,
      issueType: "multiple_h1",
      snippet,
      highlightLine,
    },
  ];
}

function findInvalidCanonical(html: string, lines: string[], finalUrl: string): LiveDOMIssue[] {
  const pattern = /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi;
  const matches = [...html.matchAll(pattern)];

  if (matches.length === 0) {
    return [];
  }

  const issues: LiveDOMIssue[] = [];

  matches.forEach((match, index) => {
    if (issues.length >= MAX_ISSUES_PER_TYPE) {
      return;
    }
    const tag = match[0];
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']*)["']/i);
    const href = hrefMatch?.[1]?.trim() ?? "";

    let invalid = false;
    if (matches.length > 1) {
      invalid = true; // Multiple canonicals is itself a defect.
    } else if (!href) {
      invalid = true;
    } else {
      try {
        const resolved = new URL(href, finalUrl);
        if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
          invalid = true;
        }
      } catch {
        invalid = true;
      }
    }

    if (invalid) {
      const { snippet, highlightLine } = buildSnippet(html, lines, match.index ?? 0, tag);
      issues.push({
        element: matches.length > 1 ? `link[rel=canonical] (${matches.length} found)` : "link[rel=canonical]",
        issueType: "invalid_canonical",
        snippet,
        highlightLine,
      });
    }
  });

  return issues;
}

/** Parses already-fetched HTML for the supported DOM issue types. */
export function analyzeDomIssues(html: string, finalUrl: string): LiveDOMIssue[] {
  if (!html) {
    return [];
  }
  const lines = html.replace(/\r\n/g, "\n").split("\n");
  return [
    ...findImagesMissingAlt(html, lines),
    ...findMultipleH1(html, lines),
    ...findInvalidCanonical(html, lines, finalUrl),
  ];
}

/** Convenience: fetch + analyze in one call for the DOM-issues endpoint. */
export async function scanDomIssues(targetUrl: string): Promise<LiveDOMIssue[]> {
  const fetched = await fetchTargetHtml(targetUrl);
  return analyzeDomIssues(fetched.html, fetched.finalUrl);
}

/**
 * Derives a DOM issue count directly from parsed deterministic evidence so
 * the SSE stream can avoid a second HTML fetch just to count issues.
 */
export function estimateDomIssueCount(deterministic: DeterministicCollectorResult): number {
  const doc = deterministic.document;
  if (!doc) return 0;
  let count = 0;
  count += doc.counts.imagesMissingAlt;
  if (doc.counts.h1 !== 1) count += 1;
  if (doc.canonical && !doc.canonical.startsWith("http")) count += 1;
  return count;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Derives per-route timing from the browser collector's crawled page notes. */
function deriveRoutes(browser: BrowserCollectorResult): LiveScanRoute[] {
  return browser.pages.map((page) => {
    const noteText = page.notes.join(" ");
    const statusMatch = noteText.match(/HTTP (\d{3})/);
    const timeMatch = noteText.match(/in (\d+) ms/);
    const status = statusMatch ? Number(statusMatch[1]) : null;

    return {
      url: page.url,
      status,
      responseTimeMs: timeMatch ? Number(timeMatch[1]) : null,
      ok: status !== null ? status >= 200 && status < 400 : false,
    };
  });
}

function buildLiveScores(
  deterministic: DeterministicCollectorResult,
  browser: BrowserCollectorResult,
  averageRouteMs: number | null,
): LiveScanScores {
  if (deterministic.status !== "completed" || !deterministic.document) {
    return { overall: 28, performance: 24, seo: 30, architecture: 36 };
  }

  const document = deterministic.document;

  let performance = 92;
  if (typeof deterministic.responseTimeMs === "number") {
    performance -= Math.max(0, (deterministic.responseTimeMs - 600) / 35);
  }
  if (averageRouteMs !== null) {
    performance -= Math.max(0, (averageRouteMs - 800) / 60);
  }
  performance -= Math.max(0, document.counts.scripts - 12) * 1.3;
  performance -= Math.max(0, document.counts.stylesheets - 4) * 1.5;

  let seo = 94;
  if (!document.metaDescription) seo -= 18;
  if (!document.canonical) seo -= 16;
  if (!document.lang) seo -= 8;
  if (!document.viewport) seo -= 8;
  if (document.counts.structuredDataBlocks === 0) seo -= 12;
  if (document.counts.h1 !== 1) seo -= 8;
  if (document.counts.openGraphTags === 0) seo -= 6;
  seo -= Math.min(16, document.counts.imagesMissingAlt * 2);

  let architecture = 82;
  if (browser.status === "partial") architecture -= 10;
  else if (browser.status !== "completed") architecture -= 18;
  if (deterministic.headers?.poweredBy) architecture -= 8;
  if (!deterministic.headers?.cacheControl) architecture -= 6;
  if (deterministic.warnings.length > 2) architecture -= Math.min(18, deterministic.warnings.length * 2);

  const performanceScore = clampScore(performance);
  const seoScore = clampScore(seo);
  const architectureScore = clampScore(architecture);

  return {
    overall: clampScore((performanceScore + seoScore + architectureScore) / 3),
    performance: performanceScore,
    seo: seoScore,
    architecture: architectureScore,
  };
}

function foldLiveScanSummary(
  deterministic: DeterministicCollectorResult,
  browser: BrowserCollectorResult,
  domIssueCount: number,
  agentResults?: SubagentsResults,
): LiveScanSummary {
  const routes = deriveRoutes(browser);
  const routeTimings = routes
    .filter((route) => route.ok && typeof route.responseTimeMs === "number")
    .map((route) => route.responseTimeMs as number);
  const averageRouteResponseMs = routeTimings.length > 0
    ? Math.round(routeTimings.reduce((total, value) => total + value, 0) / routeTimings.length)
    : null;
  const document = deterministic.document;

  return {
    finalUrl: deterministic.finalUrl ?? deterministic.targetUrl,
    statusCode: deterministic.statusCode ?? null,
    responseTimeMs: deterministic.responseTimeMs ?? null,
    server: deterministic.headers?.server ?? deterministic.headers?.poweredBy ?? null,
    scores: buildLiveScores(deterministic, browser, averageRouteResponseMs),
    assets: {
      scripts: document?.counts.scripts ?? 0,
      stylesheets: document?.counts.stylesheets ?? 0,
      images: document?.counts.images ?? 0,
      imagesMissingAlt: document?.counts.imagesMissingAlt ?? 0,
    },
    seo: {
      hasTitle: Boolean(document?.title),
      hasMetaDescription: Boolean(document?.metaDescription),
      hasCanonical: Boolean(document?.canonical),
      hasViewport: Boolean(document?.viewport),
      h1Count: document?.counts.h1 ?? 0,
      structuredDataBlocks: document?.counts.structuredDataBlocks ?? 0,
      openGraphTags: document?.counts.openGraphTags ?? 0,
    },
    routes,
    averageRouteResponseMs,
    domIssueCount,
    warnings: [...deterministic.warnings, ...browser.warnings].slice(0, 8),
    browserStatus: browser.status,
    browserMode: browser.mode,
    agentResults,
  };
}

/**
 * Runs the deterministic + browser collectors for a live target and folds the
 * evidence into the structured `LiveScanSummary` delivered on the SSE `done`
 * frame (powers the post-scan charts). Returns `null` if collection fails so the
 * stream can still close gracefully.
 */
export async function buildLiveScanSummary(targetUrl: string, domIssueCount: number): Promise<LiveScanSummary | null> {
  try {
    const deterministic = await collectDeterministicEvidence({ url: targetUrl });
    const browser = await collectBrowserEvidence({ url: targetUrl }, deterministic);
    return foldLiveScanSummary(deterministic, browser, domIssueCount);
  } catch {
    return null;
  }
}

/**
 * Variant that accepts an already-collected `DeterministicCollectorResult` so
 * the SSE stream can avoid re-fetching the target URL a second time.
 * Only the browser collector runs fresh.
 */
export async function buildLiveScanSummaryFromDeterministic(
  deterministic: DeterministicCollectorResult,
  domIssueCount: number,
  agentResults?: SubagentsResults,
): Promise<LiveScanSummary | null> {
  try {
    const browser = await collectBrowserEvidence({ url: deterministic.targetUrl }, deterministic);
    return foldLiveScanSummary(deterministic, browser, domIssueCount, agentResults);
  } catch {
    return null;
  }
}
