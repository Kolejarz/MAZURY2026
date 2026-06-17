# requirements.md — Phase 2B: TCG / Album Generator (`/src/tools/tcg`, module M5)

**You are the implementation agent for the TCG/Album generator.** This module **already exists** at
`tcg_generator/index.html` (vanilla JS + Tailwind CDN + html2canvas + IndexedDB, JSON import/export, Polish
AI facts + art, PNG export). **Extend it — do NOT rebuild it.** This file is your strict, minimal change
set.

**Authoritative ruleset:** `docs/mechanics.md` (wins). UX contract: `docs/design/gm-tools-ux.md` §3 Module 5
and §2.7. Shared engine: `/src/core/core.js`.

---

## 0. Purpose
Produce the **camp Animal Album deck**: **unique, all-equal** collectible animal cards (no face value, no
better/worse), grouped by **biological category** (domowe / wymarłe / jadowite / …), with AI facts + art,
printable, and exported as `deck.json` grouped by category for M3 (sizing) and M1 (labels).

> Why Phase 2: it's an isolated UI delta that finalizes the `deck.json` structure the map/simulator need.

---

## 1. What to ADD / CHANGE (minimal — this is the whole task)
1. **Flat, unique cards — drop face value (D12).** Every animal is unique (no duplicates) and **all equal**.
   **Remove the `power` (1–3 ⭐) field as a score.** Keep it only as cosmetic flavor if trivial to retain;
   it must **not** appear in `deck.json` as a value, nor be referenced by any reward. Update card layout so
   no point/tier value is shown to players.
2. **Category field** on each card: `category ∈ { domowe, wymarłe, jadowite, … }` (extensible list). Group
   `deck.json` **by category**.
3. **Deck-supply readout** — cards per category vs. **expected saves across the camp**, so the Album is
   **completable but not trivial** (mechanics D-deck/D-savecap). Compute expected saves from
   `12 teams × perVisitCap(3) × turns` (use `calendar.turnRange` if a `game.json` is loaded; else a manual
   input). **Flag over/under-supply per category.**
4. *(Nice-to-have)* batch generation from a species list.

## 2. What NOT to change
- Card visual layout, the AI prompt structure, the offline IndexedDB collection store, PNG export pipeline.
- The **"simple Polish for 8–14"** language bar — keep it; it is the template the Puzzle Gen (M2) text must
  also meet.

---

## 3. Hard constraints
- **Localization:** all card text and UI **Polish**; code/JSON keys English.
- **Offline / static.** The only network calls remain the **optional AI** calls (facts + art), pre-camp.
  Everything else works offline.
- **`deck.json` contract** (consumed by M3 sizing, M1 labels):
  ```jsonc
  "deck": {
    "domowe":  [ { "number": 3, "name": "...", "category": "domowe", "image": "...", "facts": "..." } ],
    "wymarłe": [ ... ], "jadowite": [ ... ]
    // NO vp / NO tier / NO power-as-score — all animals equal (D12)
  }
  ```
  `number` is a stable unique card id (used on score cards as the saved-animal reference). Round-trip with
  `core.validateGame` must pass when merged into a full `game.json`.

---

## 4. Album / category semantics the tool must reflect (mechanics §6.4, §2.7)
- Cards are saved into the shared Album, **≤3 per visit**, picking any available card to fill category gaps.
- **Completing a category → camp-wide milestone reward** (D-milestone). Provide a printed per-category bin
  note with a completion checkbox/milestone label (`milestones[]` in `game.json`).
- Running out of a category is **harmless** (no Rescue-Point impact, never ends the game).

## 5. Definition of Done
1. Existing generator still produces cards + PNGs + AI facts unchanged in spirit.
2. No face value/tier is shown on cards or stored as a score in `deck.json`.
3. Each card has a `category`; `deck.json` is grouped by category and merges into `game.json` validly.
4. Deck-supply readout flags over/under-supply per category against `12 × 3 × turns`.
5. Polish text throughout; offline except optional AI; printable category bins with milestone notes.
