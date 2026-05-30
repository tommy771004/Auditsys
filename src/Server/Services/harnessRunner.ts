import { collectBrowserEvidence } from "./browserCollector";
import { collectDeterministicEvidence } from "./deterministicCollector";
import { synthesizeAudit } from "./auditSynthesis";
import { AgentIdentityManager, CredentialsVault } from "./harness/AgentIdentity";
import { AgentSandbox, MiddlewareHandler } from "./harness/AgentSandbox";
import { ExecutionTracer, CostTracker, calculateModelCost, CostRecord } from "./harness/ObservabilityTelemetry";
import { ContextManager } from "./harness/ContextManager";
import { AgentOrchestrator } from "./harness/AgentOrchestrator";
import { SkillManager } from "./harness/SkillManager";
import { GuardrailKnowledgeBase } from "./harness/GuardrailKnowledgeBase";
import { FlywheelCollector } from "./harness/FlywheelCollector";
import type {
  AuditEvidenceBundle,
  AuditHarnessAttempt,
  AuditHarnessCheckStatus,
  AuditHarnessGovernance,
  AuditHarnessMiddlewareDefinition,
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
} from "./auditPipelineTypes";

export interface AuditHarnessConfig {
  openRouterApiKey?: string;
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
}

interface AuditHarnessDependencies {
  collectDeterministicEvidence: (payload: AuditRequestPayload) => Promise<DeterministicCollectorResult>;
  collectBrowserEvidence: (payload: AuditRequestPayload, deterministic: DeterministicCollectorResult) => Promise<BrowserCollectorResult>;
  synthesizeAudit: (payload: AuditRequestPayload, evidence: AuditEvidenceBundle, config?: AuditHarnessConfig) => Promise<AuditSynthesisResult>;
}

interface AttemptExecution {
  deterministic?: DeterministicCollectorResult;
  browser?: BrowserCollectorResult;
  synthesis?: AuditSynthesisResult;
  evidence?: AuditEvidenceBundle;
  trace: AuditHarnessTraceEvent[];
  error?: string;
}

const DEFAULT_POLICY: AuditHarnessPolicy = {
  policyVersion: "harness-p0.1",
  retryCap: 2,
  maxAttempts: 3,
  maxSteps: 12,
  warningBudget: 12,
  tokenBudget: 12000,
};

const DEFAULT_DEPENDENCIES: AuditHarnessDependencies = {
  collectDeterministicEvidence,
  collectBrowserEvidence,
  synthesizeAudit,
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
      middleware: ["schema_contract_guard", "url_safety_guard", "observability_trace"],
      enabled: true,
    },
    {
      id: "browser_collector",
      name: "Browser Flow Sensor",
      description: "Validates lightweight browser or Webwright flow evidence and records runtime gates.",
      inputSchema: targetSchema,
      middleware: ["retry_budget_guard", "observability_trace"],
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
      middleware: ["schema_contract_guard", "quality_gate_guard", "observability_trace"],
      enabled: true,
    },
  ];
}

function buildMiddlewareRegistry(): AuditHarnessMiddlewareDefinition[] {
  return [
    {
      id: "schema_contract_guard",
      name: "Schema Contract Guard",
      description: "Keeps every tool call inside the declared input shape before model or collector work begins.",
    },
    {
      id: "url_safety_guard",
      name: "URL Safety Guard",
      description: "Blocks unsafe target protocols, private IPs, and redirect destinations before evidence collection.",
    },
    {
      id: "retry_budget_guard",
      name: "Retry Budget Guard",
      description: "Applies the two-retry cap and prevents endless failed collector loops.",
    },
    {
      id: "quality_gate_guard",
      name: "Quality Gate Guard",
      description: "Turns sensor output into a pass, manual-review, or failed delivery decision.",
    },
    {
      id: "observability_trace",
      name: "Observability Trace",
      description: "Records each deterministic step with timing and status for after-action debugging.",
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

function buildSensors(execution: AttemptExecution, policy: AuditHarnessPolicy, stepsUsed: number): AuditHarnessSensorResult[] {
  const sensors: AuditHarnessSensorResult[] = [];

  if (!execution.deterministic) {
    sensors.push(createSensor(
      "deterministic_collector",
      "Deterministic collector",
      "failed",
      "critical",
      "not_run",
      "The deterministic collector did not return a result.",
      "completed",
    ));
  } else {
    sensors.push(createSensor(
      "deterministic_collector",
      "Deterministic collector",
      execution.deterministic.status === "completed" ? "passed" : "failed",
      execution.deterministic.status === "completed" ? "low" : "critical",
      execution.deterministic.status,
      execution.deterministic.status === "completed"
        ? "The target document was fetched and parsed into stable evidence."
        : execution.deterministic.error ?? "The target document could not be fetched.",
      "completed",
    ));
  }

  if (!execution.browser) {
    sensors.push(createSensor(
      "browser_collector",
      "Browser collector",
      "failed",
      "high",
      "not_run",
      "The browser collector did not return a result.",
      "completed|partial|skipped",
    ));
  } else {
    const browserStatus = execution.browser.status;
    const status: AuditHarnessCheckStatus = browserStatus === "failed"
      ? "failed"
      : browserStatus === "completed"
        ? "passed"
        : "warning";
    sensors.push(createSensor(
      "browser_collector",
      "Browser collector",
      status,
      status === "failed" ? "high" : status === "warning" ? "medium" : "low",
      `${browserStatus}/${execution.browser.mode}`,
      browserStatus === "completed"
        ? "Runtime flow evidence completed without blocked collector status."
        : execution.browser.reason ?? "Runtime evidence is available but not fully complete.",
      "completed",
    ));
  }

  const blockedStep = execution.browser?.timeline?.find((step) => step.status === "blocked");
  const partialStep = execution.browser?.timeline?.find((step) => step.status === "partial" || step.status === "not_run");

  if (blockedStep || partialStep) {
    const step = blockedStep ?? partialStep;
    sensors.push(createSensor(
      "runtime_gate",
      "Runtime gate",
      "warning",
      blockedStep ? "high" : "medium",
      `${step?.label ?? "unknown"}:${step?.status ?? "unknown"}`,
      step?.detail ?? "A browser timeline gate requires follow-up before this run can be treated as full coverage.",
      "all timeline steps completed",
    ));
  } else {
    sensors.push(createSensor(
      "runtime_gate",
      "Runtime gate",
      execution.browser?.timeline?.length ? "passed" : "warning",
      execution.browser?.timeline?.length ? "low" : "medium",
      execution.browser?.timeline?.length ? "all_clear" : "no_timeline",
      execution.browser?.timeline?.length
        ? "No blocked browser timeline step was found."
        : "No executable browser timeline was attached to this run.",
      "no blocked steps",
    ));
  }

  const summary = execution.synthesis?.summary?.trim() ?? "";
  sensors.push(createSensor(
    "synthesis_summary",
    "Synthesis summary",
    summary ? "passed" : "failed",
    summary ? "low" : "high",
    summary ? `${summary.length} chars` : "empty",
    summary
      ? "The synthesis step returned report-ready content."
      : execution.synthesis?.reason ?? "The synthesis step did not produce a report summary.",
    "non-empty summary",
  ));

  const totalWarnings = execution.evidence ? getTotalWarningCount(execution.evidence) : 0;
  sensors.push(createSensor(
    "warning_budget",
    "Evidence warning budget",
    totalWarnings <= policy.warningBudget ? "passed" : "warning",
    totalWarnings <= policy.warningBudget ? "low" : "medium",
    String(totalWarnings),
    totalWarnings <= policy.warningBudget
      ? "Evidence warnings are within the configured review budget."
      : "Evidence warnings exceeded the review budget and should be triaged before handoff.",
    `<=${policy.warningBudget}`,
  ));

  sensors.push(createSensor(
    "step_budget",
    "Step budget",
    stepsUsed <= policy.maxSteps ? "passed" : "failed",
    stepsUsed <= policy.maxSteps ? "low" : "critical",
    String(stepsUsed),
    stepsUsed <= policy.maxSteps
      ? "The run stayed within the maximum deterministic step budget."
      : "The circuit breaker step budget was exceeded.",
    `<=${policy.maxSteps}`,
  ));

  return sensors;
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
  orchestrator: AgentOrchestrator,
  skillManager: SkillManager,
  guardrails: GuardrailKnowledgeBase
): Promise<{ attempt: AuditHarnessAttempt; execution: AttemptExecution; qualityGate: AuditHarnessQualityGate; estimatedTokenSpend: number; traceEvents: AuditHarnessTraceEvent[] }> {
  const startedAt = nowIso();
  const startedAtMs = Date.now();
  const execution: AttemptExecution = {
    trace: [],
  };

  // P1: Identity & Authentication
  const identity = AgentIdentityManager.issueIdentity(`auditor-attempt-${index}`);
  const vault = new CredentialsVault(config?.apiKey, config?.allowedModels);

  // P1: Observability (Execution Tracer)
  const tracer = new ExecutionTracer(identity.correlationId, identity.role);
  const sandbox = new AgentSandbox(identity, [new URL(payload.url).hostname]);
  const contextManager = new ContextManager();
  
  // P2: Orchestration & Guardrails
  const taskPlan = orchestrator.planTask(payload.url, payload.goals);
  const activeGuardrails = guardrails.getGuardrailsForContext(payload.url);
  if (activeGuardrails.length > 0) {
    tracer.logDecisionPath("Guardrails Injected", "Matched context", `${activeGuardrails.length} rules applied`);
  }

  // P3: Middleware & Scratchpad setup
  sandbox.setContext("taskPlan", taskPlan);
  sandbox.setContext("attemptIndex", index);
  
  const telemetryMiddleware: MiddlewareHandler = async (id, action, next) => {
    const start = performance.now();
    console.log(`[Middleware] -> Executing ${action.type} against ${action.target}`);
    const result = await next(action);
    console.log(`[Middleware] <- ${action.type} completed in ${(performance.now() - start).toFixed(2)}ms`);
    return result;
  };
  sandbox.useMiddleware(telemetryMiddleware);

  try {
    if (taskPlan.steps.includes("deterministic")) {
      const detStart = tracer.logPhaseStart("Deterministic Collector");
      await skillManager.requireSkill("deterministic");
      execution.deterministic = await traceStep(
        execution.trace,
        index,
        "tool_call",
        "Run deterministic collector",
        () => sandbox.executeLlmCall("deterministic", 0, () => dependencies.collectDeterministicEvidence(payload)),
      );
      tracer.logPhaseEnd("Deterministic Collector", detStart);
    }

    if (taskPlan.steps.includes("browser") && execution.deterministic) {
      const brwStart = tracer.logPhaseStart("Browser Collector");
      await skillManager.requireSkill("browser");
      execution.browser = await traceStep(
        execution.trace,
        index,
        "tool_call",
        "Run browser flow collector",
        () => sandbox.executeLlmCall("browser", 0, () => dependencies.collectBrowserEvidence(payload, execution.deterministic as DeterministicCollectorResult)),
      );
      tracer.logPhaseEnd("Browser Collector", brwStart);
    }

    execution.evidence = {
      deterministic: execution.deterministic,
      browser: execution.browser,
    };

    // P1: Context Management
    let safeEvidence = execution.evidence;
    const evidenceStr = JSON.stringify(safeEvidence);
    if (contextManager.needsCompression(evidenceStr)) {
      const compressed = contextManager.compressContext(evidenceStr);
      safeEvidence = JSON.parse(compressed);
      tracer.logDecisionPath("Context Compression", `Original size: ${evidenceStr.length}`, `Compressed size: ${compressed.length}`);
    }

    if (taskPlan.steps.includes("synthesis")) {
      const synStart = tracer.logPhaseStart("Audit Synthesis");
      await skillManager.requireSkill("synthesis");
      execution.synthesis = await traceStep(
        execution.trace,
        index,
        "tool_call",
        "Run evidence-grounded synthesis",
        () => sandbox.executeLlmCall("synthesis", evidenceStr.length, () => dependencies.synthesizeAudit(payload, safeEvidence as AuditEvidenceBundle, config)),
      );
      tracer.logPhaseEnd("Audit Synthesis", synStart);
      
      if (execution.synthesis.summary) {
         tracer.logDecisionPath("Synthesis Output", "evidence provided", execution.synthesis.summary);
      }
    }
  } catch (error) {
    execution.error = error instanceof Error ? error.message : "Unexpected harness attempt error";
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
  
  // P1: Observability Cost Tracker
  let costTracker = new CostTracker(policy.tokenBudget);
  let retryReason: string | undefined;
  let circuitBreakerReason: string | undefined;

  // P2: Core Initializations
  const orchestrator = new AgentOrchestrator();
  const skillManager = new SkillManager();
  const guardrails = new GuardrailKnowledgeBase();
  const flywheel = new FlywheelCollector();

  // Register skills so they can be lazily loaded by SkillManager
  skillManager.registerSkill("deterministic", "Deterministic Evidence Collector", async () => { /* lazy load logic */ });
  skillManager.registerSkill("browser", "Browser Flow Collector", async () => { /* lazy load logic */ });
  skillManager.registerSkill("synthesis", "Audit Synthesis", async () => { /* lazy load logic */ });

  for (let index = 1; index <= policy.maxAttempts; index += 1) {
    const result = await executeAttempt(payload, config, dependencies, policy, index, retryReason, orchestrator, skillManager, guardrails);
    attempts.push(result.attempt);
    latestExecution = result.execution;
    latestQualityGate = result.qualityGate;
    
    // Add cost record for this attempt
    const activeModel = config?.allowedModels?.[0] || "google/gemini-1.5-flash";
    const attemptCost = calculateModelCost(activeModel, result.estimatedTokenSpend * 2, result.estimatedTokenSpend);
    costTracker = costTracker.add({
      model: activeModel,
      inputTokens: result.estimatedTokenSpend * 2,
      outputTokens: result.estimatedTokenSpend,
      costUsd: attemptCost
    });

    const governance = buildGovernance(policy, attempts, costTracker.records.reduce((a, b) => a + b.outputTokens, 0));

    if (governance.circuitBreakerTripped || costTracker.overBudget) {
      circuitBreakerReason = governance.circuitBreakerReason || "budget_exceeded";
      console.warn(`[CircuitBreaker] Tripped! Reason: ${circuitBreakerReason}. Total Cost: $${costTracker.totalCost.toFixed(4)}`);
      break;
    }

    if (result.qualityGate.status !== "failed" || index >= policy.maxAttempts) {
      break;
    }

    retryReason = getRetryReason(result.qualityGate, result.execution.error);
    
    // P2: Record Error Guardrails on Failure to learn for next time
    if (retryReason) {
      guardrails.recordError(retryReason, `Avoid triggering ${retryReason}. Enhance DOM inspection and timeout limits.`);
    }

    pivots.push({
      afterAttempt: index,
      reason: retryReason,
      nextStrategy: index + 1 >= policy.maxAttempts ? "pivot_after_retries" : "retry_same_contract",
      rollbackCheckpointId: `${runId}:attempt-${index}`,
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

  // P3: Retrospective Report Generation
  const retrospective = `
## Audit Retrospective [${runId}]
- **Status**: ${finalStatus.toUpperCase()}
- **Duration**: ${durationMs(startedAtMs)}ms
- **Attempts**: ${attempts.length}
- **Pivots**: ${pivots.length}
- **Cost**: $${costTracker.totalCost.toFixed(4)}
- **Guardrails Triggered**: ${guardrails.getGuardrailsForContext(payload.url).length}
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
    middleware: buildMiddlewareRegistry(),
    attempts,
    qualityGate: latestQualityGate,
    governance: buildGovernance(policy, attempts, costTracker.records.reduce((a, b) => a + b.outputTokens, 0), circuitBreakerReason),
    pivots,
    rollback: {
      checkpointId: `${runId}:final`,
      supported: false,
      action: "metadata_checkpoint",
      reason: "This audit run only reads public target evidence; rollback is represented as a checkpoint for future mutable workflows.",
    },
    handoffRequired,
    handoffReason,
    retrospective,
  };

  // P2: Data Flywheel
  flywheel.record({
    runId,
    timestamp: nowIso(),
    latencyMs: harness.durationMs,
    costUsd: costTracker.totalCost,
    success: finalStatus === "passed",
    contextSummary: latestExecution.synthesis.summary ? "Complete Report Generated" : "Incomplete"
  });

  return {
    synthesis: latestExecution.synthesis,
    evidence: latestExecution.evidence,
    harness,
  };
}
