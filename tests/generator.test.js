import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, topology, budgets, runeBudgets, questSolvable, reachable } from '../src/generation.js';
import { RUNES, LEVELS, DEFAULT_CONFIG, TYPES, effects, floorProfile } from '../src/config.js';
import { DECK_IDS, deckFor } from '../src/decks.js';

const combinations = [];
for (let a = 0; a < 4; a++) for (let b = a + 1; b < 5; b++) for (let c = b + 1; c < 6; c++) combinations.push([RUNES[a].id, RUNES[b].id, RUNES[c].id]);
const signature = g => JSON.stringify({ nodes: g.nodes.map(({ id, depth, routeId, x, y, kind }) => ({ id, depth, routeId, x, y, kind })), edges: g.edges });

test('11,200 graph matrix: both deck profiles, every rune set, level, 20 seeds, single/multi-floor and every floor', () => {
  let graphs = 0, threeWayFork = false, mergeSplit = false;
  for (const deck of DECK_IDS) for (const runes of combinations) for (let level = 1; level <= 5; level++) for (let seed = 0; seed < 20; seed++) for (const descent of [false, true]) for (let floor = 1; floor <= floorProfile({ level, descent }).floors; floor++) {
    const config = { seed: `matrix-${seed}`, deck, runes, level, descent, floor }, g = generate(config);
    const label = JSON.stringify(config), p = floorProfile(config);
    assert.equal(Object.values(g.counts).reduce((a, b) => a + b), g.nodes.filter(n => n.kind === 'encounter').length, label);
    // Independent dynamic path-length check, not just node depth fields.
    const depths = new Map([['start', new Set([0])]]);
    for (const n of [...g.nodes].sort((a, b) => a.depth - b.depth)) {
      if (n.kind === 'end') assert.deepEqual([...depths.get(n.id)], [p.depth], label);
      for (const e of g.edges.filter(e => e.from === n.id)) {
        const next = g.nodes.find(n => n.id === e.to), set = depths.get(next.id) || new Set();
        for (const d of depths.get(n.id)) set.add(d + (next.kind === 'encounter' ? 1 : 0));
        depths.set(next.id, set);
      }
    }
    assert.equal(g.routes.length, p.routes, label);
    for (const r of g.routes) {
      const from = `${r.id}-2-0`, future = reachable(g, from);
      assert.ok([...future].some(id => g.nodes.find(n => n.id === id).kind === 'end'), label);
    }
    for (const n of g.nodes) {
      const incoming = g.edges.filter(e => e.to === n.id).length, outgoing = g.edges.filter(e => e.from === n.id).length;
      mergeSplit ||= incoming >= 2 && outgoing >= 2;
      threeWayFork ||= outgoing >= 3;
    }
    for (const q of g.quests) { assert.equal(q.compatible, true, label); assert.equal(questSolvable(g, q), true, label); }
    assert.equal(g.nodes.find(n => n.id === 'boss').special, p.finalBoss ? 'boss' : 'miniboss', label);
    assert.equal(g.nodes.filter(n => n.kind === 'end').length, 1);
    const withoutBoss = { ...g, edges: g.edges.filter(e => e.to !== 'boss') };
    assert.equal(reachable(withoutBoss, 'start').has('end'), false, label);
    const regular = { ...g, edges: g.edges.filter(e => !g.nodes.find(n => n.id === e.to).secret) };
    for (const n of g.nodes.filter(n => !n.secret && n.id !== 'end')) assert.ok(reachable(regular, n.id).has('boss'), label);
    for (const n of g.nodes) for (const other of g.nodes) if (n.id !== other.id && n.depth === other.depth) assert.ok(Math.abs(n.x - other.x) >= 70, `Touch targets overlap: ${label}`);
    graphs++;
  }
  assert.equal(graphs, 11200); assert.ok(threeWayFork); assert.ok(mergeSplit);
});

test('determinism, normalized rune order, independent topology stream', () => {
  const a = generate(DEFAULT_CONFIG), b = generate({ ...DEFAULT_CONFIG, seed: '  MOOSPFAD-42 ', runes: [...DEFAULT_CONFIG.runes].reverse() });
  assert.deepEqual(a, b);
  for (const runes of combinations) assert.equal(signature(generate({ ...DEFAULT_CONFIG, runes })), signature(a));
  assert.notEqual(signature(generate({ ...DEFAULT_CONFIG, seed: 'other' })), signature(a));
  assert.notEqual(signature(generate({ ...DEFAULT_CONFIG, deck: 'meadowland' })), signature(a));
});
test('official Waystone deck content powers distinct dungeon and wilderness stories', () => {
  const filth = generate({ ...DEFAULT_CONFIG, level: 3, descent: false, deck: 'filthworks' });
  const meadow = generate({ ...DEFAULT_CONFIG, level: 3, descent: false, deck: 'meadowland' });
  assert.equal(filth.deck.name, 'The Filthworks');
  assert.equal(filth.nodes.find(n => n.id === 'secret-cache').name, 'Cracked Sewer Vault');
  assert.equal(filth.nodes.find(n => n.special === 'gate').lockCost, 2);
  assert.equal(filth.nodes.filter(n => n.special === 'fragment').length, 2);
  assert.equal(meadow.deck.name, 'Meadowland Wilds');
  assert.equal(meadow.nodes.find(n => n.id === 'secret-cache').name, 'Gilded Sweetwater Reliquary');
  assert.equal(meadow.nodes.find(n => n.special === 'gate').lockCost, 0);
  assert.equal(meadow.nodes.filter(n => n.special === 'fragment').length, 0);
  assert.equal(meadow.nodes.find(n => n.id === 'boss').name, 'Wickerbeast');
  for (const g of [filth, meadow]) {
    const sourceNames = new Set([...g.deck.cards, ...g.deck.monsters, ...g.deck.rareEncounters].map(x => x.name));
    for (const n of g.nodes.filter(n => n.kind === 'encounter' && !['gate', 'fragment'].includes(n.special))) assert.ok(sourceNames.has(n.name), `${g.deck.name}: ${n.name}`);
  }
  assert.deepEqual(deckFor('filthworks').composition, { monster: 4, event: 1, rest: 1, wild: 1 });
});
test('fragment choices span lanes and depths, remain collectible, and match valuable alternatives', () => {
  for (let seed = 0; seed < 100; seed++) {
    const g = generate({ ...DEFAULT_CONFIG, seed: `tradeoff-${seed}`, level: 5, descent: false });
    const resources = g.plan.resources.map(item => g.nodes.find(n => n.id === item.id));
    assert.equal(new Set(resources.map(n => n.routeId)).size, resources.length);
    assert.ok(resources[1].depth - resources[0].depth >= 2);
    for (const item of g.plan.resources) {
      const options = [item.id, ...item.choiceIds].map(id => g.nodes.find(n => n.id === id));
      assert.deepEqual(new Set(options.map(n => n.decisionWeight)), new Set([3]));
      assert.ok(options.slice(1).every(n => n.special === 'choice'));
    }
    assert.equal(questSolvable(g, g.quests.find(q => q.id === 'gate')), true);
    assert.ok(g.plan.junctionDepths.length >= 2);
  }
});
test('largest remainder exact counts, zero weight, stable tie break', () => {
  assert.deepEqual(budgets(4, { M: 1, F: 1, W: 1, S: 1, E: 1 }), { E: 1, F: 1, M: 1, S: 1, W: 0 });
  assert.deepEqual(budgets(100, { M: 0, F: 0, W: 1, S: 0, E: 0 }), { E: 0, F: 0, M: 0, S: 0, W: 100 });
  assert.throws(() => budgets(10, { M: 0, F: 0, W: 0, S: 0, E: 0 }));
  assert.throws(() => budgets(10, { M: -1, F: 0, W: 1, S: 0, E: 0 }));
});
test('runes modify deck defaults while every core card group stays available', () => {
  const base = generate(DEFAULT_CONFIG), aggressive = generate({ ...DEFAULT_CONFIG, runes: ['blood', 'hunt', 'trail'] });
  assert.ok(TYPES.every(type => base.weights[type] >= 1 && aggressive.weights[type] >= 1));
  assert.notDeepEqual(base.counts, aggressive.counts);
  assert.ok(aggressive.counts.M >= base.counts.M);
  assert.ok(aggressive.quests.every(q => q.compatible));
  const exact = runeBudgets(80, deckFor('filthworks').defaultUnits, ['blood', 'hunt', 'trail']);
  for (const type of TYPES) assert.equal(exact.counts[type], exact.base[type] + exact.deltas[type]);
});
test('config validation and additive effects', () => {
  for (const bad of [{ seed: '' }, { seed: ' '.repeat(10) }, { seed: 'x'.repeat(81) }, { level: 0 }, { level: 1.5 }, { level: 6 }, { deck: 'unknown' }, { runes: ['hunt', 'hunt', 'ruin'] }, { runes: ['none', 'wild', 'ruin'] }, { descent: 'yes' }, { floor: 2 }]) assert.throws(() => generate({ ...DEFAULT_CONFIG, ...bad }));
  assert.throws(() => generate(null));
  const mods = effects(['hunt', 'haven', 'trail']);
  assert.equal(mods.hp.percent, 35); assert.equal(mods.hp.multiplier, 1.35);
  assert.equal(effects(['ruin', 'haven', 'trail']).heal.percent, 5);
  assert.ok(topology({ ...DEFAULT_CONFIG, level: 5 }).nodes.length > topology(DEFAULT_CONFIG).nodes.length);
});
