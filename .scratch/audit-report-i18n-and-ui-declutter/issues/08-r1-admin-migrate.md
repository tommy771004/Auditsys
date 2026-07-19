# 08 — R1 page migration:Admin 改薄 + 刪 ReportRenderer

**What to build:**

`Admin.tsx` 968 行單檔六個 tab 熔在一處,本 ticket 改薄:overview tab 改吃 `buildAdminStatsViewModel`(移除內聯 PieChart + AnimatedSector + recharts import);audits tab 渲單一報告改吃 `buildAuditReportViewModel`(移除 `ReportRenderer` import)。**刪 `ReportRenderer.tsx`**(本 commit 內變 0 importer)。其餘 tab(users / settings / leads / security)保持現狀,只動 overview + audits。`Admin.tsx` 預期縮到 < 500 行。

**Blocked by:** 06 — R1 view-model:buildAdminStatsViewModel(ui 改薄依賴 view-model 存在)

**Status:** ready-for-agent

- [ ] `Admin.tsx` overview tab 改吃 `buildAdminStatsViewModel`:移除內聯 `<PieChart>`、`<Pie>`、`AnimatedSector`、recharts import(`AnimatedSector` 邏輯若要保留可外移到共用檔;本案預設移除 spring 動畫 sector,純PieChart 即可,verb acceptable per spec R2.5 視覺簡潔方向)
- [ ] `Admin.tsx` audits tab 選單一 audit 顯示報告時,改吃 `buildAuditReportViewModel` + 現存共用 `AuditCharts` / `AuditScoreBoard` / `AuditFindings`,不再 import `ReportRenderer`
- [ ] 移除 `src/components/ui/ReportRenderer.tsx`(本 commit 內驗證 `rg -l 'ReportRenderer' src/ --glob '!*.test.ts' --glob '!/ReportRenderer.tsx'` 回 empty)
- [ ] 其餘 four tabs(users / settings / leads / security)logic 與 UI 保持原樣,不動
- [ ] `Admin.tsx` 行數顯著縮減(目標 < 500;若其他 tab 視覺動畫太多仍 > 500,以主要 overview/audits 改薄成功為驗收)
- [ ] `#admin` 路由仍 render 所有 six tabs,overview pie 與 audits 報告資料跟其他畫面一致
- [ ] `npm test` + `tsc --noEmit` + `npm run build` 通過
