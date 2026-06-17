# requirements.md — Phase 3A: Ocean Map Generator (`/src/tools/map`, module M1)

**You are the implementation agent for the Ocean Map Generator.** This file is your strict, complete system
prompt. **Build only what is here.**

**Authoritative ruleset:** `docs/mechanics.md` (wins). UX/IA: `docs/design/gm-tools-ux.md` §2.1, §2.2, §3
Module 1. Shared engine: `/src/core/core.js` (import it — never re-implement movement/validation).
Depends on Phase 2 outputs: `lootTable`, `windPool`, `rpMax` (M3) and `deck` categories (M5),
`puzzles[]` indices (M2) for labeling.

---

## 0. Purpose & the two printed artifacts
Generate, pre-camp, the **physical table apparatus** (mechanics §7, §11):
1. **The A1 Ocean Map** — a **plain 26×26 grid** with letter-number coordinate rulers (`A1`…`Z26`).
   **NO values, NO glyphs, NO gradient.** It only shows position; teams place stickers on visited tiles.
2. **The GM-only secret value table** — for each tile coordinate, its **static, unchangeable** seeded value
   and the concrete base reward it indexes (Winds / puzzle / animalSave / Rescue Points). **Players never
   see it.**

Also authors the **living-calendar baseline** (TAB 1).

> Why Phase 3: it needs the reward structures from Phase 2 to label the secret table, and `core.js` from
> Phase 1 to validate reachability.

---

## 1. Hard constraints
- **Static SPA, offline, no backend, no live mode.** `index.html` + vanilla JS + Tailwind CDN + IndexedDB,
  pattern of `tcg_generator/index.html`. Imports `/src/core/core.js`.
- **Single seed → identical grid + secret table + calendar** (uses `core.makeRng(seed)`; never
  `Math.random`). Reprinting from the same `game.json` is byte-identical.
- **Localization:** every printed/UI string **Polish**; code/JSON keys English.
- **Static secret values, RANDOM placement, NO gradient** (D7/D8). The generator controls the value
  *distribution* (how many high/low tiles), **not** their *placement*, which is random per seed.
- **No pre-placed starts** — teams choose starts at setup (D6a); the GM marks them live on day 0. The
  generator must **not** seed start positions.

---

## 2. Inputs (knobs)
- Seed; grid `26×26` (locked; validate); `#teams = 12`.
- **Value distribution** — how many high/low **static** values across the 676 tiles (placement random, only
  the distribution tuned, D8). Because **loot-every-tile** means a turn yields up to X rewards (§4/§6.1),
  size the distribution accordingly (the per-tile rewards must not overflow the economy — cross-check M3).
- The **weather model** + **d12 face counts** (compass/Still/Storm mix) — stored in `config` for the
  Simulator; the map gen needs them to run its reachability validator.
- Edge rule = **ricochet, always full X**; **jump-visited** (both come from `core.sailStops`).
- **Living calendar baseline** (D9): planned turns/day, excluded days, multi-turn (finale) days, per-day
  global modifiers, plus a **turn-count range** (e.g. 12–18) for the Simulator. Equal-turns is a hard
  invariant — surface it in the UI.
- Links to `lootTable` (M3) to resolve each tile value → base reward; `deck` categories + `puzzles[]`
  indices to label the secret table glyphs.

---

## 3. Generation procedure (use `core.js`)
1. Validate the incoming `game.json` with `core.validateGame`.
2. Seed the **static secret value** of each of the 676 tiles by drawing from the configured value
   distribution via `core.makeRng(seed).fork("map")`. Placement is random; values are fixed for the whole
   game.
3. For each tile, resolve its **base reward** by indexing `lootTable` with the tile's value. Store
   `{ coord, value, reward }` in `map.secretValues` (canonical coord strings via `core.formatCoord`).
4. **Reachability / ricochet validator** (the critical pre-camp check): using `core.sailStops`, confirm
   **continuous movement always delivers X** and the **board never starves** at the planned turn counts —
   i.e. ≥ X unvisited tiles remain reachable across a simulated fill at `turnRange` upper bound. Report the
   earliest turn (if any) at which fewer than X unvisited tiles could remain; if it's within the planned
   range, warn the GM to shrink the grid or trim turns (mechanics §4.2 termination caveat, §10).

---

## 4. Outputs
### 4.1 To `game.json`
- `map.secretValues: [{coord,value,reward}, ...]` (one per tile, no duplicates, all on-grid).
- `calendar: { baseline:[...], turnRange:[lo,hi] }`.
- `config` fields this module owns (grid, weather model, dieFaces, edge rule, equalTurns, valuePlacement,
  startStrategy). Merge — do not clobber M3/M5/M2 sections. Export must pass `core.validateGame`.

### 4.2 Printable (Polish, high-contrast, large type)
- **A1 player grid (the wall prop):** plain 26×26 grid, **coordinate rulers on ALL FOUR edges + diagonal
  tick marks** (so eye-traced diagonals/ricochets stay on-line, `gm-tools-ux.md` §2.1/§2.6); every 5th
  row/col bold; sticker surface; **no values**. Sized for A1 printing/tiling.
- **SEKRETNA TABELA WARTOŚCI (TAB 2, GM-only):** per-tile `pole | wartość | nagroda bazowa` with the
  live-add reminder (`+Sztorm −1/Cisza +2 · +modyfikator dnia · +rubber-band`). Glyph legend
  `💨n / 🧩 / 🐾 / ⭐n`. Marked clearly **NIE pokazywać drużynom**.
- **KALENDARZ baseline sheet (TAB 1):** per-day excluded?/multi-turn?/global modifier, today's turn order
  (fixed-rotating, D13), rubber-band baseline column, and an **actual-turns log** surface (equal across
  teams) + override log column.

### 4.3 On-screen (pre-camp only)
- Grid preview + the **reachability/ricochet validator** result; value-distribution histogram; a
  cross-check that every `lootTable` puzzle index exists in `puzzles[]`.

---

## 5. Definition of Done
1. Imports `core.js`; same seed → identical `secretValues`, grid, calendar; export re-validates.
2. The A1 grid prints with four-edge + diagonal rulers and **no values**; the secret table prints GM-only
   with the live-add legend and Polish glyph legend.
3. Reachability validator runs via `core.sailStops` and reports board-starvation risk against `turnRange`.
4. No start positions are pre-placed; calendar enforces equal-turns invariant in the UI copy.
5. Merges cleanly into a shared `game.json` without overwriting M2/M3/M5 sections.
