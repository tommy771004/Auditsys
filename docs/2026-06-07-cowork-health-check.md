# Auditsys / AuditLens — 跨職能健檢報告（CoWork Report）

- **日期**：2026-06-07
- **參與角色**：產品 PM、架構師（Architect）、資深開發者（Senior Dev）、QA 工程師
- **範圍**：全專案健檢（架構、產品、程式品質、技術債）＋ 本次 AI agent harness 除錯與修復
- **技術棧**：React 18 SPA（Vite / Tailwind / framer-motion / i18next）＋ Express 5 ＋ Postgres（Drizzle ORM, Neon）＋ OpenRouter / Chrome UX Report；單一行程部署於 Vercel

---

## 0. 執行摘要（四角色共識）

Auditsys 是一個「AI 輔助網站稽核報告」產品（對外名稱 AuditLens）。它有**幾塊扎實的真實後端能力**——SSRF 防護、確定性 HTTP 採證、真實 SSE 即時掃描、CrUX 真實使用者 Core Web Vitals、OpenRouter 免費模型 fallback 與雙語報告——這些是產品的核心價值，品質良好。

但專案同時揹著三類系統性風險：

1. **「Agent 平台」層多為展示用途（demonstrative）而非真正承重**。沙箱、身分、憑證金庫、飛輪、護欄等類別被接上了，卻沒有真正的強制力；真正承重的只有重試上限、品質閘、斷路器與成本預算。這在產品與技術誠信上都是風險。
2. **自動化測試覆蓋偏薄**（3 個測試檔 / 10 個測試），且 `tsconfig` 未開 `strict` / `strictNullChecks`，使得一整類「undefined 解參考」的崩潰無法在編譯期被攔下。
3. **工作目錄與已提交版本（HEAD）發生漂移**：本次我接手的工作目錄是一份退回到舊版（含 bug）的快照，而 HEAD 其實已含修復。這代表團隊有「把退版的工作目錄誤推上線」的流程風險。

**本次成果**：在 harness 中辨識並修復 5 個問題（崩潰、記憶體寫檔副作用、成本單位錯誤、Lighthouse 誤判重試、沙箱／編排器名實不符），已通過 `tsc`、10/10 測試、`vite` + server bundle 建置、以及崩潰重現腳本驗證。詳見附錄。

**整體健康評級**：🟡 **可運作但有顯著技術債**。核心功能可上線，但 agent 層、測試覆蓋與發布流程需要投資。

---

## 1. 產品 PM 視角

### 1.1 產品定位與現況
AuditLens 透過 `POST /api/audit`、`/api/intake`、`/api/audit/presentation` 產出 AI 輔助的網站稽核報告，並提供 free / pro / enterprise 三種方案（每方案可在 DB 設定各自的 OpenRouter 金鑰與允許模型）。前端有 **11 個頁面**，三種稽核體驗各有定位：

| 體驗 | 路由 | 本質 | PM 註記 |
|---|---|---|---|
| Console | `console` | **模擬**的多 subagent 劇場 UI，最後疊上真實報告與真實 harness 治理面板 | 視覺吸睛，但「假代理 + 真資料」混合需誠實標示 |
| Live | `live` | **真實** SSE 掃描（確定性採證 + CrUX/PageSpeed） | 產品最有說服力的部分，建議主打 |
| Presentation | `presentation` | zh-TW 五頁稽核簡報，CrUX 接地、估算值標 `估算` | 對 stakeholder 簡報很好用 |

### 1.2 產品誠信風險（高度建議處理）
- Console 的「多 subagent 自主代理」是計時器與假工具呼叫組成的劇場；編排器的 `routeSwarm` 會回傳 `UXAuditAgent`、`DevSecOpsAgent` 等**不會真正執行**的子代理名稱。若客戶／投資人誤以為這是真正的自主多代理系統，將造成期待落差與信任風險。
- **建議**：在 UI 明確區分「示意動畫」與「真實後端數據」；或把行銷語言從「自主代理」改為「稽核流程視覺化」。

### 1.3 本次 Bug 的使用者衝擊
- **崩潰**：目標為 security / 行銷文案類意圖（例如「security audit」「improve marketing copy」）時，整個稽核回 500——等於一整類使用者意圖完全不可用。
- **虛報成本**：治理面板顯示的成本對免費模型回傳非零金額，誤導定價認知。
- **正常網站被標為失敗**：行動版 PageSpeed 低於門檻就把整次稽核判為 `failed / 需人工接手`，讓多數真實網站的稽核看起來「失敗」。

### 1.4 驗收標準（建議納入）
- 任何合法 `goals` 組合都必須回傳完整報告，不得 500。
- 治理面板成本必須等於實際使用模型的費用（免費模型 = $0）。
- Lighthouse 低分只應呈現為「發現項目」，不得觸發重試或整體失敗。

---

## 2. 架構師（Architect）視角

### 2.1 整體架構
單一 Express 5 行程同時服務 SPA 與 API（開發期 Vite 以 middleware 嵌入，正式環境服務 `dist/`）。優點是部署簡單、同源、無需獨立前端伺服器；適合 Vercel/Neon 的精簡部署。

### 2.2 主要架構債

**(a) `server.ts` 單體（1,356 行、26 條路由）**
整個 HTTP 層（auth、user/audit/admin/plan CRUD、兩個稽核入口、簡報產生器）集中在單一檔案。
→ **建議**：依領域拆成 `routes/auth.ts`、`routes/audit.ts`、`routes/admin.ts`、`routes/scan.ts` 等模組化 router。



**(c) 同步稽核佔用請求生命週期**
`/api/audit` 在單一請求內 `pending → 跑完整 pipeline → completed`，重的稽核會造成長請求／逾時。
→ **建議**：重任務改非同步佇列（job + 輪詢／SSE 回報），即時掃描的 SSE 模式可作為範本。

**(d) Agent 平台層：承重 vs 展示需明確切分**
- **承重（保留並強化）**：重試上限、品質閘（passed / manual_review / failed）、步數斷路器、成本預算、SSRF 防護（`assertSafeAuditTargetUrl`，品質良好）。
- **展示（demonstrative）**：`AgentIdentity` / `CredentialsVault`（`getCredentials` 形同未用）、`AgentSandbox` + `ActionInterceptor`、`FlywheelCollector`、`GuardrailKnowledgeBase`、`ContextManager`。這些類別 console.log 密集但缺乏真正強制力。
→ **架構決策建議（二擇一）**：要嘛把沙箱做成**真正的出口邊界**（實際攔截 collector 的網路與檔案 IO），要嘛**移除**它，不要出貨「安全劇場」。本次已把沙箱動作型別誠實化並讓網域白名單可被強制，是過渡性改善。

**(e) 三條稽核程式路徑分歧**
console / live / presentation 各走不同邏輯，存在重複與不一致風險。
→ **建議**：抽共用的「採證 → 綜整」核心，UI 層只負責呈現差異。

### 2.3 架構亮點
SSRF 防護（拒非 http(s)、帶憑證 URL、私有/保留 IP、解析每個 DNS 位址）、外部依賴的優雅降級（無金鑰時 OpenRouter→模板、CrUX→PageSpeed lab）、isomorphic 型別共享，皆為良好設計。

---

## 3. 資深開發者（Senior Dev）視角

### 3.1 程式品質觀察
- **巨型檔案違反單一職責**：`AuditConsole.tsx`（1,764）、`server.ts`（1,356）、`Admin.tsx`（966）、`harnessRunner.ts`（926）、`browserCollector.ts`（893）、`useAuditAgent.ts`（817）。建議逐步拆分。
- **型別嚴格度不足**：`tsconfig.json` **未開 `strict` / `strictNullChecks`**。本次崩潰正屬於「`evidence.browser` 為 undefined 卻被解參考」的類別，編譯期完全攔不到。
  → **強烈建議**：漸進開啟 `strictNullChecks`（先針對 `src/Server/Services/**`）。
- **缺少 lint / typecheck script 與 CI**：`package.json` 無 lint、無 typecheck 指令。建議加入 `"typecheck": "tsc --noEmit"`、ESLint 與 GitHub Actions。
- **觀測性以 console.log 為主**（harness 內多處），缺乏結構化日誌與關聯 ID 落地。
- **README 過時**（仍是 Google AI Studio 樣板、提 `GEMINI_API_KEY`），與實際使用 OpenRouter 不符；`@google/genai` 為殘留相依。建議更新或刪除，以 `CLAUDE.md` 為準。

### 3.2 本次 5 項修復（依 SOLID / 整潔原則）
詳見附錄表；核心精神是「讓介面契約成立、讓副作用可控、讓數據誠實」。

---

## 4. QA 工程師視角

### 4.1 測試現況
3 個測試檔、10 個測試（native node test runner + tsx）：
- `security-hardening.test.ts`：JWT 失敗即關閉、admin bootstrap、SSRF/私有 IP 防護、方案解析、確定性採證——**覆蓋良好**。
- `harness-runner.test.ts`：重試上限、品質閘 pass/manual_review、治理計數——**覆蓋良好**（用注入式 stub collector）。
- `server-runtime.test.ts`：env 載入、Express 5 SPA fallback。

**缺口**：編排器路由（正是本次崩潰路徑）、synthesis 的 null 處理、collectors、前端、絕大多數 API 路由皆無測試。

### 4.2 本次發現的關鍵 Bug（已重現）
goals 含 security/content 關鍵字但不含 browser 關鍵字時，編排器產生的計畫不含 `browser` 步驟 → `execution.browser` 為 undefined → `getTotalWarningCount` 與 `auditSynthesis` 解參考 → **TypeError → 500**。重現結果：

```
goal="security audit"         => 修復前 CRASH / 修復後 OK(passed)
goal="improve marketing copy" => 修復前 CRASH / 修復後 OK(passed)
goal="improve seo"            => OK（控制組）
```

### 4.3 應補的邊界案例 / 回歸測試
- 各種 `goals` 關鍵字組合（含上述崩潰路徑）。
- browser 步驟被跳過、deterministic 失敗、缺各種 API 金鑰。
- 超大 evidence 觸發 context 壓縮；成本超出美元預算時斷路器應跳。
- Lighthouse 低分**不應**造成重試或整體 failed。

### 4.4 流程風險：工作目錄 ↔ HEAD 漂移
本次工作目錄是退版的舊快照（HEAD 已含修復）。若無 CI 把關，極可能「把退版的 buggy 工作目錄推上線」。
→ **建議**：PR 必跑 build + test；加入 pre-commit（typecheck + test）；釐清工作目錄為何退版（未提交修改／stash 覆蓋）。

### 4.5 嚴重度評級（本次 5 項）

| # | 問題 | 嚴重度 | 類型 |
|---|---|---|---|
| 1 | security/content goal 造成 500 崩潰 | 🔴 高 | 正確性 |
| 2 | 每次稽核寫入 `PROJECT_MEMORY.md`（無上限、洩露目標 URL） | 🟠 中高 | 副作用/隱私 |
| 3 | 成本預算單位錯誤＋虛報成本 | 🟠 中 | 正確性/可信度 |
| 4 | Lighthouse 低分觸發無謂重試、整體判 failed | 🟠 中 | 正確性/成本 |
| 5 | 沙箱／編排器名實不符（安全劇場、幽靈子代理） | 🟡 中低 | 誠信/維護性 |

---

## 5. 四角色聯合行動建議（優先序）

| 優先 | 行動 | 主責角色 |
|---|---|---|
| **P0** | 開啟 `strictNullChecks`（先 services 層）；補上本次 5 個 bug 的回歸測試 | Senior Dev + QA |
| **P0** | 建立 CI（PR 必跑 `tsc --noEmit` + `npm test` + `build`），防止退版上線 | QA + Architect |
| **P1** | 決定 agent 平台層去留：要嘛沙箱做成真出口邊界，要嘛移除；UI 誠實標示「示意 vs 真實」 | Architect + PM |
| **P1** | 重任務改非同步佇列，避免長請求 | Architect |
| **P2** | 拆分巨型檔案（`server.ts`、`AuditConsole.tsx`、`Admin.tsx`） | Senior Dev |
| **P2** | 更新／刪除過時 README 與殘留 `@google/genai` 相依 | Senior Dev |
| **P2** | 抽共用稽核核心，收斂三條稽核路徑 | Architect + Senior Dev |

---

## 6. 附錄：本次修復明細與驗證

### 6.1 修復對照

| # | 檔案 | 修復內容 | 為什麼 |
|---|---|---|---|
| 1 | `harness/AgentOrchestrator.ts` + `harnessRunner.ts` | `planTask` 一律納入 `browser` 步驟；組裝證據時加入防禦性 `createSkippedBrowserResult` fallback；關鍵字只用於產生「焦點子代理標籤」，不再產生會被靜默丟棄的幽靈步驟 | synthesis 與品質閘硬性需要完整 browser 證據物件 |
| 2 | `harnessRunner.ts` + `.env.example` | `PROJECT_MEMORY.md` 寫入改由 `HARNESS_PERSIST_MEMORY` 環境變數控制（預設關） | 避免每次稽核無上限寫檔、洩露目標 URL、繞過沙箱 |
| 3 | `harnessRunner.ts`（`ObservabilityTelemetry` 配合） | `CostTracker` 改吃美元預算 `costBudgetUsd`；成本依 synthesis 實際回報的模型計（免費模型 → $0） | 原本把 token 預算當美元上限 → 斷路器永不跳；且虛報付費模型費用 |
| 4 | `harnessRunner.ts` | Lighthouse 僅在「有 PageSpeed key 且第一次嘗試」執行；分數低於門檻只判 `warning` 不判 `failed` | 目標站效能不是 harness 的失敗，不該觸發無謂重試 |
| 5 | `harness/AgentSandbox.ts` + `harnessRunner.ts` | 新增通用 `sandbox.execute(action, executor)`；collector 呼叫宣告真實 `network_request` 型別；白名單擴充為目標站 + PageSpeed/CrUX/OpenRouter，使網域檢查可被實際強制 | 讓沙箱邊界名實相符，而非安全劇場 |

### 6.2 驗證結果

| 檢查 | 結果 |
|---|---|
| `npx tsc --noEmit` | ✅ 乾淨無錯 |
| `npm test` | ✅ 10 / 10 通過 |
| `vite build` + esbuild server bundle | ✅ 成功 |
| 崩潰重現腳本（3 種 goal） | ✅ 全部 `status=passed`（修復前 2 個會 500） |
| `PROJECT_MEMORY.md` | ✅ 稽核執行不再寫入（預設關閉） |

### 6.3 重要附註：工作目錄漂移
已提交的 `HEAD` 其實已包含本次全部修復；我接手的**工作目錄**是退回到舊版（含 bug）的快照。本次已將三個關鍵 harness 檔案對齊回已修復的提交版本並完整驗證，因此這幾個檔案目前 `git diff HEAD` 為空（= 與已修復程式碼一致）。建議團隊釐清工作目錄為何退版，並以 CI 防止再次發生（見 §4.4 / §5）。

---

*本報告由 PM、架構師、資深開發者、QA 四個角色協作產出。*
