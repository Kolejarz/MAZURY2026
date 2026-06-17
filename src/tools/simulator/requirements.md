# requirements.md — Phase 4: Economy Simulator (`/src/tools/simulator`, module M4)

**You are the implementation agent for the Economy Simulator — the validation gate.** This file is your
strict, complete system prompt. **Build only what is here.**

**Authoritative ruleset:** `docs/mechanics.md` (wins). UX/IA: `docs/design/gm-tools-ux.md` §3 Module 4.
Shared engine: `/src/core/core.js` (Phase 1). **This module is the ONLY runtime consumer of
`core.resolveTurn` — the camp itself is pure paper.**

---

## 0. Purpose
A **headless Monte-Carlo runner** that plays **thousands of simulated 14-day camps** to validate fairness,
pacing, board-starvation limits, Album completability, early-puzzle solvability, and **Rescue-Point cap
effectiveness** — **before the GM hits "Print".** It consumes a full `game.json` (the output of M1/M2/M3/M5)
and produces a balance report; the GM loops back to M3/M1 to tune until the report is green.

> Why last: it exercises the entire ruleset end-to-end. It cannot run until Phases 1–3 exist.

---

## 1. Hard constraints
- **Static SPA, offline, no backend.** `index.html` + vanilla JS + Tailwind CDN + IndexedDB (report
  storage). Imports `/src/core/core.js`. May use a **Web Worker** to run many camps without freezing the UI.
- **Determinism:** all randomness via `core.makeRng(seed)` with **forked streams** per concern/team (weather
  rolls, Wind draws, start placement, map). Same seed + same `game.json` → identical report. Different
  Monte-Carlo runs vary only by an explicit run-index fed into the fork.
- **`resolveTurn` is the source of truth.** Do **not** re-implement movement/loot/caps — call `core.js`. The
  simulator's job is to **drive** the engine, apply atomic claims in turn order, tally currencies, and
  report. If the sim needs logic not in core, that logic belongs in core (flag it), not duplicated here.
- **Localization:** the report UI is GM-facing → **Polish** labels; code/JSON keys English. (Internal logs
  may stay English.)

---

## 2. The model the simulator MUST encode exactly (mechanics §4, §6, §3)
For each simulated camp:
- **Setup:** 12 teams; each **chooses a start tile** (D6a — sim picks via seeded policy, optional min
  spacing), marked visited with **no loot**; start pools = 6 balanced Winds (incl. Joker), 0 RP, 2 puzzles
  (D6b); `visited` set initialized.
- **Calendar:** model the **living calendar as a turn-count RANGE** (e.g. 12–18, `calendar.turnRange`), with
  per-day global modifiers and excluded/multi-turn (finale) days. **Equal turns is a hard invariant** —
  every team gets the same number of turns; the game ends **only** on the fixed equal turn count, never on
  deck/board exhaustion (§3).
- **Turn order:** **fixed-rotating** (D13) — rotate the lead team each day; on multi-turn days resolve
  round-by-round. Apply each team's `TurnResult.newlyVisited` **atomically in order** so the next team jumps
  the new stickers (D-atomic).
- **Each turn:** one declared cardinal + one **d12** roll (sample `dieFaces` + a uniform compass for
  `compass` faces via the forked rng) → `core.resolveTurn` → **stop on & loot every unvisited tile up to X**,
  jump visited, **ricochet** at walls, Storm/Still per-tile loot mod, global modifier, rubber-band baseline.
- **Winds:** drawn per type from `config.winds.pool` (incl. Joker) via `core.drawWinds`; sailing is **free**.
- **Puzzles:** unlimited holding (D10); model turn-ins (a policy: e.g. solve when the team holds the Winds a
  known solution needs, Jokers filling gaps) granting the puzzle's **indexed reward**.
- **Scoring caps:** **Rescue Points capped per visit** (`rpMax`, overflow lost / Winds kept) via
  `core.applyRescuePoints`; **≤3 flat unique animals per visit** via `core.applyAnimalSaves`.
- **Rubber-band:** apply the printed **baseline** (bottom-N gap bump) each day; the bounded GM **override**
  is discretionary/logged in reality — model it off by default, with a toggle to test its bounds.

---

## 3. Report outputs (the deliverable — Polish UI, exportable)
Run N camps (e.g. 1000) and report, with distributions not just means:
1. **Rescue-Point fairness band** — leader vs **median** RP spread; target **leader ≤ «1.6×» median**
   (mechanics §8). Flag camps/seeds outside the band.
2. **RP-cap effectiveness** — does `rpMax` tame **hoard-and-dump** spikes and slow early runaway leaders?
   Show RP-with-cap vs a no-cap counterfactual.
3. **Board-starvation check** — confirm **≥ X unvisited tiles always remain** so continuous movement (D2)
   never has to be capped; report the earliest turn any camp drops below X reachable unvisited tiles. (Use
   the `TurnResult` short-stop fact from `core.sailStops`.)
4. **Album completability** — with `deck` size vs `12 × 3/visit × turns`, is the Album **completable but not
   trivial** over the turn range (D-deck)? Report category completion rates + milestone trigger timing.
5. **Early-puzzle solvability & Wind throughput** — can teams feed the 2 starter puzzles early? Per-type
   Wind throughput **incl. Joker rarity** (D5); flag if some direction starves.
6. **Sensitivity to ±turns** (living calendar) — how much an extra turn swings the outcome (so the GM knows
   the cost of adding one).
7. **Pacing curve** — verify ~half of total RP is earnable in the final third (puzzle turn-ins + finale,
   D16) so the race stays live to day 14.
8. **Soft-lock counter — must be 0.** There is no Becalmed (D2/D3); this checks the **logic** (no team ever
   stuck, no infinite loop, no off-grid), not a rule. Any non-zero is a bug to fix in core.

Provide a green/red **balance verdict** summarizing pass/fail per check, and a "loop back to M2/M3" hint
naming which knob to move.

---

## 4. Data contract
- **Reads** the entire `game.json` (config, calendar, lootTable, windPool, rpMax, map.secretValues, puzzles,
  deck, rubberBand). **Writes** a report only (IndexedDB + downloadable JSON/printable summary).
- **No mutation of `game.json`.** The simulator holds its own ephemeral `core.makeInitialState(game)` per
  camp; nothing is serialized back. There is **no `live` section** anywhere.

## 5. Definition of Done
1. Imports `core.js`; drives `core.resolveTurn` exclusively for turn logic (no duplicated movement/caps).
2. Same seed + `game.json` → identical report; runs N camps off the UI thread (Worker) without freezing.
3. Produces all 8 report checks in §3 with distributions and a green/red verdict, Polish UI.
4. Atomic turn-order claiming reproduces the shared-visited behavior; equal-turns invariant asserted each
   round (`core.assertEqualTurns`).
5. Soft-lock counter is 0 on a valid `game.json`; board-starvation and fairness flags surface correctly on a
   deliberately bad config (sanity: a too-small grid or too-high tile-RP share trips the right warning).
