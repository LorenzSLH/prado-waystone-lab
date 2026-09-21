import { SCHEMA_VERSION, GENERATOR_VERSION, LEVELS, DEFAULT_VIEW, floorProfile } from './config.js';
import { generate, reachable } from './generation.js';

export const getNode = (g, id) => g.nodes.find(n => n.id === id);
export function initialState(graph, view = DEFAULT_VIEW) {
  const state = { currentNodeId: 'start', visitedNodeIds: ['start'], knownNodes: [], knownEdges: [], knownRumors: [], discoveredSecrets: [], energy: 12, inventory: { fragments: 0, bait: 2, herbs: 0, loot: 0, uniques: 0 }, questStates: {}, resolvedEncounters: {}, status: 'exploring', view: { ...view } };
  discover(graph, state); updateQuests(graph, state); return state;
}
function validateView(view) {
  if (!view || !['off', 'local', 'rumors'].includes(view.fog) || !Number.isInteger(view.preview) || view.preview < 0 || view.preview > 5 || !Number.isInteger(view.rumorCount) || view.rumorCount < 0 || view.rumorCount > 3 || typeof view.paths !== 'boolean' || typeof view.debug !== 'boolean' || typeof view.infinite !== 'boolean' || Object.keys(view).length !== 6) throw Error('Ungültige Laboransicht.');
}
export function secretAvailable(state, node) { return !node.secret || state.discoveredSecrets.includes(node.secret); }
export function discover(graph, state) {
  const known = new Set(state.knownNodes), edges = new Set(state.knownEdges), radius = state.view.preview || LEVELS[graph.config.level].preview;
  const queue = [[state.currentNodeId, 0]], distance = new Map([[state.currentNodeId, 0]]);
  for (let i = 0; i < queue.length; i++) {
    const [id, d] = queue[i]; known.add(id);
    if (d >= radius) continue;
    for (const e of graph.edges.filter(e => e.from === id)) {
      if (!secretAvailable(state, getNode(graph, e.to))) continue;
      edges.add(e.id);
      if (!distance.has(e.to)) { distance.set(e.to, d + 1); queue.push([e.to, d + 1]); }
    }
  }
  if (state.view.fog === 'off') {
    graph.nodes.filter(n => secretAvailable(state, n)).forEach(n => known.add(n.id));
    graph.edges.filter(e => secretAvailable(state, getNode(graph, e.from)) && secretAvailable(state, getNode(graph, e.to))).forEach(e => edges.add(e.id));
  }
  state.knownNodes = [...known].sort(); state.knownEdges = [...edges].sort();
  if (state.view.fog === 'rumors') state.knownRumors = [...new Set([...state.knownRumors, ...graph.rumors.slice(0, state.view.rumorCount)])].sort();
}
export function visibility(graph, state, id) {
  const node = getNode(graph, id);
  if (!node) return 'hidden';
  if (state.view.debug) return 'revealed';
  if (!secretAvailable(state, node)) return 'hidden';
  if (state.knownNodes.includes(id)) return 'revealed';
  if (state.knownRumors.includes(id)) return 'rumor';
  if (state.view.paths) return 'unknown';
  return 'hidden';
}
export function accessibility(graph, state, id) {
  const n = getNode(graph, id);
  if (id === state.currentNodeId) return 'current';
  if (state.visitedNodeIds.includes(id)) return 'visited';
  if (!n || !secretAvailable(state, n)) return 'undiscovered';
  if (!reachable(graph, state.currentNodeId).has(id)) return 'missed';
  if (graph.edges.some(e => e.from === state.currentNodeId && e.to === id)) return n.special === 'gate' && state.inventory.fragments < (n.lockCost ?? 2) ? 'locked' : 'next';
  return 'future';
}
export function updateQuests(graph, state) {
  const future = reachable(graph, state.currentNodeId);
  for (const q of graph.quests) {
    state.questStates[q.id] = !q.compatible ? 'incompatible' : state.resolvedEncounters[q.target] ? 'complete' : !future.has(q.target) ? 'missed' : 'active';
  }
}
export function huntChance(graph, useBait) {
  const rareWeight = .15 * graph.effects.rare.multiplier * (useBait ? 3 * graph.effects.bait.multiplier : 1);
  return rareWeight / (.85 + rareWeight);
}
export function transition(graph, original, action) {
  if (!action || typeof action.type !== 'string') throw Error('Ungültige Aktion.');
  const s = structuredClone(original), current = getNode(graph, s.currentNodeId);
  switch (action.type) {
    case 'reset': return initialState(graph, s.view);
    case 'view': validateView(action.view); s.view = { ...action.view }; discover(graph, s); break;
    case 'energy': if (s.energy > 99980) throw Error('Testenergie-Limit erreicht.'); s.energy += 20; break;
    case 'enter': {
      const n = getNode(graph, action.id);
      if (s.status !== 'exploring') throw Error('Schließe zuerst die aktuelle Begegnung ab.');
      if (!n || accessibility(graph, s, n.id) !== 'next') throw Error('Dieser Ort ist nicht direkt betretbar.');
      const cost = n.kind === 'encounter' ? 1 : 0;
      if (s.energy < cost && !s.view.infinite) throw Error('Zu wenig Energie. Fülle im Labor Testenergie nach.');
      if (!s.view.infinite) s.energy -= cost;
      if (n.special === 'gate') s.inventory.fragments -= n.lockCost ?? 2;
      s.currentNodeId = n.id; s.visitedNodeIds.push(n.id);
      s.status = n.kind === 'end' ? (graph.config.floor < floorProfile(graph.config).floors ? 'floor-cleared' : 'finished') : 'encounter';
      discover(graph, s); break;
    }
    case 'resolve': {
      if (s.status !== 'encounter' || s.resolvedEncounters[current.id]) throw Error('Diese Begegnung ist bereits abgeschlossen.');
      if (typeof action.bait !== 'boolean') throw Error('Köderwahl ist ungültig.');
      if (action.bait && (current.type !== 'H' || s.inventory.bait < 1)) throw Error('Kein passender Köder verfügbar.');
      if (action.bait) s.inventory.bait--;
      const mods = graph.effects, out = current.outcome;
      const fragmentBonus = current.special === 'fragment' ? Math.round(10 * mods.fragment.multiplier) : 0;
      const specialBonus = current.special === 'treasure' ? 25 : current.special === 'boss' ? 40 : current.special === 'miniboss' ? 15 : 0;
      const loot = Math.round(out.loot * (current.type === 'M' ? mods.loot.multiplier : 1)) + fragmentBonus + specialBonus;
      const herbs = current.type === 'F' ? Math.max(1, Math.round(out.herbs * mods.forage.multiplier)) : 0;
      const unique = current.type === 'H' && out.roll < huntChance(graph, action.bait);
      s.inventory.loot += loot; s.inventory.herbs += herbs; s.inventory.uniques += unique ? 1 : 0;
      if (current.special === 'fragment') s.inventory.fragments++;
      s.resolvedEncounters[current.id] = { loot, herbs, unique, bait: action.bait, fragment: current.special === 'fragment', fragmentBonus };
      if (current.discovers && !s.discoveredSecrets.includes(current.discovers)) s.discoveredSecrets.push(current.discovers);
      s.status = 'exploring'; break;
    }
    default: throw Error('Unbekannte Aktion.');
  }
  discover(graph, s); updateQuests(graph, s); return s;
}
export function newSession(config) {
  const graph = generate({ ...config, floor: 1 });
  return { schemaVersion: SCHEMA_VERSION, generatorVersion: GENERATOR_VERSION, config: graph.config, graph, state: initialState(graph), completedFloors: [], actions: [] };
}
export function dispatch(session, action) {
  if (session.actions.length >= 10000) throw Error('Aktionslimit erreicht. Bitte den Run zurücksetzen.');
  let next;
  if (action.type === 'descend') {
    if (session.state.status !== 'floor-cleared' || session.graph.config.floor >= floorProfile(session.graph.config).floors) throw Error('Das Abstiegstor ist noch nicht offen.');
    const graph = generate({ ...session.graph.config, floor: session.graph.config.floor + 1 });
    const state = initialState(graph, session.state.view);
    state.inventory = structuredClone(session.state.inventory); state.energy = session.state.energy;
    const archive = { graph: session.graph, state: session.state };
    next = { ...session, graph, state, completedFloors: [...session.completedFloors, archive] };
  } else if (action.type === 'reset') {
    next = newSession(session.config);
    next.state = initialState(next.graph, session.state.view);
  } else next = { ...session, state: transition(session.graph, session.state, action) };
  return { ...next, actions: [...session.actions, structuredClone(action)] };
}
export function resetSession(session) {
  return dispatch(session, { type: 'reset' });
}
const canonical = v => JSON.stringify(v && typeof v === 'object' ? Array.isArray(v) ? v.map(x => JSON.parse(canonical(x))) : Object.fromEntries(Object.keys(v).sort().map(k => [k, JSON.parse(canonical(v[k]))])) : v);
export function importSession(text) {
  if (typeof text !== 'string' || text.length > 5_000_000) throw Error('Datei ist zu groß (maximal 5 MB).');
  let data;
  try { data = JSON.parse(text); } catch { throw Error('Die Datei enthält kein gültiges JSON.'); }
  if (!data || data.schemaVersion !== SCHEMA_VERSION || data.generatorVersion !== GENERATOR_VERSION) throw Error('Diese Speicherstand-Version wird nicht unterstützt.');
  if (!data.graph || !Array.isArray(data.actions) || data.actions.length > 10000) throw Error('Unvollständiger Speicherstand.');
  let replay = newSession(data.config);
  for (const action of data.actions) replay = dispatch(replay, action);
  if (canonical(replay.graph) !== canonical(data.graph)) throw Error('Die Karte stimmt nicht mit Seed und Generatorversion überein.');
  if (canonical(replay.state) !== canonical(data.state) || canonical(replay.completedFloors) !== canonical(data.completedFloors) || canonical(replay.config) !== canonical(data.config)) throw Error('Der Spielstand stimmt nicht mit dem Aktionsverlauf überein.');
  return replay;
}
