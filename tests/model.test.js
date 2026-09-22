import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, LEVELS } from '../src/config.js';
import { newSession, dispatch, resetSession, importSession, migrateV4Config, accessibility, visibility, getNode, huntChance } from '../src/model.js';
import { renderMap } from '../src/map.js';

const make = (overrides = {}) => newSession({ ...DEFAULT_CONFIG, ...overrides });
const view = (s, changes) => dispatch(s, { type: 'view', view: { ...s.state.view, ...changes } });
function move(s, id, bait = false) { s = dispatch(s, { type: 'enter', id, bait }); if (s.state.status === 'encounter') s = dispatch(s, { type: 'resolve' }); return s; }
function pathTo(graph, from, target) {
  const queue = [[from]], seen = new Set([from]);
  for (const path of queue) for (const e of graph.edges.filter(edge => edge.from === path.at(-1))) {
    if (seen.has(e.to)) continue;
    const next = [...path, e.to]; if (e.to === target) return next;
    seen.add(e.to); queue.push(next);
  }
  throw Error(`No path from ${from} to ${target}`);
}
function travel(s, target) { for (const id of pathTo(s.graph, s.state.currentNodeId, target).slice(1)) s = move(s, id, false); return s; }
function walk(s, route, gate = false) {
  s = view(s, { infinite: true });
  if (gate) {
    for (const item of s.graph.plan.resources) s = travel(s, item.id);
    s = travel(s, s.graph.plan.discoveryId);
    s = travel(s, s.graph.plan.gateId);
    s = travel(s, 'secret-cache');
  }
  while (!['finished', 'floor-cleared'].includes(s.state.status)) {
    const options = s.graph.edges.filter(e => e.from === s.state.currentNodeId).map(e => getNode(s.graph, e.to));
    const next = options.find(n => (!n.routeId || n.routeId === route) && (gate || n.special !== 'gate'));
    s = move(s, next.id, next.type === 'W' && s.state.inventory.bait > 0);
  }
  return s;
}
test('only adjacent successors, inspection free, energy charged once, encounter blocks motion', () => {
  let s = make();
  assert.throws(() => dispatch(s, { type: 'enter', id: s.graph.rumors[0] }));
  assert.equal(s.state.energy, 12);
  s = dispatch(s, { type: 'enter', id: 'entry' });
  assert.equal(s.state.energy, 11);
  assert.throws(() => dispatch(s, { type: 'enter', id: 'entry' }));
  assert.throws(() => dispatch(s, { type: 'enter', id: 'r0-2-0' }));
  const reloaded = importSession(JSON.stringify(s));
  assert.deepEqual(reloaded, s);
  s = dispatch(reloaded, { type: 'resolve', bait: false });
  assert.throws(() => dispatch(s, { type: 'resolve', bait: false }));
  assert.ok(s.state.inventory.loot > 0);
});
test('two full runs on different routes, gate resources, same-seed replay and import roundtrip', () => {
  let s = make({ seed: 'MORGENROETE-17' });
  const first = walk(s, 'r1', true);
  assert.equal(first.state.questStates.gate, 'complete');
  assert.equal(first.state.inventory.fragments, 0);
  assert.equal(first.state.questStates.hunt, 'missed');
  assert.equal(Object.keys(first.state.resolvedEncounters).length, 8);
  assert.deepEqual(importSession(JSON.stringify(first)), first);
  const replay = walk(resetSession(first), 'r1', true);
  assert.deepEqual(replay.state, first.state);
  assert.deepEqual(replay.graph, first.graph);
  const other = walk(resetSession(first), 'r0');
  assert.equal(other.state.questStates.hunt, 'complete');
  assert.equal(other.state.questStates.gate, 'missed');
  assert.notDeepEqual(other.state.visitedNodeIds, first.state.visitedNodeIds);
  assert.deepEqual(other.graph, first.graph);
});
test('locked gate has an open bypass; two compatible fragments unlock it and cost once', () => {
  let s = make();
  for (const item of s.graph.plan.resources) s = travel(s, item.id);
  s = travel(s, s.graph.plan.discoveryId);
  const gate = s.graph.quests.find(q => q.id === 'gate').target;
  assert.equal(s.state.inventory.fragments, 2);
  const missing = structuredClone(s); missing.state.inventory.fragments = 1; missing.state.inventory.resources['valve-seal'] = 1;
  assert.equal(accessibility(missing.graph, missing.state, gate), 'locked');
  assert.throws(() => dispatch(missing, { type: 'enter', id: gate }));
  const bypass = s.graph.edges.filter(e => e.from === s.state.currentNodeId).map(e => getNode(s.graph, e.to)).find(n => n.special !== 'gate');
  assert.equal(accessibility(missing.graph, missing.state, bypass.id), 'next');
  s = dispatch(s, { type: 'enter', id: gate });
  assert.equal(s.state.inventory.fragments, 0);
  assert.throws(() => dispatch(s, { type: 'enter', id: gate }));
});
test('Meadowland reveals an open game trail and its unique reliquary', () => {
  let s = make({ deck: 'meadowland' });
  s = travel(s, s.graph.plan.discoveryId);
  const gate = s.graph.quests.find(q => q.id === 'gate').target;
  assert.equal(s.graph.nodes.filter(n => n.special === 'fragment').length, 0);
  assert.equal(accessibility(s.graph, s.state, gate), 'next');
  s = move(s, gate);
  assert.equal(accessibility(s.graph, s.state, 'secret-cache'), 'next');
  s = move(s, 'secret-cache');
  assert.equal(getNode(s.graph, 'secret-cache').name, 'Gilded Sweetwater Reliquary');
  assert.equal(accessibility(s.graph, s.state, 'boss'), 'next');
});
test('graph-distance fog, rumors disclose no connecting edges, known missed rumors persist', () => {
  let s = make({ level: 3 });
  s = view(s, { preview: 1 });
  // Initial level-3 knowledge is retained; reset permits an uncontaminated comparison.
  s = resetSession(s);
  // Reset must initialize using current view, not leak the default level radius.
  assert.deepEqual(s.state.knownNodes, ['entry', 'start']);
  const fresh = make();
  assert.deepEqual(fresh.state.knownNodes, ['entry', 'start']);
  for (const id of fresh.graph.rumors) {
    assert.equal(visibility(fresh.graph, fresh.state, id), 'rumor');
    assert.ok(fresh.graph.edges.filter(e => e.from === id || e.to === id).every(e => !fresh.state.knownEdges.includes(e.id)));
  }
  s = travel(fresh, 'r1-7-0');
  const rumor = s.graph.quests.find(q => q.id === 'hunt').target;
  assert.equal(accessibility(s.graph, s.state, rumor), 'missed');
  assert.equal(visibility(s.graph, s.state, rumor), 'rumor');
  const before = structuredClone(s.graph), known = [...s.state.knownNodes];
  s = view(s, { debug: true });
  assert.deepEqual(s.state.knownNodes, known);
  s = view(s, { debug: false, fog: 'local', rumorCount: 0 });
  assert.equal(visibility(s.graph, s.state, rumor), 'rumor');
  assert.deepEqual(s.graph, before);
  const expanded = view(s, { preview: 5 });
  assert.ok(expanded.state.knownNodes.length > s.state.knownNodes.length);
  assert.deepEqual(view(expanded, { preview: 1 }).state.knownNodes, expanded.state.knownNodes);
});
test('hidden nodes have no DOM, title, label or click target; rumor omits outcome', () => {
  const s = make(), markup = renderMap(s.graph, s.state, 'start');
  for (const n of s.graph.nodes.filter(n => visibility(s.graph, s.state, n.id) === 'hidden')) assert.ok(!markup.includes(`data-node="${n.id}"`));
  assert.ok(!markup.includes('outcome')); assert.ok(!markup.includes('loot'));
  const snap = JSON.stringify(s); renderMap(s.graph, s.state, s.graph.rumors[0]); assert.equal(JSON.stringify(s), snap);
});
test('bait consumed once, chance increased but never guaranteed, deterministic outcomes', () => {
  let unique = 0, normal = 0;
  for (let i = 0; i < 40; i++) {
    let s = view(make({ seed: `bait-${i}` }), { infinite: true });
    s = travel(s, 'r0-6-0');
    s = dispatch(s, { type: 'enter', id: 'r0-7-0', bait: true });
    const before = s.state.inventory.bait;
    const loreBefore = s.state.lore.filthworks;
    assert.equal(before, 1);
    const done = dispatch(s, { type: 'resolve' });
    assert.equal(done.state.inventory.bait, before);
    assert.equal(done.state.lore.filthworks, loreBefore + 1);
    assert.throws(() => dispatch(done, { type: 'resolve' }));
    assert.deepEqual(importSession(JSON.stringify(done)).state, done.state);
    const result = done.state.resolvedEncounters['r0-7-0'];
    if (result.unique) unique++; else normal++;
    assert.ok(huntChance(s.graph, true) > huntChance(s.graph, false));
    assert.ok(huntChance(s.graph, true) < 1);
  }
  assert.ok(unique && normal);
});
test('version 4 migration keeps configuration and rebuilds progress', () => {
  assert.deepEqual(migrateV4Config({ schemaVersion: 4, config: DEFAULT_CONFIG }), DEFAULT_CONFIG);
  assert.equal(migrateV4Config({ schemaVersion: 3, config: DEFAULT_CONFIG }), null);
});
test('energy limit blocks entry; refill and explicit infinite mode work', () => {
  let s = make({ level: 5, descent: false });
  s = travel(s, s.graph.nodes.find(n => n.depth === 12 && !n.secret).id);
  assert.equal(s.state.energy, 0);
  const nextId = s.graph.edges.find(e => e.from === s.state.currentNodeId).to;
  assert.throws(() => dispatch(s, { type: 'enter', id: nextId }));
  s = dispatch(s, { type: 'energy' }); assert.equal(s.state.energy, 20);
  s = view(s, { infinite: true }); s = move(s, nextId); assert.equal(s.state.energy, 20);
});
test('reject invalid JSON, oversized, incompatible versions, graph tampering and incoherent state', () => {
  for (const value of ['', 'null', '{bad}', '{}', '[]', 'x'.repeat(5_000_001)]) assert.throws(() => importSession(value));
  const original = make();
  for (const change of [s => s.schemaVersion++, s => s.generatorVersion = 'future', s => s.graph.nodes[0].x++, s => s.state.energy++, s => s.actions.push({ type: 'enter', id: 'r0-7-0' }), s => s.state.knownNodes.push('r0-7-0')]) { const s = structuredClone(original); change(s); assert.throws(() => importSession(JSON.stringify(s))); }
  assert.throws(() => view(original, { preview: 6 }));
  assert.throws(() => view(original, { fog: 'secret' }));
});
