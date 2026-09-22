import { GENERATOR_VERSION, normalizeConfig, effects, floorProfile } from './config.js';
import { deckFor } from './decks.js';
import { DEFAULT_PROFILE, cardEligible, profileHash, profileRune, profileTypeMap, profileTypes, validateProfile } from './profile.js';

export function rng(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function budgets(total, weights, typeIds = Object.keys(weights).sort()) {
  const sum = typeIds.reduce((value, id) => value + Number(weights[id] || 0), 0);
  if (!Number.isInteger(total) || total < 0 || !sum || typeIds.some(id => !Number.isFinite(Number(weights[id])) || Number(weights[id]) < 0)) throw Error('Ungültiges Typbudget.');
  const rows = typeIds.map(id => ({ id, exact: total * Number(weights[id] || 0) / sum, count: Math.floor(total * Number(weights[id] || 0) / sum) }));
  let remainder = total - rows.reduce((value, row) => value + row.count, 0);
  const order = [...rows].sort((a, b) => (b.exact - b.count) - (a.exact - a.count) || a.id.localeCompare(b.id));
  for (let index = 0; index < remainder; index++) order[index].count++;
  return Object.fromEntries(rows.map(row => [row.id, row.count]));
}
export function runeBudgets(total, defaults, runes, profile = DEFAULT_PROFILE, minimums = {}) {
  const ids = profileTypes(profile), base = budgets(total, defaults, ids);
  const deltas = Object.fromEntries(ids.map(id => [id, runes.reduce((sum, runeId) => sum + Number(profileRune(profile, runeId).cardDeltas[id] || 0), 0)]));
  const requiredBase = Object.fromEntries(ids.map(id => [id, Math.max(0, Number(minimums[id] || 0) - deltas[id])]));
  for (const id of ids) {
    const required = requiredBase[id];
    while (base[id] < required) {
      const donor = [...ids].filter(other => other !== id && base[other] > requiredBase[other]).sort((a, b) => base[b] - base[a] || a.localeCompare(b))[0];
      if (!donor) throw Error(`Pflichtkarten benötigen mehr ${id}-Plätze als die Karte erlaubt.`);
      base[donor]--; base[id]++;
    }
  }
  const counts = Object.fromEntries(ids.map(id => [id, base[id] + deltas[id]]));
  for (const id of ids) if (counts[id] < Number(minimums[id] || 0)) throw Error(`Runen reduzieren ${profile.cardTypes.find(type => type.id === id).name} unter das Pflichtminimum ${minimums[id] || 0}.`);
  return { base, deltas, counts, total: ids.reduce((sum, id) => sum + counts[id], 0) };
}

const snapshot = (graph, phase, details) => ({ phase, details, snapshot: { nodes: structuredClone(graph.nodes), edges: structuredClone(graph.edges) } });
const positionAllows = (rule, level, depth) => !rule || (level >= rule.minLevel && level <= rule.maxLevel && depth >= rule.minDepth && depth <= rule.maxDepth);
const featureFor = (profile, config) => {
  const p = floorProfile(config), cards = profile.cards.filter(card => card.deck === config.deck);
  const gate = cards.find(card => (card.behavior || profile.cardTypes.find(type => type.id === card.typeId)?.behavior) === 'gate' && positionAllows(card.placement, config.level, p.depth - 2));
  if (!gate) return { enabled: false, gate: null, producers: [], lockCost: 0 };
  const lockCost = Number(gate.requires?.amount || 0), resourceId = gate.requires?.resourceId;
  const producers = resourceId ? cards.filter(card => card.produces?.resourceId === resourceId && positionAllows(card.placement, config.level, Math.max(2, card.placement?.minDepth || 2))).slice(0, lockCost) : [];
  if (producers.reduce((sum, card) => sum + Number(card.produces?.amount || 0), 0) < lockCost) throw Error(`Tür ${gate.name} benötigt ${lockCost} × ${resourceId}, aber der Katalog bietet zu wenige vorherige Ressourcen.`);
  return { enabled: true, gate, producers, lockCost, resourceId };
};

export function topology(input, options = {}) {
  const config = normalizeConfig(input, options.profile || DEFAULT_PROFILE), p = floorProfile(config), deck = deckFor(config.deck), dungeon = deck.style === 'dungeon';
  const feature = options.feature || { enabled: true, lockCost: deck.secret.lockCost, producers: [] }, adjustment = Number(options.adjustment || 0);
  const random = rng(`${config.seed}|${config.deck}|floor:${config.floor || 1}|topology|${GENERATOR_VERSION}`);
  const routeSpacing = dungeon ? 250 : 300, branchSpacing = dungeon ? 82 : 88;
  const nodes = [], edges = [], width = p.routes * routeSpacing, height = (p.depth + 2) * 112 + 120;
  const add = (id, depth, routeId, x, kind = 'encounter') => { const node = { id, depth, routeId, x: Math.round(x), y: height - 80 - depth * 112, kind }; nodes.push(node); return node; };
  const link = (a, b) => edges.push({ id: `${a.id}>${b.id}`, from: a.id, to: b.id });
  const start = add('start', 0, null, width / 2, 'start'), entry = add('entry', 1, null, width / 2); link(start, entry);
  const routes = deck.routes.slice(0, p.routes).map((route, index) => ({ ...route, x: index * routeSpacing + routeSpacing / 2 }));
  const maxFirst = Math.max(2, Math.min(p.depth - 5, Math.floor(p.depth * .35)));
  const firstDepth = 2 + Math.floor(random() * Math.max(1, maxFirst - 1));
  const secondMin = Math.max(firstDepth + 2, Math.floor(p.depth * .55)), secondMax = p.depth - 4;
  const secondDepth = Math.min(secondMax, secondMin + Math.floor(random() * Math.max(1, secondMax - secondMin + 1)));
  const secondLane = Math.min(1, p.routes - 1), firstLane = p.routes === 2 ? 0 : (random() < .5 ? 0 : 2);
  const junctionDepths = new Set([firstDepth + 1]);
  for (let depth = firstDepth + 5; depth <= p.depth - 4; depth += 4) if (depth !== secondDepth) junctionDepths.add(depth);
  const junctionPairs = {};
  for (const depth of junctionDepths) junctionPairs[depth] = depth === firstDepth + 1 ? [firstLane, secondLane].sort() : (p.routes === 2 ? [0, 1] : (random() < .5 ? [0, 1] : [1, 2]));
  const resourcePlans = feature.enabled && feature.lockCost ? Array.from({ length: feature.lockCost }, (_, index) => ({ depth: index ? secondDepth : firstDepth, lane: index ? secondLane : firstLane, cardId: feature.producers[index]?.id })) : [];
  for (const item of resourcePlans) { item.id = `${routes[item.lane].id}-${item.depth}-0`; item.choiceIds = routes.filter((_, index) => index !== item.lane).map(route => `${route.id}-${item.depth}-0`); }
  const plan = { resources: resourcePlans, junctionDepths: [...junctionDepths].sort((a, b) => a - b), junctionPairs, gateId: feature.enabled ? `r1-${p.depth - 2}-0` : null, discoveryId: feature.enabled ? `r1-${p.depth - 3}-0` : null, featureEnabled: feature.enabled };
  const forkDepths = new Set();
  for (let depth = 4; depth < p.depth - 2; depth += dungeon ? 5 : 4) if (![...junctionDepths].some(value => Math.abs(value - depth) <= 1) && !resourcePlans.some(item => item.depth === depth)) forkDepths.add(depth);
  const rowCounts = new Map(), candidates = [];
  for (let depth = 2; depth < p.depth; depth++) if (!junctionDepths.has(depth)) for (const route of routes) {
    const minimum = feature.enabled && route.id === 'r1' && depth === p.depth - 2 ? 2 : 1;
    const count = Math.max(minimum, forkDepths.has(depth) && random() < (dungeon ? .25 : .7) ? 2 : 1);
    const key = `${depth}/${route.id}`; rowCounts.set(key, count);
    if (depth > 2 && !junctionDepths.has(depth - 1) && !(feature.enabled && route.id === 'r1' && depth >= p.depth - 2)) candidates.push({ key, minimum, depth, route });
  }
  // Every floor starts with a small reserve of optional alternatives. This makes
  // negative rune totals meaningful without ever deleting a mandatory corridor.
  const reserveDepth = [...new Set(candidates.map(item => item.depth))].find(depth => candidates.filter(item => item.depth === depth).length === routes.length);
  for (const item of candidates.filter(item => item.depth === reserveDepth)) rowCounts.set(item.key, Math.max(rowCounts.get(item.key), item.minimum + 1));
  let remaining = adjustment;
  if (remaining > 0) for (let pass = 0; remaining > 0 && pass < 3; pass++) for (const item of candidates) if (remaining > 0 && rowCounts.get(item.key) < Number(options.maxBranches || 3)) { rowCounts.set(item.key, rowCounts.get(item.key) + 1); remaining--; }
  if (remaining < 0) for (const item of [...candidates].reverse()) while (remaining < 0 && rowCounts.get(item.key) > item.minimum) { rowCounts.set(item.key, rowCounts.get(item.key) - 1); remaining++; }
  if (remaining) throw Error(`Runen ändern die Kartenzahl um ${adjustment}; auf dieser Ebene können davon nur ${adjustment - remaining} Knoten sicher platziert werden.`);
  const rows = new Map([[1, [entry]]]);
  for (let depth = 2; depth < p.depth; depth++) {
    if (junctionDepths.has(depth)) {
      const pair = junctionPairs[depth], row = [], junction = add(`junction-${depth}`, depth, null, (routes[pair[0]].x + routes[pair[1]].x) / 2); junction.lanes = pair; row.push(junction);
      routes.forEach((route, lane) => { if (!pair.includes(lane)) row.push(add(`${route.id}-${depth}-0`, depth, route.id, route.x)); }); rows.set(depth, row); continue;
    }
    const row = [];
    for (const route of routes) {
      const count = rowCounts.get(`${depth}/${route.id}`);
      for (let index = 0; index < count; index++) row.push(add(`${route.id}-${depth}-${index}`, depth, route.id, route.x + (index - (count - 1) / 2) * branchSpacing + (random() - .5) * 8));
    }
    if (feature.enabled && depth === p.depth - 2) nodes.find(node => node.id === plan.gateId).secret = 'entrance';
    if (feature.enabled && depth === p.depth - 1) {
      const regular = row.find(node => node.id === `r1-${depth}-0`); regular.x = routes[1].x + branchSpacing / 2;
      const cache = add('secret-cache', depth, 'r1', routes[1].x - branchSpacing / 2); cache.secret = 'passage'; row.push(cache);
    }
    rows.set(depth, row);
  }
  const lanesOf = node => node.id === 'entry' ? routes.map((_, index) => index) : node.lanes || [routes.findIndex(route => route.id === node.routeId)];
  const linkRegularRows = (previous, current) => {
    for (const from of previous) {
      const allowed = current.filter(to => to.secret !== 'passage' && lanesOf(from).some(lane => lanesOf(to).includes(lane)));
      if (!from.routeId || allowed.length <= 1) allowed.forEach(to => link(from, to));
      else {
        const same = allowed.filter(to => to.routeId === from.routeId);
        if (same.length) {
          const open = same.filter(to => to.id !== plan.gateId), chosen = [...(open.length ? open : same)].sort((a, b) => Math.abs(a.x - from.x) - Math.abs(b.x - from.x))[0]; link(from, chosen);
        }
        else allowed.forEach(to => link(from, to));
      }
    }
    for (const to of current.filter(node => node.secret !== 'passage')) if (!edges.some(edge => edge.to === to.id)) {
      const allowed = previous.filter(from => lanesOf(from).some(lane => lanesOf(to).includes(lane)));
      const nearest = [...allowed].sort((a, b) => Math.abs(a.x - to.x) - Math.abs(b.x - to.x))[0]; if (nearest) link(nearest, to);
    }
  };
  for (let depth = 2; depth < p.depth; depth++) {
    const previous = rows.get(depth - 1), current = rows.get(depth);
    if (feature.enabled && depth === p.depth - 1) {
      for (const route of routes.filter(route => route.id !== 'r1')) for (const from of previous.filter(node => node.routeId === route.id)) for (const to of current.filter(node => node.routeId === route.id)) link(from, to);
      const gate = previous.find(node => node.id === plan.gateId), bypass = previous.find(node => node.routeId === 'r1' && node.id !== plan.gateId);
      link(gate, current.find(node => node.id === 'secret-cache')); link(bypass, current.find(node => node.id === `r1-${depth}-0`));
    } else linkRegularRows(previous, current);
  }
  const boss = add('boss', p.depth, null, width / 2); rows.get(p.depth - 1).forEach(node => link(node, boss));
  const end = add('end', p.depth + 1, null, width / 2, 'end'); link(boss, end);
  return { nodes, edges, routes, width, height, plan };
}

function weightedPick(items, weight, random) {
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(weight(item) || 0)), 0);
  if (!total) return undefined;
  let roll = random() * total;
  return items.find(item => (roll -= Math.max(0, Number(weight(item) || 0))) < 0) || items.at(-1);
}
function requiredMinimums(profile, config, feature) {
  const result = Object.fromEntries(profileTypes(profile).map(id => [id, 0])), add = id => { if (id in result) result[id]++; };
  add('M'); add('W'); add('F');
  if (feature.enabled) { add(feature.gate.typeId); feature.producers.forEach(card => add(card.typeId)); add('E'); }
  return result;
}
function chooseCatalogCard(profile, config, type, node, random, uniqueIds, maxUnique) {
  const typeRule = profile.cardTypes.find(item => item.id === type);
  const candidates = profile.cards.filter(card => card.deck === config.deck && card.typeId === type && !['gate', 'resource'].includes(card.behavior) && cardEligible(card, config.level, node.depth) && !(card.rarity === 'U' && (uniqueIds.has(card.id) || uniqueIds.size >= maxUnique)));
  if (!candidates.length) throw Error(`${typeRule.name} hat auf Tiefe ${node.depth} keine zulässige Karte.`);
  const rarityPool = ['C', 'R', 'U'].filter(rarity => candidates.some(card => card.rarity === rarity));
  const pickedRarity = weightedPick(rarityPool, rarity => typeRule.rarityWeights[rarity], random) || candidates[0].rarity;
  const picked = weightedPick(candidates.filter(card => card.rarity === pickedRarity), card => card.selectionWeight, random);
  if (picked.rarity === 'U') uniqueIds.add(picked.id);
  return picked;
}

export function generate(input, suppliedProfile = DEFAULT_PROFILE, options = {}) {
  const profile = suppliedProfile === DEFAULT_PROFILE ? DEFAULT_PROFILE : validateProfile(suppliedProfile), hash = profileHash(profile), config = normalizeConfig(input, profile), deck = deckFor(config.deck), p = floorProfile(config), feature = featureFor(profile, config), ids = profileTypes(profile), typeMap = profileTypeMap(profile);
  const baseGraph = topology(config, { profile, feature, adjustment: 0, maxBranches: profile.placementRules.maxBranchesPerLane });
  const baseTotal = baseGraph.nodes.filter(node => node.kind === 'encounter').length;
  const probabilities = Object.fromEntries(profile.cardTypes.map(type => [type.id, type.baseProbability]));
  const minimums = requiredMinimums(profile, config, feature), cardBudget = runeBudgets(baseTotal, probabilities, config.runes, profile, minimums);
  const adjustment = cardBudget.total - baseTotal;
  const graph = adjustment ? topology(config, { profile, feature, adjustment, maxBranches: profile.placementRules.maxBranchesPerLane }) : baseGraph;
  const slots = graph.nodes.filter(node => node.kind === 'encounter');
  if (slots.length !== cardBudget.total) throw Error(`Kartenziel ${cardBudget.total} stimmt nicht mit ${slots.length} erzeugten Plätzen überein.`);
  const counts = cardBudget.counts, left = { ...counts }, byId = id => graph.nodes.find(node => node.id === id), random = rng(`${config.seed}|${config.deck}|floor:${config.floor}|content|${config.runes.join(',')}|${hash}|${GENERATOR_VERSION}`);
  const traceEnabled = options.trace !== false;
  const trace = traceEnabled ? [
    { phase: 'validate', details: [`Profil ${profile.name} ist gültig.`, `Seed ${config.seed} · Level ${config.level} · Ebene ${config.floor}`], snapshot: { nodes: [], edges: [] } },
    { phase: 'base-budget', details: ids.map(id => `${typeMap[id].name}: ${cardBudget.base[id]}`), snapshot: { nodes: [], edges: [] } },
    { phase: 'runes', details: ids.map(id => `${typeMap[id].name}: ${cardBudget.deltas[id] >= 0 ? '+' : ''}${cardBudget.deltas[id]} → ${counts[id]}`), snapshot: { nodes: [], edges: [] } },
    snapshot({ ...graph, nodes: graph.nodes.filter(node => ['start', 'end'].includes(node.kind) || node.id === 'boss'), edges: [] }, 'grid', [`${p.routes} Korridore · ${p.depth} Begegnungstiefen`, `${slots.length} Kartenplätze`]),
    snapshot(graph, 'paths', [`${graph.edges.length} kreuzungsfreie Kanten`, `${graph.plan.junctionDepths.length} Merge-/Split-Punkte`]),
  ] : [];
  const reserve = (id, type, special, content = {}) => {
    const node = byId(id);
    if (!node || node.type) return false;
    if (!ids.includes(type) || left[type] < 1) throw Error(`Pflichtkarte ${content.name || special} benötigt einen freien ${type}-Platz.`);
    const { id: cardId, ...details } = content;
    Object.assign(node, details, { type, special, behavior: content.behavior || typeMap[type].behavior, typeIcon: typeMap[type].icon, typeColor: typeMap[type].color, decisionWeight: content.decisionWeight || typeMap[type].decisionWeight }); if (cardId) node.cardId = cardId; left[type]--; return true;
  };
  const quests = [], bossName = deck.bosses[p.finalBoss ? 'boss' : 'miniboss'];
  reserve('boss', 'M', p.finalBoss ? 'boss' : 'miniboss', { name: bossName, description: `${bossName} guards the end of this floor.`, rarity: p.finalBoss ? 'U' : 'R', behavior: 'standard', decisionWeight: p.finalBoss ? 6 : 5 });
  const huntId = `r0-${p.depth - 1}-0`, huntCard = profile.cards.find(card => card.deck === config.deck && card.typeId === 'W' && cardEligible(card, config.level, p.depth - 1));
  reserve(huntId, 'W', 'hunt', huntCard || { name: 'Hunting Ground', description: 'Tracks converge here.', rarity: 'C', behavior: 'hunt' });
  quests.push({ id: 'hunt', title: `Explore: ${byId(huntId).name}`, target: huntId, compatible: true, description: 'Enter the hunting ground. Bait and regional lore improve the rare-monster roll.' });
  const tradeoffIds = new Set(graph.plan.resources.flatMap(item => [item.id, ...item.choiceIds]));
  const forageId = graph.nodes.find(node => node.kind === 'encounter' && node.depth >= 3 && !node.secret && !tradeoffIds.has(node.id) && node.routeId === (p.routes === 3 ? 'r2' : 'r0') && !node.type)?.id;
  const forageCard = profile.cards.find(card => card.deck === config.deck && card.typeId === 'F' && cardEligible(card, config.level, byId(forageId)?.depth || 3));
  reserve(forageId, 'F', 'forage', forageCard || { name: 'Foraging Site', description: 'Useful materials grow here.', rarity: 'C' });
  quests.push({ id: 'forage', title: byId(forageId)?.name || 'Explore the Area', target: forageId, compatible: Boolean(forageId), description: 'Complete a guaranteed foraging encounter.' });
  if (feature.enabled) {
    reserve(graph.plan.gateId, feature.gate.typeId, 'gate', { ...feature.gate, name: feature.gate.name, lockCost: feature.lockCost, requires: feature.gate.requires, secretKind: deck.style === 'dungeon' ? 'gate' : 'trail', cardType: 'event' });
    graph.plan.resources.forEach((item, index) => {
      const producer = feature.producers[index]; reserve(item.id, producer.typeId, 'fragment', { ...producer, name: producer.name, produces: producer.produces, rarity: producer.rarity, decisionWeight: 3 });
      for (const choiceId of item.choiceIds) byId(choiceId).plannedChoice = item.id;
    });
    reserve('secret-cache', 'E', 'treasure', { name: deck.secret.vaultName, description: deck.secret.vaultDescription, rarity: 'U', unique: true, decisionWeight: 4 });
    Object.assign(byId(graph.plan.discoveryId), { discovers: 'entrance', storyBeat: deck.secret.discoveryName }); byId(graph.plan.gateId).discovers = 'passage';
  }
  quests.push({ id: 'gate', title: deck.secret.questTitle, target: graph.plan.gateId, prerequisites: graph.plan.resources.map(item => item.id), compatible: feature.enabled, reason: feature.enabled ? '' : 'Die Level-/Tiefenregel schließt diese Tür auf der aktuellen Karte aus.', description: feature.enabled ? `Collect the required resources and open ${feature.gate.name}.` : 'This feature becomes available at a later configured level or depth.' });
  if (traceEnabled) trace.push(snapshot(graph, 'required', feature.enabled ? [`${feature.producers.length} Ressourcen vor ${feature.gate.name}`, 'Freier Bypass und geheimer Seitenarm reserviert'] : ['Keine zulässige Tür auf diesem Level', 'Jagd- und Sammelort reserviert']));

  const empty = slots.filter(node => !node.type), multiset = ids.flatMap(id => Array.from({ length: left[id] }, () => id));
  multiset.sort((a, b) => { const pa = typeMap[a].placement, pb = typeMap[b].placement; return (pa.maxDepth - pa.minDepth) - (pb.maxDepth - pb.minDepth) || typeMap[b].decisionWeight - typeMap[a].decisionWeight || a.localeCompare(b); });
  const routeCounts = {}, routeWeight = Object.fromEntries(graph.routes.map(route => [route.id, 0]));
  for (const type of multiset) {
    const rule = typeMap[type], candidates = empty.filter(node => !node.type && positionAllows(rule.placement, config.level, node.depth));
    if (!candidates.length) throw Error(`${rule.name} kann mit den eingestellten Level-/Tiefenregeln nicht vollständig platziert werden.`);
    const selected = candidates.map(node => {
      const weight = node.plannedChoice ? 3 : rule.decisionWeight;
      const siblings = empty.filter(other => other.type && other.routeId === node.routeId && other.depth === node.depth);
      const siblingPenalty = siblings.length ? Math.min(...siblings.map(other => Math.abs(other.decisionWeight - weight))) * 100 : 0;
      return { node, score: siblingPenalty + (routeWeight[node.routeId] || 0) + (routeCounts[`${node.routeId}/${type}`] || 0) * 3 + random() };
    }).sort((a, b) => a.score - b.score)[0].node;
    Object.assign(selected, { type, behavior: rule.behavior, typeIcon: rule.icon, typeColor: rule.color, decisionWeight: selected.plannedChoice ? 3 : rule.decisionWeight }); if (selected.plannedChoice) { selected.special = 'choice'; selected.tradeoffFor = selected.plannedChoice; }
    routeCounts[`${selected.routeId}/${type}`] = (routeCounts[`${selected.routeId}/${type}`] || 0) + 1; left[type]--;
    if (selected.routeId) routeWeight[selected.routeId] += selected.decisionWeight;
  }
  if (traceEnabled) trace.push(snapshot(graph, 'types', ids.map(id => `${typeMap[id].name}: ${counts[id]}`)));
  const uniqueIds = new Set(options.usedUniqueCardIds || []);
  const maxUnique = Math.max(uniqueIds.size, profile.huntingRules.uniquePerAdventure);
  for (const node of slots) {
    if (!node.name) { const { id: cardId, ...content } = chooseCatalogCard(profile, config, node.type, node, random, uniqueIds, maxUnique); Object.assign(node, content, { cardId }); }
    node.typeIcon ||= typeMap[node.type].icon; node.typeColor ||= typeMap[node.type].color; node.behavior ||= typeMap[node.type].behavior; node.decisionWeight ??= typeMap[node.type].decisionWeight;
    const encounter = rng(`${config.seed}|${config.deck}|floor:${config.floor}|encounter|${config.runes.join(',')}|${node.id}|${hash}|${GENERATOR_VERSION}`);
    node.outcome = { roll: encounter(), loot: 3 + Math.floor(encounter() * 6), herbs: 1 + Math.floor(encounter() * 3) };
  }
  byId('start').name = 'Der Wegstein'; byId('start').description = `${deck.name} begins here. ${deck.description}`;
  byId('end').name = config.floor < p.floors ? 'Das Tor in die Tiefe' : 'Der Weg nach Hause'; byId('end').special = config.floor < p.floors ? 'descent' : 'exit';
  if (traceEnabled) trace.push(snapshot(graph, 'content', [`${slots.length} Karten aus gewichteten Raritätspools gewählt`, `${uniqueIds.size - (options.usedUniqueCardIds || []).length} neue Unique-Karten reserviert`]));
  const rumorRandom = rng(`${config.seed}|${config.deck}|floor:${config.floor}|rumors|${hash}|${GENERATOR_VERSION}`);
  const rumors = quests.filter(quest => quest.compatible && byId(quest.target) && !byId(quest.target).secret).map(quest => ({ id: quest.target, rank: rumorRandom() })).sort((a, b) => a.rank - b.rank).map(item => item.id);
  const regular = graph.nodes.filter(node => node.kind === 'encounter' && !node.secret), pathRange = regularPathWeightRange(graph), totalWeight = regular.reduce((sum, node) => sum + node.decisionWeight, 0);
  const result = { generatorVersion: GENERATOR_VERSION, profileHash: hash, huntingRules: structuredClone(profile.huntingRules), huntRarityWeights: structuredClone(typeMap.M.rarityWeights), config, deck: structuredClone(deck), ...graph, counts, weights: counts, cardBudget, effects: effects(config.runes, profile), quests, rumors, generatedUniqueCardIds: [...uniqueIds], weightProfile: { total: totalWeight, average: totalWeight / regular.length, ...pathRange, scale: { basic: 1, uncommon: 2, rare: 3, unique: 4, miniboss: 5, boss: 6 } } };
  validateGraph(result, profile);
  if (traceEnabled) trace.push({ phase: 'validate-final', details: [`Pfadwerte ${pathRange.pathMin}–${pathRange.pathMax}`, 'Erreichbarkeit, Abhängigkeiten, Budgets und Kanten geprüft'], snapshot: { nodes: structuredClone(result.nodes), edges: structuredClone(result.edges) } });
  result.generationTrace = trace; return result;
}

export function reachable(graph, from) {
  const found = new Set([from]), queue = [from], adjacency = new Map();
  for (const edge of graph.edges) { if (!adjacency.has(edge.from)) adjacency.set(edge.from, []); adjacency.get(edge.from).push(edge.to); }
  for (let index = 0; index < queue.length; index++) for (const id of adjacency.get(queue[index]) || []) if (!found.has(id)) { found.add(id); queue.push(id); }
  return found;
}
export function regularPathWeightRange(graph) {
  const byId = new Map(graph.nodes.map(node => [node.id, node])), ranges = new Map([['start', { min: 0, max: 0 }]]);
  for (const current of [...graph.nodes].sort((a, b) => a.depth - b.depth)) { const range = ranges.get(current.id); if (!range) continue; for (const edge of graph.edges.filter(item => item.from === current.id)) { const next = byId.get(edge.to); if (next.secret) continue; const weight = next.decisionWeight || 0, prior = ranges.get(next.id), candidate = { min: range.min + weight, max: range.max + weight }; ranges.set(next.id, prior ? { min: Math.min(prior.min, candidate.min), max: Math.max(prior.max, candidate.max) } : candidate); } }
  const boss = ranges.get('boss'); return { pathMin: boss.min, pathMax: boss.max, pathSpread: boss.max - boss.min };
}
export function segmentsCross(a, b, c, d) { const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); return cross(a, b, c) * cross(a, b, d) < -1e-7 && cross(c, d, a) * cross(c, d, b) < -1e-7; }
export function questSolvable(graph, quest) {
  if (!quest.compatible) return true;
  const byId = new Map(graph.nodes.map(node => [node.id, node])), queue = [{ id: 'start', resources: {} }], seen = new Set();
  for (let index = 0; index < queue.length; index++) { const state = queue[index]; if (state.id === quest.target) return true; for (const edge of graph.edges.filter(item => item.from === state.id)) { const node = byId.get(edge.to), resources = { ...state.resources }, requirement = node.requires; if (requirement && (resources[requirement.resourceId] || 0) < requirement.amount) continue; if (requirement?.consume) resources[requirement.resourceId] -= requirement.amount; if (node.produces) resources[node.produces.resourceId] = (resources[node.produces.resourceId] || 0) + node.produces.amount; const key = `${node.id}/${JSON.stringify(resources)}`; if (!seen.has(key)) { seen.add(key); queue.push({ id: node.id, resources }); } } }
  return false;
}
export function validateGraph(graph, profile = DEFAULT_PROFILE) {
  const fail = message => { throw Error(`Generator: ${message} [${graph.config.seed}, L${graph.config.level}]`); }, byId = new Map(graph.nodes.map(node => [node.id, node])), p = floorProfile(graph.config), ids = profileTypes(profile);
  if (byId.size !== graph.nodes.length || graph.nodes.length > p.depth * p.routes * Number(profile.placementRules.maxBranchesPerLane) + 8) fail('Knotengrenze/IDs');
  if (reachable(graph, 'start').size !== graph.nodes.length) fail('unerreichbare Knoten');
  const actual = Object.fromEntries(ids.map(id => [id, 0]));
  for (const node of graph.nodes) { const out = graph.edges.filter(edge => edge.from === node.id); if (node.kind === 'end' ? out.length : out.length < 1 || out.length > 6) fail('Nachfolger'); if (node.kind === 'encounter') { if (!ids.includes(node.type)) fail('Typ'); actual[node.type]++; if (!positionAllows(profile.cardTypes.find(type => type.id === node.type).placement, graph.config.level, node.depth) && !node.special) fail(`Platzierungsregel ${node.type}`); } if (out.length && out.every(edge => byId.get(edge.to).special === 'gate')) fail('Tor ist einziger Ausweg'); }
  for (const id of ids) if (actual[id] !== graph.counts[id]) fail(`Budget ${id}`);
  for (const edge of graph.edges) { const a = byId.get(edge.from), b = byId.get(edge.to); if (!a || !b || b.depth !== a.depth + 1) fail('Rückwärtskante/Tiefe'); if (a.routeId && b.routeId && a.routeId !== b.routeId) fail('Querverbindung'); }
  for (let i = 0; i < graph.edges.length; i++) for (let j = i + 1; j < graph.edges.length; j++) { const a = graph.edges[i], b = graph.edges[j]; if ([a.from, a.to].some(id => id === b.from || id === b.to)) continue; if (segmentsCross(byId.get(a.from), byId.get(a.to), byId.get(b.from), byId.get(b.to))) fail('Kantenkreuzung'); }
  for (const quest of graph.quests) if (!questSolvable(graph, quest)) fail(`Quest ${quest.id} nicht lösbar`);
  for (const item of graph.plan.resources) { const choices = [byId.get(item.id), ...item.choiceIds.map(id => byId.get(id))]; if (new Set(choices.map(node => node.routeId)).size !== choices.length || new Set(choices.map(node => node.decisionWeight)).size !== 1) fail('unausgewogener Ressourcentausch'); }
  if (graph.weightProfile.pathSpread > Number(profile.placementRules.maxPathSpread)) fail(`Pfadwerte unterscheiden sich um ${graph.weightProfile.pathSpread} statt maximal ${profile.placementRules.maxPathSpread}`);
  if (graph.nodes.filter(node => node.kind === 'end').length !== 1 || graph.edges.some(edge => edge.to === 'end' && edge.from !== 'boss')) fail('Abschluss ohne Boss');
  for (const node of graph.nodes.filter(node => node.id !== 'end')) if (!reachable(graph, node.id).has('boss')) fail('Pfad führt nicht zum Boss');
  return true;
}
