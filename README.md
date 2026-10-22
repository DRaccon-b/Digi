# DigiBot – Status-Anzeige für play.digimmo.com.br

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
- **Bis zu 5 Accounts:** Benutzername und optional Passwort. ☑ = beim Gruppenstart dabei, ◉ = Leader.
  Passwörter liegen **unverschlüsselt** im localStorage dieses Browsers. Ohne Passwort loggst du im Fenster selbst ein.
- **Charaktername:** Wird bei jedem Einloggen pro Account gemerkt („zuletzt: Spencer · vor 2 h“). Im Gruppenfenster
  wählt der Bot genau diesen Charakter aus.
- **🔑 Alle einloggen (ab 2.9.4):** Dieses Fenster übernimmt den hier eingeloggten Account (sonst den Leader).
  - Für jeden weiteren Account öffnet sich ein eigenes Fenster, nebeneinander gekachelt. Pop-ups für die Seite müssen
    erlaubt sein.
  - Ist dort noch ein anderer Account angemeldet, meldet der Bot ihn ab, loggt den richtigen ein und betritt die Welt.
  - Der Bot startet dabei **nicht**.
  - Eingeloggt wird nur auf Knopfdruck. Beim Öffnen oder Neuladen der Seite loggt sich nichts automatisch ein.
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
