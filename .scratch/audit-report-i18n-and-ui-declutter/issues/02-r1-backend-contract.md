# 02 — R1 後端契約升級:LLM prompt + fallback 產 affectedMetric

**What to build:**

01 立了 `affectedMetric` + `AuditFindingCategory` 契約,本 ticket 讓後端兩個產生路徑都吐新欄位。`auditSynthesis.ts` 的 LLM strict-JSON prompt 升級:每個 finding 回 `{ issue, impact, severity, affectedMetric, explanation }`,`affectedMetric` 是 string|null,`explanation` 是用大學生也能懂的繁中一句;prompt 給每個 category 一句範例描述幫 LLM 對齊。deterministic fallback(`buildFallbackSummary` 系列)也從 deterministic evidence 推 `affectedMetric`(沒 meta description → `"metadata"`,主圖重 → `"images"`,LCP 慢 → `"lcp"` 等),並吐對應 i18n category 的人話(實際文案在 03 落地,本 ticket 先 fallback 到 templated 文字)。

**Blocked by:** 01 — R1 型別契約(CategorizeFinding + AuditFindingCategory)

**Status:** ready-for-agent

- [ ] `auditSynthesis.ts` strict-JSON prompt 加 `affectedMetric` + `explanation` 欄位宣告,附每個 category 一句範例描述(可放於 prompt 字串內或獨立 prompt 段落)
- [ ] LLM 響應 schema 驗證:回傳 JSON 中 `affectedMetric` 若不在 enum 內,後端 normalize 為 null(讓前端 `categorizeFinding` 走關鍵字路徑)
- [ ] `buildFallbackSummary` 從 `AuditEvidenceBundle`(deterministic + browser)推 `affectedMetric` 與 category 對應的 templated 人話(fallback 文字先內聯,真正 i18n key 在 03 接手後改拿)
- [ ] `OPENROUTER_API_KEY` 缺 / 全部 model 都失敗時,fallback 仍吐 `affectedMetric` + `explanation` 欄位,不空手
- [ ] 既有路由(`POST /api/audit`、`POST /api/intake`、`POST /api/audit/presentation`)對 fake 含/不含 `affectedMetric` 的舊 caller 仍回 200,舊客戶不破
- [ ] 補或更新後端測試(LLM 路徑若難 inject 可在 `harness-runner.test.ts` 加一個 fallback 路徑斷言)
- [ ] `npm test` + `tsc --noEmit` 通過
