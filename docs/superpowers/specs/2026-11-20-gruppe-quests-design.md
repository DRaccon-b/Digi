# Gruppe: Quests gemeinsam fertig machen, Niedrigerer schlägt zuerst zu

Stand: 20.11.2026 · kleine bis mittlere Änderung · `digibot.user.js` (Quest-Autopilot in der Gruppe)

## Warum (Nutzer 20.11.)
1. Liegt ein Digimon **mehr als 10 Level** unter dem, der das Monster tötet, bekommt es **keinen Quest-Fortschritt** – außer es hat das
   Monster vorher selbst getroffen (Schaden gemacht). Heute tötet in der Gruppe meist der Stärkere allein → Kills zählen beim
   Schwächeren nicht.
2. Hat ein Account seine Quests (z. B. alle Dailies) fertig, der andere nicht, passt die Gruppe nicht zusammen: der Leader plant nur
   nach seinen eigenen Quests und stoppt, wenn er nichts mehr hat (`autopilotStep` → null → „keine machbaren Quests mehr“), obwohl ein
   Mitläufer noch Kills braucht.

## Ziele
1. **Niedrigerer zuerst („Opener“):** Braucht ein Gruppenmitglied ein Monster für eine offene Kill-/Sammel-Quest und liegt es mehr als
   10 Level unter dem stärksten Mitglied in der Nähe (gleiche Map/Kanal), greift **es zuerst** an. Alle anderen (auch Tank und Leader)
   warten mit dem Angriff, bis es getroffen hat. Sicherheitsnetz wie bei der Tank-Sperre: spätestens 4 s nach seinem Angriffsbeginn bzw.
   10 s ab Wartebeginn. Wer selbst angegriffen wird, wehrt sich sofort.
   - „Getroffen“: der Opener meldet die IDs der Monster, denen er in den letzten ~10 s Schaden gemacht hat (aus den eigenen
     Schadensereignissen), über den Gruppenbus.
   - Mehrere Opener für dasselbe Ziel: der mit dem niedrigsten Level.
   - Reihenfolge mit Tank: Opener darf vor dem Tank zuschlagen (sonst zählt sein Kill nicht); der Tank ist von der Opener-Sperre
     ausgenommen; alle übrigen warten auf beide.
2. **Weiterhelfen, bis alle fertig sind** (Einstellung im Reiter Gruppe, **Standard an**): Der Leader nimmt offene **Kill-/Sammel-Ziele
   der Mitläufer** in seine Planung auf, auch wenn er die Quest selbst nicht (mehr) hat. Er jagt dann deren Monster; die Mitläufer
   jagen über die Jagdliste des Leaders mit. Gespräche/Abgaben dieser fremden Quests macht er nicht. Gestoppt wird erst, wenn auch kein
   Mitläufer mehr offene Kill-/Sammel-Ziele hat. Gilt für alle Quests (Nutzer 20.11.), nicht nur Dailies.
3. **Daten im Gruppenzustand:** Level des Partners (`lvl`), offene Quest-Arten (`need`), zuletzt getroffene Monster (`hits`).

## Nicht-Ziele
- Kein Annehmen/Abgeben fremder Quests durch den Leader; kein Ändern von „🤝 Leader erledigt die Quests der Mitläufer“ (serve) außer
  der Opener-Regel, die auch dort gilt (Mitläufer stehen dort sonst nur – als Opener müssen sie kurz angreifen).
- Keine Level-Regel außerhalb des Quest-Autopiloten (Grinden, Bosse, Rift).

## Anti-Ziele
- Kein Stillstand: fehlt der Opener (Fenster zu, Bot aus, andere Map) oder trifft er nie, greift das Sicherheitsnetz.
- Ladebildschirm eines Mitläufers darf die Hilfe nicht abbrechen (kurze Merkliste der Mitläufer-Quests, ~60 s).
- Die eigenen Quests des Leaders gehen vor (Hilfe-Ziele erst, wenn er selbst nichts mehr zu tun hat, oder gleichrangig auf derselben
  Map – dem Bauenden überlassen, solange das eigene Annehmen von Dailies nicht verhindert wird).

## Ansätze
- **A (gewählt): eigene Opener-Sperre (Takt-Block 3d) neben der Tank-Sperre** + Hilfe-Einträge in `planQuests` (wie `serveQuests`, nur
  Kill/Sammeln, ohne die Mitläufer still zu stellen) + Opt-in-Schalter. Bestehende Teile (Ansage `callId`, Sperr-Muster, Jagdliste der
  Mitläufer) werden wiederverwendet.
- B: Opener als „Tank“ behandeln. Verworfen: Tank ist eine feste Rolle; der Opener wechselt je Monster.

## Annahmen (bitte live prüfen)
- Die Level-Regel gilt auch für Sammel-Quests (Drops beim Kill). Ein Treffer mit beliebigem Schaden reicht.
- Zum Treffer-Nachweis reichen die eigenen Schadensereignisse des Opener-Fensters (Server meldet `dmg` mit `src`).

## Dem Bauenden überlassen
- Namen der Felder/Schalter, genaue Fristen (Start 4 s / 10 s), Abstand „in der Nähe“ (Leine/Gruppenabstand).
