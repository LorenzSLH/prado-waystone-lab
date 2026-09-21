export const paths = {
  unknown: '<circle cx="16" cy="16" r="3"/><path d="M16 5v3m0 16v3M5 16h3m16 0h3"/>',
  boss: '<path d="m4 9 6 4 6-9 6 9 6-4-3 13H7ZM8 26h16m-12-9h1m6 0h1"/>',
  miniboss: '<path d="M6 7h20v9c0 8-10 14-10 14S6 24 6 16Z"/><path d="m11 13 5 8 5-8m-5-4v12"/>',
  treasure: '<path d="M4 15V9c0-7 24-7 24 0v6M4 15h24v13H4ZM4 11h24M11 3v8m10-8v8"/><path d="M13 14h6v7h-6Z"/>',
  waystone: '<path d="M16 2 25 10 22 29H10L7 10Z"/><path d="m16 7-5 9 5 9 5-9Zm0 0v18m-5-9h10"/>',
  monster: '<path d="m7 12-3-8 9 5h6l9-5-3 8 1 9-6 6h-8l-6-6Z"/><path d="m10 15 3 2m9-2-3 2m-7 5 4 2 4-2m-4-3v5"/>',
  forage: '<path d="M16 29V14M16 21C4 24 3 14 4 10c8 0 12 4 12 11Zm0-5C15 6 22 3 28 4c0 8-4 12-12 12Z"/><path d="m8 15 8 6m6-12-6 7"/>',
  hunt: '<path d="m12 18-5-5-3-6m3 6-5 1m8 2 1-8m9 10 5-5 3-6m-3 6 5 1m-8 2-1-8M11 18h10l-2 9-3 3-3-3Z"/><path d="m14 22 2 1 2-1"/>',
  event: '<path d="m16 2 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z"/><path d="m25 3 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/>',
  fragment: '<path d="m17 2 10 10-8 17-12-7 3-14Z"/><path d="m17 2-1 13 11-3M7 22l9-7 3 14m-9-21 6 7"/>',
  gate: '<path d="M5 29V13C5 0 27 0 27 13v16M10 29V14c0-9 12-9 12 0v15M3 29h26M5 13h5m12 0h5M9 5l4 5m10-5-4 5M16 3v5"/><path d="m16 15 3 5-3 5-3-5Z"/>',
  camp: '<path d="m16 3-13 23h26ZM16 12l-6 14m6-14 6 14M4 30h24"/><path d="m11 3 5 7 5-7"/>',
  trail: '<path d="M8 27c15 0-8-12 7-12s-6-10 9-11"/><path d="m20 2 5 2-2 5"/><circle cx="7" cy="27" r="2"/>',
  end: '<path d="M5 27h22M9 27V5m0 1c7-7 11 7 18 0v12c-7 7-11-7-18 0"/>',
  energy: '<path d="m19 2-13 17h9l-2 11 13-18h-9Z"/>',
  compass: '<circle cx="16" cy="16" r="12"/><path d="m21 10-3 9-8 3 3-9Z"/>',
  chevron: '<path d="m11 6 10 10-10 10"/>',
};
export function icon(name, cls = '', size = 24) {
  return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.event}</svg>`;
}
export function nodeIcon(n) { return n.kind === 'start' ? 'waystone' : n.special === 'descent' ? 'gate' : n.kind === 'end' ? 'end' : n.special === 'gate' && n.secretKind === 'trail' ? 'trail' : ['fragment', 'gate', 'boss', 'miniboss', 'treasure'].includes(n.special) ? n.special : ({ M: 'monster', F: 'forage', H: 'hunt', E: 'event' }[n.type]); }
