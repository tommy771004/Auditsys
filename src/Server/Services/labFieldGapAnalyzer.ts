import type { CruxResult, LabFieldDiscrepancyLevel, LabFieldGapAnalysis, PageSpeedResult } from "../../types/liveAudit.types";

type LabInput = Partial<PageSpeedResult> & {
  INP?: string | number;
  TBT?: string | number;
  totalBlockingTime?: string | number;
  totalBlockingTimeMs?: number;
  mainThreadBlockingMs?: number;
};

interface GapSignal {
  level: LabFieldDiscrepancyLevel;
  priority: number;
  blindSpot: string;
  recommendation: string;
}

function parseMetricMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/,/g, "");
  if (!normalized || normalized === "—" || normalized === "-") {
    return null;
  }
  const match = normalized.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) {
    return null;
  }
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return normalized.includes("ms") ? numeric : numeric * 1000;
}

function parseCls(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const match = value.trim().match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) {
    return null;
  }
  const numeric = Number(match[1]);
  return Number.isFinite(numeric) ? numeric : null;
}

function getLabBlockingMs(labData: LabInput): number | null {
  return parseMetricMs(
    labData.totalBlockingTimeMs ??
      labData.mainThreadBlockingMs ??
      labData.totalBlockingTime ??
      labData.TBT,
  );
}

function levelFromSignals(signals: GapSignal[]): LabFieldDiscrepancyLevel {
  if (signals.some((signal) => signal.level === "severe")) {
    return "severe";
  }
  if (signals.some((signal) => signal.level === "moderate")) {
    return "moderate";
  }
  return "none";
}

function makeNoFieldDataAnalysis(): LabFieldGapAnalysis {
  return {
    discrepancyLevel: "moderate",
    blindSpotIdentified:
      "目前缺少 CrUX 真實使用者欄位資料；若團隊只看 Lighthouse 實驗室數據，會看不到不同地區、網路品質與低階裝置造成的 P75 體驗落差。",
    strategicRecommendation:
      "建議先補齊 CRUX_API_KEY 與足量流量來源，並以 PageSpeed/Lighthouse 作為輔助實驗室量測；在沒有欄位資料前，不應將本機測試視為真實使用者體驗結論。",
  };
}

export function analyzeLabFieldGap(labData: LabInput, fieldData: CruxResult): LabFieldGapAnalysis {
  if (!fieldData.hasData) {
    return makeNoFieldDataAnalysis();
  }

  const labLcpMs = parseMetricMs(labData.LCP);
  const labFcpMs = parseMetricMs(labData.FCP);
  const labCls = parseCls(labData.CLS);
  const labScore = typeof labData.score === "number" ? labData.score : null;
  const labBlockingMs = getLabBlockingMs(labData);
  const fieldLcpMs = fieldData.metrics.lcp.p75;
  const fieldInpMs = fieldData.metrics.inp.p75;
  const fieldCls = fieldData.metrics.cls.p75;
  const signals: GapSignal[] = [];

  if (labLcpMs !== null && fieldLcpMs !== null && labLcpMs <= 2500 && fieldLcpMs >= 3000) {
    const gapMs = fieldLcpMs - labLcpMs;
    signals.push({
      level: gapMs >= 1500 || fieldData.metrics.lcp.rating === "poor" ? "severe" : "moderate",
      priority: 100 + gapMs,
      blindSpot:
        `開發團隊的實驗室數據顯示 LCP 約 ${(labLcpMs / 1000).toFixed(1)} 秒，但 CrUX 真實使用者 P75 LCP 達 ${(fieldLcpMs / 1000).toFixed(1)} 秒；這代表本機或 Lighthouse 環境未反映行動裝置 4G 網路、高 CDN 延遲或特定區域路由品質造成的真實首屏渲染延遲。`,
      recommendation:
        "建議優先檢查 CDN 區域命中率、首屏 HTML/圖片快取策略與 LCP 資源 preload，並針對行動網路情境壓縮首屏圖片、降低 TTFB、補強 edge caching。",
    });
  }

  const labLooksHealthy = (labScore !== null && labScore >= 80) || (labBlockingMs !== null && labBlockingMs <= 200);
  if (fieldInpMs !== null && fieldInpMs > 500 && labLooksHealthy) {
    signals.push({
      level: "severe",
      priority: 200 + fieldInpMs,
      blindSpot:
        `實驗室分數看起來健康，但 CrUX 真實使用者 P75 INP 已達 ${Math.round(fieldInpMs)}ms；這表示團隊只看本機或高階測試裝置時，低階行動裝置上的 React hydration、重型 JS bundle 或第三方腳本主執行緒負載被低估。`,
      recommendation:
        "建議針對非關鍵 JS 進行 Code Splitting，延後第三方腳本，縮小 hydration 範圍，並用低階 Android 裝置與 4G throttling 重跑互動路徑，優先拆解超過 50ms 的 long tasks。",
    });
  }

  if (labFcpMs !== null && fieldData.metrics.fcp.p75 !== null && labFcpMs <= 1800 && fieldData.metrics.fcp.p75 >= 3000) {
    signals.push({
      level: "moderate",
      priority: 80 + fieldData.metrics.fcp.p75 - labFcpMs,
      blindSpot:
        `實驗室 FCP 約 ${(labFcpMs / 1000).toFixed(1)} 秒，但真實使用者 P75 FCP 約 ${(fieldData.metrics.fcp.p75 / 1000).toFixed(1)} 秒；團隊可能低估了真實網路連線、DNS/TLS 建連與邊緣節點延遲。`,
      recommendation:
        "建議檢查字型與關鍵 CSS 載入路徑，加入 preconnect / dns-prefetch，並以主要使用者地區的行動網路條件驗證首包與首次繪製。",
    });
  }

  if (labCls !== null && fieldCls !== null && labCls <= 0.1 && fieldCls > 0.25) {
    signals.push({
      level: "moderate",
      priority: 70 + fieldCls * 100,
      blindSpot:
        `實驗室 CLS 為 ${labCls.toFixed(2)}，但真實使用者 P75 CLS 達 ${fieldCls.toFixed(2)}；這代表實驗室路徑沒有覆蓋真實廣告、字型、個人化內容或慢速圖片載入造成的版面位移。`,
      recommendation:
        "建議為圖片、廣告與動態模組保留明確尺寸，檢查 web font swap 策略，並用真實內容與慢速網路重播首屏載入流程。",
    });
  }

  if (signals.length === 0) {
    return {
      discrepancyLevel: "none",
      blindSpotIdentified:
        "未發現明顯落差；目前 Lighthouse 實驗室數據與 CrUX 真實使用者 P75 指標方向一致，代表本機量測暫時沒有遮蔽主要的真實世界效能瓶頸。",
      strategicRecommendation:
        "建議持續監控 CrUX P75 趨勢，保留行動裝置與慢速網路的定期回歸測試，避免未來 JS bundle、第三方腳本或圖片策略變更造成真實體驗退化。",
    };
  }

  const level = levelFromSignals(signals);
  const rankedSignals = [...signals].sort((a, b) => b.priority - a.priority);
  const primary = rankedSignals[0];
  const secondary = rankedSignals.slice(1);

  return {
    discrepancyLevel: level,
    blindSpotIdentified: [primary.blindSpot, ...secondary.map((signal) => signal.blindSpot)].join(" "),
    strategicRecommendation: [primary.recommendation, ...secondary.map((signal) => signal.recommendation)].join(" "),
  };
}
