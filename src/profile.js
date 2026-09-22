import { DECKS } from './decks.js';

export const PROFILE_SCHEMA_VERSION = 1;
export const EFFECT_KEYS = ['hp', 'attack', 'leech', 'heal', 'loot', 'itemRarity', 'forage', 'fragment', 'rare', 'bait'];
export const BEHAVIORS = ['standard', 'hunt', 'trap', 'resource', 'gate'];
export const RARITIES = ['C', 'R', 'U'];

const rarity = value => value === 'N' ? 'U' : value === 'C' ? 'C' : 'R';
const slug = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const placement = { minLevel: 1, maxLevel: 5, minDepth: 1, maxDepth: 24 };
const card = (deck, typeId, source, extra = {}) => ({
  id: `${deck}-${slug(source.name)}`, deck, name: source.name, typeId, rarity: rarity(source.rarity), selectionWeight: 1,
  description: source.description || '', placement: { ...placement }, ...extra,
});

const catalog = [];
for (const [deckId, deck] of Object.entries(DECKS)) {
  for (const item of deck.monsters.filter(item => !Object.values(deck.bosses).includes(item.name))) catalog.push(card(deckId, 'M', item));
  for (const item of deck.cards) {
    const typeId = item.cardType === 'skill_check' ? 'F' : item.cardType === 'shrine' ? 'S' : 'E';
    catalog.push(card(deckId, typeId, item));
  }
  for (const item of deck.rareEncounters.filter(item => item.cardType !== 'monster')) catalog.push(card(deckId, 'E', item));
  catalog.push({ id: `${deckId}-hunting-ground`, deck: deckId, name: deck.style === 'dungeon' ? 'Sewer Hunting Ground' : 'Open Hunting Ground', typeId: 'W', rarity: 'C', selectionWeight: 1, description: 'Tracks converge here. The creature is determined when the hunter enters.', placement: { ...placement } });
  catalog.push({ id: `${deckId}-trap`, deck: deckId, name: deck.style === 'dungeon' ? 'Floodgate Trap' : 'Briar Snare', typeId: 'T', rarity: 'C', selectionWeight: 1, description: 'A visible test card for a configurable trap category.', placement: { ...placement } });
}
catalog.push({ id: 'filthworks-pale-maw', deck: 'filthworks', name: 'The Pale Maw', typeId: 'M', rarity: 'U', selectionWeight: 1, description: 'A unique sewer predator known only from scratched warnings.', placement: { ...placement, minLevel: 3, minDepth: 4 } });
catalog.push({ id: 'meadowland-crown-antler', deck: 'meadowland', name: 'Crown-Antler Silverhorn', typeId: 'M', rarity: 'U', selectionWeight: 1, description: 'A singular silverhorn glimpsed only by experienced travelers.', placement: { ...placement, minLevel: 3, minDepth: 4 } });
catalog.push({ id: 'filthworks-upper-seal', deck: 'filthworks', name: 'Upper Valve Seal', typeId: 'E', rarity: 'R', selectionWeight: 1, description: 'One of two mechanisms needed to open the sealed sluice.', behavior: 'resource', produces: { resourceId: 'valve-seal', amount: 1 }, placement: { ...placement, minDepth: 2, maxDepth: 9 } });
catalog.push({ id: 'filthworks-lower-seal', deck: 'filthworks', name: 'Lower Valve Seal', typeId: 'E', rarity: 'R', selectionWeight: 1, description: 'The second mechanism needed to open the sealed sluice.', behavior: 'resource', produces: { resourceId: 'valve-seal', amount: 1 }, placement: { ...placement, minDepth: 4, maxDepth: 18 } });
catalog.push({ id: 'filthworks-sluice-gate', deck: 'filthworks', name: 'Sealed Sluice Gate', typeId: 'E', rarity: 'R', selectionWeight: 1, description: DECKS.filthworks.secret.entranceDescription, behavior: 'gate', requires: { resourceId: 'valve-seal', amount: 2, consume: true }, placement: { ...placement, minDepth: 5 } });
catalog.push({ id: 'meadowland-game-trail', deck: 'meadowland', name: 'Hidden Game Trail', typeId: 'E', rarity: 'R', selectionWeight: 1, description: DECKS.meadowland.secret.entranceDescription, behavior: 'gate', placement: { ...placement, minDepth: 4 } });

const type = (id, name, color, icon, probability, decisionWeight, behavior, rarities = { C: 70, R: 25, U: 5 }) => ({ id, name, color, icon, baseProbability: probability, decisionWeight, rarityWeights: rarities, behavior, placement: { ...placement } });
const rune = (id, name, icon, cardDeltas, modifiers) => ({ id, name, icon, cardDeltas, modifiers });

export const DEFAULT_PROFILE = {
  schemaVersion: PROFILE_SCHEMA_VERSION,
  id: 'prado-waystone-standard',
  name: 'Prado Waystone Standard',
  cardTypes: [
    type('M', 'Monster', '#b98676', 'monster', 50, 1, 'standard', { C: 70, R: 25, U: 5 }),
    type('S', 'Schrein', '#8d78a0', 'waystone', 12.5, 1, 'standard', { C: 70, R: 30, U: 0 }),
    type('F', 'Sammelkarte', '#869975', 'forage', 12.5, 1, 'standard', { C: 80, R: 20, U: 0 }),
    type('E', 'Eventkarte', '#8f94a0', 'event', 12.5, 1, 'standard', { C: 70, R: 25, U: 5 }),
    type('W', 'Jagdgebiet', '#b49a5e', 'hunt', 12.5, 1, 'hunt', { C: 100, R: 0, U: 0 }),
    type('T', 'Falle', '#9b6d54', 'trap', 0, 2, 'trap', { C: 100, R: 0, U: 0 }),
  ],
  cards: catalog,
  runes: [
    rune('hunt', 'Jagd', 'hunt', { M: 1, S: -1, F: -1, E: -1, W: 2, T: 0 }, { hp: 15, loot: 10 }),
    rune('wild', 'Wildnis', 'forage', { M: -1, S: -1, F: 2, E: -1, W: 1, T: 0 }, { attack: 10, forage: 20 }),
    rune('ruin', 'Ruine', 'gate', { M: -1, S: 2, F: -1, E: 1, W: -1, T: 0 }, { heal: -15, fragment: 15, itemRarity: 10 }),
    rune('blood', 'Blutmond', 'monster', { M: 2, S: -1, F: -1, E: -1, W: 1, T: 0 }, { attack: 20, leech: 15, rare: 15 }),
    rune('haven', 'Zuflucht', 'camp', { M: -1, S: 1, F: -1, E: 2, W: -1, T: 0 }, { hp: 10, heal: 20 }),
    rune('trail', 'Fährte', 'trail', { M: -1, S: -1, F: 1, E: -1, W: 2, T: 0 }, { hp: 10, bait: 20 }),
  ],
  placementRules: { maxPathSpread: 3, maxBranchesPerLane: 3 },
  huntingRules: { baitRareMultiplier: 3, loreStep: 0.1, loreMultiplierCap: 2, uniquePerAdventure: 1 },
  startInventory: { bait: 2 },
};

export function cloneProfile(profile = DEFAULT_PROFILE) { return structuredClone(profile); }
export function profileTypes(profile) { return profile.cardTypes.map(item => item.id); }
export function profileTypeMap(profile) { return Object.fromEntries(profile.cardTypes.map(item => [item.id, item])); }
export function profileRune(profile, id) { return profile.runes.find(item => item.id === id); }
export function cardEligible(card, level, depth) {
  const p = card.placement || placement;
  return level >= p.minLevel && level <= p.maxLevel && depth >= p.minDepth && depth <= p.maxDepth;
}
export function validateProfile(input) {
  const fail = message => { throw Error(`Profil: ${message}`); };
  if (!input || input.schemaVersion !== PROFILE_SCHEMA_VERSION || typeof input.id !== 'string' || !input.id) fail('unbekannte oder fehlende Version.');
  if (!Array.isArray(input.cardTypes) || input.cardTypes.length < 2 || input.cardTypes.length > 16) fail('2–16 Kartenarten erforderlich.');
  const ids = input.cardTypes.map(item => item.id);
  if (new Set(ids).size !== ids.length || ids.some(id => !/^[A-Z][A-Z0-9_]{0,7}$/.test(id))) fail('Kartenart-IDs müssen eindeutig und kurz sein.');
  const probability = input.cardTypes.reduce((sum, item) => sum + Number(item.baseProbability), 0);
  if (Math.abs(probability - 100) > .01) fail(`Basiswahrscheinlichkeiten ergeben ${probability.toFixed(2)} statt 100 %.`);
  for (const item of input.cardTypes) {
    if (!BEHAVIORS.includes(item.behavior) || !Number.isFinite(item.baseProbability) || item.baseProbability < 0 || !Number.isInteger(item.decisionWeight) || item.decisionWeight < 1 || item.decisionWeight > 6) fail(`ungültige Werte bei ${item.name || item.id}.`);
    if (!item.rarityWeights || Math.abs(RARITIES.reduce((sum, key) => sum + Number(item.rarityWeights[key] || 0), 0) - 100) > .01) fail(`Raritäten von ${item.name || item.id} ergeben nicht 100 %.`);
    const p = item.placement;
    if (!p || !Number.isInteger(p.minLevel) || !Number.isInteger(p.maxLevel) || p.minLevel < 1 || p.maxLevel > 5 || p.minLevel > p.maxLevel || !Number.isInteger(p.minDepth) || !Number.isInteger(p.maxDepth) || p.minDepth < 1 || p.minDepth > p.maxDepth) fail(`ungültiger Level-/Tiefenbereich bei ${item.name || item.id}.`);
  }
  if (!Array.isArray(input.cards) || input.cards.some(item => !ids.includes(item.typeId) || !RARITIES.includes(item.rarity) || !Number.isFinite(item.selectionWeight) || item.selectionWeight <= 0 || !DECKS[item.deck])) fail('Kartenkatalog enthält ungültige Einträge.');
  for (const item of input.cards) {
    const p = item.placement;
    if (!p || !Number.isInteger(p.minLevel) || !Number.isInteger(p.maxLevel) || p.minLevel < 1 || p.maxLevel > 5 || p.minLevel > p.maxLevel || !Number.isInteger(p.minDepth) || !Number.isInteger(p.maxDepth) || p.minDepth < 1 || p.minDepth > p.maxDepth) fail(`ungültiger Level-/Tiefenbereich bei Karte ${item.name}.`);
    if (item.behavior && !BEHAVIORS.includes(item.behavior)) fail(`unbekannte Verhaltensvorlage bei Karte ${item.name}.`);
    if (item.behavior === 'resource' && (!item.produces?.resourceId || !Number.isInteger(item.produces.amount) || item.produces.amount < 1)) fail(`Ressourcenkarte ${item.name} benötigt Ressource und positive Menge.`);
    if (item.behavior === 'gate' && item.requires && (!item.requires.resourceId || !Number.isInteger(item.requires.amount) || item.requires.amount < 1)) fail(`Tür ${item.name} enthält eine ungültige Voraussetzung.`);
  }
  for (const deck of Object.keys(DECKS)) for (const item of input.cardTypes.filter(type => type.baseProbability > 0)) if (!input.cards.some(card => card.deck === deck && card.typeId === item.id)) fail(`${DECKS[deck].name} besitzt keine Karte für ${item.name}.`);
  if (!Array.isArray(input.runes) || input.runes.length < 3 || new Set(input.runes.map(item => item.id)).size !== input.runes.length) fail('mindestens drei eindeutige Runen erforderlich.');
  for (const item of input.runes) {
    if (ids.some(id => !Number.isInteger(Number(item.cardDeltas?.[id] || 0)))) fail(`Rune ${item.name} enthält keine ganzen Kartenwerte.`);
    if (Object.keys(item.modifiers || {}).some(key => !EFFECT_KEYS.includes(key) || !Number.isFinite(Number(item.modifiers[key])))) fail(`Rune ${item.name} enthält einen unbekannten Modifikator.`);
  }
  if (!Number.isInteger(input.startInventory?.bait) || input.startInventory.bait < 0 || input.startInventory.bait > 99) fail('Startköder muss zwischen 0 und 99 liegen.');
  const h = input.huntingRules;
  if (!h || h.baitRareMultiplier <= 0 || h.loreStep < 0 || h.loreMultiplierCap < 1 || !Number.isInteger(h.uniquePerAdventure) || h.uniquePerAdventure < 0) fail('ungültige Jagdregeln.');
  return structuredClone(input);
}

const canonical = value => JSON.stringify(value && typeof value === 'object' ? Array.isArray(value) ? value.map(item => JSON.parse(canonical(item))) : Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(canonical(value[key]))])) : value);
let defaultHash;
export function profileHash(profile) {
  if (profile === DEFAULT_PROFILE && defaultHash) return defaultHash;
  let hash = 2166136261;
  for (const char of canonical(profile)) { hash ^= char.codePointAt(0); hash = Math.imul(hash, 16777619); }
  const value = (hash >>> 0).toString(16).padStart(8, '0'); if (profile === DEFAULT_PROFILE) defaultHash = value; return value;
}
export function exportProfile(profile) { return JSON.stringify(validateProfile(profile), null, 2); }
export function importProfile(text) {
  if (typeof text !== 'string' || text.length > 2_000_000) throw Error('Profildatei ist zu groß (maximal 2 MB).');
  let value;
  try { value = JSON.parse(text); } catch { throw Error('Die Profildatei enthält kein gültiges JSON.'); }
  return validateProfile(value);
}
