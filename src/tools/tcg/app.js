// app.js

const DB_NAME = 'OceanRescue_TCG';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

let db;
let currentEditingId = null;

// Master style: a single place to edit the art style applied to every image prompt.
const MASTER_STYLE_KEY = 'OceanRescue_TCG_masterStyle';
const DEFAULT_MASTER_STYLE = 'Radosny, przyjazny i uproszczony styl komiksowy dla dzieci, grube czarne kontury, płaskie i żywe kolory, lekki cel-shading, wysokiej jakości grafika 2D.';

function getMasterStyle() {
    return localStorage.getItem(MASTER_STYLE_KEY) || DEFAULT_MASTER_STYLE;
}

// Color themes available for cards (value + Polish label).
const THEMES = [
    ['pink', 'Różowy'], ['blue', 'Niebieski'], ['green', 'Zielony'], ['yellow', 'Żółty'],
    ['purple', 'Fioletowy'], ['orange', 'Pomarańczowy'], ['teal', 'Turkusowy'], ['cyan', 'Błękitny'],
    ['indigo', 'Indygo'], ['rose', 'Różany'], ['lime', 'Limonkowy'], ['amber', 'Bursztynowy'],
    ['emerald', 'Szmaragdowy'], ['fuchsia', 'Fuksja'], ['stone', 'Szary'], ['red', 'Czerwony']
];

// Categories store: list of { name, theme }, persisted in localStorage.
// Pre-seeded with the most obvious animal categories and a matching theme each.
const CATEGORIES_KEY = 'OceanRescue_TCG_categories';
const DEFAULT_CATEGORIES = [
    { name: 'domowe', theme: 'pink' },
    { name: 'dzikie', theme: 'lime' },
    { name: 'leśne', theme: 'green' },
    { name: 'morskie', theme: 'blue' },
    { name: 'oceaniczne', theme: 'cyan' },
    { name: 'słodkowodne', theme: 'teal' },
    { name: 'ryby', theme: 'blue' },
    { name: 'ptaki', theme: 'indigo' },
    { name: 'gady', theme: 'emerald' },
    { name: 'płazy', theme: 'lime' },
    { name: 'ssaki', theme: 'amber' },
    { name: 'owady', theme: 'yellow' },
    { name: 'pajęczaki', theme: 'stone' },
    { name: 'jadowite', theme: 'green' },
    { name: 'drapieżniki', theme: 'red' },
    { name: 'roślinożerne', theme: 'lime' },
    { name: 'afrykańskie', theme: 'orange' },
    { name: 'polarne', theme: 'cyan' },
    { name: 'pustynne', theme: 'amber' },
    { name: 'górskie', theme: 'stone' },
    { name: 'tropikalne', theme: 'fuchsia' },
    { name: 'nocne', theme: 'indigo' },
    { name: 'wymarłe', theme: 'stone' },
    { name: 'zagrożone', theme: 'rose' },
    { name: 'gospodarskie', theme: 'yellow' },
    { name: 'egzotyczne', theme: 'purple' },
    { name: 'gryzonie', theme: 'amber' },
    { name: 'naczelne', theme: 'orange' }
];

function getCategories() {
    try {
        const stored = JSON.parse(localStorage.getItem(CATEGORIES_KEY));
        if (Array.isArray(stored) && stored.length) return stored;
    } catch (e) { /* fall through to defaults */ }
    return DEFAULT_CATEGORIES.slice();
}

function saveCategories(cats) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}

function themeLabel(value) {
    const found = THEMES.find(t => t[0] === value);
    return found ? found[1] : value;
}

// ---------------------------------------------------------------------------
// Gemini automation (optional, pre-camp): generate facts JSON + card images.
// Defaults to the most cost-effective Gemini models; budget is limited.
// ---------------------------------------------------------------------------
const GEMINI_KEY_KEY = 'OceanRescue_TCG_geminiKey';
const TEXT_MODEL_KEY = 'OceanRescue_TCG_textModel';
const IMAGE_MODEL_KEY = 'OceanRescue_TCG_imageModel';
const PRICING_KEY = 'OceanRescue_TCG_pricing';

// Cheapest viable models in the Gemini family.
const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';

// USD list prices (editable in the UI). Text is per 1M tokens; image is per image.
const DEFAULT_PRICING = { textIn: 0.10, textOut: 0.40, image: 0.039 };

// Rough token assumptions used only for the up-front estimate.
const EST_TEXT_INPUT_TOKENS = 350;
const EST_TEXT_OUTPUT_TOKENS_PER_CARD = 90;

const automation = { running: false, cancel: false, cost: 0 };

function getPricing() {
    try {
        const p = JSON.parse(localStorage.getItem(PRICING_KEY));
        if (p) return { ...DEFAULT_PRICING, ...p };
    } catch (e) { /* defaults */ }
    return { ...DEFAULT_PRICING };
}

function geminiKey() { return (document.getElementById('gemini-key').value || '').trim(); }
function textModel() { return (document.getElementById('gemini-text-model').value || '').trim() || DEFAULT_TEXT_MODEL; }
function imageModel() { return (document.getElementById('gemini-image-model').value || '').trim() || DEFAULT_IMAGE_MODEL; }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractJson(text) {
    const m = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    return m ? m[0] : text;
}

async function callGeminiText(prompt) {
    const key = geminiKey();
    if (!key) throw new Error('Brak klucza API Gemini.');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${textModel()}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 1.0, responseMimeType: 'application/json' }
        })
    });
    if (!res.ok) throw new Error(`Gemini (tekst) ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return { text: parts.map(p => p.text || '').join(''), usage: data?.usageMetadata || {} };
}

async function callGeminiImage(prompt) {
    const key = geminiKey();
    if (!key) throw new Error('Brak klucza API Gemini.');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel()}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) throw new Error(`Gemini (obraz) ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData || p.inline_data);
    const inline = imgPart && (imgPart.inlineData || imgPart.inline_data);
    if (!inline) throw new Error('Brak danych obrazu w odpowiedzi.');
    const mime = inline.mimeType || inline.mime_type || 'image/png';
    return { dataUrl: `data:${mime};base64,${inline.data}`, usage: data?.usageMetadata || {} };
}

// --- Cost estimate -------------------------------------------------------
function estimateTextCost(count, pricing) {
    return (EST_TEXT_INPUT_TOKENS * pricing.textIn + count * EST_TEXT_OUTPUT_TOKENS_PER_CARD * pricing.textOut) / 1e6;
}

async function updateCostEstimate(cards) {
    const el = document.getElementById('cost-estimate');
    if (!el) return;
    if (!cards) cards = await getAllCards();
    const pricing = getPricing();
    const count = parseInt(document.getElementById('bulk-count').value) || 0;
    const missingImages = cards.filter(c => !c.image).length;
    const textCost = estimateTextCost(count, pricing);
    const imageCost = missingImages * pricing.image;
    el.innerHTML = `
        <div class="font-semibold">Szacowany koszt (USD)</div>
        <div>Teksty: ~$${textCost.toFixed(4)} (${count} kart)</div>
        <div>Obrazy: ~$${imageCost.toFixed(2)} (${missingImages} brakujących)</div>
        <div class="border-t border-amber-300 mt-1 pt-1 font-bold">Razem: ~$${(textCost + imageCost).toFixed(2)}</div>`;
}

// --- Progress UI ---------------------------------------------------------
function showProgress(show) {
    const el = document.getElementById('automation-progress');
    if (el) el.classList.toggle('hidden', !show);
}
function setProgress(done, total, status) {
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = total ? `${Math.round((done / total) * 100)}%` : '0%';
    const st = document.getElementById('progress-status');
    if (st) st.textContent = status || `${done} / ${total}`;
}
function setCostReadout() {
    const el = document.getElementById('progress-cost');
    if (el) el.textContent = `Koszt sesji: $${automation.cost.toFixed(4)}`;
}

// --- Batch: generate facts JSON -----------------------------------------
async function runBulkTextGeneration() {
    if (automation.running) return;
    if (!geminiKey()) { alert('Podaj klucz API Gemini.'); return; }
    const { cat, theme, count } = bulkParams();
    const pricing = getPricing();
    if (!confirm(`Wygenerować ${count} kart (teksty) dla kategorii „${cat}"? Szacowany koszt: ~$${estimateTextCost(count, pricing).toFixed(4)}.`)) return;

    automation.running = true;
    automation.cancel = false;
    showProgress(true);
    setProgress(0, 1, 'Generowanie tekstów…');
    try {
        const { text, usage } = await callGeminiText(buildBulkPrompt(cat, theme, count));
        automation.cost += ((usage.promptTokenCount || 0) * pricing.textIn + (usage.candidatesTokenCount || 0) * pricing.textOut) / 1e6;
        setCostReadout();

        const arr = JSON.parse(extractJson(text));
        if (!Array.isArray(arr)) throw new Error('Odpowiedź nie jest tablicą JSON.');

        const existing = await getAllCards();
        let nextNum = existing.length ? Math.max(...existing.map(c => c.number)) + 1 : 1;
        let added = 0;
        for (const item of arr) {
            if (!item.name || !(item.fact || item.facts)) continue;
            await saveCard({
                number: nextNum++,
                name: item.name,
                latinName: item.latinName || '',
                habitat: item.habitat || '',
                appearance: item.appearance || '',
                category: item.category || cat,
                theme: item.theme || theme,
                facts: item.fact || item.facts,
                image: ''
            });
            added++;
        }
        setProgress(1, 1, `Dodano ${added} kart.`);
        refreshGrid();
    } catch (e) {
        setProgress(0, 1, `Błąd: ${e.message}`);
        alert('Błąd generowania tekstów: ' + e.message);
    } finally {
        automation.running = false;
    }
}

// --- Batch: generate missing images -------------------------------------
async function runImageGeneration() {
    if (automation.running) return;
    if (!geminiKey()) { alert('Podaj klucz API Gemini.'); return; }
    const all = await getAllCards();
    const targets = all.filter(c => !c.image).sort((a, b) => a.number - b.number);
    if (!targets.length) { alert('Wszystkie karty mają już obrazy.'); return; }

    const pricing = getPricing();
    if (!confirm(`Wygenerować ${targets.length} obrazów? Szacowany koszt: ~$${(targets.length * pricing.image).toFixed(2)}. Proces można zatrzymać w dowolnym momencie.`)) return;

    automation.running = true;
    automation.cancel = false;
    showProgress(true);

    let done = 0, failures = 0;
    for (const card of targets) {
        if (automation.cancel) { setProgress(done, targets.length, `Zatrzymano (${done}/${targets.length}).`); break; }
        setProgress(done, targets.length, `Obraz ${done + 1}/${targets.length}: ${card.name}`);
        try {
            const { dataUrl } = await callGeminiImage(buildImagePrompt(card));
            card.image = dataUrl;
            await saveCard(card);
            automation.cost += pricing.image;
            setCostReadout();
            done++;
            refreshGrid();
        } catch (e) {
            failures++;
            setProgress(done, targets.length, `Błąd: ${e.message}`);
            // First call failing usually means a config/auth problem — abort early.
            if (done === 0) { alert('Błąd generowania obrazu (przerwano): ' + e.message); break; }
        }
        if (automation.cancel) break;
        await sleep(700); // gentle pacing — controllable, not fast
    }

    automation.running = false;
    if (!automation.cancel) setProgress(done, targets.length, `Gotowe: ${done} obrazów, błędów: ${failures}.`);
    refreshGrid();
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
    csvUpload: document.getElementById('csv-upload'),
    categoryList: document.getElementById('category-list')
};

// Render Single Card HTML
function renderCardHtml(card) {
    const theme = `theme-${card.theme || 'pink'}`;
    
    // Dynamically adjust font size to try to fit long names
    let nameFontSize = 24;
    if (card.name.length > 18) {
        nameFontSize = 14;
    } else if (card.name.length > 12) {
        nameFontSize = 17;
    } else if (card.name.length > 9) {
        nameFontSize = 20;
    }

    return `
        <div class="tcg-card ${theme}">
            <div class="card-inner">
                <div class="card-image-container">
                    ${card.image ? `<img src="${card.image}" class="card-image" alt="${card.name}">` : `<div class="placeholder-image">📷</div>`}
                </div>
                <div class="card-name-banner" style="font-size: ${nameFontSize}px;">${card.name}</div>
                <div class="card-fact-box">
                    <div class="card-fact-title">CIEKAWOSTKA</div>
                    <div class="card-fact-text">${card.facts || card.fact}</div>
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
        html += `
            <div class="relative group cursor-pointer" onclick="openEditor(${card.number})">
                ${renderCardHtml(card)}
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl"></div>
                <button onclick="event.stopPropagation(); doDelete(${card.number})" class="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600">×</button>
            </div>
        `;
    });
    
    els.grid.innerHTML = html;
    
    // Update datalist for categories (saved categories + any used on existing cards)
    getCategories().forEach(c => categories.add(c.name));
    els.categoryList.innerHTML = Array.from(categories).map(c => `<option value="${c}">`).join('');

    updateReadout(cards);
    updateCostEstimate(cards);
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
            document.getElementById('card-category').value = card.category;
            document.getElementById('card-name').value = card.name;
            const latinEl = document.getElementById('card-latin-name');
            if (latinEl) latinEl.value = card.latinName || '';
            const habitatEl = document.getElementById('card-habitat');
            if (habitatEl) habitatEl.value = card.habitat || '';
            const appearanceEl = document.getElementById('card-appearance');
            if (appearanceEl) appearanceEl.value = card.appearance || '';
            if (card.theme) document.getElementById('card-theme').value = card.theme;
            document.getElementById('card-fact').value = card.facts || card.fact;
            document.getElementById('card-image-data').value = card.image || '';
            updatePreview();
        }
        document.getElementById('editor-title').textContent = 'Edytuj Kartę';
    } else {
        document.getElementById('editor-title').textContent = 'Nowa Karta';
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

function updatePreview() {
    const card = {
        number: parseInt(document.getElementById('card-number').value) || 0,
        category: document.getElementById('card-category').value || 'Kategoria',
        theme: document.getElementById('card-theme').value || 'pink',
        name: document.getElementById('card-name').value || 'Imię Zwierzęcia',
        latinName: document.getElementById('card-latin-name') ? document.getElementById('card-latin-name').value : '',
        habitat: document.getElementById('card-habitat') ? document.getElementById('card-habitat').value : '',
        appearance: document.getElementById('card-appearance') ? document.getElementById('card-appearance').value : '',
        facts: document.getElementById('card-fact').value || 'Tu pojawi się ciekawostka...',
        image: document.getElementById('card-image-data').value
    };
    els.previewContainer.innerHTML = renderCardHtml(card);
}

// Build the image-generation prompt from a card object (used by both the
// single-card editor and the batch automation).
function buildImagePrompt(card) {
    const name = card.name || '';
    const cat = card.category || '';
    const theme = card.theme || 'pink';
    const latinName = card.latinName || '';
    const habitat = card.habitat || '';
    const appearance = card.appearance || '';
    const fact = card.facts || card.fact || '';

    const latinContext = latinName ? ` (nazwa łacińska: ${latinName})` : '';
    const factLine = fact
        ? `\nCIEKAWOSTKA (kontekst — pokaż wizualnie tylko jeśli ma to sens): „${fact}".`
        : '';
    // Prefer an explicit habitat; otherwise fall back to the category.
    const envDescription = habitat || `środowisko właściwe dla kategorii „${cat}"`;
    const appearanceLine = appearance
        ? `\nCECHY SZCZEGÓLNE WYGLĄDU (odwzoruj wiernie): ${appearance}.`
        : '';

    return `Ilustracja jednego zwierzęcia na kartę kolekcjonerską dla dzieci.
PODMIOT: ${name}${latinContext}. Przedstaw gatunek wiernie i rozpoznawalnie, zgodnie z jego prawdziwym wyglądem.${factLine}${appearanceLine}
ŚRODOWISKO: umieść zwierzę w jego PRAWDZIWYM, naturalnym środowisku — ${envDescription}. Środowisko MUSI pasować do gatunku (ryba w wodzie, zwierzę pustynne na pustyni). NIGDY nie umieszczaj zwierzęcia w obcym mu habitacie. Tło rozmyte, pastelowe (motyw kolorystyczny: ${theme}).
STYL: ${getMasterStyle()}
KOMPOZYCJA: jedno zwierzę, wyśrodkowane, ujęcie portretowe 3:4, bez tekstu i liter.
NIE POKAZUJ (negatywy): antropomorfizacji (ubrań, ludzkiej twarzy, chodzenia na dwóch nogach); cech anatomicznych, których gatunek NIE posiada (np. oczu u zwierząt bez oczu, nóg u węży, uszu u ryb); błędnego środowiska; tekstu, napisów, znaków wodnych, ramek.
--ar 3:4 --no text, letters, watermark, frame, human features, clothing, wrong habitat`;
}

function generatePrompt() {
    const name = document.getElementById('card-name').value;

    if (name) {
        document.getElementById('ai-prompt').value = buildImagePrompt({
            name,
            category: document.getElementById('card-category').value,
            theme: document.getElementById('card-theme').value,
            latinName: document.getElementById('card-latin-name').value,
            habitat: document.getElementById('card-habitat').value,
            appearance: document.getElementById('card-appearance').value,
            facts: document.getElementById('card-fact').value
        });

        const textPromptEl = document.getElementById('text-prompt');
        if (textPromptEl) {
            textPromptEl.value = `Napisz fascynującą, nieoczywistą ciekawostkę o zwierzęciu: ${name}. WERYFIKACJA POPRAWNOŚCI: dokładnie sprawdź polską nazwę gatunkową oraz nazwę łacińską — NIE wymyślaj nazw nieistniejących ani nieprawidłowych. Ciekawostka MUSI być prawdziwa i możliwa do zweryfikowania — NIE wymyślaj nieistniejących faktów; ma jednak pozostać nieoczywista i interesująca (np. "wombaty robią sześcienne kupy", "krowy mają najlepszych przyjaciół"). Ciekawostka MUSI być bardzo krótka (maksymalnie 1-2 zdania, do 120 znaków), aby zmieściła się na małej karcie. Zasugeruj jedną kategorię (np. DOMOWE, LEŚNE). Wybierz jeden pasujący kolor: [pink, blue, green, yellow, purple, orange, teal, cyan, indigo, rose, lime, amber, emerald, fuchsia, stone, red]. Podaj nazwę łacińską oraz krótki opis prawdziwego środowiska (habitat) i charakterystycznych cech wyglądu (appearance, np. brak oczu) — posłużą do wygenerowania poprawnego obrazu. Zwróć wynik TYLKO w formacie JSON: {"category": "KATEGORIA", "theme": "kolor", "latinName": "nazwa_lacinska", "habitat": "środowisko", "appearance": "cechy wyglądu", "fact": "ciekawostka..."}`;
        }
    }
}

// Event Listeners
els.btnNew.addEventListener('click', () => openEditor());
els.btnCancel.addEventListener('click', closeEditor);

['card-number', 'card-category', 'card-theme', 'card-name', 'card-latin-name', 'card-habitat', 'card-appearance', 'card-fact'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => {
            updatePreview();
            generatePrompt();
        });
    }
});

document.getElementById('card-image-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('card-image-data').value = ev.target.result;
            updatePreview();
        };
        reader.readAsDataURL(file);
    }
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
                
                if (Array.isArray(parsed)) {
                    // Bulk import
                    const existing = await getAllCards();
                    let nextNum = existing.length > 0 ? Math.max(...existing.map(c => c.number)) + 1 : 1;
                    let added = 0;
                    for (const item of parsed) {
                        if (item.name && (item.fact || item.facts)) {
                            await saveCard({
                                number: nextNum++,
                                name: item.name,
                                latinName: item.latinName || '',
                                habitat: item.habitat || '',
                                appearance: item.appearance || '',
                                category: item.category || 'Kategoria',
                                theme: item.theme || 'pink',
                                facts: item.fact || item.facts,
                                image: ''
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
                            document.getElementById('card-category').value = parsed.category.toUpperCase();
                            updated = true;
                        }
                        if (parsed.fact) {
                            document.getElementById('card-fact').value = parsed.fact;
                            updated = true;
                        }
                        if (parsed.theme) {
                            const themeSelect = document.getElementById('card-theme');
                            const validThemes = Array.from(themeSelect.options).map(o => o.value);
                            const cleanTheme = parsed.theme.toLowerCase().trim();
                            if (validThemes.includes(cleanTheme)) {
                                themeSelect.value = cleanTheme;
                                updated = true;
                            }
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
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('card-image-data').value = ev.target.result;
                updatePreview();
            };
            reader.readAsDataURL(file);
            break; // Stop after grabbing the first image
        }
    }
});

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
    const card = {
        number: parseInt(document.getElementById('card-number').value),
        category: document.getElementById('card-category').value,
        theme: document.getElementById('card-theme').value,
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

// JSON Export
els.btnExportJson.addEventListener('click', async () => {
    const cards = await getAllCards();
    const deck = {};
    cards.forEach(c => {
        const cat = c.category.toLowerCase();
        if (!deck[cat]) deck[cat] = [];
        deck[cat].push(c);
    });
    
    const blob = new Blob([JSON.stringify({ deck }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deck.json';
    a.click();
    URL.revokeObjectURL(url);
});

// Build the bulk text-generation prompt (shared by the copy button and the
// Gemini automation).
function buildBulkPrompt(cat, theme, count) {
    return `Jesteś twórcą kart do gry edukacyjnej. Wygeneruj listę ${count} różnych ZWIERZĄT pasujących do kategorii "${cat}".
WERYFIKACJA POPRAWNOŚCI (kluczowe): wszystkie elementy MUSZĄ być prawdziwymi zwierzętami. Dokładnie sprawdź polską nazwę gatunkową i nazwę łacińską — NIE wymyślaj nazw nieistniejących ani nieprawidłowych. Każda ciekawostka MUSI być prawdziwa i możliwa do zweryfikowania — NIE wymyślaj nieistniejących faktów; ma jednak pozostać nieoczywista i interesująca.
Zwróć wynik TYLKO jako czysty format JSON w postaci tablicy obiektów. Nie dodawaj żadnego tekstu przed ani po JSON.
Format każdego obiektu:
{
  "name": "Polska nazwa gatunkowa",
  "latinName": "Łacińska nazwa gatunkowa",
  "category": "${cat.toUpperCase()}",
  "theme": "${theme}",
  "habitat": "Krótki opis prawdziwego środowiska naturalnego (do generowania poprawnego obrazu)",
  "appearance": "Charakterystyczne cechy wyglądu, w tym czego gatunek NIE ma (np. brak oczu) — do generowania poprawnego obrazu",
  "fact": "Fascynująca, nieoczywista i PRAWDZIWA ciekawostka (np. krowy mają przyjaciół, wombaty robią sześcienne kupy). MUSI być bardzo krótka (max 120 znaków, 1-2 zdania) aby zmieściła się na małej karcie!"
}`;
}

function bulkParams() {
    return {
        cat: document.getElementById('bulk-category').value || 'Zwierzęta',
        theme: document.getElementById('bulk-theme').value || 'pink',
        count: parseInt(document.getElementById('bulk-count').value) || 10
    };
}

// Bulk Generator Prompt — copy to clipboard for manual (no-API) workflow.
const btnBulkPrompt = document.getElementById('btn-bulk-prompt');
if (btnBulkPrompt) {
    btnBulkPrompt.addEventListener('click', () => {
        const { cat, theme, count } = bulkParams();
        navigator.clipboard.writeText(buildBulkPrompt(cat, theme, count)).then(() => {
            alert('Prompt skopiowany! Wklej go do ChatGPT/Claude, a następnie skopiuj wynikowy kod JSON i naciśnij Ctrl+V gdziekolwiek w tej aplikacji by wygenerować karty.');
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
    
    // Group into pages of 9 cards (3x3 grid fits A4 well)
    const CARDS_PER_PAGE = 9;
    
    for (let i = 0; i < cards.length; i += CARDS_PER_PAGE) {
        const pageCards = cards.slice(i, i + CARDS_PER_PAGE);
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
    
    window.print();
});

// Populate a <select> with the color theme options.
function populateThemeSelect(selectEl, selectedValue) {
    if (!selectEl) return;
    selectEl.innerHTML = THEMES.map(([value, label]) =>
        `<option value="${value}">${label} (${value})</option>`).join('');
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
    syncBulkTheme();
}

// Set the Bulk theme dropdown to the matching theme of the selected category.
function syncBulkTheme() {
    const catSel = document.getElementById('bulk-category');
    const themeSel = document.getElementById('bulk-theme');
    if (!catSel || !themeSel) return;
    const cat = getCategories().find(c => c.name === catSel.value);
    if (cat) themeSel.value = cat.theme;
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
                <span class="inline-block w-3 h-3 rounded-full shrink-0 theme-${c.theme}" style="background: var(--theme-banner)"></span>
                <span class="font-medium text-slate-700 truncate">${c.name}</span>
                <span class="text-[10px] text-slate-400 shrink-0">${themeLabel(c.theme)}</span>
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

// Wire up the categories settings pane and the bulk dropdowns.
populateThemeSelect(document.getElementById('bulk-theme'));
populateThemeSelect(document.getElementById('new-category-theme'));
renderBulkCategoryOptions();
renderCategorySettings();

const bulkCatSel = document.getElementById('bulk-category');
if (bulkCatSel) bulkCatSel.addEventListener('change', syncBulkTheme);

const btnAddCategory = document.getElementById('btn-add-category');
if (btnAddCategory) {
    btnAddCategory.addEventListener('click', () => {
        const nameEl = document.getElementById('new-category-name');
        const themeEl = document.getElementById('new-category-theme');
        const name = nameEl.value.trim().toLowerCase();
        const theme = themeEl.value;
        if (!name) { alert('Podaj nazwę kategorii.'); return; }
        const cats = getCategories();
        if (cats.some(c => c.name === name)) { alert('Taka kategoria już istnieje.'); return; }
        cats.push({ name, theme });
        saveCategories(cats);
        nameEl.value = '';
        renderCategorySettings();
        renderBulkCategoryOptions();
        document.getElementById('bulk-category').value = name;
        syncBulkTheme();
        refreshGrid();
    });
}

// --- Gemini automation: load persisted config, wire buttons -------------
(function initAutomation() {
    const keyEl = document.getElementById('gemini-key');
    if (keyEl) {
        keyEl.value = localStorage.getItem(GEMINI_KEY_KEY) || '';
        keyEl.addEventListener('input', () => localStorage.setItem(GEMINI_KEY_KEY, keyEl.value));
    }

    const tmEl = document.getElementById('gemini-text-model');
    if (tmEl) {
        tmEl.value = localStorage.getItem(TEXT_MODEL_KEY) || DEFAULT_TEXT_MODEL;
        tmEl.addEventListener('input', () => localStorage.setItem(TEXT_MODEL_KEY, tmEl.value));
    }

    const imEl = document.getElementById('gemini-image-model');
    if (imEl) {
        imEl.value = localStorage.getItem(IMAGE_MODEL_KEY) || DEFAULT_IMAGE_MODEL;
        imEl.addEventListener('input', () => localStorage.setItem(IMAGE_MODEL_KEY, imEl.value));
    }

    const pricing = getPricing();
    const ptin = document.getElementById('price-text-in');
    const ptout = document.getElementById('price-text-out');
    const pimg = document.getElementById('price-image');
    if (ptin) ptin.value = pricing.textIn;
    if (ptout) ptout.value = pricing.textOut;
    if (pimg) pimg.value = pricing.image;
    [ptin, ptout, pimg].forEach(el => el && el.addEventListener('input', () => {
        localStorage.setItem(PRICING_KEY, JSON.stringify({
            textIn: parseFloat(ptin.value) || 0,
            textOut: parseFloat(ptout.value) || 0,
            image: parseFloat(pimg.value) || 0
        }));
        updateCostEstimate();
    }));

    const bulkCount = document.getElementById('bulk-count');
    if (bulkCount) bulkCount.addEventListener('input', () => updateCostEstimate());

    const btnText = document.getElementById('btn-auto-text');
    if (btnText) btnText.addEventListener('click', runBulkTextGeneration);
    const btnImages = document.getElementById('btn-auto-images');
    if (btnImages) btnImages.addEventListener('click', runImageGeneration);
    const btnStop = document.getElementById('btn-stop-automation');
    if (btnStop) btnStop.addEventListener('click', () => { automation.cancel = true; });

    updateCostEstimate();
})();

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
