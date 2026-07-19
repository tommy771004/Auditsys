# 01 — R1 型別契約:categorizeFinding + AuditFindingCategory

**What to build:**

後端「稽核結果」的 finding 要能給一般使用者看得懂,需要 category enum 來分類 + 一個純函式把 LLM 路徑與 deterministic fallback 路徑的 finding 都歸一化。本 ticket 建立 `AuditFindingCategory` union type 與 `categorizeFinding` 純函式,以及 `AuditFinding.affectedMetric` 欄位(但**不動 LLM prompt、不動 UI**)。後續所有 R1 module 與 page migration 依賴這個契約鎖死。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `AuditFindingCategory` union type 在 `auditPipelineTypes.ts` 定義(初估 8~12 個 category,例如 `slow_lcp` / `missing_meta` / `low_contrast` / `insecure_protocol` / `blocked_resource` / `heavy_image` / `sparse_content` / `other`)
- [ ] `AuditFinding` 型別加 `affectedMetric?: string | null`(optional,舊資料相容)
- [ ] `categorizeFinding(finding: { issue, affectedMetric? })` 純函式落地:先看 `affectedMetric` 是否命中 enum aggregate,否則 `issue` 字串走 zh + en 雙語關鍵字表比對,都 miss 回 `other`
- [ ] 雙語關鍵字表以 `AuditFindingCategory` enum 為 key,每個 category 配 zh + en 兩組字串陣列,落地於同 module
- [ ] unknown finding category 進 telemetry hook(`findingCategoryMiss`),可擴 `useMetaLogger` 或新增 lightweight telemetry 點
- [ ] 新單元測試覆蓋:每個 enum category 至少一個 `affectedMetric` 命中 test、一個 `issue` 雙語關鍵字 hit test、unknown → `other` + telemetry 觸發 test
- [ ] `npm test` + `tsc --noEmit` 通過,既有套件(含 `audit-report.test.ts`)全綠
- [ ] 內容與 spec 對齊:`docs/specs/audit-report-i18n-and-ui-declutter.md` R1 段落
