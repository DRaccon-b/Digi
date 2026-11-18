# Rift: Ziel-Ei / Ziel-Code farmen (Biom-Check mit Neustart)

Stand: 18.11.2026 · kleine Änderung · Spieldaten: `backups/content-B_z-aY7i-20261116.js`, `backups/index-MsB0Sk48-20261116.js`

## Warum
Der Nutzer will gezielt ein neues Digimon (Ei) oder einen Rift Code aus den Scans bekommen. Welche Digimon ein Lauf
hat, hängt am Biom (5 Biome: verdant, autumn, frost, dusk, circuit). Das Biom wählt der Server; wählen kann man es
nicht. Läufe im falschen Biom bringen für das Ziel nichts – also sofort abbrechen und neu betreten.

## Ziele
- Im Panel (Dungeon → Rift) ein **Ziel** wählen: „keins“ (wie bisher) oder eines der Eier/Codes aus den Spieldaten:
  - Eier: Tapirmon, Kunemon (frei, jede Tiefe) · Gazimon (1500 Shards, ab Tiefe 6) · Dorumon (2000, ab Tiefe 25)
  - Codes: Jewelbeemon, Parrotmon (800) · Brachiomon (1200, ab Tiefe 6) · Craniummon, Veedramon, Mistymon,
    Megidramon (2000, ab Tiefe 25)
- **Tiefe automatisch:** mindestens die Mindesttiefe des Ziel-Scans (`source.minDepth`, sonst 1); darüber gilt die
  normale Tiefenwahl („höchstmöglich“ bzw. „feste Tiefe“). Liegt die Mindesttiefe über dem Freigeschalteten oder dem
  Partner-Level: Meldung, dann normal weiterspielen (kein Endlos-Neustart).
- **Biom automatisch:** aus den Spieldaten die Biome, in denen eine Scan-Art des Ziels spawnt (z. B. Gazimon-Ei →
  sukamon_rift/vademon_rift → circuit, dusk; Kunemon-Ei → verdant, circuit). Nicht fest im Bot verdrahten, sondern zur
  Laufzeit aus den Inhaltsdaten lesen; feste Tabelle nur als Rückfall, wenn die Daten fehlen.
- **Biom-Check:** gleich nach dem Betreten (Etage 1, `run.biome`). Biom passt nicht → Rift sofort verlassen
  (wie riftLeave mit keepDepth: Tiefe nicht herabstufen, kein Fehlschlag) und neu betreten.
- **Scan-Stand (Weg A, Nutzer 18.11.):** vor jedem Betreten bei Clockmon den Reiter „Scans“ lesen. Ziel-Scan ≥ 100 %
  → **Bot anhalten** und melden („Scan X bei 100 % – bei Clockmon umwandeln“). Nicht selbst umwandeln.
- Statuszeile/Log: Ziel, Biom des Laufs, Anzahl Neustarts, Scan-Stand.

## Nicht-Ziele
- Kein automatisches Umwandeln, kein Shard-Einkauf fürs Umwandeln.
- Keine Bedingungen fürs Umwandeln prüfen (z. B. Brachiomon: stabiler Clear Tiefe 15 mit Armadimon-Linie).
- Gruppenspiel (Tank/Heiler) ist ein eigenes Vorhaben.

## Anti-Ziele
- Endlos raus/rein, wenn das Spiel das Betreten verweigert oder das Biom nie passt → die bestehenden Grenzen
  (RIFT_ENTER_TRIES usw.) gelten weiter; nach N Neustarts ohne passendes Biom nur Meldung im Log, weiter versuchen.
- Kein falsches Anhalten: lässt sich der Scan-Stand nicht lesen, nicht anhalten, sondern weiterspielen und warnen.
- Event-Aufbruch (riftEventDue) und Erholungs-/Ausweichlogik bleiben unverändert und gehen vor.

## Ansätze
- **A (gewählt):** Scan-Stand vor jedem Lauf im Clockmon-Fenster lesen. Immer richtig (auch nach Neuladen, Abbruch,
  eigenem Spiel), kostet ~1–2 s pro Lauf.
- B: „Scan-Daten +X %“ aus dem Ergebnisfenster aufaddieren. Schneller, aber braucht einen Startwert und liegt nach
  Neuladen/Abbruch daneben.

## Vorab live prüfen (vor dem Bauen)
- Bleibt das Biom über alle 3 Etagen gleich? Falls nein: auf jeder Etage prüfen (dann Abbruch auch auf Etage 2/3
  überlegen – mit Nutzer klären).
- Wie das Spiel den Scans-Reiter füllt (`riftStore().scans` nach Öffnen des Reiters) und welche Felder es gibt.
- Wie lange raus/rein tatsächlich dauert.

## Dem Bauenden überlassen
- Wo genau im Panel die Auswahl sitzt, Texte der Meldungen.
- Bei schweren Zielen (Tiefe 25, nur Elite/Alpha/Wächter zählen) die Zielwahl auf diese Ränge lenken – nur wenn es
  einfach geht; sonst später.
