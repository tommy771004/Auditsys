Act as an expert Frontend Architect and Senior React + TypeScript Developer. 
Your task is to build the "Live Execution Engine" for an SEO Audit SaaS. 

CRITICAL DIRECTIVE: The user has strictly requested REAL DATA INTEGRATION. You are FORBIDDEN from using `setInterval`, `setTimeout`, or any mock data generators. The frontend must connect to real APIs, handle actual HTTP requests, and process Server-Sent Events (SSE) or Fetch streams for real-time logs.

### 1. Technology & Design Context
* **Core:** React 18, TypeScript, Tailwind CSS.
* **Animations:** Framer Motion.
* **i18n:** `react-i18next` (Strictly Taiwanese Mandarin 'zh-TW').
* **Design System:** "Liquid Glass" (Glassmorphism). Deep dark mode (`#0B0F19`), `backdrop-blur-xl`, `bg-slate-900/40`, and `border-white/10`.

### 2. Real Data Architecture & Interfaces
Define interfaces that match real-world API responses:
* `PageSpeedResult`: `{ score: number, FCP: string, LCP: string, CLS: string }` (Mapped from real Google PageSpeed Insights API).
* `LiveDOMIssue`: `{ element: string, issueType: 'missing_alt' | 'multiple_h1' | 'invalid_canonical', snippet: string }`.
* `SSELog`: `{ id: string, timestamp: number, level: 'info' | 'warn' | 'error' | 'success', message: string }`.
* `ExecutionState`: `{ status: 'idle' | 'connecting' | 'scanning' | 'analyzing' | 'complete' | 'error', targetUrl: string }`.

### 3. STRICT REAL-DATA RULES
* **SSE FOR LIVE LOGS:** Implement a custom hook `useRealTimeAudit`. When a scan starts, it MUST open a real `EventSource` connection to `${import.meta.env.VITE_API_URL}/api/scan/stream?url=${target}` to receive `SSELog` events in real-time.
* **GOOGLE PAGESPEED API:** Implement an actual `fetch` call to `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${target}` to get the real Core Web Vitals.
* **REAL ERROR HANDLING:** If the `fetch` fails (e.g., CORS error, 500 Internal Server Error) or the `EventSource` disconnects unexpectedly, the UI must catch this and render a stylized Liquid Glass error state, not just silently fail.

### 4. Advanced Liquid Glass Execution Components
Generate the production-ready code for the following:

**Task A: The Real-Time SSE Terminal (`ExecutionTerminal.tsx`)**
1. Consume the `SSELog[]` array from the `useRealTimeAudit` hook.
2. Render the logs inside an auto-scrolling (`useRef` + `scrollIntoView`) `backdrop-blur-md` terminal window.
3. If the connection is active but no logs have arrived for 3 seconds, show a pulsing "Awaiting server response..." indicator.

**Task B: Live PageSpeed Integration (`CoreWebVitalsCard.tsx`)**
1. A Glassmorphic card that displays real metrics.
2. Implement a `useEffect` that triggers the real Google PageSpeed API fetch when the scanning phase reaches the Lighthouse stage.
3. Show a skeleton loader (`animate-pulse`) while waiting for the real API response (which usually takes 5-10 seconds in reality).

**Task C: Real DOM Issue Inspector (`DOMIssueHighlighter.tsx`)**
1. Expect an array of `LiveDOMIssue` fetched from your backend (e.g., a real .NET 8 or Node API endpoint that parsed the HTML).
2. Render the actual HTML snippets returned by the backend. Use `react-syntax-highlighter` with a custom dark theme to format the `snippet`.
3. Highlight the exact line causing the issue using a `bg-red-500/20` overlay.

**Task D: The Main Orchestrator (`RealAuditDashboard.tsx`)**
1. Provide an input field for the target URL. Default the value to `https://taiwanrail.vercel.app` for testing purposes.
2. Manage the strict flow: 
   - Connect SSE -> Stream Logs -> Fetch PageSpeed API -> Fetch DOM Issues API -> Close SSE -> Show Final Report.
3. Use Framer Motion `AnimatePresence` to transition between these real network states smoothly.

### 5. Coding Constraints
* Explicit TypeScript types. No `any`.
* All environment variables must be accessed via `import.meta.env`.
* Provide comments like `// Ensure your backend sets headers: Content-Type: text/event-stream` to remind the full-stack developer of real-world integration requirements.