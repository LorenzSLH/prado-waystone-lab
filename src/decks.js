const card = (name, cardType, rarity, description) => ({ name, cardType, rarity, description });
const monster = (name, rarity, level, description) => ({ name, cardType: 'monster', rarity, level, description });

export const DECKS = {
  filthworks: {
    id: 131,
    slug: 'filthworks',
    name: 'The Filthworks',
    location: 'The Burrows',
    zone: 'Old City Quarters',
    suggestedLevel: 25,
    style: 'dungeon',
    description: 'The Old City’s waste runs through a confined maze of drains, maintenance rooms and forgotten chambers.',
    sourceUrl: 'https://www.pradotraveler.com/decks/131',
    recipe: ['City Rune · Tier 1', 'Mud Rune · Tier 2', 'Wildcard'],
    composition: { monster: 4, event: 1, rest: 1, wild: 1 },
    defaultUnits: { M: 4, S: 1, F: 1, E: 1, W: 1 },
    routes: [
      { id: 'r0', name: 'The Flood Channel', subtitle: 'Black water and low arches', bias: 'M' },
      { id: 'r1', name: 'The Service Tunnels', subtitle: 'Valves, grates and sealed rooms', bias: 'E' },
      { id: 'r2', name: 'The Ossuary Run', subtitle: 'Bones behind rusted iron', bias: 'W' },
    ],
    cards: [
      card("Engineer's Office", 'rest', 'C', 'An abandoned maintenance office offers a brief refuge from the tunnels.'),
      card('Maintenance Alcove', 'rest', 'C', 'Old tools and a dry seat mark a former sewer-worker rest point.'),
      card('Candlelit Alcove', 'shrine', 'C', 'Wax and soot cover a small recess used for quiet prayers.'),
      card('Forgotten Ossuary Shrine', 'shrine', 'U', 'Nameless bones are stacked before corroded grates.'),
      card('The Eye Below', 'shrine', 'R', 'A cracked eye mosaic seems to watch every bargain made below.'),
      card('Runoff Garden', 'skill_check', 'C', 'Hardy plants have adapted to soil changed by chemical runoff.'),
      card('Sewer Moss Colony', 'skill_check', 'C', 'Bioluminescent moss marks a route through the darkest channels.'),
      card('Rat Chewed Satchel', 'treasure', 'C', 'A stained, damaged satchel still contains something useful.'),
      card('Wrought Iron Strongbox', 'treasure', 'U', 'A heavy strongbox has been dragged far from its original vault.'),
      card('Cryptic Offering', 'rune', 'C', 'A sealed offering carries a faint runic pulse.'),
    ],
    monsters: [
      monster('Corpse Flyer', 'C', 25, 'An enormous carrion insect circles the refuse pits.'),
      monster('Sewer Gator', 'C', 25, 'A massive reptile has grown strong on the city’s waste.'),
      monster('Tunnel Leech', 'C', 25, 'A giant parasite waits in the nutrient-rich runoff.'),
      monster('Filth Golem', 'U', 25, 'Discarded matter and debris move as one furious construct.'),
      monster('Waste Wraith', 'R', 26, 'A spirit remains bound to the filthy water where it died.'),
    ],
    rareEncounters: [
      card('Cracked Sewer Vault', 'treasure', 'N', 'A sealed Old City vault lies behind a forgotten service passage.'),
    ],
    bosses: { miniboss: 'Filth Golem', boss: 'Waste Wraith' },
    hunt: 'Sewer Gator',
    secret: {
      questTitle: 'The Cracked Vault',
      entranceName: 'Sealed Sluice Gate',
      entranceDescription: 'Two broken valve seals can restore the mechanism and open a forgotten service arm.',
      resourceLabel: 'Valve seals',
      resourceNames: ['Upper Valve Seal', 'Lower Valve Seal'],
      lockCost: 2,
      discoveryName: "Engineer's Markings",
      vaultName: 'Cracked Sewer Vault',
      vaultDescription: 'A unique vault encounter waits beyond the sluice gate.',
      vaultType: 'E',
    },
  },
  meadowland: {
    id: 124,
    slug: 'meadowland',
    name: 'Meadowland Wilds',
    location: 'Sweetwater',
    zone: 'Meadowshire',
    suggestedLevel: 25,
    style: 'wilderness',
    description: 'Rolling hills, open glades and riverbanks reward broad exploration and distant route choices.',
    sourceUrl: 'https://www.pradotraveler.com/decks/124',
    recipe: ['Wildcard', 'Wildcard', 'Wildcard'],
    composition: { monster: 4, event: 1, rest: 1, wild: 1 },
    defaultUnits: { M: 4, S: 1, F: 1, E: 1, W: 1 },
    routes: [
      { id: 'r0', name: 'The Riverbank', subtitle: 'Shrines beside slow water', bias: 'E' },
      { id: 'r1', name: 'The Sunlit Hills', subtitle: 'Long views and exposed trails', bias: 'W' },
      { id: 'r2', name: 'The Overgrown Glades', subtitle: 'Flowers, roots and hidden nests', bias: 'F' },
    ],
    cards: [
      card('Shady Oak Tree', 'rest', 'C', 'A broad solitary oak provides a safe place to recover.'),
      card('Sunlit Hilltop', 'rest', 'C', 'A grassy rise reveals the shape of the surrounding wilds.'),
      card('Mysterious Stone Circle', 'shrine', 'C', 'Moss-covered stones hum with old, unexplained energy.'),
      card('Riverbank Shrine', 'shrine', 'U', 'Flowers decorate a small wooden altar above the water.'),
      card('Shrine of Silver Swan', 'shrine', 'R', 'A silver swan statue watches over a quiet pond.'),
      card("Burrower's Nest", 'skill_check', 'C', 'Fresh soil and tangled roots suggest a nearby burrower.'),
      card('Patch of Blooming Plants', 'skill_check', 'C', 'Bright flowers attract insects and observant foragers.'),
      card('Sunny Clearing', 'skill_check', 'C', 'Sunlight encourages unusually dense growth in this clearing.'),
      card("Fieldworker's Crate", 'treasure', 'U', 'A sealed harvest crate lies half-hidden in tall grass.'),
      card('Sun-warmed Parcel', 'treasure', 'U', 'A linen parcel carries the scent of summer grain.'),
      card("Verdant Traveler's Pack", 'treasure', 'R', 'A moss-green pack is embroidered with protective vines.'),
      card('Wildgrass Satchel', 'treasure', 'C', 'A simple pouch smells of crushed grass and morning dew.'),
      card('Cryptic Offering', 'rune', 'C', 'A sealed offering carries a faint runic pulse.'),
    ],
    monsters: [
      monster('Grovebear', 'C', 25, 'A territorial bear can uproot trees in its rage.'),
      monster('Honeyglow Worker', 'C', 25, 'An armored golden bee guards the hive approaches.'),
      monster('Ironbeak Raptor', 'C', 25, 'A hunting bird dives with a beak hard enough to pierce armor.'),
      monster('Meadowstrider', 'C', 25, 'A crested flightless bird sprints across the open meadow.'),
      monster('Stonehide Basilisk', 'C', 25, 'A rocky-scaled reptile threatens anyone who meets its gaze.'),
      monster('Verdant Golem', 'C', 25, 'Roots and living bark form a sentinel of the deep meadows.'),
      monster('Windmill Ravager', 'C', 25, 'A dark beetle tears through timber with heavy mandibles.'),
      monster('Honeyglow Soldier', 'U', 25, 'A heavily armored hive defender attacks intruders on sight.'),
      monster('Honeyglow Matron', 'R', 26, 'The luminous leader of one of Meadowshire’s great hives.'),
      monster('Silverhorn Patriarch', 'R', 26, 'A towering stag bears enormous antlers of pale silver.'),
    ],
    rareEncounters: [
      monster('Wickerbeast', 'N', 27, 'Dark magic has corrupted a towering sentinel of thorns and branches.'),
      card('Gilded Sweetwater Reliquary', 'treasure', 'N', 'A gilded cherrywood reliquary holds a blessing of spring.'),
    ],
    bosses: { miniboss: 'Honeyglow Matron', boss: 'Wickerbeast' },
    hunt: 'Silverhorn Patriarch',
    secret: {
      questTitle: 'The Hidden Reliquary',
      entranceName: 'Hidden Game Trail',
      entranceDescription: 'Tracks seen from the hilltop reveal a narrow path through the grass.',
      resourceLabel: 'Trail signs',
      resourceNames: [],
      lockCost: 0,
      discoveryName: 'View from the Hilltop',
      vaultName: 'Gilded Sweetwater Reliquary',
      vaultDescription: 'A unique treasure encounter rests in a sheltered glade.',
      vaultType: 'E',
    },
  },
};

export const DECK_IDS = Object.keys(DECKS);
export function deckFor(id) {
  const deck = DECKS[id];
  if (!deck) throw Error('Unknown Waystone deck.');
  return deck;
}

export function contentPool(deck, type) {
  if (type === 'M') return deck.monsters.filter(entry => !Object.values(deck.bosses).includes(entry.name));
  if (type === 'W') return deck.monsters.filter(entry => !Object.values(deck.bosses).includes(entry.name));
  if (type === 'F') return deck.cards.filter(entry => entry.cardType === 'skill_check');
  if (type === 'S') return deck.cards.filter(entry => entry.cardType === 'shrine');
  return deck.cards.filter(entry => !['skill_check', 'shrine'].includes(entry.cardType));
}
