# 12 — R3 死碼刪除 + SeoChecklist 合一

**What to build:**

確認 0 importer 的死元件各別刪除;`SeoChecklist` 與 `SeoChecklistGuide` 合一成單一元件 + `variant: "compact" | "guide"` prop,i18n key 合一 namespace。若 08 沒刪 `ReportRenderer.tsx` 在此一併補刪。本 ticket 是 R3 的最終收尾。

**Blocked by:** 08 — R1 page migration:Admin 改薄 + 刪 ReportRenderer(`ReportRenderer` 須等 Admin 改薄才變 0 importer,否則不能刪;本 ticket 處理剩下死元件與合一)

**Status:** ready-for-agent

- [ ] 逐個驗證 0 importer 再刪,每個刪除前跑:
  `rg -l "ComponentName" src/ --glob '!*.test.ts' --glob '!/ComponentName.tsx'`
  必須回 empty
- [ ] 刪除死元件(預期清單):
  - [ ] `src/components/ui/AnalyticsChartsPanel.tsx`(若仍有 import 重新評估是否早一步已活)
  - [ ] `src/components/ui/TwoRetryGovernance.tsx`
  - [ ] `src/components/ui/MetricRing.tsx`
  - [ ] `src/components/ui/DashboardWidget.tsx`(若 02 ~ 04 期間 R1 view-model 接手後仍無 import,確認後刪)
  - [ ] `src/components/ui/ReportRenderer.tsx`(若 08 沒在本 commit 內刪,在此補)
- [ ] `SeoChecklist.tsx` 與 `SeoChecklistGuide.tsx` 合一成單一 `SeoChecklist.tsx`:
  - [ ] prop `variant: "compact" | "guide"`(預設 `"compact"` = 原 `SeoChecklist`;`"guide"` = 原 `SeoChecklistGuide`)
  - [ ] 內部差異(標題、external link、check toggle 步驟)以 variant 控
  - [ ] i18n key 合一 `seo.checklist.*` namespace;Guide 模式額外讀 `seo.checklist.guide.*`
- [ ] 更新所有 caller,只 import 合一後的元件,以 `variant` prop 切換
- [ ] 刪除 `SeoChecklistGuide.tsx`(合一後 0 importer)
- [ ] `npm test` + `tsc --noEmit` + `npm run build` 通過
- [ ] `rg "SeoChecklistGuide"` 應回 empty(除了檔內 docs 註解可接受)
- [ ] 同時可更新 `docs/specs/architecture-consolidation.md` 檔頭狀態欄從 `ready-for-agent` 改為 `done`(7 個候選全數完成,加本 spec 的 R1/R2/R2.5/R3)
