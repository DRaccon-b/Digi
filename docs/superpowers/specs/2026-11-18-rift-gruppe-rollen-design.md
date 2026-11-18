# Rift-Gruppe mit Rollen: Tank, DD, Heiler

Stand: 18.11.2026 · Projekt · betrifft `digibot.user.js` (Gruppenmodus + Digital Rift)

## Warum
Der Nutzer spielt den Digital Rift mit **eigenen Accounts in mehreren Fenstern** (Gruppenmodus des Bots: ein Leader-Fenster,
Mitläufer-Fenster, Abgleich über den Gruppen-Bus). Heute verteilt die Gruppe die Ziele bzw. jeder greift an, wie er will. Gewünscht
ist klassisches Gruppenspiel: ein **Tank** zieht zuerst die Aufmerksamkeit, **DDs** machen Schaden, ein **Heiler** bleibt hinten,
debufft und heilt. Wichtigste Regel (Nutzer): **der Tank greift zuerst an, alle anderen danach.** Feinheiten werden live justiert
(„wie das in der Praxis läuft, sehen wir dann“).

## Ziele
1. **Rollen manuell zuweisen – zentral im Reiter Gruppe** (Nutzer): je Account auf seiner Karte „Tank / DD / Heiler“. Standard DD.
   Höchstens ein Tank: wählt man einen zweiten, wird der bisherige DD. Die Rollen liegen bei den Account-Daten (`accounts.list[i].role`),
   die alle Fenster ohnehin lesen.
2. **Leader und Tank getrennt wählbar** (Nutzer). Der Leader bleibt, wie er ist (öffnet den Rift, erkundet, wählt Weg/Abstieg).
3. **Ansatz A (Nutzer): der Leader bestimmt das Ziel, der Tank eröffnet.**
   - Der Leader wählt das nächste Ziel mit der bestehenden Rift-Logik (`riftFocus`: Heiler-Mobs zuerst, Gruppe für Gruppe, Alpha/Guardian
     zuletzt …), greift es aber nicht selbst an, solange ein Tank in der Gruppe aktiv ist, sondern **sagt es an** (neues Feld im
     Gruppen-Zustand, z. B. `callId`).
   - Der Tank nimmt das angesagte Ziel, läuft hin und greift an.
   - Alle anderen (DDs, Heiler, auch der Leader, wenn er nicht Tank ist) greifen das angesagte Ziel erst an, wenn **das Ziel den Tank
     angreift** (`entity.targetId` = Tamer oder Digimon des Tanks). Sicherheitsnetz: höchstens wenige Sekunden warten (Startwert 4 s
     nach dem ersten Treffer des Tanks bzw. nachdem der Tank das Ziel angegriffen hat), dann trotzdem mit angreifen – nichts darf hängen
     bleiben.
   - Greift ein Gegner einen DD/Heiler direkt an, darf der sich wie bisher wehren (sonst stirbt er), Ausweichen/Erholen gehen weiter vor.
4. **Heiler-Verhalten (Nutzer 18.11.: Variante a):** greift nach dem Tank **normal mit an** (wie ein DD, gleiche Sperre) – so wirken
   seine Gegner-Debuffs (`atksup`/`defsup` über den normalen Angriffsablauf `skillPick`), Gruppen-Heal (`grpheal`) und Selbstheilung
   (`heal`) laufen nebenbei über `skillCare`. Keine neue Heil-Logik.
   **Aufstellung:** zwischen den Kämpfen und beim Anlaufen hinter dem Tank, auf der vom Ziel abgewandten Seite (Startwert ~90 px),
   nicht in Warnzonen. Im Kampf steht er, wo sein Angriff es verlangt (Nahkämpfer am Ziel).
5. **Mitläufer folgen im Rift dem Leader** (Vorschlag, vom Nutzer bei der Freigabe bestätigen): Mitläufer erkunden die Etage nicht mehr
   selbst (`riftStep` nur beim Leader), sondern halten den Gruppenabstand zum Leader. Bei einem angesagten Ziel läuft der Tank vor; die
   anderen rücken bis in Angriffsreichweite nach, sobald die Sperre fällt. Am Portal steigt nur der Leader ab (Spiel nimmt die Party mit –
   live prüfen). Bewusstlose/abgehängte Mitläufer: wie bisher selbst zurechtfinden, dann wieder folgen.
6. **DD-Verhalten:** wie heute, nur mit der Tank-zuerst-Sperre und demselben Ziel wie der Tank (kein Ziele-Verteilen, solange ein Tank
   aktiv ist).
7. **Anzeige:** auf jeder Gruppenkarte die Rolle; im Status, worauf gewartet wird („warte, bis X den Tank angreift“).

## Nicht-Ziele (vorerst)
- Andere Modi als Digital Rift (Grinden, Bosse, Quest-Autopilot, andere Dungeons/Raids) – später, wenn es im Rift gut läuft.
- Spiel mit fremden Spielern (der Bot steuert nur eigene Fenster).
- Neue Heil-/Debuff-Skillwahl, Aggro-Berechnung, Spott-Skills des Tanks, eigene Tank-Positionierung.

## Anti-Ziele
- Die Gruppe darf nicht stehen bleiben, weil der Tank fehlt, offline, bewusstlos, in einer anderen Map/einem anderen Kanal ist oder das
  Ziel nie den Tank angreift → dann verhält sich alles wie heute (ohne Rollen) bzw. das Sicherheitsnetz greift.
- Ohne zugewiesenen Tank ändert sich nichts gegenüber heute (Standard: alle DD).
- Solo-Rift (ohne Gruppe) bleibt unverändert.

## Ansätze
- **A (gewählt):** Leader sagt das Ziel an, Tank eröffnet, die anderen warten auf „Ziel greift Tank an“. Eine Steuerung, bewährte
  Rift-Zielwahl bleibt erhalten; Tank kann nicht spontan andere Ziele wählen (wehrt sich aber).
- B: Tank wählt die Ziele selbst, alle folgen dem Tank. Natürliches „Vorrennen“, aber zwei planende Köpfe (Leader-Weg vs. Tank-Ziele),
  Gruppe kann auseinanderreißen, Abstieg passt nicht zur Zielwahl.

## Bekannte Rahmenbedingungen (Code/Spiel)
- Gruppen-Zustand je Fenster: `groupState()` (u. a. `slot`, `role` leader/follower, `ents`, `targetId`, `hp`, `x/y`, `mapId`, `channel`);
  Leader sieht Mitläufer über `groupMembers()`, Mitläufer den Leader über `groupLeader()`. Mitläufer übernehmen heute das Ziel des
  Leaders, sobald dieser es wirklich angreift (`targetId` nur bei echtem Angriff).
- Skill-Rollen: `DIGIBOT_ROLES` / `CARE_ORDER` (heal, grpheal, utilsup, defsup, tankbuff, atksup), `partyPartners()` für Gruppen-Heal.
- „Ziele verteilen“ (`accounts.spread`) muss bei aktivem Tank aus sein bzw. ignoriert werden.
- Rift: nur der Party-Leader öffnet (`view.iLead`) und steigt ab (`riftDescend`); im Rift-Fenster stehen Probleme der Mitglieder
  (`view.party[].problem`, z. B. `far`). Wie Mitläufer beim Betreten/Abstieg mitgenommen werden, ist live zu prüfen; Mitläufer dürfen den
  Rift nicht selbst öffnen, sondern sollen bei Clockmon beim Leader stehen.
- Das Spiel zeigt je Gegner, wen er angreift (`entities.get(id).targetId`).

## Vorab / live zu prüfen
- Ob Mitläufer im Rift-Modus heute überhaupt mitkommen (Betreten, Abstieg, Ergebnis/Verlassen) – das ist Voraussetzung und kann eigene
  Arbeit bedeuten.
- Wie schnell ein Ziel nach dem Tank-Angriff auf den Tank wechselt (Sicherheitsnetz-Zeit justieren).

## Dem Bauenden überlassen
- Name und Form des Ansage-Felds, Auswahl-Steuerelement auf der Karte, Statustexte.
- Genaue Abstände/Startwerte (Heiler hinter dem Tank, Wartezeit), solange live justierbar.
