# Panel-Struktur und Abhängigkeiten (Bestandsaufnahme vor dem Umbau, 2.11.2026)

Stand 3.1.51. Grundlage für den Umbau in 3.2.0 (neue Reiter, Quest-Jagd weg, Skills unter Attacke, Food-Nachkauf,
Ausweich-Regler, Einstellungen zentral, Style).

## 1. Seiten vor dem Umbau (`section[data-page=…]`)

| Seite | Gruppen (`data-grp`) | cfg-Felder / Zustände | Render-Funktionen | Besonderheiten |
|---|---|---|---|---|
| `data` Übersicht | lage, digimon, loot, mobexp, queue, radar | nur Anzeige (exp, bitsRate, sess, loot, mobExp) | `renderLage`, `renderLoot`, `renderMobExp`, `renderQueue`, `drawRadar` | `data-act="reset"`, `mobexp-reset` |
| `mon` Digimon | partner, skills, pots, tamer | apQuestPartner, apEvo, evoWarp, apMapEvo, apTurninPartner; skills/skillSets (`data-skillcfg`, `data-rolecfg`); hpPot, dsPot, tdsPot; tamerAuto | `renderApConfig` (Selects), `renderSkills` (Rollen je Form) | Skill-Rollen gelten je Digitationsform (`editSkillSet`) |
| `attack` Kampf | targeting, mech, bskills, mobs | lvlDiff, radius, grpDist, pull, pullMax, pullHp, skipTaken, levelRoute, levelA2, levelEvo, levelEvoForm, levelEvoDark, levelBoss, expPrio, chCheck; dodge, tank, koh, kohMore; mobs | `renderMobList`, `renderBossSkills`, `renderApConfig` (Formen-Selects) | `data-modes="grind"` an der Monsterliste |
| `quest` Quests | apcfg, quests | apGrind, apBatch, apOrder, apSweepDir, apStartMap, apNoTurnin, apRepeat, apDailies, apTeleport; questOff | `renderQuests`, `renderApConfig` | Hinweistext nennt die Quest-Jagd (`data-modes="auto quest"`) |
| `farm` Bosse | farmcfg, dungeon, events, timers, bosspick, cardpick | farmMode, routeStart, routeEnd, farmChannels, farmBosses, cardSel, cardNamed; dgMode, dgRetry, dgBreak, dgBreakMinPct, dgBlade, dgFlareCover, dgRing, dgHerdForm; eventsIdleMap | `renderFarm`, `renderCards`, `filterBossPick` | |
| `food` Food | foodcfg | foodHp/Ds/Tamer, foodHpQty/DsQty/TamerQty (foodMap/foodNpc nur Tests) | `syncModeScope` (Selects) | nur für die Betriebsart „Food kaufen“ |
| `acc` Gruppe | (Segment `data-gmode`), desktop, account-queue, accounts | `accounts.*` (localStorage `digibot.accounts`): mirror, mirrorAtk, leadBoss, dungeon, spread, serve, popup, leader, list; Fenster-Slot in sessionStorage | `renderAccounts`, `renderGroupCards`, `digibotQueueRender` | Knöpfe `grp-login`, `grp-start`, `grp-stop`, `grp-invite`, `grp-maptalk`, Desktopstart, Quest-Runde |
| `log` Log | command-history | logFilter | `renderLog`, `digibotRenderHistory` | |

Kopfbereich (immer sichtbar): Betriebsarten (`data-mode`: grind, quest, auto, farm, dungeon, events, food), ▶ Start /
■ NOT-AUS, 🎯 Event, 🌍 Weltboss, ⋯-Menü (Diagnose, Presets, `independentGroup`).

## 2. Kopplungen

- **Betriebsart** = genau ein Flag aus questMode/autopilot/farm/dungeon/eventsOnly/foodBuy (`modeOf()`, `MODES`).
  `RUN_KEYS` schützt diese Flags beim Sync zwischen Fenstern; `mapTalkPrevCfg` sichert sie während „Abgeben & Annehmen“.
- **Quest-Jagd** (`questMode`): `questTargets(st, null)` im Scan (4489), `questReturn`/`questBack` (7570 ff., 10176),
  Ende „Quest-Ziele erledigt“ (10360 ff.), `lrOn()`/`expPrio` schließen sie aus, Log-Texte, Monsterlisten-Zusatz,
  Hinweis im Quest-Reiter, `MODE_NAMES`. Tests: `dropstest`, `lvltest`, `fix3130questtest` nutzen `questMode: true`.
- **Digitation**: drei Wege – Autopilot (`apMapEvo` → `lrEvolve`, sonst `apEvo`), Lern-Route (`levelEvo` + `lrEvolve`
  nur auf der Lern-Map), Bosse/Dungeon/Event (`apEvo || __max`, `dgEvoPending`, Herden-Form). `lrEvolve` wählt schon
  heute nach Dark Tower der Map (`digibotTowerState`): `levelEvoDark` bzw. `levelEvoForm`.
- **Skills**: `data-skillcfg`/`data-rolecfg` → `editSkillSet(st)` (je Art), Anzeige in `renderSkills` (Seite `mon`).
  Tests fragen `[data-rolecfg]` ohne Seite ab (skillroletest, healtest …) – Verschieben ist unkritisch.
- **check()/slider()**: `check(flag)` schreibt `data-apflag` (Handler setzt `cfg[flag]`, `autopilot.reset()`),
  `slider(key)` schreibt `data-cfg` + `LABELS[key]`; `syncCfgInputs()` zieht beide nach Profilwechsel nach.
  `digibotConfig()` (Zeile 166) prüft Typen gegen `CFG_DEFAULTS` und klemmt `bounds` – neue Zahlenfelder dort eintragen.
- **Gruppe**: Mitläufer bekommen ihren Modus heute aus `accounts.leadBoss`/`accounts.dungeon` (`groupStartNow`), nicht
  aus dem Leader. `grp-start` ruft `startGroup()` (claimSlot + Start an alle), ▶ Start im Leader-Fenster schickt ebenfalls
  `start` an alle (`bot.toggle`). `grp-maptalk` → `startMapTalk` (Autopilot-Zwischenlauf, `autopilot.mapTalk`).
- **Ausweichen**: Konstanten `DODGE_*`, `PULL_DODGE_*` (Zeilen 2249–2284, 2518–2520, 9169, 9241). Wirklich genutzt:
  DODGE_MARGIN (31×), DODGE_EDGE_MARGIN (11), DODGE_HOLD_RANGE (4), DODGE_SOON_MS/PAD (2/4), DODGE_LATE_K/PAD_MS/ABORT_MS
  (je 2), DODGE_RETAP_MS (5), DODGE_WALK_PX_S (4), DODGE_SEARCH_R (3), DODGE_HUGE_MAX_R (2), PULL_DODGE_LEASH_MARGIN (2),
  PULL_DODGE_MARGIN (2). Nicht angeboten: DODGE_RING_*, DODGE_BASIC_*, DODGE_GOAL_* (interne Feinwerte).
- **Töne**: `notify(text)` (ein Piepton) bei Autopilot fertig, Quest-Ziele erledigt, Food gekauft, Kartenrotation fertig,
  Dungeon geschafft/gescheitert/rausgeflogen, Key-of-Hope-Fehlblock. Harte Stopps (`digibotCore.stop(…, true)`:
  Anwesenheitskontrolle, Verbindung, Not-Aus) sind stumm.
- **Automatischer Stopp** gibt es bisher nur als Ruhemodus (F1 leer) und als Modus-Ende; keine Grenzwerte.

## 3. Doppelt / überflüssig

- Betriebsart „Quest-Jagd“ ist ein Teilfall des Autopiloten (nur aktuelle Map, kein Abgeben) → entfällt.
- Digitation: `apMapEvo` + `levelEvo` + `apEvo` + zwei Formen-Selects sagen dreimal fast dasselbe → eine Regel je Map.
- Gruppe: `grp-start`/`grp-stop` doppeln ▶ Start / ■ im Leader-Fenster; Gruppenmodi „Quests/Bosse/Dungeon“ doppeln die
  Betriebsart des Leaders; „Abgeben & Annehmen“ ist ein Sonderlauf, den der Autopilot ohnehin macht.
- Food-Optionen hängen an einer eigenen Seite, obwohl sie Einstellungen sind.

## 4. Neue Struktur (3.2.0)

| Reiter | Inhalt |
|---|---|
| 📊 Übersicht | unverändert |
| 🐣 Digimon | Partner (Quest-/Abgabe-Digimon, Warp), **Digitation je Map** (Form ohne / mit Dark Tower – gilt in allen Modi), Tränke & Food (F1–F3), Tamer |
| ⚔️ Attacke | **Skills (Tasten 2–6, Rollen, Heal-Schwellen, AoE ab N)**, Zielwahl (Level, Radius, Gruppenabstand, Pull, fremde Gegner), Grinden (Lern-Route, A2, Feldbosse, EXP-Priorität, Channel-Checker), Boss-Mechaniken, Attacken des Bosses, Monster auf dieser Map |
| 📜 Quests | Autopilot-Einstellungen, aktive Quests (ohne Quest-Jagd-Hinweis) |
| 👑 Bosse | unverändert |
| 👥 Gruppe | Verhalten der Mitläufer: **Folgen** (eigener Bot, Modus wie der Leader) / **Spiegeln** / **Angreifen**; Ziele verteilen, Leader erledigt Quests; Fenster öffnen, Party einladen; Karten; Fenster-Slot; Desktopstart; Quest-Runde; Accounts |
| ⚙️ Einstellungen | Unterreiter: **Food** (Sorten/Mengen, Nachkauf-Automatik, Einkaufs-Map), **Ausweichen** (Regler), **Warnungen & Stopp** (Ton an/aus, Ereignisse, Stopp-Bedingungen), **Zeiten** (Trank-Sperre, Jagd-Geduld, Gruppen-Wartezeit), **Style** (Farben, Presets) |
| 📋 Log | unverändert |

cfg-Änderungen: weg `questMode`, `questOff` bleibt (Quests abwählen), weg `apMapEvo`, `levelEvo`, `apEvo` (alter Wert wird
in `levelEvoForm` übernommen, wenn `apMapEvo` aus war); neu `foodAuto`, `foodAutoMin`, `foodAutoMap`, `dodge*`-Regler,
`soundOn`, `sounds`, `stopLevel`, `stopAfterMin`, `stopFaints`, `stopBits`, `potCdMs`, `huntIdleMin`, `huntStallMin`,
`grpWaitMin`, `style`, UI-Feld `stab`. `accounts.leadBoss`/`accounts.dungeon` werden nicht mehr gelesen – Mitläufer nehmen
den Modus des Leaders aus dessen Gruppenmeldung (`mode`).
