# Auditsys UI/UX 審查報告

審查日期：2026-05-29  
範圍：現有 React/Next-style 前端頁面與 Tailwind 元件，聚焦首頁、Mission Control、Live Audit Dashboard 與核心 UI primitives。  
Figma 狀態：本次 Codex session 未暴露可直接寫入 Figma 的 MCP tool，因此先產出 repo-local 規格文件，供後續匯入 Figma 或由設計系統工具轉換。

## 總體判斷

Auditsys 已經形成清楚的高科技稽核產品視覺語言：深色畫布、玻璃擬態容器、violet/cyan/blue 光暈、任務控制台式資訊密度，以及「自動化稽核 + AI intelligence」的產品定位。整體品牌記憶點強，但目前主要 UX 風險不是美感不足，而是資訊優先序、狀態語意與真實資料可信度在高密度畫面中被視覺效果稀釋。

建議下一階段把 UI 分成三層資訊架構：`Executive Signal`、`Evidence Layer`、`Remediation Layer`。也就是先讓使用者快速知道「是否有問題、嚴重程度、下一步」，再展開 DOM patch、Core Web Vitals、終端輸出與技術細節。

## 主要優勢

- 品牌視覺一致：`GlassCard`、`GlassContainer`、`MeshBackground` 與 `GlowingButton` 建立了穩定的 dark glassmorphism 系統。
- 產品敘事完整：首頁負責轉換，Mission Control 負責 orchestrated audit，Live Dashboard 負責即時證據流。
- 互動基礎良好：按鈕具備 loading、disabled、focus-visible 與最小 44px hit target，符合操作可用性底線。
- 技術可信感強：DOM issue patch、Core Web Vitals、terminal stream、trend analytics 都能支撐「可驗證稽核」定位。
- Motion 有節制基礎：Framer Motion 用在頁面進場、卡片 reveal、背景 glow，而非每個微互動都過度動畫化。

## 關鍵 UX 風險

### P1：高密度玻璃卡片造成資訊層級競爭

現象：首頁、Mission Control、Live Dashboard 大量使用相近的 border、blur、shadow、rounded panel，導致主要 CTA、掃描狀態、嚴重告警與輔助說明在視覺重量上互相競爭。

證據：
- `src/components/ui/GlassCard.tsx` 使用 `rounded-[24px]`、`ring-white/10`、`shadow-2xl`、`backdrop-blur-[40px]` 作為廣泛基底。
- `src/components/ui/GlassContainer.tsx` 使用 `rounded-[32px]`、`bg-slate-900/50`、accent shadow 作為大區塊基底。
- `src/pages/AuditConsole.tsx` 在單一頁面同時呈現 mission input、stream、metrics、subagents、memory、capabilities 與 final report。

建議：
- 建立三種 panel 層級：`Primary Decision Panel`、`Evidence Panel`、`Utility Panel`。
- Primary panel 限定使用最強光暈與最高 contrast；Evidence panel 降低 shadow；Utility panel 使用更平的背景。
- Figma component variants 應明確定義 `priority=primary|evidence|utility`，避免每張卡都像主角。

### P1：Live Dashboard 的圖表可能顯示 fallback，而不是最新掃描摘要

現象：`RealAuditDashboard` 在完成狀態中呼叫 `<AnalyticsChartsPanel />`，沒有傳入 `summary`。目前 `AnalyticsChartsPanel` 支援 `summary` props，但未接上 Live Scan 的真實摘要時，使用者可能誤以為 fallback/mock chart 是本次掃描結果。

證據：
- `src/components/ui/AnalyticsChartsPanel.tsx` 定義 `AnalyticsChartsPanelProps` 並接受 `summary`。
- `src/pages/RealAuditDashboard.tsx:230` 呼叫 `<AnalyticsChartsPanel />`。

建議：
- 產品文案層面：圖表加上資料來源 badge，例如 `本次掃描`、`估算`、`歷史趨勢`。
- 工程層面：在 Live Dashboard 完成狀態傳入 `summary={summary}`，並在缺少資料時顯示 explicit empty state。
- Figma 規格需包含 `dataSource=live|estimated|trend|empty` variants。

### P1：品牌色與風險語意色混用，降低告警辨識速度

現象：violet/cyan/blue 同時承載品牌、導覽 active state、卡片光暈與資訊類型。當 amber/rose/emerald severity 出現時，使用者需要額外解讀哪個色彩代表「風險」而哪個只是品牌效果。

證據：
- `tailwind.config.ts` 同時定義 `brand.purple`、`brand.cyan`、`brand.blue` 與 `semantic.success|warning|danger`。
- `ConsoleTabs` 使用 violet/cyan/emerald/amber 表示不同路由 active state。
- `DOMIssueHighlighter` 用 amber/violet/rose/cyan 映射不同 issue type。

建議：
- 將色彩 token 拆成 `Brand Accent`、`Status Severity`、`Data Category` 三組。
- 風險層級固定只用 semantic success/warning/danger；品牌光暈不可直接代表 severity。
- Figma variables 應建立 semantic aliases，例如 `color.status.warning.fg`、`color.brand.cyan.glow`。

### P2：非技術決策者缺少快速摘要入口

現象：Live Dashboard 完成後會展示 charts、summary、terminal、DOM issues、CWV、actions，但缺少最上方的「一句話結論 + 最高優先修復 + 商業影響」。

建議：
- 在完成狀態新增 `Executive Audit Snapshot`：總分、最嚴重風險、預估影響、下一步 CTA。
- 將 terminal 與 code patch 放在 evidence/remediation 區域，不應是第一眼焦點。
- Figma screen spec 應新增 `AuditOutcomeHero` component。

### P2：行動版資訊壓縮需要更明確的任務導向

現象：`PageContainer` 有良好 responsive padding，主要 grids 會堆疊，但 Audit Console 與 Live Dashboard 在手機上可能形成長卷軸與認知負擔。

建議：
- 手機版保留 sticky scan status bar：目前 URL、scan phase、stop/retry action。
- 技術區塊預設 collapse，只展開最重要的 1-2 個告警。
- Figma mobile frame 應優先設計「掃描進度」與「完成後摘要」，不是完整桌面堆疊縮小版。

### P2：微小 uppercase labels 可讀性需做 WCAG 檢查

現象：多處使用 `text-[10px]`、`text-[11px]`、uppercase、tracking spacing。在深色玻璃背景上，這種 style 很有科技感，但對低視力、低亮度螢幕與中文長字串不友善。

建議：
- Caption 最小建議 12px；只有非必要 metadata 可用 10px。
- 中文介面避免過度 uppercase tracking；改用字重與色彩建立階層。
- Figma spec 應標記 `caption.meta` 與 `caption.control` 的最小尺寸與 contrast target。

## Screen-by-Screen 審查

### Home

用途：品牌敘事、URL 掃描入口、功能說明與工作流預覽。  
評估：視覺吸引力高，CTA 明確；但 hero form panel 與周邊 trust pills、status panel、feature cards 光暈都偏強，會稍微削弱主要輸入框的焦點。

優化方向：
- Hero form 的 input + primary button 應成為唯一最高視覺權重。
- Trust pills 降低 contrast，作為 secondary confidence signals。
- 首屏保留 1 個 primary CTA 和 1 個 secondary CTA，避免轉換路徑分散。

### Mission Control / Audit Console

用途：讓使用者理解 AI audit orchestration 與多 agent 執行流程。  
評估：產品差異化強，但目前更像「展示一套強大的系統」，對首次使用者而言可能比「完成一個稽核任務」更重。

優化方向：
- 將任務流拆成 `Prepare`、`Execute`、`Synthesize`、`Deliver` 四個明確階段。
- 在 stream 上方新增 current phase summary，減少使用者逐行讀 terminal/stream 的需求。
- Subagent cards 適合做為 progressive disclosure，而非完成報告前的主焦點。

### Live Audit Dashboard

用途：即時掃描、顯示 DOM patches、CWV、scan summary 與報告 actions。  
評估：這是 Auditsys 最接近「可驗證價值」的畫面，應成為設計系統最高優先規格化的 screen。

優化方向：
- 完成狀態第一屏先顯示 outcome hero + top regressions，而不是直接進入 chart。
- 每個資料區塊顯示 provenance：`Browser Collector`、`CrUX Field Data`、`Lighthouse Lab`、`AI Synthesis`。
- DOM patches 的 original/fixed code 對工程師很有價值，但需提供 copy action、severity、affected element count。

## 建議的設計系統重構方向

- 將現有 `GlassCard` 與 `GlassContainer` 抽成一個 Figma `Surface` family：`surface=card|container|nav|terminal`、`priority=primary|standard|quiet`、`accent=none|violet|cyan|blue|severity`。
- 將 `GlowingButton` 抽成 `Button` family：`variant=primary|secondary|ghost|danger`、`state=default|hover|focus|loading|disabled`。
- 將 `ConsoleTabs` 抽成 `Navigation Tabs`：`density=desktop|mobile`、`activeRoute=console|live|report|presentation`。
- 將 scan outcome 拆成獨立 components：`AuditOutcomeHero`、`MetricDeltaCard`、`DataSourceBadge`、`RemediationPatchCard`。
- 將 severity 與 issue type 分離：issue type 可用 icon/label，severity 必須用固定 semantic token。

## 建議優先級 Backlog

1. 修正 Live Dashboard 圖表資料來源，避免 fallback chart 被誤讀為真實掃描結果。
2. 建立 Figma foundation variables：brand、surface、semantic、data category、typography、radius、shadow、motion。
3. 建立 `Surface`、`Button`、`Tabs`、`MetricCard`、`DOMPatchCard`、`AuditOutcomeHero` component set。
4. 重設 Live Dashboard 完成狀態資訊順序：Outcome -> Trend/Regression -> Evidence -> Remediation -> Export.
5. 針對 mobile 設計 dedicated flow，而不是僅依賴桌面 grid stack。
6. 做一次 WCAG contrast 與 keyboard focus audit，尤其是 translucent panels、tiny labels、terminal/code blocks。

## 成功標準

- 首次使用者在 5 秒內能回答：「這次掃描好不好？最該修什麼？下一步是什麼？」
- 工程師能在 Live Dashboard 直接複製 production-ready patch，不必猜資料來源或嚴重程度。
- 設計師能從 Figma component variants 組出 Home、Audit Console、Live Dashboard，而不用重新解讀 Tailwind class。
- 品牌效果仍然強，但 severity、data provenance、primary action 不被 glow 與 glass 視覺淹沒。
