# AuditLens (Auditsys)

AI 輔助的網站健檢報告產生器:React 18 SPA(Vite + Tailwind)由同一個 Express 5 程序服務,Postgres(Neon)+ Drizzle ORM,LLM 走 OpenRouter / AgentRouter / Nvidia。

## 啟動需求

- Node.js 20+
- Postgres 連線字串(建議 [Neon](https://neon.tech))
- Redis(`/api/audit` 的 BullMQ 佇列使用;預設 `redis://localhost:6379`)

## 本地開發

```bash
npm install --legacy-peer-deps   # 既有 vite 8 / @vitejs/plugin-react peer 衝突,需此旗標
cp .env.example .env.local       # 填入下方必要變數
npm run dev                      # Express :3000,Vite 以 middleware 模式併入(SPA + API 同埠)
```

## 環境變數(`.env.local`)

必要:

| 變數 | 說明 |
| --- | --- |
| `DATABASE_URL` | Neon/Postgres 連線字串;缺少時伺服器可啟動但所有 DB 路由回 500 |
| `JWT_SECRET` | 啟動時強制檢查,缺少直接拋錯 |

選用:

| 變數 | 說明 |
| --- | --- |
| `REDIS_URL` | BullMQ 佇列連線,預設 `redis://localhost:6379` |
| `OPENROUTER_API_KEY` | 缺少時報告合成退回決定性模板(離線可用) |
| `NVIDIA_API_KEY` | Nemotron 模型整合 |
| `CRUX_API_KEY` | 伺服器端 Chrome UX Report 金鑰,驅動 `/api/scan/crux` 真實用戶 CWV |
| `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` | 兩者皆設(密碼 ≥ 12 字元)時於 `initDb()` 種入管理員 |
| `BROWSER_COLLECTOR_MODE` | `stub` \| `playwright`(預設,實為 fetch 爬蟲) \| `webwright`(讀預產出 artifacts) |
| `VITE_API_URL` / `VITE_PAGESPEED_API_KEY` | 前端建置期變數,詳見 `.env.example` |

## 常用指令

```bash
npm run dev        # 開發(單一程序,:3000)
npm run build      # vite build + esbuild 打包 server -> dist/server.cjs
npm start          # NODE_ENV=production node dist/server.cjs
npm test           # Node 原生測試跑者,test/**/*.test.ts
npx tsc --noEmit   # 型別檢查(無 lint script)
```

## 進一步文件

- `CLAUDE.md` — 架構總覽(後端管線、harness、三種瀏覽器收集模式、前端路由)
- `docs/specs/` — 規格文件
- DB schema 變更:改 `src/db/schema.ts` 後執行 `npm run db:generate` 產生新的遷移檔(`drizzle/`),`initDb()` 啟動時自動套用
