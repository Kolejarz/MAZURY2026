function xmur3(str) {
    str = String(str);
    let h = 1779033703 ^ str.length;
    for(let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    }
    return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export function makeRng(seed) {
    const baseSeedStr = String(seed);
    const seedFunc = xmur3(baseSeedStr);
    const m32 = mulberry32(seedFunc());
    return {
        next: () => m32(),
        int: (n) => Math.floor(m32() * n),
        pick: (arr) => arr[arr.length === 0 ? 0 : Math.floor(m32() * arr.length)],
        weighted: (entries) => {
            if (entries.length === 0) return null;
            let total = 0;
            for (let i = 0; i < entries.length; i++) total += entries[i].weight;
            let r = m32() * total;
            for (let i = 0; i < entries.length; i++) {
                if (r < entries[i].weight) return entries[i].item;
                r -= entries[i].weight;
            }
            return entries[entries.length - 1].item;
        },
        fork: (label) => makeRng(baseSeedStr + "|" + String(label))
    };
}

export function parseCoord(s) {
    const match = s.match(/^[A-Z](0?[1-9]|1[0-9]|2[0-6])$/);
    if (!match) throw new Error("Invalid coord: " + s);
    const col = s.charCodeAt(0) - 65;
    const row = parseInt(s.substring(1), 10) - 1;
    return { col, row };
}

export function formatCoord({col, row}) {
    return String.fromCharCode(col + 65) + (row + 1).toString();
}

export function isOffGrid({col, row}, gridSize = 26) {
    return col < 0 || col >= gridSize || row < 0 || row >= gridSize;
}

export function step(coord, heading) {
    let dcol = 0, drow = 0;
    if (heading.includes("N")) drow = -1;
    if (heading.includes("S")) drow = 1;
    if (heading.includes("E")) dcol = 1;
    if (heading.includes("W")) dcol = -1;
    return { col: coord.col + dcol, row: coord.row + drow };
}

export function reflect(heading, wall) {
    let newHeading = heading;
    if (wall.includes("N")) newHeading = newHeading.replace("N", "S");
    else if (wall.includes("S")) newHeading = newHeading.replace("S", "N");
    
    if (wall.includes("E")) newHeading = newHeading.replace("E", "W");
    else if (wall.includes("W")) newHeading = newHeading.replace("W", "E");
    
    return newHeading;
}

const OPPOSITE = { "N": "S", "S": "N", "E": "W", "W": "E" };

export function faceToVector(declaredDir, face, rolledCompass, weatherModel) {
    if (!weatherModel) throw new Error("faceToVector requires weatherModel (pass game.config.weatherModel)");
    let heading, windKind, X, lootMod;
    
    if (face.type === "compass") {
        if (rolledCompass === declaredDir) {
            windKind = "tailwind";
            heading = declaredDir;
        } else if (rolledCompass === OPPOSITE[declaredDir]) {
            windKind = "headwind";
            heading = declaredDir;
        } else {
            windKind = "crosswind";
            const parts = [declaredDir, rolledCompass];
            heading = parts.sort((a, b) => (a === 'N' || a === 'S') ? -1 : 1).join('');
        }
    } else if (face.type === "still") {
        windKind = "still";
        heading = declaredDir;
    } else if (face.type === "storm") {
        windKind = "storm";
        heading = declaredDir;
    } else {
        throw new Error("Unknown face type: " + face.type);
    }

    X = weatherModel[windKind].X;
    lootMod = weatherModel[windKind].lootMod;
    
    return { heading, windKind, X, lootMod };
}

export function sailStops(pos, heading, X, visited, gridSize = 26) {
    if (!pos) throw new Error("team has no position");
    let cur = typeof pos === 'string' ? parseCoord(pos) : { ...pos };
    const stops = [];
    let curHeading = heading;
    let guard = 0;
    const SAFETY_LIMIT = 4 * gridSize * gridSize;

    while (stops.length < X) {
        guard++;
        if (guard > SAFETY_LIMIT) break;
        
        let dcol = 0, drow = 0;
        if (curHeading.includes("N")) drow = -1;
        if (curHeading.includes("S")) drow = 1;
        if (curHeading.includes("E")) dcol = 1;
        if (curHeading.includes("W")) dcol = -1;
        
        const next = { col: cur.col + dcol, row: cur.row + drow };
        
        if (isOffGrid(next, gridSize)) {
            let hit = "";
            if (curHeading.includes("N") && cur.row === 0) hit += "N";
            if (curHeading.includes("S") && cur.row === gridSize - 1) hit += "S";
            if (curHeading.includes("E") && cur.col === gridSize - 1) hit += "E";
            if (curHeading.includes("W") && cur.col === 0) hit += "W";
            
            curHeading = reflect(curHeading, hit);
            continue;
        }
        
        cur = next;
        const curStr = formatCoord(cur);
        if (!visited.has(curStr) && !stops.some(s => s.col === cur.col && s.row === cur.row)) {
            stops.push(cur);
        }
    }
    return stops;
}

export class GameValidationError extends Error {
    constructor(message, path = "") {
        super(`Game validation failed${path ? ` at ${path}` : ''}: ${message}`);
        this.name = "GameValidationError";
        this.path = path;
    }
}

export function validateGame(game) {
    if (!game || !game.config) throw new GameValidationError("Missing config");
    
    if (game.config.gridSize !== 26) throw new GameValidationError("gridSize must be 26", "config.gridSize");
    if (game.config.teams !== 12) throw new GameValidationError("teams must be 12", "config.teams");
    if (game.config.lootEveryStop !== true) throw new GameValidationError("lootEveryStop must be true", "config.lootEveryStop");
    if (game.config.edgeRule !== "ricochet") throw new GameValidationError("edgeRule must be ricochet", "config.edgeRule");
    if (game.config.equalTurns !== true) throw new GameValidationError("equalTurns must be true", "config.equalTurns");
    
    if (!Array.isArray(game.config.dieFaces) || game.config.dieFaces.length !== 12) {
        throw new GameValidationError("dieFaces must have exactly 12 items", "config.dieFaces");
    }
    for (let i = 0; i < game.config.dieFaces.length; i++) {
        const type = game.config.dieFaces[i].type;
        if (!["compass", "still", "storm"].includes(type)) {
            throw new GameValidationError("dieFace type must be compass, still, or storm", `config.dieFaces[${i}]`);
        }
    }
    
    const wtypes = game.config.winds.types;
    if (!wtypes || wtypes.length !== 5 || !wtypes.includes("up") || !wtypes.includes("down") || !wtypes.includes("left") || !wtypes.includes("right") || !wtypes.includes("joker")) {
        throw new GameValidationError("winds.types must be exactly the 5 specified types", "config.winds.types");
    }
    
    const wpool = game.config.winds.pool;
    if (!wpool) throw new GameValidationError("winds.pool is missing", "config.winds.pool");
    const poolSum = (wpool.up || 0) + (wpool.down || 0) + (wpool.left || 0) + (wpool.right || 0) + (wpool.joker || 0);
    if (Math.abs(poolSum - 1.0) > 1e-6) {
        throw new GameValidationError(`winds.pool must sum to 1, got ${poolSum}`, "config.winds.pool");
    }

    if (!game.config.scoring || !game.config.scoring.rescuePoints || typeof game.config.scoring.rescuePoints.rpMaxPerVisit !== 'number' || game.config.scoring.rescuePoints.rpMaxPerVisit < 0) {
        throw new GameValidationError("rpMaxPerVisit must be >= 0", "config.scoring.rescuePoints.rpMaxPerVisit");
    }

    if (!game.config.scoring.rescuedAnimals || typeof game.config.scoring.rescuedAnimals.perVisitCap !== 'number' || game.config.scoring.rescuedAnimals.perVisitCap < 0) {
        throw new GameValidationError("perVisitCap must be >= 0", "config.scoring.rescuedAnimals.perVisitCap");
    }
    
    if (!game.map || !Array.isArray(game.map.secretValues)) {
         throw new GameValidationError("Missing map.secretValues", "map.secretValues");
    }
    
    const coordsSeen = new Set();
    const puzzleIndices = new Set(game.puzzles ? game.puzzles.map(p => p.index) : []);
    const validKinds = new Set(["winds", "puzzle", "animalSave", "rescuePoints"]);

    // A puzzle reward must be resolvable to a concrete Archipelago Map: either drawn at the table
    // (byIndex:true, the canonical form per the schema) or pinned to an explicit index that exists in
    // puzzles[]. A puzzle reward that is neither cannot be granted by the simulator -> hard-fail.
    function checkPuzzleReward(reward, path) {
        if (!reward || reward.kind !== "puzzle") return;
        if (reward.byIndex === true) return;
        if (reward.index !== undefined) {
            if (!puzzleIndices.has(reward.index)) {
                throw new GameValidationError(`Puzzle index ${reward.index} not found in puzzles`, path);
            }
            return;
        }
        throw new GameValidationError("Puzzle reward must set byIndex:true or a valid index", path);
    }

    for (let i = 0; i < game.map.secretValues.length; i++) {
        const sv = game.map.secretValues[i];
        try {
            const {col, row} = parseCoord(sv.coord);
            if (isOffGrid({col, row}, game.config.gridSize)) throw new Error("Off grid");
        } catch (e) {
            throw new GameValidationError(`Invalid or off-grid coord: ${sv.coord}`, `map.secretValues[${i}].coord`);
        }
        const canonical = formatCoord(parseCoord(sv.coord));
        if (coordsSeen.has(canonical)) {
            throw new GameValidationError(`Duplicate coord: ${canonical}`, `map.secretValues[${i}].coord`);
        }
        coordsSeen.add(canonical);
        
        const reward = sv.reward;
        if (!reward || !validKinds.has(reward.kind)) {
            throw new GameValidationError(`Invalid reward kind: ${reward?.kind}`, `map.secretValues[${i}].reward`);
        }
        checkPuzzleReward(reward, `map.secretValues[${i}].reward`);
    }

    if (game.lootTable) {
        for (let i = 0; i < game.lootTable.length; i++) {
            const reward = game.lootTable[i].reward;
            if (reward && !validKinds.has(reward.kind)) {
                throw new GameValidationError(`Invalid reward kind: ${reward.kind}`, `lootTable[${i}].reward`);
            }
            checkPuzzleReward(reward, `lootTable[${i}].reward`);
        }
    }

    return { ok: true };
}

export function lintGame(game) {
    const warnings = [];
    if (!game.config || !game.config.winds || !game.config.winds.pool) return warnings;
    const p = game.config.winds.pool;
    if (p.up !== p.down || p.left !== p.right) {
        warnings.push("Wind pool skew detected");
    }
    if (game.deck) {
        for (const cat of Object.keys(game.deck)) {
            if (game.deck[cat].length === 0) warnings.push(`Empty deck category: ${cat}`);
        }
    }
    return warnings;
}

export function resolveTurn(ctx) {
    const { game, visited, team, declaredDir, dieFaceIndex, rolledCompass, globalMod, rubberBand, globalXMod } = ctx;

    const face = game.config.dieFaces[dieFaceIndex];
    const { heading, windKind, X: baseX, lootMod } = faceToVector(declaredDir, face, rolledCompass, game.config.weatherModel);

    // §4.1 step 3: apply any global per-turn move-count shift (e.g. "+1 move from Day 5"), then clamp X >= 0.
    let X = baseX + (globalXMod || 0);
    if (X < 0) X = 0;

    const stopsCoords = sailStops(team.pos, heading, X, visited, game.config.gridSize);
    
    const stops = [];
    const newlyVisited = [];
    
    const svMap = new Map();
    for (const sv of game.map.secretValues) {
        svMap.set(formatCoord(parseCoord(sv.coord)), sv);
    }

    for (const coord of stopsCoords) {
        const coordStr = formatCoord(coord);
        newlyVisited.push(coordStr);
        
        const sv = svMap.get(coordStr);
        const baseValue = sv ? sv.value : 0;
        const baseReward = sv ? sv.reward : { kind: "rescuePoints", n: 0 };
        
        const totalMod = (lootMod || 0) + (globalMod || 0) + (rubberBand || 0);
        let resolvedRewardValue = JSON.parse(JSON.stringify(baseReward));
        if (resolvedRewardValue.kind === "winds" && resolvedRewardValue.n !== undefined) {
            resolvedRewardValue.n = Math.max(0, resolvedRewardValue.n + totalMod);
        } else if (resolvedRewardValue.kind === "rescuePoints" && resolvedRewardValue.n !== undefined) {
            resolvedRewardValue.n = Math.max(0, resolvedRewardValue.n + totalMod);
        } else if (resolvedRewardValue.kind === "animalSave" && resolvedRewardValue.rescuePoints !== undefined) {
            resolvedRewardValue.rescuePoints = Math.max(0, resolvedRewardValue.rescuePoints + totalMod);
        }

        stops.push({
            coord: coordStr,
            baseValue,
            lootMod,
            reward: baseReward,
            resolvedRewardValue
        });
    }

    const newPos = stopsCoords.length > 0 ? formatCoord(stopsCoords[stopsCoords.length - 1]) : team.pos;

    return {
        heading,
        windKind,
        X,
        stops,
        newPos,
        newlyVisited,
        capped: false,                  // informational; the caller meters per-visit RP caps via applyRescuePoints
        shortStopped: stops.length < X  // §4.3 board-starvation fact: fewer reachable unvisited tiles than X
    };
}

export function makeInitialState(game) {
    const teams = [];
    for (let i = 1; i <= game.config.teams; i++) {
        teams.push({
            id: i,
            pos: null,
            rescuePointsTotal: 0,
            rescuePointsThisVisit: 0,
            turnsTaken: 0,
            winds: { up: 0, down: 0, left: 0, right: 0, joker: 0 },
            puzzlesHeld: [],
            animalsSaved: []
        });
    }
    return {
        visited: new Set(),
        teams,
        turnsTaken: 0
    };
}

export function applyStart(state, teamId, coord) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team) throw new Error("Team not found");
    const c = formatCoord(parseCoord(coord));
    if (state.visited.has(c)) throw new Error("Start tile already visited");
    state.visited.add(c);
    team.pos = c;
}

export function drawWinds(rng, pool, n) {
    const types = ["up", "down", "left", "right", "joker"];
    const entries = types.map(t => ({ item: t, weight: pool[t] || 0 }));
    const drawn = [];
    for (let i = 0; i < n; i++) {
        drawn.push(rng.weighted(entries));
    }
    return drawn;
}

// NOTE: the caller must reset team.rescuePointsThisVisit to 0 at the start of each visit/turn;
// this helper accumulates within a visit to enforce the per-visit cap (overflow lost, resources kept).
export function applyRescuePoints(team, gained, rpMaxPerVisit) {
    team.rescuePointsThisVisit = (team.rescuePointsThisVisit || 0) + gained;
    let banked = gained;
    let overflowLost = 0;
    
    if (team.rescuePointsThisVisit > rpMaxPerVisit) {
        const prevBanked = team.rescuePointsThisVisit - gained;
        if (prevBanked >= rpMaxPerVisit) {
            banked = 0;
            overflowLost = gained;
        } else {
            banked = rpMaxPerVisit - prevBanked;
            overflowLost = gained - banked;
        }
    }
    
    team.rescuePointsTotal += banked;
    return { banked, overflowLost };
}

export function applyAnimalSaves(team, chosenCards, perVisitCap) {
    const allowed = Math.min(chosenCards.length, perVisitCap);
    const savedCards = chosenCards.slice(0, allowed);
    team.animalsSaved.push(...savedCards);
    return savedCards;
}

export function assertEqualTurns(state) {
    if (!state.teams || state.teams.length === 0) return;
    const first = state.teams[0].turnsTaken;
    for (const team of state.teams) {
        if (team.turnsTaken !== first) {
            throw new Error(`Equal turns invariant violated: team ${team.id} has ${team.turnsTaken} turns, expected ${first}`);
        }
    }
}
