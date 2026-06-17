# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is
**Ocean Rescue** — a suite of **static, offline, pre-camp** web tools that generate **printable physical
assets** for a 14-day camp board game (12 teams, kids 8–14). **No backend. No live tool at the table** — the
camp is run entirely on paper. Read `README.md` first for the project map and `docs/mechanics.md` for the
authoritative rules.

## Source-of-truth hierarchy (respect this order)
1. **`docs/mechanics.md`** — the authoritative ruleset. If anything disagrees with it, it wins. Decisions
   are tagged `[DECISION D… CONFIRMED]` and are final.
2. **`docs/design/gm-tools-ux.md`** — UX/IA and the canonical `game.json` schema (§4).
3. **`src/**/requirements.md`** — per-module strict build specs (one per tool directory).
4. **`docs/ZASADY.md`** — one-page Polish player summary (keep in sync with mechanics).
5. **`GAME.OBSOLETE.md`** and **`docs/analysis/rules-review.md`** — historical only; **do not rely on them**.

When implementing a module, the relevant `src/<module>/requirements.md` is your system prompt; build exactly
what it says. If it conflicts with `docs/mechanics.md`, **stop and flag it** — don't silently diverge.

## Hard rules (do not violate)
- **Polish for everything player/GM-facing** (UI labels, PDFs, printed cells, card/puzzle text). **English**
  for all code, JSON keys, comments, and docs. Glossary: `docs/mechanics.md` §1.
- **Determinism is sacred.** All randomness flows through `core.makeRng(seed)` (seeded PRNG with `fork`).
  Never use `Math.random`, `Date.now`, or unordered key iteration that affects results. Same seed → identical
  binder + map, forever.
- **Don't re-implement engine logic.** Movement, loot resolution, ricochet, and the scoring caps live in
  `src/core/core.js` only. Every other module imports it. If a tool needs turn logic that isn't in core, it
  belongs in core (flag it) — never duplicate it.
- **`game.json` is the shared bus.** Each module owns a disjoint set of sections (see README table), and on
  export must **merge** (never clobber other modules' sections) and re-pass `core.validateGame`.
- **No live/mutable state.** There is no `live` section in `game.json`; camp state is physical (stickers).
  `core.resolveTurn`'s only runtime consumer is the Economy Simulator.
- **Pure-paper constraint.** Never add an at-the-table/online runtime mode.

## Architecture & stack
- Each module is a **standalone static SPA**: one `index.html` + **vanilla JS** + **Tailwind via CDN** +
  **IndexedDB** + JSON import/export. **No build step, no framework, no npm runtime deps.** Follow the
  existing `tcg_generator/index.html` pattern.
- Shared logic is a single ES module `src/core/core.js`, imported via `<script type="module">`. It ships
  **zero dependencies** and must load both in a browser page and a headless test runner.
- The only network calls anywhere are the **optional AI** calls in the TCG module (facts + art), pre-camp.

## Build order (dependencies flow downward)
`core` → Loot Engine (M3) → Map Gen (M1) / Puzzle Gen (M2) → TCG/Album (M5, extend existing) → Economy
Simulator (M4, the validation gate). See `README.md` for the full table. Nothing but the simulator runs the
full turn loop.

## Environment notes
- Windows; primary shell is **PowerShell** (a Bash tool is also available for POSIX scripts). Working dir:
  `C:\me\repos\MAZURY2026`.
- `git` is initialized. Don't commit or push unless asked. The pre-existing module is `tcg_generator/`.

## When in doubt
Prefer reading `docs/mechanics.md` + the target module's `requirements.md` over guessing. Surface conflicts
rather than resolving them silently — the locked decisions are deliberate and hard-won.
