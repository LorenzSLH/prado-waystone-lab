import { GENERATOR_VERSION, RUNES, TYPES, normalizeConfig, effects, floorProfile } from './config.js';

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

const ROUTES = [
  { id: 'r0', name: 'Der Dornenpfad', subtitle: 'Wo die Wildnis ruft', bias: 'H' },
  { id: 'r1', name: 'Die versunkene Straße', subtitle: 'Echos einer alten Welt', bias: 'E' },
  { id: 'r2', name: 'Das grüne Tal', subtitle: 'Unter dem Blätterdach', bias: 'F' },
];
const NAMES = { M: ['Dornenwächter', 'Wölfe am Wegrand', 'Schatten im Farn', 'Steinerner Wächter'], F: ['Silberblatt-Lichtung', 'Wilder Kräutergarten', 'Moosige Quelle', 'Pilze im Morgenlicht'], H: ['Spuren im Nebel', 'Das stille Jagdrevier', 'Ruf aus den Bäumen', 'Die tiefe Fährte'], E: ['Vergessener Schrein', 'Ein fremdes Lager', 'Flüsternde Steine', 'Der alte Wegweiser'] };
export function topology(config) {
  const p = floorProfile(config), random = rng(`${config.seed}|floor:${config.floor || 1}|topology|${GENERATOR_VERSION}`);
  const nodes = [], edges = [], width = p.routes * 280, height = (p.depth + 2) * 112 + 120;
  const add = (id, depth, routeId, x, kind = 'encounter') => {
    const node = { id, depth, routeId, x: Math.round(x), y: height - 80 - depth * 112, kind };
    nodes.push(node); return node;
  };
  const link = (a, b) => edges.push({ id: `${a.id}>${b.id}`, from: a.id, to: b.id });
  const start = add('start', 0, null, width / 2, 'start');
  const entry = add('entry', 1, null, width / 2); link(start, entry);
  const routes = ROUTES.slice(0, p.routes).map((r, i) => ({ ...r, x: i * 280 + 140 }));
  const ends = [];
  for (const route of routes) {
    let previous = [entry];
    const forkDepths = new Set([p.depth - 2]);
    for (let d = 4; d < p.depth - 3; d += 4) forkDepths.add(d);
    for (let d = 2; d < p.depth; d++) {
      const count = forkDepths.has(d) ? (d === p.depth - 2 ? 2 : (random() < .35 ? 3 : 2)) : 1;
      // One-row forks are always separated by chains. Disjoint corridor intervals prove planarity.
      const current = Array.from({ length: count }, (_, j) => add(`${route.id}-${d}-${j}`, d, route.id, route.x + (j - (count - 1) / 2) * 82 + (random() - .5) * 10));
      if (route.id === 'r1' && d === p.depth - 2) current[0].secret = 'entrance';
      if (route.id === 'r1' && d === p.depth - 1) {
        current[0].x = route.x + 45;
        const cache = add('secret-cache', d, route.id, route.x - 65);
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
  const config = normalizeConfig(input), graph = topology(config), p = floorProfile(config);
  const random = rng(`${config.seed}|floor:${config.floor}|content|${config.runes.join(',')}|${GENERATOR_VERSION}`);
  const weights = Object.fromEntries(TYPES.map(t => [t, config.runes.reduce((s, id) => s + RUNES.find(r => r.id === id).encounterUnits[t], 0)]));
  const slots = graph.nodes.filter(n => n.kind === 'encounter'), counts = budgets(slots.length, weights), left = { ...counts };
  const node = id => graph.nodes.find(n => n.id === id);
  const reserve = (id, types, special, name) => {
    const n = node(id), type = types.find(t => left[t] > 0);
    if (!n || !type || n.type) return false;
    Object.assign(n, { type, special, name }); left[type]--; return true;
  };
  const quests = [];
  if (!reserve('boss', ['M'], p.finalBoss ? 'boss' : 'miniboss', p.finalBoss ? 'Der König unter den Wurzeln' : 'Der Wächter der Tiefe')) throw Error('Ein Ebenenboss braucht mindestens einen Monsterplatz.');
  const huntId = `r0-${p.depth - 1}-0`;
  const huntOk = reserve(huntId, ['H'], 'hunt', 'Das Revier des Silberhirschs');
  quests.push({ id: 'hunt', title: 'Der Silberhirsch', target: huntId, compatible: huntOk, reason: huntOk ? '' : 'Kein Hunt-Budget verfügbar.', description: 'Schließe die Jagd ab. Köder erhöht die Chance auf den seltenen Silberhirsch; der Fund ist keine Pflicht.' });
  const gateId = `r1-${p.depth - 2}-0`, fragmentIds = ['r1-2-0', 'r1-3-0'];
  const fragmentCapacity = left.E + left.F + left.M;
  const gateOk = left.E >= 1 && fragmentCapacity >= 3;
  if (gateOk) {
    reserve(gateId, ['E'], 'gate', 'Das Tor der Morgenröte');
    fragmentIds.forEach((id, i) => reserve(id, ['E', 'M', 'F'], 'fragment', `Runenfragment ${i + 1}`));
    node(`r1-${p.depth - 3}-0`).discovers = 'entrance';
    node(gateId).discovers = 'passage';
    node('secret-cache').special = 'treasure';
    node('secret-cache').name = 'Die verborgene Schatzkammer';
  }
  quests.push({ id: 'gate', title: 'Ein geteiltes Licht', target: gateId, prerequisites: fragmentIds, compatible: gateOk, reason: gateOk ? '' : 'Fragmenttor nicht mit diesem Budget kompatibel.', description: 'Finde zwei Runenfragmente auf der versunkenen Straße und öffne das optionale Tor. Ein freier Pfad führt daran vorbei.' });
  const forageId = `${p.routes === 3 ? 'r2' : 'r0'}-3-0`;
  const forageOk = reserve(forageId, ['F'], 'forage', 'Der Silberblatt-Garten');
  quests.push({ id: 'forage', title: 'Kleine Wunder', target: forageId, compatible: forageOk, reason: forageOk ? '' : 'Kein Sammel-Budget verfügbar.', description: 'Sammle Silberblatt im Garten. Der Sammelauftrag ist auf seiner Route garantiert erfüllbar.' });
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
    n.name ||= NAMES[n.type][Math.floor(random() * NAMES[n.type].length)];
    const encounter = rng(`${config.seed}|floor:${config.floor}|encounter|${config.runes.join(',')}|${n.id}|${GENERATOR_VERSION}`);
    n.outcome = { roll: encounter(), loot: 3 + Math.floor(encounter() * 6), herbs: 1 + Math.floor(encounter() * 3) };
  }
  node('start').name = 'Der Wegstein';
  node('end').name = config.floor < p.floors ? 'Das Tor in die Tiefe' : 'Der Weg nach Hause';
  node('end').special = config.floor < p.floors ? 'descent' : 'exit';
  const rumorRandom = rng(`${config.seed}|floor:${config.floor}|rumors|${GENERATOR_VERSION}`);
  const rumors = quests.filter(q => q.compatible && !node(q.target).secret).map(q => ({ id: q.target, rank: rumorRandom() })).sort((a, b) => a.rank - b.rank).map(r => r.id);
  const result = { generatorVersion: GENERATOR_VERSION, config, ...graph, counts, weights, effects: effects(config.runes), quests, rumors };
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
      if (n.special === 'gate' && s.parts < 2) continue;
      const next = { id: n.id, parts: s.parts + (n.special === 'fragment' ? 1 : 0) - (n.special === 'gate' ? 2 : 0), bait: s.bait };
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
