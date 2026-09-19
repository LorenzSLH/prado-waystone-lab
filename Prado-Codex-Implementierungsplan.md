# Prado Waystone Map Lab — Codex-Implementierungsplan
Version 0.2 · 19. September 2026 · Umsetzungsspezifikation, noch kein gebauter Prototyp

## Auftrag an Codex
Baue einen lokal startbaren, durchklickbaren Browser-Prototyp für Prados Waystone-Pfadsystem nach dieser Spezifikation. Schwerpunkt: drei Runen konfigurieren, Karte generieren, Wege auswählen und Folgen sichtbar machen. Verwende eigenständige Grafik im Stil einer gezeichneten Abenteuerkarte, inspiriert von der Lesbarkeit der Slay-the-Spire-Karte. Implementiere und prüfe die Phasen unten; liefere Startanleitung und reproduzierbare Test-Seeds. Keine Veröffentlichung ohne einen entsprechenden Auftrag.

Dieses Dokument ist eigenständig ausführbar. Die früheren Vorschläge eines allseitig vernetzten Graphen und eines obligatorisch gemeinsam lösbaren Questpakets sind hiermit überholt.

## 1. Verbindliche Produktregeln
- Schritte erzeugen gespeicherte Energie. Spielfortschritt ist zeitlich unabhängig vom Gehen. Kein GPS, keine Schritt-API oder Echtzeit-Laufpflicht.
- Genau drei unterschiedliche Runen bestimmen Schwierigkeitsmali, Bonusattribute und Begegnungszusammensetzung.
- Level 1–5 bestimmt die Abenteuerlänge. Level und Runen sind im Labor getrennt konfigurierbar; die echte Formel zur Ableitung des Levels ist noch nicht bekannt.
- Navigation über eine Karte. Knoten antippen zeigt Informationen, Betreten ist eine separate Aktion.
- Pro aktuellem Nicht-Endknoten 1–3 Nachfolger. Nicht jedes Stockwerk ist eine Entscheidung.
- Es entstehen deutlich getrennte Hauptwege mit eigenen lokalen Optionen. Kein regelmäßiger Wechsel von links nach rechts, keine vollständige Vernetzung benachbarter Ebenen.
- Wege dürfen auseinanderlaufen und erst spät oder gar nicht vor ihren separaten Abschlüssen zusammentreffen.
- Nicht alle Orte, Hunts oder Quests müssen in einem Run erreichbar sein. Verzicht ist ein beabsichtigter Teil der Pfadwahl.
- Keine sich kreuzenden Kanten ohne expliziten gemeinsamen Knoten. Auch kreuzungsfreie Querverbindungen zwischen Hauptwegen sind nicht erlaubt.
- Nebel und entfernte Gerüchte-Leuchttürme überlagern dieselbe unveränderliche Karte.
- Köder verbessern Chancen, garantieren keinen Unique.
- Zahlen und Runennamen unten sind ausdrücklich Prototypdaten, keine offiziellen Prado-Werte.

## 2. Umfang
Enthalten: Runen-Konfigurator, Level, Seed, deterministischer Generator, Kartenansicht, Knoten-Inspektor, Durchklicken, Nebel, Leuchttürme, einfache Encounter-Auflösung, ein Fragmenttor, Hunt/Köder-Demo, minimale Questzustände, Export/Import und Neustart.
Nicht enthalten: echtes Kampfsystem, Inventarökonomie, Server, Login, Schritte-Synchronisation oder vollständiger prozeduraler Questgenerator.
Quests dienen zunächst als sichtbare Gründe für Routenwahl. Das ist ein Kartenlabor und keine vollständige Prado-Nachbildung.

## 3. Oberfläche und visuelle Richtung
### Hauptlayout
Desktop: schmale Konfiguration links, dominante Karte mittig, Knoteninformation rechts.
Mobil: Karte als Hauptansicht; Konfiguration einklappbar; Knotendetails als Bottom Sheet. Keine drei nebeneinanderliegenden Minispalten.
Start unten, Ende oben. Vertikal scrollen; beim Betreten dezent zum aktuellen Knoten bewegen. Schaltfläche „Zur Spielfigur“.

### Grafik
- Gedämpfter Pergament- oder dunkler Schiefergrund, kontrastreiche Tuschelinien, sparsame goldene Akzente für Gerüchte.
- Echte, wiedererkennbare Symbole für Monster, Foraging, Hunt, Ereignis, Fragment und Tor statt Buchstaben in identischen Kreisen.
- Eigenständige SVG-Symbole oder eine lokal verfügbare Iconbibliothek. Keine übernommenen Spiel-Assets voraussetzen.
- Gestrichelte, leicht organische Pfade; kontrollierte Abweichungen der Knotenpositionen. Keine wahllosen Zickzacklinien.
- Breiter freier Raum zwischen Hauptwegen. Innerhalb einer Route kleinere Abzweigungen.
- Aktueller Knoten mit klarer Markierung; besuchte Route kräftig; nächste betretbare Knoten hervorgehoben; verpasste bekannte Orte gedimmt.
- Nebel in zurückhaltenden Flächen, nicht bloß ein Fragezeichen auf jedem bereits vollständig sichtbaren Knoten.
- Mindestens 44 CSS-Pixel große Trefferflächen. Icons dürfen kleiner sein.
- Zoom/Pan nur bei Bedarf; mobil nicht die komplette lange Karte auf Bildschirmhöhe schrumpfen.
- Desktop und 390px-Breite visuell prüfen. Animationen respektieren reduced-motion.

Neue Bildreferenz war bei Planerstellung nicht verfügbar. Ein vorhandener Anhang darf bei Umsetzung inspiziert werden; ohne ihn nach dieser Richtung arbeiten, keine Bilddetails behaupten.

## 4. Bedienung
Konfiguration vor Start:
1. Drei Runen wählen; identische Auswahl in zwei Slots verhindern.
2. Aggregierte Effekte und Begegnungszahlen sehen.
3. Level, Seed, Nebelprofil und Anzahl der Gerüchte einstellen.
4. „Karte erzeugen“.
5. Sichtbaren Knoten inspizieren, direkt erreichbaren Nachfolger betreten.
6. Vereinfachten Encounter abschließen; neuen Informationsstand sehen.

Regler:
- Level 1–5.
- Seed als Text; „Neuer Seed“ separat von „Gleichen Seed erneut erzeugen“.
- Nebel: aus / lokal / lokal plus Gerüchte.
- Vorschau: Levelstandard oder Override 1–5 Kanten.
- Gerüchtezahl 0–3.
- Routentrennung: stark (Standard: keine Zusammenführung der Hauptwege) / späte gemeinsame Endstation.
- Debugansicht, kostenfreie Testenergie, „Run zurücksetzen“.
- Vollständiges Aufdecken ausschließlich als deutlich sichtbarer Debugmodus.

Strukturänderungen an Level/Runen/Seed erfordern „Neu generieren“ und bestätigen den Verlust des aktuellen Test-Runs.
Nebel, Vorschau und Debug verändern nur die Sicht, niemals Topologie oder versteckte Inhalte.
Rücksetzen setzt den Spielzustand auf exakt dieselbe Karte zurück. Ein Replay liefert dieselben vorberechneten Ergebnisse.
Aufgedeckte Information bleibt bekannt; Änderung eines Vorschau-Reglers löscht kein Wissen. Für einen sauberen Vergleich zurücksetzen.

## 5. Levelprofile — editierbare Startwerte
| Level | Encounter pro vollständigem Pfad | Vorschau in Kanten | Hauptwege |
|---|---:|---:|---:|
| 1 | 8 | 1 | 2 |
| 2 | 12 | 2 | 2 |
| 3 | 16 | 3 | 3 |
| 4 | 20 | 4 | 3 |
| 5 | 24 | 5 | 3 |

Start, reine Kreuzung und Abschlussmarker zählen nicht als Encounter.
Die Karte enthält wegen Alternativen mehr Knoten als ein Spieler besucht.
Längere Runs und mehr Vorschau sind Vorschläge zum Testen, keine Balancefestlegung.
Im ersten Prototyp bleiben alternative Pfade gleich lang; die Formen und Inhalte unterscheiden sich. Unterschiedliche Längen können später ergänzt werden.

## 6. Runen: eindeutige Mengen- und Effektregeln
Jede Rune besitzt:
id, name, flavor, difficultyMods, rewardMods, encounterUnits, typeBias.

Beispieldaten:
| Rune | Mengenbeiträge M/F/H/E | Malus | Bonus |
|---|---|---|---|
| Jagd | 4/0/3/1 | Monster-HP +15 % | Monsterloot +10 % |
| Wildnis | 1/5/1/1 | Monsterangriff +10 % | Foraging-Ertrag +20 % |
| Ruine | 3/1/1/3 | Heilwirkung −15 % | Fragment-Fund-Bonusloot +15 % |
| Blutmond | 5/0/2/1 | Monsterangriff +20 % | Seltene Lootgewichte +15 % |
| Zuflucht | 2/3/0/3 | Monster-HP +10 % | Heilwirkung +20 % |
| Fährte | 2/2/3/1 | Monster-HP +10 % | Ködergewicht-Bonus +20 % |

M=Monster, F=Foraging, H=Hunt, E=Ereignis. Ein Beitrag ist eine Gewichtseinheit, kein Versprechen einer identischen Anzahl auf jeder Route.

Rechenregel:
1. Summiere die vier Mengenbeiträge der drei Runen.
2. N = sämtliche Encounter-Plätze des generierten Graphen; Typbudget = N × Anteil.
3. Ganzzahlen über Largest-Remainder-Verfahren; Tie-Break stabil nach Typ-ID. Summe exakt N.
4. Zeige vor Start die exakten Kartenmengen, ihre Prozentwerte und eine Erklärung: „Gesamte Karte; dein Weg enthält nur einen Teil.“
5. Plätze mit Nullgewicht bekommen keine Zufallsknoten dieses Typs. Ein unpassendes Testfeature wird als nicht kompatibel markiert, nicht heimlich ergänzt.
6. Verteile die Mengen mit bewussten lokalen Schwerpunkten auf Routen; zeige die tatsächliche Verteilung pro Hauptroute im Debugpanel.
7. Untertypen verbrauchen das Budget ihres Obertyps: Elite ist Monster, Fragmentfund ist Ereignis/Foraging, Tor ist Ereignis. Ein Fragment kann auch als garantierte Belohnung eines Monsters zugeordnet sein.
8. Verschiedene Mods desselben Stats addieren sich in Prozentpunkten, anschließend deklarierte Grenzen anwenden. Keine unklare Mischung von Addition und Multiplikation. Finale Multiplikatoren anzeigen.
9. Mods in V1 in der Encounter-Zusammenfassung und einfachen Ertragsauflösung sichtbar machen. Keine echte Kampfwirkung behaupten.
10. Die Struktur entsteht unabhängig vom Runentyp; Runen ändern Inhalte, Mengen und Effekte. Getrennte Seed-Streams ermöglichen Vergleich desselben Pfadaufbaus mit anderen Runen.

Wichtig: Exakte gleiche Typzahlen auf JEDEM Pfad sind kein Ziel. Das würde bedeutungsvolle Routenwahl beseitigen. Falls Prado später zwingend pfadgenaue Zahlen verlangt, ist diese Vertragsentscheidung neu zu klären.

## 7. Generator: Routen zuerst, lokale Wahl danach
Verwende einen seriell-parallel aufgebauten gerichteten Graphen statt freier Zufallskanten.

Bausteine:
- chain(k): k Encounter nacheinander.
- fork2 / fork3: zwei bzw. drei alternative lokale Abschnitte, optional innerhalb derselben Route später zusammenführen.
- terminalFork: lokale Wege enden getrennt.
- mainSplit: teilt den frühen Weg in zwei oder drei Hauptkorridore, deren Identität danach erhalten bleibt.

Ablauf:
1. Eingaben validieren und snapshotten; Seed-Streams topology, content, rumors, encounter trennen.
2. Gemeinsamen kurzen Einstieg und mainSplit bauen.
3. Jeder Hauptroute einen disjunkten horizontalen Korridor und Encounter-Tiefenbudget zuweisen.
4. Je Route chain/fork-Module einsetzen; lokale Alternativen dürfen sich wieder treffen, nicht die Nachbarroute betreten.
5. Standard: separate Endknoten pro Hauptroute. Optional eine gemeinsame letzte Endstation, keine gemeinsamen Zwischen-Checkpoints.
6. Bei Forks das Layoutintervall in disjunkte Teilintervalle aufteilen. Module vertikal nacheinander setzen.
7. Typbudgets und feste Testfeature-Plätze reservieren, Rest zufällig unter Mengenconstraints verteilen.
8. Knotenpositionen innerhalb sicherer Teilintervalle leicht variieren.
9. Pfade rendern und auf Kreuzungen mit anderen Kanten/Knoten prüfen. Bei Kollision Jitter reduzieren; auf kollisionsfreie Grundgeometrie zurückfallen.
10. Gerüchte auf existierende, vom Start erreichbare entfernte Knoten binden, ohne zusätzliche Verbindung dorthin einzubauen.
11. Validieren, serialisieren, RunState separat initialisieren.

Kein Modul darf unbeschränkt rekursiv neue Forks erzeugen. Maximale lokale Verschachtelung 2; Graphgrößenlimit aus Levelbudget ableiten.
Startwerte für lokale Verzweigungen: Level 1 mindestens eine lokale Wahl in jeder Route, Level 5 drei bis vier. Dazwischen lineare Passagen.

Harte Invarianten:
- Azyklisch; keine Rückwärtskanten; eindeutige IDs.
- Höchstens drei Nachfolger; Nicht-Endknoten mindestens einer.
- Alle Knoten vom Start erreichbar.
- Von jedem regulären Zustand mindestens ein zugänglicher Abschluss; ein Tor nie alleiniger Ausweg ohne Schlüssel.
- Keine routeId-übergreifenden Kanten außer mainSplit und optionalem gemeinsamen Endpunkt.
- Keine geometrischen Schnittpunkte außer gemeinsamen Endknoten.
- Pfadtiefe entspricht Levelprofil.
- Mindestens zwei exklusive Hauptwege; mindestens ein besonderer Ort ist durch Wahl eines anderen Hauptwegs nicht mehr erreichbar.
- Budgets ergeben exakt die Platzanzahl.

## 8. Nebel, Wissen, Erreichbarkeit
Drei getrennte Größen:
- visibility: hidden | rumor | revealed.
- traversal: unvisited | current | visited.
- accessibility: next | future | missed | locked.

Speichere Wissen unabhängig von Erreichbarkeit. Ein bekannter Leuchtturm verschwindet nicht, wenn er verpasst wird; er wird gedimmt mit „Auf dieser Route nicht mehr erreichbar“.

Sichtweite = Vorwärtsdistanz im Graphen, nicht Pixelabstand oder bloß Zeilennummer.
Lokale Sicht zeigt Knoten und bekannte Verbindungen innerhalb dieses Radius.
Gerücht zeigt ausschließlich erlaubte Felder: Ort, Typ, eventuell Voraussetzung. Keine Nachbarknoten automatisch enthüllen.
Verbindungen durch unbekannte Bereiche bleiben verborgen. Kein Klick oder Tooltip darf versteckte Namen und Inhalte verraten.
Neuer Standort erweitert dauerhaft knownNodes und knownEdges.
Ein Leuchtturm ist kein Teleportziel: Betreten nur über eine ausgehende Kante des aktuellen Knotens.
Debug-Full-Reveal verändert nicht knownNodes des Spielstands.

## 9. Durchklicken und Zustandsmaschine
RunState:
currentNodeId, visitedNodeIds, knownNodes, knownEdges, energy, inventory, questStates, resolvedEncounters, status.

Antippen -> Inspektor; „Betreten“ nur bei next, erfüllten Voraussetzungen und genügend Energie.
Betreten belastet einmalig Energie und öffnet den Encounter.
„Encounter abschließen“ simuliert Erfolg, vergibt definierte Ergebnisse genau einmal und erlaubt Bewegung.
Doppelklicks und Reload dürfen weder doppelt verbrauchen noch doppelt belohnen.
Energie im Labor manuell nachfüllbar; unendlich als Debugschalter. Standardkosten 1 pro Encounter, ausdrücklich Platzhalter.
Tor bleibt bei fehlenden Teilen gesperrt; der Weg daran vorbei bleibt offen.
Runende: besuchte Route, ausgelassene bekannte Ziele, gewählte Typverteilung, Runeneffekte und Seed zeigen.
Stand lokal speichern; JSON-Export und validierter Import mit schemaVersion. Import niemals als Code ausführen.

## 10. Quests und besondere Orte im Prototyp
Drei Szenarien reichen:
A. Leuchtturm-Hunt in einer Hauptroute mit optionalem Köder.
B. Zwei Fragmente vor einem optionalen Tor in einer anderen Hauptroute.
C. Foraging-Auftrag auf einer dritten oder lokalen Alternativroute.

Nicht verlangen, dass A+B+C gemeinsam lösbar sind. Die UI erklärt den Zielkonflikt bei der Pfadwahl, ohne ständig Bestätigungsdialoge zu zeigen.
Jede einzelne aktiv angebotene Quest muss zunächst einen gültigen Lösungspfad haben.
Innerhalb einer Quest müssen alle Voraussetzungen gemeinsam erreichbar sein. Keine beiden Pflichtteile auf gegenseitig ausschließliche Zweige setzen.
Bekannter, durch Wahl verpasster Auftrag bekommt Status „In diesem Run nicht mehr erreichbar“, nicht automatisch „Generatorfehler“.
Keine Warnung, die unbekannte Questorte oder Inhalte offenlegt.
Bei Tor-/Köderquest Ressourcenverbrauch in einer kleinen Zustandssuche mitprüfen. Nicht notwendigerweise alle Quests gleichzeitig prüfen.
Zufälliger Unique ist Bonus, keine Pflicht für einen garantiert abschließbaren Einzelrun-Auftrag.

Questgenerator später:
Vorlagen nach Gebiet/Runen/Inventar filtern -> Zielroute bestimmen -> Ziel und Abhängigkeiten reservieren -> individuellen Lösungspfad beweisen -> absichtliche Konflikte zwischen Aufgaben kennzeichnen -> Information verteilen.
Nur bei ausdrücklich gemeinsam abschließbaren Questketten einen gemeinsamen Lösungspfad verlangen.
Keine Änderungen an der Karte nach Pfadwahl, um verpasste Ziele dem Spieler nachzutragen.

## 11. Architekturvorschlag
Vorhandenen Projektstack verwenden. Falls kein Projekt vorliegt: kleiner TypeScript-Browserprototyp mit SVG-Renderer und leichtem lokalen Devserver, beispielsweise Vite. Keine Backendabhängigkeit.
Module:
- config/levelProfiles, runeCatalog, encounterCatalog
- generation/prng, topology, budgets, content, rumors, validation
- model/graph, runState, visibility, traversal, serialization
- ui/MapView, RuneConfigurator, NodeInspector, LabControls, RunSummary
- tests/generator, navigation, fog, replay
Renderer liest Zustand; Generator kennt keine UI. Logik ohne Browser testbar.

Seed-Vertrag: gleiche normalisierte Eingaben + gleiche generatorVersion -> identische Karte und Ergebnisse. Keine versteckten Date.now-/Math.random-Aufrufe.
Export beinhaltet Konfiguration, Seed, Version, Graph und RunState. Unpassende Importversion verständlich ablehnen.

## 12. Ausführungsphasen
1. Projekt und verfügbare Referenzen prüfen. Kurze Startanleitung, Datenmodelle, 6 Beispielrunen.
2. Deterministischen Routengenerator und Invariantentests bauen. Zuerst getrennte Routen ohne Quests nachweisen.
3. Hochwertige SVG-Karte und mobile Details umsetzen. Zuerst ohne Nebel visuell prüfen.
4. RunState, Durchklicken, Energie-Demo und Replay ergänzen.
5. Nebel, Leuchttürme und verpasste Ziele ergänzen.
6. Hunt, Fragmente/Tor und drei minimale Questvorlagen integrieren.
7. Laborregler, JSON-Export/Import, Levelvergleich und Diagnosepanel.
8. Browser- und Generatorprüfungen durchführen, Fehler beheben, lokal startbares Ergebnis liefern.

## 13. Abnahme
Funktion:
- Drei Runen sichtbar wirksam; keine doppelte Auswahl.
- Level 1 und 5 erzeugen tatsächlich unterschiedlich lange Karten.
- Derselbe Seed reproduziert dieselbe Konfiguration; Reload bewahrt Entscheidungen.
- Nur nächste erreichbare Knoten betretbar; Inspektion kostet nichts.
- Pfadwahl verpasst besondere Ziele dauerhaft.
- Hauptwege bleiben bis auf optionales Finale getrennt.
- Gerüchte enthüllen Ziele, keine Routen; Nebelregler generieren nicht neu.
- Tor mit fehlenden Teilen gesperrt, mit passenden Teilen passierbar.
- Köder wird genau einmal verbraucht; Unique nicht garantiert.
- JSON-Roundtrip erhält Graph, Wissen und RunState.

Algorithmus:
Für alle 20 Kombinationen aus 6 Runen, 5 Level und 20 Seeds mindestens 2.000 Graphen prüfen: Invarianten, Typbudgets, Leveltiefe, Torlösbarkeit und individuelle Questlösbarkeit. Bei Kosten Tests deterministisch batchen; Fehler-Seed ausgeben.
Zusätzliche feste Fälle: exklusive Hauptwege, lokale Gabel, drei Nachfolger, verpasstes Gerücht, zwei Teile vor Tor, unpassendes Runenbudget.
Tests für Grenzen: leere/ungültige Eingaben, kaputter Import, gespeicherter Encounter nach Reload, Doppelklick, Energielimit.

Visuell:
Browser-Screenshots bei 390×844 und 1440×900, Level 1 und 5, Nebel an/aus.
Keine Kantenkreuzungen, Textüberlagerungen, verdeckten Touchziele oder verräterischen Hidden-Tooltips.
Mindestens einen vollständigen Run durchklicken und einen zweiten mit demselben Seed auf anderer Route testen.
Falls kein Browser verfügbar: Einschränkung transparent nennen; DOM-Stubs nicht als visuelle Prüfung ausgeben.

## 14. Erwartete Übergabe
- Startbarer Prototyp mit allen lokalen Quelldateien.
- README: Installation/Start, Steuerung, Testbefehle, bekannte Grenzen.
- Drei dokumentierte Seeds für Routentrennung, Gerüchte und Fragmenttor.
- Screenshots oder nachvollziehbare Browserprüfung.
- Klarer Unterschied zwischen funktionierender Prototyplogik, simulierten Encountern und späterer Prado-Integration.

## Direkt verwendbarer Startauftrag
„Setze diesen Plan als lokalen, durchklickbaren Prado-Kartenprototyp um. Beginne mit den bestehenden Projektdateien und beachte lokale Anweisungen. Priorisiere getrennte, kreuzungsfreie Hauptwege mit lokalen Optionen, eine hochwertige SVG-Karte und deterministische Generierung aus genau drei Runen. Arbeite die Phasen ab und prüfe die Abnahmekriterien. Alle Beispielwerte sind konfigurierbar. Verpasste Ziele sind beabsichtigt; verbinde die Routen nicht nachträglich, um alles erreichbar zu machen. Liefere das getestete Ergebnis mit Startanleitung; veröffentliche es nicht.“

