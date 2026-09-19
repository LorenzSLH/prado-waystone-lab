# Prüfprotokoll

Stand: 19. September 2026 · Generator 1.0.0 · Node.js 24.19.0

## Automatisiert

`node --test`: 13 Tests erfolgreich, einschließlich einer Matrix aus **4.000 Karten**. Alle 20 Dreierkombinationen des Runenkatalogs, Level 1–5, Seeds `matrix-0` bis `matrix-19`, jeweils getrennte Enden und gemeinsames Finale.

Zwei vollständige Modell-Runs mit `MORGENROETE-17` auf unterschiedlichen Routen geprüft. Torquest mit zwei Fragmenten erfüllt und bei der anderen Hauptwegwahl verpasst. Gleiche Karte und gleicher Verlauf erzeugen identischen Endzustand. Weitere Checks und Randfälle sind in den benannten Tests dokumentiert.

## Browserprüfung

Noch ausstehend: Zu Beginn war weder Chrome noch ein In-App-Browser mit der Browsersteuerung verbunden. Automatisierte Modell- und SVG-Markup-Tests ersetzen keine visuelle Browserprüfung. Es liegen noch keine Browser-Screenshots vor.

Nach Verbindung im Browser prüfen:

- [ ] 1440 × 900, Level 1, Nebel lokal + Gerüchte.
- [ ] 1440 × 900, Level 1, Nebel aus.
- [ ] 1440 × 900, Level 5, Nebel lokal + Gerüchte.
- [ ] 1440 × 900, Level 5, Nebel aus.
- [ ] 390 × 844, dieselben vier Kombinationen; Konfiguration und Details nacheinander öffnen.
- [ ] Keine Textüberschneidungen, verdeckten Buttons oder sichtbaren Hidden-Tooltips.
- [ ] Vollständigen Run rechts bis zum Tor und Ende durchklicken.
- [ ] Mit demselben Seed zurücksetzen, links spielen und das verpasste Tor prüfen.
- [ ] Reload bei geöffnetem Encounter, Export/Import und Tastaturbedienung.

Geometrische Kreuzungsfreiheit, mindestens 70 SVG-Einheiten Abstand der Trefferflächen und die Abwesenheit interaktiver versteckter Knoten werden bereits ohne Browser geprüft. Die minimale SVG-Skalierung ergibt mindestens 44 CSS-Pixel große Knoten-Trefferflächen.
