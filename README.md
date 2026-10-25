# CDigi – Gruppenbot für play.digimmo.com.br

**Hauptdatei:** [`cdigi.user.js`](cdigi.user.js) – in Tampermonkey installieren über
<https://raw.githubusercontent.com/DRaccon-b/Digi/main/cdigi.user.js> (aktualisiert sich danach selbst).
`digibot.user.js` (DigiBot 2.55.0) bleibt als Backup im Repo, wird aber nicht mehr weiterentwickelt.

CDigi ist aus DigiBot hervorgegangen: Alles unten Beschriebene gilt weiter. Dazu kommen die Punkte in
„CDigi – was anders ist“ direkt hier drunter.

## CDigi – was anders ist (ab 1.0)
- **Sicherheits-Pause statt Weiterlaufen:**
  - Bei Anwesenheitskontrolle, Verbindungsabbruch, zu langem Map-/Kanalwechsel oder einem Fehler im Ablauf stoppt
    der Bot und **sperrt** sich. Ein roter Hinweis oben links sagt warum.
  - Weiter geht es nur mit einem Start **von Hand**: Klick auf ▶ Start oder Alt+B.
  - Ein Start von Hand im Leader-Fenster nimmt gesperrte Mitläufer wieder mit (ab 1.1.0). Die Prüfungen
    (Anwesenheitskontrolle, Verbindung) laufen dabei trotzdem.
- **■ NOT-AUS (Alt+Esc):** stoppt und sperrt alle Gruppenfenster. Esc allein stoppt nichts, weil es im Spiel Dialoge schließt.
  Unter Windows wechselt Alt+Esc unter Umständen das Fenster; dann den Knopf im Panel nehmen.
- **Anmeldung:**
  - In Gruppenfenstern immer von Hand: „⧉ Fenster öffnen“ öffnet nur die fehlenden Fenster mit ihrem Slot.
  - Gespeicherte Passwörter aus DigiBot entfernt CDigi; ein Knopf löscht sie auch sofort.
- **Accounts nacheinander: Quest-Runde** (Reiter Accounts, ein Fenster ohne Gruppe):
  - Account 1 → 5 mit Haken und Benutzername. Pro Account läuft der Autopilot bis „keine machbaren Quests mehr“, dann
    meldet CDigi ab, den nächsten an, betritt dessen Charakter und macht weiter.
  - Das Passwort gibst du einmal ins Passwortfeld der Zeile ein. Es bleibt **nur im Arbeitsspeicher** dieses Fensters
    und ist nach dem Neuladen weg.
  - Fehlt ein Passwort, warten fertige Quests auf die Abgabe oder meldet das Spiel einen Fehler, pausiert die Runde.
    Weiter geht es mit „Runde fortsetzen“.
- **Einstellungen für alle Accounts gemeinsam** (ab 1.0.14). Beim ersten Anmelden übernimmt CDigi einmal das alte Profil
  dieses Accounts, auch das aus DigiBot (`digibot.cfg@name`).
- **Gruppe: eigene Wege und zufällige Bossplätze** (Haken oben, Standard an):
  - Jedes Fenster bricht leicht versetzt auf und sucht sich am Boss einen eigenen, freien Platz.
  - Bei Boss-Mechaniken (Warnzonen, Spiegel, Key of Hope) hat die Mechanik Vorrang.
- **Gruppen-Nachrichten im Protokoll `cdigi/1`** (Sitzung, Folgenummer, Zeitstempel). DigiBot- und CDigi-Fenster lassen
  sich nicht in einer Gruppe mischen.
- **Befehlsstatus & Fehlerchronik** (Reiter Log):
  - Jeder Befehl wird als angefordert, bestätigt oder Wirkung gesehen bzw. abgelaufen erfasst.
  - **Diagnose exportieren** lädt die letzten Abläufe als JSON herunter – das hilft bei Fehlerberichten.
- **Tamer-Skill automatisch** (Reiter Kampf):
  - Heilung und Schutz nach Bedarf, Angriffsverstärkung in längeren Kämpfen.
  - In der Party löst genau ein Fenster eine gemeinsame Fähigkeit aus.
- **Digitation:**
  - Freigegebene Warp-Digitation (Haken).
  - DNA-/Jogress-Schritte mit dem Partner, den das Spiel für den Schritt vorgibt.
  - „Autopilot: Digitationsregeln der Lern-Route übernehmen“ – Form je nach Map, mit oder ohne Dark Tower.
- **Weltboss:**
  - Fällig ist ein Kanal nur mit einem **bestätigten Timer** vom Server. Die Chat-Warnung löst nur die Abfrage aus.
  - Spawnzeiten bis 30 s auseinander gelten als gleichzeitig, dann ist Kanal 1 zuerst dran.
- **Boss-Sieg nur mit Beleg** (Tod-Ereignis oder 0 HP):
  - Ein Boss, der so aus der Sicht verschwindet, gilt als vermisst. Der Bot sucht ihn an der letzten Position und am Spawnpunkt.
  - Nach 20 s ohne ihn gilt er als vermutlich besiegt, mit kurzem Timer (5 min).
- **„Erst alles erledigen, dann abgeben“ ist Standard** (ab 1.0.14, einmalig für alle umgestellt).
  - Reihenfolge: alle Ziele, dann alle Abgaben, dann alle Annahmen.
  - Ab 1.1.0 nimmt der Bot dabei alle neuen Quests an, bevor er jagen geht.

### Änderungen in CDigi 1.1.0
- **Party einladen** aus einem Mitläufer-Fenster wirkt wieder, auch wenn der Bot des Leaders nicht läuft.
- **Weltboss:**
  - 30-s-Gleichstand: Kanal 1 zuerst.
  - Lebte der Boss laut Timer, ist am Spawnpunkt aber weg, setzt der Bot den Respawn-Timer und nimmt den nächsten Kanal.
- **Aus DigiBot 2.55 übernommen:**
  - Vermissten Boss suchen.
  - Unterwegs zu Event/Weltboss nicht kämpfen: Digimon zurückrufen und weiterlaufen. Beim Warten nur abwehren.
- **Not-Aus** jetzt auf **Alt+Esc** statt Esc.
- **„Höchstmögliche Digitation“:** Bei gleicher Tiefe kommt die normale Linie vor Armor (Aquilamon vor Halsemon).
- **Gemeinsame Einstellungen:** Das alte Account-Profil wird jetzt wirklich übernommen. Vorher markierte schon der
  Panel-Aufbau es als übernommen.
- **„Erst alles erledigen, dann abgeben“:** Alle Annahmen beim selben NPC kommen vor dem Jagen.

### Tests
`npm ci` einmal, dann `npm test` (alle Tests gegen `cdigi.user.js`, nachgebaute Spielwelten mit jsdom).
- Zeitkritische Tests (z. B. Key of Hope) brauchen CPU. Bei Fehlschlägen unter Last weniger parallel laufen lassen,
  zum Beispiel mit `JOBS=3 npm test`.
- `tests/cbus.js` verpackt selbst gebaute Gruppen-Nachrichten im Protokoll `cdigi/1`.
- `trustedClick`/`trustedKey` aus `tests/gw.js` stellen Klicks bzw. Tasten von Hand nach.

---

# DigiBot-Funktionen (gelten in CDigi weiter)

Zeigt live in Ziffern und %:
- **Digimon**: HP, DS und EXP
- **EXP / Min** (gleitender Durchschnitt der letzten 5 Minuten), **Zeit bis Level-Up**, EXP der Sitzung (↺ setzt zurück)
- **Tamer**: DS
- **Ziel** (mit Tab anvisiert): Name, Level, HP

## Aufbau des Panels (ab 2.6)
Oben immer sichtbar:
- **Modus-Schalter** – genau eine Betriebsart: **Grinden** (Monsterliste im Suchradius), **Quest-Jagd** (nur
  Quest-Monster dieser Map), **Autopilot** (Quests komplett) oder **Bosse** (Boss-Rotation / Named-Elite-Runde).
  Früher waren das einzelne Schalter in den Reitern.
- **Start/Stopp** (Alt+B) mit dem Namen des Modus, darunter die Statuszeile (Maus darüber = ganzer Text)
- **Mini-Leisten** für HP und DS des Digimons und die HP des Ziels – in jedem Reiter sichtbar

Darunter fünf Reiter; jede Gruppe darin lässt sich auf- und zuklappen (wird gespeichert), Erklärungen stehen im
ⓘ-Tooltip der Gruppe. Das Panel ist immer 320 px breit.
- **Übersicht** – Digimon (HP/DS/EXP, EXP- und Bits-Rate, Level-Up-Zeit), Tamer-DS, Ziel, Radar
- **Kampf** – Skills 2–6, Tränke & Food (F1–F3), Zielwahl (Level, Suchradius, belegte Gegner),
  Boss-Mechaniken (Ausweichen, Spiegel, Skill-Timing) und die **Monsterliste der aktuellen Map**
- **Quests** – Autopilot-Einstellungen (zugeklappt) und die aktiven Quests mit Fortschritt
- **Bosse** – Attacken des aktuellen Bosses, Boss-Farmen (Art, Start-/End-Map, Kanäle), Timer, Bossauswahl
- **Log** – Protokoll aller Ereignisse (Kills, Quests, Map-Wechsel, Level-Ups, Tränke, Autopilot-Schritte, Warnungen)

### Monsterliste (Reiter Attacken)
Zeigt alle Monster, die laut Spawn-Tabelle des Spiels auf der Map vorkommen können, plus live
gesehene Varianten – farbig markiert: **Normal** (grau), **Elite** (lila), **Boss** (rot, mit Titel und
Respawn-Zeit). ⚔ = aggressiv, „x da“ = gerade in Sichtweite. Per Checkbox (oder „alle“/„keine“) legst du
pro Map fest, was der Bot angreift. Standard: alles an außer Bosse. Angreifer wehrt er immer ab.

### Quests (Reiter Quests)
Listet alle aktiven Quests und Dailies mit jedem Ziel, Fortschritt (z. B. 3/5) und Fundort:
„✓ auf dieser Map“, „→ andere Map“ oder „nicht automatisch“ (Gespräch, Reise, Level …). Sammelziele zeigen,
welches Monster das Item droppt. Fertige Quests sind gelb markiert mit „Abgeben bei <NPC>“.

**Quest-Jagd** (Modus-Schalter oben): Der Bot jagt nur noch Monster für offene Kampf- und Sammelziele
der angehakten Quests auf der aktuellen Map – unabhängig von der Monsterliste. Schwächere Monster sind dabei
erlaubt, stärkere nur bis + Level-Unterschied. Ist hier nichts mehr offen, stoppt der Bot (mit Hinweiston).
Abgeben musst du selbst.

### Quest-Autopilot (Reiter Quests)
Modus **Autopilot** wählen, dann Bot starten. Der Bot lädt einmal die Weltkarte (alle Maps mit Portalen,
NPCs und Spawn-Zonen) und arbeitet dann selbstständig ab – die nächstgelegene Aufgabe zuerst:
1. fertige Quests beim NPC **abgeben**
2. Gesprächs- und Reiseziele erledigen
3. neue Quests, für die Level und Vorgänger-Quests passen, beim NPC **annehmen**
4. Kampf- und Sammelziele: zur passenden Spawn-Zone (passendes Level, möglichst nah) **reisen und jagen**

Zwischen Maps läuft er über die Portale (Wegfindung des Spiels), unterwegs wehrt er nur Angreifer ab.
Raid-/Dungeon-Maps werden nie betreten. Liegen mehrere Jagd-Ziele auf derselben Map, jagt er alle in einem
Durchgang. Gibt es nur noch Quests mit zu hohem Mindestlevel (oder ein Level-Ziel), grindet er am
passendsten Spot bis zum nötigen Level – abschaltbar mit „Bei Level-Sperren grinden statt stoppen“.
Unerreichbare NPCs/Ziele werden nach kurzer Zeit für 5 Minuten übersprungen. Gibt es nichts Machbares mehr,
stoppt der Bot mit Hinweiston. Keine Schnellreise (Digi-Phone).

#### Autopilot-Einstellungen
- **Reihenfolge:** „Nächste Aufgabe zuerst“ oder **„Map für Map (absteigend)“**. Die Runde geht die Maps nach
  Level absteigend durch (Dream Ruins → Highton View Terrace → … → Native Forest). Pro Map: alle Quests annehmen,
  deren Geber dort steht (plus Dailies der dortigen Daily-NPCs), alle Ziele erledigen – auch wenn die Monster auf
  einer anderen Map leben –, alles abgeben, dann weiter zur nächsten Map. Der Fortschritt bleibt gespeichert.
- **Start-Map:** wo die Runde beginnt (Standard: höchste erreichbare Map).
- **Quest-Digimon:** mit welchem Partner aus dem Team Quests erledigt werden (Wechsel wie im Wechsel-Menü).
- **Digitation:** in welche Form das Quest-Digimon vor dem Jagen digitiert (schrittweise; fehlt Tamer-DS,
  wird der Trank auf F3 benutzt, sonst geht es ohne Digitation weiter).
- **Abgabe-Digimon:** zu welchem Partner direkt vor dem Abgeben gewechselt wird (Belohnung/EXP geht an ihn).
- **Tägliche NPC-Quests (wiederholbar) mitnehmen** (Standard: an): Quests wie „The Guard Rotation“ oder
  „Candle Stubs“ (Magnamon) und „Castle Patrol“ (Gennais Hologramm) werden jeden Tag erneut angenommen,
  erledigt und abgegeben. Wie im Spiel gilt alles außer Hauptquests (q…_, a2_…_) als wiederholbar; wieder
  verfügbar ist eine Quest nach dem Tageswechsel um 7:00 UTC. Zusätzlich merkt sich der Bot, was er heute schon
  abgeschlossen hat, und nimmt es nicht doppelt an.
- **Daily-Board (ab Lv 11) mitnehmen** (Standard: aus): Daily-NPCs ansprechen und alle Dailies vom Board annehmen.
  (Der Aufbau des Boards ist erst mit einem Charakter ab Lv 11 live prüfbar.)
- **Mit Digi-Phone schnellreisen** (Standard: aus, kostet Bits): Steht auf der aktuellen Map ein Digi-Phone und
  ist das Ziel mindestens 2 Maps entfernt, ruft der Bot an und reist zur Ziel-Map – oder, falls die noch nicht
  freigeschaltet ist, zur freigeschalteten Map, die am nächsten dran liegt. Klappt es nicht, läuft er zu Fuß.

#### Verhalten im Detail (ab 2.2)
- **Level-Grenze nur nach oben:** Der Regler „Max. Level über dem Digimon“ sperrt nur zu starke Monster;
  schwächere werden immer angegriffen.
- **Quest-Annahme nach den Regeln des Spiels:** Quests der anderen Serie (Adventure / Adventure 02) werden nicht
  angesteuert; für tägliche Quests zählt das höchste Level im Team. Lehnt das Spiel trotzdem etwas ab, steht die
  Meldung des Spiels im Log („Spiel: …“).
- **Digitation:** Die Abklingzeit des Spiels wird beachtet. Vor einem Partner-Wechsel (z. B. zum Abgeben)
  digitiert der Bot zuerst zurück in die Grundform – das Spiel erlaubt den Wechsel nur dort.
- **Weite Wege:** Die Wegfindung des Spiels gibt bei weiten Zielen auf. Der Bot berechnet die Route deshalb selbst
  übers Kollisionsraster der Map und läuft in Etappen – auch zu NPCs am anderen Ende der Karte.
- **Ausweichen** (Reiter Attacken, Standard an): Steht der Tamer oder das Digimon in einem Warnkreis eines
  Flächenangriffs (Feld-/Raidbosse), läuft der Tamer aus dem Kreis und ruft das Digimon zu sich. Ab 2.2.2 wartet
  er danach draußen, bis der Warnkreis verschwunden ist, und greift auch kein Ziel an, das gerade im Kreis steht.
  Erst dann geht der Kampf weiter.
- **Warnstrahlen und Fächer (ab 2.2.3):** Neben Kreisen erkennt der Bot auch Strahl-Angriffe (z. B. Marsmon,
  Darkdramon, Justimon) und schwenkende Fächer (z. B. Gankoomon). Er sucht den nächsten freien Punkt rund um den
  Tamer – bei Strahlen also seitlich heraus – und prüft dabei alle Zonen gleichzeitig, damit er nicht von einer in
  die nächste läuft. Nicht erkannt werden Markierungen, die einem Spieler folgen, und „Inseln“ (sichere Stellen,
  auf die man sich stellen muss).
- **Freie Linie zum Ziel (ab 2.4):** Beim Ausweichen bevorzugt der Bot Fluchtpunkte, von denen die gerade Linie zum
  Ziel frei von Kreisen/Strahlen ist (höchstens ~72 px mehr Weg). Steht das Ziel frei und ist die Linie frei, greift
  er sofort wieder an, auch wenn anderswo noch Warnzonen liegen; sonst wartet er draußen.
- **Spiegel/Reflexion (ab 2.4, Reiter Attacken):** Wirft das Ziel Schaden zurück (200–700 % für ~3 s), drückt der
  Bot weder 1 noch Skills und ruft das Digimon zurück. Er hält schon 0,8 s vor Ende der Ansage an und greift danach
  wieder an.
- **Belegte Gegner (ab 2.4, Reiter Attacken):** Checkbox „Keine Gegner angreifen, die andere Spieler bekämpfen“
  (Standard an). Aus: der Bot greift auch diese Monster an. Bosse der Boss-Rotation/Named-Runde sind immer erlaubt.
- **Boss-Attacken-Anzeige (ab 2.5, oben im Reiter Bosse):** Sobald du einen Boss/Elite anvisierst (oder die
  Boss-Leiste des Spiels einen Kampf meldet), stehen dort alle Attacken des Bosses aus den Spieldaten:
  - Form: Warnkreis, Kreis um Boss, Kreise (verstreut), Strahl, Fächer, Ansturm, Bahnen, Spiegel, Markierung,
    Geteilter Treffer, Schutzzone, Inseln, Buff/Heilung, Einzelziel
  - Ansagezeit, Cooldown, Radius, bei Spiegeln Rückschaden und Dauer; Beschreibung als Tooltip
  - Zustand: „noch nicht gesehen“, „wirkt! 1,4 s“ (Ansage läuft), Countdown bis wieder bereit, „bereit“
  Der Cooldown wird ab dem ersten beobachteten Einsatz mitgerechnet (Kampf-Ereignisse des Spiels, ab Beginn der
  Ansage). Bossphasen (z. B. Attacken erst ab 50 % HP) kennt der Bot nicht; „bereit“ heißt „kann jederzeit kommen“.
- **Skill-Timing gegen Bosse (ab 2.5, Reiter Attacken, Standard an):** Jede Flächen-Attacke hat eine Ansage (meist
  2,5–3 s). Ein eigener Skill wird zurückgehalten, wenn der Boss währenddessen eine Flächen-Attacke starten könnte
  (bereit, noch nicht gesehen oder Cooldown läuft vorher ab) und gilt:
  eigener Cast + Reaktion (0,4 s) + Laufzeit aus der Zone ≥ Ansage – also nur, wenn erst unser Cast das Ausweichen
  unmöglich macht. Ebenso, wenn ein Spiegel kommen könnte und der Treffer in die Reflexion fiele. Dann nimmt der
  Bot einen kürzeren Skill; der Grund steht im Status („… zurückgehalten: …“). Laufzeit: Zonenradius bzw.
  Strahlbreite ÷ Laufgeschwindigkeit des Digimons (Spieldaten, sonst 90 px/s).
- **Level-Grenze:** bis +100 einstellbar.
- **Tooltips EXP / Bits:** Maus über „EXP / Min“ oder „Bits / Min“ zeigt die Hochrechnung pro Stunde und für 10 min,
  den Sitzungswert mit Stundenschnitt und (bei EXP) die Zeit bis zum Level-Up.
- **Breiteres Fenster:** In den Reitern Quests und Log ist das Panel breiter (340 px).
- **Bits / Min** steht im Reiter Daten unter EXP / Min.
- **Pause nur beim Tippen (ab 2.2.1):** Der Bot pausiert nur, wenn du im Chat oder einem Textfeld schreibst. Offene
  NPC-Dialoge halten ihn nicht mehr an (vorher blieb er im Gespräch hängen).

### Boss-Rotation / Digi-Eier farmen (Reiter Bosse, ab 2.3)
- **Modus „Bosse“:** Der Bot besiegt die ausgewählten Feldbosse reihum, bis du ihn stoppst. Er hat
  Vorrang vor dem Quest-Autopiloten.
- **Auswahl:** Standard sind Arukenimon (Tower Forest, Respawn 15 min) und MetalGreymon (Virus) (The Kaiser's
  Canyon, Respawn 10 min) auf Ch 1 und Ch 2. Andere Feldbosse und Kanäle lassen sich an- und abhaken.
- **Timer:** Der Bot fragt alle 6 s die Boss-Timer des Spiels ab (wie das Boss-Fenster). Das Spiel meldet je Boss
  nur einen Kanal: den, auf dem er lebt oder als Nächstes kommt. Auf der Boss-Map liest er zusätzlich die Map-Info
  des aktuellen Kanals. Nach einem eigenen Sieg setzt er den Timer selbst (Respawn-Zeit aus den Spieldaten).
  Unbekannte Kanäle schaut er nach, indem er hinreist und den Kanal wechselt.
- **Ablauf:** Er wählt den Boss, der am schnellsten kämpfbar ist (lebt oder spawnt zuerst, Reisezeit eingerechnet).
  Dann reist er hin (Portale, mit Haken im Quest-Reiter auch per Digi-Phone), wechselt außerhalb des Kampfes den
  Kanal, läuft über das Kollisionsraster bis zum Spawnpunkt (auch weit weg vom Digi-Phone) und kämpft. Ist der Boss
  nicht da, wartet er am Spawnpunkt. Ein laufendes Ziel gibt er nur für ein mindestens 20 s besseres auf.
- **Kampf:** Die gewählten Bosse werden auch über dem Level-Limit angegriffen. Andere Monster nur, wenn sie
  angreifen; andere Bosse (z. B. Golemon in Tower Forest) bleiben in Ruhe.
- **Mit anderen Spielern (ab 2.3.1):** Ein Farm-Boss gilt nie als „von anderen belegt“; der Bot kämpft mit. Fällt
  der Boss blitzschnell, zählt sein Verschwinden auf derselben Map/demselben Kanal als Sieg; der Timer wird gesetzt
  und der Bot zieht weiter.
- **Spawn-Schutz (ab 2.3.1):** Bosse nehmen die ersten 3 s nach dem Respawn kaum Schaden (99 % Reduktion). In
  dieser Zeit greift der Bot nur normal an und spart die Skills (Abklingzeit, DS) für danach.
- **Modus Named-Elite-Runde (ab 2.4):** Start- und End-Map wählen (nur Maps mit Named Elite, nach Level sortiert).
  Der Bot läuft die Maps von der Start- zur End-Map ab. Auf jeder Map prüft er jeden gewählten Kanal:
  - Lebt der Named Elite, kämpft er (auch wenn er im Spiel nur als Elite markiert ist; normale Monster gleicher Art
    bleiben in Ruhe).
  - Spawnt er in unter 2 min, wartet er in der Zone.
  - Sonst nächster Kanal, danach nächste Map. Bekannte Timer spart Wege: Ist ein Kanal sicher noch über 2 min tot,
    wechselt er gar nicht erst hin.
  - Lebt er laut Timer, ist aber nicht zu sehen, sucht er die Zone ab (max. 45 s).
  Nach der End-Map reist er per Digi-Phone zurück zur Start-Map (steht dort keins, zu Fuß) und beginnt von vorn.
- **Anzeige:** Der Reiter zeigt pro Boss und Kanal „lebt (HP %)“, „Respawn in m:ss“ oder „unbekannt“. ★ markiert
  das aktuelle Ziel, „hier“ deinen Standort.
- **Neuer Kanal (ab 2.6.1):** Ist ein gewählter Kanal noch nicht offen und die nächste freie Nummer, öffnet der
  Bot ihn selbst (wie „New channel – Open“). Das Spiel erlaubt das erst, wenn die offenen Kanäle fast voll sind;
  klappt es zweimal nicht, wird der Kanal 1 min gemieden und dann erneut versucht.
- **Grenzen:** Ist ein Kanal voll oder klappt der Wechsel dreimal nicht, wird er 5 min gemieden. Die Boss-Timer-
  Abfrage teilt sich den Speicherplatz mit dem Boss-Fenster des Spiels; dort können kurz „…“ erscheinen.

#### Map für Map mit festen Phasen (ab 2.7)
In der Reihenfolge „Map für Map: annehmen → erledigen → abgeben“ arbeitet der Autopilot jede Map in drei Phasen ab:
1. **Annehmen:** Quest-Digimon einwechseln, in die gewählte Digitation digitieren, dann alle Quests der Map annehmen.
2. **Erledigen:** alle Ziele dieser Quests (Kämpfe, Sammeln, Gespräche, Reisen).
3. **Abgeben:** erst jetzt zurück-digitieren, zum Abgabe-Digimon wechseln und alles abgeben – ohne neue Kämpfe
   (nur Angreifer werden abgewehrt).
Danach geht es eine Map tiefer und wieder von vorn. Der Phasenwechsel steht im Log.

### Gruppe mit mehreren Accounts (Reiter Accounts, ab 2.9)
- **Bis zu 5 Accounts:** Benutzername. ☑ = beim Gruppenstart dabei, ◉ = Leader.
  CDigi speichert keine Passwörter. Das Passwortfeld ist nur für die Quest-Runde und gilt bis zum Neuladen.
- **Charaktername:** Wird bei jedem Einloggen pro Account gemerkt („zuletzt: Spencer · vor 2 h“). Die Quest-Runde
  betritt genau diesen Charakter.
- **⧉ Fenster öffnen (CDigi; früher „🔑 Alle einloggen“):** Dieses Fenster übernimmt den hier eingeloggten Account
  (sonst den Leader).
  - Für jeden weiteren Account öffnet sich ein eigenes Fenster. Pop-ups für die Seite müssen erlaubt sein.
  - In jedem Fenster meldest du dich **selbst** an und wählst den Charakter. CDigi meldet in Gruppenfenstern nie an
    oder ab.
- **Dieses Fenster ist: Account 1–5 (ab 2.10.2):** Auswahl im Reiter Accounts. Sie legt fest, welcher Account in diesem
  Fenster läuft und ob es Leader oder Mitläufer ist. Gilt sofort, ohne Neuladen und ohne neues Einloggen.
  - „– keine Gruppe –“ nimmt das Fenster aus der Gruppe.
  - Ist ein anderer Account eingeloggt als eingestellt, erscheint eine orange Warnung.
- **Leader:** Fährt den Autopilot und sucht die Monster aus. Er lädt die anderen in die Party ein.
  - Nach jedem Annehmen/Abgeben/Gespräch wartet er (max. 3 min), bis die anderen es nachgemacht haben.
  - Hat er die Items/Kills schon, ein Mitläufer aber noch nicht, **jagt er weiter** und gibt erst ab, wenn alle
    abgeben können.
- **Mitläufer:**
  - Nehmen dieselben Quests beim selben NPC an und geben sie mit ab.
  - Folgen dem Leader über Maps und Kanäle und greifen sein Ziel mit an.
  - Wehren Monster ab, die die Gruppe angreifen.
  - Auf dem Weg kämpfen sie nicht.
- **Erst kämpfen, dann abgeben (ab 2.9.2):** Solange ein Gruppenmitglied noch kämpft, geht der Leader nicht zum
  Abgeben/Annehmen los. Er hilft mit und wartet höchstens 2 min.
- **▶ Bots starten / ■ Bots stoppen:** Starten bzw. stoppen nur die Bots in allen offenen Gruppenfenstern.
  Sie loggen nicht ein und öffnen keine Fenster.
  - **▶ Start / ■ Stopp** oben im Leader-Fenster (oder **Alt+B**) wirkt ebenfalls auf alle.
  - Ist der Leader mit allen Quests fertig, stoppen auch die Mitläufer.
  - Ein Fenster, das noch nicht in der Welt ist, startet seinen Bot, sobald es die Welt betritt.
- **Schneller in der Gruppe (ab 2.10):**
  - Mitläufer lesen das Ziel des Leaders direkt aus ihrer eigenen Spielwelt. Sie greifen nach etwa 0,1 s mit an,
    statt auf die nächste Meldung zu warten.
  - Änderungen (Ziel, Aufgabe, Gespräch, Kampf, Quests) melden die Fenster sofort, und der Empfänger reagiert gleich darauf.
  - Liegengebliebene NPC-Dialoge und Daily-Boards schließen Mitläufer sofort. Dialogschritte gehen schneller.
- **Bewegungen spiegeln (ab 2.10, Haken im Reiter Accounts):** Du steuerst den Leader selbst, die anderen Fenster
  laufen ihm in kleiner Formation nach, auch über Maps und Kanäle.
  - Gilt nur in Fenstern, deren Bot aus ist.
  - **Angriffe spiegeln (ab 2.10.1, zweiter Haken, Standard an):** Greift das Digimon des Leaders ein Monster an,
    greifen die anderen es sofort mit an.
    - Dabei nutzen sie ihre Skills (Haken im Reiter Kampf) und Tränke (F1–F3).
    - Sie weichen Warnkreisen aus und pausieren bei Spiegel/Reflexion.
    - Ein bloß angeklicktes Monster zählt nicht, nur ein echter Angriff. Ist das Ziel tot, hören sie auf.
- **Wichtig:** Minimierte oder verdeckte Fenster bremst der Browser stark, also alle Fenster sichtbar lassen.
  Mehrere Accounts von einer IP sind für Spielbetreiber leicht zu erkennen.

#### Neu in 2.55.0 – Weltboss/Event: Kanal halten, Sieg nur mit Beleg, unterwegs nicht kämpfen
- **Weltboss:** solange der Boss auf dem aktuellen Kanal lebt, gekämpft oder gesucht wird, bleibt der Kanal das Ziel – kein Wechsel mitten im Kampf, auch wenn der andere Kanal gleichzeitig fällig ist.
- **Sieg nur mit Beleg** (Weltboss und Boss-Rotation): ein Boss gilt nur als besiegt, wenn er zuletzt bei höchstens 15 % HP war, das Ziel 0 HP zeigt oder er tot daliegt. Verschwindet er mit mehr HP, ist er „vermisst“: der Bot sucht an der letzten Position, dann am Spawnpunkt; erst nach 20 s ohne ihn gilt er als besiegt (Timer 5 min, der nächste Boss-Timer korrigiert).
- **Event und Weltboss unterwegs** (Reise, Kanalwechsel, zum Spawnpunkt, Suche): Angreifer nicht bekämpfen – Digimon zurückrufen und weiterlaufen, wie in der Boss-Rotation. **Beim Warten am Spawnpunkt** nur Angreifer abwehren, nichts Neues anfangen.

#### Neu in 2.54.0 – Weltboss-Knopf, Event-Boss ohne Sperre
- **🌍 Weltboss** (neuer Knopf neben 🎯 Event, in jedem Modus): Weltbosse aus den Spieldaten (z. B. BlackWarGreymon) spawnen auf Kanal 1 und 2 mit eigenem Timer. Lebt er oder spawnt er in den nächsten 6 min, reist der Bot hin, wechselt den Kanal, wartet am Spawnpunkt und kämpft – zuerst der Kanal, der zuerst spawnt (gleichzeitig: Kanal 1), danach der andere. Die Chat-Warnung (5 min vorher) zählt auch, wenn der Kanal-Timer noch unbekannt ist. Das Event geht vor; danach weiter wie vorher.
- **Event: nächstes Event angesagt, alter Boss lebt noch:** erst den lebenden Boss besiegen, dann reisen.
- **Event-/Weltboss nimmt keinen Schaden** (Schutzphase): nicht mehr 1 min sperren – weiter mit Taste 1, Skills erst, wenn er wieder HP verliert.

#### Neu in 2.53.1 – Event-Boss bleibt Vorrang
- **Fenster vorbei, Boss lebt noch:** der Bot kämpft weiter (höchstens 10 min), statt mitten im Kampf zur Route, Rotation oder Abgabe zu wechseln.
- **Boss kurz nicht angreifbar oder gesperrt** (z. B. Formwechsel): das Event behält 5 s lang Vorrang – der Bot wartet beim Boss, statt zur Abgabe zu laufen.
- **Zielwahl:** der Event-Boss steht in der Zielwahl ganz oben; nach dem Anvisieren wird sofort mit dem neuen Ziel weitergemacht.

#### Neu in 2.53.0 – Code-Review: 16 Fehler behoben
- **Gesperrte Angreifer** (unerreichbar / ungültiges Ziel) werden nicht mehr endlos weiter angegriffen.
- **Nach einem Kill** sofort das nächste Ziel – kein Takt Leerlauf mehr.
- **Angriffe spiegeln:** bei Spiegel/Reflexion wird das Digimon zurückgerufen.
- **Lern-Route:** Angreifer über +15 werden nicht bekämpft (kein Wechsel aus Rückruf und Taste 1 mehr); passende Monster in der Zone weiter, sonst zum Zonenpunkt weit weg von ihnen.
- **Lern-Route:** ein Feldboss, der keinen Schaden nimmt, wird 5 min gemieden statt endlos zu blockieren.
- **Feld-Adds:** beim Aufräumen der Monsterliste gelten alte Monster nicht mehr als frisch gerufene Adds.
- **Event-Jagd:** altes Boss-Ziel der Lern-Route wird verworfen; der Kanal-Checker wechselt während der Jagd nicht weg.
- **Autopilot:** die Leerlauf-Uhr der Jagd läuft während der Kämpfe nicht weiter; ein leeres Grind-Gebiet stoppt den Bot nicht mehr (nächstes Gebiet).
- **Quest-Feldboss** wird auch angegriffen, wenn andere ihn schon bekämpfen.
- **Key of Hope:** ein bewusstloser, digitierender, DS-loser oder gestoppter Clavis gilt nicht als bereit – der nächste übernimmt.
- **Boss-Rotation:** ein lebender Boss auf dem aktuellen Kanal gewinnt immer; bei mehr als 8 Bossen werden die wichtigsten 6 plus 2 reihum abgefragt.
- **Dungeon:** der Stand eines geschafften Laufs wird beim nächsten Start zurückgesetzt.
- Bewusst unverändert: der Spawn-Schutz für Skills bei frischen Bossen.

#### Neu in 2.52.4 – Feld-Adds nur, wenn sie wirklich gerufen wurden
- Ein Monster der Add-Art zählt erst als Add, wenn es nach dem Unterschreiten der HP-Schwelle des Bosses erschienen ist, das Add-Level aus den Spieldaten hat und am Boss oder an einem Add-Spawnpunkt steht – live griff der Bot bei Puppetmon (Spiral Forest) alle umstehenden normalen Pumpkinmon an. Raids wie bisher.

#### Neu in 2.52.3 – Event-Boss auch im Autopilot und in der Boss-Rotation angreifen
- Ist der Jagd-Boss (🎯 Event) in Sicht, kämpft der Bot jetzt auch dann, wenn der Autopilot gerade zur Abgabe will oder die Boss-Rotation zum nächsten Boss woanders – vorher stand er „friedlich“ vor dem Event-Boss, bis die Abgabe erledigt war.

#### Neu in 2.52.2 – Dailies: nur der passende Level-Pool
- Daily-Pools sind Level-Bereiche (z. B. forest 11–12, spiral_low 41–48). Der Autopilot nimmt nur noch den Pool, dessen Bereich zum Level passt (und zur Serie der Welt) – vorher lief er mit Lv 45 für jeden niedrigeren Pool erneut zu Elecmon („keine Dailies angeboten“, alle 3 s).
- Bietet ein NPC keine Dailies an, gelten alle seine Pools für dieses Digimon als erledigt.

#### Neu in 2.52.1 – Lern-Route plant nach einem Digimon-Wechsel neu
- Wechselt man das Digimon, verwirft die Lern-Route alles, was fürs alte geplant war (Zone, gewählter Feldboss, Kanal-Timer, Digitations-Fehlversuche) und plant sofort für das neue – live wollte ein Lv-43-Digimon noch den Boss bzw. die Golemon Lv 70+ des alten besiegen.
- Unterwegs werden Angreifer, die mehr als 15 Level über dem Digimon liegen (keine Bosse), nicht bekämpft: Digimon zurückrufen und weiter zur passenden Zone.

#### Neu in 2.52.0 – Eigenständige Verbesserungen: schneller zurück, Skills sparen, sicherer an Bossen
- Bewusstlos: „Zurück zum Lager“, sobald das Spiel es erlaubt – statt auf die automatische Rückkehr zu warten.
- Angreifer ohne Weg (z. B. Fernkämpfer jenseits des Wassers) werden nicht mehr „abgewehrt“ – das Digimon kommt nicht hin; vorher stand der Bot bis zur Hängen-Erkennung (12 s) still und blockierte Lern-Route/Autopilot. Ein gewähltes Ziel ohne Weg wird fallen gelassen (außer Boss-/Leader-Fokus und Adds).
- Normale Monster, die ohnehin gleich fallen (Rest-HP unter ~0,6 s des eigenen Schadens), bekommen keine Skills mehr – spart DS und DS-Tränke. Bosse, Elites und zähe Monster wie bisher.
- Lern-Route: auf dem Weg zum Feldboss und am Spawnpunkt mit F1/F2 auf 70 % HP bzw. 40 % DS auffüllen, auch wenn die normale Trank-Schwelle aus ist (live: Mummymon +15 bei 55 % HP begonnen).
- Lern-Route: ein Feldboss, der das Digimon umgehauen hat, bleibt 30 min aus der Boss-Runde (keine Level-Grenze – aber aus Erfahrung lernen).
- Lern-Route: Suchpunkte in der Zone nur dort, wo man hinkommt – liegt ein Teich in der Zone, läuft der Bot nicht mehr ins Wasser.

#### Neu in 2.51.0 – Zielwahl nach Weglänge (Seen, Schluchten, Wände)
- Die Zielwahl rechnet mit der Weglänge des Digimons statt der Luftlinie: Dijkstra über das Kollisionsraster der Map (8 Richtungen, diagonal nur ohne Ecke – wie die Wegfindung des Spiels). Der Suchradius gilt für den Weg; ein Monster jenseits eines Sees, dessen Weg außen herum länger ist als der Radius, wird nicht mehr gewählt, sondern das erreichbare.
- Monster ohne Weg (Insel, andere Seite einer Klippe ohne Übergang – getrennte begehbare Bereiche wie im Spiel) werden nie als Ziel genommen; auch der Autopilot läuft nicht mehr zu ihnen. Angreifer werden weiter abgewehrt.
- „Nächstes Monster“ heißt jetzt das nächste zu Fuß. Die Rechnung kostet unter 1 ms und läuft nur, wenn das Digimon ein neues Feld betritt. Ausweichen bleibt wie bisher.

#### Neu in 2.50.0 – Option „Quests nur erledigen, nicht abgeben“, Fehler aus der Code-Durchsicht
- Autopilot-Einstellung „Quests nur erledigen, nicht abgeben“: der Autopilot nimmt Quests an und erledigt die Ziele, fertige Quests bleiben aber stehen – abgeben macht man selbst. Der Knopf „📜 Abgeben & Annehmen (diese Map)“ gibt weiterhin ab; Mitläufer machen Abgaben des Leaders mit dieser Option nicht nach. Ist alles erledigt, sagt der Bot beim Stoppen, wie viele Quests fertig zum Abgeben sind.
- Boss-Rotation und Named-Elite-Runde erkennen Named Elites jetzt an den Werten (erhöhte HP, Boss-Flag) wie die Lern-Route – vorher galten normale Monster gleicher Art und Stufe als Ziel (z. B. jeder Tyrannomon in Harvest Hills), und der Bot griff sie an, während er auf den Named Elite wartete.
- Lern-Route am Spawnpunkt: die Suchzeit (20 s) zählt erst ab dem Respawn – nach frühem Ankommen gab der Bot sonst genau zum Respawn auf.
- Channel-Checker wechselt nicht mehr weg, solange die Lern-Route einen Boss im Blick hat.
- „Feldbosse mitnehmen“ an/aus und geänderte Kanäle bewerten die Lern-Route sofort neu.
- EXP/Min: ein Partner-Wechsel zählt nicht mehr als EXP-Gewinn. EXP-Messung begrenzt ihren Speicher. Tooltip „Nächste Map“ ohne rohe Zeilenumbrüche im Quelltext.

#### Neu in 2.49.1 – Digitation in der Lern-Route, Adds erst ab Boss-HP-Schwelle
- Die Lern-Route digitiert jetzt auch auf dem Weg zum Boss und im Kampf (Befehl geht raus, der Kampf läuft weiter) – live blieb ClavisAngemon 12 min Angemon, weil zwischen Bossen und Angreifern nie „zwischen den Kämpfen“ war.
- Fehlversuche beim Digitieren werden nach jedem gelungenen Schritt neu gezählt – vorher galt nach fünf gelungenen Schritten (z. B. Patamon → … → Seraphimon, zurück, Angemon) der nächste als „klappt nicht“.
- Feld-Adds zählen erst, wenn der Boss die HP-Schwelle aus den Spieldaten erreicht hat (atHp), und nur nahe am Boss – live galt in Tower Forest jeder Golemon als Add von Arukenimon, der sie erst ab 50 % ruft.

#### Neu in 2.49.0 – Lern-Route: Digitation je nach Map (mit / ohne Dark Tower)
- Unter „Lern-Route: zwischen den Kämpfen digitieren“ (Reiter Kampf) zwei Auswahlen: „Form ohne Dark Tower“ (Standard: höchstmögliche Digitation) und „Form mit Dark Tower“ (Standard: höchste freie Armor-Form – unter Kaisers Dark Towers klappt nur Armor). Möglich sind jeweils „keine“, „höchstmögliche“, „höchste Armor-Form“ oder eine bestimmte Form.
- Liegt die Zielform auf einem anderen Ast (z. B. Mega → Armor beim Betreten von Harvest Hills, Kaiser's Canyon, Sunset Bay, Kaiser's Fortress oder Tower Forest), digitiert der Bot erst zurück in die Grundform und dann hoch. Aus einer Armor-Form sucht „höchstmögliche“ von der Grundform aus.

#### Neu in 2.48.2 – Lern-Route: Boss-Wege live nachgebessert
- Beim Warten am Spawnpunkt wehrt der Bot Angreifer ab (live: HP 99 → 55 % bis Mummymon kam, ohne zurückzuschlagen). Auf dem Weg dorthin bleibt es beim Durchlaufen.
- Kanalliste nur für die aktuelle Map: kurz nach einem Map-Wechsel kam live noch die Liste der alten Map, deren Raum-ID für „Ch 2“ brachte den Bot zurück auf die alte Map.
- Kanäle mit bekanntem Boss-Zustand (gerade besiegt, Boss-Timer der Karte) werden nicht mehr eigens angesehen (spart je 7 s).
- Reisezeit je Map-Wechsel wird auf den Wegen zu Bossen gemessen (gleitend, anfangs 30 s statt 45 s) und für Abfahrt und Bewertung benutzt – live 8–15 s, der Bot stand vorher ~30 s zu früh am Spawnpunkt.

#### Neu in 2.48.1 – Lern-Route rechnet Feldbosse ein, „Nächste Map“ zeigt den echten Wechsel
- Die Lern-Route bewertet jede Map mit Grinden plus den Feldbossen ihrer Rotation (die Map und bis zu zwei darunter, höchstens 2 Level unter dem Digimon): EXP je Respawn auf allen erlaubten Kanälen, abzüglich Kampf, Weg, Kanalwechsel und Reise (30 s je Map-Wechsel). Live geprüft: Lv 48 in Sunset Bay ≈ 19 800 EXP/min geschätzt, gemessen ≈ 20 000.
- „Nächste Map“ zeigt das Level, ab dem die Lern-Route wirklich wechselt (beste Zone dort mindestens 15 % besser als hier, mit Bossen), statt der einfachen Level-Grenze. Tooltip: beide Raten bei diesem Level.

#### Neu in 2.48.0 – Lern-Route: Bosse zwei Maps tiefer, schneller Kanalwechsel, Event-Fix
- Feldbosse auch zwei Maps tiefer (gleiche Regel: höchstens 2 Level unter dem Digimon). Gerechnet: direkt nach dem Map-Wechsel (Lv 41 in Sunset Bay + Drimogemon) +14…18 % EXP/min, nach ~6 Level nichts mehr – etwa 3–5 min gespart je Map.
- Kanalwechsel zum nächsten Boss gleich nach dem Sieg, auch wenn gerade ein Monster angreift (wie in der Boss-Rotation). Fehlversuche beim Kanalwechsel werden je neuem Ziel neu gezählt – vorher galt nach drei gelungenen Wechseln der vierte als „klappt nicht“ und Ch 2 wurde 5 min gemieden, obwohl dort der Boss lebte.
- Event (Mega-Jagd): Ist der Jagd-Boss auf der Map, funkt die Lern-Route nicht mehr dazwischen (live bei Regalecusmon: Bot pendelte zwischen „suche“ und „reise zu Sunset Bay“).

#### Neu in 2.47.1 – EXP je Monster über alle Maps
- „Sitzung: EXP je Monster“ zählt jetzt über alle Maps der Sitzung statt nur der aktuellen. Maus über eine Zeile zeigt zusätzlich, auf welchen Maps die Kills waren.

#### Neu in 2.47.0 – Übersicht: EXP je Monster
- Neuer Abschnitt „Sitzung: EXP je Monster (diese Map)“: je Monsterart der aktuellen Map die eigenen Kills, die EXP zusammen und der Anteil – nur Arten, die schon EXP gebracht haben. Maus über eine Zeile zeigt Ø EXP je Kill. Eigener ↺-Knopf setzt nur diese Liste zurück; ↺ bei den Sitzungswerten leert sie mit.

#### Neu in 2.46.0 – Lern-Route: Feldboss der Map darunter mitnehmen
- Die Boss-Runde der Lern-Route nimmt auch die Feldbosse der Map darunter mit (gleiche Serie, nächstniedrigeres Monster-Level), solange der Boss höchstens 2 Level unter dem Digimon liegt. Reisezeit wird eingerechnet (45 s je Map-Wechsel): der Bot fährt los, wenn der Boss lebt oder bis zur Ankunft spawnt, liest dort die Timer der Kanäle und kehrt danach zur Lern-Zone zurück.
- Gerechnet (Lv 40 in Kaiser's Canyon, MetalGreymon Ch 1+2, dazu Drimogemon Ch 1+2): ≈ +32 % EXP/min bei Lv 40, +19 % bei Lv 44, ab Boss-Level +2 kaum noch.
- Boss-EXP gemessen: Basis × Level^1,1 × 1,5 bei +5…+8, darüber −0,0365 je Level.

#### Neu in 2.45.2 – Lern-Route: auf dem Weg zum Feldboss keine Kämpfe
- Auf dem Weg zum Feldboss kämpft der Bot nicht mehr, auch nicht gegen Angreifer: Digimon zurückrufen und weiterlaufen (live: unterwegs zu MetalGreymon (Virus) Guardromon angegriffen). Ohne Boss-Ziel werden Angreifer wie bisher abgewehrt.

#### Neu in 2.45.1 – Lern-Route: Feldboss erst 10 s vor dem Spawn, Ch 2 öffnen
- Zum Feldboss läuft der Bot erst, wenn er lebt oder höchstens noch 10 s bis zum Respawn fehlen (vorher 30 s).
- Ist Ch 2 unter „Kanäle“ erlaubt, aber noch nicht offen, öffnet der Bot ihn selbst, um den Boss-Timer dort zu lesen und den Boss mitzunehmen (live: nur Ch 1 offen, Ch 2 wurde nie angesehen).

#### Neu in 2.45.0 – Übersicht: „Nächste Map“ mit Restzeit
- Unter den Kacheln der Übersicht steht die nächste Map der Serie (die mit dem nächsthöheren niedrigsten Monster-Level), ab welchem Level sie in der Level-Grenze liegt und wie lange es bei der aktuellen EXP/min (Schnitt der letzten 5 min) bis dahin noch dauert. Tooltip: EXP bis dahin.
- EXP-Kurve des Digimons gemessen: 40·L^1,8 + 20, ab Lv 26 × (1 + 0,5·(L − 25)^0,6).

#### Neu in 2.44.6 – Lern-Route: immer die untersten beiden Stufen der Zone
- Liegt das niedrigste Monster der Zone an der Level-Grenze, sind trotzdem ihre untersten beiden Stufen erlaubt (z. B. Lv 32 mit +8 in Harvest Hills: Lv 40 und 41), höchstens +12 – vorher nur Lv 40, und der Bot suchte lange.

#### Neu in 2.44.5 – Lern-Route ohne Named Elites, weniger Umwege
- Named Elites gehören nicht mehr zur Boss-Runde der Lern-Route (kaum mehr EXP als ein normales Monster), nur echte Feldbosse.
- Außerhalb der Zone werden sichtbare passende Monster weiter bekämpft; ohne Ziel läuft der Bot nur bis an den nächsten Punkt der Zone statt zur Mitte (live: nach jedem Kampf am Rand zur Mitte und wieder hinaus).

#### Neu in 2.44.4 – Weg zum Feldboss nicht mehr durch neue Kämpfe unterbrochen
- Ist ein Feldboss der Lern-Map lebendig, läuft der Bot direkt hin und fängt unterwegs keine neuen Kämpfe mit normalen Monstern an (live wurde der Weg bei jedem Monster am Rand abgebrochen). Angreifer werden weiter abgewehrt.

#### Neu in 2.44.3 – Feldbosse unabhängig von der Level-Grenze
- Die Lern-Route nimmt Feldbosse und Named Elites der Map jetzt unabhängig von der Level-Grenze mit. Live in Harvest Hills lagen Tyrannomon (Lv 44) und Drimogemon (Lv 45) für Lv 30 über +8 und wurden ausgelassen, obwohl sie lebten.
- `levelbosstest` prüft auch einen Boss über der Grenze.

#### Neu in 2.44.2 – Lern-Route sucht in der Zone
- Bei Zonen über der Level-Grenze gilt jetzt der ganze niedrigste Level-Bereich der Zone als erlaubt, z. B. Lv 40–41 in Harvest Hills / Felder, höchstens +12. Bisher war es nur das einzelne niedrigste Level, und ab Lv 30 stand davon oft keins im Suchradius.
- Steht in der Zone nichts Passendes im Suchradius, läuft der Bot zu einem anderen Punkt der Zone, statt zu warten. Status: „suche Monster in …“.
- `levelroutetest` prüft das jetzt mit.

#### Neu in 2.44.1 – Lern-Route rechnet mit dem gemessenen Schaden
- Der Bot misst seinen eigenen Schaden je Sekunde laufend selbst, je Digimon-Form und gleitend über die letzten ~10 Kills. Die Lern-Route rechnet damit, sobald 5 Kills gemessen sind. Vorher nimmt sie die Schätzung (1,55 × AT je Angriff).
- Grund: Live lag die Schätzung für Shurimon gegen +11-Gegner 25 % zu hoch (4 015 statt 3 066/s). Die EXP-Formel stimmte dagegen exakt (557 EXP je Kill).

#### Neu in 2.44.0 – Lern-Route über die Level-Grenze, wenn es sich lohnt
- Liegt eine Zone ganz über der Level-Grenze (z. B. +8), rechnet die Lern-Route sie mit ihren **niedrigsten Monstern** durch, bis höchstens +12. Bringt das mehr EXP/min als die beste Zone innerhalb der Grenze, geht der Bot dorthin und erlaubt dort genau bis zum niedrigsten Monster-Level der Zone. Durch die EXP-Priorität nimmt er dann die niedrigsten zuerst, höhere lässt er stehen. Bosse bleiben an der normalen Grenze.
- Beispiel Shurimon Lv 29: Harvest Hills / Felder ab +11 ≈ 6 330 EXP/min gegenüber Digi-Egg Valley / Grabungsstelle mit +5 bis +8 ≈ 4 860 EXP/min.
- Die aktuelle Zone wird bei jeder Neuberechnung (alle 30 s, bei Level-Up und sofort beim Verstellen der Level-Grenze) neu bewertet. Bringt sie nichts mehr, wechselt der Bot ohne die 3-Minuten-Wartezeit.
- Im Log steht dann „nur die niedrigsten ab +11“.

#### Neu in 2.43.2 – Named Elites richtig erkennen
- Live in Harvest Hills: Der Named Elite Tyrannomon („The Kaiser's Overseer“, Lv 44) läuft zwischen vielen normalen Tyrannomon derselben Art und desselben Levels herum. Bisher galt jeder davon als dieser Boss, und der Bot meldete alle 15–20 s „Boss besiegt“.
- Jetzt gilt: Hat der Boss-Eintrag einen Werte-Multiplikator (`statMult`, hier 2,06), zählt nur ein Monster mit entsprechend erhöhten HP als Boss. Echte Bosse mit Boss-Flag zählen wie bisher. Das gilt auch für die Boss-Rotation und die Named-Elite-Runde.
- Unter den Dark Towers des Kaisers geht nur Armor-Digitation. Die Lern-Route digitiert dort deshalb z. B. zu Shurimon statt zu Aquilamon.
- Neuer Test `namedmatchtest`.

#### Neu in 2.43.1 – Lern-Route digitiert
- Neuer Haken **„Lern-Route: zwischen den Kämpfen in die höchstmögliche Digitation“** (an). Nach dem Neuladen ist das Digimon wieder Rookie, und der Grind-Modus digitierte bisher nie selbst. Jetzt digitiert der Bot zwischen zwei Kämpfen Stufe für Stufe in die höchste freigeschaltete Form. Gesperrte Stufen (Quest- oder Item-Voraussetzung) lässt er aus.
- Neuer Test `levelevotest`.

#### Neu in 2.43.0 – Lern-Route nimmt Feldbosse mit
- Neuer Haken **„Lern-Route: Feldbosse der Map ohne Enrage mitnehmen“** (an). Es zählen Feldbosse und Named Elites der aktuellen Lern-Map, die keinen Enrage-Timer haben und höchstens die Level-Grenze über dem Digimon stehen.
- Beim Ankommen auf der Map besucht der Bot jeden erlaubten Kanal (Reiter Bosse → Kanäle) einmal und liest dort die Boss-Timer, denn das Spiel nennt sie nur für den aktuellen Kanal. Derweil grindet er weiter.
- Lebt ein Boss oder spawnt er in unter 30 s, wechselt der Bot auf dessen Kanal, läuft zum Spawnpunkt und kämpft. Danach (der Respawn-Timer wird gesetzt) geht er zurück in die Zone. Ist der Boss nach 20 s am Spawnpunkt nicht da, vergisst er den Timer und grindet weiter.
- Neuer Test `levelbosstest`.

#### Neu in 2.42.0 – Lern-Route: selbst zur besten Zone
- Neu im Reiter Kampf: **Lern-Route**. Beim Grinden reist der Bot selbst zur Zone mit den meisten EXP/min für das aktuelle Level, Haken „nur in Adventure 02“ standardmäßig an.
- So bewertet er die Zonen:
  - EXP pro Kill nach der gemessenen Formel, Monster-HP aus den Daten, eigener Schaden aus Angriff und Angriffstempo (1,55 × AT je Angriff, geeicht an Aquilamon), dazu 1,3 s Suchzeit.
  - Es zählen die Monster, die die EXP-Priorität tatsächlich nimmt, und nur bis zur eingestellten Level-Grenze (höchstens +12).
- Neu gerechnet wird alle 30 s und bei jedem Level-Up. Gewechselt wird erst, wenn eine andere Zone mindestens 15 % mehr bringt und der Bot schon 3 Minuten in der jetzigen war.
- Unterwegs wehrt er Angreifer ab und beendet einen laufenden Kampf, in der Zone grindet er wie gewohnt.
- Digitieren macht der Grind-Modus weiterhin nicht von selbst.
- Neuer Test `levelroutetest`.

#### Neu in 2.41.0 – EXP-Priorität beim Grinden
- Gemessen mit der EXP-Messung (~280 Kills, Hawkmon/Aquilamon in Digi-Egg Valley): **EXP pro Kill = EXP-Grundwert × Monster-Level^1,1 × Faktor.** Der Faktor hängt vom Abstand zum eigenen Digimon ab:
  - −15 % je Level darunter, ab −6 nur noch die Mindestmenge von 1 EXP.
  - +10 % je Level darüber.
  - **+5 bis +8 = ×1,5**, danach wieder weniger (+9 ×1,42, +10 ×1,36, +11 ×1,30).
  - Außerdem gilt: EXP bis zum nächsten Level = 40 × Level^1,8 + 20.
- Neuer Haken im Reiter Kampf, **EXP-Priorität** (an): Beim Grinden nimmt der Bot unter den Monstern im Suchradius zuerst die mit +5 bis +8 Level, dann +4, +3 … bis unter das eigene Level, und erst ganz zuletzt welche über +8. Innerhalb einer Stufe nimmt er das nächste. Angreifer, Quest-Monster, Bosse und Gruppenziele gehen wie bisher vor.
- Damit +5 bis +8 überhaupt in Frage kommen, muss „Max. Level über dem Digimon“ mindestens +8 sein (Standard +5).
- Level-Simulation Lv 1→99 nur mit A2-Maps, reines Grinden, Tamer-Ausrüstung des Testkontos: ~6 h reine Kampfzeit mit EXP-Priorität (ohne ~6,2 h), mit doppelter Suchzeit ~7,6 h.
- Neuer Test `expprio`.

#### Neu in 2.40.1 – Event: Jagd-Boss sicherer erkennen
- Live stand der Jagd-Boss nah bei der Gruppe, der Bot erkannte ihn aber nicht. Bisher musste seine Art genau der Angabe im Event-Fenster entsprechen, manche Jagd-Bosse wechseln aber die Form (z. B. Justimon → `justimon_hunt_blitz` / `_critical`). Jetzt zählt jede Jagd-Boss-Art (`…_hunt…`) auf der Event-Map. Davon gibt es dort nur einen.
- Sobald der Bot einen Jagd-Boss sieht, steht das im Log mit Art, Flags und Abstand. Wird er künftig wieder nicht angegriffen, sieht man den Grund.
- `hunttest` prüft jetzt auch einen Boss in anderer Form.

#### Neu in 2.40.0 – EXP-Messung
- Reiter **Log**: Haken **EXP-Messung**, dazu die Knöpfe „Messung kopieren“ und „Messung löschen“. Daneben steht, wie viele Kills und Level schon erfasst sind.
- Je eigenem Kill schreibt der Bot mit: Monster (Art, Level, Max-HP), das eigene Digimon (Art, Level, EXP vorher, EXP bis Level-Up), Tamer-Level, Map, Gruppengröße, die erhaltenen EXP und die Kampfdauer.
  - Die EXP kommen aus der Chat-Meldung „+341 EXP“, inklusive Gruppenanteil. Fehlt die Meldung, nimmt er die EXP-Differenz und markiert das.
  - Dazu die Zeit seit dem vorherigen Kill (Suchen und Laufen) und die eigenen Treffer: Schaden, Krits, Fehlschläge.
  - Je Level wird außerdem festgehalten, wie viele EXP bis zum nächsten nötig sind.
- Kills, die ein anderer beendet, zählen nicht. Gespeichert wird im Browser (`localStorage`, höchstens 3 000 Kills).
- Zweck: Daten für eine Simulation, wie lange Grinden von Level 1 bis 99 dauert. EXP-Formel, Level-Tabelle und Schaden rechnet der Server, sie stehen nicht in den Spieldaten.
- Neuer Test `expmesstest`.

#### Neu in 2.39.0 – Tamer-Essen vor Pandæmonium Lost
- MaloMyotismons Pandæmonium Lost trifft alle 20 s den ganzen Raum und verbrennt dabei 45 % der Max-DS jedes Tamers (`tamerDsBurn` in den Daten). Ist das Tamer-DS leer, digitiert der Partner zurück. Live wurden so alle vier ClavisAngemon zu Patamon, ohne einen einzigen Sturz, und der Schaden brach ein.
- Wird ein solcher Treffer angesagt und fiele das Tamer-DS danach unter die eingestellte Grenze (Reiter Kampf, Tamer-DS, mindestens 10 %), isst der Bot sofort Tamer-Essen von F3. Sonst gilt die Grenze wie bisher. Das gilt auch beim Spiegeln.
- Voraussetzung: In jedem Fenster liegt Tamer-Essen auf F3, zum Beispiel Bento (+1 000) oder Ramen (+1 500). Bei 45 % Brand alle 20 s lohnt eine Grenze um 50 %.
- Neuer Test `tamerburntest`.
- Simulator: `CLAVIS=Anzahl` (1–4) und `CLAVIS_LV=Level` für die ClavisAngemon. Mit Live-Werten schafft keine Aufstellung aus Bauzel und Clavis Raum 3 rechtzeitig. Am nächsten kommt Bauzel + 2 Clavis Lv 100 mit 7 % Rest.

#### Probelauf Hard mit Live-Werten (`LIVE=1`)
- Erster Live-Versuch Hard (Bauzel + 4 ClavisAngemon Lv 70–72): Raum 3 verloren. Diaboromon stand nach ~300 s bei 37 %, und es gab 4 Stürze. Gemessener Schaden am Boss: Bauzel ~9 000/s, ClavisAngemon ~1 000–1 200/s, zusammen ~12 000/s. Mit 5 Spielern hat Diaboromon 6,73 Mio. HP. Für die Uhr (360 s) bräuchte es ~18 700/s.
- Die Stürze: Die Bots liefen nach dem Ende des Warnkreises sofort zurück, live schlug die Volley aber 0,2–0,4 s später ein. Einmal konnte ein vom Tentacle Bug gegriffener Clavis nicht ausweichen.
- `LIVE=1` stellt den Simulator auf diese Werte ein: Schaden Bauzel × 0,72 (→ ~9 000/s), ClavisAngemon × 0,19 (→ ~1 100/s), Einschlag 300 ms nach dem Ende des Warnkreises. Einzeln einstellbar mit `F_PAL`, `F_CLAV` und `EINSCHLAG_MS`. Am Ende steht der Schaden am Boss je Sekunde für jedes Mitglied.
- Ein Lauf `LIVE=1 TEAM=clavis TEMPO=4`: Raum 3 an der Uhr gescheitert, Diaboromon bei 36 %, 0 Stürze. Das deckt sich mit dem Live-Versuch. Fazit: Mit 4 Clavis reicht der Schaden nicht, denn jedes Mitglied über 3 gibt dem Boss +45 % HP, bringt aber nur ~1 100/s.

#### Neu in 2.38.0 – 🎯 Event: Mega-Jagd
- Neuer Knopf **🎯 Event** neben Start. Er gilt zusätzlich zu jedem Modus, außer im Dungeon.
- So läuft die Mega-Jagd im Spiel: Alle 2 Stunden erscheint ein Mega-Weltboss (Regalecusmon, Marsmon, Gankoomon, Justimon …) an einer zufälligen Stelle einer Feld-Map, nur auf Kanal 1. Er greift nie zuerst an. Der Chat warnt 5 Minuten vorher.
- So macht es der Bot:
  - Er fragt das Event-Fenster des Spiels nach Boss, Map und nächster Jagd: jede Minute, während einer Jagd alle 10 s, bei der Chat-Warnung sofort.
  - Ab 6 Minuten vor dem Erscheinen reist er zur Map und wechselt auf Kanal 1. Dort wartet er mit Countdown.
  - Danach läuft er die Jagdgebiete der Map der Reihe nach ab, bis der Boss in Sicht ist, und kämpft. Der Boss hat Vorrang vor anderen Zielen, Angreifer wehrt er vorher ab.
  - Ist der Boss besiegt oder die Jagd vorbei, geht es mit dem vorherigen Modus weiter.
- In der Gruppe sucht nur der Leader, die anderen folgen ihm wie gewohnt und greifen sein Ziel mit an.
- Neuer Test `hunttest`. Live noch nicht geprüft.

#### Neu in 2.37.0 – Deckung hinter Platten (Ultimate Flare)
- Laut Spieldaten schützen vier zerbrochene Platten in Raum 4 vor der Ultimate Flare (`slab_1`–`slab_4`, Radius 26 px). Geschützt ist, wer auf der vom Boss abgewandten Seite steht (live bestätigt).
- Steht das Digimon im Flare-Fächer und ist eine Platte näher als der Weg aus dem Fächer hinaus, läuft es 12 px hinter die Platte. Dort gilt es als sicher, weicht nicht weiter aus und läuft nicht zurück. Es gelten dieselben Prüfungen wie sonst: Der Weg ist frei von anderen Zonen, und der Punkt ist vor dem Einschlag erreichbar.
- Funktioniert allgemein für jede Attacke mit `cover` in den Daten.
- Simulator: Platten und Deckung nachgebildet. Im Ergebnis steht, wie oft die Deckung half.
- Probelauf ab Raum 4, je 10 Läufe: alt und neu beide 10/10, 0 Stürze, 0 Flare-Treffer. Die Deckung wurde bei rund 28 % der Flare-Ausweichmanöver genutzt. Der Armageddemon-Kampf dauerte gleich lang (Ø 262 s alt, 264 s neu).
- Neuer Test `covertest`.

#### Probelauf Hard: Raum 4 erst Herde, dann Armageddemon
- Der Simulator bildet Raum 4 jetzt ab wie live: zuerst die 10 Kuramon-Wellen, danach erscheint Armageddemon. Bisher lief beides gleichzeitig. Der Enrage (8 min) zählt ab seinem Erscheinen.
- 10 volle Läufe (Raum 3 + 4, Bauzel + 4 ClavisAngemon Lv 70, ×4): **10 von 10 geschafft**, insgesamt 2 Stürze.
  - Raum 3: 210–234 s (Uhr 360 s).
  - Raum 4 mit Herde: 384–398 s. Der reine Armageddemon-Kampf dauert 265–281 s (Enrage 480 s).
- Die zwei Stürze (ein Lauf): Zwei Clavis wichen kurz vor der Black-Rain-Hülle noch einer Zone aus und erreichten den Schutzkreis nicht mehr rechtzeitig.

#### Neu in 2.36.3 – Fernangriff von draußen nur, wenn es sicher ist
- Nach einem Fernangriff läuft das Digimon dem Ziel zum Nahkampf hinterher. Der Bot feuert deshalb von draußen nur noch, wenn das Digimon auf diesem Weg keine Zone erreicht, bevor sie eingeschlagen hat. Ist die Restzeit unbekannt, bleibt es wie bisher.
- Fächer (Ultimate Flare) haben jetzt auch eine Restzeit.
- Grund (Probelauf Hard): In der Cluster-Phase feuerten die Clavis 0,6–1,2 s vor der Ultimate Flare, liefen hinterher in den Fächer und fielen alle (2 von 10 Läufen).
- 10 volle Läufe (Raum 3 + 4, ×4): **9 geschafft, 0 Stürze in diesen 9**, Raum 3 in 213–235 s, Raum 4 in 294–310 s. Offen: In einem Lauf wechselten alle während einer aktiven Flare auf einen Kuramon der frisch erschienenen Herde. Der Weg war frei, aber die Herde lief weiter, und die Digimon folgten ihr in den Fächer.
- Neuer Test `rangedsafetest`.

#### Neu in 2.36.2 – Key of Hope auch fern vom Boss
- Geteilte Treffer (Black-Rain-Hülle, Catastrophe Cannon) folgen einem Spieler. Key of Hope deckt sie jetzt unabhängig davon, wie weit der Boss entfernt ist. Andere Block-Treffer gelten weiter nur bis 700 px um den Boss.
- Grund (Probelauf Hard): In der Kuramon-Cluster-Phase (Boss unter 20 %) standen alle weit vom Boss entfernt. Niemand sammelte sich, zwei Clavis zündeten erst nach dem Einschlag, und es gab 2 Stürze.
- 10 volle Läufe (Raum 3 + 4, ×4): 8 geschafft, 0 Stürze durch Black Rain, Raum 3 in 216–236 s, Raum 4 in 289–309 s. Offen: Die zwei Fehlschläge kommen von der Ultimate Flare in der Cluster-Phase. Ein Fernangriff von draußen kurz vor dem Einschlag lässt das Digimon dem Ziel hinterher in den Fächer laufen.
- Neuer Test `kohrangetest`.

#### Neu in 2.36.1 – Raum 4 (Hard) wieder stabil
- **Ultimate Flare** wird ausgewichen statt geblockt. Als Block fraß sie in Raum 4 rund die Hälfte der Keys, und für die Black-Rain-Hülle war dann keiner mehr bereit. Schlägt sie kurz vor einem Block-Treffer ein, deckt der Key sie wie bisher mit ab.
- **Sammeln für den Key:** Eine Attacke, die vor dem Zünden einschlägt (der Schutz deckt sie nicht), wird auch in den letzten 2 s noch ausgewichen. Bisher stand die gesammelte Gruppe dann darin.
- **Kein spätes Loslaufen,** solange ein Boss einen Key-of-Hope-Treffer ansagt. Die Gruppe sammelt sich dann, und wer spät losläuft, steht beim Sammeln noch verstreut.
- **Verschwundene Ziele:** Fehlt das ausgewählte Ziel länger als 1 s in der Spielwelt (z. B. ein Kuramon der Herde ist am Ei angekommen), lässt der Bot es fallen und nimmt ein anderes. Bisher „griff“ er bis zu 5 Minuten ins Leere an.
- Probelauf Hard ab Raum 4 (Bauzel + 4 ClavisAngemon Lv 70, ×4, Digimon-Steuerung):
  - 2.36.0: 4 von 5 geschafft, 6 Stürze.
  - 2.34.2: 5 von 5, 0 Stürze.
  - **2.36.1: 10 von 10, 0 Stürze**, Raum 4 in 267–301 s (Enrage 480 s), 10–12 Keys statt ~21.
- Neue Tests `kohflaretest` und `targetgonetest`. `kohtest` und `kohgathertest` nehmen jetzt die Catastrophe Cannon als Block-Beispiel.
- Simulator: Digimon-Steuerung (Standard), verschwundene Kuramon werden aus der Auswahl genommen, und das Log nennt bei jedem Key die fällige Attacke.

#### Neu in 2.36.0 – Lange Ansagen: erst spät herauslaufen
- Bei langen Ansagen kämpft das Digimon weiter und läuft erst kurz vor dem Einschlag heraus, mit großzügigem Puffer (Laufzeit × 1,5 + 1,5 s). Das gilt nur, wenn die Restzeit jedes Kreises bekannt ist, in dem es steht. Beispiele: Machinedramons Infinity Cannon: Full Charge und Daemons Flame Inferno, beide 160 px und 12 s. Bisher stand es dort rund 10 s untätig draußen, jetzt kommen etwa 9 s Schaden dazu. Kurze Ansagen (die meisten, auch Regalecusmons Ocean Wave III mit 3,5 s) laufen wie bisher sofort.
- Raumweite Kreise: Die Suche nach einem Fluchtpunkt reicht so weit, wie das Digimon in der Restzeit kommt (höchstens 900 px statt fest 328 px). Weiter entfernte Punkte zählen nur, wenn der gerade Weg begehbar ist, also keine Wand dazwischen liegt. Damit verlässt es Marsmons Corona Sanctions (400 px, 10 s) auch aus dem Nahkampf. Die Raid-Kreise (640 px) bleiben wie bisher, denn daraus kommt man im Raum nicht heraus.
- Neuer Test `dodgelatetest`.
- Testlauf: Standardmäßig laufen so viele Tests gleichzeitig, wie der Rechner Threads hat, minus 4. Die langsamsten starten zuerst, ihre Dauer merkt sich `tests/.times.json`. Der volle Lauf dauert hier etwa 100 s statt 250 s.

#### Neu in 2.35.1 – Ausweichen bei mehreren Warnzonen
- **Laufweg:** Der Weg zum Fluchtpunkt führt nicht mehr durch einen anderen Kreis oder Strahl. Durchquert wird nur eine Zone, die nachweislich erst einschlägt, wenn das Digimon schon vorbei ist. Ist die Restzeit unbekannt, wird sie umgangen. Gibt es nur Punkte hinter einem anderen Kreis, nimmt der Bot einen davon als Notlösung.
- **Überlappende Kreise:** Ob ein Fluchtpunkt rechtzeitig erreichbar ist, rechnet der Bot jetzt mit dem frühesten Einschlag aller Kreise, in denen das Digimon steht. Bisher zählte nur der zuerst gefundene Kreis.
- **Raumweite Kreise (ab 320 px):** Sie werden nicht mehr pauschal ignoriert. Liegt der Rand so nah, dass das Digimon vor dem Einschlag herauskommt, weicht es hinaus aus und läuft danach nicht wieder hinein. Kommt es nicht heraus, kämpft es wie bisher weiter.
- Neuer Test `dodgemultitest`.

#### Neu in 2.35.0 – Ausweichen mit dem Digimon
- Steht das Spiel auf Digimon-Steuerung, bewegt das Ausweichen nur das Digimon, der Tamer zählt nicht. Der Bot schickt beim Ausweichen kein „Folgen“ mehr. Das hat das Digimon bisher alle 1,5 s zum Tamer zurückgezogen, während der nächste Klick es wieder zum Fluchtpunkt schickte (Zickzack).
- Der Fluchtpunkt bleibt fest, bis er erreicht ist, eine neue Warnzone ihn überdeckt oder 3 s vorbei sind. Bisher wurde er alle 0,4 s aus der aktuellen Position neu gesucht und sprang beim Laufen zwischen Nachbarrichtungen (Eiern). Der Klick wird nur bei einem neuen Punkt sofort gesendet, sonst einmal pro Sekunde wiederholt.
- Mit Tamer-Steuerung bleibt es wie bisher (Tamer läuft, Digimon folgt), nur mit festem Fluchtpunkt. Neuer Test `dodgepartnertest`.

#### Neu in 2.34.3 – Adds nur vom Boss, der wirklich da steht
- „Adds zuerst“ zählt nur noch die Adds des Boss-Eintrags dieser Map, und zwar des Bosses, der am nächsten steht. Bisher galt jede Art als Add, die irgendwo im Spiel ein Boss ruft. Live auf Sea of Darkness: Neben dem Feldboss Divermon galten alle normalen Divermon als Adds, weil MarineDevimon auf Odaiba Divermon ruft. Der Mitläufer griff sie deshalb einen nach dem anderen an, der Leader verteidigte ihn, und die Flächenskills zogen Gesomon und Octomon mit.
- Steht der Leader in der Boss-Rotation, jagen Mitläufer keine Adds mehr selbst. Sie greifen nur sein Ziel an und wehren Angreifer ab. Neuer Test `addmaptest`.
- Einstellung in der Gruppe: Nur der Leader steht auf Boss-Rotation, die anderen auf Autopilot (👑 Bosse + „Bots starten“ stellt das automatisch so ein).

#### Neu in 2.34.2 – Map für Map nach Serie wie das Digi-Phone
- Die Maps der Map-für-Map-Runde (und die Start-Map-Auswahl) sind jetzt wie im Digi-Phone zuerst nach Serie sortiert, dann nach Level. Bisher galt nur das Level, deshalb stand Spiral Mountain (Adventure, Lv 45–56) mitten zwischen den Adventure-02-Maps. In der Auswahl steht „A1 ·“ oder „A02 ·“ vor jedem Namen.
- Reihenfolge: „von unten nach oben“ = Adventure niedrig → hoch, danach Adventure 02 niedrig → hoch; „von oben nach unten“ genau umgekehrt. Mit einer Start-Map in Adventure 02 (z. B. Digi-Egg Valley) bleibt die Runde aufsteigend in Adventure 02. Neuer Test `sweepseriestest`.

#### Neu in 2.34.1 – Quests nach Serie getrennt
- Reiter Quests: Die aktiven Quests stehen jetzt unter zwei Überschriften, **Adventure** und **Adventure 02**, jeweils mit Anzahl. Die Serie der Map, auf der man gerade ist, steht oben. Neuer Test `seriestest`.

#### Neu in 2.34.0 – Map für Map auch von unten nach oben
- Reiter Quests → Reihenfolge „Map für Map“ → neue Auswahl **Richtung**: „von oben nach unten“ (wie bisher, höchste Map zuerst) oder „von unten nach oben“ (niedrigste Map zuerst). Aufsteigend erledigt der Bot auf einer Map alles, was machbar ist, und geht dann zur nächsthöheren. Startet man z. B. mit Start-Map „Digi-Egg Valley“, geht es von dort aus nach oben. Ohne Start-Map beginnt er bei der niedrigsten erreichbaren Map.
- Neuer Test `apt6up` (aufsteigend: Tiefland → Mittelland → Hochland; mit der alten Version umgekehrt).

#### Neu in 2.33.2 – Boss-Rotation: unterwegs keine Kämpfe durch die Gruppe
- Der Leader meldet der Gruppe nur noch ein Ziel, das er wirklich angreift, und nicht, solange er unterwegs ist (kein Kampf). Live hatte das Spiel beim Leader einen Angreifer ausgewählt, ohne dass er ihn angriff; der Mitläufer griff ihn als „Ziel des Leaders“ an, und so zog ein Kampf den nächsten nach sich. Wird ein Gruppenmitglied angegriffen, helfen die anderen wie bisher.
- Am Spawnpunkt gilt der Bot ab ≤ 200 px als angekommen und erst ab > 350 px wieder als unterwegs. Live pendelte er an der 200-px-Grenze zwischen Kämpfen und Zurücklaufen.
- Die Jagdliste geht nur im Autopilot an die Gruppe. Neuer Test `leadtargettest` (vorher rot).

#### Neu in 2.33.1 – Tür ohne Leader, MaloMyotismon live gemessen
- An der Dungeon-/Raid-Tür wartet ein als Mitläufer eingetragenes Fenster nur, wenn sein Leader online ist, den Bot fährt und auf derselben Map steht; sonst geht es allein hinein. Live hing es sonst bei „warte auf den Leader“, obwohl der Leader gar nicht da war. Der Leader wartet an der Tür nur auf Mitglieder, die gerade online sind. Neuer Test `doorleadertest`.
- MaloMyotismon live (Bauzel allein): Die HP (2 435 384) stimmen genau mit den Daten. Bauzel macht ~5 000 Schaden/s (evasiv und gepanzert); nach 171 s stand der Boss bei 65 %. Mit Enrage nach 7 min ist das allein nicht zu schaffen. Der Probelauf `sim/raid-malomyotismon.js` ist darauf abgestimmt (Trefferchance 0,85, seine normalen Attacken ergänzt) und endet ebenso im Enrage bei 22–31 %.

#### Neu in 2.33.0 – MaloMyotismon-Raid im Dungeon-Modus
- Reiter Bosse → Dungeon → Modus „MaloMyotismon-Raid“, genauso wie Apocalymon: Der Bot reist zur Tür in Myotismon Castle, digitiert, betritt den Raid und wartet im Schutzbereich auf HP. Dann kommen zuerst die Phantomon-Adds und die Illusionstürme (sie stärken bzw. füttern den Boss), danach MaloMyotismon. Nach dem Sieg geht er hinaus und stoppt.
- Aus den Spieldaten bekannt: Grisly Wing (Kreis unter jedem, 55 700 und −25 % Verteidigung, wird ausgewichen), Dream Mirror (200 %, Spiegel-Pause), Nightmare Mark, Pandæmonium bei 50 % (raumweit, 8 s Ansage, weiterkämpfen). MaloMyotismon weicht sehr oft aus (×3,5 Ausweichen) und ist gepanzert.
- Test \`raidmodetest\` prüft jetzt beide Raids. Live noch nicht geprüft.

#### Neu in 2.32.1 – raumweite Angriffe: weiterkämpfen
- Erster Live-Lauf Apocalymon-Raid (Bauzel, solo): **geschafft in ~2 min**. Adds zuerst, Spiegel pausiert, Darkness Zone und Piedmon's Swords ausgewichen, danach hinaus und gestoppt.
- Bei 5 % lädt Apocalymon „Total Annihilation“ (20 s, Kreis über den ganzen Raum). Der Bot fand keinen Fluchtpunkt und stand 20 s still, der Boss heilte sich in der Zeit von 5 auf 8 %. Jetzt gilt:
  - Kreise ab 320 px Radius (raumweit, nicht ausweichbar) ignoriert das Ausweichen; der Bot greift weiter an, um die Ladung durch den Sieg abzubrechen.
  - Findet er allgemein keinen Fluchtpunkt, kämpft er weiter, statt stehen zu bleiben.
- Neuer Test `hugezonetest` (vorher rot).

#### Neu in 2.32.0 – Apocalymon-Raid im Dungeon-Modus
- Reiter Bosse → Dungeon → Modus „Apocalymon-Raid“. Der Bot reist selbst nach Spiral Summit zur Tür und digitiert dort in die eingestellte Form (Reiter Digimon). Dann betritt er den Raid, wartet im Schutzbereich auf ~volle HP und geht zum Boss.
- Im Raid: Megadramon-Adds zuerst (sie füttern den Boss sonst), dann Apocalymon. Ausweichen, Spiegel-Pause, Markierung und Tanken wie bei allen Bossen. Nach dem Sieg geht er hinaus, und der Bot stoppt. Scheitert der Lauf, versucht er es bis zu 3× neu.
- Allgemein gebaut: Jeder einfache Raid ohne Räume (ein Boss mit Adds) lässt sich so ergänzen.
- Neuer Test `raidmodetest`. Live noch nicht geprüft.

#### Neu in 2.31.1 – nicht in die Volley zurücklaufen, ein Block pro Cannon
- Ist ein Einschlag in weniger als 1,2 s fällig und steht das Ziel neben der Warnzone, greift der Bot erst danach wieder an, auch nicht mit einem Fernangriff. Bosse laufen weiter, und das Digimon folgte ihnen in den Kreis (Probelauf: 3 Clavis auf einmal durch eine Volley).
- Key of Hope: Die Staffelung zwischen den Clavis zählt ab dem Moment, ab dem gezündet werden darf. Wird eine Volley mit abgedeckt, springt dieser Zeitpunkt nach vorn, und vorher zündeten zwei Clavis gleichzeitig. Jetzt zündet genau einer pro Cannon.
- Probelauf Hard (Bauzel + 4 ClavisAngemon Lv 70, ×4):
  - 5 Läufe à 200 s: 0 Volley-Treffer, 0 Stürze (vorher 2–5 Stürze pro Lauf).
  - 2 volle Läufe: **beide geschafft**. Raum 3 in 240/255 s (Uhr 360 s), Raum 4 in 297/318 s (Enrage 480 s), Catastrophe Cannon und Black-Rain-Hülle zu 100 % geblockt, 0–2 Stürze.

#### Neu in 2.31.0 – Key of Hope nur für unausweichbare Treffer
- Key of Hope zündet nur noch gegen Treffer, denen man nicht ausweichen kann: Catastrophe Cannon, Black-Rain-Hülle, Ultimate Flare (dazu Infermons geladener Spider Shooter und die Ramme). Cannon Volley, Tentacle Bug, Kopien-Strahlen und Black Rain weicht man aus.
- Fällt so eine Ausweich-Attacke bis zu 1 s vor einen Block-Treffer, zündet der Clavis früher, damit der Schutz (2 s) beides abdeckt. Die Gruppe steht dann schon zusammen und weicht nicht mehr aus.
- Gesammelt wird erst in den letzten 2 s vor dem Einschlag; bis dahin weicht der Bot noch aus, etwa einer Volley.
- Diaboromons Kopien (Liste des Spiels `mechB.view.copies`) greift der Bot nie an, nur das Original.
- Grund (Probelauf Hard, Bauzel + 4 ClavisAngemon Lv 70): 4 Clavis haben 4 Blocks pro 45 s, Diaboromon feuert in der Zeit ~6 blockbare Attacken. Mit allen im Block war für die Cannon oft keiner bereit (3 von 5 geblockt). Jetzt sind es 100 %, und in einem Lauf wurde Hard komplett geschafft (Raum 3 in 223 s, Raum 4 in 320 s). Offen: Kurz vor einer Volley laufen die Digimon einem wandernden Boss hinterher in die Kreise.

#### Neu in 2.30.6 – „Ziele verteilen“: sichtbar, wann es gilt
- „Ziele verteilen“ wirkt nur im Gruppen-Modus 📜 Quests, wenn alle ihren Bot fahren. In 👣 Spiegeln, ⚔️ + Angriff, 👑 Bosse und 🏰 Dungeon ist es absichtlich aus; in + Angriff greifen alle das Ziel des Leaders an. Bisher stand das nur im Tooltip, live sah es aus, als sei der Haken kaputt. Jetzt ist der Haken in diesen Modi abgeblendet und zeigt „gilt nur im Modus 📜 Quests“.

#### Neu in 2.30.5 – beim Warten auf einen Boss nichts angreifen
- Wartet der Autopilot auf einen Quest-Boss, der noch nicht da ist, greift er nichts mehr an, nur Angreifer wehrt er ab. Bis 2.30.4 nahm er in der Wartezeit normale Monster in 250 px um den Spawnpunkt mit. Erscheint der Boss, geht er wie bisher sofort auf ihn.
- Test `bossfilltest` angepasst: Beim Warten 0 Kills, ein Angreifer wird abgewehrt, ein anderes Monster in der Nähe bleibt in Ruhe, dann fällt der Boss.

#### Neu in 2.30.4 – aus dem ersten Hard-Live-Lauf
- **Tentacle Bug:** Der Arm packt erst ~0,2 s nach dem Ende der Ansage, der Strahl ist dann schon vom Boden verschwunden. Live griff der Bot genau in diesem Moment wieder an und wurde gepackt (24 s festgehalten). Strahlen mit Greifarm oder Ansturm gelten jetzt noch 0,8 s nach dem Verschwinden als Gefahr. Simulator: 0 von 18 gepackt (vorher 2 von 18).
- **Digitation abwarten:** An der Tür und vor dem Anziehen eines Raums wartet der Bot, bis die eingestellte Digitation erreicht ist. Live ging er sonst als ExVeemon hinein. Er wartet höchstens 90 s, z. B. wenn Tamer-DS fehlt.
- **Geteilter Treffer:** Die Catastrophe Cannon folgt dem Ziel, live gab es keinen Warnkreis am Boden. Allein macht sie laut Spieldaten ⅓ von 240 % = 80 % der Max-HP. Wird ein geteilter Treffer angesagt, trinkt der Bot F1, bis er bei ≥ 95 % HP ist, unabhängig von der normalen Schwelle.
- Probelauf Hard (allein, ×4, Cannon folgt dem Ziel): Raum 3 in 310 s geschafft. Raum 4 scheitert an der Black-Rain-Hülle (80 % alle ~25 s), während der Boss mit Herden-Stapeln weiter zuschlägt. Die Nahkampfwerte von Armageddemon sind aber nur angenommen; dafür braucht es Live-Daten aus Raum 4.

#### Neu in 2.30.3 – „Ziele verteilen“ repariert
- Mit „Ziele verteilen“ zählte jedes Monster, das ein Gruppenmitglied angreift, für alle anderen als „Angreifer“, und Angreifer gehen vor. Sobald das Monster des Leaders zurückschlug, gingen also wieder alle darauf. Beim Verteilen ist das Monster eines anderen jetzt dessen Kampf. Jeder wehrt nur ab, was ihn selbst angreift, und sucht sich sonst ein freies Monster.
- Neuer Test `spreadatktest` (vorher rot: 10/10 auf dem Monster des Leaders, jetzt 0/10). Der alte `spreadtest` hatte die Gegenwehr der Monster ständig zurückgesetzt und den Fehler deshalb nicht bemerkt.

#### Neu in 2.30.2 – Dungeon digitiert vorher
- Der Dungeon-Modus nimmt jetzt die eingestellte Digitation (Reiter Digimon → Digitation) an, wie Autopilot und Boss-Rotation. Das passiert schon an der Tür, vor dem Betreten, und im Dungeon zwischen den Kämpfen wieder, z. B. nach einem Zurück-Digitieren durch Infermons Spider Shooter. Fehlt Tamer-DS, füllt F3 auf. Klappt die Digitation nicht (Abklingzeit, zu wenig DS), geht es in der aktuellen Form weiter.

#### Neu in 2.30.1 – Diaboromon komplett ausweichen
- Was mehr als Schaden macht, tankt der Bot nie: Packen (Tentacle Bug, 8 000 plus Festhalten und Aussaugen), Zurück-Digitieren, Markieren, geteilter Treffer, Spiegel, Debuffs. Diese Attacken weicht er immer aus.
- Dieselbe Attacke mehrfach gleichzeitig (4 Kopien von Diaboromon, je 30 000) steht nur einmal im Protokoll. Der Bot zählt jetzt die Warnzonen am Boden mit und tankt solche Salven nicht mehr.
- Hard allein: Die Herde ignoriert er (allein ist sie kaum zu stoppen, und die Zeit fehlt beim Boss). In der Gruppe fängt er sie weiterhin ab. „Adds zuerst“ ist im Dungeon aus, die Reihenfolge bestimmt die Dungeon-Zielwahl.
- Simulator (allein, ×4), unter der Annahme, dass man der Catastrophe Cannon ausweichen kann: 2/2 Läufe **geschafft, 0 Stürze**. Raum 3 in 307–324 s (Uhr: 360 s), Raum 4 in 386–396 s (Enrage: 480 s). Folgt die Cannon dem Ziel, ist allein nach 4 Stürzen Schluss (Diaboromon bei ~54–83 %). Welche Variante stimmt, zeigt der Live-Test.

#### Neu in 2.30.0 – Kera Hard („Revenge“) im Dungeon-Modus
- Reiter Bosse → Dungeon → Modus „Hard – Revenge (Gruppe)“. Der Bot betritt Hard an derselben Tür und räumt Raum 3 (Diaboromon, 6-Minuten-Uhr) und Raum 4 (Armageddemon mit Kuramon-Herde).
- Zielwahl aus den Spawn-Daten:
  1. Greifarm, der mich festhält (sofort zerschlagen)
  2. Herden-Kuramon (die dem Ei am nächsten zuerst, jedes bringt Kuramon-Daten)
  3. Mail-Server und Cluster
  4. der Boss
- Boss-Attacken am Boss-Eintrag der Spawn-Daten (Diaboromon, Armageddemon) kennen jetzt auch Skill-Timing und Attacken-Liste.
- Tanken zählt gleichzeitige Treffer zusammen: 4 Kopien-Strahlen à 30 000 sind zusammen nicht tankbar.
- Hard ist für Gruppen gedacht. Den geteilten Treffer (Catastrophe Cannon, Black-Rain-Hülle: 240 % der Max-HP auf alle im Kreis verteilt) überlebt man allein nicht. Das Zusammenstellen dafür in der Gruppe folgt.
- Neuer Probelauf `sim/dungeon-revenge.js`: allein (×4) ist Raum 3 nach ~80 s verloren, Diaboromon bei 74–83 %.

#### Neu in 2.29.8 – nicht vor dem eigenen Schwert weglaufen
- Die Tank-Regel hat auch eigene Skills mitgezählt. Invincible Sword ist eine Kreis-Fläche mit viel Schaden und galt deshalb als „nicht tankbar“: Nach jedem eigenen Schwerthieb wich der Bot doch aus (live: 2 von 3 Crazy Turns). Jetzt zählen nur Attacken von Monstern.
- Probelauf: Die Partner-Skills senden jetzt Skill-Ereignisse wie im Spiel, damit so ein Fehler auffällt. Holy Grace heilt (in den Spieldaten ein Heil-Skill), statt Schaden zu machen. Ergebnis (allein, ×4): Crazy Turn 6 von 7 getankt (vorher 4), Data Crusher 10 von 10 (vorher 8).

#### Neu in 2.29.7 – auch die Wächter in Raum 1 tanken
- Flächen ohne festen Schaden schätzt der Bot jetzt aus dem Angriffswert des Wirkers: AT × Power % × 1,5 Reserve. Die Chrysalimon-Wächter in Raum 1 (Data Crusher, Power 220, Lv 51) kommen so auf ~2 500 und werden getankt statt ausgewichen.
- Simulator (allein, ×4): in Raum 1 kein einziges Ausweichen mehr; Keramon und Chrysalimon 15 von 16 getankt; Infermons Ramme 9/9 und Spider Shooter 7/7 ausgewichen.

#### Neu in 2.29.6 – Tanken greift wirklich
- Bisher tankte der Bot nur, wenn nach dem Treffer noch 40 % HP übrig blieben. Bei Crazy Turn (28 000) und 92 660 Max-HP hieß das: erst ab ~65 000 HP. Im Kampf lag er meist darunter und wich deshalb doch aus. Jetzt reichen > 15 % HP danach; ab 50 % trinkt er ohnehin F1.
- Direkt nach dem Einschlag steht der Kreis noch kurz da. Auch dann läuft der Bot nicht mehr heraus (0,8 s).
- Simulator (allein, ×4): getankt 14–15× statt 5×, Boss-Raum ~280–330 s statt ~310 s. Die Streuung kommt daher, dass Infermon zufällig ein Terminal wählt. Die Tränke im Probelauf stehen jetzt auf 400 (live: über 400 Feast).

#### Neu in 2.29.5 – nicht in die Schutzzone ausweichen
- Ausweichen wählt keine Fluchtpunkte mehr in Schutzzonen. Dort kann man nicht kämpfen, live kostete das in Raum 2 jedes Mal 1–2 s fürs Herauslaufen. Eine Schutzzone nimmt der Bot nur noch, wenn es gar keinen anderen freien Punkt gibt.
- Zeitraffer geprüft (Solo-Lauf, Spielzeit im Dungeon): ×1 388 s, ×4 398 s, ×8 592 s, ×16 484 s. Bis ×4 stimmt das Ergebnis mit Echtzeit überein; ab ×8 wird der Ablauf zu grob (Windows-Timer ~15 ms), und die Ergebnisse weichen deutlich ab. Für Probeläufe also höchstens `TEMPO=4`.

#### Neu in 2.29.4 – Skills für Infermons Mahlzeit aufheben
- Live wirkte der Bot während „NOT HERE“ keinen einzigen Skill, weil alle kurz vorher verbraucht waren. Mit dem Grundangriff allein kam er nur auf 60–80 % des Abbruchschadens. Jetzt hebt er einen Skill auf, wenn dieser bei der nächsten Mahlzeit (Cooldown von NOT HERE: 24 s) sonst noch abkühlen würde.
- Die Boss-Attacken einer Boss-Form (z. B. Infermon im Kera-Dungeon: Ramme, Spider Shooter, Kokon, NOT HERE) stehen nur in den Spawn-Daten der Form. Skill-Timing und die Attacken-Liste kennen sie jetzt auch.
- Dungeon-Probelauf mit Zeitraffer: `TEMPO=4` lässt alle Uhren und Timer 4× schneller laufen. Ein Solo-Lauf dauert so 98 s statt ~6,5 min und liefert dasselbe Ergebnis wie in Echtzeit (385 s gegenüber 388 s Spielzeit, je 5 von 7 Mahlzeiten abgebrochen).

#### Neu in 2.29.3 – Dungeon: Fresser nach Zeitpuffer
- Raum 1: Zuerst nimmt der Bot den Fresser mit dem kleinsten Zeitpuffer (Zeit bis zum Verlust minus Laufweg minus Kill-Zeit). Ein gewähltes Ziel behält er, bis ein anderes mindestens 1,5 s dringender ist. Live hatte er zwischen zwei Fressern hin und her gewechselt und dabei 1,5 s verloren.

#### Neu in 2.29.2 – Dungeon: nur der eigene Raum zählt
- Im Dungeon-Modus sieht der Bot nur Monster in dem Raum, in dem er gerade steht. Übrig gebliebene Kuramon aus Raum 1 gelten in Raum 2 nicht mehr als Angreifer oder als „Add“ des Bosses.
- Erster Live-Lauf solo (Imperialdramon Paladin): Raum 1 in 157 s (4/6 Terminals), Boss bis 6 %, dann Enrage nach 600 s. Grund waren die Infermon-Mahlzeiten (12 Stapel); dagegen helfen 2.29.1 und mehr Leute.

#### Neu in 2.29.1 – kleine Boss-Treffer tanken, Infermons Mahlzeit abbrechen (aus dem ersten Live-Lauf)
- Neuer Haken (Standard an) „Kleine Boss-Treffer tanken statt ausweichen“: Flächen mit festem Schaden bis 35 % der Max-HP (danach bleiben noch ≥ 40 %) werden nicht mehr ausgewichen. Der Bot greift weiter an, und die Tränke heilen. Beispiel: Keramon „Crazy Turn“ 28 000, Chrysalimon „Data Crusher“ 30 000. Infermons Ramme (60 000) und Spider Shooter (45 000, Zurück-Digitieren) weicht er weiterhin aus.
- Infermon „NOT HERE“: Während er ein Terminal frisst, zählt nur Schaden. Der Bot zündet dann alle Skills sofort, ohne Zurückhalten fürs Ausweichen. Im Live-Lauf fehlten zum Abbrechen oft nur ~10 %, und jede durchgegangene Mahlzeit heilt ihn um 8 % und macht ihn stärker.

#### Neu in 2.29.0 – Dungeon-Modus (Kera, Easy)
- Neuer Modus **Dungeon** und Gruppen-Modus **🏰 Dungeon**: zur Tür auf der Map Network, an der Tür auf die Gruppe warten (max. 20 s), der Leader betritt Easy („War Game“), die Gruppe an der Tür kommt mit.
- Raum 1: Terminals schützen. Der Bot nimmt zuerst den Tsumemon, dessen Terminal noch zu retten ist. Er rechnet dafür die Zeit bis zum Verlust (8 s Fressen) gegen den gemessenen Schaden pro Sekunde. Danach kommen nicht mehr rettbare Fresser, Angreifer und die übrigen Pflicht-Monster. Kuramon (keine Pflicht) bleiben in Ruhe.
- Zwischen den Wellen wartet der Bot in der Raummitte. Ist der Raum frei, geht er durchs Tor. Einen neuen Raum betritt er erst mit mindestens 90 % HP aus dem Schutzbereich heraus.
- Raum 2: Keramon → Chrysalimon → Infermon mit Ausweichen, Spiegel-Pause und Skill-Timing wie bei Bossen. Danach geht es zum Ausgang, und der Bot stoppt.
- Ein gescheiterter Lauf wird bis zu 3× neu versucht. Hard („Revenge“) folgt.
- Probelauf: `node sim/dungeon-keramon.js` (siehe unten).

#### Neu in 2.28.1 – Key of Hope gezielter (aus dem Raid-Probelauf)
- Gegen Armageddemons einfachen **Black Rain** (Kreis unter jedem Spieler) wird kein Key of Hope mehr verbraucht, dem
  weicht der Bot aus. Key of Hope bleibt für die **Hülle** von Black Rain (geteilter Schaden, nicht ausweichbar) und
  für **Ultimate Flare**. Im Raid-Probelauf (150 s, 5er-Gruppe) sank der Schaden damit von 252 000 auf 0.

#### Neu in 2.28.0 – Lage-Karte, weniger Haken
- **Übersicht → Lage:** Auf einen Blick siehst du Modus und ob der Bot läuft, Map und Kanal, das aktuelle Ziel mit
  HP, die Aufgabe und den Status. In der Gruppe kommt eine Zeile je Bot dazu: Leader (◉), HP-Balken (rot unter 35 %),
  Map und Kanal, bei ClavisAngemon „🔑 bereit“ oder die Restzeit, und der Status.
- **Weniger Haken:** „Bei Spiegel/Reflexion nicht angreifen“ und „Skills nur, wenn danach noch Zeit zum Ausweichen
  bleibt“ sind jetzt immer an. Ausgeschaltet schadete man sich nur selbst.

#### Neu in 2.27.0 – Panel neu geordnet
- **Neuer Reiter 🐣 Digimon:** Hier steht alles zum eigenen Digimon an einer Stelle: Quest-Digimon, Digitation und
  Abgabe-Digimon (bisher im Quest-Reiter), Skills und Heal je Digitationsform sowie Tränke F1–F3 (bisher im
  Kampf-Reiter) und Tamer-DS (bisher in der Übersicht).
- **⚔️ Kampf:** Zielwahl, Boss-Mechaniken, Attacken des Bosses (bisher im Boss-Reiter) und Monster auf dieser Map.
- **Was im aktuellen Modus nicht gilt, wird abgeblendet** und mit „gilt nur im Modus …“ beschriftet. Beispiele:
  Autopilot-Optionen in der Boss-Rotation, die Monsterliste außerhalb von Grinden.
- **Oben im Kopf** steht, für welchen Account die Einstellungen gerade gelten (👤 Login-Name). Der Gruppen-Reiter
  sagt dazu, dass seine Einstellungen für alle Gruppenfenster gelten.
- Alle Einstellungen bleiben erhalten, nur die Anordnung ist neu.

#### Neu in 2.26.0 – Boss-Rotation: unterwegs nicht kämpfen, am Platz erst der Boss
- **Unterwegs zum Boss** (andere Map, anderer Kanal oder noch nicht am Spawnpunkt) kämpft der Bot nicht mehr gegen
  aggressive Monster, die ihn angreifen. Er ruft das Digimon zurück und läuft weiter. Ein Kanalwechsel geht auch
  mit Verfolgern. Unter 50 % HP wehrt er sich wie bisher.
- **Am Spawnpunkt, Boss noch nicht da:** Verfolger, die mitgekommen sind, darf er erledigen. Von sich aus greift er
  beim Warten nichts an.
- **Boss da:** Erst der Boss, dann die Verfolger. Er wechselt auch mitten im Kampf auf den Boss.

#### Neu in 2.25.0 – Boss-Wartezeit nutzen, Golemon nicht wegkiten
- **Warten auf einen Quest-Boss:** Ist der Boss nicht da, bekämpft der Bot in der Wartezeit normale Monster im Umkreis
  von 250 px um den Spawnpunkt. Sobald der Boss zu sehen ist, nimmt er keine neuen Füllmonster mehr und geht auf den Boss.
- **Golemon auf Holy Peaks:** Golemon macht einen Flächenangriff um sich herum. Das Ausweichen zog ihn bisher Stück für
  Stück aus seiner Verfolgungsreichweite (320), bis er zurücklief. Beim Ausweichen vor ihm wählt der Bot jetzt nur noch
  Punkte, die höchstens 240 px von seinem Startplatz entfernt sind. Weitere Monster lassen sich in KITE_GUARD ergänzen.

#### Neu in 2.24.1 – Leader wartet beim NPC statt wegzulaufen
- Hält der Leader eine Abgabe für die Gruppe zurück, weil ein Mitläufer noch nicht so weit ist, macht er in der
  Wartezeit nur noch Aufgaben auf derselben Map. Gibt es dort keine, wartet er. Bisher lief er z. B. nach „The Shrine
  Stone“ zur Tagesquest in Sunset Bay und musste danach den ganzen Weg zurück zu Magnamon.
- Die Log-Zeile „Runde null: Phase -1/3 – undefined“ erscheint nicht mehr. Phasen werden nur im Map-für-Map-Modus gemeldet.

#### Neu in 2.24.0 – Zum Boss hin ausweichen
- Beim Ausweichen aus einem Warnkreis nimmt der Bot jetzt den freien Punkt, der **dem Boss am nächsten** liegt und vor
  dem Einschlag noch erreichbar ist. Die Restzeit liest er aus dem Warnkreis des Spiels. Bisher ging er immer weg von
  der Kreismitte, oft auf die Seite gegenüber vom Boss.
- Steht das Digimon draußen direkt am Boss (Boss halb im Kreis), greift es mit dem normalen Angriff weiter an, sofern
  der Punkt zum Zuschlagen außerhalb des Kreises liegt. Steht der Boss tief im Kreis, wartet der Bot wie bisher draußen
  (und nutzt Fernkampf-Skills).

#### Neu in 2.23.0 – Fernangriff beim Ausweichen
- Steht der Boss in einem Warnkreis oder führt der Weg zu ihm durch einen, wartet der Bot draußen. Dabei setzt er jetzt
  bereite **Fernkampf-Skills** ein, deren Reichweite vom aktuellen Platz des Digimons bis zum Boss reicht. So macht er
  weiter Schaden, ohne in den Kreis zu laufen.
- Genutzt werden nur angehakte Skills auf ein Gegner-Ziel mit mindestens 64 Reichweite. Heil-Skills, Key of Hope und
  Ansturm-Skills bleiben aus. Der normale Angriff ist bei allen Digimon Nahkampf und bleibt deshalb ebenfalls aus.
  Spiegel und Spawn-Schutz werden beachtet.

#### Neu in 2.22.2 – Nach dem Kill gemeinsam aufs nächste Monster
- Stirbt das Monster des Leaders, nehmen die Mitläufer sofort den Angreifer, der dem Leader am nächsten ist. Diesen
  nimmt auch der Leader als Nächstes. Bisher griff in dieser kurzen Lücke jeder sein eigenes angreifendes Monster an.
  Mit weniger als 50 % HP wehrt sich ein Mitläufer weiterhin zuerst selbst.

#### Neu in 2.22.1 – Gemeinsamer Fokus auf das Ziel des Leaders
- Ohne „🎯 Ziele verteilen“ greifen die Mitläufer jetzt zuverlässig das Ziel des Leaders an. Bisher wehrte jeder zuerst
  das Monster ab, das ihn selbst angriff. In Gebieten mit aggressiven Monstern sah das aus, als würde verteilt.
  Nur mit weniger als 50 % HP wehrt sich ein Mitläufer zuerst selbst.
- Beim Mithelfen gilt das Level-Limit des Mitläufers nicht mehr. Bisher half er nicht mit, wenn das Ziel des Leaders
  über seinem „Max. Level über dem Digimon“ lag.

#### Neu in 2.22.0 – Beim selben NPC alles auf einmal
- Nach einer Abgabe nimmt der Bot beim selben NPC gleich die Quests an, die es dort gibt, und gibt dort auch alles
  Weitere ab. Erst dann geht er zum nächsten NPC. Vorher lief er z. B. Elder abgeben → Sage abgeben → zurück zu Elder
  zum Annehmen. Das gilt in allen Modi.
- Mit „Erst alle Quests erledigen, dann gemeinsam abgeben“ bleibt die Abgabe-Runde bestehen: Erst werden alle Abgaben
  erledigt, unterwegs wird beim selben NPC gleich angenommen, dann folgen die übrigen Annahmen, dann geht es auf die Jagd.

#### Neu in 2.21.1 – Gemeinsam abgeben: Annahmen nur auf dieser Map zuerst
- Mit „Erst alle Quests erledigen, dann gemeinsam abgeben“ zog der Bot in der Annahme-Phase auch Quests auf ganz anderen
  Maps vor, z. B. eine Tagesquest in Factorial Town direkt nach einer Annahme in The Kaiser's Canyon. Jetzt nimmt er
  erst alle Quests auf der aktuellen Map an und erledigt sie. Quests woanders nimmt er erst an, wenn hier nichts mehr zu tun ist.

#### Neu in 2.21.0 – Erst alle Quests erledigen, dann gemeinsam abgeben
- Neuer Haken im Quest-Reiter: **„Erst alle Quests erledigen, dann gemeinsam abgeben“**. Der Autopilot arbeitet dann in
  Runden: erst alle Ziele der angenommenen Quests, dann alle fertigen Quests abgeben, dann alle verfügbaren annehmen,
  dann wieder von vorn. Er unterbricht keine Quest mehr, um zwischendurch eine andere abzugeben.
- In der Map-für-Map-Runde passiert das ohnehin pro Map. Der Haken ist für die Reihenfolge „nächste Aufgabe zuerst“ gedacht.

#### Neu in 2.20.1 – Nach dem Umkippen weiter bei der Quest
- Nach einem langen Kampf oder nach dem Wiederbeleben hielt der Bot den Weg zurück ins Jagdgebiet fälschlich für
  „nicht erreichbar“. Die Weg-Messung stammte noch von vor dem Kampf. Er übersprang die Quest dann 5 min und fing
  woanders eine andere an. Jetzt beginnt die Messung nach jeder Pause (Kampf, bewusstlos, Laden, Chat) neu.

#### Neu in 2.20.0 – Erst die Adds, dann der Boss
- Ruft ein Boss Adds, kämpft der Bot zuerst gegen die Adds und geht danach automatisch zurück zum Boss.
- Welche Adds ein Boss ruft, liest der Bot aus den Spieldaten. Beispiele: Apocalymon → Megadramon, MaloMyotismon → Phantomon
  und Illusion Tower, Dark Presence → Ritual Anchor, MarineDevimon → Divermon, Puppetmon → Pumpkinmon,
  Arukenimon/BlackWarGreymon → Golemon.
- In Raid- und Dungeon-Maps (z. B. Kera-Dungeon) zählt zusätzlich jedes normale Monster in der Nähe des Bosses als Add
  (Wellen, Kopien).
- In der Boss-Rotation bleibt alles wie bisher. Auf dem Weg zu einer Abgabe/einem Gespräch jagt der Bot keine Adds.

#### Neu in 2.19.0 – Markierungen ausweichen (z. B. Apocalymons Big Bang Mark)
- Manche Bosse markieren einen Spieler: Ein Warnkreis folgt ihm, und beim Einschlag bekommt jeder darin Schaden, die
  anderen sogar mehr. Das Ausweichen erkennt diese Markierungen jetzt.
- **Ein anderer ist markiert:** Der Bot geht aus dessen Kreis raus und hält Abstand.
- **Ich bin markiert:** Der Bot läuft von den anderen Spielern weg, damit niemand mit im Kreis steht.
- Gilt mit der Option „Warnkreisen/-strahlen ausweichen“ (Boss-Mechaniken), auch für Mitläufer.

#### Neu in 2.18.4 – Mitläufer greifen nicht mehr beim Leader mit an
- Mit „🤝 Leader erledigt die Quests der Mitläufer“ zählt für einen Mitläufer nur noch ein Monster als Angreifer, das ihn
  selbst angreift. Bisher galt auch ein Monster, das den Leader in der Nähe angreift, als Angreifer. Dann liefen alle
  hin und schlugen mit.

#### Neu in 2.18.3 – Mitläufer bleiben wirklich stehen
- Mit „🤝 Leader erledigt die Quests der Mitläufer“ bricht ein Mitläufer jetzt eine noch laufende eigene Aufgabe ab,
  etwa Aufholen oder ein nachgemachtes Gespräch. Er bleibt sofort stehen. Ein angefangener Weg wird gestoppt, statt bis
  zum Ziel weiterzulaufen.

#### Neu in 2.18.2 – Knopf „👥 Party einladen“
- Neuer Knopf im Gruppen-Reiter: Der Leader lädt sofort alle Gruppenmitglieder in die Party ein, die noch nicht drin
  sind. Die automatische Einladung wartet zwischen zwei Versuchen 30 s, der Knopf nicht. Er geht aus jedem
  Gruppenfenster, auch aus einem Mitläufer-Fenster. Die Mitläufer nehmen automatisch an.

#### Neu in 2.18.1 – Mitläufer bleiben stehen
- Mit „🤝 Leader erledigt die Quests der Mitläufer“ bleiben die Mitläufer jetzt stehen. Sie folgen nicht, reisen nicht,
  greifen nichts von sich aus an und wehren nur Angreifer ab. Nur der Leader bewegt sich und jagt, was ihnen fehlt.
- Abgeben und Annehmen machst du bei den Mitläufern selbst. Der Knopf „📜 Abgeben & Annehmen“ geht dafür weiterhin.
  Gibt es nichts mehr zu jagen, wartet der Leader, statt die Gruppe zu stoppen.
- Wichtig: Ob Kills des Leaders bei weit entfernt stehenden Mitläufern zählen, hängt von der Party-Reichweite des Spiels ab.

#### Neu in 2.18.0 – Gruppe: Leader erledigt die Quests der Mitläufer
- Neuer Haken im Gruppen-Reiter: **„🤝 Leader erledigt die Quests der Mitläufer“** (nur im Modus 📜 Quests).
- Der Leader plant dann nur noch mit den Quests der Mitläufer, seine eigenen sind egal. Er jagt, was ihnen fehlt
  (Zähler = der Mitläufer, der am weitesten zurück ist), reist zu ihren Zielen und führt die Gruppe zum NPC.
- Am NPC löst er „Abgeben & Annehmen“ bei den Mitläufern aus: Jeder gibt dort selbst ab, nimmt die nächsten Quests an
  und erledigt Quest-Gespräche. Danach geht es mit der nächsten Mitläufer-Quest weiter. Abgegeben wird, wenn alle
  Mitläufer mit der Quest fertig sind.
- Eigene Quests nimmt der Leader in diesem Modus nicht an.

#### Neu in 2.17.0 – Gruppe: Abgeben & Annehmen auf dieser Map
- Neuer Knopf im Gruppen-Reiter: **„📜 Abgeben & Annehmen (diese Map)“**. In allen Gruppenfenstern gibt jeder seine
  fertigen Quests auf der aktuellen Map ab und nimmt alle Quests an, die es hier gibt. Jeder arbeitet für sich, ohne auf
  die anderen zu warten. Quests von NPCs auf anderen Maps bleiben liegen.
- Danach geht es weiter wie vorher: Lief der Bot, läuft er im alten Modus weiter, sonst geht er wieder aus. Wechselt
  ein Fenster dabei die Map, bricht es die Runde ab.

#### Neu in 2.16.1 – Ziele verteilen bleibt beim Leader
- Mit „🎯 Ziele verteilen“ greifen Mitläufer nur noch Monster im Umkreis von 250 px um den Leader an. Vorher suchten
  sie im Suchradius um sich selbst und konnten sich so Kill für Kill von der Gruppe entfernen. Ist in der Nähe des
  Leaders kein freies Monster, helfen sie beim Ziel des Leaders mit.

#### Neu in 2.16.0 – Gruppe: Ziele verteilen
- Neuer Haken im Gruppen-Reiter: **„🎯 Ziele verteilen: jeder ein anderes Monster“**. Er gilt für die ganze Gruppe.
- Ist er an, hängt sich kein Mitglied mehr ans Ziel des Leaders. Jeder greift ein Quest-Monster an, das noch kein anderes
  Gruppenmitglied angreift. Erwischen zwei dasselbe, weicht der mit der höheren Slot-Nummer auf ein anderes aus,
  solange das Monster noch über 50 % HP hat. Ist keins mehr frei, hilft man mit.
- Bosse greifen weiterhin alle gemeinsam an, Angreifer wehrt jeder selbst ab. Nicht beim Spiegeln und nicht in der Boss-Rotation.

#### Neu in 2.15.1 – Leader nutzt beim Spiegeln Tränke
- Im Spiegel-Modus (👣 Spiegeln / ⚔️ + Angriff) spielst du den Leader selbst, sein Bot ist aus. Bisher setzten nur die
  Mitläufer ihre Tränke ein. Jetzt nutzt auch der Leader F1–F3 automatisch (nach den Schwellen im Reiter Pflege),
  ebenso den Heil-Skill. Laufen und Angreifen bleiben bei dir. Während du im Chat tippst, passiert nichts.

#### Neu in 2.15.0 – Channel-Checker
- Neue Option im Reiter Kampf → Zielwahl: **„Channel-Checker: auf den leersten Kanal wechseln“** (standardmäßig aus).
- Kurz nach jedem Map-Wechsel und danach etwa jede Minute schaut der Bot in die Kanalliste der Map. Hat ein anderer Kanal
  nach dem Wechsel mindestens 2 Spieler weniger, wechselt er dorthin. Man selbst zählt dort mit, so gibt es kein Hin und Her.
- Nur außerhalb von Kämpfen und Dialogen. Nicht in der Boss-Rotation und nicht bei Quest-Bossen, dort wählt der Bot den
  Kanal nach den Spawn-Timern. In der Gruppe entscheidet der Leader, die Mitläufer folgen ihm.

#### Neu in 2.14.2 – Tägliche Quests beim richtigen NPC
- Manche NPCs gibt es mit derselben ID auf mehreren Maps (z. B. Gennai's Hologram), und jeder vergibt nur die Quests
  seiner Map. Der Bot ging bisher zu dem NPC, an dem die Story gerade steht (z. B. Myotismon's Castle), statt zur Map
  der Quest (z. B. Sunset Bay für „Bay Patrol“). Dort versuchte er immer wieder eine Quest anzunehmen, die es da nicht gibt.
  Jetzt gilt die Map, die in der Quest steht (Annehmen und Abgeben, auch bei Mitläufern).
- Die eigene Liste „heute erledigt“ gilt jetzt je Account. Bisher teilten sich alle Accounts eine Liste, und Account B
  übersprang eine Tagesquest, nur weil Account A sie heute schon gemacht hatte.

#### Neu in 2.14.1 – Ausblenden ohne Sprung in die Adresszeile
- **Alt+D** blendet das Panel aus/ein, ohne dass Chrome zusätzlich in die Adresszeile springt. Neu dazu: **Alt+H** macht dasselbe.

#### Neu in 2.14.0 – Einstellungen je Account, Account-Wahl loggt ein
- **Einstellungen je Account:** Jeder Account (Login-Name) hat jetzt sein eigenes Profil: Betriebsart, Bosse, Kanäle,
  Digitation, Skills, Heal usw. Die Fenster der Gruppe überschreiben sich nicht mehr gegenseitig. Beim ersten Login
  übernimmt ein Account die bisherigen Einstellungen. Nur die Panel-Ansicht (Reiter, Breite, Kompakt) gilt für alle Fenster.
- **Neuer Tab, anderer Account:** Ein neuer Tab landet in der Charakterauswahl des Accounts, der im anderen Tab
  eingeloggt ist. Wählst du dort im Gruppen-Reiter „Dieses Fenster ist: Account 2“, meldet der Bot ab, loggt Account 2 ein
  und betritt die Welt mit dessen Charakter. Das passiert nur in der Login- oder Charakterauswahl, nie in der Welt.
  Ohne gespeichertes Passwort zeigt er „bitte als … einloggen“.

#### Neu in 2.13.6 – Boss-Rotation digitiert
- Die Boss-Rotation digitiert zwischen den Kämpfen jetzt in die eingestellte Form (Quest-Reiter → Digitation, auch
  „⬆ höchstmögliche Digitation“). Bisher tat das nur der Autopilot. Im Gruppen-Modus 👑 Bosse digitierten deshalb die
  Mitläufer, der Leader aber nicht.

#### Neu in 2.13.5 – Boss lebt auf dem anderen Kanal: sofort hin
- Wartet der Bot in der Boss-Rotation auf einem Kanal und meldet der Boss-Timer, dass der Boss auf einem anderen Kanal
  (oder einer anderen Map) lebt oder in wenigen Sekunden spawnt, hört er auf, gegen normale Monster zu kämpfen. Er ruft
  das Digimon zurück und wechselt sofort, auch wenn ihn gerade Monster angreifen. Vorher hielten ihn nachkommende
  aggressive Monster (z. B. in Fog City) bis zu einer Minute auf.
- Gilt nur bei mindestens 50 % HP; darunter wird erst zu Ende gekämpft. Mitläufer im Gruppen-Modus 👑 Bosse hören
  dann ebenfalls auf zu kämpfen und folgen.

#### Neu in 2.13.4 – Abgabe-Digimon erst beim Quest-Geber
- Mit eingestelltem Abgabe-Digimon läuft der Bot jetzt in seiner aktuellen Form (z. B. Imperialdramon) zum Quest-Geber.
  Erst dort digitiert er zurück, wechselt das Digimon und gibt ab. Bisher passierte das im Map-für-Map-Modus schon vor dem Loslaufen.
- Das Spiel lehnt einen Partner-Wechsel im Kampf und in den 10 s nach dem letzten Wechsel ab. Der Bot wartet das jetzt ab
  (im Kampf ruft er das Digimon zurück), statt es als Fehlversuch zu zählen. Vorher gab er nach 6 abgelehnten Versuchen
  auf und gab mit dem falschen Digimon ab.

#### Neu in 2.13.3 – Spawn-Schutz in allen Modi
- Die ersten ~3 s nach dem Auftauchen eines Bosses (99 % Schadensreduktion) setzt der Bot keine Skills ein, nur normale
  Angriffe. Das galt bisher nur in der Boss-Rotation und nur für ausgewählte Bosse. Jetzt gilt es für jeden Boss und
  in allen Modi, also auch für die Mitläufer im Gruppen-Modus 👑 Bosse und beim Spiegeln mit Angriff.

#### Neu in 2.13.2 – Gruppe im Boss-Rotations-Modus starten
- Im Gruppen-Tab gibt es jetzt vier Modi: **📜 Quests**, **👑 Bosse**, 👣 Spiegeln und ⚔️ + Angriff.
- Bei **👑 Bosse** startet ▶ Starten den Leader in der Boss-Rotation (Bosse wie gewohnt im Reiter Bosse auswählen).
  Die anderen Fenster folgen ihm über Maps und Kanäle und kämpfen mit. Quest-Gespräche machen sie dabei nicht nach,
  und verpasste Quests holen sie auch nicht auf.
- Bei **📜 Quests** läuft alles wie bisher (Leader im Autopilot).

#### Neu in 2.13.1 – Vor Key of Hope sammelt sich die Gruppe beim Clavis
- Sobald ein großer Angriff angesagt wird, meldet der Clavis, der gleich zündet, laufend die Position seines Digimons.
  Er bleibt stehen. Alle anderen Bots der Gruppe (auch Imperialdramon) laufen sofort auf ≤ 80 px an ihn heran,
  statt auszuweichen oder weiterzukämpfen. Das Digimon folgt dem Tamer. Kurz nach dem Einschlag geht es normal weiter.

#### Neu in 2.13.0 – ClavisAngemon blockt große Raid-Angriffe mit Key of Hope
- Kündigt Infermon, Diaboromon oder Armageddemon einen großen Angriff an, zündet ein ClavisAngemon kurz vor dem
  Einschlag (~0,7 s vorher) **Key of Hope**. Das schützt 2 s lang ihn und alle Gruppen-Partner im Umkreis von 128 px.
  Geblockt werden: Spider Shooter (auch aufgeladen), Cocoon Ram, Catastrophe Cannon, Cannon Volley, Tentacle Bug,
  Black Rain (alle Varianten) und Ultimate Flare. Kleine Angriffe (z. B. von Keramon, Chrysalimon) werden nicht geblockt,
  damit der Cooldown (45 s) für die großen frei bleibt.
- **Mehrere Clavis wechseln sich ab:** Der bereite Clavis mit der kleinsten Slot-Nummer zündet zuerst und meldet es sofort
  an die anderen Fenster. Kommt nichts, springt 0,2 s später der nächste ein. Fallen zwei Angriffe auf denselben Moment
  (z. B. Black Rain Storm + Shell), reicht ein Key of Hope.
- In der normalen Skill-Rotation wird Key of Hope nicht mehr verbraucht. Abschaltbar unter Boss-Mechaniken.
- Wichtig: Die Gruppe muss nah beieinander stehen (128 px um den Clavis), sonst sind die anderen nicht geschützt.

#### Neu in 2.12.5 – Liegengebliebene NPC-Dialoge schließen
- Nach einem Annehmen oder Abgeben blieb die Folgeseite des NPC-Dialogs offen, wenn der Bot direkt in einen Kampf ging
  (gut bei Mitläufern zu sehen). Jetzt schließt der Bot einen Dialog nach ~1,5 s, wenn er gerade kein Gespräch mit diesem NPC führt.

#### Neu in 2.12.4 – Gespräche vor Angreifern
- Ein Mitläufer prüft vor jedem neuen Kampf, ob er ein Gespräch des Leaders nachmachen muss (Annehmen, Abgeben, Sprechen).
  Vorher ließ er sich von angreifenden Monstern (z. B. Andromon) in einen Kampf ziehen, statt die Quest anzunehmen.

#### Neu in 2.12.3 – Hängende Dialogseite
- Bleibt ein NPC-Dialog auf einer veralteten Seite stehen, spricht der Bot den NPC nach 2 wirkungslosen Klicks neu an.
  Vorher klickte er bis zu 6-mal dieselbe Auswahl.

#### Neu in 2.12.2 – Keine sinnlosen Annahme-Versuche, fehlende Story-Quests nachholen
- Ein Mitläufer macht ein Annehmen des Leaders nur noch nach, wenn der NPC ihm die Quest auch anbietet (Vorquests erledigt,
  Level reicht). Vorher versuchte er es ~15-mal und gab nach ~14 s auf. Der Leader wartete in der Zeit auf ihn.
- **Fehlende Story-Quests nachholen:** Hat der Leader eine Story-Quest schon abgeschlossen, die der Mitläufer verpasst hat,
  nimmt der Mitläufer sie an, erledigt sie und gibt sie ab. So reißt die Quest-Kette nicht ab (z. B. „Word to Gennai“ →
  „The Assembly Hall“).

#### Neu in 2.12.1 – Mitläufer holen auch im Jagdgebiet auf
- Mitläufer prüfen jetzt **vor jedem neuen Kampf**, ob ein Gespräch des Leaders nachzumachen oder eine Quest aufzuholen ist.
  Vorher passierte das nur, wenn kein Monster in der Nähe war. In Jagdgebieten mit ständig neuen Monstern kam ein
  Mitläufer nie dazu. Beispiel: Fumiko behielt „The Beach Guardian“ fertig, gab sie aber nie ab.

#### Neu in 2.12.0 – Höchste Digitation, Skills je Form, Beute & Verbrauch
- **Höchstmögliche Digitation:** In den Autopilot-Einstellungen unter „Digitation“ gibt es „⬆ höchstmögliche Digitation“.
  Der Bot digitiert Schritt für Schritt bis zur höchsten freigeschalteten Form auf dem Ast des aktuellen Digimons,
  z. B. Patamon → Angemon → MagnaAngemon. Gesperrte Äste werden übersprungen. Das gilt auch für Mitläufer.
- **Skills und Heal je Digitationsform:** Haken und „Heal <x %“ im Reiter Kampf gelten jetzt nur für die aktuelle Form
  (im Titel steht z. B. „· Angemon“). Nach einer Digitation liegt auf derselben Taste ein anderer Skill, deshalb hat
  jede Form ihre eigene Einstellung. Eine alte Heal-Einstellung wird einmalig der aktuellen Form zugeordnet.
- **Sitzung: Beute & Verbrauch** (Übersicht):
  - EXP gesamt aus allen Quellen, Bits rein/raus und netto.
  - Zwei Listen: welche Items seit Sitzungsbeginn dazukamen (Drops, Belohnungen) und welche weniger wurden
    (Tränke, abgegebene Quest-Items). ↺ setzt alles zurück.

#### Neu in 2.11.7 – Boss-Liste mit Suche
- Im Reiter Bosse unter „Bosse auswählen“ gibt es ein **Suchfeld**, das nach Boss- oder Map-Namen filtert.
- Die Liste hat eine **feste Höhe** und wird mit dem **Balken rechts** gescrollt. Das Panel wächst nicht mehr nach unten.
- Alle scrollbaren Listen haben schlanke, gut sichtbare Scrollbalken.

#### Neu in 2.11.6 – Kein Kanal-Pingpong bei Boss-Quests
- **Neuer Kanal ist nicht automatisch frisch:** Der Bot merkt sich den Boss-Timer pro Kanalnummer, auch wenn der Kanal
  schließt, sobald niemand mehr drauf ist. Ein neu geöffneter Kanal mit bekanntem Timer wird nicht mehr als „Boss frisch“
  gewertet. Vorher wechselte die Gruppe bei Phantomon ständig Ch 1 ↔ Ch 2.
- **Keine falsche 5-min-Sperre mehr:** Der Zähler für fehlgeschlagene Kanalwechsel wird nach jedem erfolgreichen Wechsel
  zurückgesetzt. Vorher wurde nach einigen Wechseln Ch 1 fälschlich gesperrt („Wechsel klappt nicht“), und die Gruppe
  blieb auf dem Kanal mit dem späteren Respawn.

#### Neu in 2.11.5 – Zusammen losreisen
- Macht ein Mitläufer gerade **dasselbe** Gespräch nach wie der Leader (gleiches Ziel), wartet der Leader nicht mehr
  „vor dem Map-Wechsel“ auf ihn. Beide reisen gleichzeitig. Vorher lief der Mitläufer vor und der Leader kam ~25 s später.
- Die Regel „nicht allein vorlaufen“ (2.11.3) gilt jetzt auch, während der Leader gerade eine Map lädt.

#### Neu in 2.11.4 – Kein falsches Aufholen
- Der Leader meldet jetzt auch seine **abgeschlossenen** Quests. Ein Mitläufer holt eine Quest nur noch allein nach, wenn
  der Leader sie wirklich abgeschlossen hat.
- Vorher reichte „Leader hat sie nicht aktiv“, das gilt aber auch, wenn er sie erst noch annimmt. So erledigte z. B.
  Marcus „The Supply Line“ komplett allein, bevor Spencer sie überhaupt angenommen hatte.

#### Neu in 2.11.3 – Mitläufer laufen nicht mehr allein vor
- Wählt der Leader ein Gespräch auf einer **anderen Map**, während er noch beim Mitläufer steht, läuft der Mitläufer nicht
  mehr allein los. Er meldet „gesehen“, damit der Leader nicht wartet, und folgt ihm.
- Erst wenn der Leader die Map gewechselt hat, übernimmt der Mitläufer das Gespräch. Beide reisen also zusammen.
- Vorher wartete der Leader auf den beschäftigten Mitläufer, der Mitläufer lief allein vor, dann zurück, und beide
  trafen sich wieder.

#### Neu in 2.11.2 – Boss-Quest: kürzester Respawn wie in der Boss-Rotation
- Ist der Boss einer Quest nicht da, schätzt der Autopilot für jeden Kanal, wann er kämpfbar ist:
  - lebt: sofort
  - tot: Respawn-Timer aus Boss-Fenster/Map-Info oder eigenem Sieg
  - unbekannt: einmal nachsehen
  - neuer Kanal: spawnt frisch
- Er wartet auf dem schnellsten Kanal und wechselt nur, wenn ein anderer deutlich schneller ist (>15 s). Kein Hin-und-her mehr.
- Die Statuszeile zeigt z. B. „warte auf Mammothmon (Ch 2: Respawn in 3:40)“.
- Log der Boss-Rotation korrigiert: Ch 2 lässt sich immer öffnen, erst ab Ch 3 müssen die anderen Kanäle fast voll sein.

#### Neu in 2.11.1 – Boss-Quest: Ch 2 selbst öffnen
- Ist ein Feldboss auf Ch 1 tot und gibt es keinen anderen Kanal, öffnet der Autopilot Ch 2 selbst. Das Spiel erlaubt
  immer mindestens 2 Kanäle, ab Ch 3 erst bei ~90 % Auslastung. Die Mitläufer wechseln automatisch mit.

#### Neu in 2.11.0 – Übersichtlicheres Panel und Heil-Skills
- **Kopfbereich:** Modus, Start/Stopp, Status und die **aktuelle Aufgabe mit Fortschrittsbalken** (z. B. „Spare Circuits · 2/3“).
  Oben rechts ein Gruppen-Chip („● Leader 2/2“). HP/DS/Ziel stehen nur noch oben, nicht doppelt.
- **Reiter mit Symbolen:** 📊 Übersicht · ⚔️ Kampf · 📜 Quests · 👑 Bosse · 👥 Gruppe · 📋 Log.
- **Übersicht als Dashboard:**
  - Kacheln: EXP/Min, Bits/Min, Level-Up in, Kills, Quests abgegeben, Bewusstlos (seit Sitzungsbeginn, ↺ setzt zurück).
  - „Als Nächstes“: aktuelle Aufgabe und die nächsten drei Schritte des Autopiloten.
- **Reiter Gruppe (vorher Accounts):**
  - Modus-Schalter 🤖 Bots · 👣 Spiegeln · ⚔️ + Angriff.
  - Knöpfe 🔑 Einloggen · ▶ Starten · ■ Stoppen.
  - Eine Karte pro Mitglied mit Ort, HP, Status und Quest-Abgleich mit dem Leader (✓ gleich / ⚠ anders).
  - Die Account-Liste liegt eingeklappt unter „Accounts verwalten“.
- **Log mit Filtern:** Alle · Quests · Gruppe · Kampf · Karte · Warnungen.
- **Breite ziehbar** (rechte untere Ecke, wird gemerkt). Der Knopf ▭ schaltet den Kompaktmodus um: nur Start, Status und Aufgabe.
- **Heil-Skills:** Im Reiter Kampf hat jeder Skill rechts eine Auswahl: „Angriff“ (normal) oder „Heal <30…80 %“.
  - Ein Heil-Skill wird nur gewirkt, wenn die HP des Digimons unter den Wert fallen, auch außerhalb des Kampfes und beim Spiegeln.
  - Im normalen Angriff wird er nicht verbraucht.

#### Neu in 2.10.8 – Leader wartet nicht mehr grundlos
- **„Kämpft gerade“ nur bei echtem Kampf:** Das Kampf-Flag des Spiels bleibt nach einem Kampf noch einige Sekunden
  stehen. Deshalb wartete der Leader vor Abgaben 4–10 s auf einen Mitläufer, der längst zum NPC unterwegs war. Jetzt
  zählt nur ein laufender Angriff oder ein Monster, das gerade angreift. Wer zu einem Gespräch unterwegs ist, kämpft nicht.
- **Leader stoppt die Gruppe nicht mehr zu früh:** Hat er nichts mehr zu tun, hält aber eine Abgabe für einen Mitläufer
  zurück, wartet er, statt mit „keine machbaren Quests“ alle Bots zu stoppen.

#### Neu in 2.10.7 – Boss-Quests: andere Kanäle prüfen
- Verlangt eine Quest einen Feldboss (z. B. Andromon, Respawn 10 min) und ist er am Spawnpunkt nicht da, wartet der
  Autopilot 20 s und prüft dann der Reihe nach die anderen freien Kanäle, je 20 s.
- Mitläufer wechseln automatisch mit, weil sie dem Kanal des Leaders folgen.
- Sind alle Kanäle geprüft, wartet er normal weiter.

#### Neu in 2.10.6 – Zonenziele und Aufholen in der Gruppe
- **Zonen-/Reiseziele werden mitgemacht:** Geht der Leader für ein Quest-Ziel in eine Zone (z. B. „The Assembly Hall“ →
  Bereich *assembly*), laufen die Mitläufer selbst hinein. Vorher zählte das Ziel nur für den, der zufällig drinstand.
  Die Mitläufer konnten dann die Folgequests nicht annehmen, und die Gruppe lief auseinander.
- **Leader gibt erst ab, wenn alle das Zonen-/Gesprächsziel haben.** Er wartet dafür höchstens 5 min.
- **Aufholen:** Ist der Leader bei einer Quest schon weiter, erledigt ein Mitläufer das Gespräch, die Zone oder die
  Abgabe selbst. Quests, die der Leader aktiv hat, der Mitläufer aber noch nicht, nimmt dieser von sich aus an.

#### Neu in 2.10.5
- **Mitläufer digitieren:** Zwischen den Kämpfen digitieren Mitläufer in die Zielform aus den Autopilot-Einstellungen
  (z. B. Patamon → Angemon), wenn ihr eigenes Digimon diese Form freigeschaltet hat. Sonst bleiben sie, wie sie sind.

#### Neu in 2.10.4 – Jagd-Logik und Gruppe aus dem Live-Test
- **Zusammengefasste Jagd verliert erledigte Ziele sofort:** Liegen zwei Jagd-Quests auf derselben Map, jagt der
  Autopilot beide Beutearten gemeinsam. Ist eine Quest fertig, fliegt ihre Beute sofort raus. Vorher jagte er z. B.
  weiter Hagurumon/Kokuwamon, obwohl nur Guardromon (Foundry/Core) die Circuit Boards fallen lässt.
- **Region = Spawn-Gebiet:** Kill-/Sammel-Quests haben in den Spieldaten keine eigene Region. Die Region ergibt sich
  daraus, wo die Art spawnt bzw. welches Monster das Item droppt, und genau dort jagt der Bot.
- **Zwischendurch abgeben:** Ist eine Quest auf derselben Map fertig, gibt der Autopilot sie mitten in der Jagd ab.
  Das gilt nicht in der Map-für-Map-Runde, dort kommt Abgeben bewusst zuletzt.
- **Notbremse:** Steigt bei einer Jagd 4 min lang kein Zähler, meidet der Bot das Gebiet 5 min und plant neu.
- **Schutzzonen-Pingpong:** Läuft der Bot wegen desselben Monsters 3× in 12 s aus einer Schutzzone und gerät wieder
  hinein, lässt er dieses Monster 15 s in Ruhe, statt endlos hin und her zu laufen.
- **Gruppe wartet kürzer:** Der Leader wartet nach einem Gespräch nur noch, bis die Mitläufer es **übernommen** haben,
  nicht bis sie fertig sind. Bis zum Ende wartet er nur, bevor er die Map verlässt.

#### Neu in 2.10.3 – Wandernde NPCs, ruhigere Mitläufer
- **NPCs mit wechselndem Standort:** Manche NPCs (z. B. Leomon, Wizardmon, Gennai-Hologramm, insgesamt rund 20)
  stehen je nach Quest-Stand an einem anderen Punkt der Map. Der Autopilot liest diese „Stationen“ aus den Spieldaten
  und geht zum richtigen Punkt. Vorher suchte er am Standardplatz und meldete „Leomon ist nicht da“.
- **Mitläufer übernehmen die Beute des Leaders in jedem Takt.** Jagt der Leader gerade nicht, z. B. weil er vor einer
  Abgabe auf das Kampfende wartet, fangen sie keine neuen Kämpfe an, sondern wehren nur noch ab. Vorher kämpften sie
  weiter, und der Leader wartete bis zu 2 min.

#### Neu in 2.8.3 – Unterwegs keine Kämpfe
- Auf dem Weg zum **Annehmen, Abgeben, Sprechen** und zu **Reise-Zielen** (auch über mehrere Maps) ignoriert der
  Autopilot alle Angreifer: Digimon zurückrufen und weiterlaufen. Gekämpft wird nur noch beim Jagen.

#### Neu in 2.8.2 – Jagdgebiete
- **Bosse nur als letzte Quelle:** Für Sammel-Items wählt der Autopilot normale Monster. Feldbosse (stark, lange
  Respawn-Zeit) nur, wenn es keine andere Quelle gibt. Verlangt eine Kill-Quest genau den Boss, bleibt er das Ziel.
- **Zonen mit mehreren passenden Arten** werden bevorzugt (mehr mögliche Ziele).
- **Leeres Jagdgebiet:** Kommt 90 s lang kein passendes Monster, meidet der Bot das Gebiet 5 min und geht zum
  nächstbesten mit derselben Beute, statt die Aufgabe abzubrechen.

#### Neu in 2.8.0
- **Runde startet an der Start-Map:** Bei jedem Bot-Start beginnt die Map-für-Map-Runde an der eingestellten Start-Map
  (vorher wurde der Fortschritt des letzten Laufs weitergeführt). Überspringt der Bot eine Map, steht der Grund im Log,
  z. B. „3× heute schon erledigt, 1× Level zu niedrig“.
- **Abgabe ohne Kämpfe:** Ist als Nächstes eine Abgabe dran, kämpft der Autopilot nicht mehr – auch nicht gegen
  Angreifer. Er ruft das Digimon zurück und läuft zum NPC.
- **Ablehnungen des Spiels:** Meldet das Spiel „Your partner cannot reach that target.“ (unreachable) oder
  „Too far away.“ (not_in_range), reagiert der Bot sofort. Bei „cannot reach“ wechselt er ab 2.8.1 erst die Position:
  erst seitlich vom Ziel, dann auf dessen Rückseite (je ~50 px, nur begehbare Punkte mit echtem Weg), und greift neu an.
  Erst nach dem dritten Fehlschlag wird das Ziel 1 min gesperrt. Bei „Too far away“ geht er näher heran. „You cannot fight here.“ (safe_zone) führt aus der Schutzzone.

#### Schutzzonen (ab 2.7.1)
Manche Bereiche einer Map sind Schutzzonen, z. B. Camp und Tore in Factorial Town. Dort lehnt das Spiel jeden Angriff ab
(„You cannot fight here.“). Der Bot liest diese Zonen aus den Kartendaten und läuft vor dem Angriff heraus, auf die Seite
des Ziels. Steht eine Zone nicht in den Daten, reagiert er auf die Spielmeldung. Die Kartendaten werden jetzt in jedem
Modus geladen.

#### Fixes 2.6.2
- **Sammel-Quests:** Quest-Items, die nur in den Drops der Monsterart stehen (z. B. Sleepy Spore von Mushroomon,
  Betamon Scale von Betamon), werden jetzt erkannt – Quest-Jagd und Autopilot jagen dafür die richtigen Monster.
- **Reise-Ziele mit Zone:** Ziele wie „Kuwagamon's Trail“ (Native Forest, Zone Deep Woods) – der Autopilot läuft jetzt
  in die Zone, statt nur die Map zu betreten.

### Protokoll (Reiter Log)
Zeichnet mit Uhrzeit auf, was passiert – auch wenn du selbst spielst: Kills, Quest angenommen/erfüllt/
abgeschlossen und Fortschritt, Map-Wechsel, Level-Ups, benutzte Tränke, Autopilot-Aufgaben und Warnungen
(unerreichbares Ziel, Ruhemodus, bewusstlos). Gleiche Einträge hintereinander werden zusammengefasst (×n).
„Kopieren“ legt alles in die Zwischenablage, „Leeren“ löscht es. Maximal 300 Einträge.

## Radar
Mini-Karte mit deinem Digimon in der Mitte (Reiter Daten): grün = passend, grau = abgewählt oder Level
außerhalb der Range, rot = greift dich an, orange = von anderem Spieler belegt, weißer Ring = Ziel,
lila/roter Rand = Elite/Boss (Bosse größer), gestrichelter Kreis = Suchradius. Monster außerhalb des
Radius sind blass.

## Bot (Start/Stopp: Button oder **Alt+B**)
- Wählt das nächste passende Monster **direkt** (wie ein Klick darauf): in Level-Range, innerhalb des
  **Suchradius** und nicht von einem anderen Spieler belegt (kein Kill-Stealing). Angreifer haben Vorrang.
  Ist kein passendes Monster da, wartet er. (Fallback, falls das nicht geht: Tab.)
- Verliert ein Ziel 12 s lang keine HP (z. B. unerreichbar), wird es für 1 Minute gesperrt.
- Ziel im erlaubten Level-Bereich (± Regler, bezogen auf das Digimon-Level) → greift mit **1** an
- Skills auf den Tasten **2–6** (per Checkbox einzeln an/aus): Sobald der Cooldown abgelaufen ist und genug
  DS da ist, wird der Skill gewirkt. Die Liste zeigt Skillname und Rest-Cooldown; Tasten ohne Skill
  (Items, leer) und gesperrte Skills werden übersprungen.
- Tränke, wenn der Wert unter den eingestellten Prozentwert fällt (0 = aus):
  **F1** Digimon-HP · **F2** Digimon-DS · **F3** Tamer-DS (je Trank höchstens alle 2 s)
- Monster, die dein Digimon oder deinen Tamer angreifen, werden immer zurück angegriffen (auch außerhalb der Level-Range).
- **Ruhemodus:** Fällt die HP unter die F1-Schwelle und es ist kein HP-Trank mehr da, beendet der Bot
  den laufenden Kampf, beginnt keinen neuen und wehrt nur Angreifer ab. Bei 100 % HP geht es weiter.
- Neben jedem Trank-Regler steht der Vorrat im Inventar; leere Tränke werden nicht mehr gedrückt.
- Pausiert automatisch, solange Chat/Eingabefeld aktiv ist oder das Digimon bewusstlos ist.
- Einstellungen werden gespeichert.

> Hinweis: Automatisiertes Spielen verstößt in vielen MMOs gegen die Spielregeln und kann zur Sperre führen. Nutzung auf eigenes Risiko.

## Installation

**Automatische Updates (ab 2.6.3):** Das Script holt sich neue Versionen selbst aus dem GitHub-Repo
[DRaccon-b/Digi](https://github.com/DRaccon-b/Digi). Tampermonkey prüft regelmäßig (oder per „Nach Updates suchen“)
und bietet die neue Version zur Installation an.
Direkter Installations-Link: https://raw.githubusercontent.com/DRaccon-b/Digi/main/digibot.user.js

1. Browser-Erweiterung **Tampermonkey** installieren (Chrome/Edge/Firefox).
2. Tampermonkey-Dashboard → „Neues Skript“ → Inhalt von `digibot.user.js` einfügen → speichern.
3. Chrome/Edge: in den Erweiterungsdetails von Tampermonkey „Benutzerskripts zulassen“ aktivieren.
4. https://play.digimmo.com.br/ neu laden und einloggen.

## Bedienung
- Panel an der Titelleiste verschieben (Position wird gemerkt).
- **⧉** öffnet das Panel als eigenes Fenster, das immer im Vordergrund bleibt (Chrome/Edge).
- **–** klappt das Panel ein. **Alt+D** oder **Alt+H** blendet es ganz aus/ein.
- HP-Balken des Digimons blinkt unter 25 %.

## Funktionsweise
Liest nur den Spielzustand `window.dmo.store` (`me.partner` inkl. `exp/expNext`, `me.tamerDs/tamerMaxDs`, `target`) –
die Anzeige selbst sendet nichts an den Server. Nur wenn der Bot läuft, simuliert er Tastendrücke
(Tab, 1, F1–F3), genau als hättest du sie selbst gedrückt.

## Tests

Die Tests laufen ohne Spiel in nachgebauten Spielwelten (jsdom) im Ordner `tests/`:

```bash
npm install
npm test
```

- Einzelne Tests: `node tests/run.js kohtest dodgenear`
- Ausgabe eines Tests sehen: `V=1 node tests/run.js kohtest`
- `JOBS` (gleichzeitige Tests, Standard: CPU-Threads minus 4; die langsamsten Tests starten zuerst) und `TIMEOUT` (Sekunden pro Test, Standard 200) lassen sich setzen.
- `tests/gw.js` ist die Spielwelt für Gruppen-/Autopilot-Tests, `tests/fakeworld.js` die ältere für Kampf-Tests.

## Dungeon-Probelauf

`sim/dungeon-keramon.js` spielt einen ganzen Kera-Easy-Lauf mit echten DigiBot-Fenstern: Tür, Betreten, 7 Wellen mit Terminal-Fressern und Wächtern, Tor, Boss in drei Formen (Warnkreise, Strahl, Spiegel, „NOT HERE“), Stürze und Ausgang. Positionen, Wellen und Boss-Attacken stammen aus den Spieldaten.

```bash
node sim/dungeon-keramon.js
```

- `SKRIPT=pfad/zu/digibot.user.js`: andere Bot-Version laufen lassen (A/B-Vergleich).
- Partner wie im ersten Live-Lauf: Imperialdramon Paladin Mode Lv 99 (92 660 HP, Skills, Angriffstempo 1 121 ms). Der Schaden ist auf die live gemessenen ~18 000 pro Sekunde kalibriert. Boss-HP (3,46 Mio.), Enrage nach 600 s und Infermons Mahlzeit (abbrechen mit 2 % der Max-HP in 5 s) sind wie im Spiel.
- `GRUPPE` (1–5, Standard 3), `SCHADEN` (Grundangriff, 12 000), `HP` (92 660), `BOSS_HP` (3 459 500), `DAUER` (1000 s)
- `TRAENKE` (40), `TRANK_HP` (15 000), `TRANK_AB` (50 %): HP-Tränke auf F1
- `TEMPO=4`: Zeitraffer, alles läuft 4× schneller (höchstens 4, darüber weichen die Ergebnisse ab). `SCHNELL=1`: Boss-HP und Enrage ÷ 10 (für den Test). `V=1`: jeder Statuswechsel der Bots
- Annahmen (Server-Logik ist nicht im Client): Nach einer Welle ohne Pflicht-Monster kommt die nächste sofort, sonst nach 4 s. Hungrige Tsumemon fressen weiter. Außerhalb des Kampfes 3 % HP/s Erholung.
- Ergebnisse mit 2.29.2: allein in 393 s geschafft (Boss 308 s, 5 von 8 Mahlzeiten abgebrochen, 28 Tränke), zu dritt in 135 s. Der Simulator ist optimistischer als das Spiel: Live (noch 2.29.0, mit Ausweichen statt Tanken) schaffte der Bot in Raum 1 nur 4/6 Terminals, und Infermon fraß 12 Mahlzeiten bis zum Enrage.

### Hard („Revenge“)
`node sim/dungeon-revenge.js` (Standard: allein; `GRUPPE=3` für eine Gruppe, `TEMPO=4`). Gleiche Partner-Werte wie Easy; Boss-HP, Uhr, Enrage und alle Attacken stammen aus den Spieldaten. `SHARE_FOLGT=1`: Der geteilte Treffer folgt dem Ziel (sonst bleibt er liegen und ist ausweichbar). `START=4`: gleich in Raum 4. `DIABO_PCT=71`: Diaboromon startet mit so viel %. `STEUERUNG=tamer`: Spiel auf Tamer-Steuerung (Standard: Digimon-Steuerung, der Klick bewegt das Digimon, es geht auch durch Türen). Im Log steht bei jedem Key of Hope, welche Attacke als Nächstes fällig ist. Angenommen sind der Grundtreffer der Bosse (`BOSS_HIT`, 6 000 alle ~2 s), dass Kopien nicht angreifbar sind und die Aufteilung der Herde.

### Was in Raum 1 nicht hilft (A/B-Vergleich, Okt. 2026)
Simulator kalibriert auf live: Digimon läuft 120 px/s, Skill-Animationen (Invincible Sword 0,6 s, Omega Blade 0,9 s) blockieren den Grundangriff. Allein, je 6–12 Läufe, Terminals heil im Schnitt:
- wie 2.29.8 (Raummitte): 3,0 · Abfangen an den Startpunkten der nächsten Welle: 2,8 · zusätzlich lange Skills weglassen: 2,0 (langsamer) · Monster erst töten, dann wechseln: 2,9.
- Engpass ist der Schaden allein: 4–6 Fresser à ~13 000 HP in ~9 s, und sie erscheinen nur ~150 px vor ihrem Terminal. Allein sind ~3/6 realistisch (live 3–4), zu dritt 6/6. Jedes Terminal bringt nur 5 Kuramon-Daten Bonus.

## Raid-Probelauf

`sim/raid-armageddemon.js` lässt fünf echte DigiBot-Fenster (Imperialdramon + 4 ClavisAngemon) gegen einen
nachgebauten Armageddemon antreten. Die Angriffswerte kommen aus den Spieldaten. Ausgegeben werden Ablauf und
Tabelle: getroffen, ausgewichen, von Key of Hope geblockt, umgekippt.

```bash
node sim/raid-armageddemon.js
```

- `--ohne`: zum Vergleich ohne Ausweichen und ohne Key of Hope
- `DAUER` (Sekunden, Standard 100) und `HP` (HP je Digimon, Standard 80 000 – die echten Werte kennt der Client nicht)
- Vereinfacht: kein Nahkampfschaden des Bosses, keine Heilung, keine Deckung hinter den Platten bei Ultimate Flare.
