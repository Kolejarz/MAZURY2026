import assert from 'assert';
import * as core from './core.js';

function runTests() {
    let passed = 0;
    let failed = 0;
    
    function test(name, fn) {
        try {
            fn();
            passed++;
            console.log(`PASS: ${name}`);
        } catch (e) {
            failed++;
            console.error(`FAIL: ${name}`);
            console.error(e);
        }
    }

    test('1. PRNG determinism and fork independence', () => {
        const rng1 = core.makeRng("seed123");
        const rng2 = core.makeRng("seed123");
        assert.strictEqual(rng1.next(), rng2.next());
        assert.strictEqual(rng1.int(100), rng2.int(100));
        assert.strictEqual(rng1.pick(['a', 'b', 'c']), rng2.pick(['a', 'b', 'c']));
        
        const forkA = core.makeRng("seed123").fork("weather");
        const forkB = core.makeRng("seed123").fork("weather");
        const forkC = core.makeRng("seed123").fork("winds");
        
        assert.strictEqual(forkA.next(), forkB.next());
        assert.notStrictEqual(forkA.next(), forkC.next());
    });

    test('2. Coordinate round-trip', () => {
        const c1 = core.parseCoord("A1");
        assert.deepStrictEqual(c1, {col: 0, row: 0});
        assert.strictEqual(core.formatCoord(c1), "A1");

        const c2 = core.parseCoord("Z26");
        assert.deepStrictEqual(c2, {col: 25, row: 25});
        assert.strictEqual(core.formatCoord(c2), "Z26");

        const c3 = core.parseCoord("K07"); // zero-padded input
        assert.deepStrictEqual(c3, {col: 10, row: 6});
        assert.strictEqual(core.formatCoord(c3), "K7"); // never emits padding

        assert.ok(core.isOffGrid({col: -1, row: 0}));
        assert.ok(core.isOffGrid({col: 26, row: 0}));
        assert.ok(!core.isOffGrid({col: 0, row: 0}));
    });

    const mockWeatherModel = {
        tailwind: { X: 4, heading: "straight", lootMod: 0 },
        headwind: { X: 2, heading: "straight", lootMod: 0 },
        crosswind: { X: 3, heading: "diagonal", lootMod: 0 },
        storm: { X: 4, heading: "straight", lootMod: -1 },
        still: { X: 2, heading: "straight", lootMod: 2 }
    };

    test('3. faceToVector rules', () => {
        let res = core.faceToVector("E", {type: "compass"}, "E", mockWeatherModel);
        assert.deepStrictEqual(res, { heading: "E", windKind: "tailwind", X: 4, lootMod: 0 });

        res = core.faceToVector("E", {type: "compass"}, "W", mockWeatherModel);
        assert.deepStrictEqual(res, { heading: "E", windKind: "headwind", X: 2, lootMod: 0 });

        res = core.faceToVector("E", {type: "compass"}, "S", mockWeatherModel);
        assert.deepStrictEqual(res, { heading: "SE", windKind: "crosswind", X: 3, lootMod: 0 });

        res = core.faceToVector("E", {type: "compass"}, "N", mockWeatherModel);
        assert.deepStrictEqual(res, { heading: "NE", windKind: "crosswind", X: 3, lootMod: 0 });

        res = core.faceToVector("S", {type: "storm"}, null, mockWeatherModel);
        assert.deepStrictEqual(res, { heading: "S", windKind: "storm", X: 4, lootMod: -1 });

        res = core.faceToVector("N", {type: "still"}, null, mockWeatherModel);
        assert.deepStrictEqual(res, { heading: "N", windKind: "still", X: 2, lootMod: 2 });
    });

    test('4. sailStops edge cases', () => {
        const visited = new Set();
        
        // Tailwind: declared E, X=4
        let stops = core.sailStops({col: 0, row: 0}, "E", 4, visited, 26);
        assert.strictEqual(stops.length, 4);
        assert.deepStrictEqual(stops[0], {col: 1, row: 0});
        assert.deepStrictEqual(stops[3], {col: 4, row: 0});

        // Skip visited
        visited.add("C1"); // col 2, row 0
        visited.add("D1"); // col 3, row 0
        stops = core.sailStops({col: 0, row: 0}, "E", 4, visited, 26);
        assert.strictEqual(stops.length, 4);
        assert.deepStrictEqual(stops[0], {col: 1, row: 0}); // B1
        assert.deepStrictEqual(stops[1], {col: 4, row: 0}); // E1 (jumped C1, D1)
        
        // Cardinal bounce: 2 from east edge, E heading, X=4
        // col 23 = X. grid 26 (0..25). 
        stops = core.sailStops({col: 23, row: 0}, "E", 4, new Set(), 26);
        assert.strictEqual(stops.length, 4);
        assert.deepStrictEqual(stops[0], {col: 24, row: 0}); // Y1
        assert.deepStrictEqual(stops[1], {col: 25, row: 0}); // Z1
        assert.deepStrictEqual(stops[2], {col: 23, row: 0}); // X1
        assert.deepStrictEqual(stops[3], {col: 22, row: 0});

        // Diagonal bounce single-wall
        // Pos col: 24, row: 1. Heading: SE. X=4
        stops = core.sailStops({col: 24, row: 1}, "SE", 4, new Set(), 26);
        assert.strictEqual(stops.length, 4);
        assert.deepStrictEqual(stops[0], {col: 25, row: 2}); // Z3
        // Next would be col:26, row:3 -> off grid East. Hit "E" wall.
        // reflect("SE", "E") -> "SW"
        assert.deepStrictEqual(stops[1], {col: 24, row: 3}); // Y4
        assert.deepStrictEqual(stops[2], {col: 23, row: 4}); // X5

        // Corner bounce
        // Pos col: 24, row: 24. Heading: SE. X=3
        stops = core.sailStops({col: 24, row: 24}, "SE", 3, new Set(), 26);
        assert.strictEqual(stops.length, 3);
        assert.deepStrictEqual(stops[0], {col: 25, row: 25}); // Z26
        // Next: col:26, row:26 -> off grid. Hit "SE" corner.
        // reflect("SE", "SE") -> "NW"
        assert.deepStrictEqual(stops[1], {col: 24, row: 24}); // Y25
        assert.deepStrictEqual(stops[2], {col: 23, row: 23}); // X24

        // Starvation
        const smallSet = new Set();
        smallSet.add("A1");
        stops = core.sailStops({col: 0, row: 0}, "E", 10, smallSet, 2); 
        // 2x2 grid. Row 0 has 2 tiles. A1 is visited. It will take B1, then bounce indefinitely.
        // It should break on SAFETY_LIMIT and return just B1 (length 1).
        assert.strictEqual(stops.length, 1);
    });

    const mockGame = {
        config: {
            gridSize: 26,
            teams: 12,
            startStrategy: "team-chosen",
            valuePlacement: "random",
            die: "d12",
            lootEveryStop: true,
            weatherModel: mockWeatherModel,
            edgeRule: "ricochet",
            turnOrder: "fixed-rotating",
            equalTurns: true,
            sailingCostsWinds: false,
            dieFaces: Array(12).fill({type: "compass"}),
            winds: {
                types: ["up", "down", "left", "right", "joker"],
                directional: true,
                pool: { up: 0.2, down: 0.2, left: 0.2, right: 0.2, joker: 0.2 }
            },
            startState: { winds: "balanced-6", rescuePoints: 0, puzzles: 2 },
            puzzleHoldLimit: null,
            scoring: {
                rescuePoints: { rpMaxPerVisit: 8 },
                rescuedAnimals: { perVisitCap: 3, flat: true, byCategory: true }
            }
        },
        map: {
            secretValues: [
                { coord: "B1", value: 1, reward: { kind: "winds", n: 1 } },
                { coord: "C1", value: 2, reward: { kind: "rescuePoints", n: 2 } }
            ]
        }
    };

    test('5. Purity of resolveTurn & 9. Free sailing', () => {
        const team = { id: 1, pos: "A1", rescuePointsThisVisit: 0 };
        const visited = new Set();
        const ctx = {
            game: mockGame,
            visited,
            team,
            declaredDir: "E",
            dieFaceIndex: 0,
            rolledCompass: "E",
            globalMod: 0,
            rubberBand: 0
        };

        const teamStr = JSON.stringify(team);
        const res = core.resolveTurn(ctx);
        
        assert.strictEqual(JSON.stringify(team), teamStr, "Team object mutated!");
        assert.strictEqual(visited.size, 0, "Visited set mutated!");
        assert.strictEqual(res.X, 4);
        assert.strictEqual(res.newlyVisited.length, 4);
    });

    test('6. Atomic claim', () => {
        const visited = new Set();
        const ctx1 = {
            game: mockGame,
            visited,
            team: { id: 1, pos: "A1" },
            declaredDir: "E", dieFaceIndex: 0, rolledCompass: "E", globalMod: 0, rubberBand: 0
        };
        const res1 = core.resolveTurn(ctx1);
        res1.newlyVisited.forEach(v => visited.add(v));

        const ctx2 = {
            game: mockGame,
            visited,
            team: { id: 2, pos: "A1" },
            declaredDir: "E", dieFaceIndex: 0, rolledCompass: "E", globalMod: 0, rubberBand: 0
        };
        const res2 = core.resolveTurn(ctx2);
        
        // team 2 should jump over team 1's visited tiles
        for (const v of res2.newlyVisited) {
            assert.ok(!res1.newlyVisited.includes(v), `Double claim on tile ${v}`);
        }
    });

    test('7. Scoring caps', () => {
        const team = { rescuePointsTotal: 0, animalsSaved: [] };
        
        const r1 = core.applyRescuePoints(team, 5, 8);
        assert.deepStrictEqual(r1, { banked: 5, overflowLost: 0 });
        
        const r2 = core.applyRescuePoints(team, 5, 8);
        assert.deepStrictEqual(r2, { banked: 3, overflowLost: 2 });
        
        const a1 = core.applyAnimalSaves(team, [1,2,3,4,5], 3);
        assert.strictEqual(a1.length, 3);
        assert.strictEqual(team.animalsSaved.length, 3);
    });

    test('8. Game Validator', () => {
        assert.deepStrictEqual(core.validateGame(mockGame), {ok: true});
        
        const badGame = JSON.parse(JSON.stringify(mockGame));
        badGame.config.gridSize = 10;
        assert.throws(() => core.validateGame(badGame), core.GameValidationError);
        
        const badPool = JSON.parse(JSON.stringify(mockGame));
        badPool.config.winds.pool.joker = 0.5; // sum = 1.3
        assert.throws(() => core.validateGame(badPool), core.GameValidationError);
    });

    test('10. No game-over', () => {
        const state = core.makeInitialState(mockGame);
        core.assertEqualTurns(state); // passes

        state.teams[0].turnsTaken = 1;
        assert.throws(() => core.assertEqualTurns(state), /Equal turns invariant/);
    });

    test('11. faceToVector requires weatherModel (contract guard)', () => {
        // documented signature must fail loudly, not with a cryptic TypeError
        assert.throws(
            () => core.faceToVector("E", {type: "compass"}, "E"),
            /requires weatherModel/
        );
    });

    test('12. globalXMod shifts the move count (requirements §4.1 step 3)', () => {
        const base = { game: mockGame, visited: new Set(), team: { id: 1, pos: "A1" },
            declaredDir: "E", dieFaceIndex: 0, rolledCompass: "E", globalMod: 0, rubberBand: 0 };
        assert.strictEqual(core.resolveTurn(base).X, 4);                       // tailwind base
        assert.strictEqual(core.resolveTurn({ ...base, globalXMod: 2 }).X, 6); // +2 moves
        assert.strictEqual(core.resolveTurn({ ...base, globalXMod: -10 }).X, 0); // clamped >= 0
    });

    test('13. shortStopped flags board starvation', () => {
        const tinyGame = JSON.parse(JSON.stringify(mockGame));
        tinyGame.config.gridSize = 2;
        tinyGame.map.secretValues = [];
        const visited = new Set(["A1"]);
        // 2x2 board, A1 visited, declared E from A1: only B1 reachable on the row -> < X stops
        const res = core.resolveTurn({ game: tinyGame, visited, team: { id: 1, pos: "A1" },
            declaredDir: "E", dieFaceIndex: 0, rolledCompass: "E", globalMod: 0, rubberBand: 0 });
        assert.ok(res.stops.length < res.X, "expected fewer stops than X");
        assert.strictEqual(res.shortStopped, true);
    });

    test('14. Puzzle reward validation (byIndex vs explicit index)', () => {
        // byIndex:true is accepted with no puzzles[] needed
        const g = JSON.parse(JSON.stringify(mockGame));
        g.lootTable = [{ value: 5, reward: { kind: "puzzle", byIndex: true } }];
        assert.deepStrictEqual(core.validateGame(g), { ok: true });

        // explicit index that doesn't exist -> hard-fail
        const gBad = JSON.parse(JSON.stringify(mockGame));
        gBad.lootTable = [{ value: 5, reward: { kind: "puzzle", index: 999 } }];
        assert.throws(() => core.validateGame(gBad), /Puzzle index 999 not found/);

        // puzzle reward that is neither byIndex nor index -> hard-fail (was silently accepted before)
        const gUnresolvable = JSON.parse(JSON.stringify(mockGame));
        gUnresolvable.map.secretValues = [{ coord: "B1", value: 5, reward: { kind: "puzzle" } }];
        assert.throws(() => core.validateGame(gUnresolvable), /byIndex:true or a valid index/);
    });

    console.log(`\nTests passed: ${passed}/${passed + failed}`);
    if (failed > 0) process.exit(1);
}

runTests();
