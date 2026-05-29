import type { SSELogLevel } from "../../types/liveAudit.types";
import type { BottleneckFinding, BottleneckLogLine } from "../../types/networkEvidence.types";

const LEVEL: Record<BottleneckFinding["severity"], SSELogLevel> = {
  critical: "error",
  warning: "warn",
  info: "info",
};

const LABEL: Record<BottleneckFinding["severity"], string> = {
  critical: "🔴 **[嚴重瓶頸]**",
  warning: "🟡 **[警告]**",
  info: "ℹ️ **[資訊]**",
};

export function formatBottleneckReport(findings: BottleneckFinding[]): BottleneckLogLine[] {
  if (findings.length === 0) {
    return [{ level: "success", message: "網路瓶頸深度分析：未發現顯著瓶頸。" }];
  }

  const lines: BottleneckLogLine[] = [
    { level: "info", message: "── 網路瓶頸深度分析 (Network Bottleneck Deep-Dive) ──" },
  ];

  for (const f of findings) {
    const ms = f.measured && f.measuredMs !== null ? ` — 耗時 ${f.measuredMs}ms` : "";
    const message = [
      `${LABEL[f.severity]}: ${f.target}${ms}`,
      `  *診斷:* ${f.diagnosis}`,
      `  *建議解法:* ${f.resolution}`,
    ].join("\n");
    lines.push({ level: LEVEL[f.severity], message });
  }

  return lines;
}
