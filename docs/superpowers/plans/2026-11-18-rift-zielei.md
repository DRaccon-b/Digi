# Rift Ziel-Ei Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Im Rift-Modus ein Ziel-Ei/-Code wählen; der Bot spielt mindestens dessen Mindesttiefe, startet Läufe mit falschem Biom sofort neu und hält an, sobald ein passender Scan 100 % hat.

**Architecture:** Alles in `digibot.user.js`: eine feste Zieltabelle `RIFT_TARGETS` (vor `const enums`), eine neue Einstellung `cfg.riftTarget`, eine Erweiterung von `riftDepthPick`, eine Scan-Prüfung im Clockmon-Fenster (`riftOutside`) und ein Biom-Check im Hauptschleifen-Takt neben `riftEventDue`. Test als eigener JSDOM-Test nach dem Muster von `tests/rifttest.js`.

**Tech Stack:** Userscript (Vanilla JS), Tests mit Node + jsdom (`node tests/<test>.js <script>`), Runner `tests/run.js`.

**Spec:** `docs/superpowers/specs/2026-11-18-rift-zielei-design.md`

## Global Constraints

- Antworten, Log- und Statustexte auf Deutsch.
- Version auf **3.2.31**: Kopfzeile `// @version      3.2.31` und Fallback-String `'3.2.30'` → `'3.2.31'` (~Zeile 1797); CHANGELOG-Eintrag „## 3.2.31 – Digital Rift: Ziel-Ei mit Biom-Check“.
- Kein automatisches Umwandeln, kein Shard-Kauf fürs Umwandeln.
- Scan-Stand nicht lesbar → **nicht** anhalten, weiterspielen und einmal warnen.
- Event-Aufbruch (`riftEventDue`), Erholen, Ausweichen bleiben unverändert und gehen vor.
- Biom-Neustart stuft die Tiefe nicht herab (`riftLeave(now, why, true)`).
- Tests laufen aus `tests/` (`JOBS=8 node run.js` mit absoluten Pfaden); während eines Suite-Laufs nichts an `digibot.user.js`/Tests ändern. Ausfälle einzeln nachprüfen; bekannt wacklig: addhptest, fix3130mechtest, grpnexttest, huntendtest, skillrottest, dungeontest, kohgathertest.
- Commits mit Trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, direkt auf main, **kein Push** ohne „Ja, pushen“.
- Untracked `chrome.bat`, `docs/*.md` (fremde), `sprites/` nicht anfassen.

## Rulings (Abweichung von der Spec)

- Ruling: Biome kommen aus einer **festen Tabelle** im Bot statt zur Laufzeit aus den Inhaltsdaten — die Pools (`a1`/`bp`) und die Scan-Tabelle (`P1`, `kl`) stehen im Lazy-Modul `content-*.js` und sind über `worldScene().deps.content` nicht erreichbar — Kosten, falls falsch: nach einem Spiel-Update veraltete Biome, dann Tabelle nachziehen.
- Ruling: Den Scan-Stand liefert das Spiel beim Öffnen des Clockmon-Fensters **von selbst** (Client sendet `riftScans`, Antwort landet in `riftStore().scans = [{species, pct, convertible, price, gives:{kind,item}, grade, source}]`) — kein Reiterwechsel nötig. Vor jedem neuen Öffnen setzt der Bot `scans` auf `null` (`R.set({scans:null})`), damit er keinen alten Stand liest.
- Ruling: Bevorzugen von Elite/Alpha/Wächter bei schweren Zielen entfällt (Spec: „nur wenn einfach“) — eigener Punkt später.

## Zieltabelle (Spieldaten 16.11.)

| Schlüssel | Name | Scan-Arten (`species`) | Biome | minDepth |
|---|---|---|---|---|
| `egg_tapirmon` | Tapirmon-Ei | tapirmon_rift, unimon, marineangemon_rift | dusk, autumn, frost | 1 |
| `egg_kunemon` | Kunemon-Ei | kunemon, kuwagamon, okuwamon, grankuwagamon_rift | verdant, circuit | 1 |
| `egg_gazimon` | Gazimon-Ei | sukamon_rift, vademon_rift | circuit, dusk | 6 |
| `egg_dorumon` | Dorumon-Ei | alphamon_rift | dusk | 25 |
| `code_jewelbeemon` | Jewelbeemon-Code | jewelbeemon_rift | verdant | 1 |
| `code_parrotmon` | Parrotmon-Code | parrotmon_rift | autumn | 1 |
| `code_brachiomon` | Brachiomon-Code | brachiomon_rift | frost | 6 |
| `code_craniummon` | Craniummon-Code | craniummon_rift | circuit | 25 |
| `code_veedramon` | Veedramon-Code | aeroveedramon_rift | autumn | 25 |
| `code_mistymon` | Mistymon-Code | mistymon_rift | autumn | 25 |
| `code_megidramon` | Megidramon-Code | megidramon | autumn | 25 |

## Review Focus

1. Biom fehlt im Laufzustand (`run.biome` undefined, z. B. Ladezeit) → kein Neustart, normal weiter (Test Z-H).
2. Neuer Lauf direkt nach einem Biom-Abbruch: `rift.giveUp` steht noch vom alten Lauf → der neue Lauf muss neu bewertet und bei passendem Biom gespielt werden (Test Z-A: dritter Lauf steigt ab).
3. Alter Scan-Stand vom letzten Fensteröffnen (z. B. 100 % schon umgewandelt) darf nicht zum Anhalten führen → `scans` vor dem Öffnen leeren (Test Z-E2).
4. Ziel-Mindesttiefe über freigeschaltet/Level → kein Endlos-Neustart, keine Fehler-Abbrüche (Test Z-C).
5. Ziel „keins“ verhält sich exakt wie vorher (Test Z-G; plus `rifttest.js` bleibt grün).

---

### Task 1: Zieltabelle, Einstellung und Panel-Auswahl

**Files:**
- Modify: `digibot.user.js` (vor `const enums` ~Zeile 195; `enums`; cfg-Defaults ~1504; Panel ~1971/1975; Select-Abgleich ~12256)
- Create: `tests/riftzieltest.js`

**Interfaces:**
- Produces: `const RIFT_TARGETS = { [key]: { name: string, species: string[], biomes: string[], minDepth: number } }` (Werte aus der Zieltabelle oben); `cfg.riftTarget: 'none' | keyof RIFT_TARGETS` (Default `'none'`, in `enums.riftTarget = ['none', ...Object.keys(RIFT_TARGETS)]`); Panel-Select `select[data-apsel="riftTarget"]` mit `data-dgmode="rift"`, erste Option `none` = „keins“, danach je Ziel `name`.
- Produces (Test): `tests/riftzieltest.js` mit `world({ cfg, deepest, level, biomes, scans, until })` — Kopie von `world()` aus `tests/rifttest.js` (Zeilen 35–197), ohne die dort nicht gebrauchten Szenario-Schalter, plus: `biomes: string[]` (Lauf *i* bekommt `run.biome = biomes[i-1] ?? biomes.at(-1)`, in `floorStart` für alle Etagen gesetzt; `biomes` leer → kein `biome`-Feld), `scans: Array|undefined` (beim Öffnen des Fensters `rs.scans = scans ?? null`; `undefined` → bleibt `null`), Rückgabe zusätzlich `on: () => /■ Stopp/.test(w.document.querySelector('[data-act="bot"]')?.textContent || '')`.

- [ ] **Step 1: Test Z-U schreiben** — in `riftzieltest.js`: Welt mit `cfg: { riftDepthMode: 'max', riftTarget: 'egg_gazimon' }`, nach 900 ms: `select[data-apsel="riftTarget"]` existiert, hat 12 Optionen, `value === 'egg_gazimon'`, Option `none` hat den Text „keins“. Ausgabe `OK     U: Ziel-Auswahl im Panel` / `FEHLER U: …`, `process.exit` am Ende über alle Fälle.
- [ ] **Step 2: Ausführen, muss scheitern** — `cd tests && node riftzieltest.js ../digibot.user.js` → `FEHLER U` (Select fehlt).
- [ ] **Step 3: Implementieren** — `RIFT_TARGETS` vor `const enums` (sonst TDZ beim Panel-Aufbau), `enums.riftTarget`, Default `riftTarget: 'none'` mit Kommentar `// Digital Rift (3.2.31): Ziel-Ei/-Code – Mindesttiefe, Biom-Neustart, Halt bei 100 % Scan`, Select als `<label data-dgmode="rift">Ziel<select data-apsel="riftTarget">…</select></label>` direkt hinter dem Tiefe-Select, `'riftTarget'` in die Liste bei ~12256, Hinweistext im Rift-Hinweis um einen Satz ergänzen: „Ziel: mindestens dessen Tiefe; Lauf im falschen Biom wird sofort neu gestartet; bei 100 % Scan hält der Bot an – umwandeln bei Clockmon selbst.“
- [ ] **Step 4: Ausführen, muss bestehen** — gleicher Befehl → `OK     U`.
- [ ] **Step 5: Commit** — `git add digibot.user.js tests/riftzieltest.js && git commit -m "3.2.31: Rift – Ziel-Ei-Auswahl"`

### Task 2: Mindesttiefe des Ziels

**Files:**
- Modify: `digibot.user.js` `riftDepthPick` (~10128) und der Aufruf in `riftOutside` (~10317)
- Test: `tests/riftzieltest.js`

**Interfaces:**
- Consumes: `RIFT_TARGETS`, `cfg.riftTarget` (Task 1).
- Produces: `riftDepthPick(st, view) -> { depth, why, targetOk: boolean }`; `targetOk === true` ⇔ Ziel gesetzt und `depth >= minDepth`. Bei Ziel gesetzt und Mindesttiefe nicht erreichbar (`minDepth > deepest` oder `riftNeedLv(minDepth) > lv`): `depth` wie bisher, `targetOk = false`, einmalige Warnung über `riftWarn(\`Ziel ${name} braucht Tiefe ${minDepth} (${grund}) – spiele normal\`)`. Ergebnis `rift.targetOk` für Task 4 merken (beim `riftEnter`).
- Regel: erreichbare Mindesttiefe hebt sowohl „höchstmöglich“ (auch über `rift.cap`) als auch „feste Tiefe“ an: `depth = max(depth, minDepth)`.

- [ ] **Step 1: Tests schreiben** — Z-B: `cfg { riftDepthMode: 'fixed', riftDepth: 2, riftTarget: 'egg_gazimon' }, deepest 10, level 130, until: () => true` → `sent.enter[0] === 6`. Z-C: `cfg { riftDepthMode: 'max', riftTarget: 'egg_dorumon' }, deepest 10, level 130, until: () => true` → `sent.enter[0] === 10` und `log`/Bot-Log enthält „braucht Tiefe 25“ (Log-Text über `W.w.document` Reiter Log oder `status()`; nimm, was `rifttest.js` für Logprüfungen nutzt bzw. `w.document.body.textContent`).
- [ ] **Step 2: Ausführen, muss scheitern** — Z-B liefert 2, Z-C ohne Warnung.
- [ ] **Step 3: Implementieren** wie in Interfaces.
- [ ] **Step 4: Ausführen, muss bestehen**; zusätzlich `node rifttest.js ../digibot.user.js` → alle OK.
- [ ] **Step 5: Commit** — `"3.2.31: Rift – Mindesttiefe des Ziels"`

### Task 3: Scan-Stand bei Clockmon, Halt bei 100 %

**Files:**
- Modify: `digibot.user.js` `riftOutside` (Rücksetz-Block ~10291 und Block `if (R.warden && R.view)` ~10315)
- Test: `tests/riftzieltest.js`

**Interfaces:**
- Consumes: `RIFT_TARGETS`, `cfg.riftTarget`.
- Produces: `riftScanCheck(st, R, now) -> string | null` (null = weiter zum Betreten). Aufruf direkt nach `riftBreadTopup`. Logik:
  - kein Ziel → null.
  - `R.scans` ist Array: Einträge mit `species` ∈ Ziel-`species`; erster mit `pct >= 100` → `logEvent('warn', …)`, `notify(\`Rift: Scan ${Digimon-Name} bei 100 % – bei Clockmon umwandeln (${Zielname})\`, 'stop')`, `bot.toggle(true)`, Rückgabe derselbe Text. Sonst höchster `pct` in `rift.scanPct` merken, null.
  - `R.scans == null`: ab erstem Sehen `rift.scanWaitAt` setzen; bis 3000 ms `'Rift: lese Scan-Stand…'`; danach einmal `riftWarn('Scan-Stand nicht lesbar – spiele weiter')`, null.
- Beim Rücksetzen in `riftOutside` (`if (rift.inside) {…}`) zusätzlich `rift.scanWaitAt = 0` und `R?.set?.({ scans: null })` (R erst danach holen bzw. dort `riftStore()` nutzen).
- Statuszeile beim Betreten: `Rift: betrete Tiefe ${d}…` um ` · Ziel ${name}${rift.scanPct != null ? \` (Scan ${Math.floor(rift.scanPct)} %)\` : ''}` ergänzen, nur mit Ziel.

- [ ] **Step 1: Tests schreiben** — Z-D: Ziel `egg_gazimon`, deepest 10, level 130, `scans: [{ species: 'sukamon_rift', pct: 100 }]` → nach ≤ 20 s: `sent.enter.length === 0`, `on() === false`, Status/Text enthält „100 %“. Z-E: `scans: [{ species: 'sukamon_rift', pct: 40 }, { species: 'kunemon', pct: 100 }]` → betritt (`sent.enter.length >= 1`, `on() === true`; fremde Art mit 100 % zählt nicht). Z-F: `scans` undefined → betritt nach ≥ 3 s, Text enthält „nicht lesbar“. Z-E2 (alter Stand): `rs.scans` startet mit `[{ species: 'sukamon_rift', pct: 100 }]`, beim Öffnen liefert das Spiel nach 500 ms `[{ species: 'sukamon_rift', pct: 10 }]` → betritt, hält nicht an. Dafür im Harness: Option `staleScans` (Startwert von `rs.scans`) und `scansDelay` (ms bis `rs.scans = scans`).
- [ ] **Step 2: Ausführen, muss scheitern** (Z-D betritt statt anzuhalten).
- [ ] **Step 3: Implementieren** wie in Interfaces.
- [ ] **Step 4: Ausführen, muss bestehen**; `node rifttest.js ../digibot.user.js` grün.
- [ ] **Step 5: Commit** — `"3.2.31: Rift – Halt bei 100 % Ziel-Scan"`

### Task 4: Biom-Check mit Neustart

**Files:**
- Modify: `digibot.user.js` neue Funktion bei `riftEventDue` (~10280) und Aufruf im Hauptschleifen-Block „1c“ (~11514–11518)
- Test: `tests/riftzieltest.js`

**Interfaces:**
- Consumes: `RIFT_TARGETS`, `cfg.riftTarget`, `rift.targetOk` (Task 2), `riftLeave(now, why, keepDepth)`.
- Produces: `riftBiomeDue(st, now) -> string | null`; Aufruf im Block 1c für `cfg.dungeon && cfg.dgMode === 'rift' && cfg.riftTarget !== 'none' && world.state === 'ready' && riftMap(st.world?.mapId)`, **nach** `riftEventDue`; Rückgabe → `this.status = rs; return;`.
- Logik: `run = riftStore()?.run`; null wenn kein Ziel/`run`/`R.result`, `!rift.targetOk`, oder `!run.biome`. Lauf-Kennung `rift.biomeKey = \`${rift.enterAt}|${run.depth}\``; bei neuer Kennung: `rift.giveUp = false`, `rift.biomeOk = null`. Je Etage einmal `logEvent('map', \`Rift: Biom ${biome} (Etage ${n})\`)`. Nur auf Etage 1 entscheiden: Biom ∉ Ziel-`biomes` → `rift.biomeResets = (rift.biomeResets||0)+1`, `return riftLeave(now, \`Biom ${biome} passt nicht zu ${name} – Neustart ${rift.biomeResets}\`, true)`; passt → `rift.biomeOk = true`, `rift.biomeResets = 0`, `logEvent('bot', \`Rift: Biom ${biome} passt zu ${name}\`)` einmal. Ab Etage 2 nie abbrechen (Biomwechsel nur loggen – live klären).

- [ ] **Step 1: Tests schreiben** — Z-A: Ziel `egg_gazimon`, deepest 10, level 130, `scans: [{species:'sukamon_rift',pct:10}]`, `biomes: ['verdant', 'frost', 'circuit']`, `until: (s) => s.enter.length > 3` → nach ≤ 120 s: `sent.enter.length >= 3`, `sent.leave >= 2`, `sent.descend >= 1` erst nach dem 3. `riftEnter` (im Harness `sent.descendAt = sent.enter.length` beim ersten Abstieg merken → `=== 3`), Text enthält „passt nicht“. Z-G: Ziel `none`, `biomes: ['verdant']` → erster Lauf steigt ab, `sent.leave === 0` vor dem ersten Abstieg. Z-H: Ziel `egg_gazimon`, `biomes: []` (kein Biom) → steigt im ersten Lauf ab. Z-C2 (aus Task 2 erweitern): Ziel `egg_dorumon`, deepest 10, `biomes: ['verdant']` → erster Lauf steigt ab, kein Neustart.
- [ ] **Step 2: Ausführen, muss scheitern** (Z-A steigt im ersten Lauf ab).
- [ ] **Step 3: Implementieren** wie in Interfaces.
- [ ] **Step 4: Ausführen, muss bestehen**; `node rifttest.js ../digibot.user.js` grün.
- [ ] **Step 5: Commit** — `"3.2.31: Rift – Biom-Check mit Neustart"`

### Task 5: Version, Changelog, Suite

**Files:**
- Modify: `digibot.user.js` (Version), `CHANGELOG.md`

- [ ] **Step 1:** Version 3.2.31 (Kopfzeile + Fallback), CHANGELOG-Eintrag (Ziel-Auswahl, Mindesttiefe, Biom-Neustart, Halt bei 100 %, Tests riftzieltest U, A–H).
- [ ] **Step 2:** Volle Suite im Hintergrund: `cd tests && JOBS=8 node run.js` (absolute Pfade wie gewohnt) > Scratchpad-Datei; Erwartet: alle `ok` außer bekannt wackligen, die einzeln grün nachlaufen.
- [ ] **Step 3: Commit** — `"3.2.31: Digital Rift – Ziel-Ei mit Biom-Check"` (kein Push).
- [ ] **Step 4:** Danach Review-Workflow (Ultracode: Finder + adversarial verify) über den Diff 646f9b5..HEAD; Befunde fixen (je Fix Test rot→grün).
- [ ] **Step 5 (live, sobald Chrome-Tab verfügbar):** prüfen, ob `run.biome` auf allen Etagen gleich bleibt, ob `riftStore().scans` beim Öffnen gefüllt wird, und wie lange raus/rein dauert; Ergebnis dem Nutzer melden.
