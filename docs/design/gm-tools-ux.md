# Ocean Rescue — GM Tools UX & Information Architecture (Design Phase)

**Role:** senior UX designer & information architect
**Authoritative ruleset:** `docs/mechanics.md` — its `[DECISION … CONFIRMED]` tags are final and override
everything else. This doc is realigned to match it (2026-06-17).
**Other inputs:** `GAME.md` (master intent), `docs/analysis/rules-review.md` (historical gap analysis),
`tcg_generator/index.html` (the one existing module).
**Localization rule (hard):** every player/GM-facing string, label, PDF, and printed cell is **POLISH**.
Code, JSON keys, and this doc are English.

> **Realignment note (2026-06-17).** Rewritten to match the locked ruleset. Key changes from the prior
> draft: **26×26** grid (`A1`–`Z26`); **loot at EVERY tile stopped** (a turn explores up to X tiles and
> loots each); **d12** weather die; **no Becalmed** (continuous ricochet, always full move); **two
> decoupled scoring currencies** — **Rescue Points** (written, capped per visit) + **Rescued Animals**
> (unique, flat, ≤3 saved/visit); **Winds = 5 types incl. Joker**, directional, drawn at random;
> **unlimited puzzle holding** (wind-juggling is the core loop); **puzzles print NO solution/required
> moves**; **indexed per-map puzzle rewards**; **living calendar** with a hard **equal-turns** invariant;
> **static secret tile values** on a **plain grid** (no values, no gradient) with the GM applying the
> global modifier live. Still **pure paper at the table** (no live tool).

---

## 0. Design principles

1. **Print-first, paper-only at the table.** The SPA *manufactures a binder + the A1 map prop* before
   camp. During camp there is **no screen** (GAME.md §8; mechanics §11). Everything is precomputed,
   printed, and resolved by eye/pen.
2. **The board *is* the state.** The shared visited-set across 12 teams lives on a wall-mounted **A1
   Ocean Map** where teams place **stickers** on visited tiles. The sticker layer *is* the global
   visited-set, so skip/ricochet paths (incl. diagonals) are **traced by eye**, not computed.
3. **Single seed → identical binder + map.** Same seed reproduces the exact A1 grid, secret value table,
   puzzles, calendar, and card set — so any lost page or a fresh A1 reprints without desync.
4. **Determinism kills disputes.** Only four things are resolved live: the **landed tiles** (eye-traced
   on the sticker map), the **Storm/Still ±loot shift**, the **global day modifier**, and the
   **rubber-band** (printed baseline + a small logged override). Everything else is frozen in print.
5. **Buildable by a small team, offline.** Each module is a self-contained static HTML page (like the
   existing TCG generator: Tailwind CDN + vanilla JS + IndexedDB). No backend. Shared logic in one
   `core.js`. Only network calls are optional AI calls in the TCG module, pre-camp.
6. **Two currencies, kept apart.** Competitive **Rescue Points** (a number) and cooperative **Rescued
   Animals** (the shared Album) never mix — this is what lets the game end on a fair fixed turn count
   regardless of deck state (mechanics §3/§6.4).

---

## 1. GM JOURNEY MAP

Two phases. Hand-off artifact: **the binder + the A1 Ocean Map prop + the sticker/Wind-tile bins.** No
laptop goes to camp.

### Phase A — PRE-CAMP PREP (at home, with internet)

The GM *manufactures the whole game* and walks away with a printed binder, an **A1 ocean map**, the
**GM-only secret value table**, the **animal Album deck** (by category), the **puzzle deck**, and a saved
`game.json` seed (for reprints, not for camp).

| Step | GM action | Tool | Output |
|---|---|---|---|
| A1 | Set global knobs: seed, #teams (12), **26×26** grid, the **living-calendar baseline** (planned turns, excluded days, multi-turn days, global modifiers) | **Map Gen** (calendar panel) | `calendar`, `config` |
| A2 | Set loot ratios (Winds : Puzzles : Animals : Rescue Points), early Wind floor, **Wind draw-pool over the 5 types incl. Joker**, **Rescue-Point cap per visit** | **Loot Engine** | `lootTable` + `windPool` + `rpMax` |
| A3 | Generate the **26×26** ocean: **random static secret tile values**. Print the **plain A1 grid** (no values) **+** the **GM-only secret value table** | **Map Gen** | A1 grid prop + secret value table |
| A4 | Generate the puzzle deck, **indexed by difficulty**; each gets an internal validated solution (GM key) and a **per-index reward** — **no solution printed on the sheet** | **Puzzle Gen** | puzzle sheets + GM solution key + reward index |
| A5 | Generate / curate the **animal Album** deck — **unique, flat cards** (no face value), grouped by **category** (domestic / extinct / poisonous / …), AI facts + art | **TCG Gen** (exists) | card sheets + `deck.json` by category |
| A6 | Validate balance: Monte-Carlo the camp using **loot-every-tile + d12 diagonal weather + directional Winds + the two-currency caps**; check RP fairness band, board never starves, Album completable-not-trivial, early puzzles solvable | **Economy Sim** | balance report; loop back to A2/A3 |
| A7 | Export to PDF; print binder; **print + mount the A1 grid**; cut sticker/Wind-tile bins; save `game.json` to USB for reprints | all modules | **the binder + A1 prop** |

### Phase B — DURING-CAMP DAILY OPERATION (pure paper)

Each morning the GM opens the binder to today's day-tab. **No device.** Teams visit in a **fixed rotating
order** (mechanics D13) printed on the day-sheet. The A1 map hangs where every team can see it. **Equal
turns is a hard rule — if the GM adds an unplanned turn (living calendar), every team gets it.**

```
┌─ ONE TEAM VISIT — GM micro-loop (PURE PAPER) ──────────────────────────┐
│ 1. Team declares ONE cardinal direction (N/E/S/W).        [verbal]     │
│ 2. Team rolls the Weather Die (d12).                      [physical]   │
│ 3. GM resolves HEADING + move count X from (declared, face): [CHEAT]   │
│      tailwind X=4 straight | headwind X=2 straight |                   │
│      crosswind X=3 DIAGONAL (declared+rolled) |                        │
│      Storm X=4 straight (each tile −1) | Still X=2 straight (each +2). │
│    (apply any global ± to X.)                                          │
│ 4. GM SAILS on the A1 MAP by eye: step along the heading, JUMPING      │
│      visited (sticker) tiles, STOPPING on each unvisited tile,         │
│      RICOCHETING off walls, until X tiles are stopped on.   [A1 MAP]   │
│ 5. For EACH stopped tile: read its value from the SECRET TABLE, add    │
│      the Storm/Still shift + today's global modifier + rubber-band,    │
│      and ANNOUNCE the reward.                              [GM BINDER] │
│ 6. Place a team-colored STICKER on each stopped tile (now visited      │
│      for everyone).                                        [A1 MAP]    │
│ 7. Hand out the loot from those tiles:                                 │
│      • Winds → team DRAWS that many random Wind tiles (↑/↓/←/→/★Joker) │
│        and RECORDS each on its SCORE CARD.                             │
│      • Puzzle map(s) / Rescue Points / (Animal handled at turn-in).    │
│ 8. RESCUE POINTS: add this visit's RP to the team total — but CAP at   │
│      RP_max/visit (overflow lost).                         [SCORE CARD]│
│ 9. PUZZLE TURN-INS (any number): for each solved map, verify vs the    │
│      SOLUTION KEY, cross off the Winds the team spent, grant the map's │
│      INDEXED reward (RP / Winds / animal-save). Still capped by #8.    │
│ 10. SAVE ANIMALS: team may save ≤3 animals/visit into the shared       │
│      ALBUM (pick any available; fills category gaps). If the deck is   │
│      empty, save none — RP unaffected.                     [ALBUM]     │
│ 11. Log any discretionary rubber-band override (≤+2 / 1 extra sail).   │
└────────────────────────────────────────────────────────────────────────┘
```

**Resolved LIVE (pen/eye only):** the stopped tiles (eye-traced), the Storm/Still shift, the global
modifier, the rubber-band, the random Wind draws, the per-visit RP cap.
**Frozen in print:** static tile values (secret table), the loot table, puzzle solution keys + reward
indices, the card deck, turn order.

> **Resilience:** keep `game.json` on a USB stick so any binder page or a fresh A1 reprints identically;
> stickers reconstruct from the coordinates logged on team score cards.

---

## 2. PRINTED MATERIALS UX (the binder + the A1 prop)

A **tabbed ring binder** the GM flips one-handed plus one wall-mounted **A1 map**. Binder lookup is O(1):
always "read a cell," never "trace a value." The only tracing is the skip-path on the A1 map; §2.6 makes
it fast. Everything A4 (A1 for the map), high-contrast, large type, Polish.

### Binder structure (tab order = frequency of use)

```
[TAB 0] OKŁADKA / SZYBKI START   – cheat sheet: visit micro-loop, the WEATHER/HEADING table
                                   (tailwind/headwind/crosswind=diagonal/Storm/Still + X),
                                   ricochet & jump-visited rule, die legend, the two caps
                                   (RP/visit, 3 animals/visit).
[TAB 1] KALENDARZ (żywy)         – baseline plan per day: excluded? multi-turn? global modifier?
                                   today's turn order, today's rubber-band BASELINE bumps, an
                                   ACTUAL-TURNS log (equal across teams) + override log column.
[TAB 2] SEKRETNA TABELA WARTOŚCI – GM-ONLY static value per tile coordinate (never shown).
        (mapa wartości)            The A1 grid carries NO values; they live here.
[TAB 3] TABELA ŁUPÓW             – the value→reward table (static) + the GM's live-add legend
                                   (+Sztorm/Cisza, +modyfikator dnia, +rubber-band).
[TAB 4] DRUŻYNY (12 kart)        – one score card per team: Rescue-Point running total, Wind
                                   tally per TYPE (incl. Joker), animals-saved tally, daily journal.
[TAB 5] ZAGADKI + KLUCZ          – puzzle hand-out sheets (NO solution) + GM solution key + reward index.
[TAB 6] ALBUM ZWIERZĄT           – the unique animal deck, sorted into CATEGORY bins; category-
                                   completion milestone notes.
[TAB 7] KRAWĘDŹ / RICOSZET       – the ricochet/diagonal/jump-visited quick-rule card (§2.6).
```

**The A1 prop (on the wall):** a **plain 26×26 grid** with coordinate rulers — **no values, no gradient,
no hints**, because values are static, secret, and randomly seeded. Teams place stickers here; that's its
only live job.

### 2.1 The A1 Ocean Map (wall prop) — plain grid, sticker surface

```
        kol →   A   B   C   D   E   F  ...        Z
  wiersz ┌────┬───┬───┬───┬───┬───┬───┬──────────────┐
    1    │ ●07│ ● │   │ ● │   │   │ ●01...           │  ●07 = naklejka drużyny 07
    2    │  ● │   │   │ ● │   │ ● │                  │  ●   = pole odwiedzone (kolor=drużyna)
    3    │    │ ● │   │   │ ● │   │  (przekątne      │  puste = pole nieodwiedzone
    4    │  ● │   │ ● │   │   │   │   prowadnice)     │  BRAK wartości na mapie — są tajne
   ...   │    │   │   │   │   │ ● │                  │
   26    │ ●04│   │ ● │   │   │   │ ●10...           │
        └────┴───┴───┴───┴───┴───┴───┴──────────────┘
        ▏coordinate rulers on ALL FOUR edges + diagonal tick marks▕
```

- **No value encoding at all** — discovery is total; only the GM's TAB 2 holds values.
- **Team-colored stickers** so the GM reads recent movement and adjudicates atomically-claimed ties
  (mechanics D-atomic) at a glance.
- Starting tiles are **chosen by teams at setup** (mechanics D6a), so the GM marks them live on day 0 —
  the generator does not pre-place them.

### 2.2 Secret value table (TAB 2, GM-only)

```
SEKRETNA TABELA WARTOŚCI — (NIE pokazywać drużynom)
┌─────────┬───────┬──────────────────────────────────────────────┐
│ pole    │ wart. │ nagroda bazowa (z tabeli łupów)               │
├─────────┼───────┼──────────────────────────────────────────────┤
│ N14     │   5   │ 🧩 zagadka  (indeks #i)                       │
│ K07     │   2   │ 💨 dobierz 2 Wiatry (losowe typy)             │
│ C21     │   6   │ 🐾 uratuj zwierzę + ⭐ Punkty Ratunku         │
└─────────┴───────┴──────────────────────────────────────────────┘
Wartość pola jest STAŁA i tajna przez całą grę. GM dolicza na żywo:
  + Sztorm −1 / Cisza +2  (na każde pole z tej tury)
  + modyfikator dnia (z kalendarza)
  + rubber-band (z karty dnia)
```
The value is static; the **three live modifiers** are the only thing the GM adds. Glyphs: `💨n` = draw n
Winds, `🧩` = puzzle (by index), `🐾` = save an animal, `⭐n` = n Rescue Points.

### 2.3 Value→reward table (TAB 3)

```
TABELA ŁUPÓW (wartość pola → nagroda; wartości STAŁE)
┌──────┬───────────────────────────────────────────┐
│ wart.│ NAGRODA                                   │
├──────┼───────────────────────────────────────────┤
│  1   │ Dobierz 1 Wiatr (losowy typ)              │
│  2   │ Dobierz 2 Wiatry                          │
│ ...  │ ...                                       │
│  5   │ Zagadka (indeks z puli)                   │
│  6   │ Uratuj zwierzę + Punkty Ratunku           │
└──────┴───────────────────────────────────────────┘
GM dolicza na żywo: +Sztorm(−1)/Cisza(+2) · +modyfikator dnia · +rubber-band
```
Every Wind reward is a **draw** ("Dobierz N Wiatrów — losowe typy"): the count is on the table, the
*type* (incl. Joker) is drawn at the table and recorded (mechanics D5).

### 2.4 Per-team SCORE CARD (TAB 4)

The most-touched live-write surface. Three trackers: **Rescue Points**, **Winds by type**, **animals
saved**.

```
┌─ DRUŻYNA 07 — „Rekiny”  ────────────────────────────────────────────┐
│ PUNKTY RATUNKU (suma):  [ 12 ][ 17 ][ 23 ]   ← dopisuj; limit/wizytę │
│ Uratowane zwierzęta:    003, 019, 027  (≤3 na wizytę)               │
│                                                                     │
│ WIATRY (kreska za dobrany; skreśl wydany):                          │
│   ↑ Góra | | | |     ↓ Dół | | |     ← Lewo | |                     │
│   → Prawo | | | |    ★ Dżoker | |   (Dżoker = dowolny kierunek)     │
│                                                                     │
│ Aktywne zagadki (bez limitu): Z-014, Z-031, Z-002 ...              │
│ ┌─ dziennik dzienny ───────────────────────────────────────────┐  │
│ │ Dz | kier | rzut    | kurs | pola (X)        | łup       | +PR│  │
│ │ 1  |  N   | kompas  | N    | N23,N22,N20,N19 | 💨3,🧩    | +4 │  │
│ │ 2  |  E   | boczny  | SE↘  | F25,G24,H23     | 💨2       | +1 │  │
│ │ 3  |  -   | oddanie | -    | -               | 🐾#19    | +5 │  │
│ └───────────────────────────────────────────────────────────────┘ │
│ Pula startowa: 6 Wiatrów (zbalansowane, w tym Dżoker), 0 PR,        │
│   2 zagadki startowe (D6b).                                         │
└─────────────────────────────────────────────────────────────────────┘
```
- **Rescue-Point total** with a per-visit cap the GM enforces (overflow lost; mechanics D-rpcap).
- **Wind tally over 5 types** incl. **★ Joker**; teams stroke on draw, cross off exact types on spend.
- **Animals saved** — list of saved card numbers, **≤3/visit**.
- The **pola (X)** column lists *every* tile stopped this turn (loot-every-tile), so the journal is the
  audit trail for the eye-traced path; **kurs** records the heading incl. diagonal.

### 2.5 Puzzle sheets + solution key (TAB 5)

**Hand-out sheet (to the kids)** — pictographic, **prints NO solution and NO required moves** (mechanics
D11). The team figures out the path and spends the directional Winds it actually uses (Jokers fill any
direction):

```
ZAGADKA Z-014   (indeks #37)
┌───────────────────────┐   Statek ślizga się aż uderzy w przeszkodę/ścianę.
│ . . ▓ . . . .         │   Doprowadź 🚢 do 🏁.
│ . 🚢. . . ▓ .         │   Wydawaj Wiatry (↑↓←→ lub ★Dżoker) na ruchy,
│ . . . . ▓ . .         │   skreślając je na karcie drużyny.
│ ▓ . . . . . 🏁        │   (instrukcja obrazkowa, bez rozwiązania)
└───────────────────────┘
```

**GM solution key (in binder, never shown):**
```
Z-014 | rozwiązanie (klucz): U,L,U,R | indeks nagrody: #37 → ⭐4 + 💨1 + 🐾
```
**Turn-in:** the GM confirms the map is genuinely solved (against the key), crosses off the Winds the team
spent, and grants the **indexed reward** (mechanics §6.3). No printed required-multiset; reward is by the
map's index, **smaller/easier maps = lower reward** (normal-distributed across the index, simulator-tuned).

### 2.6 Operational load: eye-tracing diagonals & ricochet — print-side mitigations

No resolver, so the GM traces every path by eye, including 3-tile **diagonals** that jump stickered tiles
and **ricochet off walls** (mechanics §4). Designed out with print:

1. **Coordinate rulers on all four edges + diagonal ticks.** Every 5th row/col bold; light corner-to-
   corner guide-ticks so SE/NE/SW/NW counts stay on-line.
2. **Sticker color per team** — visited-but-jumped tiles vs the moving team's trail at a glance; atomic
   tie adjudication (D-atomic).
3. **Ricochet / jump-visited quick card (TAB 7):** *jump visited tiles (don't count); stop on & loot each
   unvisited tile; at a wall, bounce (cardinal reverses, diagonal mirrors) and keep going until X stops;
   never off-grid, never short; no Becalmed.*
4. **Optional printed "skip-helper" overlay** — a transparent A1 ruler with the 8 heading vectors and pips
   (2/3/4) from a movable origin token; lay it on the current tile, read the X stops in one motion.
5. **Cheat card weather/heading table (TAB 0)** — the full tailwind/headwind/crosswind→diagonal/Storm/Still
   relationship + X, printed large, so heading is a lookup.

### 2.7 Animal Album bins (TAB 6)

Cards pre-printed, cut, sorted into **category bins** (domowe / wymarłe / jadowite / …). **All cards are
equal — no face value, no tiers.** When a team earns an animal save, it picks any available card (to fill
a category gap), ≤3/visit, into the shared Album. A printed note per bin tracks **category completion →
camp-wide milestone reward** (mechanics D-milestone). Running out of a category is harmless (no RP impact).

---

## 3. SPA MODULE SPECS

Standalone static HTML pages sharing one `core.js` (§4). All UI/PDF text Polish. Pattern follows the TCG
generator. **All five modules run pre-camp only — no live/at-the-table mode** (mechanics §11).

### Module 1 — Ocean Map Generator (generator only)

**Purpose:** produce the **plain 26×26 A1 grid** (no values) and the **GM-only secret static value table**;
author the **living-calendar baseline**.

**Inputs (knobs):** seed; grid 26×26; #teams (12); **value distribution** (how many high/low static values
— placement is **random**, no gradient, mechanics D7/D8); the **weather model** (base X=3; tailwind +1 /
headwind −1 / crosswind 0-diagonal / Storm 4 / Still 2; per-tile loot ±Storm −1 / Still +2 — placeholders);
**d12 face counts** (compass/Still/Storm mix); edge rule = **ricochet, always full X**; jump-visited;
**equal-turns** living calendar (baseline turns, excluded/multi-turn days, global modifiers); link to
`lootTable` (M3).

**Outputs (printable):**
- **A1 player grid:** the wall prop — four-edge + diagonal rulers, sticker surface, **no values**.
- **Secret value table (TAB 2):** per-tile static value + the base reward it indexes.
- **Calendar baseline sheet (TAB 1)** with an actual-turns log surface.
- *Screen (pre-camp only):* grid preview + a **reachability / ricochet validator** (confirms continuous
  movement always delivers X; board never starves at planned turn counts).

**Shared deps:** reads `lootTable` (M3), `deck` categories (M5), `puzzles[]` indices (M2) to label the
secret table. Writes `map`, `calendar`, `config`.

### Module 2 — Puzzle Generator

**Purpose:** generate **valid, solvable** sliding ("ice-cave") puzzles, **indexed by difficulty**, each
with an internal validated solution (GM key) and a **per-index reward**.

**Inputs:** seed; count; grid sizes (5×5…8×8); difficulty band (solution length, obstacle density); the
**index→reward curve** (normal distribution; smaller/easier = lower — mechanics §6.3).

**Outputs:**
- *Printable:* pictographic hand-out sheet **with no solution/required moves**; GM solution key (ordered
  slide list) + the map's reward index.
- *Screen:* preview with animated solution playback; solvability badge; difficulty metrics.

**Core-logic note:** BFS over slide-states proves a finite solution exists and measures difficulty
(solution length, branching). That difficulty feeds the **reward index**, not a printed wind cost — the
team discovers the path and spends whatever directional Winds it uses (Jokers fill gaps). Because holding
is **unlimited** and Winds are scarce, the *strategic* layer is wind-juggling across many open maps; the
generator just guarantees each map is solvable.

**Shared deps:** `puzzles[]` (with `rewardIndex`, internal `solution`) referenced by `lootTable` (M3),
printed to the binder, consumed by the Economy Sim.

### Module 3 — Reward/Loot Engine

**Purpose:** auto-balance the value→reward table from GM ratios; enforce the early Wind floor; set the
**5-type Wind draw-pool** (incl. Joker rarity); set the **Rescue-Point cap per visit**; map tile values to
rewards (Winds / puzzle index / animal-save + Rescue Points).

**Inputs:** seed; target ratio **Winds : Puzzles : Animals : Rescue-Points** (loot-per-tile means a turn
yields up to X rewards — size accordingly, mechanics §4/§6.1); early Wind floor; **Wind pool distribution**
over ↑/↓/←/→/★Joker (D5); **RP cap per visit** `rpMax`; the puzzle index→reward curve cross-checked with M2.

**Outputs:**
- *Printable:* the value→reward table (TAB 3) phrased as Wind **draws** + the live-add legend.
- *Screen:* table editor, live ratio readout vs target, Wind-floor validator, **per-turn loot-volume
  estimate** (X rewards/turn) and **RP-cap pressure** (how often the cap bites).

**Shared deps:** produces `lootTable` + `windPool` + `rpMax`, consumed by M1 (value table), M4 (sim).

### Module 4 — Economy Simulator

**Purpose:** Monte-Carlo the camp to validate fairness and pacing before printing. With no live tool, it
is the **only** code that runs the full turn logic — the GM consumes only paper.

**Inputs:** the full `game.json`; #runs (e.g. 1000); the rules encoding **loot-every-tile**, the **d12
diagonal weather model**, **directional Winds incl. Joker**, the **two-currency caps**, the **living
calendar as a turn-count range**, and **equal turns**.

**Outputs (report):** Rescue-Point leader-vs-median spread (target band); **RP-cap effectiveness** (does
it tame hoard-and-dump and slow leaders?); **board-starvation** check (≥ X unvisited tiles always remain);
**Album completability** (deck sized completable-but-not-trivial over the turn range); **early-puzzle
solvability** and **per-type Wind throughput incl. Joker**; sensitivity to ±turns (living calendar);
soft-lock counter (must be 0 — there is no Becalmed, so this checks logic, not rules).

**Core-logic note (must be exact):** encode mechanics §4 exactly — one direction + one d12 roll per turn;
heading/X by relationship; **stop on and loot every unvisited tile up to X**; jump visited; **ricochet** at
walls; Storm/Still per-tile loot mod; Winds drawn per type from `windPool` and spent as the moves used;
Rescue Points capped per visit; ≤3 animals/visit; equal turns. This lone `resolveTurn` is what validates
the printed binder against the hand-run rules.

**Shared deps:** consumes everything; writes a report.

### Module 5 — TCG / Album Generator (already exists — extend, don't rebuild)

**Status:** built (`tcg_generator/index.html`): vanilla JS + Tailwind CDN + html2canvas + IndexedDB,
JSON import/export, Polish AI facts + art, PNG export.

**What to ADD / CHANGE (minimal):**
1. **Flat, unique cards — drop face value.** Cards are all equal (mechanics D12). Repurpose/retire the
   existing `power` (1–3 ⭐) field — it is **not** a score. (Keep it only as cosmetic flavor if desired.)
2. **Category field** (domowe / wymarłe / jadowite / …) on each card; group `deck.json` by category.
3. **Deck-supply readout** — cards per category vs. expected saves across the camp, so the Album is
   **completable but not trivial** (feeds M3/M4 sizing). Flag over/undersupply.
4. (Nice-to-have) batch generation from a species list.

**What NOT to change:** card layout, AI prompts, the offline collection store. Keep the "simple Polish for
8–14" bar; apply it to puzzle text in M2.

**Shared deps:** produces `deck.json` (unique cards by category) consumed by M3 (sizing) and M1 (labels).

---

## 4. INFORMATION ARCHITECTURE — shared data model (`game.json`)

One seed bundle links all five modules. Same seed → identical binder + A1 map. **No `live`/mutable
section** — the visited-set is physical (stickers); standings are tallied on paper. `core.js`'s
`resolveTurn` has exactly one consumer: the simulator.

```jsonc
{
  "seed": 1337,
  "config": {
    "gridSize": 26, "teams": 12,                 // mechanics: 26×26, coords A1–Z26
    "startStrategy": "team-chosen",              // D6a — teams pick starts at setup
    "valuePlacement": "random",                  // D7 — no gradient
    "die": "d12",                                // D-die; face counts WIP
    "lootEveryStop": true,                       // §4 — loot every unvisited tile stopped
    "weatherModel": {                            // mechanics §4.0; base X=3
      "tailwind":  { "X": 4, "heading": "straight",  "lootMod": 0 },
      "headwind":  { "X": 2, "heading": "straight",  "lootMod": 0 },
      "crosswind": { "X": 3, "heading": "diagonal",  "lootMod": 0 },   // declared+rolled
      "storm":     { "X": 4, "heading": "straight",  "lootMod": -1 },  // per tile
      "still":     { "X": 2, "heading": "straight",  "lootMod": +2 }   // per tile
    },
    "edgeRule": "ricochet; always deliver X; jump visited; no becalmed",  // D2/D9
    "turnOrder": "fixed-rotating",               // D13
    "equalTurns": true,                          // §3 — hard invariant
    "sailingCostsWinds": false,                  // D4
    "winds": { "types": ["up","down","left","right","joker"],          // D5 — 5 types
               "directional": true,
               "pool": { "up":0.22,"down":0.22,"left":0.22,"right":0.22,"joker":0.12 } },
    "startState": { "winds": "balanced-6", "rescuePoints": 0, "puzzles": 2 }, // D6b
    "puzzleHoldLimit": null,                      // D10 — unlimited
    "scoring": {
      "rescuePoints": { "rpMaxPerVisit": 8 },     // D-rpcap (placeholder)
      "rescuedAnimals": { "perVisitCap": 3, "flat": true, "byCategory": true } // D-savecap/D12
    }
  },
  "calendar": {                                   // D9 — LIVING; baseline plan, GM adjusts equally
    "baseline": [ { "day": 1, "excluded": false, "turns": 1, "globalMod": 0 },
                  { "day": 14, "excluded": false, "turns": 2, "globalMod": "+late" } ],
    "turnRange": [12, 18]                         // simulator models the range
  },
  "rubberBand": {                                 // D14 — HYBRID
    "baseline": { "rule": "bottom-N-gap-bump", "n": 4, "bumpCap": 3, "gapDiv": 10 },
    "override": { "maxBump": 2, "extraSailAllowed": true, "mustLog": true } // sail = moves, not a turn
  },

  "lootTable": [                                  // M3 — tile value → reward
    { "value": 1, "reward": { "kind": "winds",  "n": 1 } },   // n = DRAW count; type random
    { "value": 5, "reward": { "kind": "puzzle", "byIndex": true } },
    { "value": 6, "reward": { "kind": "animalSave", "rescuePoints": 3 } }
  ],

  "map": {                                        // M1 — single seed → fixed
    // A1 grid shows NO values; secretValues is the GM-only printed table (TAB 2)
    "secretValues": [ { "coord": "K07", "value": 2, "reward": {"kind":"winds","n":2} } ]
    // no pre-placed starts — teams choose at setup (D6a)
  },

  "puzzles": [                                    // M2 — indexed; solution is GM-only
    { "id": "Z-014", "index": 37, "difficulty": { "len": 4, "size": 7 },
      "grid": [/* obstacles */], "ship": "B2", "goal": "F4",
      "solution": ["U","L","U","R"],              // GM key, NEVER printed
      "rewardIndex": 37 }                         // → per-index reward (normal dist)
  ],

  "puzzleRewardCurve": { "shape": "normal", "min": "low(easy)", "max": "high(hard)" }, // §6.3

  "deck": {                                       // M5 — unique FLAT cards by category
    "domowe":   [ { "number": 3, "name": "...", "category": "domowe", "image": "..." } ],
    "wymarle":  [ /* ... */ ], "jadowite": [ /* ... */ ]
    // no vp / no tier — all animals equal
  },

  "milestones": [ { "category": "wymarle", "reward": "camp-wide bonus (TBD)" } ] // D-milestone
  // NOTE: no "live" section. Visited-set = stickers on A1; standings tallied on paper.
}
```

**Consistency rules:**
- `lootTable` references only puzzle indices that exist in `puzzles[]` and animal-saves the `deck` can
  supply; M3/M5 validate and warn on under/over-supply (Album must be completable-but-not-trivial).
- `map.secretValues` is *derived from* random placement + `lootTable` + seed, so the printed secret table
  and the simulator agree by construction.
- `core.js` exposes one `resolveTurn(state, team, dir, die) → {heading, stops[], rewards[]}` encoding the
  loot-every-tile diagonal model; its only caller is the simulator.
- **No mutable-at-camp JSON.** Camp mutation is physical (stickers + pen).

---

## 5. PRIORITIZED, LITE BUILD ROADMAP

Sequenced to **de-risk the camp**. With no live tool, the **A1 grid + secret value table** (M1 print) and
the **Economy Simulator** carry the most weight — the sim is the only code exercising the hand-run rules.

### MVP — minimum to make the game *playable and fair*

**Step 0 — `core.js`** *(~1 day).* Seeded PRNG + canonical `resolveTurn`: one direction + one d12 roll per
turn; heading/X by relationship; **stop on & loot every unvisited tile up to X**; jump visited; ricochet;
directional Winds incl. Joker; the two per-visit caps; equal turns. Everything depends on this.

**Step 1 — Loot Engine (M3).** Value→reward table + ratios + Wind floor + the 5-type `windPool` + `rpMax`
+ per-turn loot-volume estimate. The map can't be resolved and the sim can't run without it.

**Step 2 — Ocean Map Generator (M1)** → the **plain A1 grid + secret value table.** *The centerpiece.*
Random-seed tile values through `core.js`, run the **ricochet/reachability validator**, print the A1 grid
(no values, four-edge + diagonal rulers) and the secret value table. This *is* the table apparatus.

**Step 3 — Puzzle Generator (M2).** Generate + BFS-prove solvable, **index by difficulty**, export
pictographic sheets (**no solution**) + GM keys + reward index. Loot hands out puzzles from ~day 1.

**Step 4 — TCG/Album extension (M5).** Small delta: **flat unique cards + category field**, category-
grouped `deck.json`, deck-supply readout.

> **End of MVP — runnable on pure paper:** A1 grid + sticker/Wind-tile bins + secret value table + living
> calendar + value→reward table + per-team score cards (RP + Winds-by-type + animals-saved) + indexed
> puzzles + categorized Album. No device at the table.

### Post-MVP

**Step 5 — Economy Simulator (M4).** The sole automated fairness gate: tune M1/M3 to hit the RP fairness
band, confirm the board never starves, the Album is completable-not-trivial, early puzzles are solvable,
Joker rarity is right, and ±turns (living calendar) don't break pacing. Then lock the seed.

**Step 6 — Polish pass:** A1/PDF layout, TAB-0 weather cheat sheet, TAB-7 ricochet quick card, the optional
skip-helper overlay (§2.6.4), pictographic puzzle styling, deck batch-generation, milestone cards.

**Build order (one line):** `core.js (loot-every-tile diagonal model + directional Winds + caps)` →
Loot/`windPool`/`rpMax` → **A1 grid + secret value table** → indexed Puzzles → flat categorized Album
(= playable) → **Economy Simulator** (= fair) → polish.

---

## Appendix — module ↔ shared-state map

| Module | Reads from `game.json` | Writes | Live at camp? |
|---|---|---|---|
| 1 Ocean Map Gen | `lootTable`, `deck`, `puzzles`, `calendar` | `map` (secretValues), `calendar`, `config` | **No (pure paper)** |
| 2 Puzzle Gen | `seed`, difficulty knobs | `puzzles[]` (+`rewardIndex`, internal `solution`) | No |
| 3 Loot Engine | `seed`, ratios, `deck`/`puzzles` | `lootTable`, `windPool`, `rpMax` | No |
| 4 Economy Sim | everything (only `resolveTurn` consumer) | report only | No |
| 5 TCG/Album (exists) | `seed`, species list | `deck` (flat, by category) | No |

> **There is no live module.** Visited-set = stickers on the A1 grid; values come from the GM's secret
> printed table; standings are tallied on paper. The SPA's job ends when the binder + A1 prop are printed
> (mechanics §11, GAME.md §8).
