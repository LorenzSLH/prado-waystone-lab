import { GENERATOR_VERSION, RUNES, TYPES, normalizeConfig, effects, floorProfile } from './config.js';
import { contentPool, deckFor } from './decks.js';

export function rng(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function budgets(total, weights) {
  const sum = TYPES.reduce((s, t) => s + weights[t], 0);
  if (!Number.isInteger(total) || total < 0 || !sum || TYPES.some(t => !Number.isFinite(weights[t]) || weights[t] < 0)) throw Error('Ungültiges Typbudget.');
  const rows = TYPES.map(t => ({ t, exact: total * weights[t] / sum, count: Math.floor(total * weights[t] / sum) }));
  let remainder = total - rows.reduce((s, r) => s + r.count, 0);
  const order = [...rows].sort((a, b) => (b.exact - b.count) - (a.exact - a.count) || a.t.localeCompare(b.t));
  for (let i = 0; i < remainder; i++) order[i].count++;
  return Object.fromEntries(rows.map(r => [r.t, r.count]));
}
export function runeBudgets(total, defaults, runes) {
  const base = budgets(total, defaults);
  const deltas = Object.fromEntries(TYPES.map(type => [type, runes.reduce((sum, id) => sum + RUNES.find(rune => rune.id === id).cardDeltas[type], 0)]));
  const counts = Object.fromEntries(TYPES.map(type => [type, Math.max(1, base[type] + deltas[type])]));
  let overflow = TYPES.reduce((sum, type) => sum + counts[type], 0) - total;
  while (overflow > 0) {
    const type = [...TYPES].sort((a, b) => (counts[b] - 1) - (counts[a] - 1) || a.localeCompare(b)).find(candidate => counts[candidate] > 1);
    if (!type) throw Error('Zu wenige Kartenplätze für alle Kerngruppen.');
    counts[type]--; overflow--;
  }
  while (overflow < 0) { counts.M++; overflow++; }
  return { base, deltas, counts };
}
const RARITY_WEIGHT = { C: 1, U: 2, R: 3, N: 4 };
export function encounterWeight(node) {
  if (node.special === 'boss') return 6;
  if (node.special === 'miniboss') return 5;
  if (node.special === 'treasure') return 4;
  if (['fragment', 'choice', 'hunt'].includes(node.special)) return 3;
  if (['gate', 'forage'].includes(node.special)) return 2;
  return RARITY_WEIGHT[node.rarity] || 1;
}

export function topology(config) {
  const p = floorProfile(config), deck = deckFor(config.deck), dungeon = deck.style === 'dungeon';
  const random = rng(`${config.seed}|${config.deck}|floor:${config.floor || 1}|topology|${GENERATOR_VERSION}`);
  const routeSpacing = dungeon ? 250 : 300, branchSpacing = dungeon ? 82 : 88;
  const nodes = [], edges = [], width = p.routes * routeSpacing, height = (p.depth + 2) * 112 + 120;
  const add = (id, depth, routeId, x, kind = 'encounter') => {
    const node = { id, depth, routeId, x: Math.round(x), y: height - 80 - depth * 112, kind };
    nodes.push(node); return node;
  };
  const link = (a, b) => edges.push({ id: `${a.id}>${b.id}`, from: a.id, to: b.id });
  const start = add('start', 0, null, width / 2, 'start');
  const entry = add('entry', 1, null, width / 2); link(start, entry);
  const routes = deck.routes.slice(0, p.routes).map((r, i) => ({ ...r, x: i * routeSpacing + routeSpacing / 2 }));
  const maxFirst = Math.max(2, Math.min(p.depth - 5, Math.floor(p.depth * .35)));
  const firstDepth = 2 + Math.floor(random() * (maxFirst - 1));
  const secondMin = Math.max(firstDepth + 2, Math.floor(p.depth * .55));
  const secondMax = p.depth - 4;
  const secondDepth = Math.min(secondMax, secondMin + Math.floor(random() * Math.max(1, secondMax - secondMin + 1)));
  const secondLane = 1, firstLane = p.routes === 2 ? 0 : (random() < .5 ? 0 : 2);
  const junctionDepths = new Set([firstDepth + 1]);
  for (let d = firstDepth + 5; d <= p.depth - 4; d += 4) if (d !== secondDepth) junctionDepths.add(d);
  const junctionPairs = {};
  for (const d of junctionDepths) junctionPairs[d] = d === firstDepth + 1 ? [firstLane, secondLane].sort() : (p.routes === 2 ? [0, 1] : (random() < .5 ? [0, 1] : [1, 2]));
  const resourcePlans = deck.secret.lockCost ? [
    { depth: firstDepth, lane: firstLane },
    { depth: secondDepth, lane: secondLane },
  ].slice(0, deck.secret.lockCost) : [];
  for (const item of resourcePlans) {
    item.id = `${routes[item.lane].id}-${item.depth}-0`;
    item.choiceIds = routes.filter((_, i) => i !== item.lane).map(route => `${route.id}-${item.depth}-0`);
  }
  const plan = { resources: resourcePlans, junctionDepths: [...junctionDepths].sort((a, b) => a - b), junctionPairs, gateId: `r1-${p.depth - 2}-0`, discoveryId: `r1-${p.depth - 3}-0` };
  const rows = new Map([[1, [entry]]]);
  const forkDepths = new Set();
  for (let d = 4; d < p.depth - 2; d += dungeon ? 5 : 4) if (Math.abs(d - (p.depth - 2)) > 1 && ![...junctionDepths].some(j => Math.abs(j - d) <= 1) && !resourcePlans.some(item => item.depth === d)) forkDepths.add(d);
  for (let d = 2; d < p.depth; d++) {
    if (junctionDepths.has(d)) {
      const pair = junctionPairs[d], row = [];
      const junction = add(`junction-${d}`, d, null, (routes[pair[0]].x + routes[pair[1]].x) / 2); junction.lanes = pair;
      row.push(junction);
      routes.forEach((route, lane) => { if (!pair.includes(lane)) row.push(add(`${route.id}-${d}-0`, d, route.id, route.x)); });
      rows.set(d, row);
      continue;
    }
    const row = [];
    for (const route of routes) {
      const count = route.id === 'r1' && d === p.depth - 2 ? 2 : forkDepths.has(d) ? (random() < (dungeon ? .25 : .7) ? 2 : 1) : 1;
      for (let j = 0; j < count; j++) row.push(add(`${route.id}-${d}-${j}`, d, route.id, route.x + (j - (count - 1) / 2) * branchSpacing + (random() - .5) * 8));
    }
    if (d === p.depth - 2) nodes.find(n => n.id === plan.gateId).secret = 'entrance';
    if (d === p.depth - 1) {
      const regular = row.find(n => n.id === `r1-${d}-0`); regular.x = routes[1].x + branchSpacing / 2;
      const cache = add('secret-cache', d, 'r1', routes[1].x - branchSpacing / 2); cache.secret = 'passage'; row.push(cache);
    }
    rows.set(d, row);
  }
  const lanesOf = n => n.id === 'entry' ? routes.map((_, i) => i) : n.lanes || [routes.findIndex(route => route.id === n.routeId)];
  for (let d = 2; d < p.depth; d++) {
    const previous = rows.get(d - 1), current = rows.get(d);
    if (d === p.depth - 1) {
      for (const route of routes.filter(route => route.id !== 'r1')) for (const a of previous.filter(n => n.routeId === route.id)) for (const b of current.filter(n => n.routeId === route.id)) link(a, b);
      const gate = previous.find(n => n.id === plan.gateId), bypass = previous.find(n => n.routeId === 'r1' && n.id !== plan.gateId);
      link(gate, current.find(n => n.id === 'secret-cache'));
      link(bypass, current.find(n => n.id === `r1-${d}-0`));
    } else for (const a of previous) for (const b of current.filter(n => n.secret !== 'passage')) if (lanesOf(a).some(lane => lanesOf(b).includes(lane))) link(a, b);
  }
  const ends = rows.get(p.depth - 1);
  const boss = add('boss', p.depth, null, width / 2);
  ends.forEach(n => link(n, boss));
  const end = add('end', p.depth + 1, null, width / 2, 'end'); link(boss, end);
  return { nodes, edges, routes, width, height, plan };
}
export function generate(input) {
  const config = normalizeConfig(input), graph = topology(config), p = floorProfile(config), deck = deckFor(config.deck);
  const random = rng(`${config.seed}|${config.deck}|floor:${config.floor}|content|${config.runes.join(',')}|${GENERATOR_VERSION}`);
  const slots = graph.nodes.filter(n => n.kind === 'encounter');
  const cardBudget = runeBudgets(slots.length, deck.defaultUnits, config.runes);
  const counts = cardBudget.counts, weights = counts, left = { ...counts };
  const node = id => graph.nodes.find(n => n.id === id);
  const reserve = (id, types, special, name) => {
    const n = node(id), type = types.find(t => left[t] > 0);
    if (!n || !type || n.type) return false;
    Object.assign(n, { type, special, name }); left[type]--; return true;
  };
  const quests = [];
  const bossName = deck.bosses[p.finalBoss ? 'boss' : 'miniboss'];
  const bossContent = [...deck.monsters, ...deck.rareEncounters].find(entry => entry.name === bossName);
  if (!reserve('boss', ['M'], p.finalBoss ? 'boss' : 'miniboss', bossName)) throw Error('Ein Ebenenboss braucht mindestens einen Monsterplatz.');
  Object.assign(node('boss'), bossContent, { type: 'M', special: p.finalBoss ? 'boss' : 'miniboss', name: bossName, prototypeRole: p.finalBoss ? 'final boss' : 'floor boss' });
  const huntId = `r0-${p.depth - 1}-0`;
  const huntContent = deck.monsters.find(entry => entry.name === deck.hunt);
  const huntOk = reserve(huntId, ['W'], 'hunt', deck.hunt);
  if (huntOk) Object.assign(node(huntId), huntContent, { type: 'W', special: 'hunt', name: deck.hunt });
  quests.push({ id: 'hunt', title: `Track: ${deck.hunt}`, target: huntId, compatible: huntOk, reason: huntOk ? '' : 'Kein Hunt-Budget verfügbar.', description: `Track and resolve the ${deck.hunt} encounter. Bait improves the rare-result chance but does not guarantee it.` });
  const plannedTradeoffs = new Set(graph.plan.resources.flatMap(item => [item.id, ...item.choiceIds]));
  const forageId = graph.nodes.find(n => n.kind === 'encounter' && n.depth >= 3 && !n.secret && !plannedTradeoffs.has(n.id) && n.routeId === (p.routes === 3 ? 'r2' : 'r0') && !n.type)?.id;
  const forageContent = deck.cards.find(entry => entry.cardType === 'skill_check');
  const forageOk = reserve(forageId, ['F'], 'forage', forageContent?.name || 'Exploration Check');
  if (forageOk && forageContent) Object.assign(node(forageId), forageContent, { type: 'F', special: 'forage' });
  quests.push({ id: 'forage', title: forageContent?.name || 'Explore the Area', target: forageId, compatible: forageOk, reason: forageOk ? '' : 'Kein Skill-Check-Budget verfügbar.', description: 'Complete an exploration skill check on its guaranteed route.' });
  const gateId = graph.plan.gateId, resourceIds = graph.plan.resources.map(item => item.id);
  const secretCapacity = TYPES.reduce((sum, type) => sum + left[type], 0);
  const choiceSlots = graph.plan.resources.reduce((sum, item) => sum + item.choiceIds.length, 0);
  const gateOk = left.E >= 1 && secretCapacity >= deck.secret.lockCost + choiceSlots + 2;
  if (gateOk) {
    reserve(gateId, ['E'], 'gate', deck.secret.entranceName);
    Object.assign(node(gateId), { description: deck.secret.entranceDescription, lockCost: deck.secret.lockCost, secretKind: deck.style === 'dungeon' ? 'gate' : 'trail', cardType: 'event', rarity: 'U' });
    resourceIds.forEach((id, i) => {
      reserve(id, ['E', 'M', 'F'], 'fragment', deck.secret.resourceNames[i]);
      Object.assign(node(id), { description: `One of ${deck.secret.lockCost} pieces needed to open ${deck.secret.entranceName}. Choosing it means leaving a valuable encounter on another lane.`, cardType: 'key', rarity: 'R' });
      const premium = [...deck.cards, ...deck.monsters].filter(entry => !Object.values(deck.bosses).includes(entry.name)).sort((a, b) => (RARITY_WEIGHT[b.rarity] || 1) - (RARITY_WEIGHT[a.rarity] || 1));
      for (const [choiceIndex, choiceId] of graph.plan.resources[i].choiceIds.entries()) {
        const content = premium[choiceIndex % premium.length];
        const preferredType = content.cardType === 'monster' ? 'M' : content.cardType === 'shrine' ? 'S' : content.cardType === 'skill_check' ? 'F' : 'E';
        if (reserve(choiceId, [preferredType, 'W', 'S', 'F', 'M', 'E'], 'choice', content.name)) Object.assign(node(choiceId), content, { special: 'choice', decisionWeight: 3, tradeoffFor: id });
      }
    });
    reserve('secret-cache', [deck.secret.vaultType, 'E', 'S', 'M', 'F', 'W'], 'treasure', deck.secret.vaultName);
    const unique = deck.rareEncounters.find(entry => entry.name === deck.secret.vaultName);
    Object.assign(node('secret-cache'), unique, { name: deck.secret.vaultName, description: deck.secret.vaultDescription, special: 'treasure', unique: true });
    Object.assign(node(graph.plan.discoveryId), { discovers: 'entrance', storyBeat: deck.secret.discoveryName });
    node(gateId).discovers = 'passage';
  }
  quests.push({ id: 'gate', title: deck.secret.questTitle, target: gateId, prerequisites: resourceIds, compatible: gateOk, reason: gateOk ? '' : 'Geheimbegegnung nicht mit diesem Budget kompatibel.', description: deck.secret.lockCost ? `Find ${deck.secret.lockCost} ${deck.secret.resourceLabel.toLowerCase()}, open the side arm and discover ${deck.secret.vaultName}.` : `Discover the side trail and find ${deck.secret.vaultName}.` });
  // Weighted sampling without replacement preserves exact global counts and gives each route a focus.
  for (const n of slots) {
    if (!n.type) {
      const bias = graph.routes.find(r => r.id === n.routeId)?.bias;
      const siblingTypes = new Set(graph.edges.filter(e => e.to === n.id).flatMap(e => graph.edges.filter(other => other.from === e.from && other.to !== n.id)).map(e => node(e.to)?.type).filter(Boolean));
      const distinctAvailable = TYPES.some(t => left[t] > 0 && !siblingTypes.has(t));
      const mass = TYPES.map(t => ({ t, value: siblingTypes.has(t) && distinctAvailable ? 0 : left[t] * (t === bias ? 3 : 1) }));
      let roll = random() * mass.reduce((s, v) => s + v.value, 0);
      let type = mass.find(v => v.value && (roll -= v.value) < 0)?.t;
      type ||= TYPES.find(t => left[t] > 0);
      n.type = type; left[type]--;
    }
    if (!n.name) {
      const fullPool = contentPool(deck, n.type), pool = fullPool.filter(entry => entry.rarity === 'C');
      const choices = pool.length ? pool : fullPool;
      const content = choices[Math.floor(random() * choices.length)];
      Object.assign(n, content);
    }
    const encounter = rng(`${config.seed}|${config.deck}|floor:${config.floor}|encounter|${config.runes.join(',')}|${n.id}|${GENERATOR_VERSION}`);
    n.outcome = { roll: encounter(), loot: 3 + Math.floor(encounter() * 6), herbs: 1 + Math.floor(encounter() * 3) };
    n.decisionWeight ??= encounterWeight(n);
  }
  node('start').name = 'Der Wegstein';
  node('start').description = `${deck.name} begins here. ${deck.description}`;
  node('end').name = config.floor < p.floors ? 'Das Tor in die Tiefe' : 'Der Weg nach Hause';
  node('end').special = config.floor < p.floors ? 'descent' : 'exit';
  const rumorRandom = rng(`${config.seed}|${config.deck}|floor:${config.floor}|rumors|${GENERATOR_VERSION}`);
  const rumors = quests.filter(q => q.compatible && !node(q.target).secret).map(q => ({ id: q.target, rank: rumorRandom() })).sort((a, b) => a.rank - b.rank).map(r => r.id);
  const regular = graph.nodes.filter(n => n.kind === 'encounter' && !n.secret), totalWeight = regular.reduce((sum, n) => sum + n.decisionWeight, 0);
  const pathRange = regularPathWeightRange(graph);
  const result = { generatorVersion: GENERATOR_VERSION, config, deck: structuredClone(deck), ...graph, counts, weights, cardBudget, effects: effects(config.runes), quests, rumors, weightProfile: { total: totalWeight, average: totalWeight / regular.length, ...pathRange, scale: { basic: 1, uncommon: 2, rare: 3, unique: 4, miniboss: 5, boss: 6 } } };
  validateGraph(result);
  return result;
}
export function reachable(graph, from) {
  const found = new Set([from]), queue = [from], adjacency = new Map();
  for (const e of graph.edges) { if (!adjacency.has(e.from)) adjacency.set(e.from, []); adjacency.get(e.from).push(e.to); }
  for (let i = 0; i < queue.length; i++) for (const id of adjacency.get(queue[i]) || []) if (!found.has(id)) { found.add(id); queue.push(id); }
  return found;
}
export function regularPathWeightRange(graph) {
  const byId = new Map(graph.nodes.map(n => [n.id, n])), ranges = new Map([['start', { min: 0, max: 0 }]]);
  for (const current of [...graph.nodes].sort((a, b) => a.depth - b.depth)) {
    const range = ranges.get(current.id); if (!range) continue;
    for (const edge of graph.edges.filter(e => e.from === current.id)) {
      const next = byId.get(edge.to); if (next.secret) continue;
      const weight = next.decisionWeight || 0, prior = ranges.get(next.id);
      const candidate = { min: range.min + weight, max: range.max + weight };
      ranges.set(next.id, prior ? { min: Math.min(prior.min, candidate.min), max: Math.max(prior.max, candidate.max) } : candidate);
    }
  }
  const boss = ranges.get('boss');
  return { pathMin: boss.min, pathMax: boss.max, pathSpread: boss.max - boss.min };
}
export function segmentsCross(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return cross(a, b, c) * cross(a, b, d) < -1e-7 && cross(c, d, a) * cross(c, d, b) < -1e-7;
}
export function questSolvable(graph, quest) {
  if (!quest.compatible) return true;
  const byId = new Map(graph.nodes.map(n => [n.id, n])), queue = [{ id: 'start', parts: 0, bait: 2 }], seen = new Set();
  for (let i = 0; i < queue.length; i++) {
    const s = queue[i]; if (s.id === quest.target) return true;
    for (const e of graph.edges.filter(e => e.from === s.id)) {
      const n = byId.get(e.to);
      const lockCost = n.special === 'gate' ? (n.lockCost ?? 2) : 0;
      if (s.parts < lockCost) continue;
      const next = { id: n.id, parts: s.parts + (n.special === 'fragment' ? 1 : 0) - lockCost, bait: s.bait };
      const key = `${next.id}/${next.parts}/${next.bait}`;
      if (!seen.has(key)) { seen.add(key); queue.push(next); }
    }
  }
  return false;
}
export function validateGraph(g) {
  const fail = s => { throw Error(`Generator: ${s} [${g.config.seed}, L${g.config.level}]`); };
  const byId = new Map(g.nodes.map(n => [n.id, n])), p = floorProfile(g.config);
  if (byId.size !== g.nodes.length || g.nodes.length > p.depth * p.routes * 3 + 5) fail('Knotengrenze/IDs');
  if (reachable(g, 'start').size !== g.nodes.length) fail('unerreichbare Knoten');
  const actual = Object.fromEntries(TYPES.map(t => [t, 0]));
  for (const n of g.nodes) {
    const out = g.edges.filter(e => e.from === n.id);
    if (n.kind === 'end' ? out.length !== 0 : out.length < 1 || out.length > 4) fail('Nachfolger');
    if (n.kind === 'encounter') { if (!(n.type in actual)) fail('Typ'); actual[n.type]++; }
    if (out.length && out.every(e => byId.get(e.to).special === 'gate')) fail('Tor ist einziger Ausweg');
    if (n.kind === 'end' && n.depth !== p.depth + 1) fail('Pfadtiefe');
  }
  for (const t of TYPES) if (actual[t] !== g.counts[t] || (!g.weights[t] && actual[t])) fail('Budget');
  for (const e of g.edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b || b.depth !== a.depth + 1) fail('Rückwärtskante/Tiefe');
    if (a.routeId && b.routeId && a.routeId !== b.routeId) fail('Querverbindung');
    if (a.routeId && !b.routeId && b.id !== 'boss' && !b.id.startsWith('junction-')) fail('unerlaubte Zusammenführung');
  }
  for (let i = 0; i < g.edges.length; i++) for (let j = i + 1; j < g.edges.length; j++) {
    const a = g.edges[i], b = g.edges[j];
    if ([a.from, a.to].some(id => id === b.from || id === b.to)) continue;
    if (segmentsCross(byId.get(a.from), byId.get(a.to), byId.get(b.from), byId.get(b.to))) fail('Kantenkreuzung');
  }
  for (const q of g.quests) if (!questSolvable(g, q)) fail(`Quest ${q.id} nicht lösbar`);
  for (const item of g.plan.resources) {
    const choices = [byId.get(item.id), ...item.choiceIds.map(id => byId.get(id))];
    if (new Set(choices.map(n => n.routeId)).size !== choices.length || new Set(choices.map(n => n.decisionWeight)).size !== 1) fail('unausgewogener Fragmenttausch');
  }
  if (g.weightProfile.pathSpread > 3) fail('ungleiche Pfadwerte');
  if (g.nodes.filter(n => n.kind === 'end').length !== 1 || g.edges.some(e => e.to === 'end' && e.from !== 'boss')) fail('Abschluss ohne Boss');
  for (const n of g.nodes.filter(n => n.id !== 'end')) if (!reachable(g, n.id).has('boss')) fail('Pfad führt nicht zum Boss');
  return true;
}
