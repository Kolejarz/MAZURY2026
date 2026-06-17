/**
 * Puzzle Engine — Ice-Cave / Ricochet-Robot BFS solver & generator.
 *
 * Uses a HYBRID approach:
 *   1. Reverse construction: build puzzles backward from the goal,
 *      placing obstacles that force specific slide paths. This guarantees
 *      non-trivial, solvable puzzles by construction.
 *   2. BFS validation: verify the final puzzle, measure exact optimal
 *      solution length, and compute quality metrics.
 *
 * Quality filters reject puzzles that are:
 *   - Trivially solvable (straight-line path, no direction change)
 *   - Low branching (fewer than 2 meaningful choices at any state)
 *   - Solvable by always moving in the same direction
 */

import { makeRng, formatCoord } from '../../core/core.js';

/* ── Direction vectors ─────────────────────────────────────────────── */

const DIRS = [
    { name: 'U', dr: -1, dc: 0 },
    { name: 'D', dr: 1, dc: 0 },
    { name: 'L', dr: 0, dc: -1 },
    { name: 'R', dr: 0, dc: 1 }
];

const OPPOSITE = { U: 'D', D: 'U', L: 'R', R: 'L' };

/* ── Slide ─────────────────────────────────────────────────────────── */

/**
 * Slide from `pos` in direction `dir` until hitting a wall or obstacle.
 * Returns the resting position. The goal tile is NOT an obstacle.
 */
export function slide(obstacles, size, pos, dir) {
    let r = pos.r;
    let c = pos.c;

    while (true) {
        const nr = r + dir.dr;
        const nc = c + dir.dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
        if (obstacles.has(`${nr},${nc}`)) break;
        r = nr;
        c = nc;
    }

    return { r, c };
}

/* ── BFS solver ────────────────────────────────────────────────────── */

/**
 * BFS over slide-resting-states. Returns optimal solution + quality metrics.
 */
export function solveBFS(obstacles, size, start, goal) {
    const startKey = `${start.r},${start.c}`;
    const goalKey = `${goal.r},${goal.c}`;

    if (startKey === goalKey) return null; // reject trivial

    const visited = new Map(); // key -> { parent, move }
    visited.set(startKey, null);

    const queue = [{ r: start.r, c: start.c, path: [] }];
    let statesExplored = 1;

    // Track branching: how many states have >1 distinct reachable neighbor
    let branchingStates = 0;

    while (queue.length > 0) {
        const curr = queue.shift();
        let reachableCount = 0;

        for (const dir of DIRS) {
            const landing = slide(obstacles, size, curr, dir);
            const landingKey = `${landing.r},${landing.c}`;

            if (landing.r === curr.r && landing.c === curr.c) continue;
            reachableCount++;

            if (landingKey === goalKey) {
                const solution = [...curr.path, dir.name];
                return {
                    solution,
                    statesExplored: statesExplored + 1,
                    branchingStates,
                    directionChanges: countDirectionChanges(solution)
                };
            }

            if (visited.has(landingKey)) continue;

            visited.set(landingKey, { from: `${curr.r},${curr.c}`, move: dir.name });
            statesExplored++;
            queue.push({ r: landing.r, c: landing.c, path: [...curr.path, dir.name] });
        }

        if (reachableCount >= 2) branchingStates++;
    }

    return null;
}

/**
 * Count how many times the direction changes in a solution path.
 * e.g. [U, U, R, D] → 2 changes (U→R, R→D)
 */
function countDirectionChanges(solution) {
    let changes = 0;
    for (let i = 1; i < solution.length; i++) {
        if (solution[i] !== solution[i - 1]) changes++;
    }
    return changes;
}

/* ── Reverse construction ──────────────────────────────────────────── */

/**
 * Build a puzzle backward from the goal position.
 * At each step, pick a random direction to "arrive from", slide backward,
 * and place an obstacle behind the arrival point to create a valid stop.
 *
 * @returns {Object|null}  { obstacles: Set, start, goal, intendedPath }
 */
function reverseConstruct(rng, size, targetLen) {
    const obstacles = new Set();

    // Place goal randomly (not on edges for more interesting puzzles)
    const margin = size >= 6 ? 1 : 0;
    const goalR = margin + rng.int(size - 2 * margin);
    const goalC = margin + rng.int(size - 2 * margin);
    const goal = { r: goalR, c: goalC };

    let current = { r: goal.r, c: goal.c };
    const path = []; // directions from start→goal (built in reverse)
    const usedPositions = new Set();
    usedPositions.add(`${goal.r},${goal.c}`);

    for (let step = 0; step < targetLen; step++) {
        // Pick a random direction to arrive FROM
        const shuffledDirs = shuffleArray(rng, [...DIRS]);
        let placed = false;

        for (const dir of shuffledDirs) {
            // We want the ship to slide in direction dir.name and land on `current`.
            // So the ship came from the opposite direction.
            const oppDr = -dir.dr;
            const oppDc = -dir.dc;

            // Find how far back we can go (must be at least 1 cell)
            let maxDist = 0;
            let r = current.r;
            let c = current.c;
            while (true) {
                const nr = r + oppDr;
                const nc = c + oppDc;
                if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
                if (obstacles.has(`${nr},${nc}`)) break;
                if (usedPositions.has(`${nr},${nc}`)) break;
                maxDist++;
                r = nr;
                c = nc;
            }

            if (maxDist < 2) continue; // Need at least 2 cells of slide distance for interest

            // Pick a random starting distance (at least 2 cells away for non-trivial slides)
            const dist = 2 + rng.int(maxDist - 1);
            const actualDist = Math.min(dist, maxDist);

            const prevR = current.r + oppDr * actualDist;
            const prevC = current.c + oppDc * actualDist;

            // Verify this position is valid
            if (prevR < 0 || prevR >= size || prevC < 0 || prevC >= size) continue;
            if (obstacles.has(`${prevR},${prevC}`)) continue;

            // We need something to stop the ship at `current` when sliding in `dir`.
            // Either `current` is at the wall, or there's an obstacle one cell past it.
            const blockR = current.r + dir.dr;
            const blockC = current.c + dir.dc;

            const needBlock = blockR >= 0 && blockR < size && blockC >= 0 && blockC < size
                && !obstacles.has(`${blockR},${blockC}`)
                && !usedPositions.has(`${blockR},${blockC}`);

            if (needBlock) {
                obstacles.add(`${blockR},${blockC}`);
            }

            // Verify: sliding from (prevR, prevC) in direction dir actually lands on current
            const testLanding = slide(obstacles, size, { r: prevR, c: prevC }, dir);
            if (testLanding.r !== current.r || testLanding.c !== current.c) {
                // Undo the obstacle and try another direction
                if (needBlock) obstacles.delete(`${blockR},${blockC}`);
                continue;
            }

            path.unshift(dir.name);
            usedPositions.add(`${prevR},${prevC}`);
            current = { r: prevR, c: prevC };
            placed = true;
            break;
        }

        if (!placed) break; // couldn't extend further
    }

    if (path.length < 4) return null; // Too short — not interesting

    return {
        obstacles,
        start: current,
        goal,
        intendedPath: path
    };
}

function shuffleArray(rng, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Reject puzzles that are "obviously easy":
 * - All moves in the same direction (or just 2 opposite directions)
 * - Zero direction changes in the solution
 * - Branching factor too low (solver found the answer without exploring alternatives)
 * - Too many solution waypoints are "corridors" (≤2 viable moves)
 *
 * @param {number} maxCorridorRatio  fraction (0-1) of waypoints allowed to be corridors
 */
function isQualityPuzzle(bfsResult, size, obstacles, start, goal, maxCorridorRatio = 0.3) {
    if (!bfsResult) return false;
    const { solution, branchingStates, directionChanges } = bfsResult;

    // Must have at least 2 direction changes for any puzzle
    if (directionChanges < 2) return false;

    // Solution uses at least 3 distinct directions
    const dirs = new Set(solution);
    if (dirs.size < 3) return false;

    // For longer solutions (5+), require at least 3 direction changes
    if (solution.length >= 5 && directionChanges < 3) return false;

    // Require meaningful branching (solver must explore dead ends)
    if (branchingStates < 2) return false;

    // Corridor check: walk the solution path and count viable moves at each waypoint
    let corridorCount = 0;
    let curr = { r: start.r, c: start.c };
    const DIRS_MAP = { U: DIRS[0], D: DIRS[1], L: DIRS[2], R: DIRS[3] };

    for (const moveName of solution) {
        // Count how many directions produce a non-trivial slide from curr
        let viableMoves = 0;
        for (const dir of DIRS) {
            const landing = slide(obstacles, size, curr, dir);
            if (landing.r !== curr.r || landing.c !== curr.c) viableMoves++;
        }

        // ≤2 viable moves = corridor (back where you came from + the correct one)
        if (viableMoves <= 2) corridorCount++;

        // Advance to next waypoint
        const dir = DIRS_MAP[moveName];
        curr = slide(obstacles, size, curr, dir);
    }

    // Reject if too many waypoints are corridors
    if (solution.length > 0 && corridorCount / solution.length > maxCorridorRatio) return false;

    return true;
}

/* ── Trap Builder — directed red herrings ──────────────────────────── */

/**
 * Build intentional dead-end "trap" paths that branch off the solution path.
 * For each waypoint in the solution, try to create a false corridor that
 * slides 1-3 cells in an off-solution direction, then dead-ends. This
 * produces paths that *look* promising but strand the player.
 */
function buildTraps(rng, obstacles, size, start, goal) {
    const protectedCells = new Set();
    protectedCells.add(`${start.r},${start.c}`);
    protectedCells.add(`${goal.r},${goal.c}`);

    // Trace the solution path to find waypoints
    const waypoints = [{ r: start.r, c: start.c }];
    let curr = { r: start.r, c: start.c };
    const solResult = solveBFS(obstacles, size, start, goal);
    if (!solResult) return;

    const DIRS_MAP = { U: DIRS[0], D: DIRS[1], L: DIRS[2], R: DIRS[3] };

    for (const moveName of solResult.solution) {
        const dir = DIRS_MAP[moveName];
        curr = slide(obstacles, size, curr, dir);
        waypoints.push({ r: curr.r, c: curr.c });
    }

    // Protect solution waypoints from being blocked
    for (const wp of waypoints) {
        protectedCells.add(`${wp.r},${wp.c}`);
    }

    // For each waypoint (except the last = goal), try to build a trap
    const trapAttempts = Math.min(waypoints.length - 1, 3);
    const indices = shuffleArray(rng, [...Array(waypoints.length - 1).keys()]);

    let trapsPlaced = 0;

    for (let idx = 0; idx < indices.length && trapsPlaced < trapAttempts; idx++) {
        const wp = waypoints[indices[idx]];

        // Try each off-solution direction
        const shuffledDirs = shuffleArray(rng, [...DIRS]);

        for (const trapDir of shuffledDirs) {
            // See how far we can slide from the waypoint in this trap direction
            const landing = slide(obstacles, size, wp, trapDir);
            if (landing.r === wp.r && landing.c === wp.c) continue;

            const dist = Math.abs(landing.r - wp.r) + Math.abs(landing.c - wp.c);
            if (dist < 2) continue; // too short to be deceptive

            // Don't create traps that land on the goal
            if (landing.r === goal.r && landing.c === goal.c) continue;

            // Place a "bait" obstacle 1-2 cells before the wall in this direction
            // to create an intermediate stop that looks like progress
            const baitDist = 1 + rng.int(Math.min(dist - 1, 2));
            const baitR = wp.r + trapDir.dr * baitDist;
            const baitC = wp.c + trapDir.dc * baitDist;
            const baitKey = `${baitR},${baitC}`;

            // The bait position itself shouldn't be blocked — we want it reachable
            // Instead, place a wall AFTER the bait so the player stops there
            const wallR = baitR + trapDir.dr;
            const wallC = baitC + trapDir.dc;

            if (wallR < 0 || wallR >= size || wallC < 0 || wallC >= size) continue;

            const wallKey = `${wallR},${wallC}`;
            if (obstacles.has(wallKey) || protectedCells.has(wallKey)) continue;
            if (protectedCells.has(baitKey)) continue;

            // Tentatively place the wall obstacle
            obstacles.add(wallKey);

            // Verify solution is still intact
            const check = solveBFS(obstacles, size, start, goal);
            if (!check) {
                obstacles.delete(wallKey);
                continue;
            }

            // Now try to make the bait position a true dead-end by blocking
            // perpendicular exits (so the player can only go back)
            const perp1 = { dr: trapDir.dc, dc: trapDir.dr };
            const perp2 = { dr: -trapDir.dc, dc: -trapDir.dr };

            for (const perpDir of [perp1, perp2]) {
                // Place a blocker 1 cell perpendicular to bait position
                const blockR = baitR + perpDir.dr;
                const blockC = baitC + perpDir.dc;
                if (blockR < 0 || blockR >= size || blockC < 0 || blockC >= size) continue;

                const blockKey = `${blockR},${blockC}`;
                if (obstacles.has(blockKey) || protectedCells.has(blockKey)) continue;

                obstacles.add(blockKey);
                const recheck = solveBFS(obstacles, size, start, goal);
                if (!recheck) {
                    obstacles.delete(blockKey);
                }
            }

            trapsPlaced++;
            break; // one trap per waypoint
        }
    }
}

/* ── Fill remaining density with random obstacles ─────────────────── */

/**
 * Count how many orthogonal (4-connected) neighbors of (r,c) are obstacles.
 */
function countOrthoNeighbors(obstacles, r, c) {
    let n = 0;
    if (obstacles.has(`${r - 1},${c}`)) n++;
    if (obstacles.has(`${r + 1},${c}`)) n++;
    if (obstacles.has(`${r},${c - 1}`)) n++;
    if (obstacles.has(`${r},${c + 1}`)) n++;
    return n;
}

/**
 * Count how many diagonal (4-corner) neighbors of (r,c) are obstacles.
 */
function countDiagNeighbors(obstacles, r, c) {
    let n = 0;
    if (obstacles.has(`${r - 1},${c - 1}`)) n++;
    if (obstacles.has(`${r - 1},${c + 1}`)) n++;
    if (obstacles.has(`${r + 1},${c - 1}`)) n++;
    if (obstacles.has(`${r + 1},${c + 1}`)) n++;
    return n;
}

/**
 * Check whether placing an obstacle at (r,c) would complete any 2×2
 * fully-obstacle block. Returns true if it would form a clump.
 */
function wouldFormClump(obstacles, r, c) {
    // Check all four 2×2 squares that include (r,c)
    const offsets = [
        [0, 0],   // (r,c) is top-left
        [0, -1],  // (r,c) is top-right
        [-1, 0],  // (r,c) is bottom-left
        [-1, -1]  // (r,c) is bottom-right
    ];
    for (const [dr, dc] of offsets) {
        const tr = r + dr;
        const tc = c + dc;
        // The three other cells of the 2×2 block starting at (tr, tc)
        const a = `${tr},${tc}`;
        const b = `${tr},${tc + 1}`;
        const c1 = `${tr + 1},${tc}`;
        const d = `${tr + 1},${tc + 1}`;
        const self = `${r},${c}`;
        // All four must be obstacles (self is about to be placed)
        const others = [a, b, c1, d].filter(k => k !== self);
        if (others.every(k => obstacles.has(k))) return true;
    }
    return false;
}

/**
 * After traps are placed, fill the board up to target density with random
 * obstacles. Each placement is:
 *   1. Neighbor-limited: max 1 orthogonal obstacle neighbor (thin lines only)
 *   2. Diagonal-limited: max 1 diagonal obstacle neighbor
 *   3. Anti-clump: must not complete any 2×2 obstacle block
 *   4. BFS-verified: must not break solvability
 */
function fillNoise(rng, obstacles, size, start, goal, targetDensity) {
    const totalCells = size * size;
    const targetCount = Math.floor(totalCells * targetDensity);
    const toAdd = Math.max(0, targetCount - obstacles.size);

    const protectedCells = new Set();
    protectedCells.add(`${start.r},${start.c}`);
    protectedCells.add(`${goal.r},${goal.c}`);

    let added = 0;
    let attempts = 0;

    while (added < toAdd && attempts < toAdd * 20) {
        attempts++;
        const r = rng.int(size);
        const c = rng.int(size);
        const key = `${r},${c}`;

        if (obstacles.has(key) || protectedCells.has(key)) continue;

        // Spatial rule 1: strictly isolated (0 orthogonal neighbors)
        if (countOrthoNeighbors(obstacles, r, c) > 0) continue;

        // Spatial rule 2: strictly isolated (0 diagonal neighbors)
        if (countDiagNeighbors(obstacles, r, c) > 0) continue;

        obstacles.add(key);

        const check = solveBFS(obstacles, size, start, goal);
        if (!check) {
            obstacles.delete(key);
            continue;
        }

        added++;
    }
}

/* ── Main generator ────────────────────────────────────────────────── */

/**
 * Calculate quota for each length to approximate a normal distribution.
 */
function getNormalDistributionQuotas(count, min, max) {
    const quotas = {};
    const mean = (min + max) / 2;
    // Standard deviation so that ~95% falls within [min, max] (i.e. +/- 2 stddev)
    const stdDev = (max - min) / 4 || 1; 

    let totalWeight = 0;
    const weights = {};
    for (let i = min; i <= max; i++) {
        const weight = Math.exp(-0.5 * Math.pow((i - mean) / stdDev, 2));
        weights[i] = weight;
        totalWeight += weight;
    }

    let allocated = 0;
    for (let i = min; i <= max; i++) {
        quotas[i] = Math.round((weights[i] / totalWeight) * count);
        allocated += quotas[i];
    }

    // Fix rounding errors to match exactly `count`
    let diff = count - allocated;
    while (diff !== 0) {
        // Sort keys by distance to mean so we adjust the peak first
        const sortedKeys = Object.keys(quotas).map(Number).sort((a, b) => Math.abs(a - mean) - Math.abs(b - mean));
        for (const k of sortedKeys) {
            if (diff > 0) {
                quotas[k]++;
                diff--;
                if (diff === 0) break;
            } else if (diff < 0 && quotas[k] > 0) {
                quotas[k]--;
                diff++;
                if (diff === 0) break;
            }
        }
    }

    return quotas;
}

/**
 * Generate `count` valid, solvable, non-trivial Ice-Cave puzzles.
 */
export function generatePuzzles(seed, count, minSize, maxSize, targetMinLen, targetMaxLen) {
    const rng = makeRng(seed);
    const puzzles = [];
    let attempts = 0;
    const maxAttempts = count * 2000;

    // Calculate normal distribution quotas
    const lengthQuotas = getNormalDistributionQuotas(count, targetMinLen, targetMaxLen);
    const currentCounts = {};
    for (let i = targetMinLen; i <= targetMaxLen; i++) currentCounts[i] = 0;

    while (puzzles.length < count && attempts < maxAttempts) {
        attempts++;
        const size = minSize + rng.int(maxSize - minSize + 1);

        // Find which lengths still need puzzles
        const neededLengths = [];
        for (const len in lengthQuotas) {
            if (currentCounts[len] < lengthQuotas[len]) neededLengths.push(Number(len));
        }
        
        if (neededLengths.length === 0) break; // Finished quotas

        // Pick a target length from the remaining needed lengths
        const targetLen = neededLengths[rng.int(neededLengths.length)];

        // Phase 1: Reverse-construct a puzzle skeleton
        const constructed = reverseConstruct(rng.fork(`rc-${attempts}`), size, targetLen);
        if (!constructed) continue;

        const { obstacles, start, goal } = constructed;

        // Phase 2: Build directed trap paths (red herrings)
        buildTraps(rng.fork(`trap-${attempts}`), obstacles, size, start, goal);

        // Phase 3: Fill remaining density with random obstacles (10-25%)
        const noiseDensity = 0.10 + rng.next() * 0.15;
        fillNoise(rng.fork(`noise-${attempts}`), obstacles, size, start, goal, noiseDensity);

        // Phase 4: BFS-validate and measure quality
        const result = solveBFS(obstacles, size, start, goal);
        if (!result) continue;
        const finalLen = result.solution.length;
        if (finalLen < targetMinLen || finalLen > targetMaxLen) continue;
        
        // Ensure we don't exceed the quota for this length
        if (currentCounts[finalLen] >= lengthQuotas[finalLen]) continue;

        // Phase 5: Quality filter — reject "obviously easy" puzzles
        if (!isQualityPuzzle(result, size, obstacles, start, goal)) continue;
        
        currentCounts[finalLen]++;

        // Build obstacle coord list for export
        const obstacleCoords = [];
        for (const key of obstacles) {
            const [r, c] = key.split(',').map(Number);
            obstacleCoords.push(formatCoord({ col: c, row: r }));
        }

        puzzles.push({
            id: puzzles.length + 1,
            difficulty: {
                len: result.solution.length,
                size: size,
                statesExplored: result.statesExplored,
                branchingStates: result.branchingStates,
                directionChanges: result.directionChanges
            },
            grid: obstacleCoords,
            gridSize: size,
            ship: formatCoord({ col: start.c, row: start.r }),
            goal: formatCoord({ col: goal.c, row: goal.r }),
            solution: result.solution,
            rewardIndex: 0
        });
    }

    // Compute composite difficulty score for each puzzle using all metrics
    function compositeScore(d) {
        return d.len * 1.0            // slide count (primary)
            + d.size * 0.6           // grid size
            + d.directionChanges * 0.8  // direction changes
            + d.branchingStates * 0.5   // branching states
            + d.statesExplored * 0.1;   // search space size
    }

    // Find score range across the batch
    let minScore = Infinity;
    let maxScore = -Infinity;
    for (const p of puzzles) {
        const s = compositeScore(p.difficulty);
        if (s < minScore) minScore = s;
        if (s > maxScore) maxScore = s;
    }

    const range = maxScore - minScore;

    // Sort by composite difficulty (easiest first)
    puzzles.sort((a, b) => compositeScore(a.difficulty) - compositeScore(b.difficulty));

    // Assign reward 1–7 via min-max normalization, clamped
    for (let i = 0; i < puzzles.length; i++) {
        const s = compositeScore(puzzles[i].difficulty);
        const normalized = range > 0 ? (s - minScore) / range : 0.5;
        puzzles[i].rewardIndex = Math.max(1, Math.min(7, Math.round(normalized * 6) + 1));
        puzzles[i].id = i + 1;
    }

    return puzzles;
}
