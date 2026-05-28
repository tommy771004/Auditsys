export interface AuditRequestPayload {
  url: string;
  companyName?: string;
  contactEmail?: string;
  goals?: string[];
  stack?: string[];
  teamSize?: string;
  notes?: string;
}

export interface DeterministicDocumentEvidence {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robots: string | null;
  lang: string | null;
  counts: {
    scripts: number;
    stylesheets: number;
    images: number;
    imagesMissingAlt: number;
    structuredDataBlocks: number;
    headings: number;
    internalLinks: number;
    externalLinks: number;
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
  };
  document?: DeterministicDocumentEvidence;
  notes: string[];
  warnings: string[];
  error?: string;
}

export interface BrowserCollectorRuntime {
  runner: "stub" | "playwright" | "webwright";
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
  mode: "stub" | "playwright" | "webwright";
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
}

export interface AuditSynthesisResult {
  provider: "gemini" | "fallback";
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
  };
}