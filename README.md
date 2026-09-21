# Prado · Waystone Map Lab

Ein lokal spielbares Kartenlabor nach dem [Implementierungsplan](Prado-Codex-Implementierungsplan.md) und den weiterentwickelten [Kartenregeln v3](docs/DESIGN-v3.md): **zwei echte Waystone-Inhaltsprofile, drei Runen, sichtbare Pfade mit unbekannten Inhalten, geheime Seitenarme und Ebenenbosse.** Eigene SVG-Symbole, eine gezeichnete Pergamentkarte und ein auf Mobilgeräten einklappbares Detailpanel. Keine externen Assets oder Laufzeitabhängigkeiten.

Die Namen, Deckrezepte und Kartenlisten stammen aus den offiziellen Deckseiten für [The Filthworks](https://www.pradotraveler.com/decks/131) und [Meadowland Wilds](https://www.pradotraveler.com/decks/124). Beschreibungen und Grafiken im Prototyp sind eigenständig. Die Zuordnung zu Mini- und Endbossen ist eine Testregel dieses Labors.

## Starten

Voraussetzung: **Node.js 22 oder neuer**. Kein `npm install` nötig.

```sh
node server.mjs
```

Öffne **http://localhost:4173**. Alternativ: `npm start`.

Unter Windows startet `./start.ps1` den Server. Das Skript verwendet Node aus dem PATH oder die bereits vorhandene lokale Codex-Runtime. Es installiert nichts. Server beenden: `Ctrl+C`. Einen anderen Port setzt du über die Umgebungsvariable `PORT`.

Der Server bindet nur an `127.0.0.1`. Er liefert die Oberfläche und ihre Assets; Spielstand und Spiellogik bleiben im Browser. Derselbe Hostname/Port muss für denselben lokalen Speicherstand verwendet werden.

## In zwei Minuten spielen

1. **The Filthworks** ist als Dungeon geladen. Wechsle oben links zu **Meadowland Wilds**, um die offenere Wildnisstruktur zu testen.
2. Die Karte beginnt unten am Wegstein. Klicke den nächsten markierten Ort an, dann **Ort betreten**.
3. **Begegnung abschließen** simuliert Erfolg und vergibt einmalig Beute. Jetzt kannst du weiterziehen.
4. Nach dem Einstieg entscheidest du dich für einen Hauptweg. Mit **Alle regulären Pfade zeigen** erkennst du die Struktur, aber keine Namen, Typen oder Belohnungen unbekannter Orte.
5. Jeder reguläre Weg führt zum selben Ebenenboss. Andere bekannte Ziele bleiben als verpasst sichtbar; die Karte wird nach der Wahl nicht angepasst.
6. Im Filthworks liegen zwei Valve Seals vor dem Sluice Gate; dahinter wartet die einzigartige **Cracked Sewer Vault**. Meadowland enthüllt stattdessen einen freien Game Trail zur **Gilded Sweetwater Reliquary**. Beide Seitenarme führen wieder zum Ebenenboss.
7. Ein Köder erhöht die seltene Hunt-Chance, garantiert aber keinen Fund. Der Hunt-Auftrag erfordert nur das Abschließen der Jagd.
8. Ab Abenteuerlevel 3 gibt es mehrere Ebenen. Minibosse bewachen die Abstiege; der Endboss erscheint auf der letzten Ebene.
9. **Labor & Sichtweite** bietet Nebel, Pfadansicht, Vorschau, Gerüchte, Testenergie, Reset und JSON-Export/Import. Oben füllt **+** ebenfalls Energie auf.

Ein Klick auf einen Ort ist nur eine kostenlose Inspektion. Betreten ist eine separate Aktion und kostet pro Begegnung 1 Testenergie. Start und Ende sind kostenlos. Es gibt keine GPS-, Schritt- oder Echtzeitpflicht.

## Reproduzierbare Beispiele

Alle Beispiele verwenden Jagd / Wildnis / Ruine und getrennte Horizonte:

| Seed | Level | Ausprobieren |
|---|---:|---|
| `MOOSPFAD-42` | 1 | Kurzer Run mit zwei Hauptwegen, Geheimarm und gemeinsamem Miniboss. |
| `NEBELHIRSCH-73` | 3 | Zwei Ebenen und drei Hauptwege; Miniboss auf Ebene 1, Endboss auf Ebene 2. |
| `MORGENROETE-17` | 1 | Filthworks: Valve Seals, entdeckbares Sluice Gate und Cracked Sewer Vault. Der reguläre Zweig führt zum selben Miniboss. |

**Run zurücksetzen** erzeugt keine neue Karte: Wissen, Inventar und Fortschritt werden mit den aktuellen Sichtreglern zurückgesetzt. Gleiche Entscheidungen ergeben dieselben vorberechneten Resultate. **Karte erzeugen** baut aus der aktuellen Konfiguration eine neue Sitzung; bei laufendem Run wird der Verlust bestätigt. **Neuer Seed** ändert nur das Eingabefeld, bis du die Karte erzeugst.

## Regeln des Labors

- Exakt drei unterschiedliche Runen. Die sechs Katalogrunen und Levelprofile liegen in `src/config.js`.
- Globales Typbudget per Largest Remainder, inklusive fester Feature-Plätze. Die angezeigten Mengen gelten für die **gesamte Karte**, nicht für jeden einzelnen Weg.
- Level 1–5: 8 / 12 / 16 / 20 / 24 Begegnungen pro vollständigem Abenteuer, 2 / 2 / 3 / 3 / 3 Hauptwege je Ebene. Standardmäßig 1 / 1 / 2 / 2 / 3 Ebenen.
- Getrennte Seed-Streams für Topologie, Inhalt, Gerüchte und Encounter. Andere Runen ändern keine Geometrie.
- Serien paralleler, einreihiger Gabeln mit 2–3 Nachfolgern und geraden Ketten dazwischen; disjunkte Korridore ohne Kantenkreuzungen. Alle Hauptwege treffen erst beim verpflichtenden Ebenenboss zusammen.
- Nebel nutzt Vorwärtsdistanz über Kanten. Bekanntes Wissen bleibt erhalten. Gerüchte zeigen einen besonderen Ort, aber keine versteckten Verbindungen oder Outcomes.
- **Alle regulären Pfade zeigen** zeichnet die Topologie und neutrale unbekannte Orte, ohne Inhalte zu lernen. Geheime Knoten bleiben bis zur vorgesehenen Entdeckung vollständig verborgen.
- **Nebel aus** lernt alle regulären Orte dauerhaft. **Debug: alles aufdecken** ist separat markiert und erweitert den gespeicherten Wissensstand nicht; nur Debug darf noch unentdeckte Geheimknoten vorzeitig darstellen.
- Der Geheimarm existiert deterministisch von Anfang an. Im Filthworks verbraucht das Tor zwei Valve Seals; in Meadowland wird der Game Trail ohne Schlüssel geöffnet. Der jeweilige Unique Encounter gibt 25 zusätzliche Testbeute und der Arm führt zum selben Boss.
- Level 1–2 enden mit einem Miniboss. Ab Level 3 bewachen Minibosse die Abstiege und ein Endboss die letzte Ebene. Energie und Inventar reisen mit; Wissen und Quests beginnen je Ebene neu.
- Jede aktive Quest ist individuell lösbar. Alle Quests zusammen abschließen zu können ist bewusst keine Anforderung.
- Effekte werden in Prozentpunkten addiert und auf −75 bis +200 % begrenzt. Monsterloot und Sammelertrag verändern einfache Erträge. Fragmentfunde vergeben zusätzliche Basisbeute 10 × Fragmentmultiplikator. Seltene Lootgewichte und Ködergewicht beeinflussen die Hunt-Chance. HP, Angriff und Heilwirkung werden angezeigt, aber es existiert kein echtes Kampfsystem.
- Standardmäßig 12 gespeicherte Energie und 2 Köder. Alle Zahlen sind frei änderbare Prototypdaten, keine offiziellen Prado-Werte.

## Speichern und Import

Der Browser speichert automatisch in `localStorage`. JSON-Exporte enthalten `schemaVersion`, `generatorVersion`, Konfiguration, aktuelle und abgeschlossene Ebenen, RunState und einen Aktionsverlauf. Auch ein offener Encounter oder Ebenenwechsel kann fortgesetzt werden. Ältere Stände bleiben unter ihren bisherigen Browser-Schlüsseln erhalten, können aber wegen der Deckprofile und neuen Topologie nicht in Version 3 importiert werden.

Importe werden als Daten geparst, niemals ausgeführt. Die Karte wird aus dem Seed neu berechnet und verglichen; der Aktionsverlauf wird durch die Zustandsmaschine erneut abgespielt. Unbekannte Versionen, inkonsistente Zustände, Kartenänderungen und illegale Aktionen werden abgelehnt. Limits: 5 MB und 10.000 Aktionen. Das ist Integritätsprüfung für lokale Teststände, kein Anti-Cheat-System.

JSON-Exporte enthalten absichtlich auch die versteckte Karte. Der Nebel schützt die Entdeckung im Spiel, nicht vor dem Lesen des lokal vorhandenen Quellcodes oder Speicherstands.

## Tests

```sh
node --test
# oder
npm test
npm run check
```

- 11.200 Graphen: beide Deckprofile, alle 20 Runenkombinationen, Level 1–5, 20 Seeds, Einzelebenen- und Mehr­ebenenmodus sowie jede resultierende Ebene.
- Invarianten: DAG, Erreichbarkeit, Pfadtiefe, exakte Budgets, maximal drei Nachfolger, separate Hauptwege bis zum Boss, verpflichtender Boss vor dem Ausgang, geometrische Kreuzungsfreiheit und getrennte Trefferflächen.
- Individuelle Questlösbarkeit, Filthworks mit zwei gemeinsam erreichbaren Valve Seals, offener Meadowland-Geheimpfad, Umgehungen sowie knappe und künstlich unpassende Budgets.
- Vollständige Runs über alle regulären und geheimen Routen, Mini- und Endbossfolge, Ebenenwechsel mit Inventarübernahme, deterministisches Replay, Energiegrenzen, Doppelauslösung, Köderverbrauch und offene Encounter nach Reload.
- Pfadansicht ohne Inhaltsleck, stufenweise Geheimwegentdeckung, Wissen und Gerüchte, reiner Debug-Reveal, versteckte Knoten ohne DOM-Interaktionsziel, JSON-Roundtrip und manipulierte Importe.
- GitHub Actions führt Syntaxprüfung und Tests bei Push und Pull Request aus.

Der aktuelle Prüfstand und die manuelle Browser-Checkliste stehen in [docs/VALIDATION.md](docs/VALIDATION.md).

## Aufbau

```text
src/decks.js        Waystone-Deckprofile, offizielle Namen und Strukturregeln
src/config.js       Levelprofile, Runenkatalog, Eingaben, additive Effekte
src/generation.js   Seed-Streams, Topologie, Budgets, Features, Invarianten
src/model.js        Spielzustand, Sicht, Navigation, Replay, Serialisierung
src/icons.js        Eigene SVG-Symbole
src/map.js          SVG-Karte und Landschaft
src/app.js          Konfiguration, Inspektor, Labor, Runzusammenfassung
src/styles.css     Responsive Oberfläche und reduced-motion
tests/             Generator- und Zustandsprüfungen
server.mjs         Kleiner lokaler HTTP-Server mit Dateifreigabeliste
```

Bewusst schlankes Browser-JavaScript mit ES-Modulen statt Build-Toolchain. Generator und Modell laufen ohne Browser und sind separat testbar. Die Oberfläche verwendet Systemschriften und lädt keine Ressourcen von Drittanbietern.

## Grenzen

Dieses Repository ist ein **funktionierender Kartenprototyp**, keine Prado-Integration. Boss- und andere Begegnungen simulieren Erfolg. Kein echtes Kampfsystem, Login, Backend, Inventarwirtschaft, Schritttracking oder allgemeiner Questgenerator. Die Ebenenzahl und Boss-Schwelle sind Testwerte. Die modulare Topologie verwendet flache lokale Gabeln; verschachtelte Gabeln und unterschiedlich lange Alternativen bleiben mögliche Erweiterungen.

Auf schmalen Geräten kann eine Karte mit drei Routen zusätzlich horizontal gescrollt werden; die lange Karte wird nicht auf eine Bildschirmhöhe verkleinert. Orte unterstützen Maus, Touch und Tastatur (Tab, Enter/Leertaste). Escape schließt mobile Details und Importdialog.
