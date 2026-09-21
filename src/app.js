import { RUNES, LEVELS, TYPE_NAMES, TYPES, MOD_NAMES, DEFAULT_CONFIG, BOSS_FROM_LEVEL, floorProfile } from './config.js';
import { generate, topology } from './generation.js';
import { newSession, dispatch, resetSession, importSession, visibility, accessibility, getNode, huntChance } from './model.js';
import { icon, nodeIcon } from './icons.js';
import { renderMap, landscape, escape } from './map.js';
import { DECKS, deckFor } from './decks.js';

const STORAGE = 'prado.waystone.v3', app = document.querySelector('#app');
let session, notice = '', selected, mobileConfig = false, inspectorOpen = false, diagnosticOpen = false, importOpen = false, bait = false;
try { const saved = localStorage.getItem(STORAGE); session = saved ? importSession(saved) : newSession(DEFAULT_CONFIG); }
catch (e) { session = newSession(DEFAULT_CONFIG); notice = `Gespeicherter Run konnte nicht geladen werden: ${e.message}`; }
let draft = structuredClone(session.config);
selected = session.state.currentNodeId;
const percent = n => `${n > 0 ? '+' : ''}${n} %`;
function save() { try { localStorage.setItem(STORAGE, JSON.stringify(session)); } catch { notice = 'Lokales Speichern ist nicht verfügbar. Sichere deinen Run per JSON-Export.'; } }
function act(action) {
  try { session = dispatch(session, action); notice = ''; save(); }
  catch (e) { notice = e.message; }
  render();
}
function effectsMarkup(g) {
  return Object.entries(g.effects).filter(([, v]) => v.percent).map(([k, v]) => `<div class="effect"><span>${escape(MOD_NAMES[k])}</span><strong class="${['hp', 'attack'].includes(k) || v.percent < 0 ? 'malus' : ''}">${percent(v.percent)} <small>×${v.multiplier.toFixed(2)}</small></strong></div>`).join('');
}
function configuration() {
  let preview, error = '';
  try { preview = generate(draft); } catch (e) { error = e.message; preview = session.graph; }
  const total = Object.values(preview.counts).reduce((a, b) => a + b, 0);
  const changed = JSON.stringify({ ...draft, runes: [...draft.runes].sort() }) !== JSON.stringify(session.config);
  const profile = floorProfile(draft);
  const deck = deckFor(draft.deck);
  return `<aside class="configuration ${mobileConfig ? 'mobile-open' : ''}" aria-label="Runen und Konfiguration">
    <div class="section-eyebrow">DEIN WEGSTEIN <span>01</span></div>
    <h2>Ein Ort.<br>Dein Abenteuer.</h2><p class="muted intro">Wähle ein Waystone-Deck und präge den Weg mit drei Runen.</p>
    <div class="section-label">WAYSTONE-DECK <span>QUELLDATEN</span></div>
    <div class="deck-picker">${Object.values(DECKS).map(d => `<button class="deck-option ${draft.deck === d.slug ? 'chosen' : ''}" data-deck="${d.slug}" aria-pressed="${draft.deck === d.slug}"><span>${icon(d.style === 'dungeon' ? 'gate' : 'trail', '', 22)}<b>${escape(d.name)}</b></span><small>${d.style === 'dungeon' ? 'Dungeon' : 'Wildnis'} · ${escape(d.location)}</small></button>`).join('')}</div>
    <div class="deck-reference"><strong>${escape(deck.name)}</strong><span>${escape(deck.zone)} · empfohlenes Decklevel ${deck.suggestedLevel}</span><p>${escape(deck.description)}</p><small>${deck.recipe.map(escape).join(' / ')}<br>${deck.composition.monster} Monster · ${deck.composition.event} Event · ${deck.composition.rest} Rest · ${deck.composition.wild} Wild</small><a href="${deck.sourceUrl}" target="_blank" rel="noreferrer">Offizielles Deck ansehen ↗</a></div>
    <div class="section-label">RUNEN WÄHLEN <span>${draft.runes.length} / 3</span></div>
    <div class="rune-grid">${RUNES.map(r => `<button class="rune ${draft.runes.includes(r.id) ? 'chosen' : ''}" data-rune="${r.id}" aria-pressed="${draft.runes.includes(r.id)}" title="${escape(r.flavor)}">${icon(r.icon, '', 28)}<span>${r.name}</span><i>${draft.runes.includes(r.id) ? '✓' : '+'}</i></button>`).join('')}</div>
    <div class="level-row"><label for="level">Abenteuerlevel</label><strong id="level-value">${draft.level} <span>/ 5</span></strong></div>
    <input id="level" type="range" min="1" max="5" value="${draft.level}" aria-label="Abenteuerlevel">
    <div class="range-caption"><span>Kurzer Ausflug</span><span>Lange Reise</span></div>
    <p class="path-length">${LEVELS[draft.level].depth} Begegnungen pro Abenteuer · ${profile.floors} ${profile.floors === 1 ? 'Ebene' : 'Ebenen'} · ${profile.depth} pro Ebene</p>
    <label class="field-label" for="seed">WELT-SEED</label><div class="seed-field"><input id="seed" maxlength="80" value="${escape(draft.seed)}" spellcheck="false"><button id="new-seed" title="Neuen Seed würfeln" aria-label="Neuer Seed">⟳</button></div>
    <label class="field-label" for="descent">ABENTEUERAUFBAU</label><select id="descent"><option value="true" ${draft.descent ? 'selected' : ''}>Mehrere Ebenen ab Level 3</option><option value="false" ${!draft.descent ? 'selected' : ''}>Eine lange Ebene</option></select>
    <p class="micro">Alle Wege treffen beim Ebenenboss zusammen. Endboss ab Level ${BOSS_FROM_LEVEL} auf der letzten Ebene.</p>
    ${error ? `<p class="form-error" role="alert">${escape(error)}</p>` : ''}
    <button id="generate" class="primary generate" ${error ? 'disabled' : ''}>${icon('waystone', '', 20)} ${changed ? 'Neu generieren' : 'Karte erzeugen'} <span>↗</span></button>
    <div class="config-stats"><div class="section-label">${changed ? 'VORSCHAU' : 'DEINE WELT'} <span>${total} ORTE</span></div>
      <div class="budget-bar">${TYPES.map(t => `<span class="budget-${t}" style="width:${preview.counts[t] / total * 100}%"></span>`).join('')}</div>
      <div class="budget-list">${TYPES.map(t => `<div><i class="dot budget-${t}"></i><span>${TYPE_NAMES[t]}</span><strong>${preview.counts[t]}</strong><small>${Math.round(preview.counts[t] / total * 100)} %</small></div>`).join('')}</div>
      <p class="micro">Gesamte erste Ebene inklusive Geheimorten und Boss; dein Weg enthält nur einen Teil.</p>
      <details class="effects"><summary>Runeneffekte <span>＋</span></summary>${effectsMarkup(preview)}<p class="micro">Prototypwerte. Mods addieren sich, Grenzen −75 bis +200 %. HP/Angriff nur simuliert; kein Kampfsystem.</p></details>
    </div>
    <div class="config-footer">${icon('compass', '', 18)} Jeder Weg ist auch ein Verzicht.</div>
  </aside>`;
}
function questsMarkup() {
  const { graph: g, state: s } = session;
  const qs = g.quests.filter(q => !q.compatible || ['revealed', 'rumor'].includes(visibility(g, s, q.target)));
  return `<div class="quest-section"><div class="section-label">FLÜSTERN IN DER FERNE <span>${qs.length}</span></div>${qs.length ? qs.map(q => {
    const status = s.questStates[q.id], missed = status === 'missed', target = getNode(g, q.target);
    return `<button class="quest-card ${missed ? 'missed' : ''}" ${q.compatible ? `data-node="${q.target}"` : 'disabled'}>${icon(q.id === 'gate' ? (target.secretKind === 'trail' ? 'trail' : 'gate') : q.id === 'hunt' ? 'hunt' : 'forage', '', 25)}<span><strong>${escape(q.title)}</strong><small>${status === 'complete' ? '✓ Auftrag erfüllt' : missed ? 'In diesem Run nicht mehr erreichbar' : status === 'incompatible' ? escape(q.reason) : escape(q.description)}</small></span><span class="quest-arrow">↗</span></button>`;
  }).join('') : '<p class="micro">Noch keine besonderen Orte bekannt. Erkunde die Karte oder aktiviere Gerüchte.</p>'}</div>`;
}
function inspector() {
  const { graph: g, state: s } = session, n = getNode(g, selected), visible = n && visibility(g, s, n.id) !== 'hidden';
  if (!visible) selected = s.currentNodeId;
  const node = getNode(g, selected), a = accessibility(g, s, node.id), rumor = visibility(g, s, node.id) === 'rumor';
  if (visibility(g, s, node.id) === 'unknown') return `<aside class="inspector ${inspectorOpen ? 'sheet-open' : ''}" aria-label="Knotendetails"><div class="inspector-top"><div class="section-eyebrow">UNBEKANNTER ORT</div><button class="sheet-close" id="close-sheet" aria-label="Details schließen">×</button></div><div class="place-art unknown">${landscape()}<div class="place-emblem">${icon('unknown', '', 44)}</div><span>DER WEG IST SICHTBAR</span></div><div class="place-body"><h2>Was hier wartet?</h2><p class="place-description">Du kennst den Pfad, aber noch nicht die Begegnung. Komm näher, um den Ort zu entdecken.</p><div class="next-hint">${a === 'missed' ? 'Auf deiner Route nicht mehr erreichbar.' : 'Die Pfadansicht verrät keine Namen, Typen oder Belohnungen.'}</div></div>${questsMarkup()}</aside>`;
  const reward = s.resolvedEncounters[node.id], encounter = a === 'current' && s.status === 'encounter';
  const secret = g.deck.secret, lockCost = node.lockCost ?? secret.lockCost;
  const type = node.special === 'boss' ? 'ENDBOSS' : node.special === 'miniboss' ? 'MINIBOSS' : node.special === 'descent' ? 'NÄCHSTE EBENE' : node.kind === 'start' ? 'DER ANFANG' : node.kind === 'end' ? 'ABSCHLUSS' : TYPE_NAMES[node.type].toUpperCase();
  const descriptions = { start: 'Ein warmer Stein in deiner Hand. Drei Runen leuchten auf. Hinter dem Nebel warten Wege, die nur du wählen kannst.', M: 'Etwas bewegt sich zwischen den Bäumen. Stell dich der Begegnung und sammle deine Beute.', F: 'Im Schatten alter Bäume wächst, was du auf deiner Reise brauchen wirst.', H: 'Frische Spuren führen tiefer in die Wildnis. Vielleicht wartet hier eine seltene Begegnung.', E: 'An diesem Ort hat die Zeit eine Geschichte zurückgelassen. Finde heraus, was sie dir erzählt.', end: 'Du hast deinen Horizont erreicht. Nicht jeder Weg wurde gegangen – und genau das macht diese Reise zu deiner.' };
  const specialDescriptions = { boss: 'Alle Wege führen hierher. Tief unter den Wurzeln wartet der wahre Herr dieses Abenteuers. Besiege ihn, um deine Reise abzuschließen.', miniboss: 'Der Wächter versperrt den Ausgang dieser Ebene. Jeder reguläre und geheime Weg führt zu dieser Begegnung.', gate: 'Hinter dem entdeckten Tor liegt ein geheimer Seitenarm. Zwei Fragmente öffnen ihn. Der reguläre Weg führt ebenfalls zum Ebenenboss.', treasure: 'Ein verborgener Vorrat belohnt deine Entdeckung mit 25 zusätzlicher Beute. Von hier führt der Weg weiter zum selben Ebenenboss.', descent: 'Der Wächter ist besiegt. Dieses Tor führt tiefer hinab. Deine Energie und dein Reisebeutel begleiten dich auf die nächste Ebene.' };
  const statuses = { current: 'Du bist hier', next: 'Direkt erreichbar', future: 'Liegt noch vor dir', missed: 'Auf dieser Route nicht mehr erreichbar', locked: `Gesperrt · ${lockCost} ${secret.resourceLabel} nötig`, visited: 'Bereits besucht', undiscovered: 'Debug · noch nicht entdeckt' };
  return `<aside class="inspector ${inspectorOpen ? 'sheet-open' : ''}" aria-label="Knotendetails">
    <div class="inspector-top"><div class="section-eyebrow">WEGGEFÄHRTE <span>03</span></div><button class="sheet-close" id="close-sheet" aria-label="Details schließen">×</button></div>
    <div class="place-art ${node.special || node.kind}">${landscape()}<div class="place-emblem">${icon(nodeIcon(node), '', 44)}</div><span>${rumor ? '✧ GERÜCHT' : type}</span></div>
    <div class="place-body"><span class="location-tag ${a}"><i></i>${statuses[a]}</span><h2>${escape(node.name)}</h2>
    <p class="place-description">${rumor ? 'Reisende erzählen von diesem Ort. Seine Begegnung ist noch unbekannt. Du kannst ihn nur über verbundene Orte erreichen.' : escape(node.description || specialDescriptions[node.special] || descriptions[node.kind] || descriptions[node.type])}</p>
    ${node.special === 'gate' && lockCost ? `<div class="requirement">${icon('fragment')} <span>${escape(node.name)}<strong>${s.inventory.fragments} / ${lockCost} ${escape(secret.resourceLabel)} ${reward ? '· geöffnet' : ''}</strong></span></div>` : ''}
    ${!rumor && node.special === 'fragment' ? `<p class="micro">Garantierter Fund: 1 ${escape(secret.resourceLabel)}. Alle Teile liegen vor dem Tor auf dieser Route.</p>` : ''}
    ${encounter && node.type === 'H' ? `<label class="bait-control"><input type="checkbox" id="bait" ${bait ? 'checked' : ''} ${s.inventory.bait === 0 ? 'disabled' : ''}><span>Köder einsetzen <small>${s.inventory.bait} verfügbar · seltene Chance ${(huntChance(g, bait) * 100).toFixed(1)} %</small></span></label>` : ''}
    ${encounter ? `<div class="encounter-note">Vereinfachte Begegnung · Erfolg simuliert${node.type === 'M' ? `<br>Monster-HP ×${g.effects.hp.multiplier.toFixed(2)} · Angriff ×${g.effects.attack.multiplier.toFixed(2)}` : ''}</div><button id="resolve" class="primary">Begegnung abschließen ${icon('chevron', '', 18)}</button>` : a === 'next' ? `<button id="enter" class="primary" ${s.status !== 'exploring' || (s.energy < 1 && !s.view.infinite && node.kind !== 'end') ? 'disabled' : ''}>Ort betreten <span>${node.kind === 'end' ? 'Ziel' : `${icon('energy', '', 16)} 1`}</span></button>${s.status === 'encounter' ? '<button id="return-encounter" class="text-button">Aktuelle Begegnung abschließen →</button>' : ''}` : a === 'current' && s.status !== 'finished' ? '<div class="next-hint">Wähle einen markierten Ort auf der Karte.<br>Inspizieren ist kostenlos.</div>' : ''}
    ${reward ? `<div class="reward"><strong>✓ Begegnung abgeschlossen</strong><span>+${reward.loot} Beute${reward.herbs ? ` · +${reward.herbs} Kräuter` : ''}${reward.fragment ? ` · +1 ${escape(secret.resourceLabel)}` : ''}${reward.unique ? ' · seltener Fund!' : ''}${reward.bait ? ' · 1 Köder verbraucht' : ''}</span></div>` : ''}
    ${a === 'locked' ? `<p class="micro">Nimm den freien Weg daneben, wenn dir ${escape(secret.resourceLabel.toLowerCase())} fehlen.</p>` : ''}
    ${a === 'current' && s.status === 'floor-cleared' ? `<button id="descend-inspector" class="primary">${icon('gate', '', 20)} Weiter zu Ebene ${g.config.floor + 1} ↓</button>` : ''}
    ${reward && node.discovers ? `<div class="discovery-note">${icon(g.deck.style === 'dungeon' ? 'gate' : 'trail', '', 20)} ${node.discovers === 'entrance' ? `${escape(secret.discoveryName)} enthüllt ${escape(secret.entranceName)}.` : `Der geheime Weg zu ${escape(secret.vaultName)} ist entdeckt.`}</div>` : ''}
    </div>${questsMarkup()}
    <div class="satchel"><div class="section-label">IM REISEBEUTEL</div><div class="inventory"><span>${icon(g.deck.style === 'dungeon' ? 'fragment' : 'trail')}<b>${secret.lockCost ? s.inventory.fragments : s.discoveredSecrets.length}</b><small>${secret.lockCost ? escape(secret.resourceLabel) : 'Entdeckungen'}</small></span><span>${icon('trail')}<b>${s.inventory.bait}</b><small>Köder</small></span><span>${icon('forage')}<b>${s.inventory.herbs}</b><small>Kräuter</small></span><span>${icon('event')}<b>${s.inventory.loot}</b><small>Beute</small></span></div></div>
  </aside>`;
}
function controls() {
  const v = session.state.view;
  return `<details class="lab-controls" ${diagnosticOpen ? 'open' : ''}><summary>${icon('compass', '', 20)} Labor & Sichtweite <span>⌄</span></summary><div class="lab-content"><div class="control-grid">
    <label>Nebelprofil<select id="fog"><option value="off" ${v.fog === 'off' ? 'selected' : ''}>Aus · Karte lernen</option><option value="local" ${v.fog === 'local' ? 'selected' : ''}>Lokaler Nebel</option><option value="rumors" ${v.fog === 'rumors' ? 'selected' : ''}>Lokal + Gerüchte</option></select></label>
    <label>Vorschau<select id="preview">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${v.preview === n ? 'selected' : ''}>${n ? `${n} Kanten` : `Levelstandard (${LEVELS[session.graph.config.level].preview})`}</option>`).join('')}</select></label>
    <label>Gerüchte<select id="rumors">${[0, 1, 2, 3].map(n => `<option ${v.rumorCount === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="checkbox-label paths-setting"><input id="paths" type="checkbox" ${v.paths ? 'checked' : ''}> Alle regulären Pfade zeigen · Inhalte bleiben verborgen</label>
    <label class="checkbox-label"><input id="debug" type="checkbox" ${v.debug ? 'checked' : ''}> Debug: alles aufdecken</label><label class="checkbox-label"><input id="infinite" type="checkbox" ${v.infinite ? 'checked' : ''}> Unendliche Testenergie</label>
    </div><p class="micro">Die Pfadoption zeigt nur die Struktur. Sichtweite und Gerüchte bestimmen weiter, was du über die Orte weißt. Geheimwege bleiben bis zu ihrer Entdeckung verborgen – auch bei „Nebel aus“. Debug zeigt sie zu Testzwecken, schaltet sie aber nicht frei. Gelerntes bleibt bekannt; Reset leert das Wissen.</p>
    <div class="lab-buttons"><button id="energy">+20 Testenergie</button><button id="reset">Run zurücksetzen</button><button id="export">JSON exportieren</button><button id="import">JSON importieren</button></div>
    ${v.debug ? debugPanel() : ''}</div></details>`;
}
function debugPanel() {
  const g = session.graph;
  return `<div class="diagnostics"><h3>Generator-Diagnose</h3><p class="micro">Version ${g.generatorVersion} · Ebene ${g.config.floor}/${floorProfile(g.config).floors} · ${g.nodes.length} Knoten · ${g.edges.length} Kanten · Invarianten geprüft</p><table><thead><tr><th>Route</th>${TYPES.map(t => `<th>${TYPE_NAMES[t]}</th>`).join('')}</tr></thead><tbody>${[...g.routes, { id: null, name: 'Einstieg & Boss' }].map(r => `<tr><td>${r.name}</td>${TYPES.map(t => `<td>${g.nodes.filter(n => n.routeId === r.id && n.type === t).length}</td>`).join('')}</tr>`).join('')}</tbody></table><h4>Levelvergleich · erster Ebenenplan</h4><div class="level-comparison">${[1, 2, 3, 4, 5].map(level => { const config = { ...g.config, level, floor: 1 }; const t = topology(config), p = floorProfile(config); return `<span><b>L${level}</b>${p.floors} ${p.floors === 1 ? 'Ebene' : 'Ebenen'}<small>${p.depth} / Ebene</small></span>`; }).join('')}</div></div>`;
}
function summaryMarkup() {
  const { graph: g, state: s } = session;
  if (!['finished', 'floor-cleared'].includes(s.status)) return '';
  const floors = [...session.completedFloors, { graph: g, state: s }];
  const seen = floors.flatMap(f => f.graph.nodes.filter(n => f.state.visitedNodeIds.includes(n.id)));
  const missed = floors.flatMap(f => f.graph.nodes.filter(n => ['revealed', 'rumor'].includes(visibility(f.graph, f.state, n.id)) && accessibility(f.graph, f.state, n.id) === 'missed' && n.special).map(n => `Ebene ${f.graph.config.floor}: ${n.name}`));
  const descending = s.status === 'floor-cleared';
  return `<section class="run-summary"><div>${icon(descending ? 'gate' : 'end', '', 40)}</div><span class="section-eyebrow">${descending ? `EBENE ${g.config.floor} GESCHAFFT` : 'DEIN ABENTEUER IST GESCHAFFT'}</span><h2>${descending ? 'Die Tiefe ruft.' : 'Ein Weg. Deine Geschichte.'}</h2><p>${seen.filter(n => n.type).length} Begegnungen · ${floors.length} ${floors.length === 1 ? 'Ebene' : 'Ebenen'} · ${s.inventory.loot} Beute</p><div class="summary-types">${TYPES.map(t => `<span>${seen.filter(n => n.type === t).length} ${TYPE_NAMES[t]}</span>`).join('')}</div><p class="micro">${floors.map(f => `Ebene ${f.graph.config.floor}: ${f.graph.routes.find(r => f.state.visitedNodeIds.includes(`${r.id}-2-0`))?.name || ''}`).join('<br>')}<br>Bekannte ausgelassene Ziele: ${missed.length ? missed.map(escape).join(', ') : 'keine'}<br>Seed: ${escape(g.config.seed)} · ${g.config.runes.map(id => RUNES.find(r => r.id === id).name).join(' / ')}</p><details class="effects"><summary>Runeneffekte dieser Reise</summary>${effectsMarkup(g)}</details>${descending ? `<p class="micro">Inventar und verbleibende Energie reisen mit dir.</p><button id="descend" class="primary">Tor betreten · Ebene ${g.config.floor + 1} ↓</button>` : '<button id="replay" class="primary">Gleiche Welt, anderer Weg ↗</button>'}</section>`;
}
function render(scrollToPlayer = false) {
  const priorScroll = document.querySelector('.map-scroll'), top = priorScroll?.scrollTop, left = priorScroll?.scrollLeft;
  const { graph: g, state: s } = session, progress = Object.keys(s.resolvedEncounters).length, profile = floorProfile(g.config);
  app.innerHTML = `<header class="topbar"><a class="brand" href="./">${icon('waystone', '', 36)}<span>prado<small>WALK INTO YOUR NEXT STORY</small></span></a><div class="lab-title">WAYSTONE <span>MAP LAB</span><b>PROTOTYP</b></div><div class="header-status"><i></i> Lokal gespeichert <span class="header-separator">/</span><button id="mobile-config">${icon('waystone', '', 18)} Runen</button></div></header>
    <main class="workspace">${configuration()}<section class="map-column theme-${g.deck.style}" aria-label="Kartenlabor"><div class="map-heading"><div><div class="section-eyebrow">${g.deck.style === 'dungeon' ? 'UNTER DER ALTSTADT' : 'DRAUSSEN IN MEADOWSHIRE'} <span>02</span></div><h1>${escape(g.deck.name)}</h1><p>${escape(g.deck.style === 'dungeon' ? 'Enge Korridore, Schlüssel und eine verborgene Vault.' : 'Weite Pfade, mehr Verzweigungen und Entdeckungen in der Wildnis.')}</p></div><div class="energy-pill">${icon('energy', '', 20)}<strong>${s.view.infinite ? '∞' : s.energy}</strong><span>Energie</span><button id="quick-energy" aria-label="20 Testenergie hinzufügen">+</button></div></div>
    <div class="map-toolbar"><span>${icon(g.deck.style === 'dungeon' ? 'gate' : 'trail', '', 18)} ${escape(g.deck.location)} <i>·</i> Level ${g.config.level} <i>·</i> <span class="seed-label">${escape(g.config.seed)}</span></span><button id="to-player">◎ Zur Spielfigur</button></div>
    <div class="floor-strip"><span>${icon('gate', '', 17)} Ebene ${g.config.floor} / ${profile.floors}</span><span>${profile.finalBoss ? 'Endboss am Ende dieser Ebene' : 'Miniboss am Ende dieser Ebene'}</span></div>
    ${s.view.debug ? '<div class="debug-banner">DEBUG · Vollständig aufgedeckt · kein zusätzliches Wissen gespeichert</div>' : ''}
    <div class="map-scroll" tabindex="0" aria-label="Karte scrollen">${renderMap(g, s, selected)}</div>
    <div class="map-legend"><span><i class="legend-current"></i>Du</span><span><i class="legend-next"></i>Nächster Ort</span><span><i class="legend-rumor"></i>Gerücht</span><span class="map-progress">${progress} / ${profile.depth} auf dieser Ebene</span></div>
    <div class="journey-progress"><span style="width:${progress / profile.depth * 100}%"></span></div>
    ${summaryMarkup()}${controls()}<p class="prototype-note">Gespeicherte Energie, freie Zeiteinteilung. Kein GPS. Alle Werte sind Testdaten.</p>
    </section>${inspector()}</main><footer class="page-footer"><span>PRADO / WAYSTONE EXPLORATIONS</span><span>Deckinhalte nach den offiziellen Waystone-Seiten · Rollen im Prototyp simuliert</span><span>LAB v3.0</span></footer>
    ${notice ? `<div class="toast" role="status">${escape(notice)}<button id="dismiss" aria-label="Hinweis schließen">×</button></div>` : ''}
    ${importOpen ? '<div class="dialog-backdrop"><section class="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title"><h2 id="import-title">Reise importieren</h2><p>Wähle einen JSON-Export oder füge ihn hier ein. Der aktuelle Run wird erst nach erfolgreicher Prüfung ersetzt.</p><input id="import-file" type="file" accept=".json,application/json"><textarea id="import-text" rows="8" aria-label="JSON-Speicherstand" placeholder="JSON-Speicherstand …"></textarea><p id="import-error" role="alert"></p><div class="lab-buttons"><button id="cancel-import">Abbrechen</button><button class="primary" id="apply-import">Importieren</button></div></section></div>' : ''}`;
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
  if (session.state.visitedNodeIds.length > 1 && !confirm('Neue Karte erzeugen? Dein aktueller Test-Run geht verloren. Exportiere ihn bei Bedarf vorher.')) return;
  try { session = newSession(draft); draft = structuredClone(session.config); selected = 'start'; bait = false; notice = ''; mobileConfig = false; save(); render(true); } catch (e) { notice = e.message; render(); }
}
function reset() {
  session = resetSession(session); selected = 'start'; bait = false; notice = 'Gleiche Karte, frischer Run. Die Begegnungsergebnisse bleiben reproduzierbar.'; save(); render(true);
}
function inspect(id) {
  if (visibility(session.graph, session.state, id) === 'hidden') return;
  selected = id; bait = false; inspectorOpen = true; render();
  if (matchMedia('(max-width: 900px)').matches) document.getElementById('close-sheet')?.focus({ preventScroll: true });
  else document.getElementById(`node-${id}`)?.focus({ preventScroll: true });
}
function applyImport(text) {
  try { const next = importSession(text); session = next; draft = structuredClone(next.config); selected = next.state.currentNodeId; importOpen = false; notice = 'Reise erfolgreich wiederhergestellt.'; save(); render(true); }
  catch (e) { document.getElementById('import-error').textContent = e.message; }
}
function bind() {
  document.querySelectorAll('[data-deck]').forEach(b => b.addEventListener('click', () => { draft.deck = b.dataset.deck; render(); }));
  document.querySelectorAll('[data-rune]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.rune;
    if (draft.runes.includes(id)) draft.runes = draft.runes.filter(r => r !== id);
    else if (draft.runes.length < 3) draft.runes.push(id);
    else { notice = 'Wähle zuerst eine Rune ab, um sie auszutauschen.'; }
    render();
  }));
  document.querySelectorAll('[data-node]').forEach(n => { n.addEventListener('click', () => inspect(n.dataset.node)); if (n.tagName.toLowerCase() === 'g') n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inspect(n.dataset.node); } }); });
  on('level', 'change', e => { draft.level = Number(e.target.value); render(); });
  on('seed', 'input', e => { draft.seed = e.target.value; });
  on('descent', 'change', e => { draft.descent = e.target.value === 'true'; render(); });
  on('new-seed', 'click', () => { const bytes = new Uint32Array(1); crypto.getRandomValues(bytes); draft.seed = `PRADO-${bytes[0].toString(36).toUpperCase()}`; render(); });
  on('generate', 'click', regenerate);
  on('enter', 'click', () => { const id = selected; act({ type: 'enter', id }); if (session.state.currentNodeId === id) { bait = false; focusPlayer(); } });
  on('resolve', 'click', () => { act({ type: 'resolve', bait }); bait = false; });
  on('bait', 'change', e => { bait = e.target.checked; render(); });
  on('to-player', 'click', () => { selected = session.state.currentNodeId; render(true); });
  on('return-encounter', 'click', () => inspect(session.state.currentNodeId));
  on('energy', 'click', () => act({ type: 'energy' })); on('quick-energy', 'click', () => act({ type: 'energy' }));
  on('reset', 'click', reset); on('replay', 'click', reset);
  for (const id of ['descend', 'descend-inspector']) on(id, 'click', () => { selected = 'start'; bait = false; inspectorOpen = false; act({ type: 'descend' }); render(true); });
  for (const [id, key] of [['fog', 'fog'], ['paths', 'paths'], ['preview', 'preview'], ['rumors', 'rumorCount'], ['debug', 'debug'], ['infinite', 'infinite']]) on(id, 'change', e => { const value = e.target.type === 'checkbox' ? e.target.checked : ['preview', 'rumorCount'].includes(key) ? Number(e.target.value) : e.target.value; act({ type: 'view', view: { ...session.state.view, [key]: value } }); });
  document.querySelector('.lab-controls')?.addEventListener('toggle', e => { diagnosticOpen = e.target.open; });
  on('export', 'click', () => { const url = URL.createObjectURL(new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `prado-${session.graph.config.seed.replace(/[^a-z0-9-]/gi, '_')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  on('import', 'click', () => { importOpen = true; render(); document.getElementById('import-text').focus(); });
  on('cancel-import', 'click', () => { importOpen = false; render(); });
  on('apply-import', 'click', () => applyImport(document.getElementById('import-text').value));
  on('import-file', 'change', async e => { const f = e.target.files[0]; if (f?.size > 5_000_000) document.getElementById('import-error').textContent = 'Datei ist zu groß (maximal 5 MB).'; else if (f) document.getElementById('import-text').value = await f.text(); });
  on('mobile-config', 'click', () => { mobileConfig = !mobileConfig; inspectorOpen = false; render(); });
  on('close-sheet', 'click', () => { inspectorOpen = false; render(); });
  on('dismiss', 'click', () => { notice = ''; render(); });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { inspectorOpen = false; mobileConfig = false; importOpen = false; render(); } });
render(true);
save();
