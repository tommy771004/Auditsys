import type { SSELogLevel } from "./liveAudit.types";

export type NetworkResourceType =
  | "document" | "script" | "stylesheet" | "image" | "font" | "fetch" | "media" | "other";

/** One network request observed for the target page. */
export interface NetworkResource {
  url: string;
  type: NetworkResourceType;
  /** Requesting URL — populated by the Playwright collector only. */
  initiator?: string;
  startMs: number;
  durationMs: number;
  transferBytes: number | null;
  encodedBytes: number | null;
  contentEncoding: string | null; // "gzip" | "br" | null
  contentType: string | null;
  isThirdParty: boolean;
  /** Head + synchronous (CSS, or script without async/defer). */
  renderBlocking: boolean;
  fromCache: boolean;
}

/** Page-level paint/CPU metrics — Playwright only; null when not measured. */
export interface NetworkPageMetrics {
  fcpMs: number | null;
  lcpMs: number | null;
  longTasksMs: number | null;
  mainThreadBusyMs: number | null;
}

export interface NetworkEvidence {
  collector: "playwright-real" | "fetch-probe";
  finalUrl: string;
  resources: NetworkResource[];
  page: NetworkPageMetrics;
  /** True when a resource cap was hit. */
  truncated: boolean;
  /** Honesty labels for dimensions the active collector could not measure. */
  notes: string[];
}

export type BottleneckCategory =
  | "waterfall" | "render-blocking" | "uncompressed" | "image-format" | "third-party" | "slow-resource";

export interface BottleneckFinding {
  severity: "critical" | "warning" | "info";
  target: string;          // file / API / host
  measuredMs: number | null;
  category: BottleneckCategory;
  diagnosis: string;       // zh-TW
  resolution: string;      // zh-TW
  /** True only when every figure in this finding traces to a real measurement. */
  measured: boolean;
}

export interface BottleneckLogLine {
  level: SSELogLevel;
  message: string;
}
