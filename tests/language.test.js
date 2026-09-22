import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('the complete demo surface uses English copy', () => {
  const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const sources = ['app.js', 'config.js', 'decks.js', 'generation.js', 'map.js', 'model.js', 'profile.js']
    .map(name => fs.readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8'))
    .join('\n');
  assert.match(index, /<html lang="en">/);
  assert.match(sources, /Generator properties/);
  assert.match(sources, /Show all regular routes/);
  assert.match(sources, /Use bait when entering/);
  assert.doesNotMatch(`${index}\n${sources}`, /\b(?:Abenteuerlevel|Begegnung abschließen|Generator-Eigenschaften|Karte erzeugen|Köder|Gerücht|Nebelprofil|Runen wählen|Schrein|Sammelkarte|Jagdgebiet|Zurück|Abbrechen)\b/i);
});
