import { DECK_IDS } from './decks.js';
import { DEFAULT_PROFILE, EFFECT_KEYS, profileRune, profileTypes } from './profile.js';

export const GENERATOR_VERSION = '5.0.0';
export const SCHEMA_VERSION = 5;
export const BOSS_FROM_LEVEL = 3;
export const TYPES = profileTypes(DEFAULT_PROFILE);
export const TYPE_NAMES = Object.fromEntries(DEFAULT_PROFILE.cardTypes.map(item => [item.id, item.name]));
export const LEVELS = [null, { depth: 8, preview: 1, routes: 2 }, { depth: 12, preview: 2, routes: 2 }, { depth: 16, preview: 3, routes: 3 }, { depth: 20, preview: 4, routes: 3 }, { depth: 24, preview: 5, routes: 3 }];
export const RUNES = DEFAULT_PROFILE.runes.map(item => ({ ...item, difficultyMods: Object.fromEntries(Object.entries(item.modifiers).filter(([key]) => ['hp', 'attack', 'leech', 'heal'].includes(key))), rewardMods: Object.fromEntries(Object.entries(item.modifiers).filter(([key]) => !['hp', 'attack', 'leech', 'heal'].includes(key))) }));
export const MOD_NAMES = { hp: 'Monster-HP', attack: 'Monsterangriff', leech: 'Monster-Leech', heal: 'Heilwirkung', loot: 'Monsterloot', itemRarity: 'Item-Rarity', forage: 'Sammelertrag', fragment: 'Fragment-Bonusloot', rare: 'Seltene Begegnungen', bait: 'Ködergewicht' };
export const DEFAULT_CONFIG = { seed: 'MOOSPFAD-42', level: 1, deck: 'filthworks', runes: ['hunt', 'wild', 'ruin'], descent: true, floor: 1 };
export const DEFAULT_VIEW = { fog: 'rumors', paths: true, preview: 0, rumorCount: 3, debug: false, infinite: false };
export function floorProfile(config) {
  const base = LEVELS[config.level];
  const floors = config.descent === false ? 1 : [0, 1, 1, 2, 2, 3][config.level];
  return { ...base, depth: base.depth / floors, floors, finalBoss: config.level >= BOSS_FROM_LEVEL && (config.floor || 1) === floors };
}
export function normalizeConfig(input, profile = DEFAULT_PROFILE) {
  if (!input || typeof input.seed !== 'string' || !input.seed.trim() || input.seed.trim().length > 80) throw Error('Seed: bitte 1–80 Zeichen eingeben.');
  if (!Number.isInteger(input.level) || !LEVELS[input.level]) throw Error('Level muss zwischen 1 und 5 liegen.');
  if (!DECK_IDS.includes(input.deck)) throw Error('Wähle ein verfügbares Waystone-Deck.');
  if (!Array.isArray(input.runes) || input.runes.length !== 3 || new Set(input.runes).size !== 3 || input.runes.some(id => !profile.runes.some(r => r.id === id))) throw Error('Wähle genau drei unterschiedliche Runen.');
  if (typeof input.descent !== 'boolean') throw Error('Ebenenabstieg muss ein- oder ausgeschaltet sein.');
  const floor = input.floor ?? 1;
  if (!Number.isInteger(floor) || floor < 1 || floor > floorProfile(input).floors) throw Error('Ungültige Ebene.');
  return { seed: input.seed.trim().normalize('NFC'), level: input.level, deck: input.deck, runes: [...input.runes].sort(), descent: input.descent, floor };
}
export function effects(ids, profile = DEFAULT_PROFILE) {
  const mods = Object.fromEntries(EFFECT_KEYS.map(k => [k, 0]));
  for (const id of ids) for (const [key, value] of Object.entries(profileRune(profile, id).modifiers || {})) mods[key] += Number(value);
  return Object.fromEntries(Object.entries(mods).map(([k, v]) => [k, { percent: Math.max(-75, Math.min(200, v)), multiplier: 1 + Math.max(-75, Math.min(200, v)) / 100 }]));
}
