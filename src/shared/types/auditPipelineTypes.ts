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
  /** HTTP status of the crawled route; null when the route failed to load. */
  status?: number | null;
  /** Route response time in milliseconds; null when the route failed to load. */
  responseTimeMs?: number | null;
  /** Human-readable observations only — never parse structured data out of these. */
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
  provider: "openrouter" | "agentrouter" | "fallback" | "nvidia";
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
  enabled: boolean;
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

export type AuditFindingCategory =
  | "slow_lcp"
  | "missing_meta"
  | "low_contrast"
  | "insecure_protocol"
  | "blocked_resource"
  | "heavy_image"
  | "sparse_content"
  | "other";

export interface AuditFinding {
  issue: string;
  impact: string;
  severity?: string;
  affectedMetric?: string | null;
  explanation?: string;
  category?: AuditFindingCategory;
}

export interface AuditHarnessRun {
  runId: string;
  status: AuditHarnessRunStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  policyVersion: string;
  toolRegistry: AuditHarnessToolDefinition[];
  attempts: AuditHarnessAttempt[];
  qualityGate: AuditHarnessQualityGate;
  governance: AuditHarnessGovernance;
  pivots: AuditHarnessPivot[];
  handoffRequired: boolean;
  handoffReason?: string;
  retrospective?: string;
}

const CATEGORY_KEYWORDS: Record<AuditFindingCategory, { zh: string[]; en: string[] }> = {
  slow_lcp: {
    zh: ["最大內容繪製", "lcp", "載入速度", "主畫面載入"],
    en: ["largest contentful paint", "lcp", "loading speed", "main content load"],
  },
  missing_meta: {
    zh: ["meta description", "meta 描述", "描述標籤", "搜尋摘要"],
    en: ["meta description", "description tag", "search snippet"],
  },
  low_contrast: {
    zh: ["對比度", "文字對比", "可讀性", "色彩對比"],
    en: ["contrast", "text contrast", "readability", "color contrast"],
  },
  insecure_protocol: {
    zh: ["不安全協定", "http", "混合內容", "ssl", "tls", "憑證"],
    en: ["insecure protocol", "http", "mixed content", "ssl", "tls", "certificate"],
  },
  blocked_resource: {
    zh: ["被封鎖資源", "載入失敗", "403", "404", "robots", "阻擋"],
    en: ["blocked resource", "load failed", "403", "404", "robots", "blocked"],
  },
  heavy_image: {
    zh: ["圖片過大", "圖片大小", "影像優化", "webp", "壓縮"],
    en: ["heavy image", "image size", "image optimization", "webp", "compression"],
  },
  sparse_content: {
    zh: ["內容稀疏", "字數過少", "薄內容", "內容深度"],
    en: ["sparse content", "thin content", "low word count", "content depth"],
  },
  other: {
    zh: [],
    en: [],
  },
};

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export function categorizeFinding(finding: { issue: string; affectedMetric?: string | null }): AuditFindingCategory {
  const metric = finding.affectedMetric?.toLowerCase();
  
  if (metric) {
    if (metric === "lcp" || metric === "largest-contentful-paint") return "slow_lcp";
    if (metric === "metadata" || metric === "meta") return "missing_meta";
    if (metric === "contrast" || metric === "color-contrast") return "low_contrast";
    if (metric === "protocol" || metric === "ssl" || metric === "tls") return "insecure_protocol";
    if (metric === "resource" || metric === "blocked") return "blocked_resource";
    if (metric === "image" || metric === "images") return "heavy_image";
    if (metric === "content" || metric === "text") return "sparse_content";
  }
  
  const issue = finding.issue;
  for (const [cat, langs] of Object.entries(CATEGORY_KEYWORDS)) {
    if (matchesKeywords(issue, langs.zh) || matchesKeywords(issue, langs.en)) {
      return cat as AuditFindingCategory;
    }
  }
  
  return "other";
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