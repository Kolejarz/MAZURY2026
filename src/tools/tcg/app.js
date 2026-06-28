// app.js

const DB_NAME = 'OceanRescue_TCG';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

let db;
let currentEditingId = null;

// Master style: a single place to edit the art style applied to every image prompt.
// Cards print in BLACK ink on coloured paper, so the avatar is the only colour on
// the card. We ask for a SIMPLE, low-palette sprite (Pokemon Red/Blue era) on a
// solid magenta key colour the app strips out automatically.
const MASTER_STYLE_KEY = 'OceanRescue_TCG_masterStyle';
const DEFAULT_MASTER_STYLE = 'Styl jak sprite zwierzęcia z gry Pokémon Red/Blue na Game Boya: bardzo uproszczone, czytelne kształty, ograniczona paleta (kilka płaskich kolorów), wyraźne czarne kontury, brak gradientów, brak cieniowania, brak tła scenerii, niski poziom detali, grafika pikselowa/retro.';

function getMasterStyle() {
    return localStorage.getItem(MASTER_STYLE_KEY) || DEFAULT_MASTER_STYLE;
}

// The magenta key colour used as the avatar background. It is the rarest colour
// in real animals, so it strips cleanly. Stripping happens in-browser (canvas).
const CHROMA_HEX = '#FF00FF';
const CHROMA_RGB = [255, 0, 255];
const CHROMA_TOLERANCE_KEY = 'OceanRescue_TCG_chromaTolerance';
function getChromaTolerance() {
    const v = parseInt(localStorage.getItem(CHROMA_TOLERANCE_KEY));
    return Number.isFinite(v) ? v : 90; // 0..255 distance threshold
}

// Paper colours the GM can buy and feed the printer (value + Polish label).
// On screen these tint the card to SIMULATE the stock; nothing colour is printed.
const PAPER_COLORS = [
    ['white', 'Biały'], ['pink', 'Różowy'], ['blue', 'Niebieski'], ['green', 'Zielony'],
    ['yellow', 'Żółty'], ['purple', 'Fioletowy'], ['orange', 'Pomarańczowy'], ['teal', 'Turkusowy'],
    ['cyan', 'Błękitny'], ['indigo', 'Indygo'], ['rose', 'Różany'], ['lime', 'Limonkowy'],
    ['amber', 'Bursztynowy'], ['emerald', 'Szmaragdowy'], ['fuchsia', 'Fuksja'], ['stone', 'Szary'],
    ['red', 'Czerwony']
];

// Black-ink border line-styles (value + Polish label). The line STYLE is what
// distinguishes a category at a glance once everything is printed in black.
const BORDERS = [
    ['solid', 'Ciągła'], ['thick', 'Gruba'], ['double', 'Podwójna'],
    ['dashed', 'Kreskowana'], ['dotted', 'Kropkowana']
];

// Categories store: list of { name, color, symbol, border }, persisted locally.
//  - color  : paper stock the set is printed on (screen tint only)
//  - symbol : a monochrome glyph stamped in black (its SHAPE marks the set)
//  - border : black border line-style (a second at-a-glance marker)
const CATEGORIES_KEY = 'OceanRescue_TCG_categories';
const DEFAULT_CATEGORIES = [
    { name: 'domowe',       color: 'pink',    symbol: '⌂', border: 'solid' },
    { name: 'dzikie',       color: 'lime',    symbol: '✦', border: 'thick' },
    { name: 'leśne',        color: 'green',   symbol: '❧', border: 'dashed' },
    { name: 'morskie',      color: 'blue',    symbol: '≈', border: 'double' },
    { name: 'oceaniczne',   color: 'cyan',    symbol: '∿', border: 'double' },
    { name: 'słodkowodne',  color: 'teal',    symbol: '☂', border: 'dashed' },
    { name: 'ryby',         color: 'blue',    symbol: '❥', border: 'dotted' },
    { name: 'ptaki',        color: 'indigo',  symbol: '✈', border: 'solid' },
    { name: 'gady',         color: 'emerald', symbol: '∾', border: 'dotted' },
    { name: 'płazy',        color: 'lime',    symbol: '☘', border: 'dashed' },
    { name: 'ssaki',        color: 'amber',   symbol: '✿', border: 'solid' },
    { name: 'owady',        color: 'yellow',  symbol: '✺', border: 'dotted' },
    { name: 'pajęczaki',    color: 'stone',   symbol: '✷', border: 'dotted' },
    { name: 'jadowite',     color: 'green',   symbol: '☣', border: 'thick' },
    { name: 'drapieżniki',  color: 'red',     symbol: '✸', border: 'thick' },
    { name: 'roślinożerne', color: 'lime',    symbol: '❦', border: 'solid' },
    { name: 'afrykańskie',  color: 'orange',  symbol: '☀', border: 'solid' },
    { name: 'polarne',      color: 'cyan',    symbol: '❅', border: 'double' },
    { name: 'pustynne',     color: 'amber',   symbol: '☼', border: 'dashed' },
    { name: 'górskie',      color: 'stone',   symbol: '⛰', border: 'thick' },
    { name: 'tropikalne',   color: 'fuchsia', symbol: '✤', border: 'solid' },
    { name: 'nocne',        color: 'indigo',  symbol: '☾', border: 'dotted' },
    { name: 'wymarłe',      color: 'stone',   symbol: '☠', border: 'double' },
    { name: 'zagrożone',    color: 'rose',    symbol: '✚', border: 'dashed' },
    { name: 'gospodarskie', color: 'yellow',  symbol: '✠', border: 'solid' },
    { name: 'egzotyczne',   color: 'purple',  symbol: '❂', border: 'thick' },
    { name: 'gryzonie',     color: 'amber',   symbol: '❖', border: 'dotted' },
    { name: 'naczelne',     color: 'orange',  symbol: '✣', border: 'solid' }
];

// Normalize a stored/imported category to the {name,color,symbol,border} shape,
// migrating the legacy {name, theme} records on the fly.
function normalizeCategory(c) {
    if (!c || !c.name) return null;
    return {
        name: c.name,
        color: c.color || c.theme || 'white',
        symbol: c.symbol || '✦',
        border: c.border || 'solid'
    };
}

function getCategories() {
    try {
        const stored = JSON.parse(localStorage.getItem(CATEGORIES_KEY));
        if (Array.isArray(stored) && stored.length) return stored.map(normalizeCategory).filter(Boolean);
    } catch (e) { /* fall through to defaults */ }
    return DEFAULT_CATEGORIES.slice();
}

function saveCategories(cats) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats.map(normalizeCategory).filter(Boolean)));
}

function paperLabel(value) {
    const found = PAPER_COLORS.find(t => t[0] === value);
    return found ? found[1] : value;
}
function borderLabel(value) {
    const found = BORDERS.find(t => t[0] === value);
    return found ? found[1] : value;
}

// The full style (paper colour + symbol + border) derived from the category.
function styleForCategory(name) {
    const c = getCategories().find(c => c.name === name);
    return normalizeCategory(c) || { color: 'white', symbol: '✦', border: 'solid' };
}

// Fill a category <select> from saved categories; keep `selected` available
// even if it isn't a managed category (e.g. on a legacy/imported card).
function populateCategorySelect(selectEl, selected) {
    if (!selectEl) return;
    let names = getCategories().map(c => c.name);
    if (selected && !names.includes(selected)) names = [selected, ...names];
    selectEl.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join('');
    if (selected) selectEl.value = selected;
}

// Current style (paper colour + symbol + border) for the open editor, derived
// from the chosen category.
function editorStyle() {
    const cat = document.getElementById('card-category').value;
    return styleForCategory(cat);
}

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'number' });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve();
        };

        request.onerror = (e) => reject(e.target.error);
    });
}

async function getAllCards() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveCard(card) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(card);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function deleteCard(number) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(number);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// UI Elements
const els = {
    grid: document.getElementById('cards-grid'),
    btnNew: document.getElementById('btn-new-card'),
    modal: document.getElementById('editor-modal'),
    form: document.getElementById('card-form'),
    btnCancel: document.getElementById('btn-cancel'),
    previewContainer: document.getElementById('card-preview-container'),
    totalCount: document.getElementById('total-cards-count'),
    readout: document.getElementById('deck-readout'),
    btnExportJson: document.getElementById('btn-export-json'),
    btnExportPdf: document.getElementById('btn-export-pdf'),
    btnImportCsv: document.getElementById('btn-import-csv'),
    csvUpload: document.getElementById('csv-upload')
};

// Render Single Card HTML.
// Black ink on coloured paper: the card chrome is all black, the paper tint is
// screen-only, the border line-style + symbol mark the category, and the keyed
// avatar is the single colour element.
function renderCardHtml(card) {
    // Prefer the card's own snapshot, but fall back to the live category style.
    const live = styleForCategory(card.category);
    const color = card.color || live.color || 'white';
    const symbol = card.symbol || live.symbol || '✦';
    const border = card.border || live.border || 'solid';

    // Dynamically adjust font size to try to fit long names
    let nameFontSize = 24;
    if (card.name.length > 18) {
        nameFontSize = 13;
    } else if (card.name.length > 12) {
        nameFontSize = 16;
    } else if (card.name.length > 9) {
        nameFontSize = 19;
    }

    // VS-15 (U+FE0E) forces monochrome (text) presentation so the glyph prints as black ink.
    const glyph = symbol + String.fromCharCode(0xFE0E);

    return `
        <div class="tcg-card paper-${color}">
            <div class="card-inner border-${border}">
                <div class="card-image-container">
                    ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="placeholder-image">🐾</div>`}
                    <div class="card-symbol" title="${card.category || ''}">${glyph}</div>
                </div>
                <div class="card-name-banner" style="font-size: ${nameFontSize}px;">
                    <span class="name-symbol">${glyph}</span><span>${card.name}</span>
                </div>
                <div class="card-fact-box">
                    <div class="card-fact-text">${card.facts || card.fact || ''}</div>
                </div>
            </div>
        </div>
    `;
}

// Update the grid view
async function refreshGrid() {
    const cards = await getAllCards();
    cards.sort((a, b) => a.number - b.number);
    
    els.totalCount.textContent = `${cards.length} kart`;
    
    let html = '';
    const categories = new Set();

    cards.forEach(card => {
        categories.add(card.category);
        // NOTE: the hover buttons live in this grid wrapper (not in renderCardHtml,
        // which is reused for the print sheet), so they never appear on print.
        html += `
            <div class="relative group cursor-pointer" onclick="openEditor(${card.number})">
                ${renderCardHtml(card)}
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl"></div>
                <button onclick="event.stopPropagation(); copyCardPrompt(${card.number}, this)" title="Kopiuj prompt do obrazu" class="absolute -top-2 -left-2 bg-indigo-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs shadow-md hover:bg-indigo-600">🎨</button>
                <button onclick="event.stopPropagation(); doDelete(${card.number})" class="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600">×</button>
            </div>
        `;
    });

    els.grid.innerHTML = html;

    updateReadout(cards);
}

// Update Deck Readout
function updateReadout(cards) {
    const byCat = {};
    cards.forEach(c => {
        const cat = c.category || 'Brak';
        byCat[cat] = (byCat[cat] || 0) + 1;
    });

    let html = '';
    for (const [cat, count] of Object.entries(byCat)) {
        html += `
            <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-1">
                <span class="font-medium text-slate-700">${cat}</span>
                <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">${count} kart</span>
            </div>
        `;
    }
    
    if (cards.length === 0) {
        html = `<div class="text-sm text-slate-500">Talia jest pusta.</div>`;
    }

    els.readout.innerHTML = html;
}

// Editor functionality
window.openEditor = async (number = null) => {
    currentEditingId = number;
    els.form.reset();
    document.getElementById('card-image-data').value = '';
    updatePreview();

    if (number) {
        const cards = await getAllCards();
        const card = cards.find(c => c.number === number);
        if (card) {
            document.getElementById('card-number').value = card.number;
            populateCategorySelect(document.getElementById('card-category'), card.category);
            document.getElementById('card-name').value = card.name;
            const latinEl = document.getElementById('card-latin-name');
            if (latinEl) latinEl.value = card.latinName || '';
            const habitatEl = document.getElementById('card-habitat');
            if (habitatEl) habitatEl.value = card.habitat || '';
            const appearanceEl = document.getElementById('card-appearance');
            if (appearanceEl) appearanceEl.value = card.appearance || '';
            document.getElementById('card-fact').value = card.facts || card.fact;
            document.getElementById('card-image-data').value = card.image || '';
            updatePreview();
        }
        document.getElementById('editor-title').textContent = 'Edytuj Kartę';
    } else {
        document.getElementById('editor-title').textContent = 'Nowa Karta';
        populateCategorySelect(document.getElementById('card-category'));
        // Auto-assign next number
        const cards = await getAllCards();
        const nextNum = cards.length > 0 ? Math.max(...cards.map(c => c.number)) + 1 : 1;
        document.getElementById('card-number').value = nextNum;
    }

    generatePrompt();
    els.modal.classList.remove('hidden');
};

function closeEditor() {
    els.modal.classList.add('hidden');
    currentEditingId = null;
}

window.doDelete = async (number) => {
    if (confirm(`Czy na pewno usunąć kartę NO. ${number}?`)) {
        await deleteCard(number);
        refreshGrid();
    }
};

// Quick-copy the image prompt for a card straight from the grid (hover button).
window.copyCardPrompt = async (number, btn) => {
    const cards = await getAllCards();
    const card = cards.find(c => c.number === number);
    if (!card) return;
    try {
        await navigator.clipboard.writeText(buildImagePrompt(card));
        if (btn) {
            const prev = btn.textContent;
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = prev; }, 1000);
        }
    } catch (e) {
        alert('Nie udało się skopiować prompta: ' + e.message);
    }
};

function updatePreview() {
    const st = editorStyle();
    const card = {
        number: parseInt(document.getElementById('card-number').value) || 0,
        category: document.getElementById('card-category').value || 'Kategoria',
        color: st.color, symbol: st.symbol, border: st.border,
        name: document.getElementById('card-name').value || 'Imię Zwierzęcia',
        latinName: document.getElementById('card-latin-name') ? document.getElementById('card-latin-name').value : '',
        habitat: document.getElementById('card-habitat') ? document.getElementById('card-habitat').value : '',
        appearance: document.getElementById('card-appearance') ? document.getElementById('card-appearance').value : '',
        facts: document.getElementById('card-fact').value || 'Tu pojawi się ciekawostka...',
        image: document.getElementById('card-image-data').value
    };
    els.previewContainer.innerHTML = renderCardHtml(card);
}

// Build the per-animal image-generation prompt (step 3 of the workflow).
// Asks for a simple Pokemon-style sprite on a SOLID MAGENTA key colour that the
// app strips automatically — so the avatar drops cleanly onto the coloured card.
function buildImagePrompt(card) {
    const name = card.name || '';
    const latinName = card.latinName || '';
    const appearance = card.appearance || '';

    const latinContext = latinName ? ` (nazwa łacińska: ${latinName})` : '';
    const appearanceClause = appearance
        ? ` Zadbaj o charakterystyczne cechy wyglądu: ${appearance}.`
        : '';

    return `Prosty sprite jednego zwierzęcia: ${name}${latinContext}. ${getMasterStyle()} Pojedyncze zwierzę wyśrodkowane w kadrze, NIE antropomorficzne (bez ubrań i ludzkiej twarzy).${appearanceClause} JEDNOLITE, GŁADKIE tło w kolorze magenta (#FF00FF) — czysty, nasycony różowo-fioletowy, BEZ scenerii, bez cieni i bez gradientu (tło zostanie automatycznie usunięte). Sam kontur i wnętrze zwierzęcia NIE mogą używać koloru magenta. Brak tekstu, brak liter, brak ramki --ar 1:1`;
}

function generatePrompt() {
    const name = document.getElementById('card-name').value;

    if (name) {
        const cat = document.getElementById('card-category').value;
        document.getElementById('ai-prompt').value = buildImagePrompt({
            name,
            category: cat,
            latinName: document.getElementById('card-latin-name').value,
            habitat: document.getElementById('card-habitat').value,
            appearance: document.getElementById('card-appearance').value,
            facts: document.getElementById('card-fact').value
        });

        const textPromptEl = document.getElementById('text-prompt');
        if (textPromptEl) {
            textPromptEl.value = `Uzupełnij dane karty zwierzęcia: ${name} (kategoria: ${cat}). WERYFIKACJA POPRAWNOŚCI: dokładnie sprawdź polską nazwę gatunkową oraz nazwę łacińską — NIE wymyślaj nazw nieistniejących ani nieprawidłowych. Jeśli nazwa zawiera zbędny człon gatunku (np. "Koza DOMOWA", "Kot DOMOWY"), skróć ją do potocznej formy ("Koza", "Kot"). Napisz fascynującą, nieoczywistą, ale PRAWDZIWĄ i możliwą do zweryfikowania ciekawostkę (np. "wombaty robią sześcienne kupy", "krowy mają najlepszych przyjaciół") — maksymalnie 1-2 zdania, do 120 znaków. Podaj nazwę łacińską oraz krótki opis prawdziwego środowiska (habitat) i charakterystycznych cech wyglądu (appearance, np. brak oczu) — posłużą do wygenerowania poprawnego obrazu. Zwróć wynik TYLKO w formacie JSON: {"name": "skrócona nazwa", "latinName": "nazwa_lacinska", "habitat": "środowisko", "appearance": "cechy wyglądu", "fact": "ciekawostka..."}`;
        }
    }
}

// Event Listeners
els.btnNew.addEventListener('click', () => openEditor());
els.btnCancel.addEventListener('click', closeEditor);

['card-number', 'card-category', 'card-name', 'card-latin-name', 'card-habitat', 'card-appearance', 'card-fact'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => {
            updatePreview();
            generatePrompt();
        });
    }
});

// Strip the solid magenta key colour from an uploaded avatar to transparency,
// so the coloured card paper shows through behind the simple sprite. Runs fully
// in-browser on a canvas — no network, deterministic given the same input.
function stripChroma(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const px = data.data;
                const [kr, kg, kb] = CHROMA_RGB;
                const tol = getChromaTolerance();
                const tol2 = tol * tol;
                for (let i = 0; i < px.length; i += 4) {
                    const dr = px[i] - kr, dg = px[i + 1] - kg, db = px[i + 2] - kb;
                    if (dr * dr + dg * dg + db * db <= tol2) px[i + 3] = 0; // key -> transparent
                }
                ctx.putImageData(data, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                // Tainted canvas or other failure — fall back to the original image.
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// Read a File/Blob to a data URL, strip the magenta key, store it, and refresh.
async function ingestImageFile(file) {
    const dataUrl = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = (ev) => res(ev.target.result);
        reader.readAsDataURL(file);
    });
    const stripped = await stripChroma(dataUrl);
    document.getElementById('card-image-data').value = stripped;
    updatePreview();
}

document.getElementById('card-image-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) ingestImageFile(file);
});

// Clipboard paste support for images and JSON
document.addEventListener('paste', async (e) => {
    // Handle JSON text paste
    const pasteText = (e.clipboardData || window.clipboardData).getData('text');
    if (pasteText) {
        try {
            // Find JSON in the pasted text (in case there is markdown formatting)
            const jsonMatch = pasteText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                if (parsed && parsed.deck) {
                    // A full exported deck — import it (collision-free).
                    await importDeckData(parsed);
                    return;
                }

                // Step 1 output: a categories config { categories: [ {name,color,symbol,border} ] }.
                if (parsed && Array.isArray(parsed.categories) && !Array.isArray(parsed.deck)) {
                    if (await importCategoriesConfig(parsed.categories)) return;
                }

                // Facts-checker output: { corrections: [ {number,name,latinName,fact} ] }.
                if (parsed && Array.isArray(parsed.corrections)) {
                    if (await applyFactCorrections(parsed.corrections)) return;
                }

                if (Array.isArray(parsed)) {
                    // Step 2 output: a bulk list of animals. Derive style from category.
                    const existing = await getAllCards();
                    let nextNum = existing.length > 0 ? Math.max(...existing.map(c => c.number)) + 1 : 1;
                    let added = 0;
                    for (const item of parsed) {
                        if (item.name && (item.fact || item.facts)) {
                            const st = styleForCategory(item.category);
                            await saveCard({
                                number: nextNum++,
                                name: item.name,
                                latinName: item.latinName || '',
                                habitat: item.habitat || '',
                                appearance: item.appearance || '',
                                category: item.category || 'Kategoria',
                                color: item.color || st.color,
                                symbol: item.symbol || st.symbol,
                                border: item.border || st.border,
                                facts: item.fact || item.facts,
                                image: item.image || ''
                            });
                            added++;
                        }
                    }
                    if (added > 0) {
                        alert(`Zaimportowano ${added} kart z JSON!`);
                        refreshGrid();
                    }
                    return; // Successfully handled bulk JSON
                } else {
                    if (!els.modal.classList.contains('hidden')) {
                        let updated = false;
                        if (parsed.category) {
                            const cat = parsed.category.toLowerCase().trim();
                            populateCategorySelect(document.getElementById('card-category'), cat);
                            updated = true;
                        }
                        if (parsed.name) {
                            document.getElementById('card-name').value = parsed.name;
                            updated = true;
                        }
                        if (parsed.fact) {
                            document.getElementById('card-fact').value = parsed.fact;
                            updated = true;
                        }
                        if (parsed.latinName) {
                            document.getElementById('card-latin-name').value = parsed.latinName;
                            updated = true;
                        }
                        if (parsed.habitat) {
                            document.getElementById('card-habitat').value = parsed.habitat;
                            updated = true;
                        }
                        if (parsed.appearance) {
                            document.getElementById('card-appearance').value = parsed.appearance;
                            updated = true;
                        }
                        if (updated) {
                            generatePrompt();
                            updatePreview();
                            return; // Successfully handled JSON
                        }
                    }
                }
            }
        } catch (err) {
            // Not valid JSON, ignore and try processing as image
        }
    }

    // Only handle image pasting if modal is open
    if (els.modal.classList.contains('hidden')) return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            ingestImageFile(file); // strips the magenta key like a normal upload
            break; // Stop after grabbing the first image
        }
    }
});

// Merge a pasted categories config (step 1). Replace-or-merge by name; keep any
// existing categories not present in the import. Returns true if it did anything.
async function importCategoriesConfig(incoming) {
    const clean = incoming.map(normalizeCategory).filter(Boolean);
    if (!clean.length) return false;
    if (!confirm(`Zaimportować ${clean.length} kategorii (motyw: kolor papieru + symbol + ramka)? Istniejące kategorie o tych samych nazwach zostaną zaktualizowane.`)) {
        return true; // handled (user declined) — don't fall through to other branches
    }
    const byName = new Map(getCategories().map(c => [c.name, c]));
    clean.forEach(c => byName.set(c.name, c));
    saveCategories([...byName.values()]);
    renderCategorySettings();
    renderBulkCategoryOptions();
    refreshGrid();
    alert(`Zaktualizowano kategorie (${clean.length}).`);
    return true;
}

// Apply facts-checker corrections (verified names/facts) to existing cards by
// their stable number. Returns true if it handled the payload.
async function applyFactCorrections(corrections) {
    const cards = await getAllCards();
    const byNumber = new Map(cards.map(c => [c.number, c]));
    let changed = 0;
    for (const fix of corrections) {
        const card = byNumber.get(fix.number);
        if (!card) continue;
        if (fix.name) card.name = fix.name;
        if (fix.latinName) card.latinName = fix.latinName;
        if (fix.fact || fix.facts) card.facts = fix.fact || fix.facts;
        await saveCard(card);
        changed++;
    }
    if (changed > 0) {
        alert(`Poprawiono ${changed} kart (nazwy / ciekawostki).`);
        refreshGrid();
    } else {
        alert('Brak dopasowanych kart do poprawek (sprawdź numery).');
    }
    return true;
}

document.getElementById('btn-copy-prompt').addEventListener('click', () => {
    const prompt = document.getElementById('ai-prompt');
    prompt.select();
    document.execCommand('copy');
});

const btnCopyText = document.getElementById('btn-copy-text-prompt');
if (btnCopyText) {
    btnCopyText.addEventListener('click', () => {
        const prompt = document.getElementById('text-prompt');
        prompt.select();
        document.execCommand('copy');
    });
}

els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const st = editorStyle();
    const card = {
        number: parseInt(document.getElementById('card-number').value),
        category: document.getElementById('card-category').value,
        color: st.color, symbol: st.symbol, border: st.border,
        name: document.getElementById('card-name').value,
        latinName: document.getElementById('card-latin-name').value,
        habitat: document.getElementById('card-habitat').value,
        appearance: document.getElementById('card-appearance').value,
        facts: document.getElementById('card-fact').value,
        image: document.getElementById('card-image-data').value
    };
    await saveCard(card);
    closeEditor();
    refreshGrid();
});

// JSON Export — full deck including images, plus category config + master style
// so a whole deck can be moved between computers / shared with another user.
els.btnExportJson.addEventListener('click', async () => {
    const cards = await getAllCards();
    const deck = {};
    cards.forEach(c => {
        const cat = (c.category || 'brak').toLowerCase();
        if (!deck[cat]) deck[cat] = [];
        deck[cat].push(c); // full card object — includes the base64 image
    });

    const payload = { deck, categories: getCategories(), masterStyle: getMasterStyle() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deck.json';
    a.click();
    URL.revokeObjectURL(url);
});

// Normalize an imported payload (exported deck object or a flat array) to cards.
function cardsFromImport(parsed) {
    let raw = [];
    if (Array.isArray(parsed)) {
        raw = parsed;
    } else if (parsed && parsed.deck && typeof parsed.deck === 'object') {
        Object.values(parsed.deck).forEach(arr => { if (Array.isArray(arr)) raw = raw.concat(arr); });
    } else if (parsed && Array.isArray(parsed.cards)) {
        raw = parsed.cards;
    }
    return raw.filter(it => it && it.name).map(it => {
        const st = styleForCategory(it.category);
        return {
            name: it.name,
            latinName: it.latinName || '',
            habitat: it.habitat || '',
            appearance: it.appearance || '',
            category: it.category || 'Kategoria',
            color: it.color || st.color,
            symbol: it.symbol || st.symbol,
            border: it.border || st.border,
            facts: it.facts || it.fact || '',
            image: it.image || ''
        };
    });
}

// Import a deck (from file or paste). Imported cards are always renumbered to a
// fresh, collision-free range so they never clash with the existing deck.
async function importDeckData(parsed) {
    const incoming = cardsFromImport(parsed);
    if (!incoming.length) { alert('Plik nie zawiera kart.'); return; }

    if (Array.isArray(parsed.categories) && parsed.categories.length &&
        confirm('Plik zawiera konfigurację kategorii. Zaimportować ją (zastąpi obecną listę kategorii i motywów)?')) {
        saveCategories(parsed.categories);
        renderCategorySettings();
        renderBulkCategoryOptions();
    }
    if (typeof parsed.masterStyle === 'string' && parsed.masterStyle.trim()) {
        localStorage.setItem(MASTER_STYLE_KEY, parsed.masterStyle);
        const mse = document.getElementById('master-style');
        if (mse) mse.value = parsed.masterStyle;
    }

    const existing = await getAllCards();
    let replace = false;
    if (existing.length) {
        replace = confirm(`W talii jest już ${existing.length} kart.\n\nOK = ZASTĄP całą talię importem.\nAnuluj = DOŁĄCZ import do obecnej talii (bez kolizji numerów).`);
        if (replace) for (const c of existing) await deleteCard(c.number);
    }

    // Assign fresh numbers after the (possibly cleared) deck — never collides.
    const base = await getAllCards();
    let nextNum = base.length ? Math.max(...base.map(c => c.number)) + 1 : 1;
    for (const card of incoming) {
        card.number = nextNum++;
        await saveCard(card);
    }

    alert(`Zaimportowano ${incoming.length} kart${replace ? ' (talia zastąpiona)' : ' (dołączono)'}.`);
    refreshGrid();
}

// Import deck.json from a file.
const btnImportJson = document.getElementById('btn-import-json');
const jsonUpload = document.getElementById('json-upload');
if (btnImportJson && jsonUpload) {
    btnImportJson.addEventListener('click', () => jsonUpload.click());
    jsonUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                await importDeckData(JSON.parse(ev.target.result));
            } catch (err) {
                alert('Nieprawidłowy plik JSON: ' + err.message);
            }
            e.target.value = ''; // allow re-importing the same file
        };
        reader.readAsText(file);
    });
}

// STEP 1 — Categories prompt. Asks the LLM to propose animal categories, each
// with a paper colour, a black monochrome symbol (its SHAPE marks the set), and
// a black border line-style. Output is pasted back to (re)configure categories.
function buildCategoriesPrompt(count) {
    const colors = PAPER_COLORS.map(c => c[0]).join(', ');
    const borders = BORDERS.map(b => b[0]).join(', ');
    return `Jesteś projektantem edukacyjnej gry karcianej o zwierzętach. Zaproponuj ${count} różnych KATEGORII biologicznych zwierząt (np. domowe, polarne, jadowite, leśne, morskie, gady, owady...).
Karty będą drukowane CZARNYM TUSZEM na KOLOROWYM papierze, więc każda kategoria dostaje „motyw" złożony z trzech cech:
1. "color" — kolor papieru (wybierz JEDEN z listy): [${colors}].
2. "symbol" — pojedynczy MONOCHROMATYCZNY znak Unicode, którego KSZTAŁT kojarzy się z kategorią i czytelnie drukuje się na czarno (np. ❅ dla polarnych = płatek śniegu, ☘ dla leśnych = listek, ☣ dla jadowitych, ☀ dla afrykańskich). NIE używaj kolorowych emoji.
3. "border" — styl czarnej ramki (wybierz JEDEN): [${borders}].
Dobierz cechy tak, aby kategorie łatwo było od siebie odróżnić po kształcie symbolu i stylu ramki.
Zwróć wynik TYLKO jako JSON (bez tekstu przed/po):
{"categories": [ {"name": "nazwa małymi literami", "color": "kolor", "symbol": "znak", "border": "styl"} ]}`;
}

// STEP 2 — Animals-within-a-category prompt (the colour/symbol/border come from
// the category, so the LLM does NOT pick them).
function buildBulkPrompt(cat, count) {
    return `Jesteś twórcą kart do gry edukacyjnej. Wygeneruj listę ${count} różnych ZWIERZĄT pasujących do kategorii "${cat}".
WERYFIKACJA POPRAWNOŚCI (kluczowe): wszystkie elementy MUSZĄ być prawdziwymi zwierzętami. Dokładnie sprawdź polską nazwę gatunkową i nazwę łacińską — NIE wymyślaj nazw nieistniejących ani nieprawidłowych. Jeśli potoczna nazwa zawiera zbędny człon (np. "Koza DOMOWA"), użyj krótszej formy ("Koza"). Każda ciekawostka MUSI być prawdziwa i możliwa do zweryfikowania — NIE wymyślaj nieistniejących faktów; ma jednak pozostać nieoczywista i interesująca.
Zwróć wynik TYLKO jako czysty format JSON w postaci tablicy obiektów. Nie dodawaj żadnego tekstu przed ani po JSON.
Format każdego obiektu:
{
  "name": "Polska nazwa gatunkowa (krótka, bez zbędnego członu)",
  "latinName": "Łacińska nazwa gatunkowa",
  "category": "${cat}",
  "habitat": "Krótki opis prawdziwego środowiska naturalnego (do generowania poprawnego obrazu)",
  "appearance": "Charakterystyczne cechy wyglądu, w tym czego gatunek NIE ma (np. brak oczu) — do generowania poprawnego obrazu",
  "fact": "Fascynująca, nieoczywista i PRAWDZIWA ciekawostka (np. krowy mają przyjaciół, wombaty robią sześcienne kupy). MUSI być bardzo krótka (max 120 znaków, 1-2 zdania) aby zmieściła się na małej karcie!"
}`;
}

// FACTS CHECKER — hands an independent LLM agent the current deck (number + both
// names + fact) to verify correctness, trim redundant name parts, and fix facts.
function buildCheckerPrompt(cards) {
    const list = cards.map(c => ({
        number: c.number,
        name: c.name,
        latinName: c.latinName || '',
        fact: c.facts || c.fact || ''
    }));
    return `Jesteś niezależnym recenzentem-biologiem. Sprawdź poniższą listę kart zwierząt. Dla KAŻDEJ karty:
1. Zweryfikuj, że polska nazwa i nazwa łacińska są poprawne i odnoszą się do tego samego, istniejącego gatunku. Jeśli nazwa zawiera zbędny człon gatunku (np. "Koza DOMOWA" → "Koza", "Kot DOMOWY" → "Kot"), skróć ją do potocznej formy.
2. Zweryfikuj, że ciekawostka jest PRAWDZIWA i możliwa do potwierdzenia. Jeśli jest błędna lub zmyślona — popraw ją na prawdziwą, krótką (do 120 znaków), nieoczywistą ciekawostkę.
Zwróć TYLKO JSON z poprawkami (zachowaj te same "number"):
{"corrections": [ {"number": 1, "name": "poprawiona nazwa", "latinName": "poprawiona nazwa łacińska", "fact": "poprawiona ciekawostka"} ]}
Dane do sprawdzenia:
${JSON.stringify(list, null, 2)}`;
}

function bulkParams() {
    const cat = document.getElementById('bulk-category').value || 'Zwierzęta';
    return {
        cat,
        count: parseInt(document.getElementById('bulk-count').value) || 10
    };
}

// STEP 1 button — copy the categories prompt.
const btnCatPrompt = document.getElementById('btn-categories-prompt');
if (btnCatPrompt) {
    btnCatPrompt.addEventListener('click', () => {
        const count = parseInt(document.getElementById('categories-count')?.value) || 12;
        navigator.clipboard.writeText(buildCategoriesPrompt(count)).then(() => {
            alert('Prompt KATEGORII skopiowany! Wklej go do ChatGPT/Claude, skopiuj wynikowy JSON i naciśnij Ctrl+V gdziekolwiek w tej aplikacji, aby skonfigurować kategorie.');
        });
    });
}

// STEP 2 button — copy the per-category animals prompt.
const btnBulkPrompt = document.getElementById('btn-bulk-prompt');
if (btnBulkPrompt) {
    btnBulkPrompt.addEventListener('click', () => {
        const { cat, count } = bulkParams();
        navigator.clipboard.writeText(buildBulkPrompt(cat, count)).then(() => {
            alert('Prompt skopiowany! Wklej go do ChatGPT/Claude, a następnie skopiuj wynikowy kod JSON i naciśnij Ctrl+V gdziekolwiek w tej aplikacji by wygenerować karty.');
        });
    });
}

// FACTS CHECKER button — copy a verification prompt for the whole deck.
const btnCheckerPrompt = document.getElementById('btn-checker-prompt');
if (btnCheckerPrompt) {
    btnCheckerPrompt.addEventListener('click', async () => {
        const cards = await getAllCards();
        if (!cards.length) { alert('Talia jest pusta — brak kart do sprawdzenia.'); return; }
        cards.sort((a, b) => a.number - b.number);
        navigator.clipboard.writeText(buildCheckerPrompt(cards)).then(() => {
            alert(`Prompt SPRAWDZAJĄCY (${cards.length} kart) skopiowany! Wklej go do osobnego agenta LLM, skopiuj wynikowy JSON i naciśnij Ctrl+V, aby nanieść poprawki.`);
        });
    });
}

// Delete All
const btnDeleteAll = document.getElementById('btn-delete-all');
if (btnDeleteAll) {
    btnDeleteAll.addEventListener('click', async () => {
        if (confirm('UWAGA! Czy na pewno chcesz usunąć WSZYSTKIE karty z bazy danych? Tej operacji nie można cofnąć.')) {
            const cards = await getAllCards();
            for (const c of cards) {
                await deleteCard(c.number);
            }
            refreshGrid();
        }
    });
}

// PDF Export (using browser print)
els.btnExportPdf.addEventListener('click', async () => {
    const cards = await getAllCards();
    cards.sort((a, b) => a.number - b.number);
    
    if (cards.length === 0) {
        alert("Brak kart do druku!");
        return;
    }

    const printContainer = document.getElementById('print-container');
    printContainer.innerHTML = '';

    // Group cards by category so a page never mixes categories — each category's
    // cards start on a fresh page. Preserve category order by first appearance
    // (cards are already sorted by number), and number order within a category.
    const byCategory = new Map();
    cards.forEach(card => {
        const cat = card.category || 'Brak';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat).push(card);
    });

    // Paginate within each category: 9 cards per A4 page (3x3 grid).
    const CARDS_PER_PAGE = 9;

    byCategory.forEach(catCards => {
        for (let i = 0; i < catCards.length; i += CARDS_PER_PAGE) {
            const pageCards = catCards.slice(i, i + CARDS_PER_PAGE);
            const pageEl = document.createElement('div');
            pageEl.className = 'print-page';

            pageCards.forEach(card => {
                const cardEl = document.createElement('div');
                // Extract the inner HTML of the card rendering
                cardEl.innerHTML = renderCardHtml(card);
                pageEl.appendChild(cardEl.firstElementChild);
            });

            printContainer.appendChild(pageEl);
        }
    });

    window.print();
});

// Populate a <select> with the paper-colour options.
function populatePaperSelect(selectEl, selectedValue) {
    if (!selectEl) return;
    selectEl.innerHTML = PAPER_COLORS.map(([value, label]) =>
        `<option value="${value}">${label}</option>`).join('');
    if (selectedValue) selectEl.value = selectedValue;
}

// Populate a <select> with the border line-style options.
function populateBorderSelect(selectEl, selectedValue) {
    if (!selectEl) return;
    selectEl.innerHTML = BORDERS.map(([value, label]) =>
        `<option value="${value}">${label}</option>`).join('');
    if (selectedValue) selectEl.value = selectedValue;
}

// Fill the Bulk Generator category dropdown from the saved categories.
function renderBulkCategoryOptions() {
    const sel = document.getElementById('bulk-category');
    if (!sel) return;
    const prev = sel.value;
    const cats = getCategories();
    sel.innerHTML = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    // Restore previous selection if still present, otherwise default to first.
    if (cats.some(c => c.name === prev)) sel.value = prev;
}

// Render the editable category list in the settings pane.
function renderCategorySettings() {
    const list = document.getElementById('category-settings-list');
    if (!list) return;
    const cats = getCategories();
    if (!cats.length) {
        list.innerHTML = `<div class="text-sm text-slate-500">Brak kategorii.</div>`;
        return;
    }
    list.innerHTML = cats.map(c => `
        <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-1">
            <span class="flex items-center gap-2 min-w-0">
                <span class="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 paper-${c.color} text-[11px]" style="background: var(--paper); border: 1px solid #000;">${c.symbol || ''}</span>
                <span class="font-medium text-slate-700 truncate">${c.name}</span>
                <span class="text-[10px] text-slate-400 shrink-0">${paperLabel(c.color)} · ${borderLabel(c.border)}</span>
            </span>
            <button data-cat="${c.name}" class="cat-del text-red-500 hover:text-red-700 font-bold px-2 shrink-0">×</button>
        </div>
    `).join('');
    list.querySelectorAll('.cat-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.getAttribute('data-cat');
            saveCategories(getCategories().filter(c => c.name !== name));
            renderCategorySettings();
            renderBulkCategoryOptions();
            refreshGrid();
        });
    });
}

// Wire up the categories settings pane and the bulk dropdown.
populatePaperSelect(document.getElementById('new-category-color'));
populateBorderSelect(document.getElementById('new-category-border'));
renderBulkCategoryOptions();
renderCategorySettings();

const btnAddCategory = document.getElementById('btn-add-category');
if (btnAddCategory) {
    btnAddCategory.addEventListener('click', () => {
        const nameEl = document.getElementById('new-category-name');
        const colorEl = document.getElementById('new-category-color');
        const symbolEl = document.getElementById('new-category-symbol');
        const borderEl = document.getElementById('new-category-border');
        const name = nameEl.value.trim().toLowerCase();
        if (!name) { alert('Podaj nazwę kategorii.'); return; }
        const cats = getCategories();
        if (cats.some(c => c.name === name)) { alert('Taka kategoria już istnieje.'); return; }
        cats.push({
            name,
            color: colorEl.value,
            symbol: (symbolEl.value || '✦').trim(),
            border: borderEl.value
        });
        saveCategories(cats);
        nameEl.value = '';
        if (symbolEl) symbolEl.value = '';
        renderCategorySettings();
        renderBulkCategoryOptions();
        document.getElementById('bulk-category').value = name;
        refreshGrid();
    });
}

// Chroma tolerance: load persisted value, reflect in the label, persist on change.
const chromaEl = document.getElementById('chroma-tolerance');
const chromaValEl = document.getElementById('chroma-tolerance-val');
if (chromaEl) {
    chromaEl.value = getChromaTolerance();
    if (chromaValEl) chromaValEl.textContent = chromaEl.value;
    chromaEl.addEventListener('input', () => {
        localStorage.setItem(CHROMA_TOLERANCE_KEY, chromaEl.value);
        if (chromaValEl) chromaValEl.textContent = chromaEl.value;
    });
}

// Master style: load persisted value and save on edit.
const masterStyleEl = document.getElementById('master-style');
if (masterStyleEl) {
    masterStyleEl.value = getMasterStyle();
    masterStyleEl.addEventListener('input', () => {
        localStorage.setItem(MASTER_STYLE_KEY, masterStyleEl.value);
        // Refresh the open editor's image prompt to reflect the new style.
        if (!els.modal.classList.contains('hidden')) generatePrompt();
    });
}

// Boot
initDB().then(() => {
    refreshGrid();
}).catch(e => {
    console.error("IndexedDB error:", e);
    alert("Błąd ładowania bazy danych. Sprawdź konsolę.");
});
