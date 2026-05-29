export interface DeterministicArchitectureMetrics {
  hasGzip?: boolean;
  isHttp2?: boolean;
  requestCount?: number;
  domDepth?: number;
  techStack?: string[];
}

function includesReactStack(techStack: string[] | undefined): boolean {
  if (!techStack || techStack.length === 0) {
    return false;
  }

  return techStack.some((item) => /react|next(?:\.js)?/i.test(item));
}

function formatMetric(value: number | undefined, fallback: string): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : fallback;
}

export function synthesizeArchitecturalWarning(metrics: DeterministicArchitectureMetrics): string {
  const requestCount = metrics.requestCount ?? 0;
  const domDepth = metrics.domDepth ?? 0;
  const hasHeadOfLineRisk = metrics.isHttp2 === false && requestCount > 100;
  const hasHydrationRisk = domDepth >= 3000 && includesReactStack(metrics.techStack);
  const hasCompressionRisk = metrics.hasGzip === false;

  const concerns: string[] = [];

  if (hasHeadOfLineRisk) {
    concerns.push(
      `目前站點在未啟用 HTTP/2 多工的情況下承載 ${formatMetric(metrics.requestCount, "大量")} 個請求，這不是單一資源太慢，而是 TCP 連線層級的 Head-of-Line Blocking 風險；每個靜態資產都在互相排隊，尖峰流量下會把首屏載入放大成系統性瓶頸。`,
    );
  }

  if (hasCompressionRisk) {
    concerns.push(
      "同時缺少 gzip/brotli 壓縮代表每一次 HTML、JS 與 CSS 傳輸都在浪費頻寬，會進一步放大慢速網路與跨區 CDN 回源的延遲。",
    );
  }

  if (hasHydrationRisk) {
    concerns.push(
      `DOM 深度已達 ${formatMetric(metrics.domDepth, "極高")}，且技術棧包含 React/Next.js；這表示瀏覽器不只要下載資源，還要在低階裝置上重建龐大的 hydration 樹，主執行緒、記憶體壓力與事件綁定成本會一起上升，長期甚至會增加客戶端記憶體洩漏與互動延遲風險。`,
    );
  }

  if (concerns.length === 0) {
    return "架構警示：目前 deterministic 指標尚未形成明確的系統性故障模式；建議持續收集 HTTP 協定、壓縮、請求數、DOM 深度與技術棧訊號，避免把單點 lint 結果誤判為完整架構健康狀態。結構性重構方向是建立固定的效能預算門檻，讓請求數、DOM 複雜度與傳輸壓縮在 CI 階段就被攔截。";
  }

  const severityPhrase = hasHeadOfLineRisk && hasHydrationRisk
    ? "這些低階誤設定正在互相疊加成災難性瓶頸"
    : "這些低階誤設定已經不只是局部優化問題，而是系統性瓶頸";

  const structuralFix = hasHydrationRisk
    ? "結構性重構方案是把前端切成更小的 Server Components / 島嶼式互動區塊，削減不必要的 DOM 巢狀與 hydration 邊界，並同步在 CDN 層啟用 HTTP/2 或 HTTP/3、多工傳輸、brotli/gzip 壓縮與長效快取，讓網路傳輸與客戶端渲染兩端一起降載。"
    : "結構性重構方案是將靜態資源收斂到 CDN 邊緣，啟用 HTTP/2 或 HTTP/3 多工、brotli/gzip 壓縮與資源合併/拆分策略，並設定請求數效能預算，從傳輸層消除 Head-of-Line Blocking 的放大效應。";

  return `架構警示：${concerns.join("")}${severityPhrase}；如果只逐項修補單一檔案或單一標籤，團隊會錯過真正的瓶頸來源。${structuralFix}`;
}
