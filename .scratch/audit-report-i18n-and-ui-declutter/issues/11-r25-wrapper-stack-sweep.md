# 11 — R2.5 機械掃:wrapper-stack 同空間重複

**What to build:**

grep 掃全站 call site,找出「外層是 component wrapper(`<GlassCard>` / `<GlassContainer>` / `<Reveal>` / `<PageIntro>` / `<PageContainer>`),內層同空間又疊 `bg-{white|black}/[0-9]+` + `border` + `rounded-...`」這種 wrapper-stack pattern。內層 wrapper 若無語意負擔(沒額外加 padding/gap/role/aria/語意 tag)就砍掉,讓外層 component 完全承擔視覺外框。**只動 wrapper-stack 一種 pattern,不動 element 內部 border + shadow + ring 設計**(spec Q14 A 鎖死範圍,主動收窄避免 design judgement 進入)。

**Blocked by:** 09, 10(R2 完工後再掃,刪過光球與 noise 後視覺層數更少,掃出來的雙層 wrapper 更乾淨)

**Status:** ready-for-agent

- [ ] grep `src/` 找所有「外層 component + 內層 `bg-{white|black}/[0-9]+` + `border` + `rounded-...`」同空間重複的 call site:
  - `<GlassCard>` 內層再 `<div className="bg-white/5 border border-white/10 rounded-2xl ...">`
  - `<GlassContainer>` 內層再 `<div className="rounded-... border-...">`(無語意)
  - `<Reveal>` 內層再一層無語意 wrapper
  - `<PageIntro>` / `<PageContainer>` 同 pattern
- [ ] 每個 hit 的 call site 砍掉內層無語意 wrapper,外層 component 的 padding/gap/border/rounded 接管
- [ ] 不動 element 內部 border + shadow + ring(Q14 A 鎖死)
- [ ] 不動 `MeshBackground` (已是 09 改過)、不動 App 路由過場(已是 10 改過)
- [ ] 每 page 改完視覺 diff 應幾乎看不出來(同空間視覺值保留,只是不再兩層)
- [ ] `npm test` + `tsc --noEmit` + `npm run build` 通過;每個 page 路由仍 render
- [ ] grep 完跑後再掃一次 `rg "bg-white/5 border"` 等 pattern,確認 call site 都被清完或不再有雙層
