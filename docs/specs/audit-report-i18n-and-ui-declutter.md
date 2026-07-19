# Spec: 報告模組收斂、介面減量、去冗(R1 / R2 / R2.5 / R3)

> 狀態:`ready-for-agent`(無 issue tracker,檔內欄位代替)
> 來源:2026-07-19 grill session,接 `architecture-consolidation.md` 未完成的 C2 報告模組 + C6 console 視覺減量,並補三條新主軸
> 詞彙:module / interface / seam / depth / leverage / locality 依 `codebase-design` 定義
> 前置:`architecture-consolidation.md` 的 C1 / C3 / C4 / C5 / C7 已合併,本檔不重啟

## Problem Statement

`architecture-consolidation.md` 完成了 7 個候選中的 5 個,但 C2(報告模組收斂)與 C6(console 視覺減量)尚未完工,且使用者追加三個新訴求:

1. **根本架構性問題** — 同一份 audit 結果仍有 4 條渲染路徑:console / sample-report / real-audit-dashboard 共用 view-model,但 `Admin` 透過 `ReportRenderer` 自己 parse JSON 字串、`AuditPresentation` 內聯 `recharts` 加自家 `renderChartByType`。score / chart 邏輯散在 7 個檔案,改一個規則要動多處。
2. **UI/UX 過度複雜** — 每頁疊 blueprint grid + 三顆 blur[120px] 跑無限動畫的彩色光球;`App.tsx` 整頁路由切換跑 scale + blur 過場並對四個路由強制光鎖;`bg-noise` noise 層再疊一層視覺負擔;同一個視覺元素常被兩層 wrapper 同包(`GlassCard` 內再 `bg-white/5 + border`)。視覺訊號互相打架、低階裝置掉格。
3. **冗餘細項** — 死元件留在程式庫無 importer(`AnalyticsChartsPanel` / `TwoRetryGovernance` / `MetricRing` / `DashboardWidget`);`SeoChecklist` 與 `SeoChecklistGuide` 同一條 SEO 清單包兩層介面;`Admin.tsx` 968 行把六個 tab 的 view 熔在同一檔。

且 audit finding 的人話解釋目前不存在 — 畫面只有 `issue` / `impact` / `severity` 三個技術字串欄位,一般使用者讀不懂「主圖 > 5MB」「LCP 4.2s」這類輸出。

## Solution

四條整併重構,依依賴順序執行,單一 feature branch、每候選獨立 commit、每步間測試套件 + `tsc --noEmit` + production build 通過:

1. **R1 — 完成報告模組收斂**。深化為三個分層 view-model module,各自小介面、各自深:`buildAuditReportViewModel(auditResult)`(報告四頁用,含 finding explanation)、`buildSlidesViewModel(auditResult)`(presentation slides 用)、`buildAdminStatsViewModel(audits[])`(admin status aggregate 用)。score / chart 由 `AuditCharts` / `AuditScoreBoard` / `AuditFindings` 唯一一組,slides 內聯圖表與 admin pie chart 改吃同一份 view-model,死碼 `ReportRenderer` 一併清。

2. **R2 — 全站視覺層減量**。`MeshBackground` 砍三顆光球保留 grid、App 路由切換 framer-motion 過場移除、`lightLockRoutes` 鎖光邏輯移除、`bg-noise` div + `.bg-noise` CSS + texture asset 一併清。Home / Intake / Pricing 行銷頁的 `Reveal` 入場、page-level stagger、`Logos3` logo wall 保留不動 — R2 不重置行銷設計語言。

3. **R2.5 — 同視覺元素 wrapper-stack 機械掃**。grep 找出「外層 component + 內層再 `bg-white/[0-9]+` / `border` / `rounded` 同空間重複」的 call site,內層無語意負擔的多餘 wrapper 砍掉。不改 element 內部 border / shadow / ring 設計,不依賴 design judgement,只掃 wrapper-stack 一種 pattern。

4. **R3 — 去冗死碼 + 双生合一**。死元件直接刪(0 importer 為準,`AnalyticsChartsPanel` / `TwoRetryGovernance` / `MetricRing` / `DashboardWidget` / `ReportRenderer`);`SeoChecklist` + `SeoChecklistGuide` 合成單一元件 + variant prop。

加上**報告人話化**這條 R1 內 sub-track:audit finding 要能給一般使用者看得懂,不只吐技術字串。

## User Stories

1. As a 報告讀者, I want console / sample-report / real-audit-dashboard / admin / presentation 五個畫面讀到同一份 audit 結果時分數與圖表一致, so that 我換入口不會看到矛盾的數字。
2. As a 一般使用者(非技術), I want 每個 audit finding 都附一段人話解釋, so that 我看得懂「LCP 4.2s」是什麼、對我網站代表什麼。
3. As a 一般使用者, I want 無 LLM 時(free tier 或離線)報告仍有人話解釋, so that 我不會看到只回技術字串的 fallback。
4. As a 維護者, I want score 與 chart 邏輯只存在一份 `buildAuditReportViewModel`, so that 改規則一次生效於所有畫面。
5. As a 維護者, I want `AuditPresentation` 不再內聯 recharts dispatch, so that 圖表只有一組共用元件。
6. As a 維護者, I want `Admin` 不再內聯 pie chart 與 `ReportRenderer`, so that dashboard 與報告四頁共享同一渲染路徑。
7. As a 維護者, I want `AuditFinding` 型別加 `affectedMetric: string | null` 與 `category` 推導, so that category 判斷有型別保護而非散文自由填。
8. As a 維護者, I want `categorizeFinding` 是後端 LLM 路徑與 deterministic fallback 路徑的唯一出口, so that 兩端不會各自維護一套歸類邏輯而漂移。
9. As a 維護者, I want unknown finding category 被 telemetry 記錄, so that 我能看到 category 列表何時需要擴充而不靠直覺。
10. As a 譯者, I want finding 解釋文案集中在 `report.explanation.<category>` i18n namespace, so that 翻譯不必在 JSX 三元式內找。
11. As a 使用者, I want 頁面不再每秒跑三顆無限動畫彩色光球, so that 低階裝置與電池不再被吃、頁面載入更輕。
12. As a 使用者, I want 路由切換不再有 scale + blur 過場, so that 換頁瞬時、不卡格。
13. As a 使用者, I want theme toggle 在 dashboard 頁跟在行銷頁行為一致, so that 我不會被鎖光邏輯搞糊塗。
14. As a 維護者, I want `bg-noise` div、CSS、texture 一併清掉, so that 視覺負擔下降一層且 CSS 無死碼。
15. As a 維護者, I want 同視覺元素 wrapper-stack 的雙層 caller 機械掃掉, so that `GlassCard` 不再被同空間再加 `bg-white/5 + border` 之類重複一層。
16. As a 維護者, I want 死元件完全從 `src/components/ui/` 移除, so that 探索與 review 時不再被 0-importer 檔案誤導。
17. As a 維護者, I want `SeoChecklist` 與 `SeoChecklistGuide` 合一成單一元件 + variant prop, so that SEO 清單只有一份介面知識。
18. As a 營運者, I want 既有 audit 資料(無 `affectedMetric` 的舊報告)在新增欄位後仍能 render, so that 遷移不需手動 backfill。
19. As a 使用者, I want dashboard card 視覺負擔下降, so that 重點清楚、頁面簡潔。
20. As a 維護者, I want 每個 R 獨立 commit 且步步驗證, so that 任何一步出問題可單獨 revert 不拖累其他候選。
21. As a 維護者, I want C2 / C6 完成後 `architecture-consolidation.md` 標記 done, so that 未來 architecture review 不會再提同一批候選。

## Implementation Decisions

- **交付方式**:單一 feature branch;每候選一個 commit;每步之間執行測試套件 + `tsc --noEmit` + production build 成功;全部完成後由使用者決定合併。
- **執行順序**:R1 → R2 → R2.5 → R3(R1 動 `auditPipelineTypes.ts`,R2 動 `App.tsx` + `index.css`,R2.5 同動多檔 caller,R3 獨立可平行)。R3 死碼刪除可與 R1 並行 — `ReportRenderer` 須等 R1 把 Admin 改薄後才變 0-importer,故 R3 真正刪除 `ReportRenderer` 的 commit 排在 R1 後。
- **R1 module shape**:三個獨立 module,**不**做胖 view-model。
  - `buildAuditReportViewModel(auditResult: AuditIntelligenceResult) → { summary, scores, findings, charts, browserEvidence }`,給 console / sample-report / real-audit-dashboard 共用。
  - `buildSlidesViewModel(auditResult: AuditIntelligenceResult) → { slides: Slide[] }`,給 `AuditPresentation`。
  - `buildAdminStatsViewModel(audits: AuditRow[]) → { statusBreakdown, recentAudits, ... }`,給 `Admin` overview tab;`Admin` audits tab 改吃 `buildAuditReportViewModel` 渲染單一報告。
- **R1 category contract**:`AuditFindingCategory` 是後端訂死的 union,LLM prompt 給每個 category 一句範例描述幫 LLM 對齊。
  - `AuditFinding` 新增 `affectedMetric: string | null`(LLM strict-JSON 回、deterministic fallback 也產)。
  - `categorizeFinding(finding: { issue, affectedMetric })` 純函式,是 LLM 路徑與 fallback 路徑唯一出口。
  - 判斷策略:先看 `affectedMetric` 是否命中 enum aggregate → 否則 `issue` 字串走 zh/en 關鍵字表比對 → 都 miss → enum `other` + telemetry `findingCategoryMiss`。
  - **不**信任 LLM 回的 `category` 字串作為決策來源 — `categorizeFinding` 只讀 `issue` + `affectedMetric`,LLM 出的 `category` 是裝飾非 contract。後端送過來前可直接丟掉或留作 telemetry hint。
  - 雙語關鍵字表以 `AuditFindingCategory` enum 為 key,每個 category 配 zh + en 兩組陣列,與 i18n `report.explanation.<cat>` namespace 同區維護。
- **R1 人話解釋鏈**:
  - LLM strict-JSON prompt 升級回 `{ issue, impact, severity, affectedMetric, explanation }` — `explanation` 是用大學生也能懂的繁中寫一句。
  - view-model dispatch:`finding.explanation ?? i18n.report.explanation[category] ?? i18n.report.explanation.fallback`。
  - deterministic fallback(`buildFallbackSummary`)也產 `explanation` 與 `affectedMetric`,從 deterministic evidence 推(沒 meta description → `affectedMetric: "metadata"` + 對應 category 的 i18n 文案)。
  - 舊資料相容:`affectedMetric` null 走純關鍵字比對,`explanation` undefined 走 i18n fallback。
- **R1 i18n namespace**:新增 `report.explanation.<category>` 約 N(N=category enum 長度,初估 8~12 個)× 2 lang,以及 `report.explanation.fallback` generic 文案。
- **R1 死碼剔除**:`ReportRenderer.tsx` 刪 — Admin 改薄後 0 importer。`AnalyticsChartsPanel.tsx` / `TwoRetryGovernance.tsx` / `MetricRing.tsx` / `DashboardWidget.tsx` 是 R3 範圍,但可在 R1 commit 一併清掉(都是 0 importer 不影響 interface)。
- **R2 視覺減量邊界**:
  - `MeshBackground` 刪三顆 `motion.div` 光球,留 blueprint grid。`framer-motion` import 從這檔移除。
  - `App.tsx` 移除 `AnimatePresence` + 過場 `motion.div`,改直接 `<>{renderCurrentPage()}</>`。`framer-motion` 從 `App.tsx` import 移除。
  - 移除 `lightLockRoutes` / `lightLock` 整段邏輯與 `theme-lock-light` class(`index.css` 內 rule 一併清)。
  - `App.tsx` 移除 `<div className="bg-noise" />`。`index.css` 移除 `.bg-noise` rule 與任何 noise texture asset reference。
  - **不動** Home / Intake / Pricing 行銷頁 `Reveal` 入場、stagger、`Logos3`、自家 glow 邊框、`PageIntro`。
- **R2.5 機械掃 rule**:只認 wrapper-stack 一種 pattern:
  - 外層是 component(`<GlassCard>` / `<GlassContainer>` / `<Reveal>` / `<PageIntro>` / `<PageContainer>`),內層又是同空間 `bg-{white|black}/[0-9]+` + `border` + `rounded-...`。
  - 內層無語意負擔者(沒額外加 padding/gap/role/aria)砍掉,讓外層 component 完全承擔視覺外框。
  - **不動** 同元素本身的 border/shadow/ring 設計(Q14 A 鎖死範圍)。
- **R3 合一**:`SeoChecklist` 與 `SeoChecklistGuide` 合成單一元件,以 `variant: "compact" | "guide"` prop 切換呈現差異。i18n key 兩套合一套 namespace(`seo.checklist.*`),Guide 模式額外讀 `seo.checklist.guide.*`。
- **R3 死碼確認**:刪前以 grep 證實 0 importer 為準(`rg -l "ComponentName" src/ --glob '!*.test.ts' --glob '!/ComponentName.tsx'`),不包括自身實作檔與測試。
- **Schema 變更**:`AuditFinding` type 增 `affectedMetric?: string | null` 與 `category?: AuditFindingCategory`(category 由前端 view-model 派生,後端 LLM 可不出)。**不**動 DB schema — `audits.result` 仍是 JSON 字串,新增欄位存在 JSON 內,舊資料 null 相容。

## Testing Decisions

- **原則**:只測 seam 的外部行為,不測實作細節。沿用 `architecture-consolidation.md` 的 seam 哲學。
- **既有 seam**(沿用):`runAuditHarness` injectable dependencies、`initDb()`、SSRF 防護函式。
- **新增 seam**(R1):
  - `categorizeFinding(finding)` — 純函式,輸入 `{ issue, affectedMetric }` 輸出 `AuditFindingCategory`。易測,可 enumerate 全 enum + unknown case + 雙語關鍵字 hit/miss 組合。
  - `buildAuditReportViewModel(auditResult)` — 輸入 fake `AuditIntelligenceResult`,輸出包含 summary / scores / findings(含 category + explanation)/ charts。對同一 input 應 stable。
  - `buildSlidesViewModel(auditResult)` — 輸入 fake audit,輸出 N slides,每 slide 有 chartData / chartType / metrics。
  - `buildAdminStatsViewModel(audits)` — 輸入 fake audit list,輸出 statusBreakdown + recentAudits。
- **新測試重點**:
  - `categorizeFinding`:對 `affectedMetric` 命中 enum 的每個 case 一個 test;對 `issue` 雙語關鍵字 hit 各一;對 unknown → `other` + telemetry 觸發。
  - `buildAuditReportViewModel`:LLM 有 `explanation` 時直出,LLM 無 `explanation` 時 fallback i18n,兩者皆無時 fallback generic — 三條 dispatch path 各一測試。
  - 舊資料相容:fake 一個無 `affectedMetric` 的舊 audit JSON,`categorizeFinding` 走關鍵字路徑仍應得正確 category。
  - `buildSlidesViewModel` / `buildAdminStatsViewModel`:stable output(同 input 同 output),不測渲染細節。
- **先例**:Node 原生測試跑者(`node --test` + tsx);`harness-runner.test.ts` 的 injectable-dependencies 模式;`security-hardening.test.ts` 的 fail-closed 斷言風格;`audit-report.test.ts`(現存)的 view-model stable shape 測試。
- **R2 / R2.5 / R3 不加新測試**:這三條是機械式視覺與死碼動作,以既有測試套件 + `tsc --noEmit` + production build 成功為驗收。視覺變更無 seam 可測。
- **每步關卡**:測試套件 + `tsc --noEmit` + production build 成功。

## Out of Scope

- **行銷頁視覺重置**:Home / Intake / Pricing 行銷設計語言保留(R2 不重置),`Reveal` / stagger / `Logos3` 不改。
- **Element 內部質感設計**:R2.5 只砍 wrapper-stack,不動同元素的 border / shadow / ring 設計。
- **新功能、新畫面、品牌視覺重設**(僅做減量與一致化,不重新定義品牌視覺)。
- **Navbar / Footer 大幅改造**:留作未來重構,R2 / R2.5 / R3 不動。
- **HTTP 層 supertest 級整合測試**(維持 module-seam 測試)。
- **BullMQ / Redis 可測試性改造**(另案處理)。
- **全站 i18n 盤點**:R1 只新增 `report.explanation.*` namespace,不重整既有 i18n。
- **PROJECT_MEMORY.md 歷史內容清理**。
- **路由架構改造**(維持 hash 路由,不引入 router 函式庫)。
- **DB schema 變更**:`AuditFinding.affectedMetric` 與 `category` 是 JSON 內欄位,不動 relational schema。

## Further Notes

- **R1 最大風險**:`categorizeFinding` 的關鍵字表 + alias map 會漂移。本案決策是不維護 alias map(選 B 而非 C 邏輯),只靠 `affectedMetric` + issue 雙語關鍵字表;unknown category 進 telemetry 由維護者評估何時擴 enum。
- **R1 舊資料相容**:`affectedMetric` 是 optional,舊 audit JSON 沒這欄時走純關鍵字路徑。新 audit 完成後 LLM strict-JSON prompt 升級即自動帶這欄,不需 backfill。
- **R2 風險低**:都是減法,删掉之後沒 framer-motion 在背景跑動畫,production bundle 也會縮小。
- **R2.5 邊界鎖死**:不可擴張到「同元素 border+shadow+ring 三層」這類主觀判斷。機械掃只認 wrapper-stack 一種 pattern,主動收窄避免 design judgement 進入。
- **R3 真正刪 `ReportRenderer` 的時機**:R1 把 Admin 改薄吃 `buildAuditReportViewModel` / `buildAdminStatsViewModel` 之後,`ReportRenderer` 才變 0 importer。故 `ReportRenderer.tsx` 刪除 commit 排在 R1 後,不與其他 R3 死碼同 commit。
- **無 issue tracker 可發佈**:`gh` 未安裝、matt-pocock skills 未設定;本檔以 repo 內文件代替,前置的 `ready-for-agent` 狀態欄位即 triage 標記。
- **量化預期**:報告渲染路徑 4 → 1(R1 後所有畫面共享 view-model);死元件 ~1500 行刪除;`MeshBackground` 從有 framer-motion 動畫到靜態 CSS(~22 行縮減);App.tsx 過場 + 鎖光 + noise ~20 行縮減;SeoChecklist 双生 → 1 件。
- **前一份 spec 的狀態更新**:`architecture-consolidation.md` 在 R1 / C2 / C6 合併後,可在檔頭狀態欄改 `done`(7 個候選全數完成)。

