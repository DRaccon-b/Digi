# Kartenrotation – Design (2026-10-31)

## Warum

Der Spieler (Veemon-Linie mit Flamedramon/Raidramon/Magnamon, Lv 118) will alle Common-Trainingskarten der A3-Maps
farmen – in **seiner** Reihenfolge (z. B. erst HP/DE, dann CT, dann Rest). Heute geht das nur von Hand über Grinden
und Zielwahl. Die Kartenrotation soll das automatisch tun: Karten auswählen, priorisieren, starten, und eine Anzeige
sagen lassen, wie lange es noch dauert.

## Ziele

- Neue dritte **Art** im Reiter **Bosse**: „Kartenrotation“ neben „Boss-Rotation“ und „Named-Elite-Runde“.
  Gestartet wird wie die anderen über den Modus „Bosse“ (`cfg.farm`, `cfg.farmMode = 'cards'`).
- **Kartenliste**: alle Common-Karten (`items[id].training.rarity === 0`), die auf Feld-Spawns oder Named-Gegnern
  droppen. Je Zeile: Name, Stat, Fortschritt `x/max` (benutzt + in der Kartentasche), Map(s), Kennzeichen
  gepanzert/weicht aus, Häkchen, ↑/↓ für die Reihenfolge. Suchfeld wie bei „Bosse auswählen“.
- **Named-Gegner** (Drop 12 Karten/Kill, 5 min Respawn) haben ein eigenes Häkchen und sind **standardmäßig aus**.
- **Priorität = Reihenfolge des Spielers.** Der Bot nimmt die oberste noch offene ausgewählte Karte, reist zu ihrer Map
  und jagt dort **alle** ausgewählten offenen Karten-Arten dieser Map mit (die droppen dort ohnehin).
- **Fertig-Erkennung**: Karte gilt als voll, wenn benutzt + in der Kartentasche ≥ Limit (`baseUses` +
  Meisterung). Dann fällt die Art aus der Jagdliste; ist die Map leer, geht es zur nächsten Karte.
  Sind alle fertig: Status „Kartenrotation fertig“, Bot stoppt.
- **Form selbst wählen, immer die beste**: Bewertung je Form = AT der Form (Basis + Wachstum × (Lv−1), Gear-Anteil gleich)
  × Elementfaktor gegen die Art (×1,2 stark, ×0,9 schwach, light↔dark beidseitig stark), gewichtet nach noch
  fehlenden Kills der aktuell gejagten Arten. Nur freigeschaltete Formen. Wechsel nur beim Betreten der Map oder
  wenn eine Art fertig wird (nicht pro Mob), und nur, wenn die neue Form spürbar besser ist (Schwelle, z. B. ≥ 5 %).
- **Restzeit-Feld**: kleine Anzeige über der Liste: „noch ca. 23 h 40 min (ausgewählt)“, plus je Zeile die Restzeit.
  Rechnung: fehlende Karten ÷ Ø-Dropchance (0,448 normal/elite gemischt; Named 12/Kill) × (Ø Kampfzeit + Lauf-
  /Suchzuschlag). Ø Kampfzeit aus der bestehenden Monster-Statistik (`mobExp`, „Ø Kampf“), sonst Schätzwert nach Typ
  (weicht aus ~6 s, normal ~8 s, gepanzert ~14 s). Named: Kills × 5 min Respawn, wenn nicht parallel.

## Nicht-Ziele

- Keine Rare-/Ultra-Karten (später möglich).
- Karten werden **nicht** automatisch benutzt (Binder) – Spieler macht das selbst.
- Keine neuen Kampfmechaniken; Kampf, Ausweichen, Tränke, Kanäle wie bei der bisherigen Jagd.
- Keine Maps, die der Spieler noch nicht betreten darf (Entry-Quest nicht erledigt) – solche Karten in der Liste
  ausgegraut mit Hinweis „Map gesperrt“.

## Anti-Ziele

- Kein Hin- und Her-Digitieren (kostet ~20 s je Wechsel).
- Keine Named-Gegner, wenn das Häkchen aus ist – auch nicht „nebenbei“.
- Bestehende Modi (Boss-Rotation, Named-Runde, Autopilot) dürfen sich nicht verändern.

## Randbedingungen

- Nur über den Spielzustand/Commands, die der Bot schon nutzt; keine neuen Server-Befehle.
- Daten: `content.items` (training), `content.spawns[map].zones[].entries[].drops` und `.bosses[].drops`,
  `content.digimon[sp]` (Element, Basis/Wachstum, `mob.identity.tags`), `store.me.training` (benutzt),
  `store.me.cards` (Kartentasche), `store.me.partner.evolutions` (freigeschaltete Formen), `content.maps[].entryQuest`.
- Einstellungen in `cfg` (persistiert wie üblich): `cardSel` (geordnete Liste von Karten-IDs), `cardNamed` (Set der
  erlaubten Named-Karten). `farmMode`-Enum um `'cards'` erweitern.
- Gruppe: Leader entscheidet Map und Ziele, Mitläufer folgen (wie bei der Jagd).

## Ansätze

- **A – dritte Art im Reiter Bosse (gewählt)**: nutzt Reiter, Kanal-Häkchen, Start über „Bosse“ und die vorhandene
  Reise-/Jagdlogik (Hunt-Aufgabe mit `species`-Set wie beim Grinden). Wenig neuer Code, passt zum Wunsch.
- B – eigener Modus „Karten“: sauberer getrennt, aber Kanäle/Start/Timer doppelt anbinden.
- C – im Autopiloten beim Grinden: läuft nebenbei, aber keine Kontrolle über Reihenfolge – widerspricht „meine Prio“.

Gewählt: **A** (Spieler).

## Vom Spieler entschieden

- Reiter bei der Boss-Rotation, Art „Kartenrotation“.
- Karten frei auswählbar; Named an/abwählbar.
- Form: Bot wählt selbst immer die optimale.
- Reihenfolge des Spielers ist die Priorität.
- Feld mit der geschätzten Dauer bis alle (ausgewählten) Karten gefarmt sind.

## Meine Entscheidungen (prüfbar)

- Auf der Map der obersten Karte werden alle anderen ausgewählten Karten-Arten derselben Map mitgejagt.
- Fortschritt zählt Kartentasche mit (nicht nur benutzte Karten).
- Formwechsel nur bei Map-Betreten / Art fertig, mit ≥ 5 % Vorteils-Schwelle.
- Restzeit mit Dropchance 0,448 (12 % Elites laut Spielcode) und Zuschlag 4 s je Kill für Laufen/Suchen.
- Named standardmäßig aus.

## Nach dem Builder-Check geklärt

- **Limit**: `Ii(training, benutzt).limit` aus dem Spielcode = `baseUses + masteryPoints × masteryCopiesPerPoint`
  (Commons: keine Meisterung → `baseUses`, z. B. 360/400/480/600). `store.me.training` gehört dem **Tamer**
  (Bonus gilt für alle Partner) – also ein Fortschritt je Konto, kein Partner-Bezug. `perStat 768` liegt weit über
  dem, was Commons je Stat geben; keine Rolle. Datenformen live geprüft: `me.training = {card_id: anzahl}`.
  `me.cards` (Kartentasche) beim Bauen live prüfen und im Test nachbilden.
- **Umfang**: Trainingskarten gibt es nur auf A3-Maps (series 3) – Liste = alle Common-Karten, die es gibt.
- **Karte ↔ Art**: 1:1 (`card_<species>`). Droppt eine Art auf mehreren Maps (z. B. Dark Lizarmon), wählt der Bot
  die freie Map mit den **meisten weiteren offenen ausgewählten Karten**, bei Gleichstand die niedrigere.
- **Level-Filter**: gilt für die ausgewählten Karten-Arten **nicht** (wie Farm-Bosse); Angreifer werden wie immer
  abgewehrt. Laut Client-Code keine Level-Strafe auf Drops.
- **Named**: Ist ein Named angehakt und seine Map aktuell, prüft der Bot den Spawnpunkt auf den ausgewählten
  Kanälen (Timer/Logik der Named-Runde wiederverwenden): lebt → kämpfen; sonst Feldmobs der Map jagen und bei
  Respawn wieder hin. Restzeit für Named: Kills × 5 min (ein Kanal), parallel zur Feldjagd gerechnet.
- **Formbewertung**: Attribut weglassen (alle drei Armor-Formen sind „free“ → neutral; für andere Linien den
  Attributfaktor ×1,25/×0,85 mitnehmen, ist billig). Dark-Tower-Regel und andere Sperren haben Vorrang: nur Formen,
  die auf der Map erlaubt sind.
- **Gruppe**: es zählt der Fortschritt des **Leaders**; Mitläufer folgen und jagen mit (kein neuer Abgleich).
- **Kampfzeiten**: neue dauerhafte Ø-Kampfzeit je Art (localStorage, gleitender Mittelwert), gespeist aus
  derselben Messung wie „Ø Kampf“; ohne Messwert Schätzwert nach Typ.

## Offen für den Bauenden

- Genaues Layout der Zeilen, Farben, Texte (an vorhandene Boss-Auswahl anlehnen).
- Wie die Hunt-Aufgabe technisch eingehängt wird (eigener Step wie `namedStep` oder Wiederverwendung der Autopilot-
  Hunt-Aufgabe).
- Test-Szenarien im vorhandenen Testgerüst (`tests/gw.js`).
