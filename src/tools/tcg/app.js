// app.js

const DB_NAME = 'OceanRescue_TCG';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

let db;
let currentEditingId = null;

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
    
    // Dynamically adjust font size to try to fit long names on one line
    let nameFontSize = 26;
    if (card.name.length > 20) {
        nameFontSize = 16;
    } else if (card.name.length > 14) {
        nameFontSize = 20;
    }

    return `
        <div class="tcg-card ${theme}">
            <div class="card-inner">
                <div class="card-header">
                    <div class="card-number">${String(card.number).padStart(3, '0')}</div>
                    <div class="card-badge">${card.category}</div>
                </div>
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
    
    // Update datalist for categories
    els.categoryList.innerHTML = Array.from(categories).map(c => `<option value="${c}">`).join('');

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
            document.getElementById('card-category').value = card.category;
            document.getElementById('card-name').value = card.name;
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
        facts: document.getElementById('card-fact').value || 'Tu pojawi się ciekawostka...',
        image: document.getElementById('card-image-data').value
    };
    els.previewContainer.innerHTML = renderCardHtml(card);
}

function generatePrompt() {
    const name = document.getElementById('card-name').value;
    const cat = document.getElementById('card-category').value;
    if (name) {
        document.getElementById('ai-prompt').value = `Uroczy rysunek postaci ${name} (${cat}). Grube czarne kontury, płaskie kolory, lekki cel-shading. Rozmyte pastelowe tło natury. Wysokiej jakości wektorowa ilustracja, styl maskotki, brak tekstu, brak słów, brak liter --ar 3:4`;
        
        const textPromptEl = document.getElementById('text-prompt');
        if (textPromptEl) {
            textPromptEl.value = `Napisz krótką, ciekawą informację dla dzieci o zwierzęciu: ${name}. Zasugeruj jedną kategorię (np. DOMOWE, LEŚNE, WODNE). Wybierz jeden pasujący kolor z listy: [pink, blue, green, yellow, purple, orange, teal, cyan, indigo, rose, lime, amber, emerald, fuchsia, stone, red]. Zwróć wynik TYLKO w formacie JSON: {"category": "KATEGORIA", "theme": "wybrany_kolor", "fact": "ciekawostka..."}`;
        }
    }
}

// Event Listeners
els.btnNew.addEventListener('click', () => openEditor());
els.btnCancel.addEventListener('click', closeEditor);

['card-number', 'card-category', 'card-theme', 'card-name', 'card-fact'].forEach(id => {
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
document.addEventListener('paste', (e) => {
    // Only handle if modal is open
    if (els.modal.classList.contains('hidden')) return;

    // Handle JSON text paste
    const pasteText = (e.clipboardData || window.clipboardData).getData('text');
    if (pasteText) {
        try {
            // Find JSON in the pasted text (in case there is markdown formatting)
            const jsonMatch = pasteText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
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
                if (updated) {
                    generatePrompt();
                    updatePreview();
                    return; // Successfully handled JSON
                }
            }
        } catch (err) {
            // Not valid JSON, ignore and try processing as image
        }
    }

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

// CSV Template Download
const btnDownloadCsvTemplate = document.getElementById('btn-download-csv-template');
if (btnDownloadCsvTemplate) {
    btnDownloadCsvTemplate.addEventListener('click', () => {
        const headers = "name,category,theme,facts\n";
        const example1 = "Skolopendra Olbrzymia,Jadowite,red,Skolopendra potrafi upolować nawet małą jaszczurkę.\n";
        const example2 = "Kot Domowy,Domowe,blue,Koty przesypiają nawet 16 godzin dziennie.\n";
        const csvContent = headers + example1 + example2;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'szablon_kart.csv';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// CSV Import
els.btnImportCsv.addEventListener('click', () => els.csvUpload.click());
els.csvUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const text = ev.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        
        let added = 0;
        const existing = await getAllCards();
        let nextNum = existing.length > 0 ? Math.max(...existing.map(c => c.number)) + 1 : 1;

        // Skip header if it exists
        const start = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('imię') ? 1 : 0;

        for (let i = start; i < lines.length; i++) {
            // Simple CSV parse (ignores quotes with commas inside, good enough for bootstrap)
            const parts = lines[i].split(',');
            
            const validThemes = ['pink','blue','green','yellow','purple','orange','teal','cyan','indigo','rose','lime','amber','emerald','fuchsia','stone','red'];
            const potentialTheme = parts.length > 2 ? parts[2].trim().toLowerCase() : '';
            
            if (parts.length >= 4 && validThemes.includes(potentialTheme)) {
                await saveCard({
                    number: nextNum++,
                    name: parts[0].trim(),
                    category: parts[1].trim(),
                    theme: potentialTheme,
                    facts: parts.slice(3).join(',').trim(),
                    image: ''
                });
                added++;
            } else if (parts.length >= 3) {
                // Fallback to old format
                await saveCard({
                    number: nextNum++,
                    name: parts[0].trim(),
                    category: parts[1].trim(),
                    theme: 'pink',
                    facts: parts.slice(2).join(',').trim(), // Re-join fun fact if it had commas
                    image: ''
                });
                added++;
            }
        }
        alert(`Zaimportowano ${added} kart.`);
        els.csvUpload.value = '';
        refreshGrid();
    };
    reader.readAsText(file);
});

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

// Boot
initDB().then(() => {
    refreshGrid();
}).catch(e => {
    console.error("IndexedDB error:", e);
    alert("Błąd ładowania bazy danych. Sprawdź konsolę.");
});
