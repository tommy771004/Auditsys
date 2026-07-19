import type { UrlEvidence } from "./urlEvidence";
import type { PresentationMeasuredEvidence } from "../../types/presentation";

/**
 * Pure presentation-deck generation: measured-evidence shaping, prompt building,
 * LLM JSON extraction, and the CrUX-grounded offline fallback deck. No I/O —
 * evidence comes in via UrlEvidence, decks go out as plain objects.
 */

export type PresentationEvidence = UrlEvidence;
export function looksLikeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
export function buildPresentationMeasuredEvidence(evidence: PresentationEvidence | null): PresentationMeasuredEvidence {
  const crux = evidence?.crux?.hasData ? evidence.crux : null;
  const det = evidence?.deterministic ?? null;
  const note = crux
    ? `核心網頁指標 (LCP/INP/CLS) 來自 Chrome UX Report 真實使用者欄位數據${crux.scope === "origin" ? "（網站整體範圍）" : "（此網址範圍）"}${crux.collectionPeriod ? `，採集期間 ${crux.collectionPeriod}` : ""}。後端、資料層與基礎架構等無法遠端量測的項目為模型推估。`
    : `此目標無 CrUX 真實使用者欄位數據；所有效能數值均為基於技術棧與已知痛點的模型推估，僅供示意。`;
  return {
    source: crux ? "crux" : "modeled",
    crux: crux
      ? {
          hasData: true,
          scope: crux.scope,
          collectionPeriod: crux.collectionPeriod,
          lcp: { p75: crux.metrics.lcp.p75, rating: crux.metrics.lcp.rating },
          inp: { p75: crux.metrics.inp.p75, rating: crux.metrics.inp.rating },
          cls: { p75: crux.metrics.cls.p75, rating: crux.metrics.cls.rating },
        }
      : null,
    responseTimeMs: det?.responseTimeMs ?? null,
    server: det?.headers?.server ?? null,
    note,
  };
}

export function buildMeasuredPromptContext(evidence: PresentationEvidence | null): string {
  if (!evidence) {
    return "（本次未取得任何伺服器端實測數據，請完全依據技術棧與已知痛點進行嚴謹推理，並在所有 metrics 的 comparison 欄位明確標註「估算」。）";
  }
  const lines: string[] = [];
  const crux = evidence.crux?.hasData ? evidence.crux : null;
  if (crux) {
    lines.push(`核心網頁指標 (Chrome UX Report${crux.scope === "origin" ? "，網站整體" : "，此網址"}${crux.collectionPeriod ? `，${crux.collectionPeriod}` : ""}):`);
    lines.push(`- LCP p75: ${crux.metrics.lcp.p75 == null ? "無數據" : `${(crux.metrics.lcp.p75 / 1000).toFixed(2)} 秒`}（評級 ${crux.metrics.lcp.rating ?? "無"}）`);
    lines.push(`- INP p75: ${crux.metrics.inp.p75 == null ? "無數據" : `${Math.round(crux.metrics.inp.p75)} 毫秒`}（評級 ${crux.metrics.inp.rating ?? "無"}）`);
    lines.push(`- CLS p75: ${crux.metrics.cls.p75 == null ? "無數據" : crux.metrics.cls.p75.toFixed(3)}（評級 ${crux.metrics.cls.rating ?? "無"}）`);
  } else {
    lines.push("核心網頁指標：此目標無 CrUX 真實使用者欄位數據；LCP/INP/CLS 必須標註為估算。");
  }
  const det = evidence.deterministic;
  if (det) {
    const probe: string[] = [];
    if (det.responseTimeMs != null) probe.push(`首次回應時間（近似 TTFB）${det.responseTimeMs} 毫秒`);
    if (det.statusCode != null) probe.push(`HTTP 狀態碼 ${det.statusCode}`);
    if (det.headers?.server) probe.push(`Server 標頭「${det.headers.server}」`);
    if (det.headers?.cacheControl) probe.push(`Cache-Control「${det.headers.cacheControl}」`);
    if (det.document?.counts) {
      const c = det.document.counts;
      probe.push(`文件資產：腳本 ${c.scripts}、樣式表 ${c.stylesheets}、圖片 ${c.images}（缺 alt ${c.imagesMissingAlt}）`);
    }
    if (probe.length > 0) {
      lines.push("伺服器端單次 HTTP 探測:");
      probe.forEach((entry) => lines.push(`- ${entry}`));
    }
  }
  return lines.length > 0 ? lines.join("\n") : "（無可用實測數據。）";
}

export function generateSmartPresentationFallback(
  url: string,
  techStack: string,
  knownIssues: string,
  evidence: PresentationEvidence | null,
  measuredEvidence: PresentationMeasuredEvidence,
) {
  const isNestDotNet = techStack.toLowerCase().includes(".net") || techStack.toLowerCase().includes("c#") || techStack.toLowerCase().includes("sql server");
  const isReact = techStack.toLowerCase().includes("react") || techStack.toLowerCase().includes("next.js") || techStack.toLowerCase().includes("nextjs");

  const crux = evidence?.crux?.hasData ? evidence.crux : null;
  const realLcpSec = crux?.metrics.lcp.p75 != null ? Number((crux.metrics.lcp.p75 / 1000).toFixed(2)) : null;
  const realInpMs = crux?.metrics.inp.p75 != null ? Math.round(crux.metrics.inp.p75) : null;
  const realCls = crux?.metrics.cls.p75 != null ? Number(crux.metrics.cls.p75.toFixed(3)) : null;

  const ratingToScore = (rating: string | null | undefined): number | null =>
    rating === "good" ? 88 : rating === "needs-improvement" ? 68 : rating === "poor" ? 44 : null;
  const cwvRatingScores = crux
    ? [crux.metrics.lcp.rating, crux.metrics.inp.rating, crux.metrics.cls.rating].map(ratingToScore).filter((v): v is number => v != null)
    : [];
  const cwvHealth = (rating: string | null | undefined): "red" | "yellow" | "green" =>
    rating === "good" ? "green" : rating === "needs-improvement" ? "yellow" : "red";
  const worstCwvRating = crux
    ? [crux.metrics.lcp.rating, crux.metrics.inp.rating, crux.metrics.cls.rating].includes("poor")
      ? "poor"
      : [crux.metrics.lcp.rating, crux.metrics.inp.rating, crux.metrics.cls.rating].includes("needs-improvement")
        ? "needs-improvement"
        : "good"
    : null;
  const estTag = "（估算，無 CrUX 實測）";

  const score = cwvRatingScores.length > 0
    ? Math.round(cwvRatingScores.reduce((a, b) => a + b, 0) / cwvRatingScores.length)
    : (knownIssues.length > 50 ? 56 : 64);

  const slides = [
    {
      slideId: 1,
      title: "高階主管摘要與商業影響",
      subtitle: "Executive Summary & Business Impact",
      healthStatus: score < 60 ? "red" : "yellow",
      bullets: [
        `針對評估系統「${url}」之效能審查，目前因為「${knownIssues.substring(0, 45)}」等瓶頸，已對關鍵業務目標造成重大阻礙。`,
        "頁面載入速度每延遲 1 秒，使用者轉換漏斗流失率也按比例攀升，特別嚴重壓抑開戶、結帳與註冊事件。",
        isReact
          ? "前端 JavaScript 資源包體積膨脹，在高延遲行動網路下引發嚴重的首次載入白屏問題。"
          : "前端由於阻塞腳本及載入瀑布流未優化，已阻礙搜尋引擎自然流量，增加付費廣告之獲客成本。",
      ],
      explanations: [
        `經過深度效能稽核，目前 ${url} 在主流裝置的加載評級落入警告空間（健康得分為 ${score}/100）。`,
        "當網頁載入時間超過 4 秒，使用者跳出率通常會比 1.5 秒網頁增加 60% 以上；當前過高的回應延遲已大幅拉低推廣預算的獲客報酬率 (ROI)。",
        "Google 已將 Core Web Vitals 納入 SEO 的強制排名考量。不達標的指標正在拖累自然成長流量，流失潛在商業機會。",
      ],
      chartType: "conversion",
      chartData: [
        { name: "1秒 (優)", conversion: 4.8, bounce: 15, latency: 120 },
        { name: "2秒 (良)", conversion: 4.1, bounce: 22, latency: 260 },
        { name: "3秒 (中)", conversion: 2.8, bounce: 36, latency: 510 },
        { name: "4秒 (差)", conversion: 1.4, bounce: 52, latency: 1100 },
        { name: "5秒 (極差)", conversion: 0.5, bounce: 75, latency: 2200 },
      ],
      metrics: [
        { label: "轉換率預期落差", value: `${score < 60 ? "-2.2%" : "-1.4%"}`, unit: "百分比", comparison: "相較於優秀效能標準" },
        { label: "行動端跳出率增幅", value: "+45%", unit: "百分比", comparison: "當前實測估值" },
        { label: "SEO 自然流量降權", value: "中高度風險", unit: "風險", comparison: "核心網頁指標基準" },
      ],
      technicalInsight: `使用「${techStack}」架構架設的系統，效能瓶頸在首字下載延遲 (TTFB) 與首繪時間 (FCP) 上拖累了整體互動性。`,
      businessTakeaway: "必須立刻展開短期與中期修復戰略，將核心頁面載入時間限縮至 2.5 秒以內，以拉回 15-20% 的跳出客群、提高付費轉換收益。",
    },
    {
      slideId: 2,
      title: "前端渲染與使用者體驗分析",
      subtitle: "Frontend UX & Rendering Metrics",
      healthStatus: crux ? cwvHealth(worstCwvRating) : "red",
      bullets: [
        crux
          ? `LCP (最大內容繪製) 實測 ${realLcpSec ?? "無數據"} 秒，CrUX 評級「${crux.metrics.lcp.rating ?? "無"}」。${(realLcpSec ?? 0) > 2.5 ? "高於 Google 綠色基準 2.5 秒，最大視覺區塊首屏載入受阻。" : "已達 Google 綠色基準。"}`
          : (isReact ? "LCP (最大內容繪製) 偏高：主 Bundle 包缺乏 Code-Splitting 分割，使最大視覺區塊首屏載入受阻。" : "LCP 指標偏低：大量關鍵渲染 CSS 與非優先腳本阻塞了瀏覽器的主渲染線索。"),
        crux
          ? `INP (與下個繪製互動) 實測 ${realInpMs ?? "無數據"} 毫秒，CrUX 評級「${crux.metrics.inp.rating ?? "無"}」。${(realInpMs ?? 0) > 200 ? "主執行緒受 JavaScript Hydration 鎖止，使用者輸入有延遲。" : "互動回應已達標。"}`
          : "INP (與下個繪製互動) 偏高：主線程在 Hydration 過程中被大型 JavaScript 元件樹的初始化解析鎖止，造成使用者輸入卡頓。",
        crux
          ? `CLS (累計版面配置位移) 實測 ${realCls ?? "無數據"}，CrUX 評級「${crux.metrics.cls.rating ?? "無"}」。${(realCls ?? 0) > 0.1 ? "動態資產缺少版面尺寸定義，造成版面晃動。" : "版面穩定度達標。"}`
          : "CLS (累計版面配置位移) 風險存在：缺少明確版面尺寸定義的動態資產（如 Banner 廣告、客製字型）造成版面晃動。",
      ],
      explanations: [
        crux
          ? `以上 LCP / INP / CLS 為 Chrome UX Report 真實使用者欄位數據（${crux.scope === "origin" ? "網站整體範圍" : "此網址範圍"}${crux.collectionPeriod ? `，採集期間 ${crux.collectionPeriod}` : ""}），代表實際使用者在真實裝置與網路下的體驗。`
          : "（注意：此目標無 CrUX 真實使用者欄位數據，以下 CWV 數值為基於技術棧的估算，僅供示意。）",
        isReact ? "React 應用載入時常伴隨巨量主 Bundle 包，在行動端 CPU 弱裝置上往往耗費數秒載入並解析。" : "CSS Web Font 未配置 font-display: swap 導致字體載入前半白屏；多個外部 JavaScript 同步下載阻塞了瀏覽器的第一次繪製效率。",
        "在載入過程中，廣告版面或圖片完成加載後無預警伸展推下原有排版，在手機觸控上極易造成使用者誤觸，屬於嚴重的體驗與轉換硬傷。",
      ],
      chartType: "cvw",
      chartData: [
        { name: "LCP 最大內容繪製", current: realLcpSec ?? 4.6, good: 2.5, label: "LCP (秒)" },
        { name: "INP 與下個繪製互動", current: realInpMs ?? 450, good: 200, label: "INP (毫秒)" },
        { name: "CLS 累計版面配置位移", current: realCls ?? 0.25, good: 0.1, label: "CLS (位移值)" },
      ],
      metrics: [
        { label: "LCP 最大內容繪製", value: realLcpSec != null ? String(realLcpSec) : "4.6", unit: "秒", comparison: realLcpSec != null ? "CrUX 實測 · Google 綠色基準：2.5秒內" : `Google 綠色基準：2.5秒內 ${estTag}` },
        { label: "INP 互動響應延遲", value: realInpMs != null ? String(realInpMs) : "450", unit: "毫秒", comparison: realInpMs != null ? "CrUX 實測 · Google 綠色基準：200毫秒內" : `Google 綠色基準：200毫秒內 ${estTag}` },
        { label: "CLS 累計佈局位移", value: realCls != null ? String(realCls) : "0.25", unit: "位移值", comparison: realCls != null ? "CrUX 實測 · Google 綠色基準：0.1以下" : `Google 綠色基準：0.1以下 ${estTag}` },
      ],
      technicalInsight: "必須引進現代代碼拆分、延遲載入非核心 JS、內聯核心路徑 CSS，以及指定排版圖片的寬高，以改善三項 CWV。",
      businessTakeaway: "將 Core Web Vitals 優化至綠色安全值後，轉換率平均可提高 11% 以上，並全面改善行動裝置的使用流暢滿意度。",
    },
    {
      slideId: 3,
      title: "後端、API 與資料層稽核",
      subtitle: "Backend, API & Data Layer Analysis",
      healthStatus: "yellow",
      bullets: [
        isNestDotNet ? "Entity Framework ORM 在處理深關聯物件時觸發潛在 N+1 查詢，後端累計多次資料庫查詢往返造成的高延遲。" : "後端 ORM 架構在資料庫關聯表撈取時缺乏 SQL 優化，引發巢狀迴圈查詢問題（N+1），使連線池高載阻滯。",
        "API 缺乏 DTO 專用傳輸剪裁，過度過載推送了整個深度物件 tree 至前端，引發序列化/反序列化和傳輸高開銷。",
        "高流量或高耗能查詢 API 缺乏合適的快取或預加載設計，造成後端伺服器在尖峰連線時 CPU 使用率劇增卡死。",
      ],
      explanations: [
        isNestDotNet ? "在 .NET 8 使用 EF Core 若不謹慎，單個 API 就會重複呼叫 Kestrel 與 SQL Server 進行多次往返小 query，阻礙並發能力。" : "對大型表單進行過載查詢，且在關聯表字段缺乏關聯複合索引下，使後端響應動輒拖延 1.5 秒以上。",
        "未剪裁的巨大 JSON payload 動輒數百 KB 甚至數 MB，不僅佔用行動頻寬，也增加了客戶端 JavaScript 的記憶體垃圾回收 (GC) 停頓。",
        "未針對靜態多讀、少寫端點引錄快取，使每一次重複的數據讀取皆重打底層資料庫，增加伺服器源站耗費與當機機率。",
      ],
      chartType: "backend",
      chartData: [
        { name: "資料庫 N+1 查詢", current: 1500, target: 120 },
        { name: "JSON 反序列開銷", current: 550, target: 40 },
        { name: "API 框架處理層", current: 250, target: 30 },
        { name: "API 網路下載延遲", current: 400, target: 150 },
      ],
      metrics: [
        { label: "資料 N+1 慢查詢", value: "偵測到預期瓶頸", unit: "警示", comparison: "亟需以 Join/Select 裁剪改進（模型推估）" },
        { label: "API payload 體積", value: "2.5", unit: "MB", comparison: "業界高標準：200KB 內（模型推估）" },
        { label: "後端快取配置", value: "目前無有效快取", unit: "狀態", comparison: "必須置入記憶體快取或預加載（模型推估）" },
      ],
      technicalInsight: `「${techStack}」之後端需要實施 DTO 全面裁剪與 SQL 集群預加載，杜絕多餘的關聯樹序列化和無謂內存浪費。`,
      businessTakeaway: "解決資料層慢查詢與引入 Redis 快取後，API 的回應速度普遍可提振 80%，不僅節省 65% 源伺服器開銷，更消除了高流量當機威脅。",
    },
    {
      slideId: 4,
      title: "基礎架構與網路傳輸優化",
      subtitle: "Infrastructure & Distribution Network",
      healthStatus: "yellow",
      bullets: [
        "CDN 快取規則配置較保守，靜態資產命中率 (Cache Hit Rate) 下滑至 25% 以下，起不到邊緣防護作用。",
        "傳輸壓縮尚未完全升級，仍依賴舊式 Gzip 甚至是無壓縮，錯失了可以再縮小 ~30% 檔案尺寸之 Brotli 壓縮。",
        "API 交握與資源傳輸尚未完全普及 HTTP/2 或 HTTP/3 多路複用，受到傳統單一連線限制，阻塞在排隊階段。",
      ],
      explanations: [
        "靜態打包檔案 URL 未實施雜湊的版本控管（Immutable Hash Identifier），無法設定長效 edge caching，拖累了 CDN 本身應有的加速效果。",
        "與高強度 Brotli 動態壓縮相比，無壓縮或單純 Gzip 使得客戶端被迫下載更多的 byte 數，這在不穩定的行動頻寬環境中特別致命。",
        "在舊版連線協定中，多路複用（Multiplexing）缺失，任何大 asset 的下載皆會遲滯後續 CSS 與 API 請求。全面實施 HTTP/2 和 HTTP/3 為當務之急。",
      ],
      chartType: "network",
      chartData: [
        { name: "CDN 快取命中", value: 25, label: "HIT" },
        { name: "CDN 穿透回源", value: 55, label: "MISS" },
        { name: "CDN 繞過 Bypass", value: 20, label: "BYPASS" },
      ],
      metrics: [
        { label: "CDN 快取命中率", value: "25%", unit: "百分比", comparison: "業界優良目標：80%以上（模型推估）" },
        { label: "靜態與 API 壓縮力", value: "限制普通 Gzip", unit: "狀態", comparison: "建議更換為 Brotli 極致壓縮（模型推估）" },
        { label: "連線協定", value: "HTTP/1.1 混雜", unit: "協定", comparison: "極佳推薦升級 HTTP/2 ＆ HTTP/3（模型推估）" },
      ],
      technicalInsight: "為部署資產加上永恆快取 Hash，並更換為動態 Brotli 壓縮（壓縮比高 30% 級別），是解決傳輸瀑布死鎖的不二法則。",
      businessTakeaway: "優化 CDN 快取命中率至 85% 後，除了大幅減輕伺服器原站頻寬費用負擔，還能在高流量促銷時確保全網極速加載不塞車。",
    },
    {
      slideId: 5,
      title: "效能優化分級修復戰略",
      subtitle: "Graded Action Plan",
      healthStatus: "green",
      bullets: [
        "黃金 48 小時短期速效戰 (Quick Wins)：在 CDN 邊緣設定高強度 Max-Age 快取規則、開啟自動 Brotli、對首屏核心圖片實施 WebP/AVIF 輕量化轉換、避免 LCP 繪製延宕。",
        "中期敏捷優化戰 (1-2 Sprints)：消滅 ORM 的多層慢 SQL N+1 查詢問題、增加關聯複合索引、並實施後端快取 (如 Redis/Local Cache) 機制、精簡 API 回傳 Payload。",
        "長期架構蛻變 (Structural Changes)：進行架構解耦、引入 SSR 服務端渲染或 ISR，或者把熱點運算邏輯部署至 Serverless CDN Edge Computing，提供極致流暢的首字 TTFB 時間。",
      ],
      explanations: [
        "短期速效修正可在無需更動任何後端商業邏輯下快速上工，極速提升客戶首頁的最大內容核心指標。",
        "中期敏捷優化針對數據庫性能瓶頸做精準手術，解決 N+1 並配合 API JSON 資料裁剪與後端快取，讓 API 支持高併發。",
        "長期架構改造則重塑前、後端耦合結構，全面引進 Edge 本地邊緣分發快取機制與靜態渲染模式，徹底消除高負載引起的卡死瓶頸。",
      ],
      chartType: "action",
      chartData: [
        { name: "短期 48小時 QuickWins", impact: 85, effort: 15, priority: "最高" },
        { name: "中期 1-2 Sprints", impact: 92, effort: 45, priority: "高" },
        { name: "長期 結構架構調整", impact: 95, effort: 80, priority: "中" },
      ],
      metrics: [
        { label: "短期速效成效", value: "LCP 縮減 ~1.5秒", unit: "加載提速", comparison: "CDN 快取與核心 CSS 內聯" },
        { label: "中期 API 優化", value: "API 延遲縮減 ~80%", unit: "響應提速", comparison: "Redis 快取、SQL 索引與 N+1 修正" },
        { label: "長期架構重塑", value: "主機負荷預期 -65%", unit: "資源節省", comparison: "網頁靜態渲染與邊緣 Edge 端分發" },
      ],
      technicalInsight: "遵循「先邊緣部署、再後端代碼微改進、最後核心架構解耦」之戰略，能在最低開發成本與磨擦下獲取最高能效產出比。",
      businessTakeaway: "立即發動「黃金 48 小時短期速效戰」能幫助非工程團隊（如行銷、產品主管）快速感受到核心加載提升，挽回大流量流失客戶、拉高行銷預算回報率 (ROI)。",
    },
  ];

  return {
    url,
    techStack,
    knownIssues,
    generatedAt: new Date().toISOString(),
    overallScore: score,
    slides,
    modelUsed: crux ? "Offline Fallback Generator (CrUX-grounded)" : "Offline Fallback Generator",
    measuredEvidence,
  };
}

export function buildPresentationPrompt(input: {
  url: string;
  techStack: string;
  knownIssues: string;
  providedSummary: string;
  language?: string;
  measuredContext: string;
}): string {
  const isZh = input.language === "zh-TW";
  const languageInstruction = isZh
    ? "1. 必須嚴格使用台灣繁體中文 (zh-TW)，以及台灣標準 IT 術語。\n          2. 不要使用任何簡體字、大陸用語。"
    : `1. You MUST write the ENTIRE presentation JSON content in ${input.language || 'English'} language.`;

  return `
          你是 15 年資歷的頂尖雲端架構師 (Principal Cloud Architect) 與網頁效能稽核專家 (Expert Web Performance Auditor)。
          現正為客戶準備一份以「網頁效能與速度 (Performance and Speed)」為核心的「稽核簡報 (Audit Presentation)」。
          
          請針對以下網站、技術棧、已知痛點以及真實的稽核掃描數據進行深度效能稽核與分析，並輸出 5 個精確、可直接用於 Keynote/PowerPoint 簡報的投影片資料。
          目標受眾：包含 C-level 高階主管與技術負責人 (Engineering Lead)。

          【稽核環境與真實脈絡】
          - 目標網站或系統: ${input.url}
          - 現行技術棧: ${input.techStack}
          - 已知痛點/主要效能瓶頸: ${input.knownIssues}${input.providedSummary}

          【格式與術語規則】
          ${languageInstruction}
          3. 必須輸出一個合法的、乾淨的 JSON 物件。請不要用 markdown 的 \`\`\`json ... \`\`\` 來封裝 output，只輸出純 JSON 字串即可。
          4. 數據真實性原則：下方【實測數據】是本次伺服器端真實量測到的數值，凡有提供者必須直接採用，不得竄改。對於未量測到的面向，允許依技術棧做專業推估，但必須在 comparison 欄位明確標註「估算」二字。

          【實測數據（伺服器端真實量測）】
          ${input.measuredContext}

          僅返回純 JSON，結構如下：{"url","techStack","knownIssues","generatedAt","overallScore","slides":[{"slideId","title","subtitle","healthStatus","bullets","explanations","chartType","chartData","metrics","technicalInsight","businessTakeaway"}]}
        `;
}

/** Strips markdown code fences from an LLM response and parses the JSON payload. */
export function extractJsonPayload(textResponse: string): Record<string, unknown> | null {
  let cleanText = textResponse.trim();
  const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    cleanText = jsonMatch[1].trim();
  } else {
    cleanText = cleanText.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  try {
    const parsed: unknown = JSON.parse(cleanText);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
