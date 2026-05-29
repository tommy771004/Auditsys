import type { PerformanceTrendAlertReport, PerformanceTrendStatus } from "../../types/liveAudit.types";

export interface PerformanceTrendMetricRow {
  scanId?: string;
  createdAt?: string | Date;
  lcpMs?: number | null;
  inpMs?: number | null;
  cls?: number | null;
  jsBytes?: number | null;
  result?: string | Record<string, unknown> | null;
}

interface NormalizedTrendRow {
  scanLabel: string;
  order: number;
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
  jsBytes: number | null;
}

interface RegressionSignal {
  priority: number;
  label: string;
  kind: "lcp" | "inp" | "cls" | "js";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getPath(root: unknown, path: string[]): unknown {
  let current = root;
  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function parseResultPayload(result: PerformanceTrendMetricRow["result"]): Record<string, unknown> | null {
  if (!result) {
    return null;
  }
  if (typeof result === "string") {
    try {
      const parsed: unknown = JSON.parse(result);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(result) ? result : null;
}

function firstNumber(root: unknown, paths: string[][]): number | null {
  for (const path of paths) {
    const value = toFiniteNumber(getPath(root, path));
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function normalizeRow(row: PerformanceTrendMetricRow, index: number): NormalizedTrendRow {
  const result = parseResultPayload(row.result);
  const lcpMs = row.lcpMs ?? firstNumber(result, [
    ["evidence", "crux", "metrics", "lcp", "p75"],
    ["crux", "metrics", "lcp", "p75"],
    ["metrics", "lcpMs"],
    ["performance", "lcpMs"],
  ]);
  const inpMs = row.inpMs ?? firstNumber(result, [
    ["evidence", "crux", "metrics", "inp", "p75"],
    ["crux", "metrics", "inp", "p75"],
    ["metrics", "inpMs"],
    ["performance", "inpMs"],
  ]);
  const cls = row.cls ?? firstNumber(result, [
    ["evidence", "crux", "metrics", "cls", "p75"],
    ["crux", "metrics", "cls", "p75"],
    ["metrics", "cls"],
    ["performance", "cls"],
  ]);
  const jsBytes = row.jsBytes ?? firstNumber(result, [
    ["evidence", "network", "totalScriptBytes"],
    ["network", "totalScriptBytes"],
    ["metrics", "jsBytes"],
    ["performance", "jsBytes"],
    ["bundle", "jsBytes"],
  ]);

  return {
    scanLabel: row.scanId ?? (isRecord(row) && typeof row.id === "string" ? row.id : `Scan #${index + 1}`),
    order: row.createdAt ? new Date(row.createdAt).getTime() : index,
    lcpMs,
    inpMs,
    cls,
    jsBytes,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatSecondsDelta(deltaMs: number): string {
  return `${(deltaMs / 1000).toFixed(1)} 秒`;
}

function formatKbDelta(deltaBytes: number): string {
  return `${Math.round(deltaBytes / 1000)} KB`;
}

function collectMetricValues(rows: NormalizedTrendRow[], key: "lcpMs" | "inpMs" | "cls" | "jsBytes"): number[] {
  return rows.map((row) => row[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function detectLatestMetricRegression(
  rows: NormalizedTrendRow[],
  key: "lcpMs" | "inpMs" | "cls",
  label: string,
  unit: "ms" | "seconds" | "unitless",
  priorityBase: number,
): RegressionSignal | null {
  const latest = rows.at(-1)?.[key];
  if (typeof latest !== "number") {
    return null;
  }

  const baseline = average(rows.slice(0, -1).map((row) => row[key]).filter((value): value is number => typeof value === "number"));
  if (baseline === null) {
    return null;
  }

  const delta = latest - baseline;
  const relative = baseline > 0 ? delta / baseline : 0;
  const threshold = key === "cls" ? 0.08 : key === "inpMs" ? 100 : 600;

  if (delta < threshold && relative < 0.25) {
    return null;
  }

  const formattedDelta = unit === "seconds"
    ? formatSecondsDelta(delta)
    : unit === "ms"
      ? `${Math.round(delta)} ms`
      : delta.toFixed(2);

  return {
    priority: priorityBase + Math.max(delta, relative * 1000),
    label: `${label} 增加 +${formattedDelta}（前 4 次平均 ${unit === "seconds" ? `${(baseline / 1000).toFixed(1)} 秒` : unit === "ms" ? `${Math.round(baseline)} ms` : baseline.toFixed(2)} → 最新 ${unit === "seconds" ? `${(latest / 1000).toFixed(1)} 秒` : unit === "ms" ? `${Math.round(latest)} ms` : latest.toFixed(2)}）`,
    kind: key === "lcpMs" ? "lcp" : key === "inpMs" ? "inp" : "cls",
  };
}

function detectPayloadBloat(rows: NormalizedTrendRow[]): RegressionSignal | null {
  let largestDelta = 0;
  let fromScan = 0;

  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1].jsBytes;
    const current = rows[index].jsBytes;
    if (typeof previous !== "number" || typeof current !== "number") {
      continue;
    }
    const delta = current - previous;
    if (delta > largestDelta) {
      largestDelta = delta;
      fromScan = index;
    }
  }

  if (largestDelta < 150_000) {
    return null;
  }

  return {
    priority: 150 + largestDelta / 1000,
    label: `JavaScript bundle 增加 +${formatKbDelta(largestDelta)}（Scan #${fromScan} → Scan #${fromScan + 1}）`,
    kind: "js",
  };
}

function inferStatus(signals: RegressionSignal[], rows: NormalizedTrendRow[]): PerformanceTrendStatus {
  if (signals.length > 0) {
    return "regressing";
  }

  const lcpValues = collectMetricValues(rows, "lcpMs");
  const inpValues = collectMetricValues(rows, "inpMs");
  const firstLcp = lcpValues[0];
  const latestLcp = lcpValues.at(-1);
  const firstInp = inpValues[0];
  const latestInp = inpValues.at(-1);

  if (
    typeof firstLcp === "number" &&
    typeof latestLcp === "number" &&
    typeof firstInp === "number" &&
    typeof latestInp === "number" &&
    latestLcp < firstLcp * 0.85 &&
    latestInp < firstInp * 0.9
  ) {
    return "improving";
  }

  return "stable";
}

function buildTrendSummary(status: PerformanceTrendStatus, rows: NormalizedTrendRow[], signals: RegressionSignal[]): string {
  if (status === "regressing") {
    return `近期 5 次掃描顯示效能正在衰退；前幾次指標大致穩定，但最新掃描出現 ${signals.length} 個明顯退化訊號，已經不是單次雜訊。`;
  }
  if (status === "improving") {
    return "近期 5 次掃描顯示效能正在改善；LCP 與互動延遲皆呈下降趨勢，代表近期部署可能成功降低首屏與主執行緒負擔。";
  }
  return rows.length >= 2
    ? "近期 5 次掃描整體維持穩定；尚未偵測到超過門檻的 LCP、INP、CLS 或 JavaScript payload 突增。"
    : "目前歷史樣本不足，尚無法建立可信的效能趨勢判斷。";
}

function buildRootCause(signals: RegressionSignal[]): string {
  const kinds = new Set(signals.map((signal) => signal.kind));

  if (kinds.has("js") && kinds.has("inp")) {
    return "這種 JavaScript 體積突增並伴隨 INP 惡化的型態，通常代表近期部署引入了重型第三方函式庫、分析/追蹤 SDK，或把原本可延後載入的互動模組併入首屏 bundle，導致低階裝置主執行緒被長任務卡住。";
  }
  if (kinds.has("js") && kinds.has("lcp")) {
    return "JavaScript bundle 膨脹同時拉高 LCP，常見肇因是新增未拆分的首頁互動元件、A/B 測試工具，或未最佳化的 hero video / rich media component 進入首屏載入路徑。";
  }
  if (kinds.has("lcp")) {
    return "LCP 突然惡化但 payload 未明顯膨脹時，優先懷疑近期部署更換了首屏圖片、hero video、字型載入策略，或 CDN/cache 規則變更造成首屏資源回源延遲。";
  }
  if (kinds.has("js")) {
    return "JavaScript 體積突增通常來自新第三方套件、未 tree-shaking 的工具庫，或 route-level code splitting 失效；建議回查相鄰兩次掃描之間的部署 diff。";
  }
  if (kinds.has("cls")) {
    return "CLS 退化通常與未保留尺寸的圖片/廣告容器、字型交換策略或動態插入內容有關，應檢查近期版位與 CMS 內容變更。";
  }

  return "目前沒有足夠的衰退訊號可指向單一部署肇因；建議持續累積歷史樣本並與 release log 對齊。";
}

export function analyzePerformanceTrend(inputRows: PerformanceTrendMetricRow[]): PerformanceTrendAlertReport {
  const rows = inputRows
    .map((row, index) => normalizeRow(row, index))
    .sort((a, b) => a.order - b.order)
    .slice(-5);

  const signals = [
    detectLatestMetricRegression(rows, "lcpMs", "LCP", "seconds", 300),
    detectLatestMetricRegression(rows, "inpMs", "INP", "ms", 240),
    detectLatestMetricRegression(rows, "cls", "CLS", "unitless", 120),
    detectPayloadBloat(rows),
  ]
    .filter((signal): signal is RegressionSignal => signal !== null)
    .sort((a, b) => b.priority - a.priority);

  const trendStatus = inferStatus(signals, rows);

  return {
    trendStatus,
    trendSummary: buildTrendSummary(trendStatus, rows, signals),
    keyRegressions: signals.map((signal) => signal.label),
    hypothesizedRootCause: buildRootCause(signals),
  };
}
