# Prado · Waystone Map Lab v5.1

Prado Waystone Map Lab is a local, browser-based adventure generator. It combines Prado’s rune-driven deck building, Slay the Spire-style route topology, and Monster Hunter-inspired hunting grounds with bait and persistent area lore.

The demo includes two example decks:

- **The Filthworks** — a compact dungeon with valve seals, a locked sluice gate, a bypass, and a unique vault.
- **Meadowland Wilds** — a more open wilderness with wider branches and a discoverable game trail.

## Run the demo

Prerequisite: Node.js 22 or newer. There are no runtime dependencies and no `npm install` step.

```sh
git clone https://github.com/LorenzSLH/prado-waystone-lab.git
cd prado-waystone-lab
node server.mjs
```

Open [http://localhost:4173](http://localhost:4173) in Chrome, Edge, or another modern browser. On Windows, `.start.ps1` starts the same local server and automatically uses Node from the PATH or the bundled Codex runtime when available.

The server listens on `127.0.0.1` only. To use another port:

```powershell
$env:PORT = 4300
node server.mjs
```

Then open `http://localhost:4300`.

## Play and inspect the generator

1. Choose a deck, three runes, an adventure level, and a seed, then select **Generate map**.
2. Enable **Show all regular routes** to see the complete route structure while keeping unknown locations’ contents hidden.
3. Enter a reachable location. At a hunting ground, you can optionally spend bait before entering.
4. From level 3 onward, minibosses guard earlier floors and the final boss appears on the last floor.
5. Open **Generator properties** to edit card types, the card catalog, rune deltas, global modifiers, placement rules, hunting rules, and starting bait.
6. Open **View generation** to step through the nine deterministic build phases and inspect each map snapshot.

Profiles and runs are stored separately in browser `localStorage`. JSON exports include the profile snapshot and hash used by the run, so the map can be replayed from its seed and settings. The current v5.1 storage keys are separate from earlier German demo data.

## Generator model

- Card types are dynamic profile data. The default profile includes monsters, shrines, foraging cards, event cards, hunting grounds, and traps.
- Type probabilities and rarity mixes must each total 100%. Selection weights choose concrete cards within eligible pools.
- Runes apply absolute card-count deltas and global percentage modifiers for HP, attack, leech, healing, loot, item rarity, rare chance, and bait effectiveness.
- Level and depth windows apply to both card types and individual cards. Invalid or impossible combinations are blocked with a specific error.
- Generic resource contracts place producers before dependent gates and preserve an open bypass around locked side arms.
- Routes remain cross-free, can merge, and can split again. Every regular route reaches the floor boss, and complete route values stay within the configured spread.
- Hunting grounds reveal their monster only on entry. Bait and area lore improve rare/unique weights without guaranteeing a rare result; unique cards are limited across the full adventure.

The full design, data model, formulas, pipeline, integration contract, examples, and known limits are documented in [docs/GENERATOR-HANDOFF.md](docs/GENERATOR-HANDOFF.md).

## Development

```sh
node --test
npm run check
```

The test suite covers more than 11,200 generated maps, dynamic types, exact budgets, positive and negative rune totals, placement windows, dependency solving, path balancing, hunting/lore/bait, replay, profile/session JSON, v4 migration, and the English UI surface. Browser validation is recorded in [docs/VALIDATION.md](docs/VALIDATION.md).

## Repository layout

```text
src/profile.js      Versioned GeneratorProfile and validation
src/config.js       Run configuration and rune effects
src/generation.js   Budgets, topology, content, trace, and invariants
src/model.js        State machine, hunting, lore, replay, and serialization
src/map.js          Playable map and generation-step snapshots
src/app.js          Editor, stepper, and game interface
src/styles.css      Responsive styling
tests/              Generator, model, expedition, and language tests
server.mjs          Local static server
REQUIREMENTS.md     Runtime and deployment requirements
```

This is a generator and UX prototype. Encounters simulate completion and rewards; combat, GPS, login, backend persistence, and production Prado integration are outside the scope of this repository.
