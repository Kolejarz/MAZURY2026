# Phase 1 Core Engine

This directory contains the core deterministic game engine for Phase 1 of Ocean Rescue. 
The core engine follows a strict single-consumer rule: the `resolveTurn` function has exactly one runtime caller, which is the Economy Simulator (Phase 4).

## Public API Surface
The following functions are exported and stable:
- **prng:** `makeRng(seed)`
- **coords:** `parseCoord(s)`, `formatCoord({col,row})`, `isOffGrid({col,row}, gridSize)`
- **geometry:** `step(coord, heading)`, `reflect(heading, wall)`, `faceToVector(...)`, `sailStops(...)`
- **schema:** `validateGame(game)`, `lintGame(game)`
- **turn:** `resolveTurn(ctx)`
- **state & scoring:** `makeInitialState(game)`, `applyStart(state, teamId, coord)`, `drawWinds(rng, pool, n)`, `applyRescuePoints(team, gained, rpMaxPerVisit)`, `applyAnimalSaves(team, chosenCards, perVisitCap)`, `assertEqualTurns(state)`
