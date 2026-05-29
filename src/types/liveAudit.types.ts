/**
 * Type contracts for the Live Execution Engine.
 *
 * These interfaces intentionally mirror real-world API payloads:
 *  - `PageSpeedResult` maps the Google PageSpeed Insights (Lighthouse) response.
 *  - `LiveDOMIssue` mirrors what the backend HTML parser returns.
 *  - `SSELog` is one Server-Sent Event frame emitted by `/api/scan/stream`.
 *  - `ExecutionState` is the finite-state of a single live scan run.
 */

/** Real Core Web Vitals distilled from the Google PageSpeed Insights API. */
export interface PageSpeedResult {
  /** Lighthouse performance score, 0-100. */
  score: number;
  /** First Contentful Paint, human-readable (e.g. "1.2 s"). */
  FCP: string;
  /** Largest Contentful Paint, human-readable (e.g. "2.4 s"). */
  LCP: string;
  /** Cumulative Layout Shift, human-readable (e.g. "0.01"). */
  CLS: string;
}

/** A single SEO/accessibility defect located by the backend HTML parser. */
export type DOMIssueType = "missing_alt" | "multiple_h1" | "invalid_canonical";

export interface LiveDOMIssue {
  /** The offending element selector / tag (e.g. "img", "h1#hero"). */
  element: string;
  /** Category of the detected problem. */
  issueType: DOMIssueType;
  /** Raw HTML snippet returned by the backend, rendered verbatim in the UI. */
  snippet: string;
  /**
   * Optional zero-based line index inside `snippet` that triggered the issue.
   * Used to paint the `bg-red-500/20` overlay on the exact offending line.
   */
  highlightLine?: number;
}

export type SSELogLevel = "info" | "warn" | "error" | "success";

/** One real-time log frame received over the EventSource connection. */
export interface SSELog {
  id: string;
  /** Epoch milliseconds, supplied by the server. */
  timestamp: number;
  level: SSELogLevel;
  message: string;
}

/** One internal route traversed by the backend crawler during a live scan. */
export interface LiveScanRoute {
  url: string;
  status: number | null;
  responseTimeMs: number | null;
  ok: boolean;
}

/** Heuristic 0-100 scores derived from the collected evidence. */
export interface LiveScanScores {
  overall: number;
  performance: number;
  seo: number;
  architecture: number;
}

/** Asset volume parsed from the landing document. */
export interface LiveScanAssetBreakdown {
  scripts: number;
  stylesheets: number;
  images: number;
  imagesMissingAlt: number;
}

/** Boolean/quantitative SEO hygiene signals for the live summary chart. */
export interface LiveScanSeoSignals {
  hasTitle: boolean;
  hasMetaDescription: boolean;
  hasCanonical: boolean;
  hasViewport: boolean;
  h1Count: number;
  structuredDataBlocks: number;
  openGraphTags: number;
}

/**
 * Structured payload delivered on the `done` SSE frame. Powers the charts and
 * detailed copy rendered after a live scan completes.
 */
export interface LiveScanSummary {
  finalUrl: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  server: string | null;
  scores: LiveScanScores;
  assets: LiveScanAssetBreakdown;
  seo: LiveScanSeoSignals;
  routes: LiveScanRoute[];
  averageRouteResponseMs: number | null;
  domIssueCount: number;
  warnings: string[];
  browserStatus: string;
  browserMode: string;
}

/** Core Web Vitals "good / needs improvement / poor" bucket. */
export type CruxRating = "good" | "needs-improvement" | "poor";

/** A single Core Web Vital sourced from the Chrome UX Report (field/RUM data). */
export interface CruxMetric {
  /** 75th-percentile value: milliseconds for timing metrics, unitless for CLS. null = no data. */
  p75: number | null;
  rating: CruxRating | null;
  /** [good, needs-improvement, poor] density fractions (0-1) from the CrUX histogram. */
  distribution?: [number, number, number];
}

/** Weekly p75 time-series for one metric from the CrUX History API (oldest → newest). */
export interface CruxHistorySeries {
  p75s: (number | null)[];
}

/**
 * Real-user Core Web Vitals from the Chrome UX Report APIs, served by the
 * `/api/scan/crux` backend endpoint. `hasData` is false when CrUX has no field
 * data for the target (common for low-traffic sites) or the key is unconfigured —
 * the frontend then falls back to a PageSpeed lab measurement.
 */
export interface CruxResult {
  hasData: boolean;
  /** "crux_not_configured" | "no_field_data" | "error" when hasData is false. */
  reason?: string;
  /** Which scope returned data — page-level "url" or site-wide "origin". */
  scope?: "url" | "origin";
  /** Human-readable collection window, e.g. "2026-04-01 → 2026-04-28". */
  collectionPeriod?: string;
  metrics: {
    lcp: CruxMetric;
    inp: CruxMetric;
    cls: CruxMetric;
    fcp: CruxMetric;
  };
  history: {
    lcp: CruxHistorySeries;
    inp: CruxHistorySeries;
    cls: CruxHistorySeries;
  };
}

export type ExecutionStatus =
  | "idle"
  | "connecting"
  | "scanning"
  | "analyzing"
  | "complete"
  | "error";

export interface ExecutionState {
  status: ExecutionStatus;
  targetUrl: string;
}

/** Public surface of the `useRealTimeAudit` hook. */
export interface UseRealTimeAuditResult {
  state: ExecutionState;
  logs: SSELog[];
  domIssues: LiveDOMIssue[];
  /** Structured scan summary delivered on the `done` frame; null until complete. */
  summary: LiveScanSummary | null;
  /** Populated when the connection fails or the server reports an error. */
  errorMessage: string | null;
  startScan: (targetUrl: string) => void;
  stopScan: () => void;
}
