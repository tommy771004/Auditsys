import type { CruxResult } from "../../types/liveAudit.types";

// ── Security Posture Types ────────────────────────────────────────────────────

export type SecurityHeaderSeverity = "critical" | "high" | "medium" | "low" | "pass";

export interface SecurityHeaderFinding {
  header: string;
  present: boolean;
  value: string | null;
  severity: SecurityHeaderSeverity;
  /** 若 value 存在但設定有誤，此欄位說明誤設原因 */
  misconfiguration?: string;
  /** 修補建議摘要（簡短說明） */
  remediationHint: string;
}

export interface SecurityRemediationSnippets {
  vercel: string;
  nginx: string;
  aspnet: string;
}

export type DetectedStack = "vercel" | "nginx" | "aspnet" | "cloudflare" | "unknown";

export interface SecurityPostureResult {
  /** 綜合評分 0-100，依嚴重性加權扣分 */
  score: number;
  /** A=90+, B=75+, C=55+, D=35+, F=0+ */
  grade: "A" | "B" | "C" | "D" | "F";
  findings: SecurityHeaderFinding[];
  detectedStack: DetectedStack;
  /** 平台專屬的修補程式碼片段 */
  remediationSnippets: SecurityRemediationSnippets;
}

export interface AuditRequestPayload {
  url: string;
  companyName?: string;
  contactEmail?: string;
  goals?: string[];
  stack?: string[];
  teamSize?: string;
  notes?: string;
  language?: string;
}

export interface DeterministicDocumentEvidence {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robots: string | null;
  lang: string | null;
  viewport: string | null;
  counts: {
    scripts: number;
    stylesheets: number;
    images: number;
    imagesMissingAlt: number;
    structuredDataBlocks: number;
    headings: number;
    h1: number;
    internalLinks: number;
    externalLinks: number;
    openGraphTags: number;
    preconnectHints: number;
  };
}

export interface DeterministicCollectorResult {
  stage: "deterministic";
  status: "completed" | "failed";
  startedAt: string;
  completedAt: string;
  targetUrl: string;
  finalUrl?: string;
  statusCode?: number;
  contentType?: string | null;
  responseTimeMs?: number;
  headers?: {
    cacheControl: string | null;
    server: string | null;
    poweredBy: string | null;
    // Security-critical response headers
    contentSecurityPolicy: string | null;
    strictTransportSecurity: string | null;
    xFrameOptions: string | null;
    xContentTypeOptions: string | null;
  };
  /** 安全防禦態勢評估結果（由 securityPostureCollector 產生） */
  securityPosture?: SecurityPostureResult;
  document?: DeterministicDocumentEvidence;
  notes: string[];
  warnings: string[];
  error?: string;
}

export interface BrowserCollectorRuntime {
  runner: "stub" | "playwright" | "crawler" | "webwright";
  instruction: string;
  startUrl: string;
  finalUrl?: string;
  taskId?: string;
  workspaceDir?: string;
}

export interface BrowserCollectedPage {
  url: string;
  title?: string;
  screenshotPath?: string;
  notes: string[];
}

export interface BrowserCollectorFlow {
  id: string;
  label: string;
  status: "completed" | "partial" | "blocked" | "not_run";
  summary: string;
  steps: string[];
}

export interface BrowserCollectorTimelineStep {
  id: string;
  label: string;
  status: "completed" | "partial" | "blocked" | "not_run";
  detail?: string;
}

export interface BrowserCollectorArtifacts {
  reportPath?: string;
  trajectoryPath?: string;
  tracePath?: string;
  screenshotPaths: string[];
  logPaths: string[];
}

export interface BrowserCollectorResult {
  stage: "browser";
  status: "completed" | "partial" | "skipped" | "failed";
  mode: "stub" | "playwright" | "crawler" | "webwright";
  startedAt: string;
  completedAt: string;
  runtime: BrowserCollectorRuntime;
  pages: BrowserCollectedPage[];
  flows: BrowserCollectorFlow[];
  timeline?: BrowserCollectorTimelineStep[];
  observations: string[];
  warnings: string[];
  screenshots: string[];
  artifacts: BrowserCollectorArtifacts;
  reason?: string;
  error?: string;
}

export interface AuditEvidenceBundle {
  deterministic: DeterministicCollectorResult;
  browser: BrowserCollectorResult;
  /** Real-user Core Web Vitals (Chrome UX Report). Absent/`hasData:false` when unavailable. */
  crux?: CruxResult;
}

export interface AuditSynthesisResult {
  provider: "openrouter" | "fallback";
  queued: boolean;
  summary?: string;
  model?: string;
  reason?: string;
}

export interface AuditIntelligenceResult extends AuditSynthesisResult {
  generatedAt: string;
  request: AuditRequestPayload;
  evidence: AuditEvidenceBundle;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeAuditRequestPayload(payload: unknown): AuditRequestPayload {
  if (!isRecord(payload)) {
    return {
      url: "",
    };
  }

  return {
    url: toTrimmedString(payload.url),
    companyName: toTrimmedString(payload.companyName) || undefined,
    contactEmail: toTrimmedString(payload.contactEmail) || undefined,
    goals: toStringArray(payload.goals),
    stack: toStringArray(payload.stack),
    teamSize: toTrimmedString(payload.teamSize) || undefined,
    notes: toTrimmedString(payload.notes) || undefined,
    language: toTrimmedString(payload.language) || undefined,
  };
}