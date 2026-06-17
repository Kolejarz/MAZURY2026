# Ocean Rescue 🌊 — Offline GM Toolchain

A suite of **static, offline web tools** (HTML/JS/CSS, no backend) that generate the printable physical
assets for a **14-day summer-camp board game** ("Ocean Rescue" / *Ratunek na Oceanie*) for **12 teams of
kids aged 8–14**.

**There is no live digital tool at the table.** The tools run **before camp** to manufacture a printed GM
binder, sticker/Wind-tile bins, and a physical **A1 grid map**. During camp everything is resolved on paper.
Every player- and GM-facing string, PDF, and printed cell is **Polish**; all code, JSON keys, and these docs
are English.

---

## The game in one paragraph
12 teams explore a **26×26 ocean grid** (`A1`–`Z26`). Each turn a team declares a cardinal direction and
rolls a **d12 weather die**; the ship moves with **continuous ricochet** (bounces off walls, jumps already-
visited tiles) and **loots every unvisited tile it stops on**. Tile values are **static, secret, randomly
seeded** — held only in a GM lookup table; the printed grid is blank. Scoring is **two decoupled
currencies**: competitive **Rescue Points** (a written number, **capped per visit**) and a cooperative
**Animal Album** (unique flat cards by category, ≤3 saved/visit). **Winds** (5 directional types incl.
★Joker) are drawn at random and spent **only** to solve held **Archipelago puzzles** — juggling a scarce
Wind supply across many open puzzles is the core strategy. The game ends on a **fixed, equal turn count**,
never on the deck or board running out.

> Full authoritative rules: **`docs/mechanics.md`**. One-page Polish player summary: **`docs/ZASADY.md`**.

---

## Repository map

```
docs/
  mechanics.md            ← AUTHORITATIVE ruleset (implementers + GM). Everything defers to this.
  ZASADY.md               ← One-page Polish player/GM summary.
  prompt.md               ← The architecture/UX brief that seeded the toolchain split.
  design/gm-tools-ux.md   ← UX & information architecture; the game.json schema (§4).
  analysis/rules-review.md← HISTORICAL gap analysis (point-in-time; mechanics.md overrides it).
examples/
  game.json               ← Valid sample game bundle (wired to the schema via $schema).
src/
  core/                   ← Phase 1 — shared engine (core.js): PRNG, schema, resolveTurn().
  core/game.schema.json   ← JSON Schema (draft 2020-12) for game.json — the data contract.
  tools/loot/             ← Phase 2A (M3) — Loot Engine: lootTable, windPool, rpMax.
  tools/tcg/              ← Phase 2B (M5) — TCG/Album: flat unique cards by category.
  tools/map/              ← Phase 3A (M1) — Ocean Map: A1 grid + secret value table.
  tools/puzzle/           ← Phase 3B (M2) — Puzzle Generator: solvable sliding puzzles.
  tools/simulator/        ← Phase 4  (M4) — Economy Simulator: Monte-Carlo balance gate.
tcg_generator/            ← The ONE pre-existing module (to be moved/extended into src/tools/tcg).
GAME.OBSOLETE.md          ← Obsolete original design doc, kept for history only.
```

Each `src/**/` directory holds a **`requirements.md`** that is the strict, self-contained system prompt for
the agent implementing that module. **Build a module by reading its `requirements.md`.**

---

## Build order & module ownership

Modules are sequenced so each can only be built once its dependencies exist. Everything imports the shared
engine and never re-implements its logic.

| # | Phase | Module | Dir | Reads from `game.json` | Owns / writes |
|---|---|---|---|---|---|
| 0 | 1 | **Core engine** | `src/core` | — | `core.js` (PRNG, `validateGame`, `resolveTurn`) |
| 1 | 2A | **Loot Engine** (M3) | `src/tools/loot` | seed, deck, puzzles | `lootTable`, `config.winds.pool`, `rpMax` |
| 2 | 2B | **TCG/Album** (M5) | `src/tools/tcg` | seed, species list | `deck` (flat, by category), `milestones` |
| 3 | 3A | **Ocean Map** (M1) | `src/tools/map` | `lootTable`, `deck`, `puzzles` | `map.secretValues`, `calendar`, owned `config` |
| 4 | 3B | **Puzzle Gen** (M2) | `src/tools/puzzle` | seed | `puzzles[]`, `puzzleRewardCurve` |
| 5 | 4 | **Economy Sim** (M4) | `src/tools/simulator` | everything | report only (no `game.json` mutation) |

**`game.json` is the shared bus.** Ownership above is non-overlapping; every module **merges** its sections
(never clobbers others) and re-passes `core.validateGame` on export. There is **no `live`/mutable section** —
camp state is physical (stickers + pen); the only runtime consumer of `core.resolveTurn` is the Simulator.

---

## Locked design invariants (apply to every module)
- **Pure paper at the table** — tools run pre-camp only; no live/at-the-table mode.
- **Polish output, English code.** Player/GM-facing text is Polish; identifiers and JSON keys are English.
- **Single seed → identical binder + map.** All randomness flows through `core.makeRng(seed)`; never
  `Math.random`/`Date.now`.
- **Static secret tile values, random placement, no gradient.** The grid prints blank.
- **Loot every unvisited stop; continuous ricochet; no Becalmed.** No team is ever stuck.
- **Equal turns is a hard invariant.** The game ends only on a fixed equal turn count.
- **Two decoupled currencies** — Rescue Points (capped/visit) and the Album (≤3/visit) never mix.
- **Static SPA per module** — single `index.html` + vanilla JS + Tailwind CDN + IndexedDB, no backend, no
  build step, no npm runtime deps (pattern: `tcg_generator/index.html`).

---

## Status
- ✅ Rules locked (`docs/mechanics.md`), UX/IA designed, all six `requirements.md` specs written.
- ⬜ Implementation not started (except the pre-existing `tcg_generator/`).
- **Next step:** implement `src/core/core.js` against `src/core/requirements.md` (everything depends on it).
