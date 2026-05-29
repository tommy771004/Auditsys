import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AuditRequestPayload, BrowserCollectedPage, BrowserCollectorFlow, BrowserCollectorResult, BrowserCollectorTimelineStep, DeterministicCollectorResult } from "./auditPipelineTypes";
import { parseWebwrightReportArtifact, parseWebwrightTaskArtifact, parseWebwrightTrajectoryArtifact, type WebwrightReportArtifact, type WebwrightTaskArtifact, type WebwrightTrajectoryArtifact } from "./webwrightContract";

interface JsonArtifactResult {
  path?: string;
  value?: unknown;
  missing: boolean;
  invalid: boolean;
}

interface ResolvedWebwrightArtifacts {
  discoveryRoot?: string;
  reportPath?: string;
  taskPath?: string;
  trajectoryPath?: string;
  tracePath?: string;
  screenshotPaths: string[];
  logPaths: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function parsePathList(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  const trimmed = value.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsedValue = JSON.parse(trimmed) as unknown;

      if (Array.isArray(parsedValue)) {
        return parsedValue.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      return [];
    }
  }

  return trimmed
    .split(/[|;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function humanizeToken(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .trim();
}

function collectTextFragments(value: unknown, limit = 8): string[] {
  const bucket: string[] = [];

  const visit = (input: unknown) => {
    if (bucket.length >= limit) {
      return;
    }

    if (typeof input === "string") {
      const trimmed = input.trim();

      if (trimmed) {
        bucket.push(trimmed);
      }

      return;
    }

    if (Array.isArray(input)) {
      input.forEach((item) => {
        visit(item);
      });
      return;
    }

    if (!isRecord(input)) {
      return;
    }

    const priorityKeys = ["title", "heading", "summary", "description", "result", "text", "label", "content"];
    const visitedKeys = new Set<string>();

    priorityKeys.forEach((key) => {
      if (key in input) {
        visitedKeys.add(key);
        visit(input[key]);
      }
    });

    Object.entries(input).forEach(([key, nestedValue]) => {
      if (!visitedKeys.has(key)) {
        visit(nestedValue);
      }
    });
  };

  visit(value);

  return uniqueStrings(bucket).slice(0, limit);
}

function readJsonArtifact(path: string | undefined): JsonArtifactResult {
  if (!path?.trim()) {
    return {
      missing: true,
      invalid: false,
    };
  }

  if (!existsSync(path)) {
    return {
      path,
      missing: true,
      invalid: false,
    };
  }

  try {
    return {
      path,
      value: JSON.parse(readFileSync(path, "utf8")) as unknown,
      missing: false,
      invalid: false,
    };
  } catch {
    return {
      path,
      missing: false,
      invalid: true,
    };
  }
}

function getPathDirectory(path: string | undefined): string | undefined {
  const trimmed = asTrimmedString(path);

  if (!trimmed) {
    return undefined;
  }

  return dirname(trimmed);
}

function listArtifactFiles(rootDir: string | undefined, maxDepth = 3): string[] {
  if (!rootDir || !existsSync(rootDir)) {
    return [];
  }

  try {
    if (!statSync(rootDir).isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const filePaths: string[] = [];

  const visit = (currentPath: string, depth: number) => {
    let entryNames: string[];

    try {
      entryNames = readdirSync(currentPath);
    } catch {
      return;
    }

    entryNames.forEach((entryName) => {
      const nextPath = join(currentPath, entryName);

      try {
        const stats = statSync(nextPath);

        if (stats.isDirectory()) {
          if (depth < maxDepth) {
            visit(nextPath, depth + 1);
          }

          return;
        }

        if (stats.isFile()) {
          filePaths.push(nextPath);
        }
      } catch {
        return;
      }
    });
  };

  visit(rootDir, 0);

  return uniqueStrings(filePaths);
}

function matchesAnyPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function findFirstArtifact(filePaths: string[], patterns: RegExp[]): string | undefined {
  return filePaths.find((filePath) => matchesAnyPattern(filePath, patterns));
}

function findAllArtifacts(filePaths: string[], patterns: RegExp[]): string[] {
  return filePaths.filter((filePath) => matchesAnyPattern(filePath, patterns));
}

function resolveWebwrightArtifacts(): ResolvedWebwrightArtifacts {
  const explicitReportPath = asTrimmedString(process.env.WEBWRIGHT_REPORT_PATH);
  const explicitTaskPath = asTrimmedString(process.env.WEBWRIGHT_TASK_PATH);
  const explicitTrajectoryPath = asTrimmedString(process.env.WEBWRIGHT_TRAJECTORY_PATH);
  const explicitScreenshotPaths = parsePathList(process.env.WEBWRIGHT_SCREENSHOT_PATHS);
  const explicitLogPaths = parsePathList(process.env.WEBWRIGHT_LOG_PATHS);
  const discoveryRoots = uniqueStrings(
    compactStrings([
      asTrimmedString(process.env.WEBWRIGHT_WORKSPACE_DIR),
      getPathDirectory(explicitReportPath),
      getPathDirectory(explicitTaskPath),
      getPathDirectory(explicitTrajectoryPath),
    ]),
  );
  const discoveredFiles = uniqueStrings(discoveryRoots.flatMap((rootDir) => listArtifactFiles(rootDir)));
  const reportPatterns = [/(^|[\\/])report\.json$/i, /(^|[\\/])webwright-report\.json$/i];
  const taskPatterns = [/(^|[\\/])task\.json$/i, /(^|[\\/])webwright-task\.json$/i];
  const trajectoryPatterns = [/(^|[\\/])trajectory\.(json|jsonl)$/i];
  const tracePatterns = [/(^|[\\/])trace\.(zip|json|jsonl)$/i];
  const screenshotPatterns = [/[\\/]screenshots?[\\/].+\.(png|jpe?g|webp)$/i, /\.(png|jpe?g|webp)$/i];
  const logPatterns = [/[\\/]logs?[\\/].+\.(log|txt|jsonl)$/i, /(^|[\\/]).+\.(log|txt)$/i, /(^|[\\/])(console|network|events?)\.(json|jsonl|log)$/i];
  const reportPath = explicitReportPath ?? findFirstArtifact(discoveredFiles, reportPatterns);
  const taskPath = explicitTaskPath ?? findFirstArtifact(discoveredFiles, taskPatterns);
  const trajectoryPath = explicitTrajectoryPath ?? findFirstArtifact(discoveredFiles, trajectoryPatterns);
  const tracePath = findFirstArtifact(discoveredFiles, tracePatterns);
  const screenshotPaths = explicitScreenshotPaths.length > 0 ? explicitScreenshotPaths : findAllArtifacts(discoveredFiles, screenshotPatterns);
  const ignoredLogPaths = new Set(compactStrings([reportPath, taskPath, trajectoryPath, tracePath]));
  const logPaths = explicitLogPaths.length > 0
    ? explicitLogPaths
    : findAllArtifacts(discoveredFiles, logPatterns).filter((filePath) => !ignoredLogPaths.has(filePath));

  return {
    discoveryRoot: discoveryRoots[0],
    reportPath,
    taskPath,
    trajectoryPath,
    tracePath,
    screenshotPaths: uniqueStrings(screenshotPaths),
    logPaths: uniqueStrings(logPaths),
  };
}

function getBrowserMode(): BrowserCollectorResult["mode"] {
  const configuredMode = process.env.BROWSER_COLLECTOR_MODE?.trim().toLowerCase();

  if (configuredMode === "webwright" || configuredMode === "stub") {
    return configuredMode as any;
  }

  // Default to the "playwright" env value, which routes to the real fetch-based
  // crawler (buildCrawlerResult). The crawler reports its honest mode as "crawler";
  // this is only the config token that selects which collector path runs.
  return "playwright";
}

function buildBaseResult(payload: AuditRequestPayload, deterministic: DeterministicCollectorResult, mode: BrowserCollectorResult["mode"], reason: string, warnings: string[], extraObservations: string[] = []): BrowserCollectorResult {
  const startedAt = new Date().toISOString();
  const finalUrl = deterministic.finalUrl ?? payload.url;
  const primaryTitle = deterministic.document?.title ?? undefined;
  const observations = [
    `Browser collector is scaffolded for ${payload.url}.`,
    deterministic.status === "completed"
      ? "A deterministic HTML pass succeeded; browser automation can now focus on dynamic and stateful surfaces."
      : "Deterministic evidence failed, so browser automation should be the next recovery path for real-site diagnosis.",
    ...extraObservations,
  ];

  return {
    stage: "browser",
    status: "skipped",
    mode,
    startedAt,
    completedAt: new Date().toISOString(),
    runtime: {
      runner: mode,
      instruction: `Inspect ${payload.url} with a browser collector and capture evidence for dynamic routes, consent banners, and high-value user flows.`,
      startUrl: payload.url,
      finalUrl,
      taskId: mode === "webwright" ? process.env.WEBWRIGHT_TASK_ID ?? "auditlens-webwright" : "auditlens-browser-stub",
      workspaceDir: mode === "webwright" ? process.env.WEBWRIGHT_WORKSPACE_DIR : "outputs/browser-stub",
    },
    pages: [
      {
        url: finalUrl,
        title: primaryTitle,
        notes: [
          "Landing document evidence is available from the deterministic collector.",
          "This page record is intentionally shaped to match a future Webwright or Playwright run artifact.",
        ],
      },
    ],
    flows: [
      {
        id: "landing-document",
        label: "Landing document verification",
        status: "not_run",
        summary: "Ready for a browser agent to verify DOM mutations, consent prompts, and late-loading content.",
        steps: [
          "Open the target URL in a clean browser session.",
          "Wait for network quiet and capture a screenshot.",
          "Record DOM or visual changes that are not visible in the deterministic HTML response.",
        ],
      },
      {
        id: "critical-user-flow",
        label: "Critical user flow capture",
        status: "not_run",
        summary: "Reserved for checkout, search, sign-in, or other stateful flows that require browser evidence.",
        steps: [
          "Define the task entry point and expected user outcome.",
          "Capture each state transition with evidence artifacts.",
          "Store screenshots, logs, and trajectory output for synthesis.",
        ],
      },
    ],
    observations,
    warnings,
    screenshots: [],
    artifacts: {
      screenshotPaths: [],
      logPaths: [],
    },
    reason,
  };
}

function getTaskInstruction(taskArtifact: WebwrightTaskArtifact | null, payload: AuditRequestPayload): string {
  if (taskArtifact?.instruction) {
    return taskArtifact.instruction;
  }

  return `Inspect ${payload.url} with Webwright and capture evidence for dynamic routes, consent banners, and high-value user flows.`;
}

function getTaskStartUrl(taskArtifact: WebwrightTaskArtifact | null, payload: AuditRequestPayload, deterministic: DeterministicCollectorResult): string {
  if (taskArtifact?.startUrl) {
    return taskArtifact.startUrl;
  }

  return deterministic.finalUrl ?? payload.url;
}

function getTaskId(taskArtifact: WebwrightTaskArtifact | null): string | undefined {
  return process.env.WEBWRIGHT_TASK_ID ?? taskArtifact?.id;
}

function getTaskWorkspace(artifacts: ResolvedWebwrightArtifacts, taskArtifact: JsonArtifactResult, reportArtifact: JsonArtifactResult): string | undefined {
  return artifacts.discoveryRoot ?? process.env.WEBWRIGHT_WORKSPACE_DIR ?? getPathDirectory(taskArtifact.path) ?? getPathDirectory(reportArtifact.path);
}

function buildFlows(reportArtifact: WebwrightReportArtifact | null, rawReportArtifact: unknown): BrowserCollectorFlow[] {
  const sectionCandidates = reportArtifact?.sections ?? [];

  if (sectionCandidates.length === 0) {
    const fallbackFragments = collectTextFragments(rawReportArtifact, 5);

    if (fallbackFragments.length === 0) {
      return [];
    }

    return [
      {
        id: "webwright-report",
        label: "Webwright report summary",
        status: "completed",
        summary: fallbackFragments[0],
        steps: fallbackFragments.slice(1, 4),
      },
    ];
  }

  return sectionCandidates.slice(0, 4).map((section, index) => {
    const label = section.title ?? section.id ?? `Section ${index + 1}`;
    const fragments = collectTextFragments(section, 6);

    return {
      id: slugify(label) || `section-${index + 1}`,
      label,
      status: fragments.length > 0 ? "completed" : "partial",
      summary: section.summary ?? fragments[0] ?? "Webwright captured this section but no summary text was available.",
      steps: section.steps.length > 0 ? section.steps.slice(0, 3) : fragments.slice(1, 4),
    };
  });
}

function buildPages(reportArtifact: WebwrightReportArtifact | null, deterministic: DeterministicCollectorResult, payload: AuditRequestPayload, screenshotPaths: string[]): BrowserCollectedPage[] {
  const fallbackUrl = deterministic.finalUrl ?? payload.url;

  if (reportArtifact?.sources.length) {
    const pages = reportArtifact.sources.map((source) => ({
      url: source.url ?? fallbackUrl,
      title: source.title,
      screenshotPath: source.screenshotPath,
      notes: uniqueStrings(source.notes.length > 0 ? source.notes : collectTextFragments(source, 4)).slice(0, 3),
    }));

    if (pages.length > 0) {
      return pages;
    }
  }

  return [
    {
      url: fallbackUrl,
      title: deterministic.document?.title ?? undefined,
      screenshotPath: screenshotPaths[0],
      notes: [
        "No explicit page sources were found in the Webwright report artifact.",
        "Falling back to the deterministic collector target URL.",
      ],
    },
  ];
}

function normalizeTimelineStatus(value: string | undefined): BrowserCollectorTimelineStep["status"] {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === "completed" || normalizedValue === "success" || normalizedValue === "passed") {
    return "completed";
  }

  if (normalizedValue === "partial") {
    return "partial";
  }

  if (normalizedValue === "blocked" || normalizedValue === "failed" || normalizedValue === "error") {
    return "blocked";
  }

  return "not_run";
}

function buildTimeline(trajectoryArtifact: WebwrightTrajectoryArtifact | null): BrowserCollectorTimelineStep[] {
  if (!trajectoryArtifact?.steps.length) {
    return [];
  }

  return trajectoryArtifact.steps.slice(0, 6).map((step, index) => {
    const baseLabel = step.action ? humanizeToken(step.action) : `step ${index + 1}`;
    const label = baseLabel.charAt(0).toUpperCase() + baseLabel.slice(1);
    const detail = step.url ?? step.target;

    return {
      id: `${slugify(baseLabel) || "step"}-${index + 1}`,
      label,
      status: normalizeTimelineStatus(step.status),
      detail,
    };
  });
}

function resolveWebwrightStatus(flows: BrowserCollectorFlow[], timeline: BrowserCollectorTimelineStep[], hasTrajectoryArtifact: boolean): BrowserCollectorResult["status"] {
  if (flows.length === 0) {
    return "partial";
  }

  if (flows.some((flow) => flow.status !== "completed")) {
    return "partial";
  }

  if (timeline.some((step) => step.status !== "completed")) {
    return "partial";
  }

  if (hasTrajectoryArtifact && timeline.length === 0) {
    return "partial";
  }

  return "completed";
}

function buildWebwrightResult(payload: AuditRequestPayload, deterministic: DeterministicCollectorResult): BrowserCollectorResult {
  const artifacts = resolveWebwrightArtifacts();
  const taskArtifact = readJsonArtifact(artifacts.taskPath);
  const reportArtifact = readJsonArtifact(artifacts.reportPath);
  const trajectoryArtifact = readJsonArtifact(artifacts.trajectoryPath);
  const screenshotPaths = artifacts.screenshotPaths;
  const logPaths = artifacts.logPaths;

  if (reportArtifact.invalid) {
    return {
      ...buildBaseResult(
        payload,
        deterministic,
        "webwright",
        "webwright_report_invalid",
        ["The configured Webwright report artifact could not be parsed as JSON."],
        reportArtifact.path ? [`Attempted to read Webwright report artifact at ${reportArtifact.path}.`] : [],
      ),
      status: "failed",
    };
  }

  if (taskArtifact.invalid) {
    return {
      ...buildBaseResult(
        payload,
        deterministic,
        "webwright",
        "webwright_task_invalid",
        ["The configured Webwright task artifact could not be parsed as JSON."],
        taskArtifact.path ? [`Attempted to read Webwright task artifact at ${taskArtifact.path}.`] : [],
      ),
      status: "failed",
    };
  }

  if (reportArtifact.missing) {
    return buildBaseResult(
      payload,
      deterministic,
      "webwright",
      "webwright_report_missing",
      ["Webwright mode is enabled, but no readable report artifact was found."],
      reportArtifact.path
        ? [`Expected Webwright report artifact at ${reportArtifact.path}.`]
        : artifacts.discoveryRoot
          ? [`Scanned ${artifacts.discoveryRoot} for a renderer-ready report.json artifact but did not find one.`]
          : ["Set WEBWRIGHT_WORKSPACE_DIR or WEBWRIGHT_REPORT_PATH to a renderer-ready report.json artifact."],
    );
  }

  const parsedTaskArtifact = parseWebwrightTaskArtifact(taskArtifact.value);
  const parsedReportArtifact = parseWebwrightReportArtifact(reportArtifact.value);
  const parsedTrajectoryArtifact = parseWebwrightTrajectoryArtifact(trajectoryArtifact.value);
  const flows = buildFlows(parsedReportArtifact, reportArtifact.value);
  const pages = buildPages(parsedReportArtifact, deterministic, payload, screenshotPaths);
  const timeline = buildTimeline(parsedTrajectoryArtifact);
  const screenshots = uniqueStrings([
    ...screenshotPaths,
    ...pages.map((page) => page.screenshotPath).filter((path): path is string => typeof path === "string" && path.trim().length > 0),
  ]);
  const warnings: string[] = [];
  const blockedTimelineStep = timeline.find((step) => step.status === "blocked");
  const incompleteTimelineStep = timeline.find((step) => step.status === "partial" || step.status === "not_run");

  if (flows.length === 0) {
    warnings.push("Webwright report loaded, but no structured flow sections were detected.");
  }

  if (screenshots.length === 0) {
    warnings.push("No screenshot paths were supplied with the Webwright artifacts.");
  }

  if (trajectoryArtifact.invalid) {
    warnings.push("The configured Webwright trajectory artifact could not be parsed as JSON.");
  } else if (artifacts.trajectoryPath && timeline.length === 0) {
    warnings.push("A trajectory artifact was found, but no executable timeline steps were parsed from it.");
  }

  if (blockedTimelineStep) {
    warnings.push(`Browser timeline blocked at \"${blockedTimelineStep.label}\".`);
  } else if (incompleteTimelineStep) {
    warnings.push(`Browser timeline did not fully complete step \"${incompleteTimelineStep.label}\".`);
  }

  const status = resolveWebwrightStatus(flows, timeline, Boolean(artifacts.trajectoryPath));

  return {
    stage: "browser",
    status,
    mode: "webwright",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    runtime: {
      runner: "webwright",
      instruction: getTaskInstruction(parsedTaskArtifact, payload),
      startUrl: getTaskStartUrl(parsedTaskArtifact, payload, deterministic),
      finalUrl: pages[0]?.url ?? deterministic.finalUrl ?? payload.url,
      taskId: getTaskId(parsedTaskArtifact),
      workspaceDir: getTaskWorkspace(artifacts, taskArtifact, reportArtifact),
    },
    pages,
    flows,
    timeline,
    observations: uniqueStrings([
      reportArtifact.path ? `Loaded Webwright report artifact from ${reportArtifact.path}.` : "Loaded Webwright report artifact.",
      taskArtifact.path ? `Loaded Webwright task artifact from ${taskArtifact.path}.` : "No Webwright task artifact was configured; runtime metadata was inferred from the report and request.",
      artifacts.discoveryRoot ? `Resolved Webwright artifacts from ${artifacts.discoveryRoot}.` : "Webwright artifacts were resolved from explicit environment paths.",
      timeline.length > 0 ? `Parsed ${timeline.length} trajectory step(s) from the Webwright timeline artifact.` : "No parsed trajectory steps were attached to this run.",
      `Extracted ${flows.length} browser flow section(s) from the Webwright output.`,
    ]),
    warnings,
    screenshots,
    artifacts: {
      reportPath: reportArtifact.path,
      trajectoryPath: artifacts.trajectoryPath,
      tracePath: artifacts.tracePath,
      screenshotPaths: screenshots,
      logPaths,
    },
  };
}

interface CrawledRoute {
  url: string;
  status: number | null;
  ok: boolean;
  responseTimeMs: number | null;
  title?: string;
  error?: string;
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? match[1].replace(/\s+/g, " ").trim() : undefined;
}

function extractInternalLinks(html: string, baseHref: string): string[] {
  let baseUrl: URL;

  try {
    baseUrl = new URL(baseHref);
  } catch {
    return [];
  }

  const hrefMatches = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)];
  const internalLinks = new Set<string>();

  for (const match of hrefMatches) {
    const href = match[1]?.trim();

    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      continue;
    }

    try {
      const resolved = new URL(href, baseUrl);
      resolved.hash = "";

      if (resolved.origin === baseUrl.origin && resolved.href !== baseUrl.href) {
        internalLinks.add(resolved.href);
      }
    } catch {
      /* ignore invalid URLs */
    }
  }

  return [...internalLinks];
}

async function probeRoute(url: string): Promise<CrawledRoute> {
  const startedTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "AuditLens/1.0 (Lightweight Crawler)" },
      signal: AbortSignal.timeout(5000),
    });

    const responseTimeMs = Date.now() - startedTime;
    const contentType = response.headers.get("content-type");
    const title = contentType?.includes("text/html") ? extractTitle(await response.text()) : undefined;

    return {
      url,
      status: response.status,
      ok: response.ok,
      responseTimeMs,
      title,
    };
  } catch (error: any) {
    return {
      url,
      status: null,
      ok: false,
      responseTimeMs: null,
      error: error?.message ?? "fetch_failed",
    };
  }
}

/**
 * Lightweight, dependency-free browser-collector substitute. It performs a real
 * multi-route crawl with `fetch` (no Playwright binary required) and shapes the
 * output to the same `BrowserCollectorResult` contract a real browser run would
 * produce: per-route pages, navigation flows, a step timeline, and timing stats.
 */
async function buildCrawlerResult(payload: AuditRequestPayload, deterministic: DeterministicCollectorResult): Promise<BrowserCollectorResult> {
  const startedAt = new Date().toISOString();
  const finalUrl = deterministic.finalUrl ?? payload.url;
  const timeline: BrowserCollectorTimelineStep[] = [];
  const observations: string[] = [];
  const warnings: string[] = [];
  const crawledRoutes: CrawledRoute[] = [];
  let primaryRoute: CrawledRoute | null = null;
  let internalLinkCount = 0;

  timeline.push({ id: "step-init", label: "Initialize Lightweight Crawler", status: "completed", detail: "Prepared fetch-based traversal engine." });

  try {
    primaryRoute = await probeRoute(finalUrl);
    crawledRoutes.push(primaryRoute);

    if (!primaryRoute.ok) {
      throw new Error(`Primary document returned HTTP ${primaryRoute.status ?? "no response"}`);
    }

    timeline.push({
      id: "step-primary",
      label: "Fetch Primary Document",
      status: "completed",
      detail: `${finalUrl} → HTTP ${primaryRoute.status} in ${primaryRoute.responseTimeMs} ms`,
    });

    const primaryResponse = await fetch(finalUrl, {
      headers: { "User-Agent": "AuditLens/1.0 (Lightweight Crawler)" },
      signal: AbortSignal.timeout(5000),
    });
    const html = primaryResponse.ok ? await primaryResponse.text() : "";
    const internalLinks = extractInternalLinks(html, finalUrl);
    internalLinkCount = internalLinks.length;

    timeline.push({
      id: "step-extract",
      label: "Extract DOM & Links",
      status: "completed",
      detail: `Discovered ${internalLinkCount} internal navigation links.`,
    });
    observations.push(`Crawler discovered ${internalLinkCount} internal navigation links.`);

    const routesToTest = internalLinks.slice(0, 3);

    if (routesToTest.length > 0) {
      for (const [index, link] of routesToTest.entries()) {
        const route = await probeRoute(link);
        crawledRoutes.push(route);
        timeline.push({
          id: `step-route-${index + 1}`,
          label: `Navigate Route ${index + 1}`,
          status: route.ok ? "completed" : "blocked",
          detail: route.ok
            ? `${link} → HTTP ${route.status} in ${route.responseTimeMs} ms`
            : `Failed to load ${link}${route.error ? ` (${route.error})` : ""}`,
        });
      }
    } else {
      timeline.push({ id: "step-route-none", label: "Navigate Routes", status: "not_run", detail: "No distinct internal links found to traverse." });
    }
  } catch (error: any) {
    timeline.push({ id: "step-error", label: "Crawler Execution", status: "blocked", detail: error?.message ?? "Unexpected crawler error" });
    observations.push(`Lightweight crawler encountered an error: ${error?.message ?? "unknown"}`);
  }

  const successfulRoutes = crawledRoutes.filter((route) => route.ok);
  const failedRoutes = crawledRoutes.filter((route) => !route.ok);
  const timings = successfulRoutes.map((route) => route.responseTimeMs).filter((value): value is number => typeof value === "number");
  const averageResponseMs = timings.length > 0 ? Math.round(timings.reduce((total, value) => total + value, 0) / timings.length) : null;
  const slowestRoute = successfulRoutes.reduce<CrawledRoute | null>((slowest, route) => {
    if (route.responseTimeMs === null) {
      return slowest;
    }
    if (!slowest || (slowest.responseTimeMs ?? 0) < route.responseTimeMs) {
      return route;
    }
    return slowest;
  }, null);

  if (averageResponseMs !== null) {
    observations.push(`Average route response time across ${successfulRoutes.length} route(s): ${averageResponseMs} ms.`);
  }
  if (slowestRoute?.responseTimeMs && slowestRoute.responseTimeMs > 1500) {
    warnings.push(`Slowest crawled route responded in ${slowestRoute.responseTimeMs} ms (${slowestRoute.url}).`);
  }
  if (failedRoutes.length > 0) {
    warnings.push(`${failedRoutes.length} crawled route(s) failed to load.`);
  }

  const hasBlockedStep = timeline.some((step) => step.status === "blocked");
  const status: BrowserCollectorResult["status"] = !primaryRoute?.ok ? "failed" : hasBlockedStep ? "partial" : "completed";

  const pages: BrowserCollectedPage[] = crawledRoutes.map((route, index) => ({
    url: route.url,
    title: route.title ?? (index === 0 ? deterministic.document?.title ?? undefined : undefined),
    notes: [
      route.ok ? `Responded with HTTP ${route.status} in ${route.responseTimeMs} ms.` : `Failed to load${route.error ? ` (${route.error})` : ""}.`,
      index === 0 ? "Primary landing document captured by the lightweight crawler." : "Internal route traversed during flow validation.",
    ],
  }));

  const flows: BrowserCollectorFlow[] = [
    {
      id: "landing-page-load",
      label: "Landing Page Content & Navigation",
      status: primaryRoute?.ok ? "completed" : "blocked",
      summary: primaryRoute?.ok
        ? `Crawler loaded the landing document in ${primaryRoute.responseTimeMs} ms and extracted ${internalLinkCount} internal links.`
        : "The crawler could not load the landing document.",
      steps: ["Fetch primary document", "Extract <a> tags and internal links", "Verify document accessibility"],
    },
    {
      id: "internal-routing",
      label: "Internal Routing Validation",
      status: successfulRoutes.length > 1 ? "completed" : crawledRoutes.length > 1 ? "partial" : "not_run",
      summary: crawledRoutes.length > 1
        ? `Traversed ${crawledRoutes.length - 1} internal route(s); ${successfulRoutes.length - (primaryRoute?.ok ? 1 : 0)} responded successfully.`
        : "No internal routes were available to traverse.",
      steps: ["Extract internal paths", "Issue GET requests to internal routes", "Verify 2xx responses and capture timing"],
    },
    {
      id: "performance-probe",
      label: "Response Timing Probe",
      status: averageResponseMs !== null ? (averageResponseMs > 1500 ? "partial" : "completed") : "not_run",
      summary: averageResponseMs !== null
        ? `Average response time ${averageResponseMs} ms across ${successfulRoutes.length} route(s).`
        : "No successful responses were available to measure timing.",
      steps: ["Measure per-route latency", "Aggregate average response time", "Flag routes slower than 1500 ms"],
    },
  ];

  return {
    stage: "browser",
    status,
    mode: "crawler",
    startedAt,
    completedAt: new Date().toISOString(),
    runtime: {
      runner: "crawler",
      instruction: `Inspect ${payload.url} using a lightweight multi-route fetch crawler for flow and timing validation.`,
      startUrl: payload.url,
      finalUrl,
      taskId: "lightweight-crawler-task",
      workspaceDir: "outputs/crawler",
    },
    pages,
    flows,
    timeline,
    observations,
    warnings,
    screenshots: [],
    artifacts: {
      screenshotPaths: [],
      logPaths: [],
    },
  };
}

export async function collectBrowserEvidence(payload: AuditRequestPayload, deterministic: DeterministicCollectorResult): Promise<BrowserCollectorResult> {
  const mode = getBrowserMode();

  if (mode === "webwright") {
    return buildWebwrightResult(payload, deterministic);
  }

  if (mode === "playwright") {
    return buildCrawlerResult(payload, deterministic);
  }

  return buildBaseResult(
    payload,
    deterministic,
    "stub",
    "browser_collector_not_configured",
    [
      "Interactive browser evidence is not enabled in this workspace yet.",
      "This stage is the correct insertion point for Playwright or Webwright when dynamic flows must be inspected.",
    ],
  );
}