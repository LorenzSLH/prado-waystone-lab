import { DECK_IDS } from './decks.js';

export const GENERATOR_VERSION = '3.0.0';
export const SCHEMA_VERSION = 3;
export const BOSS_FROM_LEVEL = 3;
export const TYPES = ['E', 'F', 'H', 'M'];
export const TYPE_NAMES = { M: 'Monster', F: 'Sammeln', H: 'Hunt', E: 'Ereignis' };
export const LEVELS = [null, { depth: 8, preview: 1, routes: 2 }, { depth: 12, preview: 2, routes: 2 }, { depth: 16, preview: 3, routes: 3 }, { depth: 20, preview: 4, routes: 3 }, { depth: 24, preview: 5, routes: 3 }];
export const RUNES = [
  { id: 'hunt', name: 'Jagd', icon: 'hunt', flavor: 'Folge dem Ruf der Wildnis.', encounterUnits: { M: 4, F: 0, H: 3, E: 1 }, difficultyMods: { hp: 15 }, rewardMods: { loot: 10 }, typeBias: 'H' },
  { id: 'wild', name: 'Wildnis', icon: 'forage', flavor: 'Was wächst, weist dir den Weg.', encounterUnits: { M: 1, F: 5, H: 1, E: 1 }, difficultyMods: { attack: 10 }, rewardMods: { forage: 20 }, typeBias: 'F' },
  { id: 'ruin', name: 'Ruine', icon: 'gate', flavor: 'Alte Steine erinnern sich.', encounterUnits: { M: 3, F: 1, H: 1, E: 3 }, difficultyMods: { heal: -15 }, rewardMods: { fragment: 15 }, typeBias: 'E' },
  { id: 'blood', name: 'Blutmond', icon: 'monster', flavor: 'Ein roter Mond. Reiche Beute.', encounterUnits: { M: 5, F: 0, H: 2, E: 1 }, difficultyMods: { attack: 20 }, rewardMods: { rare: 15 }, typeBias: 'M' },
  { id: 'haven', name: 'Zuflucht', icon: 'camp', flavor: 'Ein Feuer gegen die Dunkelheit.', encounterUnits: { M: 2, F: 3, H: 0, E: 3 }, difficultyMods: { hp: 10 }, rewardMods: { heal: 20 }, typeBias: 'E' },
  { id: 'trail', name: 'Fährte', icon: 'trail', flavor: 'Jede Spur erzählt eine Geschichte.', encounterUnits: { M: 2, F: 2, H: 3, E: 1 }, difficultyMods: { hp: 10 }, rewardMods: { bait: 20 }, typeBias: 'H' },
];
export const MOD_NAMES = { hp: 'Monster-HP', attack: 'Monsterangriff', heal: 'Heilwirkung', loot: 'Monsterloot', forage: 'Sammelertrag', fragment: 'Fragment-Bonusloot', rare: 'Seltene Lootgewichte', bait: 'Ködergewicht' };
export const DEFAULT_CONFIG = { seed: 'MOOSPFAD-42', level: 1, deck: 'filthworks', runes: ['hunt', 'wild', 'ruin'], descent: true, floor: 1 };
export const DEFAULT_VIEW = { fog: 'rumors', paths: true, preview: 0, rumorCount: 3, debug: false, infinite: false };
export function floorProfile(config) {
  const base = LEVELS[config.level];
  const floors = config.descent === false ? 1 : [0, 1, 1, 2, 2, 3][config.level];
  return { ...base, depth: base.depth / floors, floors, finalBoss: config.level >= BOSS_FROM_LEVEL && (config.floor || 1) === floors };
}
export function normalizeConfig(input) {
  if (!input || typeof input.seed !== 'string' || !input.seed.trim() || input.seed.trim().length > 80) throw Error('Seed: bitte 1–80 Zeichen eingeben.');
  if (!Number.isInteger(input.level) || !LEVELS[input.level]) throw Error('Level muss zwischen 1 und 5 liegen.');
  if (!DECK_IDS.includes(input.deck)) throw Error('Wähle ein verfügbares Waystone-Deck.');
  if (!Array.isArray(input.runes) || input.runes.length !== 3 || new Set(input.runes).size !== 3 || input.runes.some(id => !RUNES.some(r => r.id === id))) throw Error('Wähle genau drei unterschiedliche Runen.');
  if (typeof input.descent !== 'boolean') throw Error('Ebenenabstieg muss ein- oder ausgeschaltet sein.');
  const floor = input.floor ?? 1;
  if (!Number.isInteger(floor) || floor < 1 || floor > floorProfile(input).floors) throw Error('Ungültige Ebene.');
  return { seed: input.seed.trim().normalize('NFC'), level: input.level, deck: input.deck, runes: [...input.runes].sort(), descent: input.descent, floor };
}
export function effects(ids) {
  const mods = Object.fromEntries(Object.keys(MOD_NAMES).map(k => [k, 0]));
  for (const id of ids) for (const group of ['difficultyMods', 'rewardMods']) for (const [k, v] of Object.entries(RUNES.find(r => r.id === id)[group])) mods[k] += v;
  return Object.fromEntries(Object.entries(mods).map(([k, v]) => [k, { percent: Math.max(-75, Math.min(200, v)), multiplier: 1 + Math.max(-75, Math.min(200, v)) / 100 }]));
}
