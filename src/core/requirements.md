# requirements.md — Phase 1: The Shared Engine (`/src/core`)

**You are the implementation agent for Phase 1.** This file is your strict, complete system prompt.
Build exactly what is specified here — no more, no less. Every later module (Loot Engine, Map Gen,
Puzzle Gen, Economy Simulator) depends on the exact logic you produce. If the engine is wrong, every
printed binder is wrong.

**Authoritative source of truth:** `docs/mechanics.md`. Where any other doc disagrees with it,
mechanics wins. This file restates the mechanics as an implementable contract; if you find a genuine
contradiction between this file and `docs/mechanics.md`, STOP and flag it — do not guess.

---

## 0. Scope, non-goals, and the one-consumer rule

### 0.1 What `/src/core` IS
A single, dependency-free, deterministic JavaScript module (`core.js`) that provides:
1. A **seeded PRNG** (reproducible: one seed → one identical game forever).
2. The **`game.json` data schema** + a **validator** for it.
3. Pure geometry/턴 helpers (coordinate math, reflection, sail-stop computation).
4. The single canonical **`resolveTurn()`** function implementing loot-every-unvisited-stop continuous
   ricochet movement.
5. Thin scoring helpers that apply the two per-visit caps.

### 0.2 What `/src/core` IS NOT (non-goals — do not build here)
- **No UI, no DOM, no HTML, no CSS, no PDF, no Polish strings.** Core is pure logic with **English**
  identifiers. (Player-facing Polish is a Phase 2+ rendering concern.)
- **No loot-table balancing** (Phase 2 / Loot Engine owns ratios, Wind pool, `rpMax` *values*).
- **No map seeding policy** (Phase 3 / Map Gen decides the value *distribution*; core only consumes a
  finished `secretValues` table).
- **No puzzle generation / BFS solver** (Phase 3 / Puzzle Gen). Core treats puzzles as opaque indexed
  rewards.
- **No Monte-Carlo loop** (Phase 4 / Simulator drives `resolveTurn` thousands of times; core just
  provides the one-turn primitive).
- **No live/at-the-table mode.** There is none, ever (`docs/mechanics.md` §11).

### 0.3 The one-consumer rule
`resolveTurn` has **exactly one runtime caller: the Economy Simulator (Phase 4).** The GM never runs it;
the camp is pure paper. Design the API for batch simulation (cheap to call millions of times, no I/O, no
globals), not for interactive use.

### 0.4 Environment & style
- **Plain ES modules, no build step, no npm runtime deps.** It must load in a static `<script type="module">`
  page (like `tcg_generator/index.html`) AND in a headless test runner.
- Target evergreen browsers. You may use a tiny dev-only test harness, but `core.js` itself ships zero deps.
- All identifiers, comments, and JSON keys: **English**. Match the existing repo's plain-JS, vanilla style.
- **Determinism is sacred.** No `Math.random`, no `Date.now`, no iteration over unordered `Object` keys in
  a way that affects results, no floating-point accumulation where integers suffice.

---

## 1. Coordinate system & invariants (lock these first)

- Grid is **26×26 = 676 tiles**. Columns are letters `A`…`Z` (index 0…25), rows are numbers `1`…`26`
  (index 0…25). Top-left = `A1` = `{col:0,row:0}`. Bottom-right = `Z26` = `{col:25,row:25}`.
- **Coordinate string ⇄ index** helpers are mandatory and must round-trip exactly:
  - `parseCoord("K07") → {col:10,row:6}` (K = 11th letter = index 10; row 7 = index 6).
  - `formatCoord({col:10,row:6}) → "K7"`. **Canonical output has NO leading zero** (`"K7"`, not `"K07"`).
    Accept zero-padded input on parse; never emit padding. Document this once.
- Internal cardinal vectors (`row−` = North):
  | Dir | `dcol` | `drow` |
  |---|---|---|
  | `N` |  0 | −1 |
  | `S` |  0 | +1 |
  | `E` | +1 |  0 |
  | `W` | −1 |  0 |
- Diagonals are the sum of two cardinals: `NE`,`NW`,`SE`,`SW` with the obvious `±1,±1` vectors.
- `opposite(N)=S`, `opposite(E)=W`, etc. `perpendiculars(N)=[E,W]`, `perpendiculars(E)=[N,S]`, etc.

---

## 2. Seeded PRNG (deterministic core)

- Implement a small, well-known, **seedable** PRNG (recommend **mulberry32** or **sfc32** seeded via a
  string-hash like xmur3). No external libs.
- API:
  ```js
  const rng = makeRng(seed);   // seed: number | string
  rng.next();                  // float in [0,1)
  rng.int(nExclusive);         // integer in [0, n)
  rng.pick(array);             // uniform element
  rng.weighted(entries);       // entries: [{item, weight}, ...] → item
  rng.fork(label);             // a NEW independent stream, deterministically derived from (seed,label)
  ```
- **`fork` is required** so independent concerns (weather rolls vs Wind draws vs map seeding) don't
  entangle: changing the number of Wind draws must not shift the weather sequence. The simulator forks
  one stream per team and per concern.
- Same `(seed, call sequence)` → identical outputs across runs, machines, and browsers. Add a test that
  pins the first 10 outputs of a known seed to literal expected values (regression lock).

---

## 3. `game.json` schema + validator

Core owns the **schema definition and a `validateGame(game)` function**. It does **not** author the data
(other modules do). The schema is the contract in `docs/design/gm-tools-ux.md` §4 — reproduce it faithfully.

### 3.1 Required top-level shape (English keys)
```jsonc
{
  "seed": 1337,
  "config": {
    "gridSize": 26,                 // MUST be 26 (validate, but keep the field general)
    "teams": 12,
    "startStrategy": "team-chosen", // D6a
    "valuePlacement": "random",     // D7
    "die": "d12",
    "lootEveryStop": true,          // §4 — must be true; reject false
    "weatherModel": {               // §4.0; base X=3. ALL X and lootMod are tunable placeholders.
      "tailwind":  { "X": 4, "heading": "straight", "lootMod": 0 },
      "headwind":  { "X": 2, "heading": "straight", "lootMod": 0 },
      "crosswind": { "X": 3, "heading": "diagonal", "lootMod": 0 },
      "storm":     { "X": 4, "heading": "straight", "lootMod": -1 },
      "still":     { "X": 2, "heading": "straight", "lootMod": 2 }
    },
    "dieFaces": [                   // EXACTLY 12 entries; the d12 face map (counts are the sim's luck lever)
      // each entry: one of {"type":"compass"} | {"type":"still"} | {"type":"storm"}
      // "compass" faces carry NO baked direction — the rolled compass is itself a direction (see 4.2)
    ],
    "edgeRule": "ricochet",         // continuous, always deliver X, jump visited, no becalmed (D2/D9)
    "turnOrder": "fixed-rotating",  // D13
    "equalTurns": true,             // hard invariant (§3)
    "sailingCostsWinds": false,     // D4
    "winds": {
      "types": ["up","down","left","right","joker"],
      "directional": true,
      "pool": { "up":0.22,"down":0.22,"left":0.22,"right":0.22,"joker":0.12 } // must sum to 1±epsilon
    },
    "startState": { "winds": "balanced-6", "rescuePoints": 0, "puzzles": 2 },
    "puzzleHoldLimit": null,        // D10 — unlimited; null only
    "scoring": {
      "rescuePoints":   { "rpMaxPerVisit": 8 },          // D-rpcap (placeholder)
      "rescuedAnimals": { "perVisitCap": 3, "flat": true, "byCategory": true }
    }
  },
  "calendar": {
    "baseline": [ { "day": 1, "excluded": false, "turns": 1, "globalMod": 0 }, ... ],
    "turnRange": [12, 18]
  },
  "rubberBand": {
    "baseline": { "rule": "bottom-N-gap-bump", "n": 4, "bumpCap": 3, "gapDiv": 10 },
    "override": { "maxBump": 2, "extraSailAllowed": true, "mustLog": true }
  },
  "lootTable": [ { "value": 1, "reward": { "kind": "winds", "n": 1 } }, ... ],
  "map":   { "secretValues": [ { "coord": "K7", "value": 2, "reward": {"kind":"winds","n":2} }, ... ] },
  "puzzles": [ { "id":"Z-014","index":37,"difficulty":{"len":4,"size":7},
                 "ship":"B2","goal":"F4","solution":["U","L","U","R"],"rewardIndex":37 }, ... ],
  "puzzleRewardCurve": { "shape": "normal", "min": "low(easy)", "max": "high(hard)" },
  "deck": { "domowe": [...], "wymarle": [...], "jadowite": [...] },
  "milestones": [ { "category": "wymarle", "reward": "..." } ]
}
```
> **No `live`/mutable section exists** — the visited-set is physical (stickers). The simulator holds its
> own ephemeral state object (§5.1); it is **never** serialized back into `game.json`.

### 3.2 `validateGame(game)` must hard-fail (throw with a precise message) on:
- `config.gridSize !== 26`, `teams !== 12` (warn-only is acceptable for teams if you prefer; gridSize is hard).
- `lootEveryStop !== true` or `edgeRule !== "ricochet"` or `equalTurns !== true` — these encode locked
  decisions; a game with them off is not Ocean Rescue.
- `dieFaces.length !== 12`, or any face not in `{compass, still, storm}`.
- `winds.pool` not summing to 1 (±1e-6), or types not exactly the 5 listed.
- Any `lootTable` reward of `kind:"puzzle"` whose resolved index has no matching `puzzles[].index`.
- Any `secretValues[].coord` that fails `parseCoord` or lies off-grid, or duplicate coords.
- `rpMaxPerVisit < 0`, `perVisitCap < 0`.
- Reward `kind` not in the closed set (§4.5).

`validateGame` returns `{ ok: true }` or throws `GameValidationError(message, path)`. Provide a
non-throwing `lintGame(game) → string[]` for soft warnings (e.g. Wind pool skew, empty deck category) that
the Loot Engine / Simulator can surface.

---

## 4. `resolveTurn()` — the canonical turn primitive (THE deliverable)

This is the heart of the engine and the reason Phase 1 is first. Implement the **loot-every-unvisited-stop
continuous ricochet** algorithm EXACTLY as `docs/mechanics.md` §4 specifies. It must be **pure and
deterministic**: same `(state snapshot, team, declaredDir, dieRoll)` → same result, with **no mutation of
inputs**.

### 4.0 Signature
```js
resolveTurn(ctx) → TurnResult
```
where
```js
ctx = {
  game,                 // validated game.json (read-only)
  visited,              // Set<string> of coord strings already claimed (read-only INPUT)
  team,                 // team id/object: { id, pos: "K7" | null, rescuePointsThisVisit, ... }
  declaredDir,          // "N" | "S" | "E" | "W"
  dieFaceIndex,         // 0..11 — which physical d12 face came up (sim rolls it)
  rolledCompass,        // "N"|"S"|"E"|"W" — REQUIRED when that face is type "compass" (see 4.2); else ignored
  globalMod,            // integer from the day's calendar (applied live by GM in reality)
  rubberBand            // integer bump for this team this turn (0 if none)
}

TurnResult = {
  heading,              // resolved cardinal OR diagonal ("E" | "SE" | ...)
  windKind,             // "tailwind"|"headwind"|"crosswind"|"still"|"storm"
  X,                    // resolved move count actually attempted
  stops: [              // ORDERED list of unvisited tiles stopped on & looted (length 0..X)
    { coord, baseValue, lootMod, reward, resolvedRewardValue }
  ],
  newPos,               // coord of last stop, or unchanged team.pos if stops empty
  newlyVisited: [coord, ...],  // === stops.map(s=>s.coord); the caller adds these to `visited`
  capped: false         // true if RP overflow occurred this visit (informational; see §6)
}
```
- `resolveTurn` **does not mutate** `ctx.visited` or `ctx.team`. It **returns** what changed; the caller
  (simulator) applies it atomically in turn order. This keeps the function pure and the atomic-claim rule
  (D-atomic) the caller's single responsibility.

### 4.1 Step order (canonical — implement once, exactly this order)
```
1. DECLARE   : declaredDir ∈ {N,S,E,W}                                    (from ctx)
2. ROLL      : face := game.config.dieFaces[dieFaceIndex]
               (heading, windKind, X, lootMod) := faceToVector(declaredDir, face, ctx.rolledCompass)
3. APPLY GLOBAL X SHIFTS : X := X + (any global ±X from calendar/config) ; clamp X ≥ 0
4. SAIL & LOOT : stops := sailStops(team.pos, heading, X, visited)        // §4.3
5. RESOLVE LOOT per stop : for each stop, reward resolution := §4.5
6. RETURN TurnResult                                                       // caller applies caps/visited
```

### 4.2 `faceToVector(declaredDir, face, rolledCompass)` — weather semantics (§4.0)
The declared cardinal **always anchors** the sail; the rolled face modifies it **relative** to the
declaration. The die never fully overrides direction (declared cardinal always contributes to heading).

- **`face.type === "compass"`** → the face yields a compass direction `F = rolledCompass`
  (the simulator supplies a uniformly-random cardinal for that face; in reality the physical die face shows
  a compass arrow). Classify `F` against the declared `D`:
  - `F === D` → **tailwind**: heading = `D` (straight), `X = weatherModel.tailwind.X`, `lootMod = 0`.
  - `F === opposite(D)` → **headwind**: heading = `D` (straight), `X = weatherModel.headwind.X`, `lootMod = 0`.
  - `F ⊥ D` (perpendicular) → **crosswind**: heading = **diagonal** combining `D`+`F`
    (e.g. `D=E,F=S → SE`), `X = weatherModel.crosswind.X`, `lootMod = 0`.
- **`face.type === "still"`** → **still**: heading = `D` straight, `X = weatherModel.still.X`,
  `lootMod = weatherModel.still.lootMod` (+2 placeholder, applied **per tile**).
- **`face.type === "storm"`** → **storm**: heading = `D` straight, `X = weatherModel.storm.X`,
  `lootMod = weatherModel.storm.lootMod` (−1 placeholder, per tile).

Read all X / lootMod **from `game.config.weatherModel`** — never hardcode 2/3/4. They are simulator
placeholders. The *relationship* table is fixed; the *numbers* live in the data.

### 4.3 `sailStops(pos, heading, X, visited)` — loot-every-unvisited-stop ricochet (CRITICAL)
**This is the algorithm the whole project is sequenced around. Implement it verbatim from `mechanics.md`
§4.1.** The ship steps along `heading`, **jumps over visited tiles (they are NOT a stop and NOT counted)**,
**stops on and returns each unvisited tile**, and **ricochets off walls** so the run reaches `X` stops
whenever ≥ X unvisited tiles remain reachable.

```
sailStops(pos, heading, X, visited):
  if pos is null: throw "team has no position" (start tile is set at setup, never via resolveTurn)
  stops := []
  cur := pos
  guard := 0
  while length(stops) < X:
      guard += 1
      if guard > SAFETY_LIMIT: break        // see termination note below
      next := step(cur, heading)            // cur + unit vector of heading (diagonal = both axes)
      if isOffGrid(next):
          heading := reflect(heading, wallHit(cur, heading))   // bounce; do NOT advance, do NOT count
          continue
      cur := next
      if cur not in visited and cur not in stops:   // unvisited & not already stopped this run
          stops.append(cur)                          // STOP here → it will be looted
      // visited tiles (and any tile already in stops) are JUMPED OVER: keep stepping
  return stops
```
- **`reflect(heading, wall)`** (standard billiard ricochet, §4.1 `REFLECT`):
  - **Cardinal into its wall** → reverse to the opposite cardinal (`E`→`W`).
  - **Diagonal into one wall** → mirror the component normal to that wall (`SE` hits east edge → `SW`;
    `SE` hits south edge → `NE`).
  - **Diagonal into a corner** → mirror **both** components (reverse the diagonal).
  - You must detect *which* wall(s) the step would cross from `cur`; a diagonal can hit a corner (both).
- **Jump-over rule:** tiles already in `visited` are stepped past and never counted (D9). A tile already
  collected earlier *in this same run* (possible after a bounce loops back) is also skipped — never loot or
  count the same tile twice in one turn.
- **Termination / board-starvation:** continuous reflection terminates as long as ≥ X unvisited reachable
  tiles remain. If the board is nearly full, fewer than X unvisited tiles may be reachable; the loop must
  **terminate and return fewer than X stops** rather than spin forever. Use a `SAFETY_LIMIT` (e.g.
  `4 * gridSize * gridSize`) and, on hitting it, return the stops gathered so far. **The board never ends
  the game (only equal turns do, §3); a short turn here is legal.** Expose this as a result fact the
  simulator can count (board-starvation metric) — do NOT throw.

### 4.4 Worked examples your tests MUST cover (from §4.3)
- *Tailwind:* declared `E`, compass `E`, X=4 → next 4 unvisited tiles east, each looted.
- *Headwind:* declared `E`, compass `W`, X=2 → 2 unvisited tiles **east** (you fight the wind; heading
  stays `E`).
- *Crosswind diagonal:* declared `E`, compass `S`, X=3 → 3 unvisited tiles **SE**, jumping visited.
- *Bounce (cardinal):* on a tile 2 from the east edge, declared `E`, tailwind X=4 → loot 2 east, reflect
  to `W`, loot 2 west = 4 stops total.
- *Bounce (diagonal):* `SE` hits the east edge after 1 stop → reflect to `SW`, keep stopping until X met.
- *Bounce (corner):* diagonal into the corner reverses both axes.
- *Storm:* declared `N`, storm, X=4 → 4 tiles north, each stop `lootMod = −1`.
- *Still:* declared `N`, still, X=2 → 2 tiles north, each stop `lootMod = +2`.
- *Skip:* next 2 tiles visited, then unvisited → jump the 2, resume stopping on unvisited tiles.
- *Starvation:* a tiny synthetic board with < X reachable unvisited tiles → returns < X stops, no hang.

### 4.5 Per-stop loot resolution (§6.2 / §7)
For each stop, in order:
```
baseValue  := lookup secretValues[coord].value          // STATIC, SECRET, never changes
baseReward := secretValues[coord].reward                 // the kind the value indexes (Winds/puzzle/animalSave/RP)
resolvedRewardValue := resolveReward(baseReward, lootMod, globalMod, rubberBand)
```
- The **three live modifiers** are added by the GM in reality; in core they are explicit `ctx` inputs.
  `loot = staticTileValue → + lootMod(Storm/Still) → + globalMod(day) → + rubberBand`.
- **Reward `kind` closed set** (validate against this): `"winds"` (`{n}` = DRAW count, type random — see
  §5.2), `"puzzle"` (`{byIndex:true}` → an indexed Archipelago Map), `"animalSave"` (grant one animal-save
  opportunity, possibly `{rescuePoints:k}`), `"rescuePoints"` (`{n}`). Modifiers shift the **numeric**
  components (Wind count / RP); they do not change a puzzle's index.
- Core returns the **resolved reward**; it does **not** itself decide *which* random Wind types are drawn
  or *which* animal is saved beyond what §5/§6 specify — those are caller/sim concerns wired through the
  RNG fork. Keep this boundary clean.

---

## 5. Winds, draws, and the simulator-facing state (helpers)

### 5.1 Ephemeral simulator state (core defines the shape; sim owns the instance)
```js
makeInitialState(game) → SimState
SimState = {
  visited: Set<string>,                  // claimed tiles (starts with each team's chosen start tile)
  teams: [ {
    id, pos,                             // pos set at setup (team-chosen start, D6a)
    rescuePointsTotal,                   // running competitive number
    winds: { up, down, left, right, joker },   // per-type tally
    puzzlesHeld: [puzzleId, ...],        // unlimited (D10)
    animalsSaved: [cardNumber, ...]
  }, ... ],
  turnsTaken: number                     // equal across teams — invariant the sim must preserve
}
```
- The **start tile** is **team-chosen at setup** (D6a): the simulator picks it (randomly or by policy) and
  marks it visited with **no loot**. `resolveTurn` is never used to set a start. Provide
  `applyStart(state, teamId, coord)` that marks visited + sets `pos`, asserting the tile is unvisited.

### 5.2 Wind draws (D5)
- `drawWinds(rng, pool, n) → ["up","joker",...]` draws `n` types from `config.winds.pool` (weighted,
  incl. Joker rarity). Pure given the rng stream. The caller records them onto the team tally.
- A **Joker** resolves to any one direction *at spend time* — that's a puzzle-solving concern (Phase 3),
  not core movement. Core only needs to draw/track Joker as a fifth type.
- Sailing is **free** (`sailingCostsWinds:false`): `resolveTurn` never debits Winds. Validate that nothing
  in core debits Winds for movement.

---

## 6. Scoring helpers (the two decoupled currencies + caps)

Core provides **pure** helpers the simulator calls after `resolveTurn` (§6.4 of mechanics):

- `applyRescuePoints(team, gained, rpMaxPerVisit) → { banked, overflowLost }`
  - A team banks at most `rpMaxPerVisit` Rescue Points **per visit**; RP beyond the cap is **lost**, but
    any **Winds / other resources from the same turn-ins are kept** (the caller keeps them; this helper
    only meters RP). Returns how much was banked vs lost.
- `applyAnimalSaves(team, chosenCards, perVisitCap) → savedCards`
  - At most `perVisitCap` (3) animals saved per visit. Running out of cards is **harmless** — save fewer,
    RP unaffected. Animals are **flat & unique** (no value); core does not rank them.
- **Equal-turns invariant:** core exposes `assertEqualTurns(state)` the simulator can assert after each
  round. The game ends only on a fixed equal turn count — **never** on deck/board exhaustion. Core must
  never end a game; it has no concept of "game over" beyond what the caller drives.

Keep RP (competitive number) and Animals (cooperative collection) in **separate fields and separate
helpers** — they never mix (this decoupling is what lets the game end fairly on turn count regardless of
deck state).

---

## 7. Public API surface (export exactly these)

```js
// prng
export function makeRng(seed): Rng
// coords
export function parseCoord(s): {col,row}
export function formatCoord({col,row}): string
export function isOffGrid({col,row}, gridSize): boolean
// geometry
export function step(coord, heading): coord
export function reflect(heading, wall): heading
export function faceToVector(declaredDir, face, rolledCompass): {heading, windKind, X, lootMod}
export function sailStops(pos, heading, X, visited, gridSize): coord[]
// schema
export function validateGame(game): {ok:true}            // throws GameValidationError on failure
export function lintGame(game): string[]
// turn
export function resolveTurn(ctx): TurnResult
// state & scoring
export function makeInitialState(game): SimState
export function applyStart(state, teamId, coord): void
export function drawWinds(rng, pool, n): string[]
export function applyRescuePoints(team, gained, rpMaxPerVisit): {banked, overflowLost}
export function applyAnimalSaves(team, chosenCards, perVisitCap): cardId[]
export function assertEqualTurns(state): void
```
Anything else is internal. Keep the surface minimal and stable — four downstream modules import it.

---

## 8. Testing & acceptance criteria (DEFINITION OF DONE)

Ship a test file (`core.test.js` or equivalent, runnable headless). Phase 1 is **not done** until all pass:

1. **PRNG determinism:** a pinned seed reproduces a literal expected sequence; `fork` streams are
   independent (changing draws from one fork does not perturb another).
2. **Coord round-trip:** `formatCoord(parseCoord(x)) === canonical(x)` for all 676 tiles; zero-padded
   input accepted; output never padded; off-grid rejected.
3. **`faceToVector`:** every (declaredDir × {tailwind/headwind/crosswind/still/storm}) combination yields
   the heading, windKind, X, and lootMod from `weatherModel`. Crosswind always produces the correct
   diagonal; headwind keeps the declared heading.
4. **`sailStops` — every §4.4 worked example** reproduced exactly, including:
   - loot-every-unvisited-stop (returns up to X tiles, **each** distinct & unvisited),
   - jump-over-visited (visited tiles never appear and never count),
   - cardinal bounce, single-wall diagonal bounce, **corner** bounce,
   - **board-starvation** terminates and returns `< X` stops (no infinite loop), within `SAFETY_LIMIT`.
5. **Purity:** `resolveTurn` mutates neither `ctx.visited` nor `ctx.team` (freeze them in a test and assert
   no throw); identical inputs → deep-equal outputs across repeated calls.
6. **Atomic claim is the caller's job:** demonstrate that applying two teams' `TurnResult`s in turn order
   on a shared `visited` set never double-claims a tile (the second team jumps the first's new stickers).
7. **Caps:** `applyRescuePoints` loses overflow beyond `rpMaxPerVisit` while reporting kept resources;
   `applyAnimalSaves` caps at 3 and treats an empty deck as harmless.
8. **Validator:** `validateGame` rejects every hard-fail in §3.2 with a precise message+path; accepts the
   reference `game.json`. Provide a minimal valid fixture.
9. **Sailing is free:** assert no Wind is ever debited by `resolveTurn`.
10. **No game-over in core:** assert core never signals end-of-game; only equal turn count (caller-driven)
    can.

**Hand-off:** when these pass, Phase 2 (Loot Engine + TCG) and later phases import `core.js` unchanged.
Export a one-paragraph `README` note in `/src/core` listing the public API and the single-consumer rule.

---

## 9. Traceability — decisions this engine hard-encodes
`D2` continuous ricochet / no Becalmed · `D9` jump visited + living calendar (range, equal turns) ·
`D1` declared-anchored relative weather (tailwind/headwind/crosswind-diagonal/Still/Storm) ·
`D4` sailing free · `D5` directional Winds + Joker, drawn random · `D7/D8` static secret tile values,
random placement, three live modifiers · `D-atomic` atomic claim in turn order ·
`D-rpcap` RP capped per visit (overflow lost, resources kept) · `D-savecap`/`D12` ≤3 flat unique animals/visit ·
`D10` unlimited puzzle holding · §3 equal-turns hard invariant, game ends only on turn count.

If any of these appears violated by a spec line above, `docs/mechanics.md` is authoritative — flag the
conflict, do not silently diverge.
