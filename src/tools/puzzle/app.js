/**
 * Puzzle Generator — App UI.
 *
 * All grid graphics use pure CSS/SVG shapes for B&W print safety.
 * Print cards: no instructions, no wind arrows, just the number + big grid.
 */

import { generatePuzzles, slide } from './engine.js';
import { parseCoord } from '../../core/core.js';

let generatedPuzzles = [];

/* ── Boot ──────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const exportBtn   = document.getElementById('export-btn');
    const printBtn    = document.getElementById('print-btn');
    const previewCont = document.getElementById('preview-container');
    const printCont   = document.getElementById('print-container');

    generateBtn.addEventListener('click', () => {
        const seed    = document.getElementById('seed-input').value || 'MAZURY2026';
        const count   = parseInt(document.getElementById('count-input').value, 10) || 10;
        const minSize = parseInt(document.getElementById('min-size-input').value, 10) || 7;
        const maxSize = parseInt(document.getElementById('max-size-input').value, 10) || 10;
        const minLen  = parseInt(document.getElementById('min-len-input').value, 10) || 5;
        const maxLen  = parseInt(document.getElementById('max-len-input').value, 10) || 10;

        generatedPuzzles = generatePuzzles(seed, count, minSize, maxSize, minLen, maxLen);

        renderPreview(generatedPuzzles, previewCont);
        renderPrintLayout(generatedPuzzles, printCont);

        exportBtn.disabled = generatedPuzzles.length === 0;
        printBtn.disabled  = generatedPuzzles.length === 0;
    });

    exportBtn.addEventListener('click', () => {
        if (generatedPuzzles.length === 0) return;
        const output = {
            puzzles: generatedPuzzles,
            puzzleRewardCurve: { shape: 'normal', min: 'low(easy)', max: 'high(hard)' }
        };
        const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'puzzles.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    printBtn.addEventListener('click', () => window.print());
});

/* ── Coordinate helpers ────────────────────────────────────────────── */

function coordToRC(coordStr) {
    const p = parseCoord(coordStr);
    return { r: p.row, c: p.col };
}

/* ── Cell SVG content (B&W safe) ───────────────────────────────────── */

function shipSVG() {
    return `<svg viewBox="0 0 40 40" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <polygon points="20,6 34,26 6,26" fill="none" stroke="black" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="8" y="26" width="24" height="6" rx="3" fill="none" stroke="black" stroke-width="2.5"/>
        <line x1="20" y1="6" x2="20" y2="2" stroke="black" stroke-width="2.5"/>
        <polygon points="20,2 20,10 28,10" fill="none" stroke="black" stroke-width="2" stroke-linejoin="round"/>
    </svg>`;
}

function goalSVG() {
    return `<svg viewBox="0 0 40 40" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <line x1="6" y1="6" x2="34" y2="34" stroke="black" stroke-width="4" stroke-linecap="round"/>
        <line x1="34" y1="6" x2="6" y2="34" stroke="black" stroke-width="4" stroke-linecap="round"/>
    </svg>`;
}

function obstacleSVG() {
    return `<svg viewBox="0 0 40 40" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="36" height="36" fill="black" rx="2"/>
    </svg>`;
}

/* ── Build obstacle set from puzzle data ───────────────────────────── */

function buildObstacleSet(puzzle) {
    const set = new Set();
    for (const coordStr of puzzle.grid) {
        const { r, c } = coordToRC(coordStr);
        set.add(`${r},${c}`);
    }
    return set;
}

/* ── Grid rendering ────────────────────────────────────────────────── */

function renderGrid(puzzle, isPrint, idPrefix) {
    const size = puzzle.gridSize;
    const obstacleSet = buildObstacleSet(puzzle);
    const startRC = coordToRC(puzzle.ship);
    const goalRC  = coordToRC(puzzle.goal);

    const wrapper = document.createElement('div');
    wrapper.className = 'puzzle-grid-wrapper';
    if (isPrint) wrapper.classList.add('print-grid-wrapper');

    const grid = document.createElement('div');
    grid.className = 'puzzle-grid';
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    grid.style.gridTemplateRows    = `repeat(${size}, 1fr)`;

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement('div');
            cell.className = 'puzzle-cell';

            const isObstacle = obstacleSet.has(`${r},${c}`);
            const isGoal     = (r === goalRC.r && c === goalRC.c);
            const isShip     = (r === startRC.r && c === startRC.c);

            if (isObstacle) {
                cell.classList.add('cell-obstacle');
                cell.innerHTML = obstacleSVG();
            } else if (isGoal) {
                cell.classList.add('cell-goal');
                cell.innerHTML = goalSVG();
            } else if (isShip) {
                cell.classList.add('cell-start');
            } else {
                cell.classList.add('cell-empty');
            }

            grid.appendChild(cell);
        }
    }

    wrapper.appendChild(grid);

    // Ship overlay (absolute positioned for animation)
    const shipAbs = document.createElement('div');
    shipAbs.className = 'ship-abs';
    shipAbs.id = `ship-${idPrefix}`;
    shipAbs.innerHTML = shipSVG();
    const pct = 100 / size;
    shipAbs.style.width  = `${pct}%`;
    shipAbs.style.height = `${pct}%`;
    shipAbs.style.left   = `${startRC.c * pct}%`;
    shipAbs.style.top    = `${startRC.r * pct}%`;

    wrapper.appendChild(shipAbs);

    return wrapper;
}

/* ── Preview rendering (screen) ────────────────────────────────────── */

function renderPreview(puzzles, container) {
    container.innerHTML = '';
    container.className = 'preview-area';

    if (puzzles.length === 0) {
        container.innerHTML = '<p class="empty-msg">Nie wygenerowano żadnych puzzli. Spróbuj zmienić parametry.</p>';
        return;
    }

    // Difficulty histogram
    container.appendChild(buildHistogram(puzzles));

    puzzles.forEach(puzzle => {
        const card = document.createElement('div');
        card.className = 'preview-card';

        const info = document.createElement('div');
        info.className = 'preview-info';
        info.innerHTML = `
            <div class="preview-header">
                <h3 class="preview-id">#${puzzle.id}</h3>
                <span class="badge-solvable">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M5 13l4 4L19 7"/>
                    </svg>
                    BFS-proven
                </span>
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-label">Grid</div>
                    <div class="stat-value">${puzzle.gridSize}×${puzzle.gridSize}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Slides</div>
                    <div class="stat-value">${puzzle.difficulty.len}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Branching</div>
                    <div class="stat-value">${puzzle.difficulty.branchingStates}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Dir Changes</div>
                    <div class="stat-value">${puzzle.difficulty.directionChanges}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">States</div>
                    <div class="stat-value">${puzzle.difficulty.statesExplored}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Reward</div>
                    <div class="stat-value">#${puzzle.rewardIndex}</div>
                </div>
            </div>

            <div class="solution-section">
                <div class="stat-label">Solution (GM Key)</div>
                <div class="solution-text">${puzzle.solution.join(' → ')}</div>
            </div>

            <button class="play-btn" data-puzzle-id="${puzzle.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                    <circle cx="12" cy="12" r="9"/>
                </svg>
                Play Solution
            </button>
        `;

        const gridVis = renderGrid(puzzle, false, puzzle.id);

        card.appendChild(info);
        card.appendChild(gridVis);
        container.appendChild(card);
    });

    // Attach play handlers
    container.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            playSolution(parseInt(btn.getAttribute('data-puzzle-id'), 10));
        });
    });
}

/* ── Solution animation ────────────────────────────────────────────── */

async function playSolution(puzzleId) {
    const puzzle = generatedPuzzles.find(p => p.id === puzzleId);
    if (!puzzle) return;

    const ship = document.getElementById(`ship-${puzzleId}`);
    if (!ship) return;

    const size = puzzle.gridSize;
    const pct = 100 / size;
    const obstacleSet = buildObstacleSet(puzzle);

    const DIRS_MAP = {
        'U': { dr: -1, dc: 0 },
        'D': { dr: 1,  dc: 0 },
        'L': { dr: 0,  dc: -1 },
        'R': { dr: 0,  dc: 1 }
    };

    let currRC = coordToRC(puzzle.ship);
    ship.style.transition = 'none';
    ship.style.left = `${currRC.c * pct}%`;
    ship.style.top  = `${currRC.r * pct}%`;
    ship.offsetHeight; // force reflow
    ship.style.transition = 'left 0.4s ease-in-out, top 0.4s ease-in-out';

    for (const move of puzzle.solution) {
        await new Promise(resolve => setTimeout(resolve, 700));
        const dir = DIRS_MAP[move];
        const landing = slide(obstacleSet, size, currRC, dir);
        currRC = landing;
        ship.style.left = `${currRC.c * pct}%`;
        ship.style.top  = `${currRC.r * pct}%`;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    ship.classList.add('ship-arrived');
    setTimeout(() => ship.classList.remove('ship-arrived'), 1200);
}

/* ── Difficulty histogram ──────────────────────────────────────────── */

function buildHistogram(puzzles) {
    const container = document.createElement('div');
    container.className = 'histogram-section';
    container.innerHTML = '<h3 class="histogram-title">Difficulty Distribution (Solution Length)</h3>';

    const counts = {};
    let maxCount = 0;
    for (const p of puzzles) {
        const len = p.difficulty.len;
        counts[len] = (counts[len] || 0) + 1;
        if (counts[len] > maxCount) maxCount = counts[len];
    }

    const keys = Object.keys(counts).map(Number).sort((a, b) => a - b);
    const chart = document.createElement('div');
    chart.className = 'histogram-chart';

    for (const len of keys) {
        const barWrap = document.createElement('div');
        barWrap.className = 'histogram-bar-wrap';

        const countLabel = document.createElement('div');
        countLabel.className = 'histogram-count';
        countLabel.textContent = counts[len];

        const bar = document.createElement('div');
        bar.className = 'histogram-bar';
        bar.style.height = `${maxCount > 0 ? (counts[len] / maxCount) * 100 : 0}%`;

        const label = document.createElement('div');
        label.className = 'histogram-label';
        label.textContent = `${len}`;

        barWrap.appendChild(countLabel);
        barWrap.appendChild(bar);
        barWrap.appendChild(label);
        chart.appendChild(barWrap);
    }

    container.appendChild(chart);
    return container;
}

/* ── Print layout ──────────────────────────────────────────────────── */

function renderPrintLayout(puzzles, container) {
    container.innerHTML = '';

    // ── Handouts section ──
    const handoutsTitle = document.createElement('h1');
    handoutsTitle.className = 'print-section-title';
    handoutsTitle.textContent = 'Mapy Archipelagu';
    container.appendChild(handoutsTitle);

    const handoutsGrid = document.createElement('div');
    handoutsGrid.className = 'print-handouts-grid';

    puzzles.forEach(puzzle => {
        const card = document.createElement('div');
        card.className = 'print-card';

        // Just the number in the corner + the big grid
        const header = document.createElement('div');
        header.className = 'print-card-header';
        header.innerHTML = `<span class="print-card-id">#${puzzle.id}</span>`;

        // Grid — takes up all available space
        const gridContainer = document.createElement('div');
        gridContainer.className = 'print-card-grid-container';
        const gridEl = renderGrid(puzzle, true, `print-${puzzle.id}`);
        gridContainer.appendChild(gridEl);

        card.appendChild(header);
        card.appendChild(gridContainer);
        handoutsGrid.appendChild(card);
    });

    container.appendChild(handoutsGrid);

    // ── GM Solution Key ──
    const gmTitle = document.createElement('h1');
    gmTitle.className = 'print-section-title print-page-break';
    gmTitle.textContent = 'Klucz Rozwiązań MG (NIE POKAZYWAĆ GRACZOM)';
    container.appendChild(gmTitle);

    const gmTable = document.createElement('table');
    gmTable.className = 'gm-key-table';
    gmTable.innerHTML = `
        <thead>
            <tr>
                <th>#</th>
                <th>Rozwiązanie</th>
                <th>Nagroda</th>
                <th>Siatka</th>
                <th>Trudność</th>
            </tr>
        </thead>
    `;

    const tbody = document.createElement('tbody');
    puzzles.forEach(puzzle => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="gm-id">${puzzle.id}</td>
            <td class="gm-solution">${puzzle.solution.join(', ')}</td>
            <td class="gm-reward">#${puzzle.rewardIndex}</td>
            <td class="gm-size">${puzzle.gridSize}×${puzzle.gridSize}</td>
            <td class="gm-diff">${puzzle.difficulty.len} ruchów, ${puzzle.difficulty.directionChanges} zm. kier.</td>
        `;
        tbody.appendChild(row);
    });
    gmTable.appendChild(tbody);
    container.appendChild(gmTable);
}
