import { collectBrowserEvidence } from "./browserCollector";
import { collectDeterministicEvidence } from "./deterministicCollector";
import { synthesizeAudit } from "./auditSynthesis";
import { readPositiveIntegerEnv, withTimeout } from "./ioTimeouts";
import { CostTracker, calculateModelCost } from "./harness/ObservabilityTelemetry";
import type {
  AuditEvidenceBundle,
  AuditHarnessAttempt,
  AuditHarnessCheckStatus,
  AuditHarnessGovernance,
  AuditHarnessQualityGate,
  AuditHarnessRun,
  AuditHarnessRunStatus,
  AuditHarnessSensorResult,
  AuditHarnessToolDefinition,
  AuditHarnessTraceEvent,
  AuditRequestPayload,
  AuditSynthesisResult,
  BrowserCollectorResult,
  DeterministicCollectorResult,
} from "../../shared/types/auditPipelineTypes";

/**
 * The audit pipeline always runs deterministic -> browser -> synthesis.
 * `browser` is mandatory: synthesis and the quality-gate sensors consume a
 * well-formed BrowserCollectorResult (even when it resolves to a skipped/stub
 * result), so dropping it would leave downstream code dereferencing undefined.
 */

export interface AuditHarnessConfig {
  aiProvider?: string;
  agentRouterApiKey?: string;
  openRouterApiKey?: string;
  nvidiaApiKey?: string;
  apiKey?: string;
  allowedModels?: string[];
}

interface AuditHarnessPolicy {
  policyVersion: string;
  retryCap: number;
  maxAttempts: number;
  maxSteps: number;
  warningBudget: number;
  tokenBudget: number;
  /** Dollar ceiling for the cost circuit breaker (CostTracker.budgetLimit is in USD). */
  costBudgetUsd: number;
  stepTimeoutMs: number;
}

interface AuditHarnessDependencies {
  collectDeterministicEvidence: (payload: AuditRequestPayload) => Promise<DeterministicCollectorResult>;
  collectBrowserEvidence: (payload: AuditRequestPayload, deterministic: DeterministicCollectorResult) => Promise<BrowserCollectorResult>;
  synthesizeAudit: (payload: AuditRequestPayload, evidence: AuditEvidenceBundle, config?: AuditHarnessConfig) => Promise<AuditSynthesisResult>;
  fetchLighthouse?: (url: string) => Promise<{ performance: number; accessibility: number; seo: number } | undefined>;
}

interface AttemptExecution {
  deterministic?: DeterministicCollectorResult;
  browser?: BrowserCollectorResult;
  synthesis?: AuditSynthesisResult;
  lighthouse?: { performance: number; accessibility: number; seo: number };
  evidence?: AuditEvidenceBundle;
  trace: AuditHarnessTraceEvent[];
  error?: string;
}

async function fetchLighthouse(url: string): Promise<{ performance: number; accessibility: number; seo: number } | undefined> {
  try {
    const key = process.env.VITE_PAGESPEED_API_KEY || process.env.PAGESPEED_API_KEY;
    const urlParam = encodeURIComponent(url);
    const categoryParams = "&category=performance&category=accessibility&category=seo";
    const reqUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${urlParam}${categoryParams}&strategy=mobile${key ? `&key=${encodeURIComponent(key)}` : ""}`;
    const res = await fetch(reqUrl);
    if (!res.ok) return undefined;
    const data = await res.json();
    const categories = data.lighthouseResult?.categories || {};
    const performanceScore = categories.performance?.score;
    const accessibilityScore = categories.accessibility?.score;
    const seoScore = categories.seo?.score;
    if (
      typeof performanceScore !== "number" ||
      typeof accessibilityScore !== "number" ||
      typeof seoScore !== "number"
    ) {
      return undefined;
    }
    return {
      performance: Math.round(performanceScore * 100),
      accessibility: Math.round(accessibilityScore * 100),
      seo: Math.round(seoScore * 100),
    };
  } catch {
    return undefined;
  }
}

const DEFAULT_POLICY: AuditHarnessPolicy = {
  policyVersion: "harness-p0.1",
  retryCap: 2,
  maxAttempts: 3,
  maxSteps: 12,
  warningBudget: 12,
  tokenBudget: 12000,
  costBudgetUsd: 1.0,
  stepTimeoutMs: readPositiveIntegerEnv("HARNESS_STEP_TIMEOUT_MS", 30000),
};

const DEFAULT_DEPENDENCIES: AuditHarnessDependencies = {
  collectDeterministicEvidence,
  collectBrowserEvidence,
  synthesizeAudit,
  fetchLighthouse,
};

function nowIso(): string {
  return new Date().toISOString();
}

function createRunId(): string {
  return `hrn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function durationMs(startedAtMs: number): number {
  return Math.max(0, Date.now() - startedAtMs);
}

/**
 * Builds a well-formed "skipped" browser evidence object. Used as a defensive
 * fallback so synthesis and the quality-gate sensors never dereference an
 * undefined browser result if the browser step did not execute for any reason.
 */
function createSkippedBrowserResult(payload: AuditRequestPayload, reason: string): BrowserCollectorResult {
  const ts = nowIso();
  return {
    stage: "browser",
    status: "skipped",
    mode: "stub",
    startedAt: ts,
    completedAt: ts,
    runtime: {
      runner: "stub",
      instruction: `Browser collection skipped: ${reason}`,
      startUrl: payload.url,
    },
    pages: [],
    flows: [],
    timeline: [],
    observations: [],
    warnings: [`Browser evidence unavailable: ${reason}`],
    screenshots: [],
    artifacts: { screenshotPaths: [], logPaths: [] },
    reason,
  };
}

function createFailedDeterministicResult(payload: AuditRequestPayload, reason: string): DeterministicCollectorResult {
  const ts = nowIso();
  return {
    stage: "deterministic",
    status: "failed",
    startedAt: ts,
    completedAt: ts,
    targetUrl: payload.url,
    notes: ["Deterministic collector did not complete inside the harness boundary."],
    warnings: [],
    error: reason,
  };
}

function createHarnessFallbackSynthesis(payload: AuditRequestPayload, reason: string): AuditSynthesisResult {
  const isZh = payload.language === "zh-TW";

  return {
    provider: "fallback",
    queued: false,
    reason,
    summary: JSON.stringify({
      executiveSummary: isZh
        ? `稽核管線在受控邊界內降級完成：${reason}。已保留可用 evidence 與 harness trace，避免任務控制台無限等待。`
        : `The audit pipeline completed in controlled fallback mode: ${reason}. Available evidence and harness trace were preserved instead of leaving the console waiting indefinitely.`,
      deterministicFindings: [],
      browserFlowGaps: [],
      architectureRisks: [
        {
          issue: isZh ? "稽核步驟超時或失敗" : "Audit step timed out or failed",
          impact: isZh
            ? "本次報告可信度受限，需先確認目標站或模型供應商的連線狀態。"
            : "Report confidence is limited until the target site or model provider connectivity is confirmed.",
          severity: "high",
        },
      ],
      nextActions: [
        {
          action: isZh ? "檢查目標 URL 可連線性與 LLM provider 設定" : "Check target URL reachability and LLM provider settings",
          impact: isZh ? "恢復完整 evidence 收集與 synthesis。" : "Restores full evidence collection and synthesis.",
        },
      ],
    }),
  };
}

function getAttemptStrategy(index: number, policy: AuditHarnessPolicy): AuditHarnessAttempt["strategy"] {
  if (index === 1) {
    return "standard";
  }

  if (index <= policy.retryCap + 1) {
    return "retry_same_contract";
  }

  return "pivot_after_retries";
}

async function traceStep<T>(
  trace: AuditHarnessTraceEvent[],
  attempt: number,
  stage: AuditHarnessTraceEvent["stage"],
  message: string,
  task: () => Promise<T>,
): Promise<T> {
  const startedAt = nowIso();
  const startedAtMs = Date.now();

  try {
    const value = await task();
    trace.push({
      id: `attempt-${attempt}-step-${trace.length + 1}`,
      attempt,
      stage,
      status: "passed",
      message,
      startedAt,
      completedAt: nowIso(),
      durationMs: durationMs(startedAtMs),
    });
    return value;
  } catch (error) {
    trace.push({
      id: `attempt-${attempt}-step-${trace.length + 1}`,
      attempt,
      stage,
      status: "failed",
      message,
      startedAt,
      completedAt: nowIso(),
      durationMs: durationMs(startedAtMs),
    });
    throw error;
  }
}

function buildToolRegistry(): AuditHarnessToolDefinition[] {
  const targetSchema = {
    type: "object",
    required: ["url"],
    properties: {
      url: { type: "string", format: "uri" },
      goals: { type: "array", items: { type: "string" } },
      stack: { type: "array", items: { type: "string" } },
      language: { type: "string" },
    },
  };

  return [
    {
      id: "deterministic_collector",
      name: "Deterministic Evidence Collector",
      description: "Fetches the target document and extracts stable HTML, SEO, header, and timing signals.",
      inputSchema: targetSchema,
      enabled: true,
    },
    {
      id: "browser_collector",
      name: "Browser Flow Sensor",
      description: "Validates lightweight browser or Webwright flow evidence and records runtime gates.",
      inputSchema: targetSchema,
      enabled: true,
    },
    {
      id: "audit_synthesis",
      name: "Evidence-Grounded Synthesis",
      description: "Turns collected evidence into the final report while preserving fallback mode when model access is unavailable.",
      inputSchema: {
        type: "object",
        required: ["request", "evidence"],
        properties: {
          request: targetSchema,
          evidence: { type: "object" },
        },
      },
      enabled: true,
    },
  ];
}

function createSensor(
  id: string,
  label: string,
  status: AuditHarnessCheckStatus,
  severity: AuditHarnessSensorResult["severity"],
  observedValue: string,
  details: string,
  threshold?: string,
): AuditHarnessSensorResult {
  return {
    id,
    label,
    status,
    severity,
    observedValue,
    threshold,
    details,
  };
}

function getTotalWarningCount(evidence: AuditEvidenceBundle): number {
  return evidence.deterministic.warnings.length + evidence.browser.warnings.length;
}

interface SensorEvaluator {
  id: string;
  evaluate: (execution: AttemptExecution, policy: AuditHarnessPolicy, stepsUsed: number) => AuditHarnessSensorResult | AuditHarnessSensorResult[];
}

const sensorRegistry: SensorEvaluator[] = [
  {
    id: "deterministic_collector",
    evaluate: (execution) => {
      if (!execution.deterministic) {
        return createSensor(
          "deterministic_collector",
          "Deterministic collector",
          "failed",
          "critical",
          "not_run",
          "The deterministic collector did not return a result.",
          "completed"
        );
      }
      return createSensor(
        "deterministic_collector",
        "Deterministic collector",
        execution.deterministic.status === "completed" ? "passed" : "failed",
        execution.deterministic.status === "completed" ? "low" : "critical",
        execution.deterministic.status,
        execution.deterministic.status === "completed"
          ? "The target document was fetched and parsed into stable evidence."
          : execution.deterministic.error ?? "The target document could not be fetched.",
        "completed"
      );
    }
  },
  {
    id: "browser_collector",
    evaluate: (execution) => {
      if (!execution.browser) {
        return createSensor(
          "browser_collector",
          "Browser collector",
          "failed",
          "high",
          "not_run",
          "The browser collector did not return a result.",
          "completed|partial|skipped"
        );
      }
      const browserStatus = execution.browser.status;
      const status: AuditHarnessCheckStatus = browserStatus === "failed" ? "failed" : browserStatus === "completed" ? "passed" : "warning";
      return createSensor(
        "browser_collector",
        "Browser collector",
        status,
        status === "failed" ? "high" : status === "warning" ? "medium" : "low",
        `${browserStatus}/${execution.browser.mode}`,
        browserStatus === "completed"
          ? "Runtime flow evidence completed without blocked collector status."
          : execution.browser.reason ?? "Runtime evidence is available but not fully complete.",
        "completed"
      );
    }
  },
  {
    id: "runtime_gate",
    evaluate: (execution) => {
      const blockedStep = execution.browser?.timeline?.find((step) => step.status === "blocked");
      const partialStep = execution.browser?.timeline?.find((step) => step.status === "partial" || step.status === "not_run");

      if (blockedStep || partialStep) {
        const step = blockedStep ?? partialStep;
        return createSensor(
          "runtime_gate",
          "Runtime gate",
          "warning",
          blockedStep ? "high" : "medium",
          `${step?.label ?? "unknown"}:${step?.status ?? "unknown"}`,
          step?.detail ?? "A browser timeline gate requires follow-up before this run can be treated as full coverage.",
          "all timeline steps completed"
        );
      }
      return createSensor(
        "runtime_gate",
        "Runtime gate",
        execution.browser?.timeline?.length ? "passed" : "warning",
        execution.browser?.timeline?.length ? "low" : "medium",
        execution.browser?.timeline?.length ? "all_clear" : "no_timeline",
        execution.browser?.timeline?.length
          ? "No blocked browser timeline step was found."
          : "No executable browser timeline was attached to this run.",
        "no blocked steps"
      );
    }
  },
  {
    id: "synthesis_summary",
    evaluate: (execution) => {
      const summary = execution.synthesis?.summary?.trim() ?? "";
      return createSensor(
        "synthesis_summary",
        "Synthesis summary",
        summary ? "passed" : "failed",
        summary ? "low" : "high",
        summary ? `${summary.length} chars` : "empty",
        summary
          ? "The synthesis step returned report-ready content."
          : execution.synthesis?.reason ?? "The synthesis step did not produce a report summary.",
        "non-empty summary"
      );
    }
  },
  {
    id: "attempt_error",
    evaluate: (execution) => {
      if (!execution.error) {
        return [];
      }

      return createSensor(
        "attempt_error",
        "Attempt error",
        "failed",
        "critical",
        "error",
        execution.error,
        "none"
      );
    }
  },
  {
    id: "lighthouse",
    evaluate: (execution) => {
      if (!execution.lighthouse) return [];
      const { performance, accessibility, seo } = execution.lighthouse;
      return [
        createSensor(
          "lighthouse_performance",
          "Lighthouse Performance",
          performance >= 90 ? "passed" : "warning",
          performance >= 90 ? "low" : (performance >= 50 ? "medium" : "high"),
          String(performance),
          `PageSpeed Performance score is ${performance}.`,
          ">=90"
        ),
        createSensor(
          "lighthouse_accessibility",
          "Lighthouse Accessibility",
          accessibility >= 90 ? "passed" : "warning",
          accessibility >= 90 ? "low" : (accessibility >= 80 ? "medium" : "high"),
          String(accessibility),
          `PageSpeed Accessibility score is ${accessibility}.`,
          ">=90"
        ),
        createSensor(
          "lighthouse_seo",
          "Lighthouse SEO",
          seo >= 90 ? "passed" : "warning",
          seo >= 90 ? "low" : (seo >= 80 ? "medium" : "high"),
          String(seo),
          `PageSpeed SEO score is ${seo}.`,
          ">=90"
        )
      ];
    }
  },
  {
    id: "warning_budget",
    evaluate: (execution, policy) => {
      const totalWarnings = execution.evidence ? getTotalWarningCount(execution.evidence) : 0;
      return createSensor(
        "warning_budget",
        "Evidence warning budget",
        totalWarnings <= policy.warningBudget ? "passed" : "warning",
        totalWarnings <= policy.warningBudget ? "low" : "medium",
        String(totalWarnings),
        totalWarnings <= policy.warningBudget
          ? "Evidence warnings are within the configured review budget."
          : "Evidence warnings exceeded the review budget and should be triaged before handoff.",
        `<=${policy.warningBudget}`
      );
    }
  },
  {
    id: "step_budget",
    evaluate: (_execution, policy, stepsUsed) => {
      return createSensor(
        "step_budget",
        "Step budget",
        stepsUsed <= policy.maxSteps ? "passed" : "failed",
        stepsUsed <= policy.maxSteps ? "low" : "critical",
        String(stepsUsed),
        stepsUsed <= policy.maxSteps
          ? "The run stayed within the maximum deterministic step budget."
          : "The circuit breaker step budget was exceeded.",
        `<=${policy.maxSteps}`
      );
    }
  }
];

function buildSensors(execution: AttemptExecution, policy: AuditHarnessPolicy, stepsUsed: number): AuditHarnessSensorResult[] {
  return sensorRegistry.flatMap((sensor) => sensor.evaluate(execution, policy, stepsUsed));
}

function buildQualityGate(checks: AuditHarnessSensorResult[]): AuditHarnessQualityGate {
  const failedCount = checks.filter((check) => check.status === "failed").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const passedCount = checks.filter((check) => check.status === "passed").length;
  const status: AuditHarnessRunStatus = failedCount > 0 ? "failed" : warningCount > 0 ? "manual_review" : "passed";

  return {
    status,
    checks,
    passedCount,
    warningCount,
    failedCount,
  };
}

function getRetryReason(qualityGate: AuditHarnessQualityGate, error?: string): string {
  if (error) {
    return error;
  }

  const firstFailed = qualityGate.checks.find((check) => check.status === "failed");

  return firstFailed ? `${firstFailed.label}: ${firstFailed.observedValue}` : "quality_gate_failed";
}

function estimateTokenSpend(payload: AuditRequestPayload, execution: AttemptExecution): number {
  const summaryLength = execution.synthesis?.summary?.length ?? 0;
  const evidenceLength = execution.evidence
    ? JSON.stringify({
        url: payload.url,
        deterministic: {
          status: execution.evidence.deterministic.status,
          warnings: execution.evidence.deterministic.warnings,
          notes: execution.evidence.deterministic.notes,
        },
        browser: {
          status: execution.evidence.browser.status,
          mode: execution.evidence.browser.mode,
          warnings: execution.evidence.browser.warnings,
          observations: execution.evidence.browser.observations,
        },
      }).length
    : 0;

  return Math.ceil((summaryLength + evidenceLength) / 4);
}

async function executeAttempt(
  payload: AuditRequestPayload,
  config: AuditHarnessConfig | undefined,
  dependencies: AuditHarnessDependencies,
  policy: AuditHarnessPolicy,
  index: number,
  retryReason: string | undefined,
): Promise<{ attempt: AuditHarnessAttempt; execution: AttemptExecution; qualityGate: AuditHarnessQualityGate; estimatedTokenSpend: number; traceEvents: AuditHarnessTraceEvent[] }> {
  const startedAt = nowIso();
  const startedAtMs = Date.now();
  const execution: AttemptExecution = {
    trace: [],
  };

  try {
    execution.deterministic = await traceStep(
      execution.trace,
      index,
      "tool_call",
      "Run deterministic collector",
      () => withTimeout(
        () => dependencies.collectDeterministicEvidence(payload),
        policy.stepTimeoutMs,
        "Deterministic collector",
      ),
    );

    // Analyzing Phase: Lighthouse Sensor. Only run when a PageSpeed key is
    // configured and only on the first attempt — it is an external call that
    // does not change between retries (it measures the target site, not our run),
    // so re-running it on every retry just wastes quota.
    const pagespeedKey = process.env.VITE_PAGESPEED_API_KEY || process.env.PAGESPEED_API_KEY;
    if (pagespeedKey && index === 1) {
      execution.lighthouse = await traceStep(
        execution.trace,
        index,
        "tool_call",
        "Run Lighthouse PageSpeed analysis",
        () => withTimeout(
          dependencies.fetchLighthouse ? () => dependencies.fetchLighthouse!(payload.url) : () => Promise.resolve(undefined),
          policy.stepTimeoutMs,
          "Lighthouse PageSpeed analysis",
        ),
      );
    }

    if (execution.deterministic) {
      execution.browser = await traceStep(
        execution.trace,
        index,
        "tool_call",
        "Run browser flow collector",
        () => withTimeout(
          () => dependencies.collectBrowserEvidence(payload, execution.deterministic as DeterministicCollectorResult),
          policy.stepTimeoutMs,
          "Browser collector",
        ),
      );
    }

    execution.evidence = {
      deterministic: execution.deterministic,
      // Defensive: guarantee a well-formed browser object even if the browser
      // step returned nothing, so synthesis and the sensors below can never
      // read properties of undefined.
      browser: execution.browser ?? createSkippedBrowserResult(payload, "browser_step_not_executed"),
    };

    execution.synthesis = await traceStep(
      execution.trace,
      index,
      "tool_call",
      "Run evidence-grounded synthesis",
      () => withTimeout(
        () => dependencies.synthesizeAudit(payload, execution.evidence as AuditEvidenceBundle, config),
        policy.stepTimeoutMs,
        "Audit synthesis",
      ),
    );
  } catch (error) {
    execution.error = error instanceof Error ? error.message : "Unexpected harness attempt error";
    execution.deterministic ??= createFailedDeterministicResult(payload, execution.error);
    execution.browser ??= createSkippedBrowserResult(payload, execution.error);
    execution.evidence ??= {
      deterministic: execution.deterministic,
      browser: execution.browser,
    };
    execution.synthesis ??= createHarnessFallbackSynthesis(payload, execution.error);
  }


  const sensors = buildSensors(execution, policy, execution.trace.length);
  const qualityGate = buildQualityGate(sensors);
  const estimatedTokenSpend = estimateTokenSpend(payload, execution);

  execution.trace.push({
    id: `attempt-${index}-step-${execution.trace.length + 1}`,
    attempt: index,
    stage: "quality_gate",
    status: qualityGate.status === "passed" ? "passed" : qualityGate.status === "manual_review" ? "warning" : "failed",
    message: `Quality gate ${qualityGate.status}`,
    startedAt: nowIso(),
    completedAt: nowIso(),
    durationMs: 0,
  });

  const attempt: AuditHarnessAttempt = {
    index,
    strategy: getAttemptStrategy(index, policy),
    status: qualityGate.status,
    startedAt,
    completedAt: nowIso(),
    durationMs: durationMs(startedAtMs),
    retryReason,
    error: execution.error,
    sensors,
    trace: execution.trace,
  };

  return {
    attempt,
    execution,
    qualityGate,
    estimatedTokenSpend,
    traceEvents: execution.trace,
  };
}

function buildGovernance(policy: AuditHarnessPolicy, attempts: AuditHarnessAttempt[], estimatedTokenSpend: number, circuitBreakerReason?: string): AuditHarnessGovernance {
  const stepsUsed = attempts.reduce((total, attempt) => total + attempt.trace.length, 0);

  return {
    retryCap: policy.retryCap,
    maxAttempts: policy.maxAttempts,
    retriesUsed: Math.max(0, attempts.length - 1),
    maxSteps: policy.maxSteps,
    stepsUsed,
    circuitBreakerTripped: Boolean(circuitBreakerReason) || stepsUsed > policy.maxSteps,
    circuitBreakerReason: circuitBreakerReason ?? (stepsUsed > policy.maxSteps ? "max_step_budget_exceeded" : undefined),
    tokenBudget: policy.tokenBudget,
    estimatedTokenSpend,
  };
}

export async function runAuditHarness(
  payload: AuditRequestPayload,
  config?: AuditHarnessConfig,
  options?: {
    dependencies?: Partial<AuditHarnessDependencies>;
    policy?: Partial<AuditHarnessPolicy>;
  },
): Promise<{ synthesis: AuditSynthesisResult; evidence: AuditEvidenceBundle; harness: AuditHarnessRun }> {
  const policy = {
    ...DEFAULT_POLICY,
    ...options?.policy,
  };
  const dependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...options?.dependencies,
  };
  const runId = createRunId();
  const startedAt = nowIso();
  const startedAtMs = Date.now();
  const attempts: AuditHarnessAttempt[] = [];
  const pivots: AuditHarnessRun["pivots"] = [];
  let latestExecution: AttemptExecution | null = null;
  let latestQualityGate: AuditHarnessQualityGate | null = null;
  
  // Observability cost tracker (budget is in USD, not tokens)
  let costTracker = new CostTracker(policy.costBudgetUsd);
  let retryReason: string | undefined;
  let circuitBreakerReason: string | undefined;

  for (let index = 1; index <= policy.maxAttempts; index += 1) {
    const result = await executeAttempt(payload, config, dependencies, policy, index, retryReason);
    attempts.push(result.attempt);
    latestExecution = result.execution;
    latestQualityGate = result.qualityGate;
    
    // Add cost record for this attempt. Use the model synthesis actually reported
    // so the figure reflects reality (free models -> $0, fallback path -> $0)
    // instead of always pricing a paid default model that may never have run.
    const activeModel = result.execution.synthesis?.model
      || config?.allowedModels?.[0]
      || "deterministic-fallback:free";
    const attemptCost = calculateModelCost(activeModel, result.estimatedTokenSpend * 2, result.estimatedTokenSpend);
    costTracker = costTracker.add({
      model: activeModel,
      inputTokens: result.estimatedTokenSpend * 2,
      outputTokens: result.estimatedTokenSpend,
      costUsd: attemptCost
    });

    if (result.qualityGate.status !== "failed" || index >= policy.maxAttempts) {
      break;
    }

    const governance = buildGovernance(policy, attempts, costTracker.records.reduce((a, b) => a + b.outputTokens, 0));

    if (governance.circuitBreakerTripped || costTracker.overBudget) {
      circuitBreakerReason = governance.circuitBreakerReason || "budget_exceeded";
      console.warn(`[CircuitBreaker] Tripped! Reason: ${circuitBreakerReason}. Total Cost: $${costTracker.totalCost.toFixed(4)}`);
      break;
    }

    retryReason = getRetryReason(result.qualityGate, result.execution.error);

    pivots.push({
      afterAttempt: index,
      reason: retryReason,
      nextStrategy: index + 1 >= policy.maxAttempts ? "pivot_after_retries" : "retry_same_contract",
    });
  }

  if (!latestExecution?.evidence || !latestExecution.synthesis || !latestQualityGate) {
    throw new Error("HARNESS_NO_RESULT");
  }

  const finalStatus = latestQualityGate.status;
  const handoffRequired = finalStatus !== "passed";
  const handoffReason = finalStatus === "failed"
    ? "quality_gate_failed_after_retry_budget"
    : finalStatus === "manual_review"
      ? "quality_gate_requires_manual_review"
      : undefined;

  // Retrospective report generation
  const retrospective = `
## Audit Retrospective [${runId}]
- **Status**: ${finalStatus.toUpperCase()}
- **Duration**: ${durationMs(startedAtMs)}ms
- **Attempts**: ${attempts.length}
- **Pivots**: ${pivots.length}
- **Cost**: $${costTracker.totalCost.toFixed(4)}
- **Failure Summary**: ${latestExecution?.error || "None"}

### Debug Trace
${attempts.map(a => `Attempt ${a.index}:\n` + a.trace.map(t => `  [${t.stage}] ${t.status}: ${t.message}`).join('\n')).join('\n')}
  `.trim();

  const harness: AuditHarnessRun = {
    runId,
    status: finalStatus,
    startedAt,
    completedAt: nowIso(),
    durationMs: durationMs(startedAtMs),
    policyVersion: policy.policyVersion,
    toolRegistry: buildToolRegistry(),
    attempts,
    qualityGate: latestQualityGate,
    governance: buildGovernance(policy, attempts, costTracker.records.reduce((a, b) => a + b.outputTokens, 0), circuitBreakerReason),
    pivots,
    handoffRequired,
    handoffReason,
    retrospective,
  };

  return {
    synthesis: latestExecution.synthesis,
    evidence: latestExecution.evidence,
    harness,
  };
}
