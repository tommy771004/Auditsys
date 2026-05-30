import fs from "node:fs";
import path from "node:path";

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
  private filePath = path.resolve(process.cwd(), ".harness_flywheel.json");

  public record(data: FlywheelRecord) {
    let records: FlywheelRecord[] = [];
    if (fs.existsSync(this.filePath)) {
      try {
        records = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      } catch (e) {
        records = [];
      }
    }
    records.push(data);
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(records, null, 2));
      console.log(`[Flywheel] Recorded data for run ${data.runId} (Success: ${data.success}, Cost: $${data.costUsd.toFixed(4)})`);
    } catch (e) {
      console.warn("[Flywheel] Failed to write flywheel record", e);
    }
  }
}
