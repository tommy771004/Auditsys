export interface CostRecord {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number;
}

export class CostTracker {
  public readonly budgetLimit: number;
  public readonly records: ReadonlyArray<CostRecord>;

  constructor(budgetLimit: number = 1.00, records: CostRecord[] = []) {
    this.budgetLimit = budgetLimit;
    this.records = records;
  }

  public add(record: CostRecord): CostTracker {
    return new CostTracker(this.budgetLimit, [...this.records, record]);
  }

  public get totalCost(): number {
    return this.records.reduce((sum, r) => sum + r.costUsd, 0);
  }

  public get overBudget(): boolean {
    return this.totalCost > this.budgetLimit;
  }
}

/**
 * 簡易的模型成本計算機 (支援 OpenRouter 定價)
 */
export function calculateModelCost(model: string, inputTokens: number, outputTokens: number): number {
  let inputPricePerM = 0;
  let outputPricePerM = 0;

  // OpenRouter Free Models
  if (model.endsWith(":free")) {
    return 0; // Completely free models
  }

  // OpenRouter Paid Fallback Models Estimates (USD per 1M tokens)
  if (model.includes("gemini-1.5-pro")) {
    inputPricePerM = 1.25;
    outputPricePerM = 5.00;
  } else if (model.includes("gemini-1.5-flash")) {
    inputPricePerM = 0.075;
    outputPricePerM = 0.30;
  } else if (model.includes("gpt-4o-mini")) {
    inputPricePerM = 0.15;
    outputPricePerM = 0.60;
  } else {
    // Default arbitrary fallback estimate
    inputPricePerM = 0.50;
    outputPricePerM = 1.50;
  }

  const cost = (inputTokens / 1000000) * inputPricePerM + (outputTokens / 1000000) * outputPricePerM;
  return cost;
}

/**
 * 執行追蹤器，負責測量延遲與記錄決策路徑
 */
export class ExecutionTracer {
  private correlationId: string;
  private role: string;

  constructor(correlationId: string, role: string) {
    this.correlationId = correlationId;
    this.role = role;
  }

  public logPhaseStart(phase: string): number {
    console.log(`[Trace][${this.correlationId}][${this.role}] Started phase: ${phase}`);
    return performance.now();
  }

  public logPhaseEnd(phase: string, startTime: number, metadata?: any): void {
    const latencyMs = performance.now() - startTime;
    console.log(`[Trace][${this.correlationId}][${this.role}] Finished phase: ${phase} (Latency: ${latencyMs.toFixed(2)}ms)`);
    if (metadata) {
      console.log(`[Trace][${this.correlationId}][${this.role}] Metadata:`, JSON.stringify(metadata));
    }
  }

  public logDecisionPath(decisionPoint: string, inputSummary: string, result: string): void {
    console.log(`[Decision][${this.correlationId}][${this.role}] Node: ${decisionPoint}`);
    console.log(`  - Input Context: ${inputSummary.length > 100 ? inputSummary.substring(0, 100) + '...' : inputSummary}`);
    console.log(`  - Output Result: ${result.length > 100 ? result.substring(0, 100) + '...' : result}`);
  }
}
