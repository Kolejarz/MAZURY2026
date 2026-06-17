# requirements.md — Phase 3B: Puzzle Generator (`/src/tools/puzzle`, module M2)

**You are the implementation agent for the Puzzle Generator.** This file is your strict, complete system
prompt. **Build only what is here.**

**Authoritative ruleset:** `docs/mechanics.md` (wins; esp. §5.3, §6.3). UX/IA:
`docs/design/gm-tools-ux.md` §2.5, §3 Module 2. Shared engine: `/src/core/core.js` (seeded PRNG; import it).

---

## 0. Purpose
Procedurally generate **valid, solvable** sliding ("Ice-Cave" / Ricochet-Robot) puzzles — the **Archipelago
Maps** — **indexed by difficulty**, each with an internal **validated solution (GM key)** and a **per-index
reward**, and export **pictographic hand-out sheets that print NO solution and NO required moves** (D11).

> Why Phase 3: rewards are indexed against the M3 reward curve and the difficulty metrics feed the
> Simulator (Phase 4).

---

## 1. Hard constraints
- **Static SPA, offline, no backend, no live mode.** `index.html` + vanilla JS + Tailwind CDN + IndexedDB,
  pattern of `tcg_generator/index.html`. Imports `/src/core/core.js` for the **seeded PRNG only**
  (`core.makeRng(seed)` — never `Math.random`; same seed → same deck).
- **Localization:** all hand-out text **Polish**, and **pictographic-first** (arrows/icons) so an 8-year-old
  and a 14-year-old both engage (mechanics §5.3, `rules-review` §4.C). Code/JSON keys English.
- **NO printed solution, NO required-Wind list on the hand-out** (D11). The team works out the path itself
  and spends the directional Winds (incl. ★Joker = any one direction at spend time) it actually uses.

---

## 2. Puzzle model (Ice-Cave / Ricochet-Robot)
- Grid **5×5 to 8×8**. A ship **slides continuously** in a chosen direction until it hits an **obstacle,
  wall, or pause/stop tile**, then can change direction. Goal: reach the 🏁 tile.
- Each puzzle has: obstacles layout, a **start** ship tile, a **goal** tile, and an internal **solution**
  (ordered slide list, e.g. `["U","L","U","R"]`).
- **Solvability is guaranteed:** emit **only** maps with a validated finite solution. The solution is known
  internally (GM key) but **never shown to players** (mechanics §5.3).

## 3. Core logic (build here — this is the module's real work)
- **BFS over slide-states** to prove a finite solution exists and to measure difficulty:
  - state = ship position; transition = slide-until-blocked in each of the 4 directions; goal = reach 🏁.
  - Record **solution length** (min slides) and **branching/complexity** as difficulty metrics.
- Generate by seeded random layout, then **BFS-validate**; reject + regenerate unsolvable or trivial maps
  until the requested count/difficulty band is met.
- Difficulty (size + solution length + Wind mix the solution implies) feeds the **reward index**, NOT a
  printed wind cost. The team discovers the path; Jokers fill gaps. Because holding is **unlimited** (D10)
  and Winds are scarce, the strategic layer is **wind-juggling across many open maps** — the generator just
  guarantees each map is individually solvable.

## 4. Reward indexing (mechanics §6.3, D-puzzle-reward)
- Every puzzle carries an **index**; turn-in grants the reward the **per-map reward table** assigns to that
  index. Reward **scales with difficulty/size**: smaller/easier → lower; larger/harder → higher.
- The exact difficulty→reward curve and its **normal-distribution** shape are **tuned by the Economy
  Simulator** (Phase 4) and cross-checked with the Loot Engine (M3). This module **emits each map's
  difficulty metrics** (size, solution length, Wind mix) so the reward table can be derived consistently;
  store a `rewardIndex` per puzzle. Do not hardcode reward values here.

## 5. Inputs (knobs)
Seed; puzzle count; grid-size range (5×5…8×8); difficulty band (target solution length, obstacle density);
the reference index→reward curve shape (normal; smaller/easier = lower) for previewing only.

## 6. Outputs
### 6.1 To `game.json`
```jsonc
"puzzles": [
  { "id": "Z-014", "index": 37, "difficulty": { "len": 4, "size": 7 },
    "grid": [/* obstacles */], "ship": "B2", "goal": "F4",
    "solution": ["U","L","U","R"],   // GM key — NEVER printed
    "rewardIndex": 37 }
],
"puzzleRewardCurve": { "shape": "normal", "min": "low(easy)", "max": "high(hard)" }
```
Merge into the shared `game.json`; export must pass `core.validateGame`. `id`s are stable & unique;
`index` values are referenced by `lootTable` `kind:"puzzle"` rows (M3) and by the Simulator.

### 6.2 Printable (Polish)
- **Hand-out sheet (to kids)** — pictographic grid (🚢 start, 🏁 goal, ▓ obstacles), the rule in simple
  Polish (*"Statek ślizga się aż uderzy w przeszkodę/ścianę. Doprowadź 🚢 do 🏁. Wydawaj Wiatry (↑↓←→ lub
  ★Dżoker) na ruchy, skreślając je na karcie."*), the puzzle id + index. **No solution, no required moves.**
- **GM solution key (binder, never shown):** `Z-014 | rozwiązanie: U,L,U,R | indeks nagrody: #37`.

### 6.3 On-screen (pre-camp)
- Preview with **animated solution playback**; a **solvability badge** (BFS-proven); difficulty metrics
  (len/size/branching); difficulty histogram across the generated deck.

## 7. Definition of Done
1. Imports `core.js` PRNG; same seed → identical puzzle deck.
2. Every emitted puzzle is **BFS-proven solvable**; trivial/unsolvable maps are rejected and regenerated.
3. Hand-out sheets print pictographically in Polish with **no solution / no required moves**; GM key + index
   print separately.
4. Each puzzle emits difficulty metrics + `rewardIndex`; `puzzles[]` merges into `game.json` and validates;
   indices align with M3's `lootTable` puzzle rows.
5. Animated solution playback + solvability badge work on-screen.
