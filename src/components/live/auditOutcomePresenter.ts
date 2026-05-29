import type { LiveScanSummary } from "../../types/liveAudit.types";

export type AuditOutcomeSeverity = "success" | "warning" | "danger";

export interface AuditOutcomeViewModel {
  severity: AuditOutcomeSeverity;
  title: string;
  headline: string;
  recommendation: string;
  scoreLabel: string;
  dataSourceLabel: string;
  chips: string[];
}

export function buildAuditOutcomeViewModel(summary: LiveScanSummary): AuditOutcomeViewModel {
  const score = Math.round(summary.scores.overall);
  const warningCount = summary.warnings.length;
  const issueCount = summary.domIssueCount;
  const responseTimeMs = summary.responseTimeMs ?? summary.averageRouteResponseMs ?? 0;

  const severity: AuditOutcomeSeverity =
    score < 50 || issueCount >= 5 || warningCount >= 3 || responseTimeMs >= 1500
      ? "danger"
      : score < 90 || issueCount > 0 || warningCount > 0 || responseTimeMs >= 800
        ? "warning"
        : "success";

  return {
    severity,
    title: severity === "danger" ? "嚴重衰退" : severity === "warning" ? "需優化" : "狀態良好",
    headline: buildHeadline(score, severity, issueCount, warningCount),
    recommendation: buildRecommendation(summary),
    scoreLabel: `${score}`,
    dataSourceLabel: "本次掃描",
    chips: buildChips(summary),
  };
}

function buildHeadline(score: number, severity: AuditOutcomeSeverity, issueCount: number, warningCount: number): string {
  if (severity === "danger") {
    return `本次掃描總分 ${score}，偵測到 ${issueCount} 個 DOM/SEO 問題與 ${warningCount} 個架構警訊，建議先暫停新增功能並處理核心瓶頸。`;
  }

  if (severity === "warning") {
    return `本次掃描總分 ${score}，整體可運作，但仍有 ${issueCount} 個 DOM/SEO 問題與 ${warningCount} 個警訊需要排入近期修補。`;
  }

  return `本次掃描總分 ${score}，核心 SEO、效能與架構訊號穩定，適合進入持續監控與內容優化節奏。`;
}

function buildRecommendation(summary: LiveScanSummary): string {
  if (summary.domIssueCount >= 5) {
    return "優先修復 DOM 與 metadata 結構問題，先處理 heading、canonical、圖片 alt 與 render-blocking patch，避免搜尋引擎與使用者同時受到影響。";
  }

  if (summary.assets.imagesMissingAlt > 0) {
    return "優先補齊圖片 alt，並檢查首屏圖片是否具備 eager loading 與 fetch priority，降低 SEO 與 LCP 風險。";
  }

  if (!summary.seo.hasCanonical || summary.seo.h1Count !== 1 || !summary.seo.hasMetaDescription) {
    return "優先修正 metadata、canonical 與 H1 階層，讓搜尋引擎能穩定理解頁面主題與索引版本。";
  }

  if (summary.scores.performance < 75 || (summary.responseTimeMs ?? 0) >= 800 || summary.assets.scripts >= 20) {
    return "優先拆分 JavaScript、延後第三方資源並檢查 server response path，避免真實使用者在低階裝置上遭遇互動延遲。";
  }

  if (summary.warnings.length > 0) {
    return "先清理警訊清單中可快速修補的設定問題，再用下一次掃描確認趨勢是否回穩。";
  }

  return "目前核心訊號健康，建議持續監控 LCP、INP 與索引訊號，並把後續優化放在內容品質與轉換路徑。";
}

function buildChips(summary: LiveScanSummary): string[] {
  const chips = [
    `HTTP ${summary.statusCode ?? "—"}`,
    `${summary.responseTimeMs ?? "—"} ms`,
    `${summary.domIssueCount} DOM issues`,
  ];

  if (summary.server) {
    chips.push(summary.server);
  }

  return chips;
}
