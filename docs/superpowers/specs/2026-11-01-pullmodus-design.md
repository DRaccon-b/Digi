# Pull-Modus (Monster sammeln) – Design (2026-11-01)

## Warum

Beim Farmen erledigt DigiBot heute ein Monster nach dem anderen. Wo Monster dicht stehen, ist es schneller, mehrere
auf einmal anzuspielen und sie gesammelt mit Flächenskills (Rolle „AoE ab N“, 3.1.43) zu erledigen. Der Spieler will
das als Schalter, der in allen Betriebsarten gilt, in denen der Bot normale Monster jagt.

## Ziele

- **Schalter im Reiter „Attacke“:** „Monster sammeln (Pull)“, an/aus. Dazu einstellbar:
  - **Höchstzahl** gesammelter Monster (das erste mitgezählt), Bereich 2–8, Standard 3.
  - **HP-Grenze**, unter der nichts mehr dazugeholt wird, Bereich 30–90 %, Standard 60 %.
- **Ablauf je Runde:**
  1. Das erste Ziel wählt der Bot wie bisher. Beim ersten Treffer merkt er sich dessen Position als **Anker** (≈ Spawnpunkt)
     und den **Leinen-Kreis** = `content.digimon[art].mob.leashRange` (fehlt der Wert: 240 px) um den Anker.
  2. **Weitere anspielen:** das nächste erreichbare Monster, dessen Position und Laufweg im Leinen-Kreis des ersten bleiben
     (Sicherheitsabstand 40 px zum Rand). Ein Treffer mit Taste 1 genügt („angespielt“ = das Monster greift mich an, also
     `targetId` = mein Digimon oder mein Tamer); danach sofort das nächste. Während des Sammelns keine Skills auf 2–6
     außer Heal/Dauer-Buffs (skillCare), damit DS und AoE für die Gruppe bleiben.
  3. **Ende des Sammelns**, sobald eines gilt: Höchstzahl erreicht (Angreifer zählen, auch selbst angesprungene) · im Kreis
     ist kein weiteres erreichbares Monster · HP des Digimons unter der HP-Grenze · 12 s seit dem ersten Treffer (Notbremse).
  4. **Kampf:** normal wie heute (Angreifer zuerst). Flächenskills mit Rolle „AoE ab N“ zünden, sobald sie bereit sind und
     genug Gegner im Kreis stehen – im Pull-Modus gilt als N höchstens die Zahl der gesammelten Monster (mindestens 2).
  5. Sind alle gesammelten besiegt, beginnt die nächste Runde.
- **Die Leine des ersten** ist die harte Grenze (Wunsch des Spielers: das erste darf nicht zurücklaufen). Zusätzlich
  beachtet der Bot die Leinen der danach angespielten (Vorschlag), damit auch die nicht zurücklaufen.

## Nicht-Ziele

- Kein Anspielen mit Fernkampf-Skills (Ansatz B, später als Option möglich).
- Keine eigene Kampf- oder Ausweichlogik: Ausweichen, Tränke, Spiegel, Skill-Rollen bleiben wie sie sind.
- Keine Änderung, welche Arten der Bot jagt (Monsterliste, Level-Grenzen, Radius, Quest-Arten bleiben maßgeblich).

## Anti-Ziele

- Das erste (oder ein anderes gesammeltes) Monster läuft zum Spawn zurück und heilt sich voll.
- Der Bot stirbt, weil er weiter sammelt, obwohl die HP schon niedrig sind.
- Er spielt Monster an, die andere Spieler gerade bekämpfen, oder Bosse/Named.
- In Gruppen ziehen mehrere Fenster gleichzeitig Monster und verteilen den Kampf über die Map.

## Einschränkungen (aus Spiel und Code)

- Spielwerte je Monsterart: `mob.aggressive`, `mob.aggroRange` (meist 96–112 px), `mob.leashRange` (meist 240–320 px;
  Feldbosse bis 640–900). Die Leine wird – wie in MMOs üblich und nach den Werten plausibel – vom Spawnpunkt gemessen;
  den Spawnpunkt kennt der Client nicht, der Bot nimmt die Position beim ersten Treffer.
- `pickTarget` (~Z. 9083) nimmt heute zuerst Fokus/Boss, dann **immer zuerst Angreifer** (`att[0]`), dann Mitläufer-Assist,
  dann die EXP-Wahl. Das Sammeln muss vor `att[0]` eingreifen, sonst bleibt der Bot am ersten Angreifer kleben.
- Monsterliste aus `scan(st)` (~Z. 4388): `{id, species, cat, x, y, hp, d, pd (Wegelänge), attacker, taken, inLvl, enabled,
  aggressive, banned, reach}`; `usable(m)` (~Z. 4481) filtert schon Level, Freigabe, fremde Kämpfe (`taken`), Sperren.
- Rolle „AoE ab N“ zählt Gegner im Wirkungskreis (`enemiesNear`, 3.1.43) und ist ohne Aggro-Schutz.
- Der Reiter Attacke ist `section data-page="attack"` (~Z. 1750); Schalter/Regler nach dem Muster `check()`/`slider()`.

## Ansätze

1. **A – Sammel-Phase in der Zielwahl (gewählt).** Ein kleiner Zustand `pull = { anchor, leash, startAt, ids }` steuert in
   `pickTarget` das nächste Ziel, solange gesammelt wird; danach normaler Kampf. Baut auf Zielwahl, Angreifer-Erkennung
   und AoE-Rolle auf.
2. **B – Anspielen per Fernkampf-Skill.** Spart Wege, kostet DS/Abklingzeit und fehlt dann beim AoE. Später als Option.
3. **C – Nur vorbeilaufen und anlocken.** Billig, aber die Zahl ist nicht steuerbar, passive Monster kommen nicht mit.

Gewählt: **A** (Spieler, 01.11.).

## Was entschieden ist

- Schalter im Reiter Attacke, gilt für alle Betriebsarten mit normaler Monsterjagd.
- Höchstzahl frei einstellbar.
- Die Leine des ersten Monsters ist die Grenze; es darf nicht zurücklaufen.
- Nach dem Sammeln AoE, sobald bereit; sonst Einzelziele, bis alle besiegt sind.

- **Rückkehr-Regel** (Spieler, aus dem Spiel): Ein Monster läuft nur zurück, wenn es den Leinen-Bereich verlässt – kein
  Timer ohne Schaden. Ein Treffer genügt also; kein Nachtippen nötig.
- **Elites** dürfen mitgesammelt werden (Spieler), als erstes und als weiteres Ziel.

## Meine Entscheidungen (zur Prüfung durch den Spieler)

- **Anker = erste gesehene Position** des ersten Monsters (`mobHome`, scan ~Z. 4426), nicht die Position beim Treffer –
  ein aggressives Monster ist beim Treffer oft schon 100 px vom Spawn weg. Fehlt `mobHome`, gilt die Trefferposition.
- **Boss- und Kartenrotation:** Sammeln gilt auch dort, aber nicht, solange ein Boss sichtbar ist oder in ≤ 30 s fällig wird.
- **Gruppe:** Während der Leader sammelt (neues Statusfeld), übernehmen Mitläufer seine wechselnden Ziele nicht, sondern
  wehren sich und folgen; Monster, die einen Mitläufer angreifen, zählen zur Höchstzahl. Nach dem Sammeln wie bisher.
- Standardwerte: Höchstzahl 3, HP-Grenze 60 %, Sicherheitsabstand 40 px, Notbremse 12 s.
- Ein Treffer mit Taste 1 genügt zum Anspielen; während des Sammelns keine Angriffsskills.
- Die Leinen der danach angespielten Monster werden ebenfalls beachtet (Schnittmenge der Kreise).
- **Nicht gesammelt wird:** in Bosskämpfen und bei Event-/Weltboss-Fokus, im Dungeon-/Raid-Modus, bei Zielen mit
  Boss-/Named-Kennung, bei fremd bekämpften Monstern (`taken`), im Ruhemodus.
- **Gruppe:** nur der Leader (oder wer allein spielt) sammelt; Mitläufer helfen wie bisher beim Ziel des Leaders.
- Im Pull-Modus zündet „AoE ab N“ schon bei min(N, gesammelte Zahl), mindestens 2.

## Dem Bauenden überlassen

- Wie „Laufweg bleibt im Kreis“ geprüft wird (Wegekarte `pf`/`pd` oder Luftlinie mit Abstand).
- Status- und Logtexte („Sammle 2/3: Gesomon“), Anordnung der Regler im Reiter.
- Wie der Zustand nach Tod, Map-Wechsel oder Bot-Stopp zurückgesetzt wird.
