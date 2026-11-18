# Rift-Gruppe mit Rollen – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Im Digital Rift spielt eine Gruppe eigener Accounts mit manuell zugewiesenen Rollen (Tank/DD/Heiler): Mitläufer folgen dem Leader, der Leader sagt das Ziel an, der Tank greift zuerst an, alle anderen erst, wenn das Ziel den Tank angreift.

**Architecture:** Alles in `digibot.user.js`. Rolle je Account in `accounts.list[i].role` (geteilt über `localStorage['digibot.accounts']`), Auswahl auf der Gruppenkarte. Ansage als Feld `callId` im Gruppen-Zustand (`groupState`/`groupSig`, kein neuer Nachrichtentyp). Mitläufer-Sonderweg in `riftOutside`/`riftStep`. Zielwahl über `pickTarget`/`focus` im Takt, Sperre direkt vor dem Angriffsblock in `bot.tickBody`. Ein neuer Mehrfenster-Test mit geteilter Rift-Welt.

**Tech Stack:** Userscript (Vanilla JS), Node + jsdom, `worker_threads.BroadcastChannel` als Gruppen-Bus in Tests.

**Spec:** `docs/superpowers/specs/2026-11-18-rift-gruppe-rollen-design.md`

## Global Constraints

- Deutsch in allen Status-/Log-Texten. Version **3.2.32** (Kopfzeile `// @version      3.2.32` und Fallback `'3.2.31'` → `'3.2.32'` in der `.ver`-Zeile), CHANGELOG „## 3.2.32 – Digital Rift: Gruppe mit Rollen (Tank, DD, Heiler)“.
- Nur im Rift-Modus (`cfg.dungeon && cfg.dgMode === 'rift'` und `riftMap(mapId)` bzw. Rift-Außenbereich). Andere Modi und Solo-Rift unverändert.
- Ohne zugewiesenen Tank (alle DD = Standard) verhält sich die Gruppe im Rift wie mit 3.2.31 – **außer** dem Folgen (Ziel 5 der Spec, gilt für Mitläufer im Rift immer, wenn ein frischer Leader-Bot im Dungeon-Modus da ist).
- Startwerte: Sicherheitsnetz `RIFT_TANK_WAIT_MS = 4000`, Heiler-Abstand `RIFT_HEAL_BACK = 90` px, Tank gilt als aktiv nur wenn frisch (`fresh`), `bot`, `inWorld`, gleiche `mapId` und `channel` wie ich, `hp > 0`.
- Ausweichen, Erholen, Event-Aufbruch gehen weiter vor (laufen im Takt vor der Sperre). Wer selbst angegriffen wird (`self`), darf sich immer wehren.
- Tests aus `tests/`, Suite `JOBS=8 TIMEOUT=400 node run.js`; während eines Suite-Laufs nichts ändern; bekannte Wackler einzeln nachprüfen (addhptest rot auch alt; fix3130grindtest, fix3130mechtest, grpnexttest, huntendtest, skillrottest, dungeontest, kohgathertest unter Last).
- Commits mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, direkt auf main, Push nur nach „Ja, pushen“. Untracked `chrome.bat`, fremde `docs/*.md`, `sprites/` nicht anfassen.

## Rulings

- Ruling: Kampfrolle heißt im Code `fight` (`accounts.list[i].fight: 'tank'|'dd'|'healer'`), nicht `role` — `role` ist im Gruppen-Zustand schon leader/follower — Kosten falls falsch: nur Benennung.
- Ruling: Heiler-Aufstellung = Folge-Anker ist der Tank statt des Leaders, Zielpunkt 90 px hinter dem Tank auf der Linie Ansage-Ziel→Tank (ohne Ansage: Linie Leader→Tank) — einfach, live justierbar — Kosten: evtl. ungünstige Seite bei Zonen (Zonen-Check bleibt, Ausweichen geht vor).
- Ruling: Mitläufer-Folgen nutzt die Leader-Entity in der eigenen Welt (`entities.get(L.ents[1])`, sonst `L.x/L.y`) und `walkTo`, kein `travel`/Kanalwechsel im Rift.

## Review Focus

1. Tank-Fenster stirbt/lädt neu mitten im Kampf → DD/Heiler/Leader dürfen nicht stehen bleiben (Tank nicht mehr aktiv → keine Sperre) (Test G-T).
2. Ziel greift nie den Tank an (z. B. greift einen DD an) → nach 4 s greifen alle an; der angegriffene DD wehrt sich sofort (`self`) (Test G-N, G-S).
3. Mitläufer ohne Party/ohne Leader-Bot öffnet keinen eigenen Rift, solange ein frischer Leader da ist; ist der Leader weg, verhält er sich wie solo (Test G-O).
4. Zwei Tanks gewählt → nur der zuletzt gewählte bleibt Tank (Test G-U).
5. Kartenneubau im Gruppen-Reiter schließt den offenen Rollen-Select nicht (kein Neubau, solange der Fokus in den Karten liegt) (Test G-U prüft Wert nach mehreren Render-Takten).

---

### Task 1: Kampfrolle je Account, Anzeige und Auswahl

**Files:** Modify `digibot.user.js` (`reloadAcc`/`saveAcc` ~1725–1742; `renderGroupCards` ~12559; Input-Handler ~12880–12933). Create `tests/riftgrouptest.js` (Teil `ui`).

**Interfaces – Produces:**
- `accounts.list[i].fight ∈ {'tank','dd','healer'}` (Default `'dd'`, in `reloadAcc` validiert, in `saveAcc` gespeichert).
- `const fightOf = (slot) => accounts.list[slot]?.fight || 'dd'`.
- `function tankSlot() -> number` (−1 ohne Tank; erster `on`-Eintrag mit `fight==='tank'`).
- Karte: `<select data-accfight="${i}">` mit Optionen `tank`„Tank“, `dd`„DD“, `healer`„Heiler“ im Karten-Header; `renderGroupCards` baut nicht neu, solange `box.contains(activeElement)`.
- Handler `[data-accfight]`: `reloadAcc(); setze fight; bei 'tank' alle anderen tank → 'dd'; saveAcc(); blur; logEvent('bot', \`Gruppe: ${name} ist ${Rolle}\`); schedule()`.

- [ ] **Step 1: Test schreiben** — `tests/riftgrouptest.js` mit Prozess-Aufteilung nach `grpdist3138test.js` (`node riftgrouptest.js <script> [teil]`, ohne Teil startet es alle Teile als Kindprozesse und sammelt `OK/FEHLER`). Teil `ui`: ein Fenster (Welt aus `riftzieltest.js` `world()` kopiert + `#dbslot=0`, `digibot.accounts` mit 3 Einträgen `{on:true,user,char}` ohne `fight`), Reiter Gruppe öffnen. **G-U:** 3 Selects mit Wert `dd`; Select 1 auf `tank` (change-Event) → gespeichert `fight:'tank'`; dann Select 2 auf `tank` → Eintrag 1 `dd`, 2 `tank`; nach 3 s (mehreren Render-Takten) zeigt Select 2 noch `tank`.
- [ ] **Step 2: rot** — `cd tests && node riftgrouptest.js ../digibot.user.js ui` → `FEHLER G-U`.
- [ ] **Step 3: implementieren** wie Interfaces.
- [ ] **Step 4: grün**; außerdem `node grouptest.js ../digibot.user.js` und `node fix3130grouptest.js ../digibot.user.js` grün (Accounts-Format).
- [ ] **Step 5: Commit** `3.2.32: Gruppe – Kampfrolle je Account`

### Task 2: Mehrfenster-Rift-Welt und Mitläufer folgen dem Leader

**Files:** Modify `digibot.user.js` (`riftOutside` ~10346, `riftStep` ~10218, neuer Helfer). Test `tests/riftgrouptest.js` (Teil `follow`).

**Interfaces – Consumes:** `groupLeader(now)`, `groupLeaderMode()`, `followDist()`, `walkTo`.
**Produces:**
- `function riftFollower(now) -> object|null` — Leader-Zustand `L`, wenn `group.role()==='follower' && !accounts.mirror && L.bot && L.mode === 'dungeon'`; sonst `null`.
- `riftOutside`: bei `riftFollower` → kein `talk`/`chooseDialog`/`riftEnter`/Brot/Scan; offenen Rift-Dialog/-Fenster schließen; zur Clockmon-Map reisen und in `followDist()` beim Leader (bzw. bei Clockmon, wenn Leader nicht auf der Map) stehen; Status `Rift: warte, bis ${L.name} den Rift öffnet`.
- `riftStep`: bei `riftFollower` und gleicher `mapId` → `result` → `riftAfter` wie bisher, Patch-Wahl wie bisher, Erholen wie bisher; **kein** Erkunden, kein Portal/`riftDescend`, kein Alpha-/Guardian-Lauf, kein eigenes Aufgeben (`RIFT_GIVEUP_MS`/`noRunAt` nur, wenn kein frischer Leader); stattdessen `riftFollowStep(st, L, now)`: Anker = Leader-Entity (`entities.get(L.ents[1]) || {x:L.x,y:L.y}`), `walkTo` wenn Abstand > `followDist()`, Status `Rift: folge ${L.name}`.

- [ ] **Step 1: Test-Welt** — in `riftgrouptest.js` `groupWorld(n, opts)`: n jsdom-Fenster aus der kopierten Rift-Welt mit Slot-IDs `t:<s>`/`p:<s>` statt `t:me`/`p:me`, `#dbslot=<s>`, `w.BroadcastChannel = require('worker_threads').BroadcastChannel`, gemeinsame `accounts` in jedes Fenster vor `eval`, gemeinsamer Rift-Zustand `rs`/`floor` und eine gemeinsame Gegner-Map (dieselben Objekte in jeder `ents`-Map, dazu Tamer/Partner der anderen Fenster). `riftEnter`/`riftDescend` nur vom Leader (Slot 0) wirksam und laden die Rift-Map in **allen** Welten (Party wird mitgenommen); `view.party` mit `iLead` true nur im Leader-Fenster; `store.party = {id:'P', members:[…partnerEntityId:'p:'+i]}`. Je Fenster Zähler `sent` (talk/open/enter/descend/leave) und `keys` (Digit1 mit Zeit und Ziel-ID). `Digit1` des Fensters s auf Gegner m: Schaden wie bisher, setzt `m.targetId = 'p:'+s` nur, wenn `m.targetId` leer ist (Schalter `aggro: 'first'|'never'|'slot:<s>'`).
- [ ] **Step 2: Tests** — Teil `follow`, 2 Fenster (0 Leader DD, 1 Mitläufer DD), Start im Leader-Fenster. **G-O:** Mitläufer sendet nie `talk`/`riftEnter`; Leader betritt; beide auf der Rift-Map. **G-F:** im Rift läuft der Leader zu einer Zelle 500 px weg → Mitläufer-Partner ist nach ≤ 6 s höchstens `followDist()+40` px vom Leader; Mitläufer sendet kein `riftDescend`. **G-L:** Leader-Fenster schließen (Bot aus/Fenster zu) → Mitläufer verhält sich nach > 6 s wie solo (darf wieder erkunden; Status ohne „folge“).
- [ ] **Step 3: rot** → `FEHLER G-O` (Mitläufer öffnet eigenen Rift).
- [ ] **Step 4: implementieren** wie Interfaces.
- [ ] **Step 5: grün**; `node rifttest.js ../digibot.user.js` und `node riftzieltest.js ../digibot.user.js` grün.
- [ ] **Step 6: Commit** `3.2.32: Rift – Mitläufer folgen dem Leader`

### Task 3: Ansage, Tank zuerst, Sperre für alle anderen

**Files:** Modify `digibot.user.js` (`scan` ~4955/4960; `groupState` ~5291, `groupSig` ~5259; `spreadOn` ~5360; `pickTarget` ~10630; `focus` im Takt ~11748; vor Block 4 „Hängen-Erkennung“ ~11855). Test Teil `tank`.

**Interfaces – Produces:**
- `scan`: jeder Mob-Eintrag zusätzlich `self: mine.has(e.targetId)`.
- `function riftTank(st, now) -> { slot, ents:string[], me:boolean, peer } | null` — Tank aktiv laut Global Constraints; `me` wenn `group.slot() === tankSlot()` (dann aus eigenem Zustand).
- `group.call = { id, at } | null`; `groupState.callId = group.call?.id ?? null` (nur Leader), in `groupSig` aufnehmen. Leader setzt `group.call` aus seinem Rift-Fokus, wenn `riftTank()` aktiv ist; löscht es, wenn das Ziel tot/weg ist.
- `function riftCallId(now) -> string|null` — Leader: `group.call?.id`; Mitläufer: `groupLeader(now)?.callId`.
- Zielwahl im Rift (in `pickTarget`-Dungeonzeile und `focus`): eigener `self`-Angreifer zuerst (wie bisher `att`), sonst bei aktivem Tank das Ansage-Ziel aus `sc.mobs` (wenn sichtbar), sonst wie bisher (`riftFocus`).
- `spreadOn()` false, solange `riftTank()` aktiv.
- Sperre (vor Block 4, nach Ausweichen/Erholen): wenn Rift, `riftTank()` aktiv, ich nicht Tank, Ziel `t` ist das Ansage-Ziel, `!scanEntry(t).self`, und weder `tank.ents.includes(entities.get(t.id).targetId)` noch Sicherheitsnetz abgelaufen → nicht angreifen: `this.attackedId = null; this.engage = null;` Status `Rift: warte, bis ${Name} den Tank angreift`; (Heiler: Task 4 ergänzt Position). Sicherheitsnetz: Start, sobald der Tank das Ziel angreift (`peer.targetId === t.id` oder `entities.get(tank.ents[1]).targetId === t.id`), Ablauf nach `RIFT_TANK_WAIT_MS`; gemerkt in `this.tankWait = {id, since}`.
- Tank (auch als Mitläufer): nimmt das Ansage-Ziel und greift normal an; als Leader+Tank keine Sperre, keine Ansage nötig (aber `callId` trotzdem senden).

- [ ] **Step 1: Tests** — Teil `tank`, 3 Fenster (0 Leader **DD**, 1 **Tank**, 2 **Heiler** mit Rolle aber hier ohne Positionsprüfung), `aggro: 'first'`, ein Gegner nah. **G-T1:** erste `Digit1` auf den Gegner kommt vom Tank-Fenster; alle drei greifen am Ende dasselbe Ziel an. **G-T2:** erste `Digit1` von Leader und Heiler liegt nach dem Zeitpunkt, an dem `targetId === 'p:1'` wurde. Teil `never` (`aggro: 'never'`): **G-N:** Leader/Heiler greifen spätestens ~5 s nach der ersten Tank-Taste an. Teil `self`: ein zweiter Gegner greift von Anfang an den Leader an (`targetId:'p:0'`) → **G-S:** Leader wehrt sich sofort (Digit1 auf diesen Gegner vor der ersten Tank-Taste erlaubt). Teil `tankgone`: Tank-Fenster schließt nach dem ersten Treffer → **G-T:** Leader/Heiler greifen innerhalb von 8 s an. Teil `notank` (alle DD): **G-0:** Verhalten wie 3.2.31 (Leader greift an, ohne zu warten).
- [ ] **Step 2: rot** → G-T1/G-T2 rot (Leader greift zuerst an).
- [ ] **Step 3: implementieren** wie Interfaces.
- [ ] **Step 4: grün**; Regression: `node rifttest.js`, `node riftzieltest.js`, `node grpfocustest.js`, `node spreadtest.js`, `node grouptest.js` (jeweils `../digibot.user.js`, ältere Tests mit `fakeworld.js` wie run.js es macht).
- [ ] **Step 5: Commit** `3.2.32: Rift – Tank greift zuerst an`

### Task 4: Heiler bleibt hinter dem Tank, Anzeige

**Files:** Modify `digibot.user.js` (`riftFollowStep` aus Task 2, Sperre aus Task 3, `renderGroupCards` Statuszeile). Test Teil `heal`.

**Interfaces – Produces:**
- Heiler-Anker: ist `fightOf(group.slot()) === 'healer'` und `riftTank()` aktiv → Folge-Anker = Tank-Entity statt Leader, Zielpunkt `RIFT_HEAL_BACK` px hinter dem Tank auf der Linie Ansage-Ziel→Tank (ohne Ansage: Leader→Tank); `walkTo`, wenn > 30 px vom Punkt; Punkt in einer Warnzone (`dangerZones()` + `digibotDodgeZoneSafe`) → stattdessen beim Tank in `followDist()`.
- Während der Sperre (Task 3) läuft der Heiler auf diesen Punkt statt stehen zu bleiben.
- Gruppenkarte zeigt die Kampfrolle neben Leader/folgt (`Leader · Tank` usw.).

- [ ] **Step 1: Test** — Teil `heal`, 3 Fenster wie `tank`, Gegner 300 px vom Tank, `aggro: 'never'` für die ersten 3 s. **G-H:** während der Sperre steht der Heiler-Partner ≤ 50 px vom Punkt 90 px hinter dem Tank (Linie Ziel→Tank) und weiter vom Ziel entfernt als der Tank.
- [ ] **Step 2: rot**. **Step 3: implementieren**. **Step 4: grün** + Regression wie Task 3.
- [ ] **Step 5: Commit** `3.2.32: Rift – Heiler hinter dem Tank`

### Task 5: Version, Changelog, Suite, Review

- [ ] **Step 1:** Version 3.2.32, CHANGELOG (Rollen im Reiter Gruppe, Folgen im Rift, Ansage + Tank zuerst + 4-s-Netz, Heiler-Position, Tests riftgrouptest G-…); `run.js` findet `riftgrouptest.js` automatisch (Hilfsdateien nicht anlegen).
- [ ] **Step 2:** Suite im Hintergrund (`JOBS=8 TIMEOUT=400 node run.js` > Scratchpad); Ausfälle einzeln nachprüfen.
- [ ] **Step 3: Commit** `3.2.32: Digital Rift – Gruppe mit Rollen` (kein Push).
- [ ] **Step 4:** Ultracode-Review-Workflow (Ablauf/Zustände, Gruppen-Bus/Accounts, Tests) mit adversarial verify; bestätigte Befunde je Test rot→grün fixen; Suite erneut.
- [ ] **Step 5 (live):** mit den Accounts des Nutzers prüfen, ob Mitläufer beim Betreten/Abstieg mitkommen, wie schnell ein Ziel auf den Tank wechselt; Werte (4 s, 90 px) justieren.
