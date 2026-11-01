# Skill-Rollen und Skill-Planer – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Je Skill-Taste (2–6, je Digitationsform) eine Rolle festlegen; ein zentraler Planer wirkt jeden Skill passend zu seiner Rolle und stimmt Gruppen-Skills zwischen den Bot-Fenstern ab.

**Architecture:** Alles bleibt in `digibot.user.js`. Ein reiner Rollen-Vorschlag (`digibotSkillRoleSuggest`) steht oben bei den anderen reinen Funktionen; im Bot-Closure entscheiden zwei Planer-Funktionen: `skillPick` (gegnerseitige Rollen, von allen vier Angriffspfaden gefragt) und `skillCare` (selbst-/gruppenseitige Rollen, an der heutigen Stelle von `healSkill`/`groupHeal`). Gruppen-Rollen werden über ein Statusfeld `gsk` und eine Beanspruchungs-Nachricht `gskill` nach Wirkungsklasse gewählt.

**Tech Stack:** Tampermonkey-Userscript (Plain JS), Tests mit Node + jsdom über `tests/gw.js` (`node tests/<name>.js digibot.user.js`, Suite `node tests/run.js`).

**Spec:** `docs/superpowers/specs/2026-11-01-skillrollen-design.md`

## Global Constraints

- Antworten, Log- und Statustexte auf Deutsch.
- Im Spiel-Tab nur lesendes JS (kein Klick, kein Spielbefehl, kein Store-Schreiben); keine Spieldateien ausführen.
- Rollen-Werte: `attack`, `aoe` (N = 2–5), `atkbuff`, `tankbuff`, `atksup`, `defsup`, `utilsup`, `heal` (X = 30, 40, 50, 60, 70, 80), `grpheal` (X = 30, 40, 50, 60, 70, 80, 85).
- Angriffs-Buff nur bei Zielen mit `FLAG.Boss`; 3 s nach Kampfbeginn; vor dem ersten Angriffsskill; nie bei Spiegel; höchstens 2 s zusätzliches Warten auf einen nicht bereiten Buff.
- Tank-Buff und Def-Support dauerhaft (nur im Kampf); neu bei fehlendem Effekt oder < 1 s Rest.
- Key of Hope, Davis und Tamer-Skill bleiben eigene Pfade; jeder Planer-Pfad übernimmt die Sperre `kohSoon < KOH_LEAD_MS + 800 + castMs`.
- Haken links = Hauptschalter der Taste (nach der Migration).
- Tests wackeln unter Last: Ausreißer der Suite einzeln nachlaufen lassen; Vergleich mit alter Version per Kopie (`git show HEAD:digibot.user.js > …`), nie `git stash`; keine `_old*.user.js` in `tests/`.
- Commit-Trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; Releases direkt auf `main`.

## Review Focus

1. **Davis-Reset oder kurz nach einem Recast:** Ein Dauer-Buff, dessen Effekt noch läuft, wird nicht erneut gewirkt, auch wenn die Abklingzeit 0 ist (Task 4, Test `skillcaretest` E).
2. **Key of Hope gleich fällig:** Ein Buff oder Heal mit Cast wird nicht gewirkt, wenn `kohSoon` zu knapp ist (Task 4, Test `skillcaretest` F).
3. **Kreisrand/Fernangriff:** Ein Ansturm-Skill mit Rolle Angriff bleibt dort ausgeschlossen, ein Selbst-Buff im Stand ist erlaubt (Task 3, Test `skillrottest` F).
4. **Alte Einstellungen ohne `role`:** „Heal < 50 %“ und die Dungeon-Gruppenheilung verhalten sich wie vorher (Task 1, Test `skillroletest` C/D; Task 5, angepasster `grouphealtest`).
5. **Zurückgehaltener Tastendruck in der Gruppe:** Liefert `bot.hit` `false`, geht keine `gskill`-Beanspruchung hinaus und kein anderes Fenster sperrt sich (Task 5, Test `skillgrptest` C).

---

### Task 1: Rollen-Daten – Vorschlag, Einstellung, Migration

**Files:**
- Modify: `digibot.user.js` – reine Funktion neben `digibotTamerDecision` (~Z. 222); `digibotConfig` (~Z. 165–174); `skillSet`/`skillOn`/`healAt`/`editSkillSet` (~Z. 3638–3645); Migrationsblock im Tick neben der alten `cfg.heal`-Migration (~Z. 10255).
- Test: `tests/skillroletest.js` (neu)

**Interfaces:**
- Produces:
  - `digibotSkillRoleSuggest(def) -> { role: string, n?: number }` – rein, Regeln wie Spec „Vorschlag aus den Spieldaten“; Defaults: AoE `n:2`, Heal `n:50`, Gruppen-Heal `n:85`; `null`/unbekannt → `{ role:'attack' }`; Key of Hope → `{ role:'koh' }`.
  - Datenform `cfg.skillSets[species] = { skills, heal, role:{[k]:string}, aoeN:{[k]:2..5}, grpHeal:{[k]:30..85} }`.
  - `skillRole(st, k) -> { role, n, chosen:boolean }` – gesetzte Rolle, sonst `heal[k]>0` → `{role:'heal', n:heal[k]}`, sonst Vorschlag aus `content().skills[skillOnKey(st,k)?.skill?.id]`; `chosen` = vom Spieler gesetzt.
  - `isAttackRole(st, k) -> boolean` – Rolle `attack` oder `aoe`.
  - `skillRoleMigrate(st) -> boolean` – einmalig je Form (Merker `set.rolesV = 1`): Tasten mit `heal[k]>0` → `skills[k]=true`; Ally-Heal-Tasten (`isAllyHeal`) → `role[k]='grpheal'`, `grpHeal[k] = heal[k] || 85`, `skills[k]=true`, `heal[k]` gelöscht. `true`, wenn etwas geändert wurde (dann `saveCfg()` + Log).

- [ ] **Step 1: Write the failing test** `tests/skillroletest.js` (eine Welt, Partner `clavisangemon` mit Skills auf Tasten 2–6)

  Content-Skills im Test (je `kind/target/shape/effects` wie in der Spec-Tabelle der Spieldaten):
  `aoe` = `{kind:'damage',target:'enemy',shape:'circle',radius:56}`, `selfdef` = `{kind:'buff',target:'self',shape:'single',effects:[{stat:'de',pct:70,durationMs:3e4}]}`, `selfatk` = `{kind:'buff',target:'self',effects:[{stat:'at',pct:30,durationMs:15e3}]}`, `allyheal` = `{kind:'heal',target:'ally',shape:'circle',radius:96,power:870}`, `slow` = `{kind:'debuff',target:'enemy',effects:[{stat:'as',pct:-20,durationMs:12e3}]}`.
  - (Fall A – der Vorschlag im Panel – kommt in Task 2 dazu, weil er das Rollenfeld braucht.)
  - B (Speichern übersteht `saveCfg`): Start-Config `skillSets.clavisangemon.role = {3:'atksup'}`, `aoeN={2:4}`; nach 1,5 s `JSON.parse(localStorage['digibot.cfg']).skillSets.clavisangemon.role['3'] === 'atksup'` und `aoeN['2'] === 4`.
  - C (Migration Heal): alte Config `skills:{4:false}`, `heal:{4:50}` (Taste 4 = `selfatk` umgewidmet als Heal) → danach `skills['4'] === true`, `role` ohne Eintrag 4, `heal['4'] === 50`, `rolesV === 1`.
  - D (Migration Ally-Heal): alte Config `skills:{5:false}`, `heal:{}` → danach `role['5'] === 'grpheal'`, `grpHeal['5'] === 85`, `skills['5'] === true`. Zweiter Lauf mit `heal:{5:60}` → `grpHeal['5'] === 60`, `heal['5']` gelöscht.
  - Ausgabe `OK – Skill-Rollen gespeichert und migriert` / `FEHLER`, Exit-Code 0/1.

- [ ] **Step 2: Run test to verify it fails**

  Run: `node tests/skillroletest.js digibot.user.js`
  Expected: FAIL (B: `role` fehlt nach dem Speichern; C/D: keine Migration)

- [ ] **Step 3: Implement** `digibotSkillRoleSuggest`, die Felder in `digibotConfig` (eigener Prüfer je Feld wie `heals`: `role` nur erlaubte Strings, `aoeN` 2–5, `grpHeal` 30–85, `rolesV` Zahl), `editSkillSet` legt `role:{}, aoeN:{}, grpHeal:{}` an, `skillRole`, `isAttackRole`, `skillRoleMigrate` (Aufruf im Tick direkt nach der alten `cfg.heal`-Migration).

- [ ] **Step 4: Run test to verify it passes**

  Run: `node tests/skillroletest.js digibot.user.js` → `OK – Skill-Rollen gespeichert und migriert`
  Run: `node tests/healtest.js digibot.user.js` → `OK – Heil-Skill nur bei niedrigen HP` (noch unverändert grün)

- [ ] **Step 5: Commit**

```bash
git add digibot.user.js tests/skillroletest.js
git commit -m "Skill-Rollen: Vorschlag aus Spieldaten, Speichern, Migration alter Heil-Einstellungen"
```

---

### Task 2: Rollenfeld im Panel

**Files:**
- Modify: `digibot.user.js` – Panel-HTML „Skills (Tasten 2–6)“ (~Z. 1706–1711), CSS `.digibot__heal` (~Z. 1320), Anzeige je Form im Tick (~Z. 10237–10261), Speicher-Handler `data-healcfg` (~Z. 11079–11089).
- Modify: `tests/healtest.js` (liest künftig `[data-rolecfg="3"]`)
- Test: `tests/skillroletest.js` (Fall A ergänzen)

**Interfaces:**
- Consumes: `skillRole(st,k)`, `digibotSkillRoleSuggest`, `editSkillSet`.
- Produces: `<select data-rolecfg="k">` mit Optionswerten `attack`, `aoe:2`…`aoe:5`, `atkbuff`, `tankbuff`, `atksup`, `defsup`, `utilsup`, `heal:30`…`heal:80`, `grpheal:30`…`grpheal:85`; Klasse `on` bei jeder Rolle ≠ `attack`; Attribut `data-suggested="1"`, solange `chosen` false ist (Anzeige „(Vorschlag)“ im `title`).

- [ ] **Step 1: Write the failing tests**
  - `skillroletest` A: nach 1,5 s `[data-rolecfg="2"].value === 'aoe:2'`, `="3"` → `'tankbuff'`, `="4"` → `'atkbuff'`, `="5"` → `'grpheal:85'`, `="6"` → `'defsup'`; alle mit `data-suggested="1"`. Danach `select.value='aoe:3'` + `input`-Event auf Taste 2 → Config `role['2']==='aoe'`, `aoeN['2']===3`, `data-suggested` weg.
  - `healtest`: `first === 'heal:50'` und nach dem Wechsel zu `garurumon` `otherForm === 'attack'`.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `node tests/skillroletest.js digibot.user.js` → FAIL (kein `data-rolecfg`)
  Run: `node tests/healtest.js digibot.user.js` → FAIL (`first` ist `undefined`)

- [ ] **Step 3: Implement** das Rollenfeld (ersetzt `data-healcfg`), Speichern in `role/aoeN/heal/grpHeal` (bei `heal:X` → `role[k]='heal'`, `heal[k]=X`; bei `attack` → Rolle und Zahl löschen), Log `Skill 3 (Clavisangemon): Tank-Buff`, Anzeige je Form wie heute mit `activeElement`-Schutz und `blur()`. Breite des Feldes so, dass „Gruppen-Heal < 85 %“ passt (Kurztexte erlaubt: „Grp-Heal <85 %“).

- [ ] **Step 4: Run tests to verify they pass**

  Run: `node tests/skillroletest.js digibot.user.js` → OK; `node tests/healtest.js digibot.user.js` → OK

- [ ] **Step 5: Commit**

```bash
git add digibot.user.js tests/skillroletest.js tests/healtest.js
git commit -m "Skill-Rollen: Rollenfeld je Taste im Panel"
```

---

### Task 3: Rotations-Planer für gegnerseitige Rollen

**Files:**
- Modify: `digibot.user.js` – neue Funktionen bei `skillOnKey` (~Z. 3623); Schleifen in Hauptrotation (~Z. 10053–10076), `mirrorAttack` (~5097), `rangedFromOutside` (~2626), `skillsAtEdge` (~2652); `digibotBurstSkill` (~694) und Davis-Zählungen (~725, ~750) auf `isAttackRole`.
- Test: `tests/skillrottest.js` (neu)

**Interfaces:**
- Consumes: `skillRole`, `isAttackRole` (Task 1).
- Produces:
  - `fightMark = { id, at }` und `fightStart(t, now) -> number` – setzt `at=now` nur, wenn `t.id !== fightMark.id` (Aufruf nach erfolgreichem `hit('Digit1')` in der Hauptrotation und in `mirrorAttack`).
  - `enemiesNear(x, y, r) -> number` – lebende, sichtbare Mobs (`KIND.Mob`, nicht Dead/Hidden/Untargetable) im Umkreis; Kreismitte nach `def.origin` (`'caster'` = eigenes Digimon, sonst Ziel); `r = (def.radius ?? 32) + 24`.
  - `effectLeft(entityId, skillId) -> number` – ms Restlaufzeit aus `st.effects[entityId]` für `id === skillId` (`end:0` → `Infinity`), sonst 0.
  - `skillPick(st, now, path, target) -> { k, s, why } | { held: string } | null` mit `path ∈ 'main'|'mirror'|'edge'|'ranged'`. Regeln:
    - `attack`: wie heute; Aggro-Schutz (`digibotSkillAggroReason`) bleibt.
    - `aoe`: nur wenn `enemiesNear(...) >= n` oder `target` hat `FLAG.Boss`; ohne Aggro-Schutz.
    - `atkbuff`: nur bei `FLAG.Boss`; erst ab `fightStart + 3000`; nicht bei `mirrorActive(target.id)` oder `st.boss?.mirror` (für diesen Boss); solange er bereit ist und noch nicht gewirkt wurde, hält er Angriffsskills zurück (`held: 'Angriffs-Buff wartet'`), höchstens bis `fightStart + 5000`; nicht bei normalen Mobs.
    - `atksup`/`defsup` mit `def.target==='enemy'`: nur, wenn `effectLeft(target.id, def.id) < 1000`.
    - Alle anderen Rollen sind hier ausgeschlossen (gehören zu Task 4).
    - Gemeinsame Sperren je Pfad: `skillOn`, `cdLeft`, `unlocked`, DS, `bot.can('Digit'+k, SKILL_GAP_MS*2)`, `kohSoon`-Vorlauf, `skillUnsafe`, kein `isKoh`; `edge`/`ranged` zusätzlich wie heute (kein `dash`, Reichweite), aber Selbst-Buffs (`atkbuff`) im Stand erlaubt.
  - Konstanten: `ATKBUFF_DELAY_MS = 3000`, `ATKBUFF_HOLD_MS = 2000`, `KEEP_LEFT_MS = 1000`.

- [ ] **Step 0: Live-Prüfung (nur lesen) vor dem Bau**

  Im Spiel-Tab (nur `javascript_tool`, lesend) während eines Kampfes mit einem eigenen Gegner-Debuff: `Object.entries(dmo.store.getState().effects).filter(([id])=>id.startsWith('m:'))`. Erwartet: Mob-IDs mit Effekt-Einträgen. Kommt nichts: Ruling ins Ledger und `effectLeft` für Gegner auf eine eigene Laufzeit-Merkliste `{targetId|skillId: end}` (gesetzt nach bestätigtem Cast, `durationMs` aus `def.effects[0]`) umstellen; Test E unverändert.

- [ ] **Step 1: Write the failing test** `tests/skillrottest.js` (Solo-Welt, Partner mit Tasten 2–5, Tastendrücke über `keydown` mitschreiben, Tastendruck setzt den Cooldown wie in `grouphealtest`)
  - A: Taste 2 `aoe:3`, 1 Mob am Ziel → kein `Digit2` in 4 s; dann 3 Mobs im Radius → `Digit2` ≥ 1.
  - B: Ziel mit `flags: 16` (Boss), allein → `Digit2` (AoE) ≥ 1.
  - C: Boss-Ziel, Taste 3 `atkbuff`, Taste 2 `attack`: erster `Digit3` ≥ 2500 ms nach dem ersten `Digit1` und vor dem ersten `Digit2`.
  - D: wie C, aber `telegraphs.mirrors = [{src: boss.id, start:0, tellEnd:0, end: now+4000}]` → kein `Digit3`, solange der Spiegel läuft; danach `Digit3`.
  - E: normaler Mob (kein Boss), Taste 3 `atkbuff` → kein `Digit3` in 5 s, `Digit2` ≥ 1 vor 1,5 s.
  - F: Taste 4 `defsup` (`slow`, Ziel Gegner): nach dem ersten `Digit4` setzt der Test `effects[m:1] = [{id:'x.slow', end: performance.now()+8000}]` → kein weiterer `Digit4` in 6 s, obwohl der Cooldown nach 2 s abläuft; Effekt entfernen → `Digit4` erneut.
  - G (Kreisrand): Taste 2 `attack` mit `dash:true` → am Kreisrand kein `Digit2`; Taste 3 `atkbuff` am Kreisrand gegen einen Boss → `Digit3` ≥ 1.
  - Ausgabe `OK – Skill-Rotation nach Rollen` / `FEHLER`.

- [ ] **Step 2: Run test to verify it fails**

  Run: `node tests/skillrottest.js digibot.user.js` → FAIL (A: AoE wird mit 1 Mob gewirkt; C: Buff nicht zuerst; E: Buff wird gewirkt)

- [ ] **Step 3: Implement** `fightStart`, `enemiesNear`, `effectLeft`, `skillPick` und stelle die vier Schleifen auf `skillPick` um (Status-/`held`-Texte wie heute). `digibotBurstSkill`, `skillsOnCooldown` (Z. ~725) und `dmgWaiting` (Z. ~750) zählen nur noch `isAttackRole`.

- [ ] **Step 4: Run tests to verify they pass**

  Run: `node tests/skillrottest.js digibot.user.js` → OK
  Run: `node tests/edgeskilltest.js digibot.user.js`, `node tests/fix3130mechtest.js digibot.user.js`, `node tests/herd3134test.js digibot.user.js` → jeweils OK

- [ ] **Step 5: Commit**

```bash
git add digibot.user.js tests/skillrottest.js
git commit -m "Skill-Planer: Rotation nach Rollen (AoE ab N, Angriffs-Buff bei Bossen, Gegner-Support halten)"
```

---

### Task 4: Care-Schritt für eigene und Gruppen-Rollen (allein)

**Files:**
- Modify: `digibot.user.js` – `healSkill` (~Z. 3646) und `groupHeal` (~Z. 4039) werden durch `skillCare` ersetzt (Aufrufe im Tick ~Z. 9714–9715 und in `mirrorCare` ~Z. 5069); neue Debuff-Erkennung; der Tamer-Tick (Z. ~720) nutzt dieselbe Erkennung.
- Test: `tests/skillcaretest.js` (neu)

**Interfaces:**
- Consumes: `skillRole`, `effectLeft`, `fightMark`, `KEEP_LEFT_MS` (Task 1, 3).
- Produces:
  - `DEBUFF_STATUS = new Set(['marked','shared','lag','reaper_bubbles','grabbed','dark_tower','reaper','gear_lag','burn','tripped','wounded','silenced','silence_mark'])` und `isDebuff(effect) -> boolean` (Status in der Menge oder `content().skills[effect.id]?.effects?.some(x=>x.pct<0)`).
  - `partyPartners(st, range) -> [{ id, hp, maxHp, me:boolean }]` – eigenes Digimon plus `st.party.members[].partnerEntityId` im Umkreis `range` vom eigenen Digimon (Entities aus `dmo.net.state.entities`).
  - `careWant(st, k, s, now) -> string | null` – Grund, warum Taste k jetzt dran ist:
    - `heal`: eigene HP < n.
    - `grpheal`: ein Partner aus `partyPartners(st, (def.range||128)+(def.radius||96))` < n.
    - `tankbuff`: im Kampf (`inCombat(st)` oder Boss-Kampf in der Nähe wie `bossFight` im Tamer-Tick) und `effectLeft(eigenesDigimon, def.id) < KEEP_LEFT_MS`.
    - `defsup`/`atksup` mit `def.target !== 'enemy'`: im Kampf und Effekt fehlt beim eigenen Digimon **oder** bei mehr als der Hälfte der Partner in Reichweite (< `KEEP_LEFT_MS`).
    - `utilsup`: ein Partner in Reichweite hat `isDebuff`.
  - `skillCare(st, now) -> string | null` – erste Taste mit Grund in der Reihenfolge `heal > grpheal > utilsup > defsup > tankbuff > atksup`; Sperren: `skillOn`, `cdLeft`, `unlocked`, DS, `bot.can('Digit'+k, SKILL_GAP_MS*2)`, `bot.can('skill', SKILL_GAP_MS)`, `kohSoon`-Vorlauf, kein `isKoh`; drückt `bot.hit` und setzt `lastPress.skill` nur bei Erfolg. Gruppen-Rollen gehen in Task 5 durch die Wahl; in diesem Task zündet das Fenster allein.

- [ ] **Step 1: Write the failing test** `tests/skillcaretest.js` (Solo-Welt mit Party-Partner-Entity `p:ally` neben dem eigenen Digimon)
  - A: Taste 2 `heal:50`, eigene HP 33 % → `Digit2` ≥ 1; HP 90 % → keiner.
  - B: Taste 3 `grpheal:60`, eigene HP 100 %, `p:ally` 40 % → `Digit3` ≥ 1; `p:ally` 80 % → keiner.
  - C: Taste 4 `tankbuff`, im Kampf, kein Effekt → `Digit4`; Effekt `{id: def.id, end: now+20000}` → kein weiterer `Digit4` in 5 s.
  - D: Taste 5 `utilsup`, `effects['p:ally'] = [{id:'wounded', end: now+5000}]` → `Digit5` ≥ 1; ohne Debuff → keiner.
  - E (Davis-Fall): Taste 4 `tankbuff` mit Cooldown 0 und laufendem Effekt (Rest 10 s) → kein `Digit4` in 3 s.
  - F (KoH gleich fällig): Taste 4 `tankbuff` mit `castMs: 1200`, Gruppe aktiv, eigener Key of Hope auf Taste 6, Boss-Angriff in 1,5 s angekündigt → kein `Digit4`, bis der Key gezündet ist.
  - G (außerhalb des Kampfs): Taste 4 `tankbuff`, kein Kampf → kein `Digit4`.
  - Ausgabe `OK – Heals, Dauer-Buffs und Support nach Rollen` / `FEHLER`.

- [ ] **Step 2: Run test to verify it fails**

  Run: `node tests/skillcaretest.js digibot.user.js` → FAIL (B: Gruppen-Heal außerhalb des Dungeons fehlt; C/D: keine Dauer-Buffs/Cleanse)

- [ ] **Step 3: Implement** `DEBUFF_STATUS`, `isDebuff`, `partyPartners`, `careWant`, `skillCare`; ersetze die Aufrufe von `healSkill`/`groupHeal`; der Tamer-Tick nutzt `isDebuff` statt `stunMs`/`rootMs`.

- [ ] **Step 4: Run tests to verify they pass**

  Run: `node tests/skillcaretest.js digibot.user.js` → OK; `node tests/healtest.js digibot.user.js` → OK

- [ ] **Step 5: Commit**

```bash
git add digibot.user.js tests/skillcaretest.js
git commit -m "Skill-Planer: Heals, Gruppen-Heal, Dauer-Buffs, Support und Cleanse nach Rollen"
```

---

### Task 5: Gruppenwahl für Gruppen-Rollen

**Files:**
- Modify: `digibot.user.js` – `groupState` (~Z. 4570–4588), `groupSig` (~Z. 4546), `digibotCore.accept`-Positivliste (~Z. 103), `onGroupMsg` (~Z. 4519–4544); `skillCare` (Task 4) **und** die Gegner-Supports in `skillPick` (Task 3, `atksup`/`defsup` mit `def.target==='enemy'`) bekommen die Wahl; alte `healState`/`'heal'`-Nachricht und `healReadyAt`/`healRank` entfallen.
- Modify: `tests/grouphealtest.js` (Haken an, Rolle `grpheal:85`)
- Test: `tests/skillgrptest.js` (neu)

**Interfaces:**
- Consumes: `skillCare`, `careWant` (Task 4).
- Produces:
  - `skillClass(st, k) -> string | null` – Wirkungsklasse für Gruppen-Rollen: `grpheal` → `'heal'`; `utilsup` → `'cleanse'`; `defsup`/`atksup` → `'def:'+statsKey` bzw. `'atk:'+statsKey` (`statsKey` = sortierte Stats der `effects`, bei Gegner-Debuff zusätzlich `'@enemy'`); Selbst-Rollen → `null`.
  - Statusfeld `gsk: { [cls]: { ready: number /*Date.now()-Zeitpunkt*/, want: boolean } }` (nur Zahlen/Booleans; in `groupSig` aufgenommen).
  - Nachricht `{ type:'gskill', slot, cls, at, mapId }` – erst nach `bot.hit(...) !== false` senden; Empfänger merkt `gskClaims.set(cls, {at, slot})`.
  - `gskWinner(st, cls, now) -> boolean` – true, wenn kein frischer Peer (gleiche Map, `m.bot || accounts.mirror`, `fresh`) mit kleinerem Slot `gsk[cls].want && ready <= now` meldet und keine Beanspruchung jünger als `GSK_COVER_MS = 2500` vorliegt; vorher `600 + slot*150` ms eigene Absicht melden (Muster Tamer-Wahl).
  - Spiegel-Mitläufer (`accounts.mirror`, Bot aus) melden `gsk` und zählen mit.

- [ ] **Step 1: Write the failing tests**
  - `tests/skillgrptest.js` (drei Fenster wie `grouphealtest`, Party mit drei Partnern):
    - A: Fenster 0 und 1 haben Taste 2 `defsup` (gleicher Skill), Kampf läuft, Effekt fehlt überall → genau **ein** `Digit2` über beide Fenster innerhalb von 3 s (Fenster 0).
    - B: Effekt nach 6 s bei der Mehrheit entfernt → wieder genau ein `Digit2` (beliebiges Fenster).
    - C: In Fenster 0 hält `press` die Taste zurück (`dmo.client.skillQueue.queued = true`) → keine `gskill`-Nachricht von Fenster 0, Fenster 1 zündet nach seiner Wartezeit.
    - D: zwei Fenster mit `grpheal:60`, Partner `p:imp` bei 40 % → genau ein `Digit` (Heal) in 2,5 s.
    - E: zwei Fenster mit Taste 3 `defsup` als Gegner-Debuff (`slow`) auf denselben Boss, Effekt fehlt → genau ein `Digit3` in 3 s.
  - `grouphealtest.js`: Config auf `skills:{2:true,3:true}`, `role:{2:'grpheal'}`, `grpHeal:{2:85}`; Erwartungen unverändert (eine Clavis heilt zuerst, die zweite erst nach der Deckungszeit).

- [ ] **Step 2: Run tests to verify they fail**

  Run: `node tests/skillgrptest.js digibot.user.js` → FAIL (A: zwei `Digit2`)
  Run: `node tests/grouphealtest.js digibot.user.js` → FAIL oder OK; Ergebnis notieren (Rolle wird erst jetzt abgestimmt)

- [ ] **Step 3: Implement** `skillClass`, `gsk` im Status, `gskill`-Nachricht (Positivliste, `onGroupMsg`), `gskWinner`, Einbau in `skillCare` für Gruppen-Rollen; alte Heal-Abstimmung entfernen.

- [ ] **Step 4: Run tests to verify they pass**

  Run: `node tests/skillgrptest.js digibot.user.js` → OK; `node tests/grouphealtest.js digibot.user.js` → OK; `node tests/kohflaretest.js digibot.user.js`, `node tests/kohgathertest.js digibot.user.js` → OK

- [ ] **Step 5: Commit**

```bash
git add digibot.user.js tests/skillgrptest.js tests/grouphealtest.js
git commit -m "Skill-Planer: Gruppen-Skills nach Wirkungsklasse abstimmen (ein Fenster zündet)"
```

---

### Task 6: Release 3.1.43

**Files:**
- Modify: `digibot.user.js` (Z. 4 `@version`, Fallback ~Z. 1622), `CHANGELOG.md`, Panel-Hilfetext der Skill-Gruppe (Rollen kurz erklärt).

- [ ] **Step 1:** Version 3.1.43 an beiden Stellen; CHANGELOG-Abschnitt „## 3.1.43 – Skill-Rollen“ mit je einem Punkt für Rollen/Vorschlag, Rotation, Dauer-Buffs/Support/Heals, Gruppenabstimmung, Migration.
- [ ] **Step 2:** Suite: `node tests/run.js > <scratchpad>/suite.log 2>&1; tail -2 <scratchpad>/suite.log` → `N/N grün`; jeden `FAIL` einzeln nachlaufen lassen → OK.
- [ ] **Step 3: Commit und Push**

```bash
git add digibot.user.js CHANGELOG.md
git commit -m "3.1.43: Skill-Rollen – Angriff, AoE, Buffs, Support, Heals je Taste, Gruppen-Skills abgestimmt"
git push origin main
```
