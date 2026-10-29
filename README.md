# DigiBot

Tampermonkey-Userscript für [Digi MMO](https://play.digimmo.com.br/): Status-Anzeige (HP/DS/EXP, Ziel, EXP- und
Bits-Rate) und ein Bot, der grindet, Quests erledigt, Bosse farmt, Events und Weltbosse mitnimmt und Dungeons läuft –
allein oder mit bis zu fünf Accounts als Gruppe.

**Version 3.0** baut auf **CDigi** auf, einer Weiterentwicklung von DigiBot 2.54 durch einen Freund – danke dafür!
Die Fehler, die beim Test mit unserer Testsuite aufgefallen sind, sind behoben, und die Neuerungen aus 2.55 sind drin.
Was sich geändert hat, steht im [CHANGELOG](CHANGELOG.md).

## Installation und Updates

1. Browser-Erweiterung **Tampermonkey** installieren (Chrome, Edge oder Firefox). In Chrome/Edge in den
   Erweiterungsdetails „Benutzerskripts zulassen“ aktivieren.
2. Skript installieren: <https://raw.githubusercontent.com/DRaccon-b/Digi/main/digibot.user.js>
3. <https://play.digimmo.com.br/> neu laden und selbst einloggen.

Neue Versionen holt Tampermonkey selbst aus diesem Repo (oder per Tampermonkey-Menü → „Nach Updates suchen“).
Einstellungen von 2.x werden übernommen.

## Schnellstart

- Oben im Panel genau eine **Betriebsart** wählen: **Grinden**, **Quest-Jagd**, **Autopilot** oder **Bosse**
  (bzw. Dungeon im Reiter Bosse).
- **▶ Start** (oder **Alt+B**). Der Bot läuft erst nach diesem Klick – nichts startet von selbst.
- **■ NOT-AUS** oder **Esc** stoppt sofort alle Fenster. Nach einem Not-Aus oder einem Sicherheitsstopp geht es nur
  per Hand weiter – ein Klick auf **▶ Start** im Leader-Fenster startet dann wieder alle Fenster (ab 3.0.5).
- Zuschaltbar in jeder Betriebsart: **🎯 Event** (Mega-Jagd) und **🌍 Weltboss** (z. B. BlackWarGreymon, beide Kanäle).

## Was der Bot kann

- **Kampf:** Zielwahl nach Weglänge und EXP, Skills 2–6, Tränke F1–F3, Heil-Skills. Er weicht Warnkreisen,
  Strahlen und Fächern aus, greift einen Boss knapp im Warnkreis von draußen an und nutzt Fernangriffe von außerhalb.
  Bei langen Ansagen kämpft er weiter und läuft erst spät heraus.
- **Tamer-Skills (neu in 3.0):** setzt die Fähigkeit des Tamers je nach Lage ein – Heilung und Schutz bei Bedarf,
  Verstärkung in längeren Kämpfen (ein Angriffs-Crest wartet auf den stärksten Angriffsskill, z. B. Gate of Judgment).
  Gruppen-Buffs werden in der Gruppe abgestimmt, Selbst-Buffs zündet jedes Fenster selbst.
- **Lern-Route:** sucht selbst die Zone mit den meisten EXP pro Minute, reist hin, nimmt lohnende Feldbosse mit und
  digitiert je nach Map (Dark Tower / ohne). Beim Warten am Boss-Spawn wehrt sie Angreifer ab; ist der Boss da, hat
  er Vorrang.
- **Digitation:** „höchstmögliche Form“ – eine DNA-Linie hat Vorrang, wenn ein DNA-Partner da ist; Armor-Formen nie
  vor der normalen Linie. Warp-Digitation, Hinweise bei Dark Tower und Reaper-Sperre.
- **Quest-Autopilot:** nimmt Quests an, erledigt und gibt ab – standardmäßig „erst alles erledigen, dann gemeinsam
  abgeben“, beim selben NPC alles in einem Besuch. Tagesquests, Digi-Phone-Reisen, Quest-Bosse mit Kanal-Timern.
- **Bosse:** Boss-Rotation über mehrere Maps und Kanäle (offizielle Boss-Timer), Named-Elite-Runde, Adds zuerst.
  Ein Boss gilt erst mit Beleg als besiegt; verschwindet er mit viel HP, sucht der Bot ihn.
- **Event & Weltboss:** reist zur angesagten Mega-Jagd bzw. zum angekündigten Weltboss, hält den Kanal im Kampf
  und lässt sich unterwegs nicht von Angreifern aufhalten.
- **Food kaufen:** Reiter Food – HP-, DS- und Tamer-DS-Food wählen, der Bot reist zu Händler Tentomon (Dream Ruins) und füllt auf, danach geht er zurück zum Startpunkt.
- **Dungeons & Raids:** Kera Easy und Hard, Apocalymon, MaloMyotismon (Gruppe; Key of Hope der ClavisAngemon).
- **Gruppe (bis 5 Fenster):** Leader und Mitläufer, Bewegungen/Angriffe spiegeln, Ziele verteilen, feste
  Bossplätze je Fenster, Fenster-Anordnung, Quest-Runde (ein Fenster arbeitet mehrere Accounts nacheinander ab).

Die ausführliche Beschreibung aller Reiter und Einstellungen steht in der [Anleitung](docs/ANLEITUNG.md).

## Sicherheit und Hinweise

- **Passwörter werden nie gespeichert.** Für die Quest-Runde bleiben sie nur im Arbeitsspeicher des Fensters, bis zum
  Neuladen. Alte gespeicherte Passwörter aus 2.x lassen sich im Reiter Accounts löschen.
- **Automatischer Stopp** bei Verbindungsabbruch, hängendem Map-/Kanalwechsel und bei einer Anwesenheitskontrolle –
  die beantwortest du selbst, danach von Hand weiter.
- **Bot-Nutzung kann gegen die Spielregeln verstoßen** und zur Sperre führen, besonders bei Raids/Dungeons und
  mehreren Accounts von einer IP. Der Bot versucht nicht, das zu verschleiern.
- Minimierte oder verdeckte Fenster bremst der Browser stark – Gruppenfenster sichtbar lassen.

## Entwicklung

```bash
npm install
npm test                      # alle Tests (nachgebaute Spielwelten mit jsdom)
node tests/run.js kohtest     # einzelne Tests
node sim/dungeon-keramon.js   # Probelauf Kera Easy mit echten Bot-Fenstern
TEMPO=4 node sim/testboss.js  # Test-Boss: jede Grundform und Sondermechanik einer Boss-Attacke, Auswertung je Attacke
```

- `digibot.user.js` – das Skript (ein File, wird so installiert)
- `tests/` – Testwelten (`gw.js`, `fakeworld.js`, `groupbus.js`) und rund 140 Tests
- `sim/` – Probeläufe für Dungeons und Raids
- `docs/ANLEITUNG.md` – ausführliche Anleitung, `CHANGELOG.md` – alle Versionen

Spieldaten werden zur Laufzeit aus dem Spiel gelesen; Dateien aus dem Spiel selbst gehören nicht ins Repo.
