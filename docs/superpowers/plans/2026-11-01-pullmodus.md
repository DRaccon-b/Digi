# Pull-Modus (Monster sammeln) – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Schalter im Reiter Attacke lässt den Bot mehrere Monster innerhalb der Leine des ersten anspielen (bis zur Höchstzahl), danach gesammelt mit AoE und Einzelzielen kämpfen.

**Architecture:** Alles in `digibot.user.js`. Ein Zustand `pull` im Bot-Closure und eine Funktion `pullPick(st, sc, now)` greifen in `pickTarget` vor die Angreifer-Wahl ein; `skillPick` hält Angriffsskills zurück, solange gesammelt wird, und senkt die AoE-Schwelle danach. Die Gruppe bekommt ein Statusfeld `pulling`, damit Mitläufer den wechselnden Zielen nicht folgen.

**Tech Stack:** Tampermonkey-Userscript (Plain JS); Tests mit Node + jsdom über `tests/gw.js` (`node tests/<name>.js digibot.user.js`, Suite `node tests/run.js`).

**Spec:** `docs/superpowers/specs/2026-11-01-pullmodus-design.md`

## Global Constraints

- Texte auf Deutsch.
- Im Spiel-Tab nur lesendes JS; keine Spieldateien ausführen.
- Einstellungen: `cfg.pull` (bool, Standard `false`), `cfg.pullMax` (2–8, Standard 3), `cfg.pullHp` (30–90 %, Standard 60).
- Leine = `content().digimon[art].mob.leashRange`, fehlt sie: 240 px; Sicherheitsabstand `PULL_MARGIN = 40` px; Notbremse `PULL_MAX_MS = 12000`; Boss-Sperre `PULL_BOSS_SOON_MS = 30000`.
- Anker = `mobHome.get(id)` des ersten Monsters, sonst seine Position beim ersten Treffer.
- Ein Treffer mit Taste 1 genügt („angespielt“ = Monster in `sc.attackers` oder `targetId` = Partner/Tamer eines Gruppenmitglieds).
- Elites dürfen gesammelt werden; Bosse/Named (`cat` boss/`mapBoss`/`FLAG.Boss`), fremd bekämpfte (`taken`) nicht.
- Tests wackeln unter Last: Ausreißer einzeln nachlaufen; Vergleich mit alter Version per Kopie, nie `git stash`; keine `_old*.user.js` in `tests/`.
- Commit-Trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; Push auf `main` erst nach dem Abschlussreview.

## Review Focus

1. **Erstes Ziel war schon ein Angreifer (aggressives Monster lief an):** Der Kreis liegt um `mobHome`, nicht um die aktuelle Position (Task 2, Test `pulltest` F).
2. **Zweites Monster steht knapp außerhalb `leash − 40` vom Anker:** wird nicht angespielt (Task 2, Test `pulltest` B).
3. **HP fallen beim Sammeln unter die Grenze:** kein weiteres Monster, Kampf mit den vorhandenen (Task 2, Test `pulltest` C).
4. **Boss sichtbar oder gleich fällig in der Boss-Rotation:** kein Sammeln (Task 2, Test `pulltest` G).
5. **Gruppe:** Mitläufer übernehmen die wechselnden Ziele des sammelnden Leaders nicht (Task 3, Test `pullgrptest` A).

---

### Task 1: Einstellungen und Schalter

**Files:**
- Modify: `digibot.user.js` – cfg-Standardwerte (bei den anderen Attacke-Werten, ~Z. 1380–1440), `digibotConfig` `bounds` (~Z. 162), Reiter Attacke Gruppe „Zielwahl“ (~Z. 1750–1760).
- Test: `tests/pullcfgtest.js` (neu)

**Interfaces:**
- Produces: `cfg.pull`, `cfg.pullMax`, `cfg.pullHp`; Panel-Elemente über `check('pull', 'Monster sammeln (Pull)', <Hilfetext>)`, `slider('pullMax', 'Sammeln: höchstens', 2, 8, (v) => \`${v} Monster\`)`, `slider('pullHp', 'Sammeln: nur über HP', 30, 90, (v) => \`${v} %\`)`.

- [ ] **Step 1: Write the failing test** `tests/pullcfgtest.js`: Welt starten mit `digibot.cfg = { pull: true, pullMax: 12, pullHp: 10 }`, Reiter `attack`. Nach 1 s: gespeicherte Config hat `pull === true`, `pullMax === 8`, `pullHp === 30`; Panel hat `[data-cfg="pull"]` (checked) sowie Regler für `pullMax`/`pullHp`. Zweiter Lauf ohne diese Schlüssel: `pull === false`, `pullMax === 3`, `pullHp === 60`. Ausgabe `OK – Pull-Einstellungen` / `FEHLER`.
- [ ] **Step 2:** `node tests/pullcfgtest.js digibot.user.js` → FAIL (Schlüssel fehlen).
- [ ] **Step 3: Implement** die drei Schlüssel mit Grenzen `pullMax:[2,8]`, `pullHp:[30,90]` in `bounds`, Schalter und Regler im Reiter Attacke (Hilfetext: „Spielt bis zur Höchstzahl weitere Monster innerhalb der Leine des ersten an, dann AoE und Einzelziele. Nicht bei Bossen, im Dungeon/Raid und wenn ein Boss gleich fällig ist.“).
- [ ] **Step 4:** `node tests/pullcfgtest.js digibot.user.js` → OK.
- [ ] **Step 5: Commit** `git add digibot.user.js tests/pullcfgtest.js && git commit -m "Pull-Modus: Schalter, Höchstzahl, HP-Grenze"`

---

### Task 2: Sammeln in der Zielwahl (allein)

**Files:**
- Modify: `digibot.user.js` – neuer Block bei `pickTarget` (~Z. 9083); Aufruf in `pickTarget` direkt vor `const att = sc.attackers…` bzw. vor `if (att.length) return att[0];`; `skillPick` (Skill-Planer, ~Z. 3740) für das Zurückhalten und die AoE-Schwelle; Status-Text in der Hauptrotation.
- Test: `tests/pulltest.js` (neu)

**Interfaces:**
- Consumes: `cfg.pull/pullMax/pullHp` (Task 1); `mobHome` (Map Entity-ID → `{x,y,t}`, ~Z. 4268); `scan()`-Mobs mit `{id, species, cat, mapBoss, x, y, pd, attacker, taken, banned, reach, enabled, inLvl}`; `usable(m)`; `farm.known` (`{up, readyAt}`); `enemiesNear` und `skillPick` aus 3.1.43.
- Produces:
  - `pull = { on:false, anchor:null, leash:0, startAt:0, ids:new Set() }` und `pullReset()`.
  - `pullBlocked(st, sc, now) -> string|null` – Grund, warum nicht gesammelt wird: Schalter aus · `cfg.dungeon`/`dungeonLike(st)` · Ruhemodus · Mitläufer in der Gruppe · Boss/Named sichtbar (`sc.mobs` mit `cat==='boss'||mapBoss`) · `cfg.farm` mit `farmMode` boss/named und ein `farm.known`-Eintrag der aktuellen Map ist `up` oder `readyAt - now <= PULL_BOSS_SOON_MS` · Event-/Weltboss-Fokus aktiv.
  - `pullInLeash(m) -> boolean` – Monster und Weg im Schnitt der Leinen-Kreise: `hypot(m.x - a.x, m.y - a.y) <= leash - PULL_MARGIN` für den Anker **und** für den `mobHome` jedes schon gesammelten (mit dessen Leine).
  - `pullPick(st, sc, now) -> mob|null` – nächstes Anspiel-Ziel oder `null` (dann normale Wahl). Startet die Runde beim ersten Angreifer (Anker = `mobHome` des ersten), zählt gesammelte = `sc.attackers` (plus Gruppen-Angreifer, Task 3), endet bei `count >= cfg.pullMax`, HP < `cfg.pullHp`, `now - startAt > PULL_MAX_MS` oder ohne Kandidat; Kandidat = nächstes `usable(m)` (kein Boss/Named, nicht `taken`, nicht schon Angreifer) mit `pullInLeash(m)`, nach Wegelänge `pd` sortiert. Runde vorbei (keine Angreifer mehr) → `pullReset()`.
  - `pull.on` = gerade wird gesammelt; `pull.done` = Runde fertig gesammelt, `pull.count` = Zahl der gesammelten.
  - In `skillPick`: solange `pull.on`, liefern Rollen `attack`/`aoe` `{ held: 'Sammle Monster – Skills warten' }`; nach dem Sammeln gilt für `aoe` `n = Math.max(2, Math.min(ro.n, pull.count))`.

- [ ] **Step 1: Write the failing test** `tests/pulltest.js` (Solo-Welt, Monster mit `hp: 90000`, Tastendrücke mitschreiben, `scene.select` mitschreiben; Taste 1 setzt in `gw` `targetId = 'p:me'`; Monster-Art `kunemon` mit `content.digimon.kunemon.mob.leashRange = 240`)
  - A: Pull an, max 3, drei Monster bei (430,330), (470,360), (500,300) → die ersten drei gewählten IDs sind drei verschiedene Monster, und vor dem dritten Treffer gibt es keinen `Digit2` (Taste 2 = Angriffsskill).
  - B: zweites Monster bei Anker + (230,0) (außerhalb 240 − 40) → wird nie gewählt, solange gesammelt wird.
  - C: nach dem ersten Treffer HP auf 50 % (Grenze 60) → kein zweites Monster gewählt; `Digit2` kommt.
  - D: max 2 bei drei Monstern → genau zwei gewählt, dann Kampf.
  - E: Pull aus → das erste Monster bleibt Ziel, bis es tot ist (Verhalten wie bisher).
  - F: erstes Monster ist schon Angreifer und steht 100 px von seinem `mobHome` weg; ein zweites liegt 180 px von `mobHome`, aber 260 px von der aktuellen Position → wird gewählt (Kreis um `mobHome`).
  - G: `cfg.farm`, `farmMode:'boss'`, ein Monster mit `flags: 16` in Sicht → kein Sammeln (nur ein Ziel bis zum Tod).
  - Ausgabe `OK – Pull-Modus sammelt in der Leine` / `FEHLER`.
- [ ] **Step 2:** `node tests/pulltest.js digibot.user.js` → FAIL (A: zweites Ziel erst nach dem Tod des ersten).
- [ ] **Step 3: Implement** `pull`, `pullReset`, `pullBlocked`, `pullInLeash`, `pullPick`, den Aufruf in `pickTarget` (vor der Angreifer-Wahl: `const pp = pullPick(st, sc, now); if (pp) return pp;`), das Zurückhalten in `skillPick` und die AoE-Schwelle; `pullReset()` bei Map-Wechsel, Bot-Stopp und Bewusstlosigkeit. Status `Sammle 2/3: <Name>`.
- [ ] **Step 4:** `node tests/pulltest.js digibot.user.js` → OK; `node tests/skillrottest.js digibot.user.js`, `node tests/healtest.js digibot.user.js` → OK.
- [ ] **Step 5: Commit** `git add digibot.user.js tests/pulltest.js && git commit -m "Pull-Modus: Monster in der Leine des ersten sammeln, dann AoE"`

---

### Task 3: Gruppe

**Files:**
- Modify: `digibot.user.js` – `groupState` (~Z. 4790) und `groupSig`; `groupAssist` (~Z. 5093) und der Ziel-Abgleich der Mitläufer; Zählung in `pullPick`.
- Test: `tests/pullgrptest.js` (neu)

**Interfaces:**
- Consumes: `pull` (Task 2).
- Produces: Statusfeld `pulling: boolean` (in `groupSig`); Mitläufer: `groupAssist` liefert `null`, solange der Leader `pulling` meldet (Mitläufer wehren sich und folgen); `pullPick` zählt zusätzlich Monster mit `targetId` = Partner-/Tamer-Entity eines frischen Gruppenmitglieds (`group.peers[].ents`).

- [ ] **Step 1: Write the failing test** `tests/pullgrptest.js` (Leader + Mitläufer, je eigener Prozess je Fall wie `skillgrptest`)
  - A: Leader sammelt (Testbus meldet `pulling: true` und wechselnde `targetId`) → Mitläufer wählt keines der Leader-Ziele, solange `pulling` gilt; danach greift er das Ziel des Leaders an.
  - B: ein Monster greift den Mitläufer an (`targetId` = dessen Partner-Entity) → der Leader zählt es: bei max 2 und einem eigenen Angreifer spielt er kein weiteres an.
  - Ausgabe `OK – Pull-Modus in der Gruppe` / `FEHLER`.
- [ ] **Step 2:** `node tests/pullgrptest.js digibot.user.js` → FAIL.
- [ ] **Step 3: Implement** `pulling` im Status, Abfrage in `groupAssist`/Ziel-Abgleich, Gruppen-Zählung in `pullPick`.
- [ ] **Step 4:** `node tests/pullgrptest.js digibot.user.js` → OK; `node tests/grouptest.js digibot.user.js`, `node tests/grpnexttest.js digibot.user.js`, `node tests/servetest.js digibot.user.js` → OK.
- [ ] **Step 5: Commit** `git add digibot.user.js tests/pullgrptest.js && git commit -m "Pull-Modus: Mitläufer folgen dem sammelnden Leader nicht"`

---

### Task 4: Release 3.1.44

**Files:** `digibot.user.js` (Z. 4 `@version`, Fallback ~Z. 1622), `CHANGELOG.md`.

- [ ] **Step 1:** Version 3.1.44 an beiden Stellen; CHANGELOG „## 3.1.44 – Pull-Modus“ (Schalter, Ablauf, Leine des ersten, Sperren, Gruppe).
- [ ] **Step 2:** Suite `node tests/run.js > <scratchpad>/suite.log 2>&1; tail -1` → alle grün bzw. Ausreißer einzeln grün.
- [ ] **Step 3: Commit** `git commit -am "3.1.44: Pull-Modus – Monster in der Leine des ersten sammeln, dann AoE"`; Push nach dem Abschlussreview.
