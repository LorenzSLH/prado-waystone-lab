import { LEVELS, MOD_NAMES, DEFAULT_CONFIG, BOSS_FROM_LEVEL, floorProfile } from './config.js';
import { generate, topology } from './generation.js';
import { newSession, dispatch, resetSession, importSession, migrateV4Config, visibility, accessibility, getNode, huntChance } from './model.js';
import { icon, nodeIcon } from './icons.js';
import { renderMap, renderGenerationStep, landscape, escape } from './map.js';
import { DECKS, deckFor } from './decks.js';
import { DEFAULT_PROFILE, BEHAVIORS, EFFECT_KEYS, cloneProfile, exportProfile, importProfile, profileHash, validateProfile } from './profile.js';

const STORAGE = 'prado.waystone.v5.1', PROFILE_STORAGE = 'prado.waystone.generator-profile.v2', OLD_STORAGE = 'prado.waystone.v4', app = document.querySelector('#app');
let session, notice = '', profile, selected, mobileConfig = false, inspectorOpen = false, diagnosticOpen = false, importOpen = false, propertiesOpen = false, traceOpen = false, traceStep = 0, bait = false;
try { profile = localStorage.getItem(PROFILE_STORAGE) ? importProfile(localStorage.getItem(PROFILE_STORAGE)) : cloneProfile(); }
catch (error) { profile = cloneProfile(); notice = `The generator profile was reset: ${error.message}`; }
try {
  const saved = localStorage.getItem(STORAGE);
  if (saved) { session = importSession(saved); profile = cloneProfile(session.profile); }
  else {
    const migrated = migrateV4Config(localStorage.getItem(OLD_STORAGE)); session = newSession(migrated || DEFAULT_CONFIG, profile);
    if (migrated) notice = 'Version 4 settings were migrated. The map was rebuilt with Generator 5.';
  }
} catch (error) { session = newSession(DEFAULT_CONFIG, profile); notice = `The saved run could not be loaded: ${error.message}`; }
let draft = structuredClone(session.config), draftProfile = cloneProfile(profile);
selected = session.state.currentNodeId;
const percent = n => `${n > 0 ? '+' : ''}${n} %`;
const types = source => source.cardTypes;
const typeName = (source, id) => source.cardTypes.find(type => type.id === id)?.name || id;
const runeBudget = (rune, source = profile) => types(source).map(type => `${Number(rune.cardDeltas[type.id] || 0) > 0 ? '+' : ''}${Number(rune.cardDeltas[type.id] || 0)} ${type.name}`).join(' · ');
function save() { try { localStorage.setItem(STORAGE, JSON.stringify(session)); localStorage.setItem(PROFILE_STORAGE, exportProfile(profile)); } catch { notice = 'Local storage is unavailable. Export the run and profile as JSON.'; } }
function act(action) {
  try { session = dispatch(session, action); notice = ''; save(); }
  catch (e) { notice = e.message; }
  render();
}
function effectsMarkup(g) {
  const cards = g.config.runes.map(id => profile.runes.find(rune => rune.id === id)).map(rune => `<div class="rune-budget-effect"><span>${escape(rune.name)}</span><small>${escape(runeBudget(rune))}</small></div>`).join('');
  const percentages = Object.entries(g.effects).filter(([, v]) => v.percent).map(([k, v]) => `<div class="effect"><span>${escape(MOD_NAMES[k])}</span><strong class="${['hp', 'attack', 'leech'].includes(k) || v.percent < 0 ? 'malus' : ''}">${percent(v.percent)} <small>×${v.multiplier.toFixed(2)}</small></strong></div>`).join('');
  return `<p class="effect-heading">ABSOLUTE CARDS</p>${cards}<p class="effect-heading">GLOBAL PERCENT MODIFIERS</p>${percentages}`;
}
function configuration() {
  let preview, error = '';
  try { preview = generate(draft, draftProfile); } catch (e) { error = e.message; preview = session.graph; }
  const total = Object.values(preview.counts).reduce((a, b) => a + b, 0);
  const changed = JSON.stringify({ ...draft, runes: [...draft.runes].sort() }) !== JSON.stringify(session.config);
  const profile = floorProfile(draft);
  const deck = deckFor(draft.deck);
  return `<aside class="configuration ${mobileConfig ? 'mobile-open' : ''}" aria-label="Runes and configuration">
    <div class="section-eyebrow">YOUR WAYSTONE <span>01</span></div>
    <h2>One place.<br>Your adventure.</h2><p class="muted intro">Choose a Waystone deck and shape the route with three runes.</p>
    <div class="section-label">WAYSTONE-DECK <span>SOURCE DATA</span></div>
    <div class="deck-picker">${Object.values(DECKS).map(d => `<button class="deck-option ${draft.deck === d.slug ? 'chosen' : ''}" data-deck="${d.slug}" aria-pressed="${draft.deck === d.slug}"><span>${icon(d.style === 'dungeon' ? 'gate' : 'trail', '', 22)}<b>${escape(d.name)}</b></span><small>${d.style === 'dungeon' ? 'Dungeon' : 'Wilderness'} · ${escape(d.location)}</small></button>`).join('')}</div>
    <div class="deck-reference"><strong>${escape(deck.name)}</strong><span>${escape(deck.zone)} · recommended deck level ${deck.suggestedLevel}</span><p>${escape(deck.description)}</p><small>${deck.recipe.map(escape).join(' / ')}<br>${deck.composition.monster} Monster · ${deck.composition.event} Event · ${deck.composition.rest} Rest · ${deck.composition.wild} Wild</small><a href="${deck.sourceUrl}" target="_blank" rel="noreferrer">View official deck ↗</a></div>
    <div class="section-label">CHOOSE RUNES <span>${draft.runes.length} / 3</span></div>
    <div class="rune-grid">${draftProfile.runes.map(r => `<button class="rune ${draft.runes.includes(r.id) ? 'chosen' : ''}" data-rune="${r.id}" aria-pressed="${draft.runes.includes(r.id)}" title="${escape(`Cards: ${runeBudget(r, draftProfile)}.`)}">${icon(r.icon, '', 28)}<span>${escape(r.name)}</span><i>${draft.runes.includes(r.id) ? '✓' : '+'}</i></button>`).join('')}</div>
    <div class="level-row"><label for="level">Adventure level</label><strong id="level-value">${draft.level} <span>/ 5</span></strong></div>
    <input id="level" type="range" min="1" max="5" value="${draft.level}" aria-label="Adventure level">
    <div class="range-caption"><span>Short outing</span><span>Long journey</span></div>
    <p class="path-length">${LEVELS[draft.level].depth} encounters per adventure · ${profile.floors} ${profile.floors === 1 ? 'floor' : 'floors'} · ${profile.depth} per floor</p>
    <label class="field-label" for="seed">WORLD SEED</label><div class="seed-field"><input id="seed" maxlength="80" value="${escape(draft.seed)}" spellcheck="false"><button id="new-seed" title="Roll a new seed" aria-label="New seed">⟳</button></div>
    <label class="field-label" for="descent">ADVENTURE STRUCTURE</label><select id="descent"><option value="true" ${draft.descent ? 'selected' : ''}>Multiple floors from level 3</option><option value="false" ${!draft.descent ? 'selected' : ''}>One long floor</option></select>
    <p class="micro">All routes converge at the floor boss. Final boss from level ${BOSS_FROM_LEVEL} on the final floor.</p>
    ${error ? `<p class="form-error" role="alert">${escape(error)}</p>` : ''}
    <button id="generate" class="primary generate" ${error ? 'disabled' : ''}>${icon('waystone', '', 20)} ${changed ? 'Regenerate' : 'Generate map'} <span>↗</span></button>
    <div class="config-stats"><div class="section-label">${changed ? 'PREVIEW' : 'YOUR WORLD'} <span>${total} LOCATIONS</span></div>
      <div class="budget-bar">${types(draftProfile).map(t => `<span style="width:${(preview.counts[t.id] || 0) / total * 100}%;background:${escape(t.color)}"></span>`).join('')}</div>
      <div class="budget-list">${types(draftProfile).map(t => `<div><i class="dot" style="background:${escape(t.color)}"></i><span>${escape(t.name)}</span><strong>${preview.counts[t.id] || 0}</strong><small>${Math.round((preview.counts[t.id] || 0) / total * 100)} %</small></div>`).join('')}</div>
      <p class="micro">Runes change the absolute deck counts above. Percentage modifiers apply globally. The total covers the first floor including secret locations and boss; a chosen route contains only part of it. Decision value: basic 1 · rare/special 3 · unique 4 · boss 5–6. Regular paths: ${preview.weightProfile.pathMin}–${preview.weightProfile.pathMax}.</p>
      <details class="effects"><summary>Rune effects <span>＋</span></summary>${effectsMarkup(preview)}<p class="micro">Prototype values. Modifiers stack, capped from −75 to +200%. HP and attack are simulated; there is no combat system.</p></details>
    </div>
    <div class="config-footer">${icon('compass', '', 18)} Every path leaves another behind.</div>
  </aside>`;
}
function questsMarkup() {
  const { graph: g, state: s } = session;
  const qs = g.quests.filter(q => !q.compatible || ['revealed', 'rumor'].includes(visibility(g, s, q.target)));
  return `<div class="quest-section"><div class="section-label">DISTANT WHISPERS <span>${qs.length}</span></div>${qs.length ? qs.map(q => {
    const status = s.questStates[q.id], missed = status === 'missed', target = getNode(g, q.target);
    return `<button class="quest-card ${missed ? 'missed' : ''}" ${q.compatible ? `data-node="${q.target}"` : 'disabled'}>${icon(q.id === 'gate' ? (target?.secretKind === 'trail' ? 'trail' : 'gate') : q.id === 'hunt' ? 'hunt' : 'forage', '', 25)}<span><strong>${escape(q.title)}</strong><small>${status === 'complete' ? '✓ Quest complete' : missed ? 'No longer reachable in this run' : status === 'incompatible' ? escape(q.reason) : escape(q.description)}</small></span><span class="quest-arrow">↗</span></button>`;
  }).join('') : '<p class="micro">No special locations are known yet. Explore the map or enable rumors.</p>'}</div>`;
}
function inspector() {
  const { graph: g, state: s } = session, n = getNode(g, selected), visible = n && visibility(g, s, n.id) !== 'hidden';
  if (!visible) selected = s.currentNodeId;
  const node = getNode(g, selected), a = accessibility(g, s, node.id), rumor = visibility(g, s, node.id) === 'rumor';
  if (visibility(g, s, node.id) === 'unknown') return `<aside class="inspector ${inspectorOpen ? 'sheet-open' : ''}" aria-label="Node details"><div class="inspector-top"><div class="section-eyebrow">UNKNOWN LOCATION</div><button class="sheet-close" id="close-sheet" aria-label="Close details">×</button></div><div class="place-art unknown">${landscape()}<div class="place-emblem">${icon('unknown', '', 44)}</div><span>THE ROUTE IS VISIBLE</span></div><div class="place-body"><h2>What waits here?</h2><p class="place-description">You know the route, but not the encounter. Move closer to discover the location.</p><div class="next-hint">${a === 'missed' ? 'No longer reachable from your route.' : 'Route view reveals no names, types, or rewards.'}</div></div>${questsMarkup()}</aside>`;
  const reward = s.resolvedEncounters[node.id], encounter = a === 'current' && s.status === 'encounter';
  const secret = g.deck.secret, lockCost = node.requires?.amount || node.lockCost || 0, resourceName = node.requires?.resourceId || secret.resourceLabel;
  const type = node.special === 'boss' ? 'FINAL BOSS' : node.special === 'miniboss' ? 'MINIBOSS' : node.special === 'descent' ? 'NEXT FLOOR' : node.kind === 'start' ? 'THE BEGINNING' : node.kind === 'end' ? 'JOURNEY END' : typeName(profile, node.type).toUpperCase();
  const descriptions = { start: 'A warm stone rests in your hand. Three runes begin to glow. Beyond the fog, routes await your choice.', M: 'Something moves in the next corridor. Face the encounter and claim its reward.', S: 'A shrine offers an uncommon choice.', F: 'Useful resources grow here.', W: 'Fresh tracks point toward a hunting encounter.', E: 'Time has left a story behind at this location.', end: 'You have reached the horizon. Some routes remain untaken, making this journey your own.' };
  const specialDescriptions = { boss: 'Every route leads here. The true master of this adventure waits below. Defeat it to complete the journey.', miniboss: 'The guardian blocks this floor’s exit. Every regular and secret route leads to this encounter.', gate: 'A secret side arm lies beyond the discovered gate. Two fragments open it, while the regular route still reaches the floor boss.', treasure: 'A hidden cache rewards the discovery with 25 bonus loot. The route continues to the same floor boss.', descent: 'The guardian is defeated. This gate leads deeper. Your energy and inventory continue to the next floor.' };
  const statuses = { current: 'You are here', next: 'Directly reachable', future: 'Still ahead', missed: 'No longer reachable on this route', locked: `Locked · ${lockCost} ${resourceName} required`, visited: 'Already visited', undiscovered: 'Debug · not discovered' };
  return `<aside class="inspector ${inspectorOpen ? 'sheet-open' : ''}" aria-label="Node details">
    <div class="inspector-top"><div class="section-eyebrow">TRAVEL GUIDE <span>03</span></div><button class="sheet-close" id="close-sheet" aria-label="Close details">×</button></div>
    <div class="place-art ${node.special || node.kind}">${landscape()}<div class="place-emblem">${icon(nodeIcon(node), '', 44)}</div><span>${rumor ? '✧ RUMOR' : type}</span></div>
    <div class="place-body"><span class="location-tag ${a}"><i></i>${statuses[a]}</span>${node.decisionWeight ? `<span class="encounter-weight">DECISION VALUE <b>${node.decisionWeight}</b></span>` : ''}<h2>${escape(node.name)}</h2>
    <p class="place-description">${rumor ? 'Travelers speak of this location. Its encounter remains unknown, and it can only be reached through connected locations.' : escape(node.description || specialDescriptions[node.special] || descriptions[node.kind] || descriptions[node.type])}</p>
    ${node.special === 'gate' && lockCost ? `<div class="requirement">${icon('fragment')} <span>${escape(node.name)}<strong>${s.inventory.resources[node.requires.resourceId] || 0} / ${lockCost} ${escape(resourceName)} ${reward ? '· opened' : ''}</strong></span></div>` : ''}
    ${!rumor && node.produces ? `<p class="micro">Guaranteed find: ${node.produces.amount} ${escape(node.produces.resourceId)}. The alternative has the same decision value.</p>` : ''}
    ${a === 'next' && node.behavior === 'hunt' ? `<label class="bait-control"><input type="checkbox" id="bait" ${bait ? 'checked' : ''} ${s.inventory.bait === 0 ? 'disabled' : ''}><span>Use bait when entering <small>${s.inventory.bait} available · Rare/Unique ${(huntChance(g, bait, s.lore[g.config.deck] || 0) * 100).toFixed(1)} % · Lore ${s.lore[g.config.deck] || 0}</small></span></label>` : ''}
    ${encounter ? `<div class="encounter-note">${s.pendingHunt ? `<strong>${escape(s.pendingHunt.name)}</strong> · ${s.pendingHunt.rarity === 'U' ? 'Unique' : s.pendingHunt.rarity === 'R' ? 'Rare' : 'Common'}<br>` : ''}Simplified encounter · success simulated${node.type === 'M' || s.pendingHunt ? `<br>Monster-HP ×${g.effects.hp.multiplier.toFixed(2)} · Attack ×${g.effects.attack.multiplier.toFixed(2)} · Leech ${percent(g.effects.leech.percent)}` : ''}</div><button id="resolve" class="primary">Complete encounter ${icon('chevron', '', 18)}</button>` : a === 'next' ? `<button id="enter" class="primary" ${s.status !== 'exploring' || (s.energy < 1 && !s.view.infinite && node.kind !== 'end') ? 'disabled' : ''}>Enter location <span>${node.kind === 'end' ? 'Goal' : `${icon('energy', '', 16)} 1`}</span></button>${s.status === 'encounter' ? '<button id="return-encounter" class="text-button">Finish current encounter →</button>' : ''}` : a === 'current' && s.status !== 'finished' ? '<div class="next-hint">Choose a highlighted location on the map.<br>Inspection is free.</div>' : ''}
    ${reward ? `<div class="reward"><strong>✓ Encounter complete</strong><span>+${reward.loot} Loot${reward.herbs ? ` · +${reward.herbs} herbs` : ''}${reward.fragment ? ` · +1 ${escape(secret.resourceLabel)}` : ''}${reward.unique ? ' · rare find!' : ''}${reward.bait ? ' · 1 bait consumed' : ''}</span></div>` : ''}
    ${a === 'locked' ? `<p class="micro">Take the open route beside it if you lack ${escape(secret.resourceLabel.toLowerCase())} fehlen.</p>` : ''}
    ${a === 'current' && s.status === 'floor-cleared' ? `<button id="descend-inspector" class="primary">${icon('gate', '', 20)} Continue to floor ${g.config.floor + 1} ↓</button>` : ''}
    ${reward && node.discovers ? `<div class="discovery-note">${icon(g.deck.style === 'dungeon' ? 'gate' : 'trail', '', 20)} ${node.discovers === 'entrance' ? `${escape(secret.discoveryName)} reveals ${escape(secret.entranceName)}.` : `The secret route to ${escape(secret.vaultName)} has been discovered.`}</div>` : ''}
    </div>${questsMarkup()}
    <div class="satchel"><div class="section-label">IN YOUR PACK</div><div class="inventory"><span>${icon('fragment')}<b>${s.inventory.fragments}</b><small>Resources</small></span><span>${icon('trail')}<b>${s.inventory.bait}</b><small>Bait</small></span><span>${icon('hunt')}<b>${s.lore[g.config.deck] || 0}</b><small>Area lore</small></span><span>${icon('event')}<b>${s.inventory.loot}</b><small>Loot</small></span></div></div>
  </aside>`;
}
function controls() {
  const v = session.state.view;
  return `<details class="lab-controls" ${diagnosticOpen ? 'open' : ''}><summary>${icon('compass', '', 20)} Lab & visibility <span>⌄</span></summary><div class="lab-content"><div class="control-grid">
    <label>Fog profile<select id="fog"><option value="off" ${v.fog === 'off' ? 'selected' : ''}>Off · learn map</option><option value="local" ${v.fog === 'local' ? 'selected' : ''}>Local fog</option><option value="rumors" ${v.fog === 'rumors' ? 'selected' : ''}>Local + rumors</option></select></label>
    <label>Preview<select id="preview">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${v.preview === n ? 'selected' : ''}>${n ? `${n} edges` : `Level default (${LEVELS[session.graph.config.level].preview})`}</option>`).join('')}</select></label>
    <label>Rumors<select id="rumors">${[0, 1, 2, 3].map(n => `<option ${v.rumorCount === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="checkbox-label paths-setting"><input id="paths" type="checkbox" ${v.paths ? 'checked' : ''}> Show all regular routes · contents remain hidden</label>
    <label class="checkbox-label"><input id="debug" type="checkbox" ${v.debug ? 'checked' : ''}> Debug: reveal everything</label><label class="checkbox-label"><input id="infinite" type="checkbox" ${v.infinite ? 'checked' : ''}> Unlimited test energy</label>
    </div><p class="micro">Route view shows only the structure. Visibility and rumors still determine what you know about locations. Secret routes remain hidden until discovered, even with fog off. Debug displays them for testing but does not unlock them. Learned information persists; reset clears it.</p>
    <div class="lab-buttons"><button id="properties">Generator properties</button><button id="trace">View generation</button><button id="energy">+20 test energy</button><button id="reset">Reset run</button><button id="export">Export run</button><button id="import">Import run</button></div>
    ${v.debug ? debugPanel() : ''}</div></details>`;
}
function debugPanel() {
  const g = session.graph;
  return `<div class="diagnostics"><h3>Generator diagnostics</h3><p class="micro">Version ${g.generatorVersion} · Profile ${g.profileHash} · floor ${g.config.floor}/${floorProfile(g.config).floors} · ${g.nodes.length} nodes · ${g.edges.length} edges · invariants verified</p><table><thead><tr><th>Route</th>${types(profile).map(t => `<th>${escape(t.name)}</th>`).join('')}</tr></thead><tbody>${[...g.routes, { id: null, name: 'Entry & boss' }].map(r => `<tr><td>${r.name}</td>${types(profile).map(t => `<td>${g.nodes.filter(n => n.routeId === r.id && n.type === t.id).length}</td>`).join('')}</tr>`).join('')}</tbody></table><h4>Level comparison · first-floor layout</h4><div class="level-comparison">${[1, 2, 3, 4, 5].map(level => { const config = { ...g.config, level, floor: 1 }; const t = topology(config, { profile }); const p = floorProfile(config); return `<span><b>L${level}</b>${p.floors} ${p.floors === 1 ? 'floor' : 'floors'}<small>${p.depth} / floor · ${t.nodes.length} nodes</small></span>`; }).join('')}</div></div>`;
}
function summaryMarkup() {
  const { graph: g, state: s } = session;
  if (!['finished', 'floor-cleared'].includes(s.status)) return '';
  const floors = [...session.completedFloors, { graph: g, state: s }];
  const seen = floors.flatMap(f => f.graph.nodes.filter(n => f.state.visitedNodeIds.includes(n.id)));
  const missed = floors.flatMap(f => f.graph.nodes.filter(n => ['revealed', 'rumor'].includes(visibility(f.graph, f.state, n.id)) && accessibility(f.graph, f.state, n.id) === 'missed' && n.special).map(n => `floor ${f.graph.config.floor}: ${n.name}`));
  const descending = s.status === 'floor-cleared';
  const hunts = floors.flatMap(floor => floor.state.huntLog || []);
  return `<section class="run-summary"><div>${icon(descending ? 'gate' : 'end', '', 40)}</div><span class="section-eyebrow">${descending ? `FLOOR ${g.config.floor} COMPLETE` : 'YOUR ADVENTURE IS COMPLETE'}</span><h2>${descending ? 'The depths are calling.' : 'One path. Your story.'}</h2><p>${seen.filter(n => n.type).length} encounters · ${floors.length} ${floors.length === 1 ? 'floor' : 'floors'} · ${s.inventory.loot} Loot</p><div class="summary-types">${types(profile).map(t => `<span>${seen.filter(n => n.type === t.id).length} ${escape(t.name)}</span>`).join('')}</div><p class="micro">Area lore: ${s.lore[g.config.deck] || 0} · hunts: ${hunts.length} · Bait used: ${hunts.filter(hunt => hunt.bait).length}<br>${hunts.map(hunt => `${hunt.rarity}: ${escape(hunt.name)}`).join(' · ') || 'No monster hunt yet'}<br>Seed: ${escape(g.config.seed)} · ${g.config.runes.map(id => profile.runes.find(r => r.id === id).name).join(' / ')}</p><details class="effects"><summary>Rune effects for this journey</summary>${effectsMarkup(g)}</details>${descending ? `<p class="micro">Inventory, lore, and remaining energy continue with you.</p><button id="descend" class="primary">Enter gate · floor ${g.config.floor + 1} ↓</button>` : '<button id="replay" class="primary">Same world, different path ↗</button>'}</section>`;
}
function propertiesMarkup() {
  if (!propertiesOpen) return '';
  const behaviorOptions = value => BEHAVIORS.map(item => `<option value="${item}" ${value === item ? 'selected' : ''}>${item}</option>`).join('');
  const typeRows = draftProfile.cardTypes.map((type, index) => `<tr><td><input data-type="${index}" data-field="name" value="${escape(type.name)}"></td><td><input data-type="${index}" data-field="color" type="color" value="${escape(type.color)}"></td><td><select data-type="${index}" data-field="icon">${['event','monster','forage','waystone','hunt','trap','gate','fragment','treasure'].map(item => `<option ${type.icon === item ? 'selected' : ''}>${item}</option>`).join('')}</select></td><td><input data-type="${index}" data-field="baseProbability" type="number" min="0" max="100" step="0.5" value="${type.baseProbability}"></td><td><input data-type="${index}" data-field="decisionWeight" type="number" min="1" max="6" value="${type.decisionWeight}"></td><td><input data-type="${index}" data-field="rarity.C" type="number" min="0" max="100" value="${type.rarityWeights.C}"> / <input data-type="${index}" data-field="rarity.R" type="number" min="0" max="100" value="${type.rarityWeights.R}"> / <input data-type="${index}" data-field="rarity.U" type="number" min="0" max="100" value="${type.rarityWeights.U}"></td><td><select data-type="${index}" data-field="behavior">${behaviorOptions(type.behavior)}</select></td><td><input data-type="${index}" data-field="placement.minLevel" type="number" min="1" max="5" value="${type.placement.minLevel}">–<input data-type="${index}" data-field="placement.maxLevel" type="number" min="1" max="5" value="${type.placement.maxLevel}"></td><td><input data-type="${index}" data-field="placement.minDepth" type="number" min="1" max="24" value="${type.placement.minDepth}">–<input data-type="${index}" data-field="placement.maxDepth" type="number" min="1" max="24" value="${type.placement.maxDepth}"></td><td><button data-remove-type="${index}" ${['M','S','F','E','W'].includes(type.id) ? 'disabled' : ''}>×</button></td></tr>`).join('');
  const cardRows = draftProfile.cards.map((card, index) => `<tr><td><input data-card="${index}" data-field="name" value="${escape(card.name)}"></td><td><select data-card="${index}" data-field="deck">${Object.keys(DECKS).map(id => `<option value="${id}" ${card.deck === id ? 'selected' : ''}>${escape(DECKS[id].name)}</option>`).join('')}</select></td><td><select data-card="${index}" data-field="typeId">${draftProfile.cardTypes.map(type => `<option value="${type.id}" ${card.typeId === type.id ? 'selected' : ''}>${escape(type.name)}</option>`).join('')}</select></td><td><select data-card="${index}" data-field="rarity">${['C','R','U'].map(item => `<option ${card.rarity === item ? 'selected' : ''}>${item}</option>`).join('')}</select></td><td><input data-card="${index}" data-field="selectionWeight" type="number" min="0.1" step="0.1" value="${card.selectionWeight}"></td><td><select data-card="${index}" data-field="behavior"><option value="" ${!card.behavior ? 'selected' : ''}>inherit</option>${behaviorOptions(card.behavior)}</select></td><td><input data-card="${index}" data-field="placement.minLevel" type="number" min="1" max="5" value="${card.placement.minLevel}">–<input data-card="${index}" data-field="placement.maxLevel" type="number" min="1" max="5" value="${card.placement.maxLevel}"></td><td><input data-card="${index}" data-field="placement.minDepth" type="number" min="1" max="24" value="${card.placement.minDepth}">–<input data-card="${index}" data-field="placement.maxDepth" type="number" min="1" max="24" value="${card.placement.maxDepth}"></td><td><input data-card="${index}" data-field="resourceId" placeholder="resource-id" value="${escape(card.produces?.resourceId || card.requires?.resourceId || '')}"></td><td><input data-card="${index}" data-field="resourceAmount" type="number" min="0" value="${card.produces?.amount || card.requires?.amount || 0}"></td><td><button data-remove-card="${index}">×</button></td></tr>`).join('');
  const runeRows = draftProfile.runes.map((rune, index) => `<tr><td><input data-rune-edit="${index}" data-field="name" value="${escape(rune.name)}"></td>${draftProfile.cardTypes.map(type => `<td><input data-rune-edit="${index}" data-delta="${type.id}" type="number" step="1" value="${Number(rune.cardDeltas[type.id] || 0)}"></td>`).join('')}${EFFECT_KEYS.map(key => `<td><input data-rune-edit="${index}" data-mod="${key}" type="number" step="5" value="${Number(rune.modifiers[key] || 0)}"></td>`).join('')}</tr>`).join('');
  return `<div class="dialog-backdrop property-backdrop"><section class="property-dialog" role="dialog" aria-modal="true" aria-labelledby="property-title"><header><div><span class="section-eyebrow">GENERATOR PROFILE v${draftProfile.schemaVersion}</span><h2 id="property-title">Generator properties</h2><p>Probability controls frequency. Decision weight controls route value. Placement rules determine whether and where a card is eligible.</p></div><button id="close-properties" aria-label="Close">×</button></header>
    <details open><summary>Deck & card types</summary><div class="property-table"><table><thead><tr><th>Type</th><th>Color</th><th>Icon</th><th>Base %</th><th>Value</th><th>C / R / U %</th><th>Behavior</th><th>Level</th><th>Depth</th><th></th></tr></thead><tbody>${typeRows}</tbody></table></div><button id="add-type">+ Add card type</button></details>
    <details><summary>Card catalog · ${draftProfile.cards.length} entries</summary><div class="property-table card-table"><table><thead><tr><th>Name</th><th>Deck</th><th>Type</th><th>Rarity</th><th>Selection</th><th>Behavior</th><th>Level</th><th>Depth</th><th>Resource</th><th>Amount</th><th></th></tr></thead><tbody>${cardRows}</tbody></table></div><button id="add-card">+ Add card</button></details>
    <details><summary>Runes · absolute cards and global percentage modifiers</summary><div class="property-table rune-table"><table><thead><tr><th>Rune</th>${draftProfile.cardTypes.map(type => `<th>± ${escape(type.name)}</th>`).join('')}${EFFECT_KEYS.map(key => `<th>${escape(MOD_NAMES[key])}</th>`).join('')}</tr></thead><tbody>${runeRows}</tbody></table></div></details>
    <details open><summary>Rules & starting inventory</summary><div class="property-fields"><label>Max. path spread<input id="profile-path-spread" type="number" min="0" max="12" value="${draftProfile.placementRules.maxPathSpread}"></label><label>Max. branches per corridor<input id="profile-max-branches" type="number" min="2" max="4" value="${draftProfile.placementRules.maxBranchesPerLane}"></label><label>Starting bait<input id="profile-bait" type="number" min="0" max="99" value="${draftProfile.startInventory.bait}"></label><label>Bait multiplier<input id="profile-bait-multiplier" type="number" min="1" max="10" step="0.1" value="${draftProfile.huntingRules.baitRareMultiplier}"></label><label>Lore step<input id="profile-lore-step" type="number" min="0" max="1" step="0.05" value="${draftProfile.huntingRules.loreStep}"></label><label>Lore cap<input id="profile-lore-cap" type="number" min="1" max="5" step="0.1" value="${draftProfile.huntingRules.loreMultiplierCap}"></label></div></details>
    <details><summary>Import profile</summary><textarea id="profile-import-text" rows="6" placeholder="GeneratorProfile JSON"></textarea><button id="apply-profile-import">Load profile JSON</button></details>
    <p id="profile-error" class="form-error" role="alert"></p><footer><button id="reset-profile">Restore defaults</button><button id="export-profile">Export profile</button><button id="cancel-properties">Cancel</button><button id="apply-properties" class="primary">Apply profile & generate map</button></footer></section></div>`;
}
function traceMarkup() {
  if (!traceOpen) return '';
  const trace = session.graph.generationTrace, step = trace[Math.max(0, Math.min(traceStep, trace.length - 1))];
  const names = { validate: '1 · Validate profile', 'base-budget': '2 · Base budgets', runes: '3 · Apply runes', grid: '4 · Floor grid', paths: '5 · Paths', required: '6 · Required cards', types: '7 · Card types', content: '8 · Rarities & cards', 'validate-final': '9 · Balance & validation' };
  return `<div class="dialog-backdrop"><section class="trace-dialog" role="dialog" aria-modal="true" aria-labelledby="trace-title"><header><div><span class="section-eyebrow">DETERMINISTIC BUILD · ${traceStep + 1}/${trace.length}</span><h2 id="trace-title">${names[step.phase] || step.phase}</h2></div><button id="close-trace" aria-label="Close">×</button></header><div class="trace-layout"><div class="trace-canvas">${renderGenerationStep(session.graph, step)}</div><div><ol class="trace-steps">${trace.map((item, index) => `<li class="${index === traceStep ? 'active' : index < traceStep ? 'done' : ''}">${names[item.phase] || item.phase}</li>`).join('')}</ol><ul>${step.details.map(item => `<li>${escape(item)}</li>`).join('')}</ul></div></div><footer><button id="trace-prev" ${traceStep === 0 ? 'disabled' : ''}>← Back</button><button id="trace-next" ${traceStep === trace.length - 1 ? 'disabled' : ''}>Next →</button></footer></section></div>`;
}
function render(scrollToPlayer = false) {
  const priorScroll = document.querySelector('.map-scroll'), top = priorScroll?.scrollTop, left = priorScroll?.scrollLeft;
  const { graph: g, state: s } = session, progress = Object.keys(s.resolvedEncounters).length, profile = floorProfile(g.config);
  app.innerHTML = `<header class="topbar"><a class="brand" href="./">${icon('waystone', '', 36)}<span>prado<small>WALK INTO YOUR NEXT STORY</small></span></a><div class="lab-title">WAYSTONE <span>MAP LAB</span><b>PROTOTYPE</b></div><div class="header-status"><i></i> Saved locally <span class="header-separator">/</span><button id="mobile-config">${icon('waystone', '', 18)} Runes</button></div></header>
    <main class="workspace">${configuration()}<section class="map-column theme-${g.deck.style}" aria-label="Map lab"><div class="map-heading"><div><div class="section-eyebrow">${g.deck.style === 'dungeon' ? 'BENEATH THE OLD CITY' : 'OUT IN MEADOWSHIRE'} <span>02</span></div><h1>${escape(g.deck.name)}</h1><p>${escape(g.deck.style === 'dungeon' ? 'Tight corridors, keys, and a hidden vault.' : 'Wide routes, more branches, and wilderness discoveries.')}</p></div><div class="energy-pill">${icon('energy', '', 20)}<strong>${s.view.infinite ? '∞' : s.energy}</strong><span>Energy</span><button id="quick-energy" aria-label="Add 20 test energy">+</button></div></div>
    <div class="map-toolbar"><span>${icon(g.deck.style === 'dungeon' ? 'gate' : 'trail', '', 18)} ${escape(g.deck.location)} <i>·</i> Level ${g.config.level} <i>·</i> <span class="seed-label">${escape(g.config.seed)}</span></span><button id="to-player">◎ Go to player</button></div>
    <div class="floor-strip"><span>${icon('gate', '', 17)} Floor ${g.config.floor} / ${profile.floors}</span><span>${profile.finalBoss ? 'Final boss at the end of this floor' : 'Miniboss at the end of this floor'}</span></div>
    ${s.view.debug ? '<div class="debug-banner">DEBUG · Fully revealed · no additional knowledge saved</div>' : ''}
    <div class="map-scroll" tabindex="0" aria-label="Scrollable map">${renderMap(g, s, selected)}</div>
    <div class="map-legend"><span><i class="legend-current"></i>You</span><span><i class="legend-next"></i>Next location</span><span><i class="legend-rumor"></i>Rumor</span><span class="map-progress">${progress} / ${profile.depth} on this floor</span></div>
    <div class="journey-progress"><span style="width:${progress / profile.depth * 100}%"></span></div>
    ${summaryMarkup()}${controls()}<p class="prototype-note">Stored energy and flexible timing. No GPS. All values are test data.</p>
    </section>${inspector()}</main><footer class="page-footer"><span>PRADO / WAYSTONE EXPLORATIONS</span><span>Deck content based on the official Waystone pages · roles simulated in the prototype</span><span>LAB v5.1</span></footer>
    ${notice ? `<div class="toast" role="status">${escape(notice)}<button id="dismiss" aria-label="Dismiss notice">×</button></div>` : ''}
    ${importOpen ? '<div class="dialog-backdrop"><section class="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title"><h2 id="import-title">Import journey</h2><p>Choose a JSON export or paste it here. The profile snapshot and action history are fully validated.</p><input id="import-file" type="file" accept=".json,application/json"><textarea id="import-text" rows="8" aria-label="JSON save file" placeholder="JSON save file …"></textarea><p id="import-error" role="alert"></p><div class="lab-buttons"><button id="cancel-import">Cancel</button><button class="primary" id="apply-import">Import</button></div></section></div>' : ''}${propertiesMarkup()}${traceMarkup()}`;
  bind();
  const scroller = document.querySelector('.map-scroll');
  if (top !== undefined) { scroller.scrollTop = top; scroller.scrollLeft = left; }
  if (scrollToPlayer) requestAnimationFrame(focusPlayer);
}
function focusPlayer() {
  const node = document.getElementById(`node-${session.state.currentNodeId}`), box = document.querySelector('.map-scroll');
  if (!node || !box) return;
  const rect = node.getBoundingClientRect(), bounds = box.getBoundingClientRect();
  box.scrollTo({ top: box.scrollTop + rect.top - bounds.top - box.clientHeight * .7, left: box.scrollLeft + rect.left - bounds.left - box.clientWidth / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
function on(id, event, fn) { document.getElementById(id)?.addEventListener(event, fn); }
function regenerate() {
  if (session.state.visitedNodeIds.length > 1 && !confirm('Neue Generate map? Dein aktueller Test-Run geht verloren. Exportiere ihn bei Bedarf vorher.')) return;
  try { session = newSession(draft, draftProfile); profile = cloneProfile(draftProfile); draft = structuredClone(session.config); selected = 'start'; bait = false; notice = ''; mobileConfig = false; save(); render(true); } catch (e) { notice = e.message; render(); }
}
function reset() {
  session = resetSession(session); selected = 'start'; bait = false; notice = 'Same map, fresh run. Encounter outcomes remain reproducible.'; save(); render(true);
}
function inspect(id) {
  if (visibility(session.graph, session.state, id) === 'hidden') return;
  selected = id; bait = false; inspectorOpen = true; render();
  if (matchMedia('(max-width: 900px)').matches) document.getElementById('close-sheet')?.focus({ preventScroll: true });
  else document.getElementById(`node-${id}`)?.focus({ preventScroll: true });
}
function applyImport(text) {
  try { const next = importSession(text); session = next; profile = cloneProfile(next.profile); draftProfile = cloneProfile(next.profile); draft = structuredClone(next.config); selected = next.state.currentNodeId; importOpen = false; notice = 'Journey and generator profile restored successfully.'; save(); render(true); }
  catch (e) { document.getElementById('import-error').textContent = e.message; }
}
function setNested(target, path, value) { const parts = path.split('.'); let current = target; while (parts.length > 1) { const key = parts.shift(); current[key] ||= {}; current = current[key]; } current[parts[0]] = value; }
function downloadJson(name, text) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function bind() {
  document.querySelectorAll('[data-deck]').forEach(b => b.addEventListener('click', () => { draft.deck = b.dataset.deck; render(); }));
  document.querySelectorAll('[data-rune]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.rune;
    if (draft.runes.includes(id)) draft.runes = draft.runes.filter(r => r !== id);
    else if (draft.runes.length < 3) draft.runes.push(id);
    else { notice = 'Deselect a rune before choosing its replacement.'; }
    render();
  }));
  document.querySelectorAll('[data-node]').forEach(n => { n.addEventListener('click', () => inspect(n.dataset.node)); if (n.tagName.toLowerCase() === 'g') n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inspect(n.dataset.node); } }); });
  on('level', 'change', e => { draft.level = Number(e.target.value); render(); });
  on('seed', 'input', e => { draft.seed = e.target.value; });
  on('descent', 'change', e => { draft.descent = e.target.value === 'true'; render(); });
  on('new-seed', 'click', () => { const bytes = new Uint32Array(1); crypto.getRandomValues(bytes); draft.seed = `PRADO-${bytes[0].toString(36).toUpperCase()}`; render(); });
  on('generate', 'click', regenerate);
  on('enter', 'click', () => { const id = selected; act({ type: 'enter', id, bait }); if (session.state.currentNodeId === id) { bait = false; focusPlayer(); } });
  on('resolve', 'click', () => { act({ type: 'resolve' }); bait = false; });
  on('bait', 'change', e => { bait = e.target.checked; render(); });
  on('to-player', 'click', () => { selected = session.state.currentNodeId; render(true); });
  on('return-encounter', 'click', () => inspect(session.state.currentNodeId));
  on('energy', 'click', () => act({ type: 'energy' })); on('quick-energy', 'click', () => act({ type: 'energy' }));
  on('reset', 'click', reset); on('replay', 'click', reset);
  for (const id of ['descend', 'descend-inspector']) on(id, 'click', () => { selected = 'start'; bait = false; inspectorOpen = false; act({ type: 'descend' }); render(true); });
  for (const [id, key] of [['fog', 'fog'], ['paths', 'paths'], ['preview', 'preview'], ['rumors', 'rumorCount'], ['debug', 'debug'], ['infinite', 'infinite']]) on(id, 'change', e => { const value = e.target.type === 'checkbox' ? e.target.checked : ['preview', 'rumorCount'].includes(key) ? Number(e.target.value) : e.target.value; act({ type: 'view', view: { ...session.state.view, [key]: value } }); });
  document.querySelector('.lab-controls')?.addEventListener('toggle', e => { diagnosticOpen = e.target.open; });
  on('export', 'click', () => downloadJson(`prado-${session.graph.config.seed.replace(/[^a-z0-9-]/gi, '_')}.json`, JSON.stringify(session, null, 2)));
  on('import', 'click', () => { importOpen = true; render(); document.getElementById('import-text').focus(); });
  on('cancel-import', 'click', () => { importOpen = false; render(); });
  on('apply-import', 'click', () => applyImport(document.getElementById('import-text').value));
  on('import-file', 'change', async e => { const f = e.target.files[0]; if (f?.size > 5_000_000) document.getElementById('import-error').textContent = 'File is too large (maximum 5 MB).'; else if (f) document.getElementById('import-text').value = await f.text(); });
  on('properties', 'click', () => { draftProfile = cloneProfile(profile); propertiesOpen = true; render(); });
  for (const id of ['close-properties', 'cancel-properties']) on(id, 'click', () => { propertiesOpen = false; draftProfile = cloneProfile(profile); render(); });
  document.querySelectorAll('[data-type]').forEach(input => input.addEventListener('input', e => { const numeric = ['baseProbability','decisionWeight'].includes(e.target.dataset.field) || e.target.dataset.field.startsWith('rarity.') || e.target.dataset.field.startsWith('placement.'); setNested(draftProfile.cardTypes[Number(e.target.dataset.type)], e.target.dataset.field.replace('rarity.', 'rarityWeights.'), numeric ? Number(e.target.value) : e.target.value); }));
  document.querySelectorAll('[data-card]').forEach(input => input.addEventListener('input', e => {
    const card = draftProfile.cards[Number(e.target.dataset.card)], field = e.target.dataset.field, value = ['selectionWeight','resourceAmount'].includes(field) || field.startsWith('placement.') ? Number(e.target.value) : e.target.value;
    if (field === 'resourceId' || field === 'resourceAmount') { const key = card.behavior === 'resource' ? 'produces' : card.behavior === 'gate' ? 'requires' : null; if (key) { card[key] ||= { resourceId: '', amount: 0, ...(key === 'requires' ? { consume: true } : {}) }; card[key][field === 'resourceId' ? 'resourceId' : 'amount'] = value; } }
    else setNested(card, field, value);
  }));
  document.querySelectorAll('[data-rune-edit]').forEach(input => input.addEventListener('input', e => { const rune = draftProfile.runes[Number(e.target.dataset.runeEdit)]; if (e.target.dataset.delta) rune.cardDeltas[e.target.dataset.delta] = Number(e.target.value); else if (e.target.dataset.mod) rune.modifiers[e.target.dataset.mod] = Number(e.target.value); else rune[e.target.dataset.field] = e.target.value; }));
  on('profile-path-spread', 'input', e => { draftProfile.placementRules.maxPathSpread = Number(e.target.value); }); on('profile-max-branches', 'input', e => { draftProfile.placementRules.maxBranchesPerLane = Number(e.target.value); }); on('profile-bait', 'input', e => { draftProfile.startInventory.bait = Number(e.target.value); }); on('profile-bait-multiplier', 'input', e => { draftProfile.huntingRules.baitRareMultiplier = Number(e.target.value); }); on('profile-lore-step', 'input', e => { draftProfile.huntingRules.loreStep = Number(e.target.value); }); on('profile-lore-cap', 'input', e => { draftProfile.huntingRules.loreMultiplierCap = Number(e.target.value); });
  on('add-type', 'click', () => { let number = 1; while (draftProfile.cardTypes.some(type => type.id === `X${number}`)) number++; const id = `X${number}`; draftProfile.cardTypes.push({ id, name: `New card type ${number}`, color: '#7f866f', icon: 'event', baseProbability: 0, decisionWeight: 1, rarityWeights: { C: 100, R: 0, U: 0 }, behavior: 'standard', placement: { minLevel: 1, maxLevel: 5, minDepth: 1, maxDepth: 24 } }); draftProfile.runes.forEach(rune => { rune.cardDeltas[id] = 0; }); render(); });
  document.querySelectorAll('[data-remove-type]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.removeType), id = draftProfile.cardTypes[index].id; draftProfile.cardTypes.splice(index, 1); draftProfile.cards = draftProfile.cards.filter(card => card.typeId !== id); draftProfile.runes.forEach(rune => { delete rune.cardDeltas[id]; }); render(); }));
  on('add-card', 'click', () => { const number = draftProfile.cards.length + 1; draftProfile.cards.push({ id: `custom-${Date.now()}`, deck: draft.deck, name: `New card ${number}`, typeId: draftProfile.cardTypes[0].id, rarity: 'C', selectionWeight: 1, description: '', placement: { minLevel: 1, maxLevel: 5, minDepth: 1, maxDepth: 24 } }); render(); });
  document.querySelectorAll('[data-remove-card]').forEach(button => button.addEventListener('click', () => { draftProfile.cards.splice(Number(button.dataset.removeCard), 1); render(); }));
  on('reset-profile', 'click', () => { draftProfile = cloneProfile(); render(); });
  on('export-profile', 'click', () => { try { downloadJson(`prado-generator-${draftProfile.id}.json`, exportProfile(draftProfile)); } catch (error) { document.getElementById('profile-error').textContent = error.message; } });
  on('apply-profile-import', 'click', () => { try { draftProfile = importProfile(document.getElementById('profile-import-text').value); render(); } catch (error) { document.getElementById('profile-error').textContent = error.message; } });
  on('apply-properties', 'click', () => { try { validateProfile(draftProfile); const next = newSession(draft, draftProfile); profile = cloneProfile(draftProfile); session = next; draft = structuredClone(next.config); propertiesOpen = false; selected = 'start'; notice = `Generator profile ${profileHash(profile)} applied.`; save(); render(true); } catch (error) { document.getElementById('profile-error').textContent = error.message; } });
  on('trace', 'click', () => { traceOpen = true; traceStep = 0; render(); }); on('close-trace', 'click', () => { traceOpen = false; render(); }); on('trace-prev', 'click', () => { traceStep--; render(); }); on('trace-next', 'click', () => { traceStep++; render(); });
  on('mobile-config', 'click', () => { mobileConfig = !mobileConfig; inspectorOpen = false; render(); });
  on('close-sheet', 'click', () => { inspectorOpen = false; render(); });
  on('dismiss', 'click', () => { notice = ''; render(); });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { inspectorOpen = false; mobileConfig = false; importOpen = false; propertiesOpen = false; traceOpen = false; render(); } });
render(true);
save();
