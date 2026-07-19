# 04 — R1 view-model:buildAuditReportViewModel

**What to build:**

深化 `auditReport.ts` 既有的 `buildAuditReportViewModel`:每個 finding 跑 `categorizeFinding`(01)派生 category,跑 `explanation ?? i18n.report.explanation[cat] ?? i18n.report.explanation.fallback` 三條 dispatch 派生人話解釋。輸出仍含 summary / scores / findings(含 category + explanation)/ charts / browserEvidence。**不改任何 page**(console / sample-report / real-audit-dashboard 暫時仍吃現狀輸出,只要 interface 不破即可)。新測試覆蓋三條 dispatch path + 舊資料 null 相容。

**Blocked by:** 02(LLM 路徑與 fallback 路徑都吐 `affectedMetric` + `explanation` 才有意義),03(i18n key 存在才能 fallback)

**Status:** ready-for-agent

- [ ] `auditReport.ts` 的 `buildAuditReportViewModel` 內部對每個 finding 跑 `categorizeFinding(finding)` 派生 `category`(LLM 若回 `category` 字串當作 hint 但不信任,只信 `issue` + `affectedMetric`)
- [ ] finding 派生 `explanation`:`finding.explanation`(LLM 直出)?? `t('report.explanation.<cat>')`(i18n fallback)?? `t('report.explanation.fallback')`(generic)
- [ ] 輸出 type 加 `category: AuditFindingCategory` 與 `explanation: string` 為必填(輸出層保證永遠有值,呼叫端不必 null check)
- [ ] 新單元測試:
  - [ ] finding 有 LLM `explanation` 時直出該字串,不等於 i18n fallback
  - [ ] finding 無 LLM `explanation` 但有 category hit 時,吐 `t('report.explanation.<cat>')`
  - [ ] finding 無 `explanation` 且 category=`other` 時,吐 `t('report.explanation.fallback')`
  - [ ] 舊 audit JSON 無 `affectedMetric` 時,fallback 仍能 render(category 由 issue 關鍵字比對推得)
- [ ] `npm test`(含 `audit-report.test.ts`)全綠,`tsc --noEmit` 通過
- [ ] console / sample-report / real-audit-dashboard 既有 caller 仍吃 view-model 並正常 render(category + explanation 屬新增欄位,既有 caller 不破)
