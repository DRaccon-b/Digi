# DigiBot – Ausführliche Anleitung

> Stand: die Funktionsbeschreibung stammt aus der 2.x-Reihe und gilt weiter. Was sich mit **3.0.0** geändert hat (z. B.
> Passwörter werden nicht mehr gespeichert, Not-Aus, Tamer-Skills, feste Gruppenplätze), steht in der [README](../README.md)
> und im [CHANGELOG](../CHANGELOG.md).

## Aufbau des Panels (ab 2.6)
Oben immer sichtbar:
- **Modus-Schalter** – genau eine Betriebsart: **Grinden** (Monsterliste im Suchradius), **Quest-Jagd** (nur
  Quest-Monster dieser Map), **Autopilot** (Quests komplett) oder **Bosse** (Boss-Rotation / Named-Elite-Runde).
  Früher waren das einzelne Schalter in den Reitern.
- **Start/Stopp** (Alt+B) mit dem Namen des Modus, darunter die Statuszeile (Maus darüber = ganzer Text)
- **Mini-Leisten** für HP und DS des Digimons und die HP des Ziels – in jedem Reiter sichtbar
- **💾 Preset speichern / 📂 Preset laden (ab 3.0.1)** – speichert alle Bot-Einstellungen (Modus, Tränke, Skills,
  Monsterliste, Quest-/Boss-Auswahl …) unter einem Namen als `.txt`-Datei und lädt sie wieder. Accounts, Benutzernamen
  und Passwörter kommen nie hinein und bleiben beim Laden unverändert. Ebenfalls draußen: Panel-Ansicht (Reiter,
  Breite, aufgeklappte Gruppen) und der Fortschritt einer laufenden Map-Runde.

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


### Schutzzonen (ab 2.7.1)
Manche Bereiche einer Map sind Schutzzonen, z. B. Camp und Tore in Factorial Town. Dort lehnt das Spiel jeden Angriff ab
(„You cannot fight here.“). Der Bot liest diese Zonen aus den Kartendaten und läuft vor dem Angriff heraus, auf die Seite
des Ziels. Steht eine Zone nicht in den Daten, reagiert er auf die Spielmeldung. Die Kartendaten werden jetzt in jedem
Modus geladen.

### Fixes 2.6.2
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
