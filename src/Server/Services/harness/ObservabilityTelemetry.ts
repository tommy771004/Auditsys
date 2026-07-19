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
