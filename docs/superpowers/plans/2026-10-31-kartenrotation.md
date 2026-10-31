# Kartenrotation – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dritte Art „Kartenrotation“ im Reiter Bosse: Common-Karten auswählen und ordnen, der Bot farmt sie in dieser Reihenfolge mit der besten Form und zeigt die Restzeit.

**Architecture:** Alles in `digibot.user.js` (Ein-Datei-Userscript, bestehende Muster). Neuer Modus-Zweig `cfg.farmMode === 'cards'` in `farmStep` → `cardStep(st, sc, now)`. Kartendaten aus `content.items[*].training`, Spawns und `store.me.training`/`me.cards`. Ziele über den vorhandenen Szenen-Filter (`enabled`/`inLvl`), Named über `farmSelected()`/`farmTargets()`, Digitation über `ensureEvolution`.

**Tech Stack:** Tampermonkey-Userscript (plain JS), Tests mit Node + jsdom (`tests/gw.js`, `node tests/run.js digibot.user.js`).

**Spec:** `docs/superpowers/specs/2026-10-31-kartenrotation-design.md`

## Global Constraints

- Version 3.1.40 (Header Zeile 4 und Fallback-String ~Zeile 1612), CHANGELOG-Abschnitt „## 3.1.40 – Kartenrotation“.
- Texte/Kommentare deutsch, Stil wie umgebender Code (kurze Kommentare mit Versionsangabe `(3.1.40)`).
- Keine neuen Spielbefehle; nur vorhandene `commands()` (travel/walk/select/evolve/switchChannel).
- Dropchance-Schnitt **0,448** (12 % Elites: 0,88·0,4 + 0,12·0,8), Named **12 Karten/Kill**, Named-Respawn aus dem Boss-Eintrag (`respawnMs`, sonst 300000).
- Kill-Zuschlag für Laufen/Suchen **4 s**; Schätzwerte ohne Messung: weicht aus **6 s**, normal **8 s**, gepanzert **14 s**.
- Formwechsel nur bei Map-Betreten oder wenn eine Art fertig wird, Schwelle **≥ 5 %** besser.
- Element ×1,2 stark / ×0,9 schwach, light↔dark beidseitig ×1,2 ohne Schwäche (Tabelle wie Spiel `Wt`); Attribut ×1,25/×0,85 (Zyklus vaccine→virus→data→vaccine; free neutral; unknown ×1,25 gegen alle außer unknown).
- Named-Häkchen standardmäßig aus. Karten werden nie automatisch benutzt.
- Bestehende Modi unverändert (alle bisherigen Tests grün).

## Review Focus

1. **Kartentasche voll** (`me.cards` ohne leeren Slot `itemId: ''`): Warnung im Log einmal pro Minute und Status-Hinweis, Bot farmt weiter (Spieler entscheidet). → Task 2, Fall „Tasche voll“.
2. **Karte schon voll durch Tasche** (benutzt + Tasche ≥ Limit, z. B. Gorillamon 400 + 5): zählt als fertig, wird nie angesteuert. → Task 2 (`card_full`).
3. **Map gesperrt** (Entry-Quest nicht Zustand 3) oder keine Route: Karte ausgegraut, Bot nimmt die nächste offene; alle gesperrt → Status „keine erreichbare Karte“, Bot stoppt nicht hektisch neu. → Task 2, Fall „locked“.
4. **Auswahl leer / alles fertig**: Status „Keine Karten ausgewählt (Reiter Bosse)“ bzw. „Kartenrotation fertig“ + Bot stoppt + `notify`. → Task 2.
5. **Wechsel der Art während des Laufs** (Spieler hakt Karte ab/um): Plan wird beim nächsten Takt neu berechnet, keine Jagd auf abgewählte Arten. → Task 2, Fall „deselect“.

---

### Task 1: Kartendaten, Konfiguration, Liste und Restzeit im Reiter Bosse

**Files:**
- Modify: `digibot.user.js` – cfg-Defaults (~1405), Konfig-Prüfung (~165–180), Reiter `farm` (~1765–1806), `renderFarm`-Teil (~10160–10205), Klick-Handler (~10690), Kampfzeit-Messung (`mobExp`, ~2015)
- Test: `tests/carduitest.js`

**Interfaces:**
- Produces:
  - `cardDefs(): Array<{ id, species, name, stat, limit, named: boolean, sources: Array<{ mapId, mapName, kind: 'field'|'named', levels:[lo,hi], tags: string[], boss?: farmBossList-Eintrag }> }>` – alle Common-Karten (`training.rarity === 0`), Limit = `baseUses + (masteryPoints||0) × (masteryCopiesPerPoint||34)`.
  - `cardHave(st, id): number` = `min(limit, (me.training[id]||0) + Σ me.cards[].qty mit itemId === id)`.
  - `cardOpen(st, def): number` = `limit − cardHave`.
  - `mapOpen(st, mapId): boolean` – `content.maps[mapId].entryQuest` fehlt oder Quest-Zustand 3.
  - `cardKillMs(species, tags): number` – gemessene Ø-Kampfzeit aus `localStorage['digibot.cardKillMs']` (`{species: {ms, n}}`), sonst Schätzwert; plus 4000 ms Zuschlag.
  - `cardEtaMs(st, def): number` – Feld: `cardOpen/0,448 × cardKillMs`; Named: `ceil(open/12) × respawnMs`.
  - cfg: `cardSel: string[]` (geordnet, Karten-IDs), `cardNamed: string[]` (IDs mit erlaubtem Named), `farmMode` erlaubt `'cards'`.

- [ ] **Step 1: Failing test `tests/carduitest.js`** – Welt aus `gw.js` mit `setup`: `items.card_kunemon = { id:'card_kunemon', name:'Kunemon DE Card', training:{ stat:'de', points:1, rarity:0, baseUses:20, copiesPerPoint:10 } }`, `items.card_tsunomon` (rarity 0, baseUses 30), Spawn-Drops `{ itemId:'card_kunemon', chance:0.4 }` an der Kunemon-Zone, `digimon.tsunomon` + Spawn in `native_forest`. `me.training = { card_kunemon: 5 }`, `me.cards = [{ itemId:'card_kunemon', qty:3 }, { itemId:'', qty:0 }]`, `localStorage['digibot.cardKillMs'] = { kunemon: { ms: 10000, n: 5 } }`. cfg `farmMode:'cards', tab:'farm'`. Assertions:
  - Liste `[data-f="cardpick"]` hat Zeile `card_kunemon` mit Text `8/20`.
  - Häkchen anklicken → `cfg.cardSel` (aus localStorage) `== ['card_kunemon']`; zweites Häkchen → `['card_kunemon','card_tsunomon']`; ↑ an tsunomon → `['card_tsunomon','card_kunemon']`.
  - Restzeit `[data-f="cardeta"]` enthält „noch ca.“; für kunemon allein ≈ `12/0,448 × 14 s` = 375 s → Text „6 min“.
  - Boss-Liste `[data-farmmode="boss"]` ist ausgeblendet, Kartenliste sichtbar.
- [ ] **Step 2: Run** `node tests/carduitest.js digibot.user.js` → FEHLER (keine Kartenliste).
- [ ] **Step 3: Implementieren**: Funktionen oben; `farmMode`-Enum + Auswahl um `['cards','Kartenrotation (Karten farmen)']`; `cardSel`/`cardNamed` in Defaults und in der Konfig-Prüfung explizit (Strings, ohne Duplikate – das generische Array-Muster passt bei leerem Default nicht). Gruppe `grp('cardpick', 'Karten auswählen', …, 'data-farmmode="cards" data-modes="farm"')` mit Suchfeld `data-cardsearch`, Liste `data-f="cardpick"` (Zeile: Häkchen `data-card`, Name · Stat, `x/limit`, Map(s), 🛡 gepanzert / 💨 weicht aus, `↑`/`↓` `data-cardmove`, bei Named zusätzlich Häkchen `data-cardnamed`, gesperrte Map ausgegraut mit „Map gesperrt“), Feld `data-f="cardeta"` („noch ca. 23 h 40 min für N Karten“) über der Liste, Zeilen-Restzeit rechts. Ausgewählte Karten zuerst in cfg-Reihenfolge, dann der Rest nach Map-Level. `mode`-Umschaltung in `renderFarm` um `'cards'` erweitern. Kampfzeit: dort, wo `mobExp` `k.dur` bucht, zusätzlich `cardKillMs` je `species` als gleitendes Mittel (n bis 20) speichern.
- [ ] **Step 4: Run** `node tests/carduitest.js digibot.user.js` → „OK“.
- [ ] **Step 5: Commit** `git add digibot.user.js tests/carduitest.js && git commit -m "Kartenrotation: Kartenliste, Auswahl, Restzeit"`

### Task 2: Farm-Schritt `cardStep` – Plan, Reise, Jagd, fertig

**Files:**
- Modify: `digibot.user.js` – `farmStep` (~8033), Szenen-Filter (~4206–4241), `farmSelected`/`farmTargets` (~7609, 7634), Bot-Start-Text (~9318, 9936)
- Test: `tests/cardrottest.js`

**Interfaces:**
- Consumes: `cardDefs`, `cardOpen`, `mapOpen`, `cfg.cardSel`, `cfg.cardNamed` (Task 1); `travel(st, mapId, now)`, `walkTo`, `world.maps[mapId].zones`, `hops`.
- Produces:
  - `cardPlan(st): null | { def, mapId, species: Set<string>, zones: Array<{x,y}>, named: Array<farmBoss> }` – oberste ausgewählte offene Karte mit erreichbarer Quelle; Map: unter ihren offenen Maps die mit den meisten weiteren offenen ausgewählten Karten, Gleichstand → niedrigere `levelRange[0]`; `species` = alle ausgewählten offenen Feld-Arten dieser Map.
  - `cardHuntSet(mapId): Set<string> | null` – Arten, die der Szenen-Filter freigibt (nur `cfg.farm && farmMode==='cards'`); dort `enabled = true` und `inLvl = true`.
  - `cardStep(st, sc, now): string` – Statustext.
  - `farmSelected()` liefert im Karten-Modus die erlaubten Named-Bosse (`cardNamed` ∩ `cardSel`, Quelle `named`).

- [ ] **Step 1: Failing test `tests/cardrottest.js`** – Welt wie Task 1, Start in `primary_village`, Mobs in `native_forest`: 3× kunemon, 2× tsunomon. `onKill`: kunemon → `me.cards` qty +1 für `card_kunemon`. Limit kunemon = 8 (training 5 + 0 Tasche, baseUses 8 → 3 offen). cfg `farm:true, farmMode:'cards', cardSel:['card_full','card_kunemon'], farmChannels:[1]`, `card_full` Limit 4 mit `me.training.card_full = 4` (Spawn in native_forest, Art `tanemon`, Mob vorhanden). Assertions nach Bot-Start (≤ 40 s):
  - Log enthält Map-Wechsel nach Native Forest.
  - Angegriffen nur kunemon (kein `select` auf tsunomon/tanemon – `select`-Spy).
  - Nach 3 Kunemon-Kills: Status enthält „Kartenrotation fertig“, Bot aus.
  - Fall „deselect“ (zweite Welt): nach 1 Kill `cfg.cardSel = []` per Klick → keine weiteren `select`, Status „Keine Karten ausgewählt“.
  - Fall „locked“: `maps.native_forest.entryQuest = 'q99_x'` ohne Zustand 3 → Status „keine erreichbare Karte“, kein Map-Wechsel.
  - Fall Tasche voll: `me.cards` ohne leeren Slot → Log „Kartentasche voll“.
- [ ] **Step 2: Run** `node tests/cardrottest.js digibot.user.js` → FEHLER.
- [ ] **Step 3: Implementieren** – in `farmStep` vor dem Named-Zweig `if (cfg.farmMode === 'cards') return cardStep(st, sc, now);` (Kanal-Prüfung gilt weiter). `cardStep`: Plan → `travel` → (Task 3/4 hängen hier ein) → sichtbare passende Beute (`sc.mobs` mit `species ∈ plan.species`, nicht taken/banned, erreichbar) hinlaufen; sonst Zonen der Arten reihum ablaufen (Index in `farm.card`, nächste Zone, wenn innerhalb 48 px angekommen und nichts sichtbar; Zonenmittelpunkte aus `world.maps[mapId].zones[zoneKey]`). Alles fertig → `bot.toggle()`, Log + `notify('Kartenrotation fertig.')`. Tasche voll → `logEvent('warn', 'Kartentasche voll – neue Karten gehen verloren')` höchstens einmal/min. Startmeldung „Bot gestartet (Kartenrotation)“ und Laufknopf-Text ergänzen.
- [ ] **Step 4: Run** `node tests/cardrottest.js digibot.user.js` → „OK“.
- [ ] **Step 5: Commit** `git commit -am "Kartenrotation: Farm-Schritt mit Reise und Jagd"` (+ `git add tests/cardrottest.js`).

### Task 3: Named-Gegner in der Kartenrotation

**Files:**
- Modify: `digibot.user.js` – `cardStep`, `farmSelected`
- Test: `tests/cardnamedtest.js`

**Interfaces:**
- Consumes: `cardPlan().named`, `farmBossMob(sc, b)`, `farmState(b, ch, now)`, `farmSwitch`, `farmChannels()`, `NAMED_WAIT_MS`.
- Produces: Verhalten in `cardStep`: sichtbarer erlaubter Named → hin und angreifen (wie `farmStep` Schritt 3, `farm.fight` setzen); Named laut Timer `up` auf aktuellem Kanal → zu seiner Zone; Respawn auf aktuellem Kanal > `NAMED_WAIT_MS` und anderer gewählter Kanal `up`/`unknown` → `farmSwitch` (nur ohne Angreifer); sonst Feldjagd.

- [ ] **Step 1: Failing test** – `content.spawns.native_forest.bosses = [{ species:'myotismon_fog', at:'boss_x', level:3, respawnMs:300000, drops:[{ itemId:'card_myotismon_fog', chance:1, min:12, max:12 }] }]`, Karte `card_myotismon_fog` (Limit 24), Boss-Entity per `extraEnts`. Lauf A: `cardNamed: []` → Boss wird nie per `select` gewählt, Kunemon schon. Lauf B: `cardNamed: ['card_myotismon_fog']` → Boss gewählt.
- [ ] **Step 2: Run** → FEHLER.
- [ ] **Step 3: Implementieren** wie Interfaces.
- [ ] **Step 4: Run** → „OK“; außerdem `node tests/farmnamedtest.js digibot.user.js` und `node tests/farmtest.js digibot.user.js` grün.
- [ ] **Step 5: Commit** `git add tests/cardnamedtest.js && git commit -am "Kartenrotation: Named-Gegner wählbar"`

### Task 4: Beste Form automatisch

**Files:**
- Modify: `digibot.user.js` – neue `cardBestForm`, Aufruf in `cardStep` und im Digitations-Block des Haupt-Takts (~9603: `farmEvo` → im Karten-Modus `cardEvolution`)
- Test: `tests/cardevotest.js`

**Interfaces:**
- Consumes: `cardPlan()`, `cardOpen`, `content.digimon[sp].{element, attribute, base.at, growth.at}`, `st.me.partner.{level, species, evolutions}`, `lrDarkMap(st)`, `ensureEvolution(st, species, now)`.
- Produces:
  - `elemFac(atkEl, defEl): number`, `attrFac(atkAttr, defAttr): number` (Konstanten siehe Global Constraints).
  - `cardBestForm(st, plan): string` – Kandidaten: `evolutions` mit `unlocked !== false && !blocked`, auf Dark-Tower-Maps nur `stage === 'armor'`, plus aktuelle Form. Wert = `(base.at + growth.at × (L−1)) × Σ_art (offeneKills_art × elemFac × attrFac) / Σ offeneKills`. Aktuelle Form bleibt, wenn Bester < 1,05 × aktueller Wert.
  - `cardEvolution(st, now)`: berechnet Zielform nur neu, wenn sich `plan.mapId` oder `plan.species` (Schlüssel) ändert (`farm.card.formKey`), sonst gespeicherte Zielform → `ensureEvolution`.

- [ ] **Step 1: Failing test** – Partner `veemon` Lv 116 mit `evolutions` [veemon, flamedramon(armor, fire), raidramon(armor, thunder), magnamon(armor, light)], Basis/Wachstum wie live (flamedramon at 225/32.2, raidramon 272/38.9, magnamon 284/40.6), `cmds.evolve` wie `farmevotest.js`. Lauf A: Karten-Art `tamers_knightmon` (steel) allein → `evolved` endet mit `raidramon`. Lauf B: Art dark → `magnamon`. Lauf C: Arten steel + dark gleich viele offen → `magnamon` (Basis-AT Lv 116: Raidramon 4746·(1,2+1)/2 = 5221 < Magnamon 4953·(1+1,2)/2 = 5448).
- [ ] **Step 2: Run** → FEHLER.
- [ ] **Step 3: Implementieren** wie Interfaces.
- [ ] **Step 4: Run** → „OK“; `node tests/farmevotest.js digibot.user.js` grün.
- [ ] **Step 5: Commit** `git add tests/cardevotest.js && git commit -am "Kartenrotation: beste Form je Map"`

### Task 5: Release 3.1.40

**Files:** `digibot.user.js` (Version), `CHANGELOG.md`

- [ ] **Step 1:** Version 3.1.40 an beiden Stellen; CHANGELOG-Abschnitt mit drei Punkten (Liste/Restzeit, Farmen nach Priorität mit Named-Wahl, beste Form).
- [ ] **Step 2:** Volle Suite `node tests/run.js digibot.user.js` → alle grün (Ausreißer unter Last einzeln wiederholen).
- [ ] **Step 3:** Review-Workflow über den Diff (Korrektheit gegen Spec, Regressionen anderer Modi).
- [ ] **Step 4:** Commit „3.1.40: Kartenrotation …“ und `git push` (main).
