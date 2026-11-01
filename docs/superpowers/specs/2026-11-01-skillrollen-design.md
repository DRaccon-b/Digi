# Skill-Rollen und Skill-Planer – Design (2026-11-01)

## Warum

Seit dem Spiel-Update vom 31.10. gibt es bei Bossen nach der Tagesbelohnung volle EXP nur noch für genug Beitrag
(„deal, heal or tank more for the full amount“). Gut abgestimmte Skills lohnen sich deshalb mehr als bisher, allein
und in der Gruppe. Heute kennt DigiBot je Taste nur zwei Zustände: **Angriff** (wirkt in Tastenreihenfolge 2 → 6,
sobald bereit) oder **Heal < x %** (eigene HP). Buffs laufen wie Angriffe mit, Gruppen-Heals nur fest im Dungeon
(< 85 %), Schutz- und Reinigungs-Skills gar nicht gezielt.

Der Spieler will je Skill eine **Rolle** festlegen. Der Bot setzt jeden Skill dann passend zu seiner Rolle ein, und
mehrere Bot-Fenster einer Gruppe stimmen Gruppen-Skills untereinander ab.

## Ziele

### Rollen (vom Spieler festgelegt)

Je Taste 2–6 und je Digitationsform (wie heute `cfg.skillSets[species]`) eine Rolle:

| Rolle | Verhalten |
|---|---|
| **Angriff** | wie heute: in Tastenreihenfolge, sobald bereit |
| **AoE ab N** | N ist im Auswahlfeld einstellbar (2–5). Wirkt nur, wenn mindestens N Gegner im Wirkungskreis stehen; ist das Ziel ein Boss, zählt er wie ein normaler Angriff (Vorschlag im Gespräch, vom Spieler bestätigt). |
| **Angriffs-Buff** | **nur bei Bossen** (Ziel mit Boss-Flag; Entscheidung des Spielers – normale Monster fallen zu schnell). 3 s nach Kampfbeginn, **vor** der ersten Angriffsattacke. Hat der Gegner gerade einen Spiegel (Reflexion), wartet der Bot, bis er weg ist. Ist der Buff im selben Kampf wieder bereit, wird er erneut gewirkt (ebenfalls nicht bei Spiegel). |
| **Tank-Buff** | dauerhaft: zu Kampfbeginn und neu, sobald der Effekt ausläuft und der Skill bereit ist. Bei Skills mit Abklingzeit = Wirkdauer (z. B. Dukemon) liegt er damit durchgehend an. |
| **Angriffs-Support** | erhöht den Schaden der Gruppe (Gegner-Debuff wie Abwehr runter, oder Gruppen-Angriffsbuff). Wird gehalten, solange gekämpft wird; in der Gruppe setzt ihn **ein** Fenster. |
| **Def-Support** | schützt die Gruppe (Schild, Schadensreduktion, Schaden aufteilen, Gegner verlangsamen). **Dauerhaft** gehalten (Entscheidung des Spielers), in der Gruppe setzt ihn **ein** Fenster. |
| **Utility-Support** | entfernt Debuffs (Cleanse): sobald jemand in Reichweite einen Debuff hat; in der Gruppe macht es **ein** Fenster. |
| **Heal < x %** | wie heute: eigene HP unter x %. |
| **Gruppen-Heal < x %** | sobald ein Partner der Gruppe in Reichweite (inkl. eigenem) unter x % fällt; in der Gruppe zündet **ein** Fenster. |

Der Haken links bleibt der Ein/Aus-Schalter der Taste.

### Vorschlag aus den Spieldaten

Für jeden Skill schlägt der Bot die Rolle aus `content().skills[id]` vor; der Spieler ändert sie nur bei Bedarf.
Felder (zod-Schema `Bn`): `kind` damage/heal/buff/debuff, `target` enemy/self/ally, `shape` single/circle/line,
`radius`, `effects[{stat,pct,durationMs}]`, `damageReduction`, `protectionMs`, `cleanse`, `guardLink`, `share`,
`expose`, `power`.

Vorschlagsregeln (Entscheidung des Designers, siehe „Meine Entscheidungen“):
- `kind:'damage'` + `shape` circle/line → **AoE ab 2**; sonst damage → **Angriff**
- `kind:'heal'`, `target:'self'` → **Heal < 50 %**; `kind:'heal'`, `target:'ally'` → **Gruppen-Heal < 85 %**
  (entspricht dem heutigen festen Wert); mit `cleanse` → trotzdem Gruppen-Heal (der Heal ist der Hauptzweck)
- `kind:'buff'`, auf sich (`target:'self'`, `shape:'single'`): Defensiv-Stats (`de, ev, bl, hp`, `damageReduction`,
  `protectionMs`) → **Tank-Buff**; Offensiv-Stats (`at, as, ct, ht`) → **Angriffs-Buff**; gemischt → nach dem
  größeren Prozent-Anteil
- `kind:'buff'` für die Gruppe (`shape:'circle'` oder `target:'ally'`): defensiv → **Def-Support**, offensiv →
  **Angriffs-Support**; nur `cleanse` → **Utility-Support**
- `kind:'debuff'` (auf den Gegner): senkt `de`/`bl` oder hat `expose` → **Angriffs-Support**; senkt `at`/`as`/`ms`
  → **Def-Support**
- Key of Hope bleibt eine feste Sonderrolle (nicht wählbar, siehe Einschränkungen)

### Gruppe

- Gruppen-Rollen (Angriffs-, Def-, Utility-Support, Gruppen-Heal) werden zwischen den Bot-Fenstern abgestimmt: Bei
  Bedarf zündet **eines**, die anderen halten ihren Skill zurück. Selbst-Rollen (Angriffs-Buff, Tank-Buff, Heal) zündet
  jedes Fenster für sich.
- Abgestimmt wird nach **Wirkungsklasse**, nicht nach Skill-ID: zwei verschiedene Digimon mit gleichwertigem
  Gruppen-Schutz sollen sich auch abstimmen.

## Nicht-Ziele

- Keine neue Reihenfolge der Angriffe untereinander (bleibt 2 → 6).
- Keine Änderung an Key of Hope, Davis-Reset und Tamer-Skill (Crest): die bleiben eigene Pfade.
- Keine Rollen für Taste 1 (Grundangriff) und keine Items/Tränke.
- Kein automatisches Umsortieren der Hotbar.

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es „läuft“)

- Dauer-Buffs werden ständig neu gezündet und verbrennen DS (z. B. direkt nach einem Davis-Reset).
- Zwei oder mehr Fenster zünden denselben Gruppen-Heal/-Schutz gleichzeitig, oder alle warten und keiner zündet.
- Bestehende Schutzregeln fallen weg: Spiegel, Boss-Mahlzeit, Boss-Anmarsch/-Ruhe, Spawn-Schutz, Aggro-Schutz für
  Flächenskills, langer Cast vor einem Boss-Angriff, Key-of-Hope-Vorlauf.
- Alte Einstellungen gehen verloren (Heal-Werte, abgehakte Tasten).

## Einschränkungen (aus dem Code)

- Es gibt heute **sieben** Stellen mit Skill-Tasten: Hauptrotation (`bot.tick`, ~Z. 10053), `mirrorAttack` (~5097),
  `rangedFromOutside` (~2626), `skillsAtEdge` (~2652), `healSkill` (~3646), `groupHeal` (~4039), `keyOfHope`
  (~3966). Sie filtern uneinheitlich (`isAllyHeal`, `kohSoon`, `skillUnsafe`, Reichweite/`dash`/`target` jeweils nur
  an einigen Stellen). Die Rollen-Entscheidung muss an **einer** Stelle stehen; pfadspezifische Regeln bleiben aber
  erhalten (am Kreisrand und beim Fernangriff kein Ansturm und kein Skill, der das Digimon bewegt; Selbst-Buffs
  im Stand sind dort erlaubt).
- **Key of Hope bleibt Sonderpfad** (eigener 50-ms-Takt, Rang, Beanspruchung mit Bestätigung). Jeder Pfad des
  Planers übernimmt die Sperre `kohSoon < KOH_LEAD_MS + 800 + castMs`, auch für Buffs und Heals mit Cast.
- `digibotConfig` (Z. ~174) und `editSkillSet` (Z. ~3644) behalten heute nur `skills` und `heal`; neue Felder müssen
  dort aufgenommen werden, sonst löscht sie schon `saveCfg`.
- `skillSets` wird über den `storage`-Listener mit allen Fenstern geteilt: gleiche Form ⇒ gleiche Rollen.
- **Kampfbeginn** gibt es heute nicht: `bot.engage.since` springt bei jedem Schaden, `lastDamage` zählt auch fremden
  Schaden, `attackedId` wird oft genullt. Es braucht einen eigenen Merker `{targetId, at}`, der nur bei einem Wechsel
  der Ziel-ID neu gesetzt wird.
- **Laufende Effekte**: `st.effects[entityId] = [{id, end(performance.now), ms, n?}]`; `end:0` = ohne Timer.
  Schadensreduktion steht als eigener, kürzerer Eintrag `${skillId}:damageReduction`; „hält noch“ wird an der
  Skill-ID selbst geprüft. Gruppen-Buffs stehen unter der Partner-Entity jedes Mitglieds.
- **Debuff-Erkennung** muss neu: `stunMs`/`rootMs` gibt es im Spiel nicht. Debuff = Spiel-Status mit `kind:'debuff'`
  (`marked, shared, lag, reaper_bubbles, grabbed, dark_tower, reaper, gear_lag, burn, tripped, wounded, silenced,
  silence_mark`) oder ein Skill-Effekt mit `pct < 0`.
- **Spiegel**: `mirrorActive(id)` plus `st.boss.mirror` (für den verfolgten Boss) plus die vorausschauende
  Reflexionsprüfung in `skillUnsafe`.
- Der Spiegel-Return der Hauptrotation (Z. ~9967), `engage.noDmg` und der Overkill-Return liegen **vor** der
  Skill-Schleife. Dauer-Buffs, Support und Heals müssen vorher drankommen (etwa an der Stelle von `healSkill`), sonst
  fallen sie bei einer Reflexion aus.
- Gruppen-Sync: neuer Nachrichtentyp muss in die Positivliste von `digibotCore.accept` (Z. ~103); neue Statusfelder
  in `groupSig` (sonst ~1 s Verzögerung); `null` geht in `digibotClean` verloren; `groupMembers` liefert nur beim
  Leader etwas. Spiegel-Mitläufer (`bot.on` aus) zählen heute nicht mit (`m.bot`-Filter).
- Erst `bot.hit(...) !== false`, dann in der Gruppe beanspruchen (wie Key of Hope; `groupHeal` macht es heute
  umgekehrt und sperrt bei einem zurückgehaltenen Tastendruck alle Fenster 2,5 s).
- Davis/Burst zählen heute `skillOn && !healAt` als Angriffsskills; das muss auf „Rolle Angriff oder AoE“ umgestellt
  werden (sonst zählen Buff-Tasten als Angriffe auf Abklingzeit).
- Tests binden altes Verhalten: `healtest.js` liest `[data-healcfg="3"]` mit den Werten `'50'`/`'0'`;
  `grouphealtest.js` erwartet Gruppen-Heal und KoH bei allen Haken aus.

## Ansätze

1. **A – zentraler Skill-Planer (gewählt).** Eine Funktion entscheidet je Takt, welcher Skill dran ist, und alle
   Pfade fragen sie (mit ihrem Pfad-Kontext). Gruppen-Rollen laufen über eine gemeinsame Wahl nach Wirkungsklasse.
   Vorteil: jede Regel an einer Stelle; Nachteil: größerer Umbau.
2. **B – Regeln in die bestehenden Pfade einbauen.** Schneller, aber jede Regel müsste an sieben Stellen stimmen; genau
   solche Abweichungen haben schon Fehler gemacht (3.1.1, Skills am Kreisrand).
3. **Verworfen – nur automatisch aus den Spieldaten**, ohne Einstellung: Der Spieler will die Rollen selbst festlegen.

Gewählt: **A** (Spieler, 01.11.).

## Was entschieden ist

- Die neun Rollen und ihr Verhalten wie in der Tabelle oben.
- AoE-Schwelle im Auswahlfeld einstellbar; Boss als Ziel zählt wie Angriff.
- Angriffs-Buff: nur bei Bossen; 3 s nach Kampfbeginn, vor dem ersten Angriffsskill, nie bei Spiegel; im Kampf wieder,
  sobald bereit. Bei normalen Monstern wird er nicht gewirkt. „Kampfbeginn“ = erster eigener Angriff auf diese
  Boss-ID (eigener Merker, siehe Einschränkungen).
- Tank-Buff und Def-Support dauerhaft halten.
- Supports teilen sich in Angriffs-, Def- und Utility-Support.
- Gruppen-Rollen: ein Fenster zündet; Selbst-Rollen jedes Fenster selbst.
- Rolle je Taste und Digitationsform; Vorschlag aus den Spieldaten, vom Spieler änderbar.

## Meine Entscheidungen (zur Prüfung durch den Spieler)

- **Datenform:** `cfg.skillSets[species] = { skills, heal, role: { [k]: 'attack'|'aoe'|'atkbuff'|'tankbuff'|
  'atksup'|'defsup'|'utilsup'|'heal'|'grpheal' }, aoeN: { [k]: 2..5 }, grpHeal: { [k]: 30..85 } }`. `heal[k]` bleibt
  die Schwelle für „Heal < x %“. Fehlt `role[k]`, gilt der Vorschlag aus den Spieldaten – außer es gibt `heal[k] > 0`,
  dann „Heal < x %“ (alte Einstellungen bleiben so, wie sie waren).
- **Bedienung:** das bestehende Auswahlfeld wird zum Rollenfeld; die Zahl (AoE-Schwelle bzw. HP-Grenze) steckt in der
  Option („AoE ab 3“, „Gruppen-Heal < 60 %“). Das Feld heißt `data-rolecfg`, Werte `attack`, `aoe:N`, `atkbuff`,
  `tankbuff`, `atksup`, `defsup`, `utilsup`, `heal:X`, `grpheal:X`; `healtest.js` wird darauf umgestellt. Ein Hinweis
  „(Vorschlag)“ kennzeichnet nicht selbst gesetzte Rollen.
- **Dauerhaft halten** heißt: im Kampf (inkl. eines Boss-Kampfs in der Nähe, wie beim Tamer-Skill `bossFight`), neu
  zünden, wenn der Effekt fehlt oder weniger als ~1 s Restzeit hat. Außerhalb des Kampfs nicht (DS sparen).
- **Gruppen-Heal ersetzt die feste Dungeon-Gruppenheilung** (85 %): Die Rolle gilt überall, nicht nur im Dungeon; für
  Ally-Heals ist der Vorschlag „Gruppen-Heal < 85 %“, damit sich im Dungeon nichts ändert. Der Haken der Taste ist
  Hauptschalter – `grouphealtest.js` (alle Haken aus, trotzdem Heal) wird angepasst.
- **Spiegel-Mitläufer** (`accounts.mirror`, Bot aus) nutzen denselben Planer und zählen bei der Gruppenwahl mit.
- **AoE und Aggro-Schutz:** Bei „AoE ab N“ zählen alle lebenden Gegner im Wirkungskreis; der heutige Aggro-Schutz
  (kein Flächenskill, wenn ein unbeteiligter Gegner getroffen würde) gilt für diese Rolle nicht mehr – das Ziel ist ja,
  mehrere zu treffen. Für die Rolle „Angriff“ bleibt er.
- **Alte Heil-Einstellungen bleiben wirksam:** Heute heilen `healSkill` und `groupHeal` unabhängig vom Haken. Die
  Migration (einmalig je Form) setzt deshalb für jede Taste mit `heal[k] > 0` und für jede Ally-Heal-Taste den Haken
  auf an. Eine Ally-Heal-Taste wird „Gruppen-Heal < x %“ mit x = `heal[k]` falls gesetzt, sonst 85 – die Gruppenprüfung
  schließt das eigene Digimon ein, also geht keine bisherige Heilung verloren. Danach ist der Haken Hauptschalter.
- **„Effekt fehlt“ bei Gruppen-Supports:** neu gezündet wird, wenn der Effekt beim **eigenen** Digimon fehlt oder bei
  der **Mehrheit** der Gruppen-Partner in Reichweite fehlt (bzw. < ~1 s Rest hat). Ein einzelner Partner außer
  Reichweite oder ohne Effekt löst keinen Dauer-Recast aus. Für Gegner-Debuffs (Angriffs-/Def-Support auf den
  Gegner) wird `st.effects[zielId]` geprüft.
- **Effekte auf Gegnern:** Der Spiel-Client übernimmt die Effekte **aller** sichtbaren Entities nach `st.effects`
  (Funktion `iz` im index-*.js, `e.entities.forEach`), also auch die von Mobs. Ob der Server Debuffs auf Mobs
  tatsächlich mitschickt, wird vor dem Bau einmal im Spiel nachgelesen (nur lesen). Kommt dort nichts an, merkt sich
  das zündende Fenster die Laufzeit selbst (`durationMs` ab dem bestätigten Cast) und meldet sie der Gruppe.
- **Angriffs-Buff wartet höchstens kurz:** Ist er nach den 3 s nicht bereit (Abklingzeit), halten die Angriffe nicht an.
  Nach 3 s + höchstens 2 s ohne Buff greifen die Angriffe trotzdem an (z. B. wenn DS fehlen).

## Dem Bauenden überlassen

- Die genaue Wahl für Gruppen-Rollen (Muster Tamer-Wahl oder Gruppenheilung, Klassenschlüssel, Bestätigung über
  `st.effects` oder `evs`), solange die Anti-Ziele eingehalten werden.
- Wie der Planer pfadspezifische Regeln abbildet (Kontext-Parameter je Pfad).
- Texte im Log und in der Statuszeile, Breite des Auswahlfelds.
- Reihenfolge, wenn mehrere Rollen gleichzeitig wollen (Vorschlag: Heal > Gruppen-Heal > Utility > Def-Support >
  Tank-Buff > Angriffs-Buff > Angriffs-Support > AoE/Angriff).
