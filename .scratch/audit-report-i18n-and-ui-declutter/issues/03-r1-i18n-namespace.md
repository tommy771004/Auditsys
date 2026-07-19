# 03 — R1 i18n namespace:report.explanation.\*

**What to build:**

`en.json` + `zh-TW.json` 新增 `report.explanation.<category>` namespace,讓前端 view-model 在 LLM 沒吐 `explanation` 欄位時能 fallback 到 i18n 文案。文案口吻依使用者訴求「專業化且一般使用者能看得懂」 — 每句至少包含:該 category 是什麼問題(白話)+ 對網站代表什麼(業務影響)+ 該如何改善的暗示。key 以 01 的 `AuditFindingCategory` enum 為準,再加 `report.explanation.fallback` generic 文案。**只動 i18n 資源檔** — 不寫 caller,view-model dispatch 在 04 接手。

**Blocked by:** 01 — R1 型別契約(category enum 鎖死後才能寫 key)

**Status:** ready-for-agent

- [ ] `en.json` 加 `report.explanation.<category>`(每個 01 enum 的 category 一個 key)+ `report.explanation.fallback` generic key
- [ ] `zh-TW.json` 同步加,口吻依使用者訴求「專業化且一般使用者能看得懂」 — 繁中 / 台灣用語,避免 mid難術語直接照搬(主圖、回應時間、中華電信光世代…而非 Largest Contentful Paint 等專有名詞直接放)
- [ ] 每句文案含三要素:category 是什麼(白話)+ 對你網站代表什麼(業務影響)+ 一句改善暗示
- [ ] 以 `useTranslation` 不需 import 任何型別即可吃到 key(`t('report.explanation.slow_lcp')` 等)
- [ ] 不動任何 caller、不動 type、不動測試
- [ ] `tsc --noEmit` 通過(JSON schema 不變)
