# Ocean Rescue — Mechanics Reference (Authoritative Ruleset)

**Status:** Implementer + GM reference. Source of intent: `GAME.md`. Source of resolved
ambiguities: `docs/analysis/rules-review.md`.
**Language:** Internal reference in English (per `GAME.md` §2). Player-facing terms are given in
Polish alongside the English internal term; **all generated player output must be Polish**.
**Living doc:** Values written as `«placeholder»` are to be tuned by the Economy Simulator (module 4).
Every rule the design doc left silent/contradictory is resolved below and tagged **[DECISION]** with a
one-line rationale — these are adopted defaults the human designer can confirm or override.

---

## 1. Components & Glossary

| Internal (EN) | Player-facing (PL) | What it is |
|---|---|---|
| Ocean Map | Mapa Oceanu | A **26×26** grid (676 tiles). Coordinates are **letter-number** = column letter + row number: columns `A`…`Z` (26), rows `1`…`26`; top-left `A1`, bottom-right `Z26`. |
| Tile | Pole | One grid cell. A tile's **loot value is an intrinsic, STATIC, SECRET property** seeded once and never changing all game — the value *is* the tile (§6.2/§7). Visited/unvisited is tracked separately by stickers (permanent, global). |
| Weather Die | Kostka Pogody | Custom **d12** (12 faces): a WIP mix of Compass directions + Still + Storm; the **count of each face is to be tuned** by the simulator (see §4). |
| Wind | Wiatr (l.mn. Wiatry) | Consumable **directional** resource — **5 types**: Up/Down/Left/Right (Góra/Dół/Lewo/Prawo) + **Joker** (Dżoker — resolves to any one direction the team chooses when spending it). Granted by **drawing X random Wind tiles** and recording them on the team score card — see [DECISION D5]. Spent **only** to solve puzzles; plays **no role** in Ocean sailing. |
| Archipelago Map (Puzzle) | Mapa Archipelagu | A printed sliding ("Ice Cave" / Ricochet-Robot) puzzle, grid 5×5 to 8×8. **Indexed**; its reward is set by a per-map reward table (§6.3). Carries **no printed solution / required moves**. |
| Animal Card | Karta Zwierzęcia | A **unique** collectible animal (no duplicates), **all equal** — no face value, no better/worse cards. Saved into the shared Album. Organized by **category** (domestic / extinct / poisonous / …). |
| Rescue Points (score) | Punkty Ratunku (PR) | The **competitive** currency = a written running number. Earned from tiles + puzzle turn-ins; **capped per visit** (§6.4). Decides the winner. **Not** tied to cards. |
| Rescued Animals | Uratowane Zwierzęta | The **cooperative** currency = unique animal cards saved into the shared **Album**; **≤3 saved per visit**. Can run out harmlessly (never blocks Rescue Points). |
| Camp Animal Album | Album Zwierząt Obozu | Shared cooperative collection; camp-wide stretch goal is to complete it (every unique species); completing a **category** triggers a camp-wide milestone reward. |
| Turn | Tura | **One team's visit to the GM.** The fairness unit — **every team gets the same number of turns** (§3). A turn = one direction choice + one die roll + the resulting moves. |
| Sail / Move | Rejs / Ruch | One tile-step within a turn. A turn makes **up to X moves** (X ≈ 3, ± die/global), **stopping at and looting every unvisited tile** along the heading (§4). |
| Loot | Zdobycz / Łup | Reward granted at **each** unvisited tile a team stops on during its turn (§4/§7). |
| GM | Mistrz Gry (MG) | The single Game Master running the game. |

**Direction set (player-facing PL):** North = **Północ**, South = **Południe**, East = **Wschód**,
West = **Zachód**. Internal: `N / S / E / W`. Grid convention: `N` = row−, `S` = row+, `W` = col−,
`E` = col+.
**Diagonals (player-facing PL):** NE = **Północny-wschód**, NW = **Północny-zachód**, SE =
**Południowy-wschód**, SW = **Południowy-zachód**. Internal: `NE / NW / SE / SW` (a crosswind result —
see §4.0 — combines the declared cardinal with the rolled cardinal).

---

## 2. Setup / Starting State

### 2.1 Board & teams
- Ocean Map: **26×26** (676 tiles), all unvisited.
- 12 teams.

**[DECISION D6a — CONFIRMED by designer 2026-06-17] Teams CHOOSE their own starting position; tile loot
is seeded RANDOMLY across the map (no gradient).**
*Rationale:* designer wants player agency at setup and an un-telegraphed map; random seeding removes the
center-gradient assumption. (overrides the analysis perimeter-seed default, #6)
Concretely: in turn order (§3 / D13), each team picks any tile as its start; that tile becomes
**visited** and yields **no** loot. (GM may optionally enforce a minimum spacing between starts to
avoid clumping — `«spacing»` tunable.) Because loot is seeded randomly, there is **no** "sail toward the
center" pull; value is wherever the seed put it.

### 2.2 Starting pools
| Resource | Start value | Source |
|---|---|---|
| Winds | **6**, as a fixed **balanced** starter set (not a random draw) | [DECISION D6b] |
| Rescue Points | **0** | [DECISION D6b] |
| Held puzzles (Archipelago Maps) | **2** (starter pack) | [DECISION D6b] |

**[DECISION D6b — updated] Each team starts with 6 Winds, 0 Rescue Points, and a starter pack of 2
Archipelago Maps (puzzles).** The starting 6 Winds are a fixed balanced set (e.g. ↑↑↓←→ + 1 Joker — exact split
tunable), NOT a random draw, so no team is born unlucky.
*Rationale:* the 2 starter puzzles give the wind-juggling mechanic (D10) something to chew on from day 1;
a fair seed pool avoids day-1 draw unfairness. Tunable by the simulator. (rules-review §1.H, #6/#7)

**[DECISION D-loot-floor] Early Ocean tiles guarantee a Wind floor.**
*Rationale:* the Loot Engine must ensure teams can feed their starter puzzles; early tiles reliably
drop Winds. (rules-review §1.H)

### 2.3 Loot distribution
**[DECISION D7 — CONFIRMED: random seed, no gradient.] Tile values are distributed randomly across the
grid (seeded), not arranged in a center-high gradient.** Each tile's value is fixed and secret for the
whole game (§1 Tile, §6.2). *Rationale:* designer choice; exploration is genuine discovery, not a known
climb toward the middle. The Loot Engine controls the value *distribution* (how many high/low tiles),
not their *placement*, which is random. (overrides #7)

### 2.4 The 14-day calendar (living / GM-flexible)
**[DECISION D9 — CONFIRMED by designer 2026-06-17: LIVING calendar.] The calendar is a flexible plan,
not a fixed contract. The GM may add or move turns at short notice (e.g. announce an extra turn ~1h
before) depending on weather and other camp activities.**
*Rationale:* a real camp schedule shifts; the GM needs to slot game turns around weather and events.
(overrides the analysis "fully pre-authored" default, #9)

Implications:
- The printed calendar below is the **baseline plan**; the GM marks actual turns as they happen on the
  daily sheet (which day, how many turns).
- The **Economy Simulator must model a range** of total turns (e.g. 12–18), not a single fixed schedule,
  and report how sensitive the outcome is to ±turns — so the GM knows how much an extra turn swings things.
- Global loot modifiers are still planned per-day but the GM may shift them with the schedule.

Baseline plan (Economy Simulator tunes; shape per rules-review §3.C — keep catch-up windows late):

| Day | Type | Turns | Global loot modifier |
|---|---|---|---|
| 1 | Normal | 1 | +0 |
| 2 | Normal | 1 | +0 |
| 3 | Normal | 1 | +0 |
| 4 | Normal | 1 | +0 |
| 5 | Normal | 1 | +«2» |
| 6 | Normal | 1 | +«2» |
| 7 | **Excluded** | 0 | — |
| 8 | Normal | 1 | +«2» |
| 9 | Normal | 1 | +«3» |
| 10 | Normal | 1 | +«3» |
| 11 | **Excluded** | 0 | — |
| 12 | Normal | 1 | +«3» |
| 13 | Normal | 1 | +«4» |
| 14 | **Multi-turn (finale)** | 2 | +«4» |

*Excluded days:* no turns resolved (camp logistics days). *Multi-turn day:* the turn algorithm (§4)
runs twice in sequence for each team — **the same extra turn for every team** (equal-turns invariant,
§3). **[DECISION D16] Place multi-turn day(s) near the end as a deliberate catch-up window**, with ≈ half
of total Rescue Points earnable in the final third via puzzle turn-ins + the finale. *Rationale:* keeps
the race live to the last day. (rules-review §3.C, #16)

---

## 3. Turns, Sails & the Equal-Turns Invariant

**[DECISION D-turn — CONFIRMED by designer 2026-06-17] A *turn* is one team's visit to the GM (one
direction + one die roll). A *sail/move* is one tile-step inside that turn; a turn makes up to X moves.
The fairness unit is the TURN: every team must receive the SAME number of turns over the camp.**
*Rationale:* equal turns = equal GM visits = fair, regardless of how the living calendar (D9) shifts the
schedule. The *number of moves* inside a turn varies (die/global/rubber-band) and does NOT affect this
invariant — so a rubber-band "extra sail" is legal (it adds moves, not turns; §8).

- **Equal turns is a hard invariant.** If the GM adds an unplanned turn (living calendar), it must be
  granted to **all** teams before the camp ends. The **game ends after a fixed, equal turn count** — it
  is **never** ended by the deck or board running out (see §6.4 / §10).

**[DECISION D13] Fixed rotating turn order: rotate which team goes first each day.**
*Rationale:* skip/visited depends on what other teams already took, so order matters; rotation shares
the first-mover advantage evenly and is fully simulatable. (rules-review §2.A, #13)

- The GM resolves teams one at a time in the day's order. On day *d*, team `(d mod 12)` leads; the
  rest follow in fixed cyclic order.
- **[DECISION D-atomic] Tiles are claimed atomically in turn order.** Once any team stops on a tile it
  is visited for everyone for the rest of camp; no two teams ever share a tile. (rules-review §2.B)
- On a **multi-turn day**, resolve all teams' first turn in order, then all teams' second turn in order
  (round-by-round) — preserving equal turns.

---

## 4. The Daily Turn — Resolvable Algorithm

Run this per team, per turn. It is deterministic given the declared direction and the die result.

### 4.0 Weather Die semantics

**[DECISION D1 — CONFIRMED by designer 2026-06-17] The declared direction always anchors the sail; the
rolled compass face modifies it RELATIVE to the declaration — changing distance and, on a crosswind,
bending the heading diagonally.** The die never fully overrides the declared direction (the declared
cardinal always contributes to the heading), but it is mechanically meaningful on every face.
*Rationale:* preserves player agency over heading while making the roll matter every turn — a tailwind
carries you far, a headwind stalls you, a crosswind pushes you off-course diagonally. (rules-review §1.D, #1)

**The die is a d12 (12 faces); the count of each face type is WIP** and will be tuned by the simulator
(e.g. how many of the 12 faces are each compass direction vs. Still vs. Storm sets the probability of
tailwind/headwind/crosswind/calm/storm). The *relationship* below is what each face means, independent
of how many faces carry it.

**Base move count `X = «3»`.** The die (and global rules) shift X by `±`, and a crosswind also bends the
heading diagonally. The team makes **up to X moves**, **stopping at and looting EVERY unvisited tile**
along the heading (not just the last one — see §4.1). Let `D` = declared cardinal, `F` = rolled face:

| Rolled face `F` | Relationship to `D` | PL | Heading | Moves `X` (unvisited tiles, each looted) | Loot modifier (per tile) |
|---|---|---|---|---|---|
| Compass = `D` | Tailwind (wiatr w plecy) | Kompas zgodny | straight in `D` | **«4»** (base +1) | +0 |
| Compass = opposite(`D`) | Headwind (wiatr w twarz) | Kompas przeciwny | straight in `D` | **«2»** (base −1) | +0 |
| Compass ⊥ `D` (either perpendicular) | Crosswind (wiatr boczny) | Kompas boczny | **diagonal** `D`+`F` | **«3»** (base) | +0 |
| Still | — | Cisza | straight in `D` | **«2»** | **+«2»** |
| Storm | — | Sztorm | straight in `D` | **«4»** | **−«1»** |

Global rules may further shift X (e.g. "+1 move from Day 5"). With a d12, several faces may map to the
same compass direction; the **relationship** — not the face count — determines the result. Face counts
are the simulator's lever on luck-vs-strategy variance.

> **Worked examples (loot at every tile).** Declared `E`, rolled `E` (tailwind, X=4): the ship stops on
> the next **4 unvisited** tiles east, **looting each of the 4** and marking them visited. Declared `E`,
> rolled `S` (crosswind, X=3): stops on 3 unvisited tiles **SE diagonally**, looting each. Declared `N`,
> rolled Storm (X=4): 4 tiles north, **each tile's loot −1**. Declared `N`, rolled Still (X=2): 2 tiles
> north, **each tile's loot +2**.
>
> All numbers (base X=3, ±, Storm/Still mods) are **«placeholders» for the Economy Simulator** — the
> *structure* is fixed, the *numbers* are not. Note loot-per-tile means a turn yields up to X rewards,
> so the per-visit Rescue-Point cap (§6.4) does real work.

### 4.1 Step-by-step

```
TURN(team, declaredDir, dieResult):
  1. DECLARE      team names a cardinal direction: N / S / E / W
  2. ROLL DIE     (heading, X, lootMod) := faceToVector(declaredDir, dieResult)   # see 4.0 table
                  # heading cardinal, or diagonal on a crosswind; X = move count; lootMod per-tile

  3. SAIL & LOOT EVERY TILE  (one continuous run of up to X moves)
       stops := SAIL_STOPS(team.pos, heading, X)   # list of up to X unvisited tiles, in order
       for each tile in stops:
           mark tile VISITED (global, atomic)
           value := lookup STATIC SECRET value of tile (see 7)
           reward := resolve(value + lootMod + todays GLOBAL modifier + rubber-band)   # 6.2 / 8
           grant reward to team; GM announces it     # read off the SECRET table, see 11
       move team.pos -> last tile in stops

  4. (scoring of granted rewards -> Rescue Points / Winds / cards / puzzles, capped per visit: see 6.4)
```

`SAIL_STOPS(pos, heading, X)` — the ship steps along the heading, **jumping over visited tiles** (D9),
**stopping on each unvisited tile**, and **ricocheting off walls** so the run always reaches X stops
(D2). Returns the ordered list of the (up to) X unvisited tiles it stops on — **each of which is
looted**.

```
stops := []
cur := pos
while length(stops) < X:
    next := cur + unitStep(heading)
    if next is OFF-GRID:                 # would leave the 26×26 board
        heading := REFLECT(heading, wall)   # bounce: cardinal reverses; diagonal mirrors off the wall
        continue                            # do not count this step
    cur := next
    if cur is UNVISITED:                 # visited tiles are JUMPED OVER, not counted (D9)
        stops.append(cur)                # STOP here and loot it
return stops
```

`REFLECT(heading, wall)`:
- **Cardinal into a wall** (e.g. `E` hits the east edge) → reverse to the opposite cardinal (`W`): the
  ship bounces straight back.
- **Diagonal into one wall** (e.g. `SE` hits the east edge) → mirror the horizontal component (`SE`→`SW`);
  hitting the south edge mirrors the vertical component (`SE`→`NE`). Standard billiard ricochet.
- **Diagonal into a corner** → mirror both components (reverse the diagonal).

### 4.2 Edge & skip handling (canonical order)

**[DECISION D2 — CONFIRMED by designer 2026-06-17: CONTINUOUS / RICOCHET, no Becalmed.] A sail ALWAYS
delivers its full distance of unvisited tiles. At a grid wall the ship bounces (ricochets) or runs along
the edge so the move never stops short; visited tiles are jumped over. A team is therefore NEVER stuck —
there is no Becalmed state. The daily number of moves is the same for everyone (whatever the die gives,
fully realized).**
*Rationale:* designer wants movement to always be continuous and complete; removes off-map soft-locks
and the dead-turn problem entirely. (overrides the earlier "land on furthest reachable / Becalmed"
defaults, #2/#3)

Canonical resolution order (implement once, everywhere): 1. resolve heading + X from (declaredDir,
dieFace, global) → 2. step along the heading (diagonal = both axes) → 3. **stop on and loot each
unvisited tile**, jumping visited ones → 4. on hitting a wall, **reflect** the heading and keep going →
5. end after X stops; the last stop is the team's new position.

> **Termination caveat [simulator must verify]:** continuous reflection always terminates **as long as
> ≥ X unvisited tiles remain reachable on the board**. In extreme late game the board could fill below
> daily demand; the simulator must confirm the board never starves (and the GM may cap a turn at the
> tiles available if literally fewer than X unvisited tiles remain). The board never ends the game —
> only the equal turn count does (§3). See §10.

### 4.3 Worked examples (every stop is looted)
- *Tailwind:* declared `E`, rolled `E` (X=4) → stop on + loot the next 4 unvisited tiles east.
- *Headwind:* declared `E`, rolled `W` (X=2) → stop on + loot 2 unvisited tiles east (you fight the wind).
- *Crosswind diagonal:* declared `E`, rolled `S` (X=3) → stop on + loot 3 unvisited tiles **SE**, jumping visited.
- *Bounce (cardinal):* 2 tiles from the E edge, declared `E`, tailwind (X=4): loots 2 going east, hits
  the wall, reflects to `W`, loots 2 more going west → 4 tiles looted. Full move delivered.
- *Bounce (diagonal):* `SE` hits the east edge after 1 stop → reflects to `SW`, keeps stopping/looting until X met.
- *Storm:* declared `N`, Storm (X=4) → 4 tiles north, **each** tile's loot **−1**.
- *Still:* declared `N`, Still (X=2) → 2 tiles north, **each** tile's loot **+2**.
- *Skip:* next 2 tiles visited, then unvisited → jumps the 2, resumes stopping/looting on unvisited tiles (D9).

---

## 5. Wind Economy & Archipelago Puzzles

### 5.1 Does sailing cost Winds?
**[DECISION D4] No. Sailing the Ocean Map is FREE. Winds are exclusively the puzzle-solving currency.**
*Rationale:* removes the macro-layer progression soft-lock; a team with 0 Winds can still explore.
(rules-review §1.F, #4)

### 5.2 Wind types & how they are gained
**[DECISION D5 — CONFIRMED by designer 2026-06-17: DIRECTIONAL + JOKER, drawn randomly.] Winds are
DIRECTIONAL with FIVE types: Up / Down / Left / Right + **Joker**. When loot grants "X Winds", the team
draws **X random Wind tiles** from the Wind pool and records each drawn type on its score card. To solve
a puzzle the team spends specific directional Winds; a **Joker resolves to any one direction the team
chooses at the moment of spending it.**
*Rationale:* directional draw gives tactile tension; the Joker is a pressure valve that softens bad
draws and powers the "juggle winds between puzzles" mechanic (D10). (rules-review §1.G, #5 — overridden)

Implications the tooling must honor:
- The reward table specifies a **count** ("draw «3» Winds"); the **draw** (random type, incl. Joker) is
  resolved at the table. The Loot Engine sets the draw-pool distribution over the 5 types (incl. how
  rare Jokers are).
- Score card has a running **Wind tally per type** (↑ / ↓ / ← / → / ★Joker) that teams stroke on draw
  and cross off on spend.
- A Joker spent on a puzzle is declared as a concrete direction for that move.

### 5.3 Puzzle model, cost, solvability, turn-in
- **Movement:** Ice-Cave / Ricochet-Robot — the ship slides continuously in a chosen direction until
  it hits an obstacle, wall, or pause tile. Instructions must be **pictographic** (arrows/icons) so an
  8-year-old and a 14-year-old both engage.
- **[DECISION D11 — CONFIRMED: NO solution / required moves printed on the map.] Archipelago Maps carry
  NO printed solution and NO required-Wind list.** Teams **figure out the path themselves** and spend the
  directional Winds (incl. Jokers) they actually use as they go; spent Winds are crossed off the score
  card / returned to the GM.
  *Rationale:* the puzzle *is* the challenge — pre-printing the moves would give it away. (overrides the
  earlier "print the required multiset" idea, #11)
- **Solvability:** the Puzzle Generator still only emits maps with a **validated finite solution** (it
  knows the solution internally for the GM key, §6.3 / tooling), but that solution is **not shown to
  players**. The internal solution length/Wind mix feeds the reward index (D-puzzle-reward).
- **[DECISION D10 — CONFIRMED: NO hold limit; juggling Winds across multiple puzzles is the MAIN
  mechanic.] A team may hold any number of Archipelago Maps at once and turn in any number, any visit.**
  There is no cap on puzzles held or handed back.
  *Rationale:* the designer's core loop is **managing a scarce, directional Wind supply across several
  open puzzles** — deciding which to finish, which to stall, where to spend a Joker. A hold limit would
  kill that. (overrides the earlier one-puzzle-at-a-time default, #12)
  > **RESOLVED:** the hoard-and-dump risk is handled not by a hold limit but by the **per-visit
  > Rescue-Point cap** (§6.4 D-rpcap): hold and turn in unlimited maps, but RP banked per visit is capped
  > (overflow lost, Winds kept). This preserves the wind-juggling while smoothing score spikes and
  > throttling leaders. Simulator tunes `RP_max`.
- **Turn-in:** a team returns a solved map during any daily visit; the GM checks the map is genuinely
  solved (using the GM solution key) and grants that map's indexed reward (§6.3).

### 5.4 No Becalmed state (movement is always continuous)
**[DECISION D3 — SUPERSEDED by D2.] There is no Becalmed state. Per D2 (§4.2), movement always delivers
its full distance by ricocheting off walls and jumping visited tiles, so a team can never be stuck on
the Ocean Map.** (The earlier "Becalmed → draw 1 Wind" consolation is removed.)

---

## 6. Economy & Scoring

### 6.1 Loot hierarchy
- **Tile exploration** (every stop, §4) yields mostly **Winds and Archipelago Maps**, plus some
  **Rescue Points**.
- **Puzzle turn-in** yields the **top tier**: major **Rescue Points**, **Rescued Animals** (cards), bonus
  Winds, harder puzzles.

**[DECISION D-hoard] Tile loot skews toward Winds/puzzles (inputs); most Rescue Points are reserved for
puzzle turn-ins.** *Rationale:* keeps the intended puzzle path the dominant scoring route. "Tile RP
share" is a low tunable in the Loot Engine. (rules-review §2.D)

### 6.2 Tile value & loot resolution
**[DECISION D8 — CONFIRMED by designer 2026-06-17: STATIC SECRET tile value + LIVE global modifier.]
Each tile has one **static, secret value** seeded once for the whole game. The printed Ocean Map is just
a **plain square grid** (no values, no glyphs); the tile values live in a **separate GM-only lookup table
with UNCHANGEABLE values**. The GM resolves loot live as: `tileValue (static)` → `+ dieLootMod` →
`+ global day modifier (applied LIVE by the GM)`.**
*Rationale:* designer wants a clean printed grid players can read for position only, fixed secret values
the GM looks up, and the day's global modifier applied by the GM at the table — not baked into a
per-day printed cell. (overrides the earlier precomputed-per-day-cell model, #2/#10/#8)
- **Static tile value** → indexes the unchangeable loot table to a concrete base reward
  (Winds / Archipelago Map / Animal Card / minor Rescue Points).
- **`dieLootMod`** = **−«1»** Storm / **+«2»** Still / +0 otherwise (§4.0, D1) — GM applies live.
- **Global day modifier** (§2.4) — GM applies live from the calendar (no longer pre-baked; D9 living
  calendar means the GM may shift it).
- So the GM does a 3-part add at the table off two printed references (the static value table + the
  day's modifier); the grid map itself never shows numbers.

### 6.3 Puzzle rewards (indexed per map)
**[DECISION D-puzzle-reward — CONFIRMED: each Archipelago Map is INDEXED; reward comes from a separate
per-map reward lookup table, with smaller/easier maps giving lower rewards.] Every puzzle carries an
index; turn-in grants the reward the puzzle-reward table assigns to that index.**
*Rationale:* designer wants reward tied to the specific map's difficulty/size, not a flat puzzle bonus.
(overrides the earlier "puzzle-path ≈ 2–3× tile-path" framing, #13)
- Reward **scales with difficulty/size**: smaller/easier maps → lower reward; larger/harder → higher.
- **[SIMULATOR PLACEHOLDER]** how reward is distributed across the index (the designer described a
  **normal distribution** shape — mean/spread TBD) and the exact difficulty→reward curve are tuned by
  the Economy Simulator. The Puzzle Generator emits each map's difficulty metrics (size, solution
  length, Wind mix) so the reward table can be derived consistently.

### 6.4 Scoring — two decoupled currencies (CONFIRMED 2026-06-17)

**[DECISION D-score] Competitive score and the animal collection are SEPARATE currencies.**

**(1) Rescue Points (Punkty Ratunku) — the competitive score.**
- A plain **written running number**; the team with the most at camp end wins. Earned from tile stops +
  puzzle turn-ins.
- **[DECISION D-rpcap] Capped per visit.** A team may bank at most **«RP_max»** Rescue Points per turn
  (visit). *You may still turn in unlimited puzzles* (D10) — but RP gained beyond the cap that visit is
  **lost**, while the **Winds and other resources from those turn-ins are kept**. *Rationale:* this both
  tames hoard-and-dump RP spikes **and** slows early runaway leaders (a built-in catch-up throttle), while
  letting a wind-starved team "risk it" — dump puzzles for Winds even if RP overflows. (#12, ii+iii)
- Never blocked by anything (it's just a number) — so the game always stays fair across equal turns.

**(2) Rescued Animals (Uratowane Zwierzęta) — the cooperative collection.**
- **[DECISION D12 — CONFIRMED: unique, FLAT cards.]** Every animal is **unique** (no duplicates) and
  **all equal — no face value, no better/worse cards.** Saved into the shared **Album**, organized by
  **category** (domestic / extinct / poisonous / …).
- **[DECISION D-savecap] A team may save at most «3» animals per visit** into the Album. Choosing which
  animals (to fill Album/category gaps) is the cooperative decision.
- **Running out is harmless:** if no card is left to save, the team simply saves none that visit — its
  Rescue Points are unaffected. **The deck NEVER ends the game** (§3: only the equal turn count does).
- **[DECISION D-deck] Deck size is a cooperative target**, tuned so the Album is *completable but not
  trivial* over the camp; the simulator sizes it against `12 teams × «3»/visit × turns`.
- **[DECISION D-milestone] Completing a category triggers a camp-wide milestone reward** (celebration
  and/or a small shared Wind/RP bonus — exact reward TBD). Reinforces the collective goal.

> **Why decoupled (and not "score = animals"):** because **equal turns** (§3) forbid ending the game when
> the last card is drawn — a card-bound score would short every team yet to take its turn. Rescue Points
> being a free-standing number keeps scoring fair regardless of deck state. (This is what your
> equal-turns constraint forces, and it is now locked.)

---

## 7. Print contract (what the generator outputs)

Two separate printed artifacts (per D8/D10/§11):
1. **The A1 Ocean Map** — a **plain square grid** with letter-number coordinates (§1). **No values, no
   glyphs.** It shows only position; visited tiles get stickers during camp.
2. **The GM-only secret value table** — for each tile coordinate, its **static, unchangeable** seeded
   value and the concrete base reward it indexes (Winds / Archipelago Map / Animal Card / minor Rescue Points).
   Players never see it.

What the GM resolves **live** at the table (cannot be on a printed cell):
- **Which tile a team lands on** — from the physical sticker/visited-set (§11).
- **`dieLootMod`** (Storm −«1» / Still +«2», §4.0/§6.2).
- **The global day modifier** — applied live from the (living, D9) calendar.
- **Rubber-band** baseline + override (§8).

So loot = `static tileValue (looked up)` `+ dieLootMod` `+ globalModifier` `+ rubberBand`, all added by
the GM. The map shows no numbers; the value table is fixed; only the modifiers move.

---

## 8. Catch-up / Rubber-Banding (rule-based)

**[DECISION D14 — CONFIRMED by designer 2026-06-17: HYBRID] Rubber-banding has a RULE-BASED printed
baseline PLUS a bounded GM discretionary override for edge cases.** The automatic, gap-derived bump is
the default and does the heavy lifting (reproducible, dispute-proof, simulatable); the GM retains a
small, logged override for situations the formula can't see (a team that lost a day to illness, an
obvious morale problem).
*Rationale:* the rule-based baseline keeps fairness perception and simulation intact while a narrow
override preserves the GM's ability to keep the camp fun. Kept bounded so it can't be sandbagged into.
(rules-review §2.E / §3.B, #14; designer chose Hybrid over pure rule-based)

**Baseline (automatic, printed — placeholder formula, simulator to tune):**
- Let `gap = leaderRP − teamRP` (Rescue Points). Bottom **«4»** teams by RP get
  `bump = min(«+3», floor(gap / «10»))` added to their loot resolution that day. Printed on the GM daily
  sheet, not judged.

**Override (discretionary, bounded, logged):**
- The GM may apply, to a single team per day, at most **«+2»** extra loot bump **and/or one extra sail**
  (extra MOVES inside the turn — never an extra turn, so the equal-turns invariant §3 holds), and **must
  note it** on the GM sheet.
- Caps keep it from dominating the baseline; logging keeps it auditable. Not secret from the GM's own
  records, though it need not be announced to teams.

> Note: the per-visit **Rescue-Point cap** (§6.4 D-rpcap) already provides strong automatic catch-up by
> throttling leaders — so rubber-banding here is a secondary, fine-tuning tool.

Target band the simulator should keep within: leader RP ≤ **«1.6×»** the median RP. (rules-review §3.A)

---

## 9. Edge Cases & Rulings (GM quick-consult)

| Situation | Ruling |
|---|---|
| Move reaches the grid edge | Ship **ricochets** (cardinal reverses, diagonal mirrors) and keeps stopping/looting unvisited tiles until X stops delivered. Never off-grid, never short. (D2) |
| Heading passes over visited tiles | Jump over them — they don't count as a stop. Stop & loot only unvisited tiles. (D9) |
| Team seems "stuck" / no move | Cannot happen: movement is always continuous (D2). No Becalmed state. |
| Loot per turn | A turn loots **every** unvisited tile it stops on (up to X), not just the last. (§4) |
| Two teams want the same tile | Resolved by turn order; tile claimed atomically, visited for everyone after. No sharing. (D-atomic) |
| Team has 0 Winds | They can still sail (sailing is free, D4); just can't make puzzle progress until they draw Winds. |
| Team holds puzzles but lacks the right **directional** Winds | Keep sailing to draw more random Winds; a **Joker** fills any single direction (D5). Juggle Winds across held maps (D10). |
| How many puzzles can a team hold / turn in? | **No limit** on either — but Rescue Points banked per visit are **capped** (§6.4 D-rpcap); overflow RP is lost, Winds kept. |
| Spending a Joker Wind | Declared as a concrete direction at the moment of use. (D5) |
| Still face | X=«2» straight; **each** looted tile **+«2»**. (D1) |
| Storm face | X=«4» straight; **each** looted tile **−«1»**. (D1) |
| Deck of animals runs out | Harmless — team saves no animal that visit; Rescue Points unaffected; game does NOT end. (§6.4, §3) |
| Album category completed | Camp-wide milestone reward triggers. (§6.4 D-milestone) |
| Score cap vs hoarding | Unlimited puzzle turn-ins allowed, but **≤«RP_max» Rescue Points/visit** and **≤«3» animals/visit**. (§6.4) |
| GM adds an unplanned turn | Allowed (living calendar D9) **but must be given to ALL teams** — equal turns is a hard invariant. (§3) |
| Loot value dispute | GM reads the static value from the secret table + live modifiers (die/global/rubber-band). Static values never change. (D8/§7) |

---

## 10. Open / To-Tune (placeholders for the Economy Simulator)

- **Weather d12 face counts** — how many of the 12 faces are each compass dir / Still / Storm (sets
  tailwind/headwind/crosswind/calm/storm odds, the main luck-vs-strategy lever).
- **Base move count `X` = «3»** and its modifiers — tailwind «+1» / headwind «−1» / crosswind «0»(diag)
  / Storm «4» / Still «2»; Storm/Still per-tile loot mods (−«1»/+«2»); any global X shifts.
- **Setup** — starting Winds («6» fixed balanced split, incl. Joker count), starter puzzles («2»),
  start-position spacing rule.
- **Wind draw pool** — distribution over the 5 types incl. **Joker rarity** (D5).
- **Living calendar** — model a **turn-count range** (e.g. «12–18») and outcome sensitivity to ±turns;
  global-modifier curve; **equal turns enforced** (D9/§3).
- **Tile value distribution** — how many high/low static values across the **676** tiles (placement
  random; only the distribution is tuned) (D8). Loot-per-tile (§4) means a turn yields up to X rewards —
  size accordingly.
- **Puzzle-reward table** — difficulty→reward curve and the **normal-distribution** shape across the
  index; smaller/easier = lower (D-puzzle-reward).
- **Rescue-Point cap per visit `RP_max`** — set so hoard-and-dump can't spike the score and leaders are
  throttled, without strangling normal play (D-rpcap).
- **Animals/visit cap** («3») and **deck size** — Album completable-but-not-trivial over the camp
  (D-savecap/D-deck). **Category milestone reward** value (D-milestone).
- **Rubber-band** — bottom-N («4»), baseline cap («+3»), gap divisor («10»), override cap («+2»/1 sail),
  target band («1.6×» median RP).
- **Board starvation** — confirm ≥ X unvisited tiles always remain so continuous movement (D2) never has
  to be capped; if tight, shrink grid or trim turns (rules-review §2.C/#18).
- **Capacity fixed vs upgradeable** — default fixed «3» animals + X moves; test whether late-game
  capacity upgrades are safe (don't re-open runaway leaders).

---

## 11. Physical Table Setup (no live tooling — confirmed)

**[DECISION D17 — CONFIRMED by designer 2026-06-17: PURE PAPER, REJECT live resolver.] The shared
visited-set lives on a physical board, not a screen. GAME.md §8 stands: tooling runs only before camp.**

The table apparatus:
- **A1 printed Ocean Map** is the master prop and single source of truth for the shared visited-set. It
  is a **plain square grid** with letter-number coordinates — **no values printed on it** (D8/§7).
- **Stickers** mark visited tiles as teams land. The sticker layer *is* the global visited state,
  visible to all, so skip/ricochet paths are traced **by eye on the big map**. (Resolves the cognitive
  -load risk physically, no screen.)
- **GM-only secret value table** (in the GM binder, never shown) gives each tile's **static** value; the
  GM adds the live modifiers (die/global/rubber-band, §6.2) and **announces the resolved reward**.
  Players never see the table, preserving discovery.
*Rationale:* plain grid + stickers make position and visited-state self-evident and dispute-proof; the
fixed secret value table + live GM modifiers keep loot off the printed map. Fully offline per `GAME.md`
§8. (supersedes the analysis's #17 resolver recommendation)

> Tooling implication: the Ocean Map Generator runs **pre-camp** to print (1) the plain A1 grid map and
> (2) the secret static value table. There is **no** live/at-the-table software. The Economy Simulator
> (module 4) is the only consumer of the full turn logic; the GM consumes paper.
