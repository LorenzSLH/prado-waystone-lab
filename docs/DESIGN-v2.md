# Kartenregeln v2

Diese vom Nutzer angeforderten Regeln ersetzen die entsprechenden Abschnitte im ursprünglichen Implementierungsplan. Generator- und Speicherversion: 2.0.0 / 2.

## Pfade und Informationen

Der separate Testschalter **Alle regulären Pfade zeigen** zeigt die normale Topologie vollständig. Unbekannte Orte verwenden ein neutrales Symbol und einen generischen Inspektor. Namen, Typen, Questbezug und Belohnungen bleiben verborgen. Lokale Sicht und Gerüchte funktionieren unabhängig davon. Umschalten erzeugt keine Karte neu und lernt keine Inhalte.

Geheime Knoten und ihre Verbindungen sind eine separate Informationsschicht. Sie bleiben auch bei ausgeschaltetem Nebel und sichtbaren regulären Pfaden verborgen. Der explizite Debugmodus zeigt sie, macht sie jedoch weder bekannt noch betretbar.

## Ein Ziel pro Ebene

Alle Hauptwege bleiben bis zum gemeinsamen Boss getrennt. Jeder reguläre und geheime Weg erreicht denselben Ebenenboss. Der Ausgang liegt ausschließlich dahinter; der Boss muss betreten und abgeschlossen werden. Die frühere Option separater Endpunkte entfällt.

## Geheimtor als Seitenarm

Auf der versunkenen Straße liegen zwei Fragmente vor einem Entdeckungsort. Dessen Abschluss deckt den geheimen Eingang auf. Das Betreten des Fragmenttors verbraucht zwei Fragmente genau einmal. Erst der Abschluss des Tor-Encounters enthüllt den nachfolgenden Seitenarm mit Schatzkammer. Der reguläre Weg bleibt ohne Fragmente offen. Beide Varianten führen zum selben Boss.

Die Schatzkammer gibt 25 zusätzliche Testbeute. Geheimer und regulärer Zweig haben für vergleichbare Tests dieselbe Begegnungsanzahl. Der geheime Weg entsteht nicht erst beim Öffnen: Er gehört von Anfang an zur deterministischen Karte und wird nur aufgedeckt.

## Ebenen und Bosse

Bestätigte Testschwelle des Nutzers: **Endboss ab Abenteuerlevel 3**.

| Abenteuerlevel | Ebenen | Begegnungen je Ebene, inkl. Boss | Gesamt | Abschluss |
|---|---:|---:|---:|---|
| 1 | 1 | 8 | 8 | Miniboss |
| 2 | 1 | 12 | 12 | Miniboss |
| 3 | 2 | 8 | 16 | Miniboss → Endboss |
| 4 | 2 | 10 | 20 | Miniboss → Endboss |
| 5 | 3 | 8 | 24 | Miniboss → Miniboss → Endboss |

Der Laboraufbau **Eine lange Ebene** erhält die Gesamtbegegnungszahl, lässt das Abstiegstor weg und endet je nach Level mit Mini- oder Endboss. Die konkrete Ebenenanzahl ist eine vorläufige Testvorgabe, keine Prado-Balancefestlegung.

Nach einem Miniboss führt das freigegebene Abstiegstor per separater Aktion zur nächsten Ebene. Energie und Inventar bleiben erhalten. Die neue Ebene startet mit frischem Wissen und eigenen Questzuständen. Abgeschlossene Ebenen werden archiviert; die Abschlussübersicht fasst alle besuchten Ebenen zusammen.

Ein Reset setzt das gesamte Abenteuer auf Ebene 1 zurück. Import und Reload spielen auch Ebenenwechsel und Entdeckungen nach. v1-Speicherstände bleiben unter dem alten Browser-Speicherschlüssel erhalten, sind aber nicht mit dem neuen Generator importierbar.
