# requirements.md — Phase 2B: TCG / Album Generator (`/src/tools/tcg`, module M5)

**You are the implementation agent for the TCG/Album generator.** This module is being built from the ground up as a standalone, offline Single Page Application (SPA).

**Authoritative ruleset:** `docs/mechanics.md` (wins). UX contract: `docs/design/gm-tools-ux.md` §3 Module 5 and §2.7. Shared engine: `/src/core/core.js`.

---

## 0. Purpose
Produce the **camp Animal Album deck**: **unique, all-equal** collectible animal cards (no face value, no better/worse), grouped by **biological category** (e.g., domowe / wymarłe / jadowite), with AI facts + art, printable, and exported as `deck.json` grouped by category for M3 (sizing) and M1 (labels).

---

## 1. Core Requirements
1. **Flat, unique cards — no face value.** Every animal is unique (no duplicates) and **all equal**. No power level or tier value is shown to players or stored in data.
2. **Category field** on each card: `category ∈ { domowe, wymarłe, jadowite, … }` (dynamically defined list).
3. **Card Fields**: Number (unique ID), Name, Category (symbol), Illustration, and "Ciekawostka" (fun fact). No height/weight.
4. **Print on coloured paper, BLACK ink only.** To save ink, cards are printed on **coloured paper stock**; the printer lays down **black ink only**. All card chrome (frame, number, name bar, fact, category symbol) is black; the **only colour on the card is the animal avatar**. The on-screen preview tints the card to *simulate* the paper, but nothing colour is ever printed.
5. **Category "theme" = colour + symbol + border.** Each category carries three at-a-glance markers, all printable in black:
    - `color` — the **paper stock** the set is printed on (screen tint only).
    - `symbol` — a **monochrome Unicode glyph** whose *shape* identifies the set (e.g. snowflake for `polarne`), forced to text/black presentation.
    - `border` — a **black border line-style** (`solid | thick | double | dashed | dotted`).
6. **Avatar style + magenta key.** Avatars follow a **Pokémon Red/Blue** look (limited palette, simplified shapes, bold outlines, no scenery). The image prompt asks for a **solid magenta (#FF00FF) background**, which the app **chroma-keys out to transparency in-browser** (canvas; adjustable tolerance) so the coloured paper shows through. Avatars are kept small (emblem, not full-bleed).
7. **Standard poker card size** (63×88mm), simplified/flat layout.
8. **Deck-supply readout** — cards per category vs. expected saves across the camp (`12 teams × 3/visit × turns`). Flag over/under-supply per category.
9. **3-step LLM workflow** (copy prompt → paste JSON; no API, fully offline):
    - **Step 1 — Categories:** prompt returns `{ "categories": [ {name, color, symbol, border} ] }` to configure the category list/themes.
    - **Step 2 — Animals in a category:** prompt returns an array of animals `{ name, latinName, category, habitat, appearance, fact }` (colour/symbol/border are inherited from the category, *not* chosen by the LLM).
    - **Step 3 — Per-animal image:** the editor builds a Pokémon-style, magenta-background image prompt the GM runs in an external image tool.
10. **Facts checker.** A separate prompt hands the whole deck (`number + name + latinName + fact`) to an **independent LLM agent** to verify correctness, **trim redundant name parts** (e.g. `Koza DOMOWA` → `Koza`), and fix wrong facts; it returns `{ "corrections": [ {number, name, latinName, fact} ] }` merged back by `number`.
11. **Single-card editor** with per-card text + image prompts and manual image upload (auto magenta-stripped). **Bulk import** via pasted JSON (Step 1 / Step 2 / checker outputs all auto-detected).
12. **Offline Storage**: All cards and images are saved locally in the browser using IndexedDB.

---

## 2. Hard Constraints
- **Localization:** All card text and UI must be **Polish**; code/JSON keys English.
- **Offline / static:** The only network calls are optional AI calls (made externally by the GM). The app itself must work 100% offline.
- **`deck.json` contract**:
  ```jsonc
  "deck": {
    "domowe":  [ { "number": 1, "name": "...", "category": "domowe", "image": "...", "facts": "...",
                   "color": "pink", "symbol": "⌂", "border": "solid" } ],
    "wymarłe": [ /* ... */ ],
    "jadowite": [ /* ... */ ]
  },
  // category themes travel alongside the deck (not part of core's deck schema):
  "categories": [ { "name": "domowe", "color": "pink", "symbol": "⌂", "border": "solid" } ],
  "masterStyle": "…Pokémon Red/Blue avatar style…"
  ```
  `number` is a stable unique card id. No VP or power fields. `core.validateGame` only
  requires `number/name/category` per card (`additionalProperties: true`), so the
  `color/symbol/border` snapshot + top-level `categories`/`masterStyle` ride along safely.
  `color/symbol/border` are **print styling only** — never a power signal (all cards equal, D12).

---

## 3. Outputs
1. **Printable PDF Sheets**: Generate A4 PDFs with multiple poker-sized cards per page and cut lines.
2. **Export `deck.json`**: For use by the Economy Simulator and other modules.
