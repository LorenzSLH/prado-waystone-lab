# Verzweigte Karten, Runenbudgets und Entscheidungswerte · v4

Version 4 ersetzt die parallelen Hauptstraßen durch ein unregelmäßiges Ebenenraster. Die Umsetzung übernimmt Grundideen der Slay-the-Spire-Kartengenerierung, bleibt aber an die kürzeren Waystone-Abenteuer und deren Geheimwege angepasst.

## Pfadregeln

- Mindestens zwei unterschiedliche Startkorridore.
- Kanten führen nur zur nächsten Tiefe und dürfen sich nicht kreuzen.
- Benachbarte Korridore können teilweise zusammenlaufen. Der gemeinsame Knoten teilt sich später erneut auf.
- Zusammenführungen werden nicht unmittelbar hintereinander platziert. Längere Ebenen erhalten mehrere getrennte Merge/Split-Abschnitte.
- Alle regulären und geheimen Enden laufen vor dem Ausgang im verpflichtenden Ebenenboss zusammen.

Slay the Spire baut seine Karte auf einem Raster auf, erzeugt mehrere Pfade mit lokalen Links und entfernt unverbundene Räume. Die Referenzimplementierung begrenzt Zielspalten auf links, geradeaus oder rechts, verhindert Kantenkreuzungen und vermeidet ein zu schnelles erneutes Zusammenlaufen gemeinsamer Vorfahren. Prado verwendet weniger Spalten und explizite partielle Junctions, damit die kürzere Karte lesbar bleibt.

## Valve-Seal-Entscheidungen

Die beiden Filthworks-Seals werden aus dem Seed bestimmt und liegen auf unterschiedlichen Korridoren sowie mindestens zwei Tiefen auseinander. Ein Merge/Split-Knoten verbindet den ersten Seal-Korridor mit dem späteren Gate-Korridor. Dadurch existiert immer mindestens ein vollständiger Pfad über beide Seals zum Sluice Gate.

Jede Seal-Tiefe enthält auf allen anderen Korridoren eine kuratierte seltene oder besondere Begegnung. Seal und Alternativen besitzen denselben Entscheidungswert 3. Der Schlüsselweg ist planbar, kostet aber sichtbare Belohnungschancen.

## Runen

Jedes Waystone-Deck besitzt Ausgangswerte für fünf Kartengruppen: Monster, Schrein, Sammelkarte, Eventkarte und Wildkarte. Der Generator verteilt daraus zuerst das Grundbudget der gewählten Kartengröße. Danach addiert oder subtrahiert jede Rune feste ganze Karten. Die sichtbaren Mengen sind deshalb absolute Zahlen; nur die Mindestbelegung von einer Karte pro Kerngruppe darf einen Abzug begrenzen, damit Pflichtinhalte lösbar bleiben.

Relative Effekte werden getrennt berechnet. Belohnungsboni wie Item-Rarity oder Rare-Encounter-Chance und Mali wie Monster-HP, Angriff oder Leech gelten anschließend für jede passende Begegnung.

## Gewichtung

| Inhalt | Wert |
|---|---:|
| Basisbegegnung | 1 |
| Ungewöhnlich | 2 |
| Selten, Hunt oder Schlüsseltausch | 3 |
| Unique Encounter | 4 |
| Miniboss | 5 |
| Endboss | 6 |

Normale Plätze verwenden bevorzugt Common-Inhalte. Seltene Inhalte werden an bewussten Entscheidungen verteilt. Der Generator berechnet für jeden vollständigen regulären Pfad Minimum und Maximum; die Differenz darf höchstens 3 betragen. Ziele derselben Abzweigung erhalten nach Möglichkeit unterschiedliche Begegnungstypen.

## Referenzen

- [Map Generation in Slay the Spire](https://steamcommunity.com/sharedfiles/filedetails/?id=2830078257)
- [Slay the Spire Map Generation Wiki](https://slaythespire.wiki.gg/wiki/Map_Generation)
- [sts_map_oracle Referenzimplementierung](https://github.com/Ru5ty0ne/sts_map_oracle)
