import { RUNES, LEVELS, TYPE_NAMES, TYPES, MOD_NAMES, DEFAULT_CONFIG } from './config.js';
import { generate, topology } from './generation.js';
import { newSession, dispatch, resetSession, importSession, visibility, accessibility, getNode, huntChance } from './model.js';
import { icon, nodeIcon } from './icons.js';
import { renderMap, landscape, escape } from './map.js';

const STORAGE = 'prado.waystone.v1', app = document.querySelector('#app');
let session, notice = '', selected, mobileConfig = false, inspectorOpen = false, diagnosticOpen = false, importOpen = false, bait = false;
try { const saved = localStorage.getItem(STORAGE); session = saved ? importSession(saved) : newSession(DEFAULT_CONFIG); }
catch (e) { session = newSession(DEFAULT_CONFIG); notice = `Gespeicherter Run konnte nicht geladen werden: ${e.message}`; }
let draft = structuredClone(session.graph.config);
selected = session.state.currentNodeId;
const percent = n => `${n > 0 ? '+' : ''}${n} %`;
function save() { try { localStorage.setItem(STORAGE, JSON.stringify(session)); } catch { notice = 'Lokales Speichern ist nicht verfügbar. Sichere deinen Run per JSON-Export.'; } }
function act(action) {
  try { session = dispatch(session, action); save(); notice = ''; }
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
  const changed = JSON.stringify({ ...draft, runes: [...draft.runes].sort() }) !== JSON.stringify(session.graph.config);
  return `<aside class="configuration ${mobileConfig ? 'mobile-open' : ''}" aria-label="Runen und Konfiguration">
    <div class="section-eyebrow">DEIN WEGSTEIN <span>01</span></div>
    <h2>Drei Runen.<br>Dein Abenteuer.</h2><p class="muted intro">Präge die Welt, die vor dir liegt.</p>
    <div class="section-label">RUNEN WÄHLEN <span>${draft.runes.length} / 3</span></div>
    <div class="rune-grid">${RUNES.map(r => `<button class="rune ${draft.runes.includes(r.id) ? 'chosen' : ''}" data-rune="${r.id}" aria-pressed="${draft.runes.includes(r.id)}" title="${escape(r.flavor)}">${icon(r.icon, '', 28)}<span>${r.name}</span><i>${draft.runes.includes(r.id) ? '✓' : '+'}</i></button>`).join('')}</div>
    <div class="level-row"><label for="level">Abenteuerlevel</label><strong id="level-value">${draft.level} <span>/ 5</span></strong></div>
    <input id="level" type="range" min="1" max="5" value="${draft.level}" aria-label="Abenteuerlevel">
    <div class="range-caption"><span>Kurzer Ausflug</span><span>Lange Reise</span></div>
    <p class="path-length">${LEVELS[draft.level].depth} Begegnungen pro Weg · ${LEVELS[draft.level].routes} Hauptwege</p>
    <label class="field-label" for="seed">WELT-SEED</label><div class="seed-field"><input id="seed" maxlength="80" value="${escape(draft.seed)}" spellcheck="false"><button id="new-seed" title="Neuen Seed würfeln" aria-label="Neuer Seed">⟳</button></div>
    <label class="field-label" for="separation">ROUTENTRENNUNG</label><select id="separation"><option value="strong" ${draft.separation === 'strong' ? 'selected' : ''}>Getrennte Horizonte</option><option value="final" ${draft.separation === 'final' ? 'selected' : ''}>Gemeinsame Endstation</option></select>
    ${error ? `<p class="form-error" role="alert">${escape(error)}</p>` : ''}
    <button id="generate" class="primary generate" ${error ? 'disabled' : ''}>${icon('waystone', '', 20)} ${changed ? 'Neu generieren' : 'Karte erzeugen'} <span>↗</span></button>
    <div class="config-stats"><div class="section-label">${changed ? 'VORSCHAU' : 'DEINE WELT'} <span>${total} ORTE</span></div>
      <div class="budget-bar">${TYPES.map(t => `<span class="budget-${t}" style="width:${preview.counts[t] / total * 100}%"></span>`).join('')}</div>
      <div class="budget-list">${TYPES.map(t => `<div><i class="dot budget-${t}"></i><span>${TYPE_NAMES[t]}</span><strong>${preview.counts[t]}</strong><small>${Math.round(preview.counts[t] / total * 100)} %</small></div>`).join('')}</div>
      <p class="micro">Gesamte Karte; dein Weg enthält nur einen Teil.</p>
      <details class="effects"><summary>Runeneffekte <span>＋</span></summary>${effectsMarkup(preview)}<p class="micro">Prototypwerte. Mods addieren sich, Grenzen −75 bis +200 %. HP/Angriff nur simuliert; kein Kampfsystem.</p></details>
    </div>
    <div class="config-footer">${icon('compass', '', 18)} Jeder Weg ist auch ein Verzicht.</div>
  </aside>`;
}
function questsMarkup() {
  const { graph: g, state: s } = session;
  const qs = g.quests.filter(q => !q.compatible || visibility(g, s, q.target) !== 'hidden');
  return `<div class="quest-section"><div class="section-label">FLÜSTERN IN DER FERNE <span>${qs.length}</span></div>${qs.length ? qs.map(q => {
    const status = s.questStates[q.id], missed = status === 'missed', target = getNode(g, q.target);
    return `<button class="quest-card ${missed ? 'missed' : ''}" ${q.compatible ? `data-node="${q.target}"` : 'disabled'}>${icon(q.id === 'gate' ? 'gate' : q.id === 'hunt' ? 'hunt' : 'forage', '', 25)}<span><strong>${escape(q.title)}</strong><small>${status === 'complete' ? '✓ Auftrag erfüllt' : missed ? 'In diesem Run nicht mehr erreichbar' : status === 'incompatible' ? escape(q.reason) : `${target.special === 'gate' ? 'Zwei Fragmente öffnen das Tor' : q.id === 'hunt' ? 'Ein seltener Gast im Jagdrevier' : 'Silberblatt wartet auf dich'}`}</small></span><span class="quest-arrow">↗</span></button>`;
  }).join('') : '<p class="micro">Noch keine besonderen Orte bekannt. Erkunde die Karte oder aktiviere Gerüchte.</p>'}</div>`;
}
function inspector() {
  const { graph: g, state: s } = session, n = getNode(g, selected), visible = n && visibility(g, s, n.id) !== 'hidden';
  if (!visible) selected = s.currentNodeId;
  const node = getNode(g, selected), a = accessibility(g, s, node.id), rumor = visibility(g, s, node.id) === 'rumor';
  const reward = s.resolvedEncounters[node.id], encounter = a === 'current' && s.status === 'encounter';
  const type = node.kind === 'start' ? 'DER ANFANG' : node.kind === 'end' ? 'ABSCHLUSS' : TYPE_NAMES[node.type].toUpperCase();
  const descriptions = { start: 'Ein warmer Stein in deiner Hand. Drei Runen leuchten auf. Hinter dem Nebel warten Wege, die nur du wählen kannst.', M: 'Etwas bewegt sich zwischen den Bäumen. Stell dich der Begegnung und sammle deine Beute.', F: 'Im Schatten alter Bäume wächst, was du auf deiner Reise brauchen wirst.', H: 'Frische Spuren führen tiefer in die Wildnis. Vielleicht wartet hier eine seltene Begegnung.', E: 'An diesem Ort hat die Zeit eine Geschichte zurückgelassen. Finde heraus, was sie dir erzählt.', end: 'Du hast deinen Horizont erreicht. Nicht jeder Weg wurde gegangen – und genau das macht diese Reise zu deiner.' };
  const statuses = { current: 'Du bist hier', next: 'Direkt erreichbar', future: 'Liegt noch vor dir', missed: 'Auf dieser Route nicht mehr erreichbar', locked: 'Gesperrt · 2 Fragmente nötig', visited: 'Bereits besucht' };
  return `<aside class="inspector ${inspectorOpen ? 'sheet-open' : ''}" aria-label="Knotendetails">
    <div class="inspector-top"><div class="section-eyebrow">WEGGEFÄHRTE <span>03</span></div><button class="sheet-close" id="close-sheet" aria-label="Details schließen">×</button></div>
    <div class="place-art ${node.special || node.kind}">${landscape()}<div class="place-emblem">${icon(nodeIcon(node), '', 44)}</div><span>${rumor ? '✧ GERÜCHT' : type}</span></div>
    <div class="place-body"><span class="location-tag ${a}"><i></i>${statuses[a]}</span><h2>${escape(node.name)}</h2>
    <p class="place-description">${rumor ? 'Reisende erzählen von diesem Ort. Sein genauer Weg liegt noch im Nebel. Du kannst ihn nur über verbundene Orte erreichen.' : escape(descriptions[node.kind] || descriptions[node.type])}</p>
    ${node.special === 'gate' ? `<div class="requirement">${icon('fragment')} <span>Fragmenttor<strong>${s.inventory.fragments} / 2 Fragmente ${reward ? '· geöffnet' : ''}</strong></span></div>` : ''}
    ${!rumor && node.special === 'fragment' ? '<p class="micro">Garantierter Fund: 1 Runenfragment. Beide Teile liegen vor dem Tor auf dieser Route.</p>' : ''}
    ${encounter && node.type === 'H' ? `<label class="bait-control"><input type="checkbox" id="bait" ${bait ? 'checked' : ''} ${s.inventory.bait === 0 ? 'disabled' : ''}><span>Köder einsetzen <small>${s.inventory.bait} verfügbar · Silberhirsch-Chance ${(huntChance(g, bait) * 100).toFixed(1)} %</small></span></label>` : ''}
    ${encounter ? `<div class="encounter-note">Vereinfachte Begegnung · Erfolg simuliert${node.type === 'M' ? `<br>Monster-HP ×${g.effects.hp.multiplier.toFixed(2)} · Angriff ×${g.effects.attack.multiplier.toFixed(2)}` : ''}</div><button id="resolve" class="primary">Begegnung abschließen ${icon('chevron', '', 18)}</button>` : a === 'next' ? `<button id="enter" class="primary" ${s.status !== 'exploring' || (s.energy < 1 && !s.view.infinite && node.kind !== 'end') ? 'disabled' : ''}>Ort betreten <span>${node.kind === 'end' ? 'Ziel' : `${icon('energy', '', 16)} 1`}</span></button>${s.status === 'encounter' ? '<button id="return-encounter" class="text-button">Aktuelle Begegnung abschließen →</button>' : ''}` : a === 'current' && s.status !== 'finished' ? '<div class="next-hint">Wähle einen markierten Ort auf der Karte.<br>Inspizieren ist kostenlos.</div>' : ''}
    ${reward ? `<div class="reward"><strong>✓ Begegnung abgeschlossen</strong><span>+${reward.loot} Beute${reward.herbs ? ` · +${reward.herbs} Kräuter` : ''}${reward.fragment ? ' · +1 Fragment' : ''}${reward.unique ? ' · Silberhirsch entdeckt!' : ''}${reward.bait ? ' · 1 Köder verbraucht' : ''}</span></div>` : ''}
    ${a === 'locked' ? '<p class="micro">Nimm den freien Weg daneben, wenn dir Fragmente fehlen.</p>' : ''}
    </div>${questsMarkup()}
    <div class="satchel"><div class="section-label">IM REISEBEUTEL</div><div class="inventory"><span>${icon('fragment')}<b>${s.inventory.fragments}</b><small>Fragmente</small></span><span>${icon('trail')}<b>${s.inventory.bait}</b><small>Köder</small></span><span>${icon('forage')}<b>${s.inventory.herbs}</b><small>Kräuter</small></span><span>${icon('event')}<b>${s.inventory.loot}</b><small>Beute</small></span></div></div>
  </aside>`;
}
function controls() {
  const v = session.state.view;
  return `<details class="lab-controls" ${diagnosticOpen ? 'open' : ''}><summary>${icon('compass', '', 20)} Labor & Sichtweite <span>⌄</span></summary><div class="lab-content"><div class="control-grid">
    <label>Nebelprofil<select id="fog"><option value="off" ${v.fog === 'off' ? 'selected' : ''}>Aus · Karte lernen</option><option value="local" ${v.fog === 'local' ? 'selected' : ''}>Lokaler Nebel</option><option value="rumors" ${v.fog === 'rumors' ? 'selected' : ''}>Lokal + Gerüchte</option></select></label>
    <label>Vorschau<select id="preview">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${v.preview === n ? 'selected' : ''}>${n ? `${n} Kanten` : `Levelstandard (${LEVELS[session.graph.config.level].preview})`}</option>`).join('')}</select></label>
    <label>Gerüchte<select id="rumors">${[0, 1, 2, 3].map(n => `<option ${v.rumorCount === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="checkbox-label"><input id="debug" type="checkbox" ${v.debug ? 'checked' : ''}> Debug: alles aufdecken</label><label class="checkbox-label"><input id="infinite" type="checkbox" ${v.infinite ? 'checked' : ''}> Unendliche Testenergie</label>
    </div><p class="micro">Sichtregler verändern keine Orte. Gelerntes bleibt bekannt; „Run zurücksetzen“ leert das Wissen. Debug-Aufdecken speichert kein zusätzliches Wissen.</p>
    <div class="lab-buttons"><button id="energy">+20 Testenergie</button><button id="reset">Run zurücksetzen</button><button id="export">JSON exportieren</button><button id="import">JSON importieren</button></div>
    ${v.debug ? debugPanel() : ''}</div></details>`;
}
function debugPanel() {
  const g = session.graph;
  return `<div class="diagnostics"><h3>Generator-Diagnose</h3><p class="micro">Version ${g.generatorVersion} · ${g.nodes.length} Knoten · ${g.edges.length} Kanten · Invarianten geprüft</p><table><thead><tr><th>Route</th>${TYPES.map(t => `<th>${TYPE_NAMES[t]}</th>`).join('')}</tr></thead><tbody>${[...g.routes, { id: null, name: 'Gemeinsamer Einstieg' }].map(r => `<tr><td>${r.name}</td>${TYPES.map(t => `<td>${g.nodes.filter(n => n.routeId === r.id && n.type === t).length}</td>`).join('')}</tr>`).join('')}</tbody></table><h4>Levelvergleich · gleicher Seed</h4><div class="level-comparison">${[1, 2, 3, 4, 5].map(level => { const t = topology({ ...g.config, level }); return `<span><b>L${level}</b>${LEVELS[level].depth} / Weg<small>${t.nodes.filter(n => n.kind === 'encounter').length} Orte</small></span>`; }).join('')}</div></div>`;
}
function summaryMarkup() {
  const { graph: g, state: s } = session;
  if (s.status !== 'finished') return '';
  const seen = g.nodes.filter(n => s.visitedNodeIds.includes(n.id)), missed = g.nodes.filter(n => visibility(g, s, n.id) !== 'hidden' && accessibility(g, s, n.id) === 'missed' && n.special);
  return `<section class="run-summary"><div>${icon('end', '', 40)}</div><span class="section-eyebrow">DEIN ABENTEUER IST GESCHAFFT</span><h2>Ein Weg. Deine Geschichte.</h2><p>${g.routes.find(r => r.id === seen.find(n => n.routeId)?.routeId)?.name} · ${seen.filter(n => n.type).length} Begegnungen · ${s.inventory.loot} Beute</p><div class="summary-types">${TYPES.map(t => `<span>${seen.filter(n => n.type === t).length} ${TYPE_NAMES[t]}</span>`).join('')}</div><p class="micro">Bekannte ausgelassene Ziele: ${missed.length ? missed.map(n => escape(n.name)).join(', ') : 'keine'}<br>Seed: ${escape(g.config.seed)} · ${g.config.runes.map(id => RUNES.find(r => r.id === id).name).join(' / ')}</p><details class="effects"><summary>Runeneffekte dieser Reise</summary>${effectsMarkup(g)}</details><button id="replay" class="primary">Gleiche Welt, anderer Weg ↗</button></section>`;
}
function render(scrollToPlayer = false) {
  const priorScroll = document.querySelector('.map-scroll'), top = priorScroll?.scrollTop, left = priorScroll?.scrollLeft;
  const { graph: g, state: s } = session, progress = Object.keys(s.resolvedEncounters).length;
  app.innerHTML = `<header class="topbar"><a class="brand" href="./">${icon('waystone', '', 36)}<span>prado<small>WALK INTO YOUR NEXT STORY</small></span></a><div class="lab-title">WAYSTONE <span>MAP LAB</span><b>PROTOTYP</b></div><div class="header-status"><i></i> Lokal gespeichert <span class="header-separator">/</span><button id="mobile-config">${icon('waystone', '', 18)} Runen</button></div></header>
    <main class="workspace">${configuration()}<section class="map-column" aria-label="Kartenlabor"><div class="map-heading"><div><div class="section-eyebrow">DAS UNBEKANNTE WARTET <span>02</span></div><h1>Wähle deinen Weg.</h1><p>Drei Runen. Viele Möglichkeiten. Eine Reise.</p></div><div class="energy-pill">${icon('energy', '', 20)}<strong>${s.view.infinite ? '∞' : s.energy}</strong><span>Energie</span><button id="quick-energy" aria-label="20 Testenergie hinzufügen">+</button></div></div>
    <div class="map-toolbar"><span>${icon('compass', '', 18)} Level ${g.config.level} <i>·</i> <span class="seed-label">${escape(g.config.seed)}</span></span><button id="to-player">◎ Zur Spielfigur</button></div>
    ${s.view.debug ? '<div class="debug-banner">DEBUG · Vollständig aufgedeckt · kein zusätzliches Wissen gespeichert</div>' : ''}
    <div class="map-scroll" tabindex="0" aria-label="Karte scrollen">${renderMap(g, s, selected)}</div>
    <div class="map-legend"><span><i class="legend-current"></i>Du</span><span><i class="legend-next"></i>Nächster Ort</span><span><i class="legend-rumor"></i>Gerücht</span><span class="map-progress">${progress} / ${LEVELS[g.config.level].depth} Begegnungen</span></div>
    <div class="journey-progress"><span style="width:${progress / LEVELS[g.config.level].depth * 100}%"></span></div>
    ${summaryMarkup()}${controls()}<p class="prototype-note">Gespeicherte Energie, freie Zeiteinteilung. Kein GPS. Alle Werte sind Testdaten.</p>
    </section>${inspector()}</main><footer class="page-footer"><span>PRADO / WAYSTONE EXPLORATIONS</span><span>Eine kleine Welt voller Entscheidungen.</span><span>LAB v1.0</span></footer>
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
  try { session = newSession(draft); draft = structuredClone(session.graph.config); selected = 'start'; bait = false; notice = ''; mobileConfig = false; save(); render(true); } catch (e) { notice = e.message; render(); }
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
  try { const next = importSession(text); session = next; draft = structuredClone(next.graph.config); selected = next.state.currentNodeId; importOpen = false; notice = 'Reise erfolgreich wiederhergestellt.'; save(); render(true); }
  catch (e) { document.getElementById('import-error').textContent = e.message; }
}
function bind() {
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
  on('separation', 'change', e => { draft.separation = e.target.value; render(); });
  on('new-seed', 'click', () => { const bytes = new Uint32Array(1); crypto.getRandomValues(bytes); draft.seed = `PRADO-${bytes[0].toString(36).toUpperCase()}`; render(); });
  on('generate', 'click', regenerate);
  on('enter', 'click', () => { const id = selected; act({ type: 'enter', id }); if (session.state.currentNodeId === id) { bait = false; focusPlayer(); } });
  on('resolve', 'click', () => { act({ type: 'resolve', bait }); bait = false; });
  on('bait', 'change', e => { bait = e.target.checked; render(); });
  on('to-player', 'click', () => { selected = session.state.currentNodeId; render(true); });
  on('return-encounter', 'click', () => inspect(session.state.currentNodeId));
  on('energy', 'click', () => act({ type: 'energy' })); on('quick-energy', 'click', () => act({ type: 'energy' }));
  on('reset', 'click', reset); on('replay', 'click', reset);
  for (const [id, key] of [['fog', 'fog'], ['preview', 'preview'], ['rumors', 'rumorCount'], ['debug', 'debug'], ['infinite', 'infinite']]) on(id, 'change', e => { const value = e.target.type === 'checkbox' ? e.target.checked : ['preview', 'rumorCount'].includes(key) ? Number(e.target.value) : e.target.value; act({ type: 'view', view: { ...session.state.view, [key]: value } }); });
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
