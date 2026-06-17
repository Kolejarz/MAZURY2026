# Ocean Rescue — Rules & Mechanics Review (Analysis Phase)

> ⚠️ **HISTORICAL — point-in-time analysis (kept as a record).** Many recommended defaults below were
> later **confirmed, refined, or overridden** by the designer. The **authoritative ruleset is now
> `docs/mechanics.md`**; where this analysis and `mechanics.md` disagree, `mechanics.md` wins.
> Notable overrides: fungible Winds → **directional + Joker** (D5); perimeter-seed/center-gradient →
> **team-chosen starts + random loot** (D6a/D7); Becalmed → **removed, continuous ricochet** (D2/D3);
> pre-authored calendar → **living calendar** (D9); live GM resolver → **pure paper, A1 map + stickers**
> (D17); tiered cards w/ VP → **decoupled Rescue Points + flat unique Rescued Animals** (D-score/D12);
> 27×27 → **26×26**. This document still usefully captures the *original gap analysis*.

**Reviewer role:** senior game-systems & UX analyst
**Source under review:** `GAME.md` (Master Game Design Document)
**Lens:** (a) will this run smoothly with one GM, 12 teams, kids 8–14, 14 days; (b) is it unambiguous enough to implement in software.
**Status:** Design is a strong *thematic* skeleton but is **under-specified at the mechanical level**. Roughly 70% of the rules an implementer or GM needs to execute a turn are currently undefined. Almost every section reads as intent ("naturally pushes teams toward the edges") rather than a deterministic procedure. The single biggest risk is not balance — it is that **the daily turn loop is not yet a fully specified algorithm**, so neither the Ocean Map Generator nor the Economy Simulator can be built without a round of designer decisions.

This document prioritizes highest-impact issues first. Section references are to `GAME.md`.

---

## 0. TOP-PRIORITY BLOCKERS (must resolve before any tooling)

These are the issues that block the Ocean Map Generator (module 1) and Economy Simulator (module 4) outright. Everything else is refinement.

1. **The "Sail & Skip" movement algorithm is undefined at the boundaries** (§4.3). This is the heart of the game and it has no defined behavior for: grid edges, fully-visited directions, the dice modifier's meaning, and starting positions. See §1.A–§1.E below. *Without this, the map generator cannot validate that any tile is reachable and the simulator cannot run a single turn.*
2. **The Weather Dice modifier semantics are undefined** (§3, §4.2). "Storm" and "Still" have names but no rule. Four "Compass Directions" on the die collide conceptually with the team's own "Declare Direction" step — is the die *overriding* the declared direction, or *modifying distance*? See §1.D. *This single ambiguity changes the entire probability model the simulator must use.*
3. **Wind economy has no source-of-truth loop** (§3, §5, §6). Winds are spent to solve puzzles, puzzles are won to gain Winds, and Winds are also (apparently) needed to do… what, exactly, on the Ocean Map? The doc never states that sailing costs Winds — yet §1 of the task brief assumes "a team with no Wind cards" can stall. We must pin down **whether Ocean sailing consumes Winds or not.** This determines whether a soft-lock is even possible. See §1.F.
4. **No starting state defined** (§4). Where does each of the 12 teams start on the 27×27 grid? What is their starting Wind pool? Starting VP? Do they start with a puzzle? *The simulator needs initial conditions.*
5. **No turn-resolution order for 12 teams** (§4, §7). Teams "visit the GM daily" but tile-skipping depends on what *other* teams have already visited. Order of resolution materially changes outcomes (first mover skips fewer tiles). See §2.A.

---

## 1. RULES GAPS & AMBIGUITIES

### A. Grid-edge behavior (§4.3) — CRITICAL
"Teams move in a straight line… skip over visited tiles… naturally pushes teams toward the edges." Unspecified:
- What happens when the counted move would **land past row/column 0 or 26**? Options: (i) stop at the last empty tile before the edge; (ii) the move is wasted/forfeit; (iii) the team "bounces"; (iv) the team picks a new direction.
- What happens when a team is **already on the edge** and declares a direction pointing off-map?
- Does landing exactly on the edge tile count as a normal landing (loot granted)?
- **Recommended default:** A sail always lands on the *furthest reachable unvisited tile in that direction within the grid*; if the counted distance overshoots the edge, the team lands on the last unvisited tile before/at the edge and still collects its loot. Never waste a turn; never go off-grid.

### B. "All tiles in a direction already visited" (§4.3) — CRITICAL
The skip rule counts only empty tiles. If *every* tile in the declared direction is visited, the line "leads off-map" with zero valid landing tiles.
- **Unanswered:** Is the turn forfeit? Does the team re-declare? Does it auto-redirect to the nearest direction with an empty tile?
- This is a guaranteed **late-game soft-lock vector**: as the 729-tile grid fills, more and more direction declarations resolve to "no empty tile."
- **Recommended default:** If the declared direction has no unvisited tile, the team may immediately re-declare a different direction (free re-roll of the *direction* only, keeping the same dice result), and if **no** direction has any reachable unvisited tile, the team is "becalmed" that day and instead receives a fixed consolation (e.g., 1 Wind) — turning a dead turn into a minor resource trickle.

### C. Interaction of Skip + dice modifier + edge simultaneously (§4.2–4.3)
When skip, a numeric modifier, and the grid edge all apply on the same move, the resolution order is undefined and produces different landing tiles depending on order. The generator/simulator must implement *one* canonical order.
- **Recommended default order:** (1) determine direction, (2) step tile-by-tile in that direction, (3) count only unvisited tiles toward the modifier's distance, (4) stop early if the edge is reached, (5) land on the last counted tile.

### D. Weather Dice semantics (§3, §4.2) — CRITICAL
Six faces: 4× Compass Direction, 1× Still, 1× Storm. The doc calls the die a "movement modifier" but a compass direction is **not** a numeric modifier. Core ambiguity: does the die set/override direction, or modify distance?
- If the die **overrides** the declared direction, the "Declare Direction" step (§4.1) is meaningless 4/6 of the time — why declare?
- If the die only modifies **distance**, then what distance do the 4 compass faces add, and how does a *direction* become a number?
- "Still" and "Storm" have **no mechanical definition at all.**
- **Recommended default (cleanest, and what the simulator should assume):** Declared direction sets *where* you sail. The die sets *how far / what happens*:
  - 4× Compass face → the team sails a base distance (e.g., 3 unvisited tiles).
  - **Still** → sail only 1 unvisited tile (calm seas, short move).
  - **Storm** → sail a longer but *less controlled* move (e.g., 5 unvisited tiles) OR the GM chooses the direction — pick one. Recommend: Storm = move 5 tiles in declared direction (high reward, used as a pacing lever).
  - Alternative the designer may prefer: compass faces *do* override direction (adds chaos/luck) — but then drop or rename the "Declare Direction" step. **The designer must pick one of these two models; they are mutually exclusive and drive the whole probability engine.**

### E. Starting positions & first move (§4) — CRITICAL
- 12 teams on a 27×27 grid: are they bunched at one edge, spread around the perimeter, or randomly seeded? This drastically changes collision rates and who reaches high-value tiles first.
- **Recommended default:** Seed teams evenly around the perimeter (or in a ring), facing inward, so exploration converges toward the center where the highest-value loot is placed. This also makes the "push toward edges" claim in §4.3 questionable — if loot increases toward the center, the skip rule pushing teams *outward* fights the reward gradient. **Resolve the geometry of the value gradient vs. the direction the skip rule pushes.**

### F. Does sailing cost Winds? (§3, §4, §5) — CRITICAL
The doc says Winds are spent **only** to solve puzzles (§5). It never says sailing costs Winds. Yet the whole "what stops a team with no Winds from progressing?" concern only exists if sailing needs Winds.
- As written, **a team with zero Winds can still sail and explore forever** — Winds are only gating puzzle-solving, not exploration. If that is intended, there is **no progression soft-lock on the macro layer**, which is good, but it means Winds are a pure puzzle currency and the "Wind cards (Up/Down/Left/Right)" directional flavor (§3) is decorative on the Ocean Map.
- **Recommended default:** Keep sailing free (no Wind cost). Winds are exclusively the puzzle-solving currency. Document this explicitly to kill the ambiguity.

### G. Puzzle solvability vs. a team's Wind pool (§5) — HIGH
"Teams must spend Wind cards (Up/Down/Left/Right) to execute the solution." A sliding puzzle's unique solution uses a *specific multiset* of directional moves (e.g., 3×Up, 2×Left). If a team's pool lacks the needed directions/counts, the puzzle is **literally unsolvable for them right now.**
- Unanswered: Can a team get the right puzzle but wrong Winds and be stuck holding it? Can they trade/convert Winds? Does the puzzle reward replenish exactly the Winds it costs?
- This is a **real soft-lock**: team holds a puzzle, lacks the matching Winds, and (if puzzle rewards are the only good Wind source — §6) cannot earn the Winds to solve it.
- **Recommended defaults (pick at least one):** (i) The Reward/Loot Engine guarantees that whenever a puzzle is awarded, the team is also granted (or the tile drops) the exact Winds its known solution requires; (ii) allow Winds to be generic/fungible (1 Wind = 1 move in any direction) — **strongly recommended**, it eliminates the entire directional-mismatch soft-lock and simplifies the Puzzle Generator's solvability proof; (iii) allow the GM to sell missing Winds for VP. Recommend (ii) as the clean default, with directional Winds kept only as cosmetic flavor.

### H. Wind initial distribution (§3) — HIGH
Never specified. If teams start with 0 Winds and Winds come primarily from puzzles, but puzzles cost Winds to solve, there is a **bootstrap problem**: no one can solve the first puzzle.
- **Recommended default:** Every team starts with a fixed starter pool (e.g., 6 generic Winds) and early Ocean tiles reliably drop Winds, guaranteeing the first puzzle is always solvable. The Loot Engine must enforce an early-game Wind floor.

### I. Puzzle turn-in vs. acquisition loop (§5, §6) — MEDIUM
"Holding solved maps delays acquisition of higher-tier rewards, so teams turn them in quickly." The *mechanism* of this delay is never stated. Why does holding a solved map block anything? Is there a hand limit? A one-active-puzzle rule?
- **Recommended default:** A team may hold at most **one** unsolved puzzle at a time; the top-tier reward table is only rolled at turn-in. This creates the intended "turn in to advance" pressure explicitly.

### J. Loot table mechanics (§4.4) — MEDIUM
"Landing yields a base value 1–6; GM references a lookup table (15–20 rows of increasing value)." How does a **1–6 base value** index a **15–20 row** table? The mapping is undefined (is base value an offset added to a per-day row pointer? a dice roll into a sub-range?).
- **Recommended default:** The 1–6 is rolled (or taken from the dice) and added to a day-based row pointer into the 15–20 row table; clamp at the table's max row. The Loot Engine must define and print this exact mapping per day so the GM just reads a cell.

### K. Global modifiers & day exclusions/double-turns (§4, §4.5, §7) — MEDIUM
- "Some days excluded, some feature double turns" (§4): **who decides which days, and when?** Is this a fixed pre-camp schedule or live GM discretion? For a simulator it must be a fixed input.
- Global modifiers (§4.5) like "+2 from Day 5" — are these pre-authored or improvised?
- **Recommended default:** All day exclusions, double-turn days, and global modifiers are **pre-authored in a printable 14-day calendar** generated by the Ocean Map / Loot Engine before camp. No live scheduling decisions. (Rubber-band bumps in §7 remain live and secret — those are the only live numeric levers.)

### L. Animal card assignment (§6) — MEDIUM
VP is granted "in the form of Animal Cards" with a printed face value. Unspecified: Which card does a team get when loot says "+5 VP Animal"? Is there a deck keyed by VP tier? What happens when the species pool is exhausted (the album is finite — the whole camp goal is "collect all species")?
- **Recommended default:** The TCG deck is organized into VP tiers (the existing generator already has a 1–3 "moc/power" field — extend it to map to VP). Loot grants "draw the next card from tier N." Define behavior when a tier runs dry (reshuffle duplicates as pure VP tokens with no new album slot).

---

## 2. EDGE CASES & FAILURE MODES

### A. Team resolution order & the shared-visited map (§4.3) — HIGH
Skip depends on tiles "visited by them or other teams." With 12 teams, **the order in which teams take their daily turn changes their results** (later teams skip more tiles, travel further, may overshoot good loot). Is the daily order fixed, rotating, or first-come-at-the-GM-table? First-come rewards the team that lines up earliest each morning — a real-world unfairness.
- **Recommended default:** Fixed rotating turn order (rotate the starting team each day) so the first-mover advantage is shared evenly. The simulator must model this.

### B. Two teams landing on the same tile — collisions (§4.3)
Can two teams occupy the same tile? The skip rule implies a tile becomes "visited" the instant one team lands, so a second team would skip past it. But within the *same day*, if teams resolve simultaneously in the GM's mind, ties are undefined.
- **Recommended default:** Tiles are claimed atomically in turn order; once visited, that tile is "visited" for everyone for the rest of camp. No two teams share a tile. (Already implied — just state it.)

### C. Late-game tile exhaustion (§4.3) — HIGH
729 tiles, 12 teams, up to 2 moves/day, ~12 active days → potentially **hundreds of tiles consumed**. As the grid saturates, becalmed turns (§1.B) spike and the macro game stalls into puzzle-only play. Is that the intended late-game shape?
- **Recommended default:** Intend and embrace it — design the arc so the **macro/exploration game dominates the first ~8 days and the puzzle/turn-in game carries days 9–14.** The simulator should report the day at which >50% of teams hit becalmed turns; if that's before day 10, enlarge effective space (allow diagonal sailing, or shrink to a 21×21 grid for 12 teams) or reduce moves.

### D. Hoarding (§5, §6) — MEDIUM
- **Wind hoarding:** A team could stockpile Winds and never solve puzzles, just farming VP from tiles. If tile VP is non-trivial, the intended "puzzles are the high-tier path" (§6) is undercut. Conversely, if tile VP is trivial, exploration feels pointless.
- **Solved-map hoarding** is supposedly self-correcting (§5/§1.I) but only if the one-puzzle-at-a-time rule exists.
- **Recommended default:** Make tile loot skew toward *Winds and puzzles* (inputs) and reserve most *VP* (Animal Cards) for puzzle turn-ins, so hoarding Winds without solving puzzles caps a team's VP. The Loot Engine ratio controls this — make "tile VP share" a tunable the designer sets low.

### E. Gaming the rubber-band (§7) — MEDIUM/HIGH
Rubber-banding is **GM-discretionary and secret**. Kids 8–14 are excellent at noticing "if I look like I'm losing, the GM helps me." Risk: teams **sandbag** (deliberately underperform / report low) to trigger bumps and extra sails.
- Because bumps are *secret*, this is somewhat mitigated, but extra **sails are visible** (you physically take another move). Visible help is exactly what invites sandbagging and resentment from leaders.
- **Recommended default:** Make rubber-banding **rule-based, not discretionary** — e.g., the bottom-N teams each day automatically get a small modifier bump derived from the VP gap, computed by the Economy tool and printed on the GM's daily sheet. Remove "extra sail" as a visible discretionary grant or convert it to an automatic, gap-triggered bonus. Discretion is the enemy of both fairness perception and reproducible simulation.

### F. Disputes / non-determinism at the table
Any rule resolved "by GM judgment live" (edges, becalmed, ties, rubber-band) is a dispute magnet with competitive kids and a fairness flashpoint for parents. Every ambiguity above is also a **table-argument risk**, not just an implementation gap.

---

## 3. BALANCE & PACING RISKS

### A. Luck vs. strategy variance (§4.2, module 4) — HIGH
The Weather Dice injects luck on **every** move; the only player *agency* is "declare a direction." If the die overrides direction (§1.D model A), agency is near zero and outcomes are mostly luck — bad for 8–14s who notice unfairness, and frustrating for the older end who want strategy. The Economy Simulator (module 4) exists precisely to measure this — but **it cannot run until §1.D is decided.**
- **Recommended:** Choose the "declared direction + die sets distance" model (§1.D default) to preserve meaningful choice, then use the simulator to keep top-vs-bottom VP spread within a target band (e.g., leader ≤ 1.6× the median).

### B. Snowballing vs. over-correction (§7) — MEDIUM
Rubber-banding fights snowballing, but **secret + discretionary** correction risks *over*-correcting (the GM, wanting peace, props up losers so much that effort doesn't matter) or *under*-correcting (busy GM forgets). Neither is tunable. Rule-based bumps (§2.E) fix this.

### C. The 14-day VP curve (§4, §7) — MEDIUM
No defined VP target or pacing curve. Without one, the game could be decided by day 4 (and 10 days feel pointless) or stay flat until a chaotic finale. The "double-turn days" (§4) are an undefined pacing lever.
- **Recommended default:** Author an explicit target curve (e.g., ~½ of total VP earnable in the back third via puzzle turn-ins and a double-turn finale day), so the race stays live to the end. Put double-turn days near the end as a deliberate catch-up window. The simulator should plot and verify this curve.

### D. Loot hierarchy incentives (§6) — MEDIUM
"Top-tier rewards reserved for puzzle turn-ins" only works if the **marginal VP per hour** of the puzzle path beats the tile-farming path. That ratio is unspecified and is exactly what the Reward/Loot Engine (module 3) auto-balances — but it needs a designer-set target ratio (Winds : Puzzles : Animals) and a stated **conversion rate** (how much VP a typical puzzle turn-in yields vs. a typical day of sailing). Without numbers, "incentivize the intended behavior" is unverifiable.
- **Recommended default:** Set puzzle-path VP/day at ~2–3× tile-path VP/day, so strategic teams clearly prefer puzzles but unlucky-with-Winds teams still progress by sailing.

---

## 4. AGE-APPROPRIATENESS / GM COGNITIVE LOAD

### A. Can one GM run 12 teams daily? — HIGH RISK as written
Per team, per visit, the GM must currently: read the declared direction, interpret the dice, **trace a skip-path across a 27×27 grid avoiding all previously-visited tiles**, find the landing tile, look up loot (with day modifier), possibly apply a *secret* rubber-band bump, hand out Winds/puzzles/cards, and accept puzzle turn-ins (validating the spent Winds match a solution). Times 12 teams, possibly ×2 on double-turn days. **The skip-path tracing on a 729-tile grid is the killer** — it is slow, error-prone, and the main source of disputes.
- **This is the strongest argument that the macro layer must be software-assisted at the table, not purely "printed binders" (§8).** A pure-paper GM cannot reliably trace skip-paths across a shared 729-tile visited-set for 12 teams. Reconsider the "entirely offline / printed" constraint (§8) at least for *live visited-tile tracking* — recommend a simple offline laptop/tablet "GM turn resolver" that holds the shared visited set and computes landing tiles. (This may justify a 6th tool, or extending module 1 into a live mode.)

### B. What must be precomputed/printed vs. decided live
- **Precompute & print:** the full 27×27 map with per-tile loot already resolved (so the GM reads a cell, never traces value); the per-day loot row pointer / global-modifier calendar; the day-exclusion/double-turn calendar; every puzzle *with its validated solution and required Wind multiset*; the TCG deck by VP tier; starting positions and starting pools.
- **Hard to precompute (depends on live shared state):** the **landing tile** (depends on which tiles are visited so far) and **rubber-band bumps** (depend on live standings). These are the two things a paper binder *cannot* fully precompute — hence the case for a live GM resolver (§4.A).
- **Decide live (keep minimal):** only standings-driven bumps — and per §2.E these should be auto-computed, not judged.

### C. Reading age / Polish output (§2)
All player-facing output Polish; the existing TCG generator already does this well (system prompt enforces simple language for 8–14). Apply the same bar to puzzle instructions and any tile/loot text. Puzzles must be visual-first (icons, arrows) so an 8-year-old and a 14-year-old can both engage — the "Ricochet Robot" mechanic (§5) is good for this if instructions are pictographic.

### D. Throughput / queueing
12 teams visiting one GM "daily" implies a morning queue. If each visit involves dice, path-tracing, lookups, and card handling, even 3 min/visit = 36+ min/day of pure GM table time, more on double-turn days, plus disputes. Plan an explicit station layout and consider a **second helper** or the live resolver to keep the line moving. This is an operational risk the design doc doesn't acknowledge.

---

## 5. OPEN DECISIONS (designer must answer before tooling) — with recommended defaults

| # | Decision | Recommended default |
|---|----------|---------------------|
| 1 | **Weather Dice model:** does the die override direction, or set distance with declared direction kept? (§1.D) | Declared direction stays; die sets distance. 4×Compass = move 3 unvisited tiles, Still = 1, Storm = 5. |
| 2 | **Grid-edge behavior** when a move overshoots the edge (§1.A) | Land on the furthest reachable unvisited tile within the grid; collect loot; never waste the turn. |
| 3 | **No-unvisited-tile-in-direction** handling (§1.B) | Re-declare a different direction; if none has any reachable unvisited tile, "becalmed" → fixed 1-Wind consolation. |
| 4 | **Does sailing cost Winds?** (§1.F) | No. Sailing is free; Winds are a pure puzzle currency. |
| 5 | **Are Winds directional or fungible?** (§1.G) | Fungible (1 Wind = 1 move, any direction). Eliminates the puzzle-soft-lock and simplifies the solvability proof. Keep directions as cosmetic flavor only. |
| 6 | **Starting state:** positions, Wind pool, VP, starting puzzle (§1.E, §1.H) | Teams seeded evenly around the perimeter facing inward; start with 6 Winds, 0 VP, no puzzle; early tiles guarantee Winds. |
| 7 | **Value gradient direction** vs. skip-rule push (§1.E, §4.3) | Highest loot toward the center; skip rule pushes outward — accept this tension as "early exploration is cheap, center is the prize," or invert. Decide explicitly. |
| 8 | **Loot index mapping:** how 1–6 base maps into the 15–20 row table (§1.J) | base value + day-based row pointer, clamped to max row. Print the resolved cell per tile. |
| 9 | **Day exclusions / double-turn days / global modifiers:** fixed schedule or live? (§1.K) | Fully pre-authored in a printable 14-day calendar. No live scheduling. |
| 10 | **Puzzle hand limit / turn-in pressure mechanism** (§1.I) | Max one unsolved puzzle held at a time; top-tier reward rolled only at turn-in. |
| 11 | **Puzzle-Wind guarantee:** is a held puzzle always solvable with obtainable Winds? (§1.G) | Yes — with fungible Winds (#5) and an early-game Wind floor (#6), any puzzle is solvable given enough Winds. |
| 12 | **Animal card assignment & deck exhaustion** (§1.L) | Deck in VP tiers; loot grants "next card in tier N"; on tier exhaustion, grant duplicate as VP-only token. |
| 13 | **Daily team turn order** (§2.A) | Fixed rotating order (rotate the lead team each day) to share first-mover advantage. |
| 14 | **Rubber-banding: discretionary or rule-based?** (§2.E, §3.B) | Rule-based: bottom-N teams get an auto modifier bump from the VP gap, computed by the Economy tool and printed daily. Drop visible "extra sail" discretion. |
| 15 | **Loot ratio & puzzle-vs-tile VP/day target** (§3.D) | Designer sets Winds:Puzzles:Animals ratio; puzzle path ≈ 2–3× tile path VP/day; tile VP share kept low. |
| 16 | **VP pacing curve target** (§3.C) | ~half of total VP earnable in the final third via puzzle turn-ins + a double-turn finale; keep race live to day 14. |
| 17 | **Live GM tooling at the table?** (§4.A, §8) | Add an offline "GM turn resolver" (live mode of module 1) that holds the shared visited set and computes landing tiles. Pure paper cannot trace skip-paths reliably. |
| 18 | **Grid size / moves vs. 12 teams** (§2.C) | Validate via simulator; if >50% teams hit becalmed before day 10, shrink to ~21×21 or reduce to 1 move/day except finale. |

---

## 6. IMPLICATIONS FOR EACH TOOL MODULE (§8)

- **Module 1 — Ocean Map Generator:** Blocked on decisions #1, #2, #3, #6, #7, #8, #13. Needs to additionally output a printable *resolved-loot* map and the 14-day calendar (#9). Strongly consider a **live resolver mode** (#17) — the most important architectural finding.
- **Module 2 — Puzzle Generator:** Blocked on #5, #10, #11. Fungible Winds make the "valid, solvable" guarantee tractable: solvability = "a path exists," not "a path exists using the team's specific directional cards." Must emit each puzzle's required Wind count and its pictographic Polish instructions.
- **Module 3 — Reward/Loot Engine:** Blocked on #4, #8, #12, #15. Needs designer-set ratios and the early Wind floor (#6) as constraints.
- **Module 4 — Economy Simulator:** Blocked on essentially **all** of §1 — it cannot model a single turn until #1, #2, #3, #6, #13, #14 are fixed. Its outputs (variance band §3.A, becalming day §2.C, VP curve §3.C) are how decisions #16/#18 get validated.
- **Module 5 — TCG Generator:** Already built and solid. Only needs #12: a VP-tier field (extend the existing 1–3 "moc" into a VP mapping) and tier-aware export so the Loot Engine can reference "next card in tier N."

---

## 7. ONE-LINE BOTTOM LINE
The theme and tool architecture are sound, but **the daily turn is described as intent, not as an algorithm.** Resolve the 18 open decisions (especially the Weather Dice model #1, edge/becalmed handling #2–3, fungible Winds #5, and rule-based rubber-banding #14), and seriously consider a live GM resolver #17 — then every tool becomes specifiable and the camp becomes runnable by one GM.
