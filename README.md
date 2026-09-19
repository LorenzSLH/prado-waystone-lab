# Prado · Waystone Map Lab

Ein lokal spielbares Kartenlabor nach dem [Implementierungsplan](Prado-Codex-Implementierungsplan.md): **drei Runen, getrennte Wege und Entscheidungen mit sichtbaren Folgen.** Eigene SVG-Symbole, eine gezeichnete Pergamentkarte und ein auf Mobilgeräten einklappbares Detailpanel. Keine externen Assets oder Laufzeitabhängigkeiten.

## Starten

Voraussetzung: **Node.js 22 oder neuer**. Kein `npm install` nötig.

```sh
node server.mjs
```

Öffne **http://localhost:4173**. Alternativ: `npm start`.

Unter Windows startet `./start.ps1` den Server. Das Skript verwendet Node aus dem PATH oder die bereits vorhandene lokale Codex-Runtime. Es installiert nichts. Server beenden: `Ctrl+C`. Einen anderen Port setzt du über die Umgebungsvariable `PORT`.

Der Server bindet nur an `127.0.0.1`. Er liefert die Oberfläche und ihre Assets; Spielstand und Spiellogik bleiben im Browser. Derselbe Hostname/Port muss für denselben lokalen Speicherstand verwendet werden.

## In zwei Minuten spielen

1. Die Startauswahl **Jagd / Wildnis / Ruine**, Level 1, ist bereits geladen.
2. Die Karte beginnt unten am Wegstein. Klicke den nächsten markierten Ort an, dann **Ort betreten**.
3. **Begegnung abschließen** simuliert Erfolg und vergibt einmalig Beute. Jetzt kannst du weiterziehen.
4. Nach dem Einstieg entscheidest du dich für einen Hauptweg. Andere bekannte Ziele bleiben als verpasst sichtbar. Es gibt keine Querverbindungen und keine nachträgliche Anpassung der Karte.
5. Links wartet der Silberhirsch-Hunt; rechts liegen zwei Fragmente vor dem optionalen Tor. In Level 3–5 liegt der Sammelauftrag auf dem dritten Hauptweg.
6. Ein Köder erhöht die Silberhirsch-Chance, garantiert aber keinen Fund. Der Hunt-Auftrag erfordert nur das Abschließen der Jagd.
7. **Labor & Sichtweite** bietet Nebel, Vorschau, Gerüchte, Testenergie, Reset und JSON-Export/Import. Oben füllt **+** ebenfalls Energie auf.

Ein Klick auf einen Ort ist nur eine kostenlose Inspektion. Betreten ist eine separate Aktion und kostet pro Begegnung 1 Testenergie. Start und Ende sind kostenlos. Es gibt keine GPS-, Schritt- oder Echtzeitpflicht.

## Reproduzierbare Beispiele

Alle Beispiele verwenden Jagd / Wildnis / Ruine und getrennte Horizonte:

| Seed | Level | Ausprobieren |
|---|---:|---|
| `MOOSPFAD-42` | 1 | Kurzer Run mit zwei exklusiven Hauptwegen und lokalen Gabeln. |
| `NEBELHIRSCH-73` | 3 | Drei Hauptwege; Gerüchte bleiben sichtbar, auch wenn ihre Ziele verpasst werden. |
| `MORGENROETE-17` | 1 | Rechte Route: Fragmente bei Tiefe 2 und 3, Tor bei Tiefe 6. Der andere Zweig umgeht das Tor. |

**Run zurücksetzen** erzeugt keine neue Karte: Wissen, Inventar und Fortschritt werden mit den aktuellen Sichtreglern zurückgesetzt. Gleiche Entscheidungen ergeben dieselben vorberechneten Resultate. **Karte erzeugen** baut aus der aktuellen Konfiguration eine neue Sitzung; bei laufendem Run wird der Verlust bestätigt. **Neuer Seed** ändert nur das Eingabefeld, bis du die Karte erzeugst.

## Regeln des Labors

- Exakt drei unterschiedliche Runen. Die sechs Katalogrunen und Levelprofile liegen in `src/config.js`.
- Globales Typbudget per Largest Remainder, inklusive fester Feature-Plätze. Die angezeigten Mengen gelten für die **gesamte Karte**, nicht für jeden einzelnen Weg.
- Level 1–5: 8 / 12 / 16 / 20 / 24 Begegnungen pro vollständigem Pfad, 2 / 2 / 3 / 3 / 3 Hauptwege.
- Getrennte Seed-Streams für Topologie, Inhalt, Gerüchte und Encounter. Andere Runen ändern keine Geometrie.
- Serien paralleler, einreihiger Gabeln mit 2–3 Nachfolgern und geraden Ketten dazwischen; disjunkte Korridore ohne Kantenkreuzungen. Optional treffen die Hauptrouten **nur am finalen Abschlussmarker** zusammen.
- Nebel nutzt Vorwärtsdistanz über Kanten. Bekanntes Wissen bleibt erhalten. Gerüchte zeigen den besonderen Ort, aber keine versteckten Verbindungen oder Outcomes.
- **Nebel aus** lernt die Karte dauerhaft. **Debug: alles aufdecken** ist separat markiert und erweitert den gespeicherten Wissensstand nicht. Für einen sauberen Sichtvergleich erst die Regler einstellen und dann zurücksetzen.
- Jede aktive Quest ist individuell lösbar. Alle Quests zusammen abschließen zu können ist bewusst keine Anforderung.
- Effekte werden in Prozentpunkten addiert und auf −75 bis +200 % begrenzt. Monsterloot und Sammelertrag verändern einfache Erträge. Fragmentfunde vergeben zusätzliche Basisbeute 10 × Fragmentmultiplikator. Seltene Lootgewichte und Ködergewicht beeinflussen die Hunt-Chance. HP, Angriff und Heilwirkung werden angezeigt, aber es existiert kein echtes Kampfsystem.
- Standardmäßig 12 gespeicherte Energie und 2 Köder. Alle Zahlen sind frei änderbare Prototypdaten, keine offiziellen Prado-Werte.

## Speichern und Import

Der Browser speichert automatisch in `localStorage`. JSON-Exporte enthalten `schemaVersion`, `generatorVersion`, Konfiguration, unveränderliche Karte, RunState und einen Aktionsverlauf. Auch ein offener Encounter kann fortgesetzt werden.

Importe werden als Daten geparst, niemals ausgeführt. Die Karte wird aus dem Seed neu berechnet und verglichen; der Aktionsverlauf wird durch die Zustandsmaschine erneut abgespielt. Unbekannte Versionen, inkonsistente Zustände, Kartenänderungen und illegale Aktionen werden abgelehnt. Limits: 5 MB und 10.000 Aktionen. Das ist Integritätsprüfung für lokale Teststände, kein Anti-Cheat-System.

JSON-Exporte enthalten absichtlich auch die versteckte Karte. Der Nebel schützt die Entdeckung im Spiel, nicht vor dem Lesen des lokal vorhandenen Quellcodes oder Speicherstands.

## Tests

```sh
node --test
# oder
npm test
npm run check
```

- 4.000 Graphen: 20 Runenkombinationen × 5 Level × 20 Seeds × 2 Trennungsprofile.
- Invarianten: DAG, Erreichbarkeit, Pfadtiefe, exakte Budgets, maximal drei Nachfolger, separate Hauptrouten, geometrische Kreuzungsfreiheit und getrennte Trefferflächen.
- Individuelle Questlösbarkeit, zwei gemeinsam erreichbare Fragmente, optionales Tor mit Umgehung, knappe und künstlich unpassende Budgets.
- Vollständige Runs auf zwei Routen, deterministisches Replay, Energiegrenzen, Doppelauslösung, Köderverbrauch, offene Encounter nach Reload.
- Wissen und Gerüchte, reiner Debug-Reveal, versteckte Knoten ohne DOM-Interaktionsziel, JSON-Roundtrip und manipulierte Importe.
- GitHub Actions führt Syntaxprüfung und Tests bei Push und Pull Request aus.

Der aktuelle Prüfstand und die manuelle Browser-Checkliste stehen in [docs/VALIDATION.md](docs/VALIDATION.md).

## Aufbau

```text
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

Dieses Repository ist ein **funktionierender Kartenprototyp**, keine Prado-Integration. Begegnungen simulieren Erfolg. Kein echtes Kampfsystem, Login, Backend, Inventarwirtschaft, Schritttracking oder allgemeiner Questgenerator. Die modulare Topologie verwendet flache lokale Gabeln; verschachtelte Gabeln und unterschiedlich lange Alternativen bleiben mögliche Erweiterungen.

Auf schmalen Geräten kann eine Karte mit drei Routen zusätzlich horizontal gescrollt werden; die lange Karte wird nicht auf eine Bildschirmhöhe verkleinert. Orte unterstützen Maus, Touch und Tastatur (Tab, Enter/Leertaste). Escape schließt mobile Details und Importdialog.
