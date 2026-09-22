# Prüfprotokoll

Stand: 22. September 2026 · Generator 5.0.0

## Automatisiert

`node --test` prüft beide Waystone-Decks, alle 20 Dreierkombinationen der Standardrunen, Level 1–5, 20 Seeds, Einzel- und Mehr­ebenenmodus sowie jede resultierende Ebene. Allein diese Matrix enthält 11.200 Karten. Hinzu kommen Modell- und Integritätstests.

Geprüfte Invarianten:

- gerichteter, vollständig erreichbarer Graph; jeder Weg erreicht denselben Pflichtboss;
- ausschließlich benachbarte Tiefen, keine geometrisch kreuzenden Kanten;
- Merge-/Split-Abschnitte, freie Torumgehung und maximal drei Punkte Pfadwertspreizung;
- exakte Largest-Remainder-Budgets, dynamische Typen sowie positive und negative Runen-Nettoänderungen;
- Level- und Tiefenfenster, Ressourcen vor Türen und gemeinsam lösbare Abhängigkeiten;
- deterministische Raritäts-/Kartenauswahl und höchstens ein Unique pro Abenteuer;
- Köderverbrauch beim Eintritt, Lore-Zuwachs beim Abschluss und Erhalt über Ebenen;
- identischer Stepper-Endzustand und Spielgraph;
- Profil- und Session-JSON, Replay, Manipulationsschutz und v4-Konfigurationsmigration.

## Chrome-Prüfung

Chrome wurde headless bei 1440 × 1000 und 390 × 844 geprüft.

- [x] Keine Browser-Konsolenfehler.
- [x] Kein horizontaler Seitenüberlauf bei 390 px.
- [x] Spielkarte, Pfadansicht und mobile Bedienelemente skalieren vollständig in den Viewport.
- [x] Generator-Eigenschaften öffnen mit Kartenarten, Katalog, Runenmatrix, Regeln und Profil-JSON.
- [x] Generation-Stepper öffnet, navigiert vorwärts/rückwärts und zeigt die jeweilige Kartensnapshot-Grafik.
- [x] Ein gültig bearbeitetes Profil kann angewendet werden; ungültige Wahrscheinlichkeitssummen werden verständlich abgelehnt.
- [x] The Filthworks und Meadowland Wilds verwenden getrennte Dungeon-/Wildnisstrukturen.
- [x] Unbekannte reguläre Orte zeigen nur neutrale Symbole; geheime Knoten bleiben bis zur Entdeckung verborgen.

Die automatisierten Modelltests übernehmen die tieferen Spielabläufe: vollständige Runs, Tore, Ressourcenverbrauch, Jagden, mehrere Ebenen, Mini-/Endbossfolge, Export/Import und identisches Replay. Ein manueller Screenreader-Test ist nicht Teil dieses Prototyp-Prüfstands.
