# requirements.md — Phase 2A: Loot Engine (`/src/tools/loot`, module M3)

**You are the implementation agent for the Loot Engine.** This file is your strict, complete system prompt.

**Authoritative ruleset:** `docs/mechanics.md` (wins over everything). UX/IA contract:
`docs/design/gm-tools-ux.md` §3 Module 3. Shared engine: `/src/core/core.js` (Phase 1 — already built;
import it, never re-implement its logic). **Build only what is here.**

---

## 0. Purpose & one-line job
A standalone static HTML tool that lets the GM **balance the value→reward economy** before camp and emit
three artifacts into `game.json`: **`lootTable`**, **`windPool`**, and **`rpMax`**. It is the JSON-authoring
front end for everything the map and simulator consume.

> Why this is in Phase 2: it is an isolated, low-complexity UI that establishes the reward structures the
> Map Gen (Phase 3) and Simulator (Phase 4) depend on. It depends on `core.js` only for validation and the
> seeded PRNG.

---

## 1. Hard constraints (do not violate)
- **Static SPA, offline, no backend.** Single `index.html` + vanilla JS + Tailwind CDN + IndexedDB, exactly
  like `tcg_generator/index.html`. No npm runtime deps. Imports `/src/core/core.js` as an ES module.
- **Pre-camp only.** No live/at-the-table mode. Output is print + `game.json`.
- **Localization:** every **player/GM-facing string, label, and printed cell is POLISH**. Code, JSON keys,
  comments: English. (See the Polish glossary in `docs/mechanics.md` §1.)
- **Determinism:** any randomized preview (e.g. sample Wind draws) uses `core.makeRng(seed)` — never
  `Math.random`. Same seed → same preview.
- **Single source of truth:** the tool **writes** `lootTable`, `config.winds.pool`, and
  `config.scoring.rescuePoints.rpMaxPerVisit` into the shared `game.json`. It must round-trip:
  import an existing `game.json`, edit, re-export, and `core.validateGame` must still pass.

---

## 2. What the GM configures (inputs / knobs)
Surface these as a clean editor (sliders + numeric fields + a live table). All are tunable placeholders the
Economy Simulator will later refine.

1. **Seed** (shared across all modules).
2. **Target loot ratio** `Winds : Puzzles : Animals : RescuePoints`. Because of **loot-every-tile** (a turn
   yields up to X rewards, `mechanics.md` §4/§6.1), the tool must show the ratio as *expected share of the
   ~X rewards a team collects per turn*, not per-tile-in-isolation.
3. **Value→reward table** (`lootTable`): rows mapping a **static tile value** to a reward of one closed-set
   `kind` (`winds {n}` / `puzzle {byIndex:true}` / `animalSave {rescuePoints?}` / `rescuePoints {n}`).
   Editable rows; the value column is the index the **secret value table** (M1) will use.
4. **Early Wind floor** (D-loot-floor): a rule guaranteeing low/early tiles reliably drop Winds so teams can
   feed their 2 starter puzzles. Expose as "minimum share of low-value tiles that grant Winds."
5. **Wind draw pool** over the **5 types** `↑/↓/←/→/★Joker` (`config.winds.pool`), including **Joker
   rarity** (D5). Must sum to 1; show a normalized bar.
6. **Rescue-Point cap per visit** `rpMax` (D-rpcap) — the lever that tames hoard-and-dump and throttles
   leaders.
7. (Reference, read-only) the **puzzle index→reward curve** shape (normal, smaller/easier = lower, §6.3) —
   cross-checked against `puzzles[]` when present, but **authored** by the Puzzle Gen (M2), not here.

---

## 3. Loot hierarchy the tool must enforce/encourage (D-hoard, §6.1)
- Tile loot **skews toward Winds and Archipelago Maps** (inputs); **most Rescue Points are reserved for
  puzzle turn-ins.** Make "tile RP share" a low, explicit tunable and warn if the GM sets it high enough to
  undercut the intended puzzle path.
- Every Wind reward is phrased as a **draw**: the table stores a **count** `n`; the *type* (incl. Joker) is
  drawn at the table (M-print legend: "Dobierz N Wiatrów — losowe typy").

---

## 4. Outputs
### 4.1 To `game.json` (the real deliverable)
- `lootTable: [{ value, reward:{kind, ...} }, ...]`
- `config.winds.pool: { up, down, left, right, joker }` (normalized, sums to 1)
- `config.scoring.rescuePoints.rpMaxPerVisit: <int>`
- Must pass `core.validateGame(game)` after writing (run it on export; block export + show the precise
  error if it fails).

### 4.2 Printable (Polish, A4, high-contrast, large type) — feeds the binder TAB 3
- **TABELA ŁUPÓW** — the value→reward table with the live-add legend
  `GM dolicza na żywo: +Sztorm(−1)/Cisza(+2) · +modyfikator dnia · +rubber-band`
  (the three live modifiers from `mechanics.md` §6.2/§7). Wind rows phrased as draws.

### 4.3 On-screen analysis (pre-camp validators — not printed)
- **Live ratio readout vs target** (actual Winds:Puzzles:Animals:RP share of the reward mix).
- **Wind-floor validator** — confirms early/low tiles meet the Wind floor.
- **Per-turn loot-volume estimate** — given base X≈3 and the weather model in `config`, estimate how many
  rewards of each kind a team nets per turn.
- **RP-cap pressure** — a rough estimate of how often `rpMax` bites given the table (full verification is
  the Simulator's job in Phase 4; this is a sanity preview only).
- **Reference cross-check:** any `lootTable` `kind:"puzzle"` index must exist in `puzzles[]` (warn if the
  puzzle deck isn't loaded yet); any `animalSave` must be suppliable by the loaded `deck` (warn on
  under/over-supply, feeding M5/M4 sizing).

---

## 5. Data contract (shared `game.json`)
Read/write the schema defined in `/src/core` §3 and `gm-tools-ux.md` §4. **This tool owns** `lootTable`,
`config.winds.pool`, `config.scoring.rescuePoints.rpMaxPerVisit`. It must **not** clobber other modules'
sections (map, puzzles, deck, calendar) on round-trip — merge, don't overwrite. Persist working state in
IndexedDB; import/export `game.json` as a file.

---

## 6. UX pattern (follow the existing TCG generator)
Mirror `tcg_generator/index.html`: Tailwind CDN, vanilla JS, IndexedDB store, JSON import/export buttons, a
clean editor panel + a live preview/validator panel. Polish UI labels. No framework.

## 7. Definition of Done
1. Loads `core.js`; importing the reference `game.json` round-trips and re-validates.
2. Editing ratio/table/pool/`rpMax` updates the live readouts deterministically (seeded).
3. Export writes only this module's sections, merges the rest, and `core.validateGame` passes.
4. The Polish **TABELA ŁUPÓW** prints cleanly (A4) with the live-add legend.
5. Wind pool sums to 1; Joker rarity is editable; Wind-floor validator passes for a sane config.
6. Cross-checks warn (not crash) when `puzzles[]`/`deck` are absent.
