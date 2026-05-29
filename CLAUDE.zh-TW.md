# CLAUDE.md（繁體中文版）

本檔案為 Claude Code (claude.ai/code) 在此儲存庫工作時提供指引。
（此為 [CLAUDE.md](CLAUDE.md) 的繁體中文對照版本，內容若有更新請兩份同步維護。）

## 常用指令

```bash
npm install            # 安裝相依套件
npm run dev            # 啟動開發伺服器：Express 監聽 :3000，Vite 以 middleware 模式運行（SPA 與 API 共用同一埠）
npm run build          # vite build（前端）+ esbuild 打包 server.ts -> dist/server.cjs
npm start              # 執行正式版打包檔：node dist/server.cjs（需 NODE_ENV=production）
npm run preview        # 僅 vite preview

npm test                                   # 以 node --test 執行 test/**/*.test.ts（見下方說明）
node --import tsx --test test/foo.test.ts  # 執行單一測試檔
```

說明：
- `test` 指令已設定，但目前**沒有 `test/` 目錄**；請在該目錄新增 `*.test.ts`。測試使用 Node 原生測試執行器搭配 `tsx`，並非 Vitest／Jest。
- 沒有 lint 或型別檢查指令。`tsconfig.json` 設定 `noEmit`（僅型別資訊）；如需型別檢查請手動執行 `npx tsc --noEmit`。
- 開發與正式環境都由**同一個 Express 程序在 3000 埠**同時提供 SPA 與 API——沒有獨立的前端開發伺服器。開發時 Vite 作為 Express middleware（`server.ts`）；正式時 Express 提供 `dist/`。

## 必要環境變數

設定於 `.env.local`（參考 `.env.example`）：
- `DATABASE_URL` — Neon／Postgres 連線字串。未設定時伺服器仍可啟動，但所有依賴資料庫的路由都回傳 500，且會略過 `initDb()`。
- `JWT_SECRET` — **啟動時必要**；`getRequiredJwtSecret()` 在缺少時會拋出例外。
- `OPENROUTER_API_KEY` — 選用；缺少時稽核綜整會改用確定性的模板報告，而非呼叫 LLM。
- `CRUX_API_KEY` — 選用、**伺服器端**的 Chrome UX Report 金鑰，驅動 `/api/scan/crux`（真實使用者 Core Web Vitals 與歷史）。缺少時或目標無欄位資料時，即時卡片會 fallback 至 PageSpeed 實驗室測試。
- `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` — 選用；兩者皆設定（密碼 ≥ 12 字元）時，`initDb()` 會植入一名管理員使用者。
- 瀏覽器收集器：`BROWSER_COLLECTOR_MODE`（`stub`｜`playwright`｜`webwright`，預設 `playwright`）以及 `WEBWRIGHT_*` 產物路徑（見下方「瀏覽器收集器模式」）。

前端建置時變數（Vite `import.meta.env.*`，皆為選用 — 都有安全的同源／fallback 預設值）：
- `VITE_API_URL` — 即時儀表板 `EventSource`／`fetch` 使用的後端 base URL；留空則維持同源請求。
- `VITE_AUDIT_ENDPOINT` / `VITE_INTAKE_ENDPOINT` — 覆寫 console／intake 的 POST 目標（否則為 `/api/audit`、`/api/intake`）。
- `VITE_PAGESPEED_API_KEY` — 供 `CoreWebVitalsCard` 使用的 Google PageSpeed Insights 金鑰；未設定仍可運作但會受速率限制。

## 架構

這是單一程序的 TypeScript 應用：由 Express 5 後端提供 React 18 SPA（Vite、Tailwind、framer-motion、i18next），並透過 Drizzle ORM 連接 Postgres。產品（「AuditLens」）用於產生 AI 輔助的網站稽核報告。

### 後端（`server.ts` + `src/Server/Services/` + `src/db/`）
- **`server.ts`** 即整個 HTTP 層：驗證（JWT 同時存於 httpOnly cookie *與* Bearer header）、使用者／稽核／管理員／方案的 CRUD，以及兩個稽核進入點 `POST /api/audit` 與 `POST /api/intake`。兩者都會先建立 `pending` 稽核紀錄、執行管道，再將該紀錄更新為 `completed`／`failed`。錯誤訊息如 `UNSAFE_AUDIT_TARGET`、`INVALID_AUDIT_PAYLOAD`、`AUDIT_TARGET_REDIRECT_LIMIT` 會對應到 HTTP 400 而非 502。
- **`src/db/`** — Drizzle schema（`schema.ts`，資料表皆以 `audit_*` 為前綴）與 `index.ts`。**沒有 Drizzle 遷移檔**；`initDb()` 直接執行冪等的 `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... IF NOT EXISTS` SQL，並植入預設 `plan_settings`（free/pro/enterprise）。變更 schema 時必須**同時**修改 `schema.ts` 與 `index.ts` 中的原始 SQL。

### 稽核管道（`src/Server/Services/`）
`generateAuditIntelligence()` 串接三個階段，各自產生定義於 `auditPipelineTypes.ts` 的型別化結果：
1. **`securityPolicies.assertSafeAuditTargetUrl`** — 在任何 fetch 之前執行的 SSRF 防護：拒絕非 http(s)、含帳密的 URL、封鎖的主機名，以及私有／保留 IP（會解析 DNS 並檢查每個位址）。訂閱方案邏輯也在此檔。
2. **`deterministicCollector`** — 伺服器端 HTTP fetch + HTML 解析（標題、meta、連結／圖片／資產計數）。
3. **`browserCollector`** — 以三種模式之一產生 `BrowserCollectorResult` 證據（見下方）。
4. **`auditSynthesis`** — 依證據組合建立嚴格 JSON 的 LLM prompt，並呼叫 **`openrouterHelper.fetchOpenRouterWithFallback`**，該函式會逐一嘗試硬編碼的 OpenRouter 免費模型清單（僅在 `ALLOW_PAID_FALLBACK=true` 時嘗試付費模型），並處理 401/403（停止）、429（換下一個模型）、404（略過）。若無 API 金鑰或所有模型皆失敗，`buildFallbackSummary` 會回傳模板報告。prompt 與 fallback 皆為**雙語**：`payload.language === "zh-TW"` 會將輸出切換為使用台灣用語的繁體中文。

### 瀏覽器收集器模式
`BROWSER_COLLECTOR_MODE` 決定行為：
- **`playwright`**（預設）— *並非真正的 Playwright*；而是以 `fetch` 為基礎的輕量爬蟲（`buildCrawlerResult`）：GET 抓取著陸頁、擷取內部 `<a>` 連結，再對最多 3 個內部路由發出 GET 並記錄每個路由的狀態／耗時／標題，最後彙整平均回應時間與時序流程。路由的狀態／耗時會嵌入 `page.notes` 字串中，`liveScanCollector` 再以正規表示式解析回來供即時總覽使用。
- **`webwright`** — 讀取預先產生的產物（`report.json`、`task.json`、`trajectory.json`、截圖、日誌），透過 `WEBWRIGHT_WORKSPACE_DIR` / `WEBWRIGHT_*_PATH` 環境變數探索，並經 `webwrightContract.ts` 正規化。範例產物位於 `fixtures/webwright/sample-run/`。
- **`stub`** — 提供 `not_run` 佔位用的骨架證據。

### 前端（`src/`）
- 路由為**以 hash 為基礎**，由 `useHashRoute` 加上 `App.tsx` 中的 `switch` 實作（未使用路由函式庫）。路由：home、console、live、pricing、report、intake、login、admin、campaign。
- **存在兩種稽核體驗，且本質上不同：**
  - `console`（`AuditConsole` + `useAuditAgent`）— **模擬／假造**的多子代理代理 UI（計時器、假工具呼叫），待 `/api/audit` 結果回傳後再疊上真實報告。
  - `live`（`RealAuditDashboard` + `useRealTimeAudit`）— **真實**的 SSE 驅動掃描。`GET /api/scan/stream`（以 `?token=` 查詢參數驗證，因為 `EventSource` 無法設定 header）會執行一次 `collectDeterministicEvidence`，並送出 `SSELog` 訊框與 `phase`／`fail`／`done` 事件；`done` 訊框夾帶結構化的 `LiveScanSummary`（評分、資產組成、SEO 訊號、已爬取路由），由 `ScanSummaryPanel` 以圖表呈現。`GET /api/scan/dom-issues` 回傳帶有 HTML 片段的 `LiveDOMIssue[]`。後端邏輯位於 `src/Server/Services/liveScanCollector.ts`。Core Web Vitals 採**欄位資料優先**：`CoreWebVitalsCard` 先呼叫 `GET /api/scan/crux`（後端 `cruxCollector.ts` → Chrome UX Report 的 `queryRecord` + `queryHistoryRecord`，先試頁面 `url`、再 fallback 到 `origin`），顯示真實使用者的 LCP/INP/CLS 與良好／需改善／不佳評級及歷史 sparkline（`CwvSparkline`）；當 CrUX 回傳 `hasData:false` 時，再 fallback 至直接由瀏覽器呼叫的 Google PageSpeed **實驗室**測試（`VITE_PAGESPEED_API_KEY`）。
- `services/auditApi.ts` 會向 API 發送請求，並在真實請求失敗時以 `data:` URL 退回示範 payload（讓 UI 在離線時仍能優雅降級）。
- i18n：`src/locales/` 內有 `en` 與 `zh-TW`；所選語言會夾帶於稽核 payload 中以決定報告語言。
- UI 採用 `src/components/ui/` 中自製的「Liquid Glass」設計系統（GlassCard、GlowingButton、MeshBackground 等）；設計意圖記錄於 `liquid_glass_architecture/` 與 `DESIGN_CRITIQUE.md`。

### 重要慣例
- `audits.result` 以及 intake 的 `goals`／`stack` 在 Postgres 中以 **JSON 字串**儲存；務必在邊界處 `JSON.parse`／`JSON.stringify`（伺服器路由已如此處理）。
- 伺服器端服務位於 `src/Server/Services/`，但其型別（如 `auditPipelineTypes.ts`）會被前端 hook 直接 import——請保持這些檔案同構（型別共用檔中不可有僅限 Node 的 import）。
- 行銷／設計產物（`docs/`、各種 `*.md` 簡報、`_1`–`_4/`、`liquid_glass_architecture/`）為參考資料，並非應用程式碼。
