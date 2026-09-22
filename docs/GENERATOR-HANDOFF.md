# Waystone Map Generator v5 — Developer Handoff

## Product intent

This prototype combines three compatible loops:

- **Prado:** a Waystone deck defines the place and its card catalog. Three runes alter absolute card counts and global percentage modifiers.
- **Slay the Spire:** the run is a directed acyclic map with visible routes, choices, merges, later splits, and a mandatory floor boss. Regular topology can be shown without revealing encounter contents.
- **Monster Hunter:** hunting grounds hide their creature until entry. Bait and persistent area lore bias a deterministic rarity roll without guaranteeing a rare result.

`The Filthworks` demonstrates a constrained dungeon with valve seals, a locked sluice, and a unique vault. `Meadowland Wilds` demonstrates a more open wilderness with wider branching and a discoverable game trail. Both use the same engine and differ through deck data and topology style.

## Runtime contracts

`GeneratorProfile` is stored separately from a run. Its JSON schema version is currently `2`; generated sessions use generator schema `5` and generator version `5.1.0`. A session embeds the exact profile snapshot and its deterministic FNV-1a hash.

```json
{
  "schemaVersion": 2,
  "id": "prado-waystone-standard",
  "name": "Prado Waystone Standard",
  "cardTypes": [{
    "id": "W", "name": "Hunting Ground", "color": "#b49a5e", "icon": "hunt",
    "baseProbability": 12.5, "decisionWeight": 1,
    "rarityWeights": { "C": 100, "R": 0, "U": 0 }, "behavior": "hunt",
    "placement": { "minLevel": 1, "maxLevel": 5, "minDepth": 1, "maxDepth": 24 }
  }],
  "cards": [{
    "id": "filthworks-sluice-gate", "deck": "filthworks", "name": "Sealed Sluice Gate",
    "typeId": "E", "rarity": "R", "selectionWeight": 1, "behavior": "gate",
    "requires": { "resourceId": "valve-seal", "amount": 2, "consume": true },
    "placement": { "minLevel": 1, "maxLevel": 5, "minDepth": 5, "maxDepth": 24 }
  }],
  "runes": [{
    "id": "hunt", "cardDeltas": { "M": 1, "S": -1, "F": -1, "E": -1, "W": 2, "T": 0 },
    "modifiers": { "hp": 15, "loot": 10 }
  }],
  "placementRules": { "maxPathSpread": 3, "maxBranchesPerLane": 3 },
  "huntingRules": { "baitRareMultiplier": 3, "loreStep": 0.1, "loreMultiplierCap": 2, "uniquePerAdventure": 1 },
  "startInventory": { "bait": 2 }
}
```

Card types are data, not switch statements. A type owns its presentation, base probability, route value, rarity mix, default behavior, and placement window. A concrete card owns its deck, rarity, selection weight, optional behavior override, and optional resource contract. The editor can add types and cards locally, including traps and hunting grounds.

## Deterministic generation pipeline

`generate(config, profile, options)` produces both the playable graph and `generationTrace`. Every random choice comes from a named stream derived from seed, deck, floor, selected runes, generator version, and profile hash.

1. Validate profile, configuration, probability totals, ranges, and catalogs.
2. Build the unmodified topology and derive its base encounter count. Allocate types by largest remainder from base percentages.
3. Add the selected runes' integer deltas per type. The sum may change the final node count.
4. Create the floor grid, entry corridors, boss, and exit.
5. Connect adjacent rows without crossings. Create route forks, partial merges, later splits, and a small reserve of optional alternatives.
6. Reserve mandatory hunting, foraging, boss, resource, gate, bypass, discovery, and vault nodes.
7. Place remaining types within level/depth windows while balancing type counts and decision weight across lanes.
8. Draw a rarity, then a concrete card from weighted eligible pools. Reserve unique cards for the whole adventure.
9. Validate exact budgets, edges, reachability, dependency solvability, boss convergence, path value spread, and trace/play-map identity.

```text
profile = validate(profileSnapshot)
baseGraph = topology(seed, floor, adjustment = 0)
baseCounts = largestRemainder(baseGraph.encounters, typeProbabilities)
finalCounts[type] = baseCounts[type] + sum(selectedRune.delta[type])
graph = topology(seed, floor, adjustment = sum(finalCounts) - baseGraph.encounters)
reserveMandatoryCards(graph, profile)
placeRemainingTypes(graph, finalCounts, placementWindows)
for node in graph.encounters:
    rarity = weightedPick(type.rarityWeights)
    card = weightedPick(eligibleCards(type, rarity), card.selectionWeight)
validateAllInvariants(graph)
return graph + generationTrace
```

Positive net rune totals add alternative nodes to existing depths. Negative totals remove only nodes above a corridor's mandatory minimum. If the requested count cannot fit within branch capacity or cannot be removed safely, generation stops with the requested and feasible counts.

## Probability and rune math

Type probabilities and every type's `C/R/U` mix must independently total 100 percent. Largest remainder makes integer budgets exact and stable: floor each proportional allocation, then distribute remaining cards by descending fractional remainder and stable type ID.

Rune card changes are absolute integers and apply after the base allocation. Modifier percentages are additive across the three selected runes and then apply globally. The current modifier keys are HP, attack, leech, healing, loot, foraging, fragment rewards, rare chance, and bait effect. They do not add map cards unless a corresponding `cardDeltas` value does so.

The generator treats decision weight as route opportunity value. Regular content defaults to its type's value from 1–6; fragments and their alternatives share value 3; unique vaults use 4, minibosses 5, and final bosses 6. A generated map is accepted only when maximum and minimum complete regular paths differ by at most `maxPathSpread` (default 3).

## Dependencies, doors, and depth rules

A resource card declares `produces { resourceId, amount }`. A dependent card declares `requires { resourceId, amount, consume }`. The solver checks that producers precede the dependent card and that one directed route can collect the full requirement in order. A locked door always receives a normal bypass, so it is never the only route to the floor boss. Completing it reveals the optional side arm.

Level and depth windows exist on both types and cards. This supports rules such as “the fragment door appears from adventure level 3 and only in the lower half of a floor.” If no gate is eligible, the floor is generated without that feature and the trace explains why. Missing producers, contradictory ranges, impossible card pools, excess nodes, and invalid probability totals block generation before play with a concrete error.

The current visual topology reserves one optional side-arm gate per deck and floor. The data model and reachability solver use generic resource IDs and amounts; supporting several independent doors on one floor would require repeating the reservation pass for each dependency group.

## Hunting, lore, and bait

A hunting-ground node has no preselected visible monster. On entry, the player may spend one carried bait. The engine then performs a deterministic rarity and monster draw.

```text
loreFactor = min(1 + areaLore * loreStep, loreMultiplierCap)
baitFactor = useBait ? baitRareMultiplier * (1 + runeBaitPercent / 100) : 1
rareWeight   *= loreFactor * baitFactor * (1 + runeRarePercent / 100)
uniqueWeight *= loreFactor * baitFactor * (1 + runeRarePercent / 100)
normalize(commonWeight, rareWeight, uniqueWeight)
```

Bait defaults to a 3× rare/unique multiplier, is consumed exactly once on entry, and is never created by foraging. Every completed hunt grants one lore point for the current deck area. Lore persists across floors of the same adventure, resets for a new run, adds 10 percent per point, and caps at 2×. Since all weights are normalized after modification, rare and unique outcomes remain uncertain. A unique card can appear at most once across the full adventure, including later floors and hunts.

## Integration notes

- `src/profile.js`: profile schema, defaults, validation, import/export, and hash.
- `src/generation.js`: budgets, topology, content draws, trace, and graph invariants.
- `src/model.js`: movement, resource consumption, hunt resolution, lore, replay, and session import/export.
- `src/map.js`: playable map and trace snapshot rendering.
- `src/app.js`: property editor, stepper, play controls, summaries, and local persistence.

English profiles use `prado.waystone.generator-profile.v2`; sessions use `prado.waystone.v5.1`. Earlier local keys remain untouched. On first v5 load, deck, runes, level, seed, and floor mode can be read from the old v4 key while the active map is rebuilt with the current default profile. Import validates the embedded profile and hash, regenerates every floor, then replays actions through the state machine.

Core acceptance invariants are: one end node; every node reachable from start and able to reach the mandatory boss; adjacent-depth edges only; no geometric crossings; exact type budgets; eligible type/card placement; no repeated unique; solvable resource dependencies; an open bypass around every locked side arm; and a final trace snapshot identical to the playable nodes and edges.

The prototype simulates encounter completion and rewards. It does not implement combat, backend persistence, GPS, a general multi-gate layout pass, or production balancing. Prado card names and deck recipes are used as test content; numeric probabilities, rune modifiers, bosses, and rewards are prototype values.
