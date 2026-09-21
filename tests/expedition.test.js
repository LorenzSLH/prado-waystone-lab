import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, floorProfile } from '../src/config.js';
import { newSession, dispatch, resetSession, importSession, visibility, accessibility, getNode } from '../src/model.js';
import { renderMap } from '../src/map.js';

const view = (s, change) => dispatch(s, { type: 'view', view: { ...s.state.view, ...change } });
function move(s, id) {
  s = dispatch(s, { type: 'enter', id });
  return s.state.status === 'encounter' ? dispatch(s, { type: 'resolve', bait: false }) : s;
}
function pathTo(graph, from, target) {
  const queue = [[from]], seen = new Set([from]);
  for (const path of queue) for (const e of graph.edges.filter(edge => edge.from === path.at(-1))) {
    if (seen.has(e.to)) continue;
    const next = [...path, e.to]; if (e.to === target) return next;
    seen.add(e.to); queue.push(next);
  }
  throw Error(`No path from ${from} to ${target}`);
}
function travel(s, target) { for (const id of pathTo(s.graph, s.state.currentNodeId, target).slice(1)) s = move(s, id); return s; }
function finishFloor(s, route = 'r0', secret = false) {
  if (secret) {
    for (const item of s.graph.plan.resources) s = travel(s, item.id);
    s = travel(s, s.graph.plan.discoveryId);
    s = travel(s, s.graph.plan.gateId);
    s = travel(s, 'secret-cache');
  }
  while (!['finished', 'floor-cleared'].includes(s.state.status)) {
    const options = s.graph.edges.filter(e => e.from === s.state.currentNodeId).map(e => getNode(s.graph, e.to));
    const next = options.find(n => (!n.routeId || n.routeId === route) && (secret || !n.secret));
    s = move(s, next.id);
  }
  return s;
}
test('all regular paths visible without learning contents; toggling does not mutate graph or knowledge', () => {
  let s = view(newSession(DEFAULT_CONFIG), { paths: true, fog: 'local', rumorCount: 0 });
  s = resetSession(s);
  const snapshot = structuredClone(s), markup = renderMap(s.graph, s.state, 'start');
  for (const n of s.graph.nodes) {
    if (n.secret) { assert.ok(!markup.includes(`data-node="${n.id}"`)); assert.ok(!markup.includes(n.name)); }
    else assert.ok(markup.includes(`data-node="${n.id}"`));
    if (visibility(s.graph, s.state, n.id) === 'unknown') {
      const group = markup.slice(markup.indexOf(`id="node-${n.id}"`)).split('</g>')[0];
      assert.ok(group.includes('aria-label="Unbekannter Ort'));
      assert.ok(!group.includes(n.name));
    }
  }
  const regularEdges = s.graph.edges.filter(e => !getNode(s.graph, e.from).secret && !getNode(s.graph, e.to).secret);
  assert.equal((markup.match(/class="map-edge /g) || []).length, regularEdges.length);
  const boss = getNode(s.graph, 'boss');
  assert.equal(visibility(s.graph, s.state, boss.id), 'unknown');
  assert.ok(!markup.includes(boss.name));
  assert.throws(() => dispatch(s, { type: 'enter', id: boss.id }));
  s = view(s, { paths: false });
  assert.equal(visibility(s.graph, s.state, boss.id), 'hidden');
  assert.deepEqual(s.graph, snapshot.graph); assert.deepEqual(s.state.knownNodes, snapshot.state.knownNodes);
  assert.deepEqual(s.state.knownEdges, snapshot.state.knownEdges);
});
test('secret entrance appears locally, passage only after gate completion; neither fog-off nor debug unlocks it', () => {
  let s = newSession(DEFAULT_CONFIG), gate = s.graph.quests.find(q => q.id === 'gate').target;
  const graphBefore = structuredClone(s.graph);
  for (const changes of [{ paths: true }, { fog: 'off' }, { debug: true }, { debug: false, preview: 5 }]) {
    s = view(s, changes);
    assert.equal(accessibility(s.graph, s.state, gate), 'undiscovered');
    assert.equal(accessibility(s.graph, s.state, 'secret-cache'), 'undiscovered');
    if (!s.state.view.debug) {
      assert.equal(visibility(s.graph, s.state, gate), 'hidden');
      assert.equal(visibility(s.graph, s.state, 'secret-cache'), 'hidden');
    }
  }
  for (const item of s.graph.plan.resources) s = travel(s, item.id);
  s = travel(s, s.graph.plan.discoveryId);
  assert.ok(s.state.discoveredSecrets.includes('entrance'));
  assert.equal(visibility(s.graph, s.state, gate), 'revealed');
  assert.equal(visibility(s.graph, s.state, 'secret-cache'), 'hidden');
  s = dispatch(s, { type: 'enter', id: gate });
  assert.equal(s.state.inventory.fragments, 0);
  assert.equal(visibility(s.graph, s.state, 'secret-cache'), 'hidden');
  assert.deepEqual(importSession(JSON.stringify(s)), s);
  s = dispatch(s, { type: 'resolve', bait: false });
  assert.equal(visibility(s.graph, s.state, 'secret-cache'), 'revealed');
  assert.equal(accessibility(s.graph, s.state, 'secret-cache'), 'next');
  assert.throws(() => dispatch(s, { type: 'resolve', bait: false }));
  s = move(s, 'secret-cache');
  assert.ok(s.state.resolvedEncounters['secret-cache'].loot >= 28);
  assert.equal(accessibility(s.graph, s.state, 'boss'), 'next');
  assert.deepEqual(s.graph, graphBefore);
  const reset = resetSession(s);
  assert.deepEqual(reset.state.discoveredSecrets, []);
  assert.equal(visibility(reset.graph, reset.state, gate), 'hidden');
});
test('all three main routes and secret route converge on the same mandatory boss', () => {
  const root = view(newSession({ ...DEFAULT_CONFIG, level: 3 }), { infinite: true });
  for (const [route, secret] of [['r0', false], ['r1', false], ['r1', true], ['r2', false]]) {
    const s = finishFloor(root, route, secret);
    assert.ok(s.state.resolvedEncounters.boss);
    assert.equal(s.state.currentNodeId, 'end');
    assert.equal(s.state.status, 'floor-cleared');
    assert.equal(Object.keys(s.state.resolvedEncounters).length, floorProfile(s.graph.config).depth);
  }
});
test('level 1–2 end with miniboss, level 3–5 with final boss; descent keeps resources and replays', () => {
  for (let level = 1; level <= 5; level++) {
    let s = view(newSession({ ...DEFAULT_CONFIG, level }), { infinite: true });
    const initial = structuredClone(s);
    assert.throws(() => dispatch(s, { type: 'descend' }));
    let count = 0;
    while (true) {
      s = finishFloor(s); count++;
      const p = floorProfile(s.graph.config);
      assert.equal(getNode(s.graph, 'boss').special, p.finalBoss ? 'boss' : 'miniboss');
      if (s.state.status === 'finished') break;
      const inventory = structuredClone(s.state.inventory), energy = s.state.energy, prevGraph = structuredClone(s.graph);
      s = dispatch(s, { type: 'descend' });
      assert.deepEqual(s.state.inventory, inventory); assert.equal(s.state.energy, energy);
      assert.equal(s.state.currentNodeId, 'start');
      assert.equal(s.state.status, 'exploring');
      assert.deepEqual(s.state.discoveredSecrets, []);
      assert.deepEqual(s.completedFloors.at(-1).graph, prevGraph);
      assert.notDeepEqual(s.graph, prevGraph);
      assert.throws(() => dispatch(s, { type: 'descend' }));
      assert.deepEqual(importSession(JSON.stringify(s)), s);
    }
    assert.equal(count, [0, 1, 1, 2, 2, 3][level]);
    assert.equal(getNode(s.graph, 'boss').special, level >= 3 ? 'boss' : 'miniboss');
    assert.equal([...s.completedFloors, s].reduce((n, f) => n + Object.keys(f.state.resolvedEncounters).length, 0), [0, 8, 12, 16, 20, 24][level]);
    assert.throws(() => dispatch(s, { type: 'descend' }));
    assert.deepEqual(importSession(JSON.stringify(s)), s);
    const reset = resetSession(s);
    assert.deepEqual(reset.graph, initial.graph); assert.deepEqual(reset.state, initial.state);
    assert.deepEqual(reset.completedFloors, []);
    assert.deepEqual(importSession(JSON.stringify(reset)), reset);
  }
});
