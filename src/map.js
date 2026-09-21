import { icon, nodeIcon, paths } from './icons.js';
import { visibility, accessibility, secretAvailable } from './model.js';
export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function scenery(g) {
  let out = '';
  if (g.deck.style === 'dungeon') {
    for (let y = 120; y < g.height - 120; y += 224) {
      for (let r = 0; r < g.routes.length; r++) {
        const x = g.routes[r].x + (r % 2 ? 66 : -66);
        out += `<g transform="translate(${x},${y})" class="terrain dungeon-mark"><path d="M-28 34V-22h56v56M-28-8h56M-17-22v14M0-22v14M17-22v14M-20 10h12v18h-12Zm28 0h12v18H8Z"/><path d="M-36 34h72m-68 8h64"/></g>`;
      }
    }
    return out;
  }
  for (let y = 140; y < g.height - 190; y += 275) {
    for (let r = 0; r <= g.routes.length; r++) {
      const x = r * 280 + (r % 2 ? 7 : 17);
      out += `<g transform="translate(${x},${y})" class="terrain"><path d="m-38 22 25-49 24 38 12-22 25 39m-72-5 16-12 13 8m-16-46 2 26 8-9m14 0 5 17 6-5"/><path d="M-39 32q29-9 66 2m-59 7q23-5 48 1"/></g>`;
      out += `<g transform="translate(${x - 10},${y + 140})" class="terrain"><path d="m0-27-13 24h8L-17 14h34L5-3h8ZM0 14v10m24-38L14 5h6l-9 12h26L28 5h6ZM24 17v7"/></g>`;
    }
  }
  return out;
}
export function renderMap(graph, state, selected) {
  const byId = new Map(graph.nodes.map(n => [n.id, n])), visited = new Set(state.visitedNodeIds);
  const edgeMarkup = graph.edges.filter(e => state.view.debug || ((state.view.paths || state.knownEdges.includes(e.id)) && secretAvailable(state, byId.get(e.from)) && secretAvailable(state, byId.get(e.to)))).map(e => {
    const a = byId.get(e.from), b = byId.get(e.to), walked = visited.has(a.id) && visited.has(b.id);
    return `<path class="map-edge ${walked ? 'walked' : ''}" d="M${a.x},${a.y} L${b.x},${b.y}"/>`;
  }).join('');
  const hidden = graph.nodes.filter(n => !n.secret && visibility(graph, state, n.id) === 'hidden');
  const fog = hidden.map(n => `<ellipse cx="${n.x}" cy="${n.y}" rx="110" ry="95"/>`).join('');
  const nodes = graph.nodes.filter(n => visibility(graph, state, n.id) !== 'hidden').map(n => {
    const v = visibility(graph, state, n.id), a = accessibility(graph, state, n.id), active = a === 'current';
    const unknown = v === 'unknown';
    const label = unknown ? '' : n.kind === 'start' ? 'DER WEGSTEIN' : n.kind === 'end' ? (n.special === 'descent' ? 'ABSTIEG' : 'AUSGANG') : n.special === 'boss' ? 'ENDBOSS' : n.special === 'miniboss' ? 'MINIBOSS' : v === 'rumor' ? 'GERÜCHT' : n.special === 'fragment' ? 'SCHLÜSSELTEIL' : n.special === 'gate' ? (n.secretKind === 'trail' ? 'GEHEIMPFAD' : 'GEHEIMTOR') : n.special === 'treasure' ? (n.unique ? 'EINZIGARTIGER FUND' : 'SCHATZKAMMER') : '';
    return `<g id="node-${n.id}" data-node="${n.id}" class="map-node ${a} ${v} ${!unknown && ['boss', 'miniboss'].includes(n.special) ? 'boss-node' : ''} ${n.id === selected ? 'selected' : ''}" transform="translate(${n.x},${n.y})" tabindex="0" role="button" aria-label="${unknown ? 'Unbekannter Ort' : escape(n.name)} – ${v === 'rumor' ? 'Gerücht' : a === 'next' ? 'betretbar' : a === 'current' ? 'aktueller Ort' : a === 'missed' ? 'verpasst' : 'inspizieren'}">
      <circle class="hit-area" r="35"/>
      ${active ? '<circle class="current-ring" r="30"/><path class="player" d="m-5-40 5 7 5-7Z"/>' : ''}
      ${v === 'rumor' ? '<circle class="rumor-ring" r="29"/>' : ''}
      <circle class="node-base" r="23"/>
      <g transform="translate(-16,-16)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[unknown ? 'unknown' : nodeIcon(n)]}</g>
      ${label ? `<text class="node-label" y="47" text-anchor="middle">${label}</text>` : ''}
      ${state.resolvedEncounters[n.id] ? '<circle class="done-dot" cx="21" cy="-19" r="8"/><path class="done-check" d="m17-19 3 3 5-6"/>' : ''}
    </g>`;
  }).join('');
  return `<svg class="adventure-map theme-${graph.deck.style}" viewBox="0 0 ${graph.width} ${graph.height}" style="--map-ratio:${graph.width}/${graph.height};--map-min:${graph.routes.length === 3 ? 560 : 380}px" aria-label="Abenteuerkarte, Start unten, Ziel oben">
    <defs><pattern id="contours" x="0" y="0" width="210" height="240" patternUnits="userSpaceOnUse"><path d="M-30 130C80 0 90 230 240 110M-30 140C80 10 90 240 240 120M-30 150C80 20 90 250 240 130M-30 160C80 30 90 260 240 140" fill="none" stroke="#8c947f" stroke-opacity=".07"/></pattern><filter id="fog-soft"><feGaussianBlur stdDeviation="18"/></filter></defs>
    <rect width="100%" height="100%" fill="url(#contours)"/>
    ${scenery(graph)}
    ${graph.routes.map(r => `<g class="route-heading"><text x="${r.x}" y="35" text-anchor="middle">${escape(r.name)}</text><text class="route-subtitle" x="${r.x}" y="57" text-anchor="middle">${escape(r.subtitle)}</text></g>`).join('')}
    <g class="edges">${edgeMarkup}</g>
    <g class="fog-bank" filter="url(#fog-soft)" aria-hidden="true">${fog}</g>
    ${nodes}
    <text class="map-bottom" x="${graph.width / 2}" y="${graph.height - 17}" text-anchor="middle">DEIN ABENTEUER BEGINNT HIER</text>
  </svg>`;
}
export function landscape() {
  return `<svg class="landscape" viewBox="0 0 300 145" aria-hidden="true"><circle cx="227" cy="38" r="22" fill="#d2b276" opacity=".7"/><path d="M0 102 47 46l34 39 43-67 61 75 40-32 75 50v34H0Z" fill="#45614d"/><path d="m103 49 21-31 28 35-22-11-9 9-8-9Z" fill="#b8bb9a" opacity=".5"/><path d="M0 112 66 80l53 34 75-44 106 50v25H0Z" fill="#2b4a3d"/><path d="M0 134q68-35 133-6t167-10v27H0Z" fill="#19372d"/><path d="m172 145-3-19 8-13 10 4 2 28" fill="#d7c6a1"/><path d="m179 122-4 7 5 8 5-8Z" fill="none" stroke="#647965"/><g stroke="#a8b092" stroke-width=".6" opacity=".5"><path d="m35 112 7-32 9 32m-15-8h13m-11-8h9m183 20 8-38 10 38m-16-12h13m-11-11h9"/></g></svg>`;
}
