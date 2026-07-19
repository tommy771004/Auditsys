# Spec: 架構整併與去冗餘(Architecture Consolidation)

> 狀態:`ready-for-agent`(無 issue tracker 可貼標,以此欄位代替)
> 來源:2026-07-19 架構評估報告(7 個候選重構,使用者決定全數執行)
> 詞彙:module / interface / seam / depth / leverage / locality 依 codebase-design 定義

## Problem Statement

AuditLens 的維護者面對一個「每個部分都在,但整體難以理解」的程式庫:

- 約 3,600 行程式碼(多代理引擎、五個模擬器元件、孤兒頁面)沒有任何呼叫者,卻持續拉高探索、review 與型別檢查成本,並鎖住一個未使用的 SDK 依賴。
- 同一份 audit 結果由四條互不共用的路徑渲染(console / live / report / presentation),分數儀表散在七個檔案、圖表重寫四次;改一個分數規則要動多處,畫面風格也因此不一致、過度複雜。
- audit harness 約 1,700 行中只有約 450 行真正改變行為,其餘是九個類別的儀式碼;閱讀管線的人必須先理解一堆不做事的抽象。
- 三個 audit 產生器各自複製 SSRF 防護、證據收集、LLM 憑證解析與錯誤對映,且 presentation 路徑的憑證副本已漏掉 nvidia provider——付費方案設定 nvidia 時會靜默退回其他 provider,是已存在的分歧 bug。
- 瀏覽器收集器把結構化數據格式化成英文散文,live 收集器再用 regex 撈回來;改個措辭整批 route 會被靜默判為失敗並扣分。
- DB 欄位知識同時存在於 ORM schema 與手寫 DDL 兩處,預設值已實際漂移。
- console 頁把假的多代理劇場與真實資料熔在同一個 hook,連 API 失敗時都會偽造回應;使用者無法分辨畫面上何者為真。

## Solution

七個整併重構,依依賴順序執行,單一 feature branch、每個候選獨立 commit、每步之間以測試與型別檢查驗證:

1. **C1 刪除死碼子圖** — 清場,移除未使用依賴。
2. **C5 型別化收集器縫隙** — 結構化數據以型別欄位過 seam,廢除 regex 回撈。
3. **C4 統一三產生器** — 證據收集與憑證解析各成一個 module,修復 nvidia 分歧。
4. **C3 拆除 harness 裝飾層** — interface 不變,實作瘦身約 70%,同步收縮外洩到 client 的型別契約。
5. **C7 DB 遷移單一真相** — 採用 drizzle 遷移,手寫 DDL 退場。
6. **C2 收斂報告模組** — 一個深的 AuditReport module,四個畫面成為其上的薄 view。
7. **C6 console 瘦身** — 移除 mock 劇場與假資料路徑,console 成為真實資料的唯一 view,全站視覺減量。

## User Stories

1. As a 維護者, I want 死碼與孤兒頁面被完整移除, so that 探索與 review 時不再被永遠不會執行的程式碼誤導。
2. As a 維護者, I want `@google/genai` 從依賴中移除, so that 依賴樹只包含實際使用的 SDK。
3. As a 維護者, I want README 反映真實的啟動需求(DB、Redis、方案設定), so that 新進者能照文件把系統跑起來。
4. As a 維護者, I want 瀏覽器收集器以型別欄位傳遞 route 狀態與耗時, so that 重寫提示文字不會靜默破壞 live 掃描評分。
5. As a 付費方案管理者, I want nvidia provider 在所有三個產生器行為一致, so that 方案設定的 provider 不會在某個端點被靜默忽略。
6. As a 維護者, I want SSRF 防護、證據收集、憑證解析各只存在一份, so that 安全與資料收集的修正一次生效於全部管線。
7. As a 維護者, I want 錯誤到 HTTP 狀態碼的對映集中一處, so that 新端點不會再手抄一份分類邏輯。
8. As a 維護者, I want presentation 的離線 fallback 簡報與 LLM-JSON 清洗成為可獨立測試的純函式, so that 這些邏輯的回歸能被測試把守。
9. As a 維護者, I want harness 只保留改變行為的核心(重試上限、品質閘門、感測器、成本/步數預算), so that 閱讀管線時不需理解九個不做事的類別。
10. As a 維護者, I want `runAuditHarness` 的 interface 與既有測試在拆除後原封不動, so that 拆除本身有完整的回歸網。
11. As a console 使用者, I want 治理面板(狀態、嘗試次數、品質閘門、成本)繼續顯示真實後端數據, so that harness 瘦身不影響我看到的治理資訊。
12. As a 維護者, I want 共用型別只暴露 client 實際渲染的欄位, so that 後端內部重構不再受未使用契約束縛。
13. As a 維護者, I want DB 欄位知識只存在於一處並以遷移管理, so that 新增欄位只改一個檔案、預設值不再漂移。
14. As a 營運者, I want 既有資料庫在遷移導入後無痛升級, so that 部署不需要手動 DDL 操作。
15. As a 報告讀者, I want 分數、發現、圖表在 console / live / report / presentation 四個畫面呈現一致, so that 同一份 audit 在不同入口讀到相同的數字與樣式。
16. As a 維護者, I want 一個報告 view-model module 作為四個畫面的唯一資料來源, so that 分數與圖表的 bug 集中在一處修復。
17. As a console 使用者, I want 畫面上顯示的一切都來自真實的 audit 執行, so that 我不會把模擬動畫誤認為實際掃描結果。
18. As a console 使用者, I want API 失敗時得到明確的錯誤狀態而非偽造的成功回應, so that 我能信任畫面上的每個結果。
19. As a 使用者, I want 介面視覺層(背景、模糊、動畫)大幅減量, so that 頁面簡潔、載入輕快、重點清楚。
20. As a 譯者, I want console 的雙語字串全部回歸 i18n 資源檔, so that 翻譯不必在 JSX 三元式裡逐個尋找。
21. As a 維護者, I want 每個候選獨立 commit 且步步驗證, so that 任何一步出問題可單獨 revert 而不拖累其他成果。

## Implementation Decisions

- **交付方式**:單一 feature branch;每候選一個(或數個)commit;每步之間執行測試套件與 TypeScript 型別檢查;全部完成後由使用者決定合併。
- **執行順序**:C1 → C5 → C4 → C3 → C7 → C2 → C6(依依賴:刪碼先清場;報告模組是 console 瘦身的地基;harness 拆除連動共用型別)。
- **C1 刪除範圍**:多代理引擎與其 LLM pipeline(連同 `@google/genai` 依賴)、五個未被渲染的 live 模擬器元件、孤兒 campaign 頁、死的 audit-mode 指示元件、一次性 DB 檢查腳本、根目錄一次性 codemod 腳本、設計快照目錄;README 改寫為真實啟動說明。刪除以「grep 證實 0 個 importer」為準。
- **C5**:瀏覽器收集器的頁面證據型別新增結構化欄位(HTTP 狀態、回應耗時);`notes` 降為僅供人閱讀;live 收集器的 regex 推導改讀型別欄位。
- **C4**:新增兩個小 interface 的 module——`collectUrlEvidence(url)`(SSRF 防護 + deterministic 證據 + CrUX)與 `resolveProviderCredentials(auditConfig)`(openrouter / agentrouter / nvidia 三者一致,DB 設定覆蓋環境變數);三個產生器改為各留一行呼叫。錯誤分類統一為單一 `mapErrorToResponse`。presentation 路徑 closure 內的離線簡報 fallback 與 LLM-JSON 清洗外移為純函式。
- **C3**:`runAuditHarness(payload, config, options)` 的 interface(含 injectable dependencies 與 policy 覆寫)完全不變。刪除:執行追蹤器(純 log)、憑證保險庫(0 呼叫者)、隔離執行 VM(0 呼叫者)、skill 管理器空 stub、guardrail 知識庫(學習結果僅進 log)、flywheel 收集器(write-only)、三個驗證自產資料的 middleware、context 壓縮。保留:重試上限、品質閘門與感測器、成本/步數預算斷路器、網域白名單防護。共用型別中的 harness 契約收縮為治理面板實際渲染的欄位(狀態、嘗試、閘門檢查、成本/延遲、pivots、回顧),治理面板元件同步更新。
- **C7**:導入 drizzle-kit 遷移為唯一 schema 真相;`initDb()` 職責縮為執行遷移與 seed。預設值漂移的裁決:**以 SQL seed 的實際值為準**(各方案保留其模型清單),ORM schema 預設值向其對齊。
- **C2**:把既有報告 view-model 深化為唯一的 AuditReport module——interface 為 `buildAuditReportViewModel(auditResult)`,輸出涵蓋摘要、分數、發現、證據、圖表數據;搭配一份分數儀表、一組圖表元件、一份發現渲染器。console / report / presentation / live 全部改為消費此 module 的薄 view。presentation 維持 zh-TW 簡報形式,但分數與圖表改走共用模組。
- **C6**:console 以真實 harness / 報告資料為唯一顯示模型;刪除 mock 計畫、假發現產生器、假 tool-call 劇場與請求層的偽造回應 fallback(失敗改為誠實的錯誤狀態);3D 場景移除、全站背景層收斂為一種;inline 雙語三元式全部回歸 i18n 資源檔;治理面板(真實數據)保留。

## Testing Decisions

- **原則**:只測 seam 的外部行為,不測實作細節。四個候選(C1、C3)以「既有測試原封不動通過」為主要驗收;其餘在確認過的 seam 上補少量新測試。
- **Seam 配置**(已與使用者確認):
  - 既有:`runAuditHarness`(injectable dependencies)、`initDb()`、SSRF 防護函式。
  - 新增:`collectUrlEvidence` / `resolveProviderCredentials`(後端)、`buildAuditReportViewModel`(前端)。
- **新測試**:
  - 憑證解析:nvidia 方案在三種呼叫情境下解析一致(分歧 bug 的回歸測試)。
  - 證據收集:對安全/不安全目標的 fail-closed 行為。
  - live 收集器:route 狀態與耗時來自型別欄位(取代原本無把守的 regex 路徑)。
  - 報告 view-model:同一份 audit 結果產出穩定的摘要/分數/圖表數據。
- **先例**:Node 原生測試跑者(`node --test` + tsx);`harness-runner` 測試的 injectable-dependencies 模式;`security-hardening` 測試的 fail-closed 斷言風格。
- **每步關卡**:測試套件 + `tsc --noEmit` + production build 成功。

## Out of Scope

- 新功能、新畫面、視覺重新設計(僅做減量與一致化,不重新定義品牌視覺)。
- HTTP 層的 supertest 級整合測試 harness(維持 module-seam 測試)。
- BullMQ / Redis 的可測性改造(佇列 worker 在 import 時連線的問題另案處理)。
- 全站 i18n 盤點(僅處理 console 的 inline 三元式)。
- PROJECT_MEMORY.md 歷史內容的清理。
- 路由架構改造(維持 hash 路由,不引入 router 函式庫)。

## Further Notes

- C3 的最大風險是共用型別契約:harness 內部型別已被治理面板匯入,拆除必須與型別收縮、面板更新在同一個 commit 內完成,否則 build 會斷。
- C7 動到資料庫,建議在獨立 commit 並於合併前對照現有 Neon 資料庫演練一次遷移。
- 無 issue tracker 可發佈:`gh` 未安裝、matt-pocock skills 未設定;本檔以 repo 內文件代替,前置的 `ready-for-agent` 狀態欄位即為 triage 標記。
- 量化預期:刪除約 3,600 行死碼 + 一個依賴;harness 實作減約 70%;報告渲染路徑 4 → 1;分數儀表 7 檔 → 1 模組。
