import { getDb } from "../../../db";
import { agentFlywheel } from "../../../db/schema";

export interface FlywheelRecord {
  runId: string;
  timestamp: string;
  latencyMs: number;
  costUsd: number;
  success: boolean;
  contextSummary: string;
}

/**
 * 數據飛輪 (Data Flywheel)
 * 負責收集與儲存特工執行的遙測特徵，為將來的模型微調與決策最佳化建立訓練資料池。
 */
export class FlywheelCollector {
  public async record(data: FlywheelRecord) {
    try {
      const db = getDb();
      await db.insert(agentFlywheel).values({
        runId: data.runId,
        latencyMs: data.latencyMs,
        costUsd: data.costUsd.toFixed(6), // store as text with 6 precision
        success: data.success,
        contextSummary: data.contextSummary
      });
      console.log(`[Flywheel] Recorded data for run ${data.runId} (Success: ${data.success}, Cost: $${data.costUsd.toFixed(4)})`);
    } catch (e) {
      console.warn("[Flywheel] Failed to write flywheel record to DB", e);
    }
  }
}
