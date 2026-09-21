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
  const ends = [];
  for (const route of routes) {
    let previous = [entry];
    const forkDepths = new Set([p.depth - 2]);
    for (let d = dungeon ? 4 : 3; d < p.depth - 3; d += 4) forkDepths.add(d);
    for (let d = 2; d < p.depth; d++) {
      const count = forkDepths.has(d) ? (d === p.depth - 2 ? 2 : (random() < (dungeon ? .2 : .65) ? 3 : 2)) : 1;
      // One-row forks are always separated by chains. Disjoint corridor intervals prove planarity.
      const current = Array.from({ length: count }, (_, j) => add(`${route.id}-${d}-${j}`, d, route.id, route.x + (j - (count - 1) / 2) * branchSpacing + (random() - .5) * 10));
      if (route.id === 'r1' && d === p.depth - 2) current[0].secret = 'entrance';
      if (route.id === 'r1' && d === p.depth - 1) {
        current[0].x = route.x + branchSpacing / 2;
        const cache = add('secret-cache', d, route.id, route.x - branchSpacing / 2);
        cache.secret = 'passage';
        link(previous[0], cache);
        previous.slice(1).forEach(a => link(a, current[0]));
        current.push(cache);
      } else for (const a of previous) for (const b of current) link(a, b);
      previous = current;
    }
    ends.push(...previous);
  }
  const boss = add('boss', p.depth, null, width / 2);
  ends.forEach(n => link(n, boss));
  const end = add('end', p.depth + 1, null, width / 2, 'end'); link(boss, end);
  return { nodes, edges, routes, width, height };
}
export function generate(input) {
  const config = normalizeConfig(input), graph = topology(config), p = floorProfile(config), deck = deckFor(config.deck);
  const random = rng(`${config.seed}|${config.deck}|floor:${config.floor}|content|${config.runes.join(',')}|${GENERATOR_VERSION}`);
  const weights = Object.fromEntries(TYPES.map(t => [t, config.runes.reduce((s, id) => s + RUNES.find(r => r.id === id).encounterUnits[t], 0)]));
  const slots = graph.nodes.filter(n => n.kind === 'encounter'), counts = budgets(slots.length, weights), left = { ...counts };
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
  const huntOk = reserve(huntId, ['H'], 'hunt', deck.hunt);
  if (huntOk) Object.assign(node(huntId), huntContent, { type: 'H', special: 'hunt', name: deck.hunt });
  quests.push({ id: 'hunt', title: `Track: ${deck.hunt}`, target: huntId, compatible: huntOk, reason: huntOk ? '' : 'Kein Hunt-Budget verfügbar.', description: `Track and resolve the ${deck.hunt} encounter. Bait improves the rare-result chance but does not guarantee it.` });
  const forageId = `${p.routes === 3 ? 'r2' : 'r0'}-3-0`;
  const forageContent = deck.cards.find(entry => entry.cardType === 'skill_check');
  const forageOk = reserve(forageId, ['F'], 'forage', forageContent?.name || 'Exploration Check');
  if (forageOk && forageContent) Object.assign(node(forageId), forageContent, { type: 'F', special: 'forage' });
  quests.push({ id: 'forage', title: forageContent?.name || 'Explore the Area', target: forageId, compatible: forageOk, reason: forageOk ? '' : 'Kein Skill-Check-Budget verfügbar.', description: 'Complete an exploration skill check on its guaranteed route.' });
  const gateId = `r1-${p.depth - 2}-0`, resourceIds = deck.secret.lockCost ? ['r1-2-0', 'r1-3-0'].slice(0, deck.secret.lockCost) : [];
  const secretCapacity = TYPES.reduce((sum, type) => sum + left[type], 0);
  const gateOk = left.E >= 1 && secretCapacity >= deck.secret.lockCost + 2;
  if (gateOk) {
    reserve(gateId, ['E'], 'gate', deck.secret.entranceName);
    Object.assign(node(gateId), { description: deck.secret.entranceDescription, lockCost: deck.secret.lockCost, secretKind: deck.style === 'dungeon' ? 'gate' : 'trail', cardType: 'event', rarity: 'U' });
    resourceIds.forEach((id, i) => {
      reserve(id, ['E', 'M', 'F'], 'fragment', deck.secret.resourceNames[i]);
      Object.assign(node(id), { description: `One of ${deck.secret.lockCost} pieces needed to open ${deck.secret.entranceName}.`, cardType: 'key', rarity: 'C' });
    });
    reserve('secret-cache', [deck.secret.vaultType, 'E', 'M', 'F', 'H'], 'treasure', deck.secret.vaultName);
    const unique = deck.rareEncounters.find(entry => entry.name === deck.secret.vaultName);
    Object.assign(node('secret-cache'), unique, { name: deck.secret.vaultName, description: deck.secret.vaultDescription, special: 'treasure', unique: true });
    Object.assign(node(`r1-${p.depth - 3}-0`), { discovers: 'entrance', storyBeat: deck.secret.discoveryName });
    node(gateId).discovers = 'passage';
  }
  quests.push({ id: 'gate', title: deck.secret.questTitle, target: gateId, prerequisites: resourceIds, compatible: gateOk, reason: gateOk ? '' : 'Geheimbegegnung nicht mit diesem Budget kompatibel.', description: deck.secret.lockCost ? `Find ${deck.secret.lockCost} ${deck.secret.resourceLabel.toLowerCase()}, open the side arm and discover ${deck.secret.vaultName}.` : `Discover the side trail and find ${deck.secret.vaultName}.` });
  // Weighted sampling without replacement preserves exact global counts and gives each route a focus.
  for (const n of slots) {
    if (!n.type) {
      const bias = graph.routes.find(r => r.id === n.routeId)?.bias;
      const mass = TYPES.map(t => ({ t, value: left[t] * (t === bias ? 3 : 1) }));
      let roll = random() * mass.reduce((s, v) => s + v.value, 0);
      let type = mass.find(v => v.value && (roll -= v.value) < 0)?.t;
      type ||= TYPES.find(t => left[t] > 0);
      n.type = type; left[type]--;
    }
    if (!n.name) {
      const pool = contentPool(deck, n.type);
      const content = pool[Math.floor(random() * pool.length)];
      Object.assign(n, content);
    }
    const encounter = rng(`${config.seed}|${config.deck}|floor:${config.floor}|encounter|${config.runes.join(',')}|${n.id}|${GENERATOR_VERSION}`);
    n.outcome = { roll: encounter(), loot: 3 + Math.floor(encounter() * 6), herbs: 1 + Math.floor(encounter() * 3) };
  }
  node('start').name = 'Der Wegstein';
  node('start').description = `${deck.name} begins here. ${deck.description}`;
  node('end').name = config.floor < p.floors ? 'Das Tor in die Tiefe' : 'Der Weg nach Hause';
  node('end').special = config.floor < p.floors ? 'descent' : 'exit';
  const rumorRandom = rng(`${config.seed}|${config.deck}|floor:${config.floor}|rumors|${GENERATOR_VERSION}`);
  const rumors = quests.filter(q => q.compatible && !node(q.target).secret).map(q => ({ id: q.target, rank: rumorRandom() })).sort((a, b) => a.rank - b.rank).map(r => r.id);
  const result = { generatorVersion: GENERATOR_VERSION, config, deck: structuredClone(deck), ...graph, counts, weights, effects: effects(config.runes), quests, rumors };
  validateGraph(result);
  return result;
}
export function reachable(graph, from) {
  const found = new Set([from]), queue = [from], adjacency = new Map();
  for (const e of graph.edges) { if (!adjacency.has(e.from)) adjacency.set(e.from, []); adjacency.get(e.from).push(e.to); }
  for (let i = 0; i < queue.length; i++) for (const id of adjacency.get(queue[i]) || []) if (!found.has(id)) { found.add(id); queue.push(id); }
  return found;
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
    if (n.kind === 'end' ? out.length !== 0 : out.length < 1 || out.length > 3) fail('Nachfolger');
    if (n.kind === 'encounter') { if (!(n.type in actual)) fail('Typ'); actual[n.type]++; }
    if (out.length && out.every(e => byId.get(e.to).special === 'gate')) fail('Tor ist einziger Ausweg');
    if (n.kind === 'end' && n.depth !== p.depth + 1) fail('Pfadtiefe');
  }
  for (const t of TYPES) if (actual[t] !== g.counts[t] || (!g.weights[t] && actual[t])) fail('Budget');
  for (const e of g.edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b || b.depth !== a.depth + 1) fail('Rückwärtskante/Tiefe');
    if (a.routeId && b.routeId && a.routeId !== b.routeId) fail('Querverbindung');
    if (a.routeId && !b.routeId && b.id !== 'boss') fail('unerlaubte Zusammenführung');
  }
  for (let i = 0; i < g.edges.length; i++) for (let j = i + 1; j < g.edges.length; j++) {
    const a = g.edges[i], b = g.edges[j];
    if ([a.from, a.to].some(id => id === b.from || id === b.to)) continue;
    if (segmentsCross(byId.get(a.from), byId.get(a.to), byId.get(b.from), byId.get(b.to))) fail('Kantenkreuzung');
  }
  for (const q of g.quests) if (!questSolvable(g, q)) fail(`Quest ${q.id} nicht lösbar`);
  if (g.nodes.filter(n => n.kind === 'end').length !== 1 || g.edges.some(e => e.to === 'end' && e.from !== 'boss')) fail('Abschluss ohne Boss');
  for (const n of g.nodes.filter(n => n.id !== 'end')) if (!reachable(g, n.id).has('boss')) fail('Pfad führt nicht zum Boss');
  return true;
}
