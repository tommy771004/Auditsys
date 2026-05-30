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
  };
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
}

export interface AuditSynthesisResult {
  provider: "openrouter" | "agentrouter" | "fallback";
  queued: boolean;
  summary?: string;
  model?: string;
  reason?: string;
}

export interface AuditIntelligenceResult extends AuditSynthesisResult {
  generatedAt: string;
  request: AuditRequestPayload;
  evidence: AuditEvidenceBundle;
  harness?: AuditHarnessRun;
}

export type AuditHarnessRunStatus = "passed" | "manual_review" | "failed";

export type AuditHarnessCheckStatus = "passed" | "warning" | "failed";

export type AuditHarnessTraceStage =
  | "input_validation"
  | "tool_call"
  | "sensor_check"
  | "quality_gate"
  | "retry"
  | "pivot"
  | "handoff"
  | "complete";

export interface AuditHarnessToolDefinition {
  id: "deterministic_collector" | "browser_collector" | "audit_synthesis";
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  middleware: string[];
  enabled: boolean;
}

export interface AuditHarnessMiddlewareDefinition {
  id: string;
  name: string;
  description: string;
}

export interface AuditHarnessTraceEvent {
  id: string;
  attempt: number;
  stage: AuditHarnessTraceStage;
  status: "running" | "passed" | "warning" | "failed";
  message: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface AuditHarnessSensorResult {
  id: string;
  label: string;
  status: AuditHarnessCheckStatus;
  severity: "low" | "medium" | "high" | "critical";
  observedValue: string;
  threshold?: string;
  details: string;
}

export interface AuditHarnessQualityGate {
  status: AuditHarnessRunStatus;
  checks: AuditHarnessSensorResult[];
  passedCount: number;
  warningCount: number;
  failedCount: number;
}

export interface AuditHarnessAttempt {
  index: number;
  strategy: "standard" | "retry_same_contract" | "pivot_after_retries";
  status: AuditHarnessRunStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  retryReason?: string;
  error?: string;
  sensors: AuditHarnessSensorResult[];
  trace: AuditHarnessTraceEvent[];
}

export interface AuditHarnessPivot {
  afterAttempt: number;
  reason: string;
  nextStrategy: AuditHarnessAttempt["strategy"];
  rollbackCheckpointId: string;
}

export interface AuditHarnessRollback {
  checkpointId: string;
  supported: boolean;
  action: "metadata_checkpoint";
  reason: string;
}

export interface AuditHarnessGovernance {
  retryCap: number;
  maxAttempts: number;
  retriesUsed: number;
  maxSteps: number;
  stepsUsed: number;
  circuitBreakerTripped: boolean;
  circuitBreakerReason?: string;
  tokenBudget: number;
  estimatedTokenSpend: number;
}

export interface AuditHarnessRun {
  runId: string;
  status: AuditHarnessRunStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  policyVersion: string;
  toolRegistry: AuditHarnessToolDefinition[];
  middleware: AuditHarnessMiddlewareDefinition[];
  attempts: AuditHarnessAttempt[];
  qualityGate: AuditHarnessQualityGate;
  governance: AuditHarnessGovernance;
  pivots: AuditHarnessPivot[];
  rollback: AuditHarnessRollback;
  handoffRequired: boolean;
  handoffReason?: string;
  retrospective?: string;
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
