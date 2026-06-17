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
3. **Card Fields**: Number (unique ID), Name, Category (badge), Illustration, and "Ciekawostka" (fun fact). No height/weight.
4. **Visual Style**: Clean, modern cartoon style. Standard poker card size (63x88mm). Themed styling where colors and badges adapt to the category.
5. **Deck-supply readout** — cards per category vs. expected saves across the camp (`12 teams × 3/visit × turns`). Flag over/under-supply per category.
6. **Workflow**:
    - **Single-card editor**: Form to enter card details, generate an AI prompt (which the GM copies to an external tool), and manually upload the generated image.
    - **Batch import**: Support importing a CSV (`Name, Category, Fun Fact`) to quickly bootstrap the deck.
7. **Offline Storage**: All cards and images are saved locally in the browser using IndexedDB.

---

## 2. Hard Constraints
- **Localization:** All card text and UI must be **Polish**; code/JSON keys English.
- **Offline / static:** The only network calls are optional AI calls (made externally by the GM). The app itself must work 100% offline.
- **`deck.json` contract**:
  ```jsonc
  "deck": {
    "domowe":  [ { "number": 1, "name": "...", "category": "domowe", "image": "...", "facts": "..." } ],
    "wymarłe": [ /* ... */ ], 
    "jadowite": [ /* ... */ ]
  }
  ```
  `number` is a stable unique card id. No VP or power fields.

---

## 3. Outputs
1. **Printable PDF Sheets**: Generate A4 PDFs with multiple poker-sized cards per page and cut lines.
2. **Export `deck.json`**: For use by the Economy Simulator and other modules.
