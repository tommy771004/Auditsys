# 06 — R1 view-model:buildAdminStatsViewModel

**What to build:**

新增 `buildAdminStatsViewModel(audits: AuditRow[]) → { statusBreakdown, recentAudits, planSettingsSummary? }`,給 `Admin` overview tab 用。`statusBreakdown` 是 pie chart data(completed / pending / failed 計數);`recentAudits` 是最近 N 筆的精簡 row(`id`, `targetUrl`, `status`, `createdAt`, `score?`)。**不改 `Admin` 頁**(交給 08),只新增 module + 測試。`Admin` overview pie chart 的 `AnimatedSector` 等內聯 recharts 元件仍在原 page 裡,等到 08 改薄才會退場。

**Blocked by:** 04(`AuditFinding` 派生與 `buildAdminStatsViewModel` 共用某些型別概念,維持同 spec namespace)

**Status:** ready-for-agent

- [ ] 新 module `buildAdminStatsViewModel(audits: AuditRow[]) → { statusBreakdown, recentAudits }`
- [ ] statusBreakdown:[{ name: "Completed"|"Pending"|"Failed", value: number, color: string }] 形式 pie data,供 recharts `<PieChart>` 直接吃
- [ ] recentAudits:最近 N(預設 20)筆的精簡 view,id / targetUrl / status / createdAt / score?(score 由 `computeAuditScores` 或既有 audit JSON parse 推)
- [ ] 新測試 stable output:fake audit list(混 completed/pending/failed)→ statusBreakdown 數字正確,recentAudits row 數 < = N 且 sorted desc by createdAt
- [ ] 不動 `Admin.tsx`
- [ ] `npm test` + `tsc --noEmit` 通過
