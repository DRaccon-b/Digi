# Vergleich: DigiBot 2.55.0 (Repo) ↔ CDigi 1.0.9 (`cdigi.user.js`)

Stand: 2026-10-25 – **historischer Vergleich** von CDigi 1.0.9 mit DigiBot 2.55.0. Inzwischen ist CDigi (ab 1.1.0)
die Hauptdatei. Die unten genannten Fehler und Rückschritte sind behoben, die 2.55-Änderungen übernommen; Einzelheiten
stehen in `CHANGELOG.md` unter „CDigi 1.1.0“. Nachträglich zeigte sich: Der rote Key-of-Hope-Test (Punkt 2
unter „Echte Fehler“) lag an überschriebenen Netz-Listenern in der Testwelt und an der CPU-Last beim parallelen
Testlauf, nicht an den zufälligen Bossplätzen.

## Herkunft

CDigi ist ein Fork von **DigiBot 2.54.0** (geringster Abstand im Git-Verlauf: 1157 geänderte Zeilen gegenüber
1232 zu 2.55.0). Die Änderungen aus **2.55.0 fehlen**: Weltboss hält den Kanal im Kampf, „vermisster“ Boss wird
gesucht (`farmMissWalk`), Event/Weltboss unterwegs nicht bekämpfen (`wayRecall`). CDigi löst Teile davon anders.

Fast der gesamte DigiBot-Code ist erhalten. CDigi legt rund 700 Zeilen davor und hängt sich per Proxy an
`scene.select/tapGround/approachNpc/interact` und an alle `deps.commands.*` (außer `request*`, `list*`, `get*`).

## Neue Bausteine

| Baustein | Aufgabe |
|---|---|
| `createCDigiCore` | Bot an/aus mit Sperre (`latch`), nur ein Ablauf gleichzeitig (`run`/`runPassive`), Not-Aus (Esc), Gesundheitsprüfung (offline, Anwesenheitskontrolle, Netzwechsel > 60 s, Store 30 s unverändert), Drosselung von Laufbefehlen (180 ms), Diagnose-Ringpuffer |
| `createCDigiHistory` | Befehlsverfolgung: angefordert → bestätigt / Wirkung gesehen / abgelaufen, Fehlerchronik, JSON-Export |
| `createCDigiFormation` | Zufällige, getrennte Bossplätze je Slot mit Platzreservierung der anderen Fenster, versetzter Aufbruch |
| `createCDigiCombat` | Taste 1 erst nach `attackAck` bzw. Timeout; `cdigiLatency(rtt)` statt fester `CAST_LATENCY_MS = 400` |
| Tamer-Skill (`cdigiTamerDecision`/`Election`) | Situationsabhängiger Tamer-Skill; in der Party löst genau ein Fenster aus |
| `createCDigiAccountQueue` | Quest-Runde Account 1 → 5 in einem Fenster, Anmeldung jedes Mal von Hand |
| Digitation | Warp- und DNA-/Jogress-Digitation, `apMapEvo` (Autopilot übernimmt die Map-Regeln der Lern-Route), Gründe im Log |
| `cdigiConfig` | Gespeicherte Einstellungen werden geprüft und begrenzt |
| Gruppenprotokoll `cdigi/1` | Hülle mit Sitzung, Sequenz und Zeitstempel; Typen und Absender werden geprüft |

## Entfernt bzw. geändert

- **Automatisches Einloggen entfernt** (`autoLogin`, `loginGroup`). Passwörter werden nicht mehr gespeichert; ein Knopf löscht alte.
  „🔑 Einloggen“ heißt jetzt „⧉ Fenster öffnen“.
- **Speicher-Schlüssel:** `cdigi.cfg`, `cdigi.accounts`, Kanal `cdigi-group-v1`. `digibot.cfg` und `digibot.accounts` werden einmalig
  übernommen, `digibot.cfg@<account>` nicht. Gemischte Gruppen aus DigiBot und CDigi funktionieren nicht.
- **Boss-Sieg nur mit Beleg** (`die`-Ereignis oder 0 HP). Ohne Beleg wird der Kampf nach 15 s verworfen, ohne Suche und ohne Timer.
- **Event-Boss:** kein 10-Minuten-Limit mehr nach Fensterende, 5 s Haltezeit bei kurzer Unsichtbarkeit; Kanal und Vorlauf aus `cdigiHuntPolicy`.
- **Weltboss:** Chat-Warnung macht nur noch fällig, wenn `params.boss` passt; ohne Kanal-Timer gilt nichts als fällig. Gleichstand nur bei
  exakt gleicher Zeit (vorher ±30 s → Kanal 1). „Nicht da“ sperrt den Kanal nur 30 s, ohne Respawn-Timer.
- Weltkarte: höchstens 4 Abrufe gleichzeitig, 15 s Timeout, Wiederholung nach 10 s.
- Kein `@updateURL`/`@downloadURL` → kein automatisches Update über Tampermonkey.

## Testlauf (`tests/`, jsdom)

| | grün | rot |
|---|---|---|
| DigiBot 2.55.0 | 134 | 2 (`addhptest`, `grpnexttest` – unter Last unzuverlässig) |
| CDigi 1.0.9, Tests unverändert | 53 | 84 |
| CDigi 1.0.9, Testwelt angepasst¹ | 102 | 35 |

¹ Schlüssel `cdigi.*`, `net.connected`, `fetch` mit `ok: true`, `sim/` vorhanden.

Zuordnung der 35:

- **Testwelt, nicht CDigi (23):** Die Tests schicken Gruppennachrichten ohne `cdigi/1`-Hülle – CDigi verwirft sie absichtlich
  (addmaptest, catchfighttest, catchuptest, defertest, dlgclose, fasttest, grouptest, grouptest2, grpfocustest, grpnexttest,
  holdwaittest, huntsynctest, lagetest, mirroratktest, prereqtest, reachtest, serveatktest, servestoptest, spawnguardtest,
  spreadatktest, spreadtest, talkprio). Dazu kommt `dungeontest`: Das Dungeon-Modell (`sim/`) hat kein `net.connected`, deshalb greift die 30-s-Store-Prüfung.
- **Absichtlich entfernt (4):** `logintest`, `profiletest` (automatischer Login); `bossmisstest`, `huntwaytest` (2.55-Funktionen).
- **Wahrscheinlich gewollt (1):** `remotetest` – nach „Gruppe stoppen“ startet die Gruppe nicht mehr per Nachricht (Sperre, Start nur manuell).
- **Echte Fehler bzw. Rückschritte (4):**
  1. `invitetest`: „Party einladen“ im Mitläufer-Fenster wirkt nicht. `onGroupMsg('invite')` ruft `partyInviteNow()` außerhalb von
     `run`/`runPassive` auf → `cdigiCore.action` blockiert den Befehl, solange der Leader-Bot nicht läuft.
  2. `kohgathertest`, `kohflaretest`: Mit `independentGroup` (Standard: an) sammelt sich die Gruppe nicht im Key-of-Hope-Kreis (138 px statt < 128)
     und weicht der Ultimate Flare nicht aus. Mit `independentGroup: false` sind beide grün.
  3. `wbosstest`: „gleichzeitig angekündigt → erst Ch 1“ und „Ch 2 lebt schon → erst Ch 2“ schlagen fehl (geänderte Weltboss-Planung, siehe oben).
- **Unzuverlässig (1):** `atkbantest` – einzeln wiederholt grün.

## Weitere Punkte aus dem Lesen des Codes

- **Esc ist Not-Aus für die ganze Gruppe** (`groupSend('stop')` + Sperre). Wer im Spiel einen Dialog mit Esc schließt, stoppt alle Fenster.
- `health()` stoppt nach 30 s unverändertem Store, falls `net.connected` fehlt – im echten Spiel gegebenenfalls prüfen.
- `cdigiClean` entfernt `null`-Felder aus Gruppennachrichten (z. B. `targetId: null` wird zu „fehlt“). Im Code wurde kein `=== null` darauf gefunden.
