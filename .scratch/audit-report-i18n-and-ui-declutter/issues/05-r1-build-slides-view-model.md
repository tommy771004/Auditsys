# 05 — R1 view-model:buildSlidesViewModel

**What to build:**

新增 `buildSlidesViewModel(auditResult: AuditIntelligenceResult) → { slides: Slide[] }`,把既有 `AuditPresentation.tsx` 內聯的 slide mapping 邏輯提煉為純函式 module。每 slide 出 `{ title, chartData, chartType, metrics, summary }` 型別(對齊 `presentation.types.ts` 的 Slide 結構)。**不改 `AuditPresentation` 頁**(交給 07),只新增 module + 測試。`AuditPresentation` 暫時仍吃自家內聯邏輯,只要本 module 的 stable output 能 fake 渲染即可。

**Blocked by:** 04(`buildAuditReportViewModel` 是 05 的地基,slides 的 score 與 evidence 數據走 04 的派生)

**Status:** ready-for-agent

- [ ] 新 module `buildSlidesViewModel(auditResult: AuditIntelligenceResult) → { slides: Slide[] }`,5 slides(對齊 既有 `AuditPresentation` 的 5 張 slide 結構與 chartType 分配)
- [ ] 每 slide 的 `chartData` 來自 audit evidence,score 與 metric 走 `buildAuditReportViewModel` 派生(避免另一份 score 邏輯)
- [ ] chartType union | chartData 型別對齊 `presentation.types.ts`(若該型別檔不完整可一併補)
- [ ] 新測試 stable output:fake audit → 5 slides 結構 stable,同 input 同 output(shape snapshot)
- [ ] 不動 `AuditPresentation.tsx`
- [ ] `npm test` + `tsc --noEmit` 通過
