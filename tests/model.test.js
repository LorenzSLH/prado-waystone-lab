import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, LEVELS } from '../src/config.js';
import { newSession, dispatch, resetSession, importSession, accessibility, visibility, getNode, huntChance } from '../src/model.js';
import { renderMap } from '../src/map.js';

const make = (overrides = {}) => newSession({ ...DEFAULT_CONFIG, ...overrides });
const view = (s, changes) => dispatch(s, { type: 'view', view: { ...s.state.view, ...changes } });
function move(s, id, bait = false) { s = dispatch(s, { type: 'enter', id }); if (s.state.status === 'encounter') s = dispatch(s, { type: 'resolve', bait }); return s; }
function walk(s, route, gate = false) {
  s = view(s, { infinite: true });
  while (s.state.status !== 'finished') {
    const options = s.graph.edges.filter(e => e.from === s.state.currentNodeId).map(e => getNode(s.graph, e.to));
    const next = options.find(n => (!n.routeId || n.routeId === route) && (gate || n.special !== 'gate'));
    s = move(s, next.id, next.type === 'H' && s.state.inventory.bait > 0);
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
  let s = move(move(make(), 'entry'), 'r1-2-0');
  s = move(s, 'r1-3-0'); s = move(s, 'r1-4-0'); s = move(s, 'r1-5-0');
  const gate = s.graph.quests.find(q => q.id === 'gate').target;
  assert.equal(s.state.inventory.fragments, 2);
  const missing = structuredClone(s); missing.state.inventory.fragments = 1;
  assert.equal(accessibility(missing.graph, missing.state, gate), 'locked');
  assert.throws(() => dispatch(missing, { type: 'enter', id: gate }));
  assert.equal(accessibility(missing.graph, missing.state, 'r1-6-1'), 'next');
  s = dispatch(s, { type: 'enter', id: gate });
  assert.equal(s.state.inventory.fragments, 0);
  assert.throws(() => dispatch(s, { type: 'enter', id: gate }));
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
  s = move(move(fresh, 'entry'), 'r0-2-0');
  const gate = s.graph.quests.find(q => q.id === 'gate').target;
  assert.equal(accessibility(s.graph, s.state, gate), 'missed');
  assert.equal(visibility(s.graph, s.state, gate), 'rumor');
  const before = structuredClone(s.graph), known = [...s.state.knownNodes];
  s = view(s, { debug: true });
  assert.deepEqual(s.state.knownNodes, known);
  s = view(s, { debug: false, fog: 'local', rumorCount: 0 });
  assert.equal(visibility(s.graph, s.state, gate), 'rumor');
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
    s = move(s, 'entry');
    for (let d = 2; d <= 6; d++) s = move(s, `r0-${d}-0`);
    s = dispatch(s, { type: 'enter', id: 'r0-7-0' });
    const before = s.state.inventory.bait;
    const done = dispatch(s, { type: 'resolve', bait: true });
    assert.equal(done.state.inventory.bait, before - 1);
    assert.throws(() => dispatch(done, { type: 'resolve', bait: true }));
    assert.deepEqual(importSession(JSON.stringify(done)).state, done.state);
    const result = done.state.resolvedEncounters['r0-7-0'];
    if (result.unique) unique++; else normal++;
    assert.ok(huntChance(s.graph, true) > huntChance(s.graph, false));
    assert.ok(huntChance(s.graph, true) < 1);
  }
  assert.ok(unique && normal);
});
test('energy limit blocks entry; refill and explicit infinite mode work', () => {
  let s = make({ level: 5 });
  s = move(s, 'entry');
  for (let d = 2; d <= 12; d++) s = move(s, `r0-${d}-0`);
  assert.equal(s.state.energy, 0);
  assert.throws(() => dispatch(s, { type: 'enter', id: 'r0-13-0' }));
  s = dispatch(s, { type: 'energy' }); assert.equal(s.state.energy, 20);
  s = view(s, { infinite: true }); s = move(s, 'r0-13-0'); assert.equal(s.state.energy, 20);
});
test('reject invalid JSON, oversized, incompatible versions, graph tampering and incoherent state', () => {
  for (const value of ['', 'null', '{bad}', '{}', '[]', 'x'.repeat(5_000_001)]) assert.throws(() => importSession(value));
  const original = make();
  for (const change of [s => s.schemaVersion++, s => s.generatorVersion = 'future', s => s.graph.nodes[0].x++, s => s.state.energy++, s => s.actions.push({ type: 'enter', id: 'r0-7-0' }), s => s.state.knownNodes.push('r0-7-0')]) { const s = structuredClone(original); change(s); assert.throws(() => importSession(JSON.stringify(s))); }
  assert.throws(() => view(original, { preview: 6 }));
  assert.throws(() => view(original, { fog: 'secret' }));
});
