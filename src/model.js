import { SCHEMA_VERSION, GENERATOR_VERSION, LEVELS, DEFAULT_VIEW, floorProfile } from './config.js';
import { generate, reachable, rng } from './generation.js';
import { DEFAULT_PROFILE, profileHash, validateProfile } from './profile.js';

export const getNode = (graph, id) => graph.nodes.find(node => node.id === id);
export function initialState(graph, profile = DEFAULT_PROFILE, view = DEFAULT_VIEW) {
  const state = {
    currentNodeId: 'start', visitedNodeIds: ['start'], knownNodes: [], knownEdges: [], knownRumors: [], discoveredSecrets: [], energy: 12,
    inventory: { fragments: 0, resources: {}, bait: profile.startInventory.bait, herbs: 0, loot: 0, uniques: 0 },
    lore: { [graph.config.deck]: 0 }, huntLog: [], uniqueCardIds: [...graph.generatedUniqueCardIds], pendingHunt: null, questStates: {}, resolvedEncounters: {}, status: 'exploring', view: { ...view },
  };
  discover(graph, state); updateQuests(graph, state); return state;
}
function validateView(view) {
  if (!view || !['off', 'local', 'rumors'].includes(view.fog) || !Number.isInteger(view.preview) || view.preview < 0 || view.preview > 5 || !Number.isInteger(view.rumorCount) || view.rumorCount < 0 || view.rumorCount > 3 || typeof view.paths !== 'boolean' || typeof view.debug !== 'boolean' || typeof view.infinite !== 'boolean' || Object.keys(view).length !== 6) throw Error('Invalid lab view.');
}
export function secretAvailable(state, node) { return !node.secret || state.discoveredSecrets.includes(node.secret); }
export function discover(graph, state) {
  const known = new Set(state.knownNodes), edges = new Set(state.knownEdges), radius = state.view.preview || LEVELS[graph.config.level].preview;
  const queue = [[state.currentNodeId, 0]], distance = new Map([[state.currentNodeId, 0]]);
  for (let index = 0; index < queue.length; index++) {
    const [id, depth] = queue[index]; known.add(id);
    if (depth >= radius) continue;
    for (const edge of graph.edges.filter(item => item.from === id)) {
      if (!secretAvailable(state, getNode(graph, edge.to))) continue;
      edges.add(edge.id);
      if (!distance.has(edge.to)) { distance.set(edge.to, depth + 1); queue.push([edge.to, depth + 1]); }
    }
  }
  if (state.view.fog === 'off') {
    graph.nodes.filter(node => secretAvailable(state, node)).forEach(node => known.add(node.id));
    graph.edges.filter(edge => secretAvailable(state, getNode(graph, edge.from)) && secretAvailable(state, getNode(graph, edge.to))).forEach(edge => edges.add(edge.id));
  }
  state.knownNodes = [...known].sort(); state.knownEdges = [...edges].sort();
  if (state.view.fog === 'rumors') state.knownRumors = [...new Set([...state.knownRumors, ...graph.rumors.slice(0, state.view.rumorCount)])].sort();
}
export function visibility(graph, state, id) {
  const node = getNode(graph, id); if (!node) return 'hidden';
  if (state.view.debug) return 'revealed';
  if (!secretAvailable(state, node)) return 'hidden';
  if (state.knownNodes.includes(id)) return 'revealed';
  if (state.knownRumors.includes(id)) return 'rumor';
  if (state.view.paths) return 'unknown';
  return 'hidden';
}
function hasRequirement(state, node) { const requirement = node.requires; return !requirement || (state.inventory.resources[requirement.resourceId] || 0) >= requirement.amount; }
export function accessibility(graph, state, id) {
  const node = getNode(graph, id);
  if (id === state.currentNodeId) return 'current';
  if (state.visitedNodeIds.includes(id)) return 'visited';
  if (!node || !secretAvailable(state, node)) return 'undiscovered';
  if (!reachable(graph, state.currentNodeId).has(id)) return 'missed';
  if (graph.edges.some(edge => edge.from === state.currentNodeId && edge.to === id)) return !hasRequirement(state, node) ? 'locked' : 'next';
  return 'future';
}
export function updateQuests(graph, state) {
  const future = reachable(graph, state.currentNodeId);
  for (const quest of graph.quests) state.questStates[quest.id] = !quest.compatible ? 'incompatible' : state.resolvedEncounters[quest.target] ? 'complete' : !future.has(quest.target) ? 'missed' : 'active';
}
export function huntChance(graph, useBait, lore = 0) {
  const rules = graph.huntingRules || DEFAULT_PROFILE.huntingRules;
  const loreMultiplier = Math.min(rules.loreMultiplierCap, 1 + lore * rules.loreStep);
  const baitMultiplier = useBait ? rules.baitRareMultiplier * graph.effects.bait.multiplier : 1;
  const baseRare = ((graph.huntRarityWeights?.R || 0) + (graph.huntRarityWeights?.U || 0)) / 100;
  const rareWeight = baseRare * graph.effects.rare.multiplier * loreMultiplier * baitMultiplier;
  return rareWeight / (Math.max(.0001, 1 - baseRare) + rareWeight);
}
export function rollHunt(graph, profile, state, node, useBait) {
  const lore = state.lore[graph.config.deck] || 0, chance = huntChance(graph, useBait, lore), usedUnique = new Set(state.uniqueCardIds || []);
  const monsters = profile.cards.filter(card => card.deck === graph.config.deck && card.typeId === 'M' && !(card.rarity === 'U' && (usedUnique.has(card.id) || usedUnique.size >= profile.huntingRules.uniquePerAdventure)));
  const rare = monsters.filter(card => card.rarity !== 'C'), common = monsters.filter(card => card.rarity === 'C');
  const random = rng(`${graph.config.seed}|${graph.config.floor}|hunt|${node.id}|${lore}|${useBait}|${state.huntLog.length}|${graph.profileHash}`);
  let pool;
  if (random() < chance && rare.length) {
    const rareWeights = graph.huntRarityWeights || { R: 95, U: 5 }, unique = rare.filter(card => card.rarity === 'U'), ordinary = rare.filter(card => card.rarity === 'R');
    const uniqueRoll = unique.length && random() < rareWeights.U / Math.max(1, rareWeights.R + rareWeights.U); pool = uniqueRoll ? unique : ordinary.length ? ordinary : unique;
  } else pool = common.length ? common : monsters;
  let roll = random() * pool.reduce((sum, card) => sum + card.selectionWeight, 0), selected = pool[0];
  for (const card of pool) if ((roll -= card.selectionWeight) < 0) { selected = card; break; }
  return { nodeId: node.id, cardId: selected.id, name: selected.name, rarity: selected.rarity, bait: useBait, loreBefore: lore, rareChance: chance };
}
export function transition(graph, profile, original, action) {
  if (!action || typeof action.type !== 'string') throw Error('Invalid action.');
  const state = structuredClone(original), current = getNode(graph, state.currentNodeId);
  switch (action.type) {
    case 'reset': return initialState(graph, profile, state.view);
    case 'view': validateView(action.view); state.view = { ...action.view }; discover(graph, state); break;
    case 'energy': if (state.energy > 99980) throw Error('Test-energy limit reached.'); state.energy += 20; break;
    case 'enter': {
      const node = getNode(graph, action.id), useBait = Boolean(action.bait);
      if (state.status !== 'exploring') throw Error('Complete the current encounter first.');
      if (!node || accessibility(graph, state, node.id) !== 'next') throw Error('This location cannot be entered directly.');
      if (useBait && (node.behavior !== 'hunt' || state.inventory.bait < 1)) throw Error('No suitable bait is available.');
      const cost = node.kind === 'encounter' ? 1 : 0;
      if (state.energy < cost && !state.view.infinite) throw Error('Not enough energy. Add test energy in the lab.');
      if (!state.view.infinite) state.energy -= cost;
      if (node.requires?.consume) { state.inventory.resources[node.requires.resourceId] -= node.requires.amount; state.inventory.fragments = Math.max(0, state.inventory.fragments - node.requires.amount); }
      if (useBait) state.inventory.bait--;
      state.currentNodeId = node.id; state.visitedNodeIds.push(node.id);
      state.pendingHunt = node.behavior === 'hunt' ? rollHunt(graph, profile, state, node, useBait) : null;
      state.status = node.kind === 'end' ? (graph.config.floor < floorProfile(graph.config).floors ? 'floor-cleared' : 'finished') : 'encounter';
      discover(graph, state); break;
    }
    case 'resolve': {
      if (state.status !== 'encounter' || state.resolvedEncounters[current.id]) throw Error('This encounter is already complete.');
      const hunt = state.pendingHunt?.nodeId === current.id ? state.pendingHunt : null, mods = graph.effects, outcome = current.outcome;
      const fragmentBonus = current.produces ? Math.round(10 * mods.fragment.multiplier) : 0;
      const specialBonus = current.special === 'treasure' ? 25 : current.special === 'boss' ? 40 : current.special === 'miniboss' ? 15 : 0;
      const loot = Math.round(outcome.loot * (current.type === 'M' || hunt ? mods.loot.multiplier : 1)) + fragmentBonus + specialBonus;
      const herbs = current.type === 'F' ? Math.max(1, Math.round(outcome.herbs * mods.forage.multiplier)) : 0;
      state.inventory.loot += loot; state.inventory.herbs += herbs;
      if (current.produces) { state.inventory.resources[current.produces.resourceId] = (state.inventory.resources[current.produces.resourceId] || 0) + current.produces.amount; state.inventory.fragments += current.produces.amount; }
      if (hunt) { state.lore[graph.config.deck] = (state.lore[graph.config.deck] || 0) + 1; state.huntLog.push(hunt); if (hunt.rarity === 'U') { state.inventory.uniques++; state.uniqueCardIds.push(hunt.cardId); } }
      else if (current.rarity === 'U') state.inventory.uniques++;
      state.resolvedEncounters[current.id] = { loot, herbs, unique: hunt?.rarity === 'U' || current.rarity === 'U', bait: Boolean(hunt?.bait), fragment: Boolean(current.produces), fragmentBonus, hunt };
      if (current.discovers && !state.discoveredSecrets.includes(current.discovers)) state.discoveredSecrets.push(current.discovers);
      state.pendingHunt = null; state.status = 'exploring'; break;
    }
    default: throw Error('Unknown action.');
  }
  discover(graph, state); updateQuests(graph, state); return state;
}
export function newSession(config, suppliedProfile = DEFAULT_PROFILE) {
  const profile = validateProfile(suppliedProfile), graph = generate({ ...config, floor: 1 }, profile);
  return { schemaVersion: SCHEMA_VERSION, generatorVersion: GENERATOR_VERSION, profile, profileHash: profileHash(profile), config: graph.config, graph, state: initialState(graph, profile), completedFloors: [], generatedUniqueCardIds: [...graph.generatedUniqueCardIds], actions: [] };
}
export function dispatch(session, action) {
  if (session.actions.length >= 10000) throw Error('Action limit reached. Reset the run.');
  let next;
  if (action.type === 'descend') {
    if (session.state.status !== 'floor-cleared' || session.graph.config.floor >= floorProfile(session.graph.config).floors) throw Error('The descent gate is not open yet.');
    const unavailable = [...new Set([...session.generatedUniqueCardIds, ...(session.state.uniqueCardIds || [])])];
    const graph = generate({ ...session.graph.config, floor: session.graph.config.floor + 1 }, session.profile, { usedUniqueCardIds: unavailable });
    const state = initialState(graph, session.profile, session.state.view); state.inventory = structuredClone(session.state.inventory); state.energy = session.state.energy; state.lore = structuredClone(session.state.lore); state.huntLog = structuredClone(session.state.huntLog); state.uniqueCardIds = [...new Set([...unavailable, ...graph.generatedUniqueCardIds])];
    next = { ...session, graph, state, completedFloors: [...session.completedFloors, { graph: session.graph, state: session.state }], generatedUniqueCardIds: [...new Set([...session.generatedUniqueCardIds, ...graph.generatedUniqueCardIds])] };
  } else if (action.type === 'reset') {
    next = newSession(session.config, session.profile); next.state = initialState(next.graph, session.profile, session.state.view);
  } else { const state = transition(session.graph, session.profile, session.state, action); next = { ...session, state, generatedUniqueCardIds: [...new Set([...session.generatedUniqueCardIds, ...(state.uniqueCardIds || [])])] }; }
  return { ...next, actions: [...session.actions, structuredClone(action)] };
}
export function resetSession(session) { return dispatch(session, { type: 'reset' }); }
const normalized = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(item => item === undefined ? null : normalized(item)) : Object.fromEntries(Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => [key, normalized(value[key])])) : value;
const canonical = value => JSON.stringify(normalized(value));
export function importSession(text) {
  if (typeof text !== 'string' || text.length > 5_000_000) throw Error('File is too large (maximum 5 MB).');
  let data; try { data = JSON.parse(text); } catch { throw Error('The file does not contain valid JSON.'); }
  if (!data || data.schemaVersion !== SCHEMA_VERSION || data.generatorVersion !== GENERATOR_VERSION) throw Error('This save-file version is not supported.');
  if (!data.graph || !data.profile || profileHash(validateProfile(data.profile)) !== data.profileHash || !Array.isArray(data.actions) || data.actions.length > 10000) throw Error('The save file is incomplete or modified.');
  let replay = newSession(data.config, data.profile);
  for (const action of data.actions) replay = dispatch(replay, action);
  if (canonical(replay.graph) !== canonical(data.graph) || canonical(replay.state) !== canonical(data.state) || canonical(replay.completedFloors) !== canonical(data.completedFloors) || canonical(replay.config) !== canonical(data.config)) throw Error('The save file does not match its seed, profile, and action history.');
  return replay;
}
export function migrateV4Config(value) {
  let data = value;
  if (typeof value === 'string') { try { data = JSON.parse(value); } catch { return null; } }
  if (!data || data.schemaVersion !== 4 || !data.config) return null;
  const { seed, level, deck, runes, descent } = data.config;
  return { seed, level, deck, runes, descent, floor: 1 };
}
