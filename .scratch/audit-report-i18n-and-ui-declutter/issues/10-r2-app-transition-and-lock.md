# 10 — R2 視覺減量:App 路由過場 + 路由鎖光

**What to build:**

`App.tsx` 移除 `AnimatePresence` + 過場 `motion.div`(每換頁跑 scale 0.98→1 + blur 4px→0 的 0.4s spring),改直接 `<>{renderCurrentPage()}</>`;移除 `framer-motion` import。移除 `lightLockRoutes` / `lightLock` 整段邏輯與 `theme-lock-light` class(`index.css` 內 rule 一併清)。完成後路由切換瞬時、theme toggle 全站行為一致(dashboard 頁跟行銷頁不再被鎖光差別)。

**Blocked by:** None — can start immediately(可與 R1 / 09 並行)

**Status:** ready-for-agent

- [ ] `App.tsx` 移除 `import { AnimatePresence, motion } from "framer-motion"` 與其使用,`renderCurrentPage()` 直接 render
- [ ] 移除 `lightLockRoutes` 陣列、`lightLock` 變數、`theme-lock-light` className 接入那一段
- [ ] `index.css` 移除 `.theme-lock-light` rule
- [ ] dashboard 頁(console / live / admin / presentation)不再強制光,廣域 theme toggle 行為一致(若 dashboard 頁本身的元件有 `dark:` 變體,接受使用者把它們切到 dark — 該改進留作未來重構)
- [ ] 不動 `useHashRoute` 路由邏輯、不動 `Navbar` / `Footer` / `MetaTags`
- [ ] 路由切換瞬時(`<1ms`)、無 scale/blur transition
- [ ] `npm test` + `tsc --noEmit` + `npm run build` 通過
