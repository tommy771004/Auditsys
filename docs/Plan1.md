# 建置 Harness 核心架構 (任務控制台 P0 實作計畫)

這份實作計畫旨在解決「任務控制台差距分析」中提出的 P0 核心架構缺失，並嚴格遵循 `cost-aware-llm-pipeline` 的全域規則。我們將為後端的多智能體引擎（`multiAgentEngine.ts`）建構真正的 Harness 環境。

## 目標
在現有的 `multiAgentEngine.ts` 執行流程中，注入以下 Harness 核心元件：
1. **成本治理（Cost Governance）**：實作不可變的 `CostTracker`，追蹤 Token 花費並設定預算上限。
2. **回饋迴圈與 Two-Retry 策略**：實作 `callWithRetry`，當模型輸出的 JSON 格式錯誤或無法解析時，將錯誤訊息回饋給 LLM 進行自動修正，最多重試 2 次。
3. **模型路由 (Model Routing)**：根據任務複雜度自動選擇合適的模型（此專案目前使用 Gemini，我們將建立相應的路由與計價邏輯）。

## Proposed Changes

---

### Harness 基礎設施 (新元件)

#### [NEW] [CostTracker.ts](file:///d:/Project/github/Auditsys/src/Server/Services/harness/CostTracker.ts)
實作嚴格的不可變（Immutable）成本追蹤器，依照規則定義：
- `CostRecord` 介面（記錄 model, input_tokens, output_tokens, cost_usd）。
- `CostTracker` 類別，提供 `add(record)` 方法回傳全新的實例。
- 包含 Gemini 模型的計價常數（Gemini 1.5 Flash / Pro 等）。

#### [NEW] [LlmPipeline.ts](file:///d:/Project/github/Auditsys/src/Server/Services/harness/LlmPipeline.ts)
實作代理執行的核心管線（Pipeline）：
- `selectModel()`: 根據文本長度或任務複雜度選擇要調用的模型。
- `callWithRetry()`: 負責處理 API 網路異常或速率限制（Transient errors）的指數退避重試。
- `executeAgentLoop()`: 封裝「生成 → JSON 驗證 → 失敗回饋」的閉環邏輯（Two-Retry Strategy）。若解析失敗，自動將 parsing error 塞回 prompt 讓模型修正。

---

### 重構現有 Agent 引擎

#### [MODIFY] [multiAgentEngine.ts](file:///d:/Project/github/Auditsys/src/Server/Services/multiAgentEngine.ts)
重構 `BaseAgent` 及其四個子特工 (`CruxPerformanceAgent`, `DevSecOpsAgent`, `SeoAndDomAgent`, `NetworkDetectiveAgent`)：
- 將直接調用 `ai.models.generateContent()` 的脆落邏輯，替換為透過 `LlmPipeline.executeAgentLoop()` 執行。
- 在 `runMultiAgentAudit()` 中實例化全局的 `CostTracker`，並將其傳遞給每個特工。
- 在 Agent 執行完畢後，將累積的成本紀錄輸出至 Log 中（作為「可觀測性」的第一步）。

## User Review Required

> [!IMPORTANT]
> 1. **Gemini 成本計算**：目前的環境使用的是 `@google/genai` (Gemini API)。規則 `cost-aware-llm-pipeline` 提供的價格是 Claude 模型的。我將在 `CostTracker.ts` 中實作 Gemini 1.5 Flash 的定價（約 $0.075/1M input, $0.30/1M output），請問是否同意？
> 2. **Token 預算上限**：我們是否要為每次 Audit 設定硬性的成本預算（例如 0.05 USD），超過即拋出 `BudgetExceededError`？或先以記錄為主？

## Verification Plan

### 自動化/單元測試
1. 確認 `CostTracker.ts` 的不可變性（Immutable）行為正確，成本累加無誤。

### 手動驗證
1. 在本機端啟動開發伺服器，透過 UI (Audit Console) 送出稽核請求。
2. 觀察後端 Terminal Logs，確認「成本追蹤 (Cost Tracker)」的日誌輸出（包含 input/output tokens 與總花費）。
3. 模擬一次 JSON 格式錯誤（可透過修改 prompt 誘導），驗證 Agent 是否能觸發 **Two-Retry 回饋迴圈** 並成功自我修正。
