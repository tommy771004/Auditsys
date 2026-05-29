import type { LiveScanSummary } from "../../types/liveAudit.types";

export type AnalyticsDataSourceKind = "live" | "fallback";

export interface AnalyticsChartDatum {
  id: "lcp" | "inp" | "cls" | "ttfb";
  name: string;
  current: number;
  target: number;
}

export interface AnalyticsSeoDatum {
  subject: string;
  A: number;
  fullMark: number;
}

export interface AnalyticsChartModel {
  dataSource: {
    kind: AnalyticsDataSourceKind;
    label: string;
    description: string;
  };
  performanceData: AnalyticsChartDatum[];
  seoData: AnalyticsSeoDatum[];
}

export function buildAnalyticsChartModel(summary?: LiveScanSummary): AnalyticsChartModel {
  const responseTimeMs = summary?.responseTimeMs ?? 800;

  return {
    dataSource: summary
      ? {
          kind: "live",
          label: "本次掃描",
          description: "圖表已接上本次 live scan 回傳的摘要資料。",
        }
      : {
          kind: "fallback",
          label: "估算資料",
          description: "尚未接收到本次掃描摘要，暫以基準模型展示圖表結構。",
        },
    performanceData: [
      { id: "lcp", name: "LCP (渲染延遲)", current: ((summary?.responseTimeMs ?? 1500) / 1000) * 2.1, target: 2.5 },
      { id: "inp", name: "INP (互動延遲)", current: responseTimeMs / 2, target: 200 },
      { id: "cls", name: "CLS (佈局偏移)", current: summary?.scores.architecture ? (100 - summary.scores.architecture) / 100 : 0.15, target: 0.1 },
      { id: "ttfb", name: "TTFB (伺服器回應)", current: responseTimeMs, target: 400 },
    ],
    seoData: summary
      ? [
          { subject: "Meta 描述", A: summary.seo.hasMetaDescription ? 100 : 0, fullMark: 100 },
          { subject: "H1 結構", A: summary.seo.h1Count === 1 ? 100 : summary.seo.h1Count === 0 ? 0 : 50, fullMark: 100 },
          {
            subject: "圖片 Alt",
            A: summary.assets.images > 0 ? ((summary.assets.images - summary.assets.imagesMissingAlt) / summary.assets.images) * 100 : 100,
            fullMark: 100,
          },
          { subject: "Canonical 正規化", A: summary.seo.hasCanonical ? 100 : 0, fullMark: 100 },
          { subject: "結構化資料", A: summary.seo.structuredDataBlocks > 0 ? 100 : 0, fullMark: 100 },
          { subject: "Open Graph", A: summary.seo.openGraphTags > 0 ? 100 : 0, fullMark: 100 },
        ]
      : [
          { subject: "Meta 描述", A: 90, fullMark: 100 },
          { subject: "H1 結構", A: 100, fullMark: 100 },
          { subject: "圖片 Alt", A: 60, fullMark: 100 },
          { subject: "Canonical", A: 100, fullMark: 100 },
          { subject: "結構化資料", A: 40, fullMark: 100 },
          { subject: "Open Graph", A: 75, fullMark: 100 },
        ],
  };
}
