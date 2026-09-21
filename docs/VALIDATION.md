# Prüfprotokoll

Stand: 21. September 2026 · Generator 2.0.0 · Node.js 24.19.0

## Automatisiert

`node --test`: 17 Tests erfolgreich, einschließlich einer Matrix aus **5.600 Karten**. Alle 20 Dreierkombinationen des Runenkatalogs, Level 1–5, Seeds `matrix-0` bis `matrix-19`, jeweils Einzelebenen- und Mehr­ebenenmodus sowie jede resultierende Ebene.

Vollständige Modell-Runs über alle Hauptwege und den Geheimarm geprüft. Jeder Weg passiert denselben verpflichtenden Ebenenboss. Der Geheimarm erscheint in zwei Stufen: Eingang nach dem Entdeckungsort, nachfolgender Seitenarm nach Abschluss des Fragmenttors. Mehrere Ebenen, Mini- und Endboss, Inventarübernahme, Reset und deterministisches Replay sind geprüft. Weitere Checks und Randfälle sind in den benannten Tests dokumentiert.

## Browserprüfung

Mit Chrome 153 headless geprüft:

- [x] 1440 × 900 und 390 × 844, Level 1 mit lokaler Sicht, Gerüchten und sichtbaren regulären Pfaden.
- [x] Keine Browser-Konsolenfehler, kein horizontaler Seitenüberlauf bei 390 px.
- [x] Unbekannte reguläre Orte zeigen nur neutrale Symbole; Bossname und Geheimknoten fehlen zu Beginn.
- [x] Mobiles Detailpanel öffnet über einem direkt erreichbaren Ort und zeigt die Betreten-Aktion vollständig.
- [x] Vollständiger Run über zwei Fragmente, Entdeckungsort, Geheimtor, Schatzkammer, Miniboss und Ausgang.
- [x] Geheimtor vor Entdeckung sichtbar: 0; nach Entdeckungsort: 1. Schatzkammer vor Torabschluss sichtbar: 0; danach: 1.
- [x] Level 3 bis zum Abstieg gespielt; das Tor öffnet Ebene 2/2 und zeigt dort den Endboss als Ebenenziel.
- [x] Abschlussübersicht erscheint nach dem Boss und Ausgang.

Die automatisierten Modelltests decken ergänzend Reload bei offenem Encounter, Export/Import, Reset, reguläre Alternativrouten, Mehr­ebenen-Replay und nicht garantierte Köderergebnisse ab. Tastaturaktionen werden in der Kartenimplementierung und Markupprüfung berücksichtigt; ein vollständiger manueller Screenreader-Test ist noch nicht erfolgt.

Geometrische Kreuzungsfreiheit, mindestens 70 SVG-Einheiten Abstand der Trefferflächen, Inhaltsfreiheit unbekannter Pfadknoten und die Abwesenheit interaktiver Geheimknoten vor ihrer Entdeckung werden bereits ohne Browser geprüft. Die minimale SVG-Skalierung ergibt mindestens 44 CSS-Pixel große Knoten-Trefferflächen.
