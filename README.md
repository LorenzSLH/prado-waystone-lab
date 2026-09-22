# Prado · Waystone Map Lab v5

Ein lokal spielbares Generatorlabor für Waystone-Abenteuer. Es verbindet Prados runenbasierten Deckbau, kreuzungsfreie Merge-/Split-Pfade nach dem Vorbild von Slay the Spire sowie Jagdgebiete mit Ködern und Gebiets-Lore.

Als realistische Beispiele sind **The Filthworks** und **Meadowland Wilds** enthalten. Die Namen und Decklisten stammen aus den offiziellen Prado-Seiten für [The Filthworks](https://www.pradotraveler.com/decks/131) und [Meadowland Wilds](https://www.pradotraveler.com/decks/124). Grafiken, Regeln und Zahlen des Labors sind eigenständige Prototypwerte.

## Start

Voraussetzung: Node.js 22 oder neuer. Es gibt keine Laufzeitabhängigkeiten und kein `npm install`.

```sh
node server.mjs
```

Danach **http://localhost:4173** öffnen. Unter Windows kann auch `./start.ps1` verwendet werden.

## Ausprobieren

1. Deck, drei Runen, Abenteuerlevel und Seed wählen und **Karte erzeugen** drücken.
2. **Alle regulären Pfade zeigen** zeigt die gesamte Wegstruktur, hält Namen und Inhalte unentdeckter Orte jedoch verborgen.
3. Einen erreichbaren Ort wählen und betreten. Bei einem Jagdgebiet kann vor dem Eintritt optional ein Köder eingesetzt werden.
4. In The Filthworks liegen Valve Seals auf getrennten Wegen. Das Sluice Gate ist ein optionaler Seitenarm mit freier Umgehung und einzigartiger Vault.
5. Ab Level 3 führen Minibosse in weitere Ebenen; der echte Endboss wartet auf der letzten Ebene.
6. **Generator-Eigenschaften** öffnet den Editor für Arten, Karten, Runen, Platzierungsregeln, Jagdregeln und Startinventar.
7. **Generierung ansehen** zeigt die neun deterministischen Schritte mit Karte, Budget und Entscheidungen vorwärts und rückwärts.

Profile und Spielstände liegen in getrennten `localStorage`-Einträgen und besitzen getrennte JSON-Importe/-Exporte. Ein Run-Export enthält den benutzten Profil-Snapshot und Hash und ist daher reproduzierbar. Beim ersten Start übernimmt v5 die Konfiguration aus v4, lässt den alten Speicherstand unangetastet und erzeugt die aktive Karte mit dem v5-Standardprofil neu.

## Generatorregeln

- Kartenarten sind dynamische Profildaten. Mitgeliefert werden Monster, Schrein, Sammelkarte, Eventkarte, Jagdgebiet und Falle.
- Basiswahrscheinlichkeiten und Raritätsmischungen müssen jeweils 100 % ergeben. Auswahlgewichte steuern konkrete Karten innerhalb eines Pools.
- Runen verändern Kartenanzahlen absolut. Ihr Nettowert kann zusätzliche Alternativen erzeugen oder optionale Knoten entfernen. Globale Prozentwerte wirken getrennt auf HP, Angriff, Leech, Heilung, Loot, Item-Rarity, Rare-Chance und Köder.
- Level- und Tiefenfenster gelten für Arten und konkrete Karten. Unmögliche Konfigurationen werden mit Ursache blockiert.
- Ressourcen und Türen verwenden generische `produces`-/`requires`-Verträge. Ressourcen liegen vor der Tür und bleiben gemeinsam erreichbar; eine Tür besitzt stets einen freien Alternativweg.
- Wege kreuzen sich nicht, können zusammenlaufen und sich wieder teilen. Jeder reguläre Weg erreicht den Ebenenboss; die Wertspreizung vollständiger Wege beträgt höchstens drei Punkte.
- Köder und Lore erhöhen Rare-/Unique-Gewichte, garantieren aber keinen seltenen Fund. Lore bleibt über Ebenen erhalten, Köder werden nicht während des Runs erzeugt, und Unique-Karten erscheinen höchstens einmal pro Abenteuer.

Die technische Idee, das Datenmodell, Formeln, Pipeline, Pseudocode, Integrationshinweise und Grenzen stehen in [docs/GENERATOR-HANDOFF.md](docs/GENERATOR-HANDOFF.md). Die Quellen zur Pfadstruktur sind die [Slay the Spire map-generation documentation](https://slaythespire.wiki.gg/wiki/Map_Generation), der [STS Map Oracle](https://github.com/Ru5ty0ne/sts_map_oracle) und die verlinkte [Steam-Analyse](https://steamcommunity.com/sharedfiles/filedetails/?id=2830078257).

## Tests

```sh
node --test
npm run check
```

Die Suite prüft mehr als 11.200 Kartenvarianten sowie dynamische Typen, exakte Budgets, positive und negative Runen-Nettoänderungen, Platzierungsfenster, Ressourcenabhängigkeiten, Pfadwerte, Jagd/Lore/Köder, das Unique-Limit über mehrere Ebenen, Replay, Profil-/Session-JSON und v4-Migration. Der visuelle Prüfstand steht in [docs/VALIDATION.md](docs/VALIDATION.md).

## Struktur

```text
src/profile.js      Versioniertes GeneratorProfile und Validierung
src/config.js       Run-Konfiguration und Runeneffekte
src/generation.js   Budgets, Topologie, Inhalt, Trace und Invarianten
src/model.js        Spielzustand, Jagd, Lore, Replay und Serialisierung
src/map.js          Spielkarte und Stepper-Karten
src/app.js          Editor, Stepper und Spieloberfläche
src/styles.css      Responsive Darstellung
tests/              Generator- und Zustandsprüfungen
```

Das Repository ist ein Generator- und UX-Prototyp. Begegnungen simulieren Erfolg; Kampf, GPS, Login und Backend sind nicht enthalten.
