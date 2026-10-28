# Changelog

Alle Änderungen an DigiBot, neueste zuerst.

## 3.1.15 – Flare: Nahbereich um den Boss gilt als drin
Mitschnitt (28.10., 4. Lauf): Die Ansage-Linie steht 4,1 s (2,5 s Ansage + 1,6 s Schwenk), die Treffer kamen am Ende des
Schwenks. SpencerD und Fumiko standen 144° abseits der Strahlrichtung („hinter“ dem Boss), aber nur 26 px von ihm entfernt –
getroffen; wer 40 px und mehr entfernt stand, blieb heil, bei ähnlichen Winkeln.
- **Umkreis von 64 px um den Ursprung eines schwenkenden Strahls gilt als drin:** der Bot geht mindestens 92 px vom Boss weg,
  bevorzugt hinter ihn (Vorzug aus 3.1.11), nicht mehr dicht an seinen Rücken.

## 3.1.14 – Flare: Platten nur noch Rückfall, Sammeln mit eigenem Platz, Angriff beim Sammeln
Live (28.10., 4. Lauf, Mitschnitt): SpencerD und Fumiko fielen gleichzeitig an der Flare (je 65 401) – die Deckung hinter
einer Platte gewann als nächstgelegener Punkt gegen den Weg hinter den Boss; beim Sammeln standen vier Clavis auf demselben
Pixel und bekamen je zwei Volley-Kreise ab (2 × 45 000, MarcusD und SpencerD tot in Raum 3); beim Sammeln 42–45 px vom
Boss schlug niemand zu.
- **Platten nur als Rückfall:** Ausgewichen wird hinter den Boss; die Deckung wird nur gewählt, wenn es keinen erreichbaren
  Fluchtpunkt gibt.
- **Sammeln:** jedes Fenster bekommt einen eigenen Platz im Schutzkreis (36 px um den Anker, nach Slot verteilt).
- **Angriff beim Sammeln** auch bis 36 px außerhalb der Schlagweite (der kleine Schritt bleibt im Schutzkreis).

## 3.1.13 – Raumstand nach dem Verlassen löschen (Herden-Form stufte an der Tür zurück)
- Live (28.10.): Nach einem Abbruch und Wiedereinstieg blieb der Raumstand „Raum 4 ist der nächste“ im Bot stehen; mit
  Haken „Herde in niedriger Form“ stuften die Clavis schon an der Tür zu Angemon zurück. Jetzt werden Raumstand, Herden-
  und Kite-Zustand beim Verlassen und beim Betreten gelöscht, und die Herden-Form wartet auf den Raumstand dieses Laufs.

## 3.1.12 – Raum 4 live (3. Versuch): Fächer sofort hinter den Boss, Kiten bis er wirklich unten ist, Formwechsel abgeraten
Bot-Log aus Bauzels Fenster: „Warnfächer – kämpfe weiter, laufe 0,5 s später heraus“ → Treffer (Spät-Ausweichen ließ nur noch
den Punkt seitlich zu, nicht den hinter dem Boss); „nach unten kiten“ und „ist heran (163 px)“ in derselben Sekunde (der
Startplatz des Bosses liegt nur ~166 px über der unteren Kante, 250 px waren sofort erfüllt); „zurück zu Imperialdramon“ ging
im Spiel bis Veemon, der Aufstieg lief stufenweise (~10 s je Stufe) – währenddessen fing niemand Kuramon, SpencerD war beim
Boss noch Shakkoumon und fiel an der Flare.
- **Fächer: kein Spät-Ausweichen mehr** – sofort los, mit Vorzug für den Punkt hinter dem Boss.
- **Kiten:** „heran“ erst, wenn der Boss bis auf 100 px an den Sammelpunkt an der unteren Kante gelaufen ist.
- **Haken „Herde in niedriger Form“ Standard aus** mit Warnung: im Spiel geht Zurück-Digitieren bis in die Grundform.
- Simulation Raum 4 (ohne Formwechsel, 2 Läufe): geschafft, 0 Stürze, 0 Flare-Treffer bei 37 Ansagen, 541–559 s;
  Armageddemon-Raid 3× 0 Treffer. Suite grün.

## 3.1.11 – Raum 4: richtig nach unten kiten, Herde seitengetreu
Live (28.10., 3.1.10): Posten oben links/rechts und das Kiten liefen an, aber der Kampf fand immer noch zu weit oben statt –
Armageddemon kam in 75 s nur 45 px nach unten, weil die 20-s-Frist ablief und sein Ziel (Bauzel) durch Key-of-Hope-Sammeln
bei einem oben stehenden Clavis und durch Ausweichen immer wieder nach oben lief; Fumiko und Makota fielen an der Flare.
- **Kiten für alle, unabhängig vom eigenen Ziel:** Jedes Fenster kitet, sobald der Herden-Boss sichtbar und angreifbar ist –
  auch wer gerade noch ein Kuramon anvisiert hatte (vorher blieb der oben und zog den Boss mit).
- **Sammelpunkt ganz unten** (50 px über der Raumkante statt 90), „unten“ erst, wenn der Boss höchstens 90 px darüber steht.
  Keine feste Frist mehr: abgebrochen wird nur, wenn er 15 s lang nicht näher kommt.
- **Seiten-Taktik beim Boss (Nutzer):** Angegriffen wird, sobald Armageddemon auf 250 px an den Sammelpunkt an der unteren
  Kante heran ist. Dann stehen alle auf EINER Seite von ihm (links oder rechts, je nachdem, wo die Gruppe gerade steht),
  niemand oben oder unten – nur solange der Boss das eigene Ziel ist (Kuramon-Haufen in der Panzer-Phase dürfen angelaufen
  werden). Beim Fächer wird hinter dem Boss ausgewichen (gegenüber seiner Zielrichtung).
- **Herde seitengetreu:** Die Clavis greifen zuerst die Kuramon ihrer eigenen Seite an (links/rechts vom Ei); vorher liefen
  die linken zur rechten Welle, weil nur der Abstand zum Ei zählte.
- Simulation Raum 4 mit allem (Formwechsel, Posten, Kiten, Seite): 4 von 4 geschafft, 0 Stürze, 0 Flare-Treffer bei 63
  Ansagen, 25–29 von 60 Kuramon abgefangen (vorher 10–19), Boss-Stärke 7–8; Boss-Kampf 320–395 s von 480 s Enrage.

## 3.1.10 – Raum 4 live nachgebessert: Boss zählt erst sichtbar, Zurückstufen nach Raum 3, Kiten nach unten
Live (28.10., erster Lauf mit 3.1.9): Armageddemon steht im Spielzustand schon ab Raumstart da – versteckt und unangreifbar
(Flags Hidden + Untargetable) –, sichtbar wird er erst nach der Herde. Der Bot hielt ihn für „da“: kein Zurückstufen, alle
sofort unten in der Mitte statt auf den Wellen-Posten, und nach seinem Erscheinen wurde nicht nach unten gekitet.
- **„Boss ist da“** gilt erst, wenn er sichtbar und angreifbar ist (Posten, Formwechsel, Kiten).
- **Zurückstufen direkt nach dem geschafften Raum 3** (nächster zu räumender Raum ist der Herden-Raum), nicht erst im Raum.
- **Zielform:** Ist die eingestellte Digitation nicht die des eigenen Digimons (Bauzel hatte „ClavisAngemon“ stehen), gilt
  die höchste Form – vorher blieb der Formwechsel dann stumm aus.
- **Kiten:** Sobald Armageddemon angreifbar ist, gehen alle in die untere Raumhälfte und warten dort ohne Angriff, bis er
  nachgekommen ist (er folgt seinem Ziel mit 60 px/s), höchstens 20 s; dann Kampf unten, wer nördlich von ihm steht, geht
  unten herum. Ausweichen und Key of Hope laufen dabei weiter.
- Live-Befund 3.1.6: Key of Hope wechselt jetzt zwischen drei Clavis (Makota, Fumiko, MarcusD), Raum 3 ohne großen Treffer
  in 302 s.
- Simulation Raum 4 mit Formwechsel und Kiten (2 Läufe): geschafft, 0 Stürze, 0 Flare-Treffer bei 37 Ansagen, 15 Kuramon
  abgefangen; Raum 4 dauert mit dem Kiten 568–579 s (vorher 510–550 s) – der Boss-Kampf rückt damit näher an die
  8-min-Enrage (live ist der Gruppenschaden höher als in der Simulation). Suite 152/152.

## 3.1.9 – Raum 4: Herde in niedriger Form (Shakkoumon / Dragon Mode)
Nutzer-Taktik, in der Simulation geprüft (20–21 statt 10–19 von 60 Kuramon abgefangen, Boss eine Stufe schwächer, 0 Stürze).
- **Haken „Raum 4: Herde in niedriger Form abwehren“** (Reiter Bosse → Dungeon, Standard aus – erst live prüfen): Vor den Wellen – noch im
  sicheren Bereich, bevor etwas gezogen ist – geht jedes Digimon eine Stufe zurück (Clavis → Shakkoumon mit Kachina Bombs,
  Paladin → Dragon Mode mit Mega Crusher und Positron Laser; die Clavis selbst hat keinen Flächenangriff). Die Wellen
  werden in dieser Form abgewehrt. Sobald Welle 9 vorbei ist (9 von 10 Wellen gespawnt, keine Kuramon mehr unterwegs) –
  spätestens, wenn Armageddemon erscheint – digitiert jedes Digimon wieder in seine Zielform (Reiter Quests, „Digitation“).
  Ausweichen und Key of Hope laufen dabei weiter.
- Zur Frage Crest-Buffs: Tai +25 % Angriff, Izzy +30 % Skill-Schaden, Ken +25 % Schaden – je 15 s auf den eigenen Partner,
  90 s Abklingzeit. Eine Kachina Bombs (ca. 11 000–12 000) käme damit auf 14 500–15 200 gegen 15 400 HP der Kuramon:
  nur mit Izzy gerade so, und nur für eine von zehn Wellen.
- Simulation: Befehle devolve/evolve, Formkette im Spielzustand, `FORMBOT=1` lässt den Bot selbst wechseln. Mit dem
  Bot-eigenen Ablauf: zurück bei 4 s, hoch bei 106 s (13 s vor Armageddemon), 15–16 abgefangen, 0–1 Sturz, 2 von 2
  geschafft – weniger als der ideale Sim-Wechsel (20–21), weil Shakkoumon in der normalen Rotation auch Sacred Clay und
  Justice Beam statt nur Kachina Bombs nutzt. Entscheidend bleibt der echte Bombenschaden (live messen).

## 3.1.8 – Reiter „Food“ und Betriebsart „Food kaufen“
- **Neuer Reiter Food:** HP-Food (Feast), DS-Food fürs Digimon (DS Drive oder DS Cartridge) und Tamer-DS-Food (Ramen
  oder Bento) wählen, je Sorte „auffüllen auf“ (bis 297 Stück, Stapel zu 99).
- **Betriebsart „Food kaufen“:** Der Bot reist nach Dream Ruins, geht im Lager zu Händler Tentomon, spricht ihn an, öffnet
  das Sortiment, kauft jede Sorte bis zur Zielmenge nach (vorhandene Stapel angerechnet, nur so viel, wie die Bits
  reichen), schließt den Shop und stoppt. Log: was gekauft wurde und was offen blieb. Antwortet der Händler nicht,
  bricht er nach vier Versuchen ab. Test foodtest (Händler-Ablauf mit Elecmon als Ersatz); im Spiel noch nicht geprüft.
  Suite 152/152.
- Simulation: Flächen-Skills der Spieler (Invincible Sword, Kachina Bombs …) treffen alle Monster im Radius (vorher nur das
  Ziel). `FORM=1`: Raum 4 – für die Herde zu Shakkoumon/Dragon Mode zurück, bei Welle 10 wieder hoch (Experiment zur
  Nutzer-Idee: 20–23 statt 10–19 Kuramon abgefangen, aber die Rück-Digitation bei Welle 10 kollidiert mit dem Boss-Start;
  nicht in den Bot übernommen). Nach drei Sim-Korrekturen (Cooldowns je Tastenplatz, Skill-Tabelle der aktuellen Form,
  Hochdigitieren am Ende von Welle 9): 20–21 abgefangen, 0 Stürze, Raum 4 in 446–512 s (heute 10–19, 510–570 s).
  Stellungs-Versuche (70 px vor dem Ei, nahe am Start, Paladin am Ei) brachten weniger als der halbe Weg.

## 3.1.7 – Raum 4 nach Taktik, Mail-Server-Schwelle, weiter nach der Anwesenheitskontrolle
Live Revenge Hard (28.10.): Raum 3 geschafft (325 s, alle 11 geteilten Treffer geblockt), Raum 4 verloren – Wellenphase
130 s in der Raummitte, dann Ultimate Flare 4 s nach Black Rain auf Bauzel und Fumiko.
- **Raum 4 (Armageddemon) nach der Taktik des Nutzers:** Wellen oben abfangen, Gruppe aufgeteilt – erste Hälfte nach Slot
  links, Rest rechts, jeweils auf halbem Weg zwischen Herden-Start und Ei. Sobald der Boss da ist: unten in der Mitte
  sammeln und in der unteren Raumhälfte kämpfen – wer nördlich des Bosses steht, läuft erst unten herum (Angriffsposition
  südlich, nach Slot gefächert).
- **Mail Server ignorieren ab Boss-HP unter x %** (Regler, Standard 8 %): kurz vor dem Ende direkt auf Diaboromon.
- **Anwesenheitskontrolle:** Der Bot stoppt dabei wie bisher und rührt sie nicht an – der Spieler beantwortet sie selbst.
  Neu: Hat er geantwortet (innerhalb von 10 min) und lief der Bot vorher, läuft er von selbst weiter, statt bis zum Klick zu
  stehen (live: mitten im Dungeon gestorben).
- Simulation Raum 4 (2 Läufe): beide geschafft, 0 Stürze, 0 Flare-Treffer bei 32 Ansagen, 15–19 statt 9–12 Kuramon vor dem
  Ei abgefangen. Tests challengetest; Suite 151/151.

## 3.1.6 – Key of Hope: Beanspruchung nur mit echtem Cast, kein Skill kurz vor dem Zünden
Live Revenge Hard (28.10., Fumikos Fenster): Nur Slot 0 und 1 zündeten je Key of Hope, Fumiko und Makota nie. Bei 111,5 s
beanspruchte MarcusD den Treffer, im Spiel kam kein Key-of-Hope-Cast an (Tastendruck während eines laufenden Skills
verloren), niemand sprang ein – alle fünf kassierten den geteilten Catastrophe Cannon (44 000–71 000).
- **Erst drücken, dann beanspruchen:** Wird die Taste zurückgehalten (laufender Skill, Eingabesperre), bleibt der Treffer
  offen und der nächste bereite Clavis zündet.
- **Beanspruchung muss sich bestätigen:** Nach 450 ms gilt sie nur, wenn das Spiel den Key-of-Hope-Cast des Zünders gemeldet
  hat – sonst springt der nächste Clavis ein (Reihenfolge nach Slot wie bisher).
- **Keine Skills mit Cast kurz vor fälligem Key of Hope:** Rotation, Kreisrand- und Fernangriff halten Divine Lock, Gate of
  Judgment & Co. zurück, wenn in weniger als 1,5 s (plus Castzeit) ein Key of Hope fällig ist – damit der Druck durchgeht.
- **Beim Sammeln weiter angreifen:** Wer als Nächster zündet („halte Position“) oder schon im Schutzkreis steht, schlägt
  weiter zu und nutzt Skills, solange der Boss in Schlagweite steht – ohne hinzulaufen. Vorher stand der zündende Clavis die
  ganzen 5 s der Ansage nur herum.
- Test kohclaimtest. Simulation ab 35 % (3 Läufe): alle geschafft, 0 Stürze, 15 geteilte Catastrophe Cannons und 43
  Black-Rain-Hüllen geblockt, 0 Flare-Treffer bei 49 Ansagen. Suite 150/150.

## 3.1.5 – Nach dem Rausfliegen nicht automatisch wieder hinein
- Scheitert ein Dungeon-Lauf (alle rausgeflogen), stoppt der Bot in jedem Fenster, statt bis zu dreimal automatisch neu
  zu betreten. Neustart wie gewohnt über Start im Leader-Fenster. Wer das alte Verhalten will: Haken „Nach einem
  gescheiterten Lauf automatisch neu betreten“ (Reiter Bosse → Dungeon, Standard aus).

## 3.1.4 – Dungeon: Greifarm und Mail Server trotz Warnkreisen, Digitation nach Sturz, auf alle warten
Live Revenge Hard (28.10., Bauzels Fenster) gemeldet: Greifarm nicht angegriffen, Mail Server trotz Haken nicht angegriffen,
keine Digitation im Dungeon, Gruppe rennt nach dem Betreten einzeln los.
- **Greifarm und Mail Server gehen dem Ausweichen vor:** Solange Warnkreise aktiv sind (bei Diaboromon fast immer), blieb
  der Bot im Ausweich-Zweig und behielt den Boss als Ziel – die Zielwahl des Dungeons (Arm, Brechbares) kam nie dran.
  Jetzt visiert er Greifarm/Mail Server vor dem Ausweichen an. Live hat der Arm keine Ziel-Kennung: Wer gepackt ist, wird
  über das „festgehalten“-Flag erkannt (eigenes Digimon: sofort brechen; Gruppenmitglied: mithelfen).
- **Gepackt: nicht ausweichen, nicht sammeln** – das Digimon kann ohnehin nicht laufen; es schlägt den Arm.
- **Digitation im Dungeon:** Bisher digitierte der Bot nur ohne Ziel und ohne Angreifer (an der Tür). Nach einem Sturz
  stand der Boss weiter als Ziel – keine Digitation mehr. Jetzt digitiert er im Schutzbereich zuerst, dann geht es weiter.
- **Nach dem Betreten auf alle warten:** Der Raum wird erst betreten, wenn alle Gruppenfenster auf der Dungeon-Map sind
  (höchstens 60 s), Status „warte, bis alle im Dungeon sind (n/5)“.
- Test-Boss Greifarm: 3 von 3 Armen zerschlagen (unverändert).
- **Ultimate Flare, Nachtrag zu 3.1.2:** Die nachwirkende Fächer-Zone hatte „Restzeit unbekannt“ – damit erlaubte der
  Fernangriff-Zweig („Warte außerhalb · Fernangriff: Divine Lock“) einen Skill, nach dem das Digimon dem Boss in den noch
  schwenkenden Fächer hinterherlief (Simulation Raum 4: Treffer 0,1 s nach dem Skill). Die Zone trägt jetzt die echte
  Restzeit, der Fernangriff bleibt gesperrt, solange der Schwenk läuft.
- Simulation Revenge ab 35 % Boss-HP (Mail Server, Raum 4, 3 Läufe): 3 von 3 geschafft, 0 Stürze, Ultimate Flare 0 Treffer
  bei 50 Ansagen, Mail Server in 25–35 s zerschlagen. Suite 148/148.

## 3.1.3 – Mail Server standardmäßig zerstören
- Haken „Mail Server zerstören“ ist wieder **an**. Live (28.10.) flog die Gruppe bei 14 % Boss-HP aus Raum 3, nachdem
  die Server stehen geblieben waren. Die Spieldaten erklären es: Die herumtreibenden Support-Mails werden über die
  Server „weitergeleitet“ und verstärken Diaboromon um 15 % je Mail bis ×2,5 (`forward: servers, perPct 15, maxMult 2.5`).
  Die 47 s aus der Simulation galten ohne diese Verstärkung. Mit Haken greifen alle Fenster denselben Server an.

## 3.1.2 – Ultimate Flare: Fächer wirkt nach der Ansage nach
- **Fächer bleibt nach der Ansage Gefahrenzone** (Schwenkdauer + 0,3 s, bei der Ultimate Flare 1,9 s): Die Ansage
  verschwindet, bevor der Strahl schwenkt – vorher lief der Bot in diesem Moment zurück zum Boss und stand beim Treffer
  wieder im Bogen (Simulation Raum 4: Clavis fällt 0,1 s nach „eigene Position am Boss“). Ein gewöhnlicher Strahl ohne
  Schwenk wird wie bisher sofort vergessen.
- **Simulation:** Revenge und Kera kannten den Spielbefehl „Digimon anhalten“ (partnerStop) nicht – der Bot „wartete
  außerhalb“, das Digimon lief aber weiter dem Boss hinterher in den Fächer. Das war der Hauptgrund für die vier
  gleichzeitig gefallenen Clavis in Raum 4 (nur Simulation; im Spiel gibt es den Befehl, der Test-Boss hatte ihn schon).
  Flare-Ansagen stehen jetzt im Revenge-Log.
- Ergebnis Raum 4 (Revenge Hard, 4 Clavis Lv 99 + Paladin, Live-Schaden): vorher 2 von 6 Läufen geschafft mit 4–7
  Flare-Treffern, jetzt 3 von 3 geschafft, 0 Treffer, 0 Stürze, Armageddemon in 319–336 s Kampfzeit. Schaden je
  Sekunde in der Simulation: Paladin 8 300–8 500, Clavis je 3 500–3 800 (live 3 000–3 900). Kompletter Lauf (Raum 1–4):
  geschafft, Diaboromon in 321 s (Uhr 360 s), Armageddemon in 490 s, 1 Flare-Treffer, 24× Key of Hope, 90× Sacred Seal.
- Der vorgeschlagene Seitenwechsel als Gruppe (alle auf der Gegenseite des Bosses) ist damit vorerst nicht nötig;
  bleibt als Option, falls live noch Treffer kommen.

## 3.1.1 – Skills vom Kreisrand, Mail Server gemeinsam oder gar nicht
- **Skills auch von der Angriffsposition am Kreisrand:** Stand das Digimon außerhalb eines Warnkreises und schlug von dort
  zu („Außerhalb der Warnzone · normaler Angriff ohne Annäherung“), drückte der Bot nur Taste 1 – die Skill-Rotation wurde
  in diesem Zweig nie erreicht. Live bei Diaboromon (28.10.): Paladin fast ohne Omega Blade, Fumiko die halbe Kampfzeit in
  diesem Zustand. Jetzt wirkt er dort bereite Skills, deren Reichweite vom Stand aus reicht, kein Ansturm, mit denselben
  Sperren wie im Kampf (kein langer Cast vor einer Boss-Attacke, nicht kurz vor dem Einschlag).
- **Haken „Mail Server zerstören“** (Reiter Bosse → Dungeon, Standard **aus**): Diaboromons Mail Server (ab 30 %, drei
  Stück, je 180 000 HP) bringen nur 15 s lang 25 % mehr Schaden – in der Simulation kostet das Zerschlagen 47 s mehr
  (Raum 3 in 335 s statt 288 s). Vorher griff jedes Fenster den nächstgelegenen Server an. Mit Haken greifen alle
  Fenster **denselben** an (den angeschlagensten zuerst, bei Gleichstand feste Reihenfolge), dann den nächsten, dann wieder
  den Boss. Pflicht-Brechbares wie Armageddemons Kuramon-Haufen (sein Panzer) wird unabhängig davon immer zerschlagen.
  Wandert mit in Presets.
- Live gemessen (Revenge Hard, 5 Spieler, Level 99): Diaboromon 6,99 Mio. HP; Schaden je Sekunde Bauzel 5 500–8 000,
  Clavis je 3 000–3 900, Gruppe 20 000–22 000; Sacred Seal reihum 27× in 224 s. Simulation darauf kalibriert
  (Clavis-Faktor 0,19 → 0,43): Raum 3 fällt damit in beiden Varianten, in Raum 4 fallen alle vier Clavis gleichzeitig
  durch die Ultimate Flare (offen, siehe Sammelliste). `SERVER=1` lässt die Simulation die Mail Server zerschlagen.

## 3.1.0 – Dungeon/Raid: Key of Hope immer an, Gruppenheilung reihum
- **Key of Hope immer an:** Im Dungeon-Modus und auf jeder Raid-Map ist Key of Hope aktiv, egal ob der Haken in den
  Einstellungen gesetzt ist. Anlass: Diaboromon Hard – Imperialdramon wäre fast gestorben, der Timer lief ab.
- **Gruppenheilung reihum:** Der Heilskill der Clavis (Sacred Seal, heilt Verbündete im Umkreis) läuft im Dungeon/Raid
  nicht mehr in der normalen Skill-Rotation, sondern wie Key of Hope nacheinander: Sobald das eigene Digimon oder ein
  Gruppenpartner in Reichweite unter 85 % HP fällt, zündet die Clavis mit der kleinsten Fensternummer (deren Heilung
  bereit ist), die nächste 0,6 s später, falls dann noch jemand verletzt ist. Nach einer gemeldeten Heilung warten die
  anderen 2,5 s ab, damit nicht alle gleichzeitig heilen. Die Fenster melden sich die Heilung über den Gruppenkanal
  (Nachrichtentyp `heal`). Ohne Gruppe heilt das Fenster sich selbst wie bisher.
- Revenge-Simulation: Party-Mitglieder wie im Spiel, Zähler für Sacred Seal (Anzahl und geheilte HP), `KOH_AUS=1`
  schaltet Key of Hope und alle Skill-Haken aus, um das Erzwingen zu prüfen.
- Mitläufer heilen jetzt auch: Heil-Skill und Gruppenheilung laufen vor dem Gruppen-/Autopilot-Zweig (dort kehrten
  Mitläufer mit „Gruppe: bei …“ zurück, ohne je zu heilen).
- Revenge Hard (Simulation, 4 Clavis + Imperialdramon, 6-min-Uhr): 3.0.9 Sacred Seal 72× blind in der Rotation,
  334 000 HP geheilt, 37 Tränke – 3.1.0 50× bei Bedarf, 738 000 HP, 33 Tränke; mit allen Haken aus trotzdem 11× Key of
  Hope und 50× Sacred Seal. Der Boss fällt in der Simulation in keiner Version rechtzeitig (30–35 % übrig).

## 3.0.9 – Warteplatz für Event und Weltboss
- **Warteplatz** (Reiter Bosse → „Event & Weltboss“): Wohin der Bot geht, solange kein Event und kein Weltboss fällig ist –
  im Modus „Nur Event/WB“ und wenn der Autopilot mit allen Quests fertig ist und auf Events wartet. Zum Beispiel
  **The Network**: dort wird kein Tamer-DS abgezogen. „stehen bleiben“ = dort warten, wo er gerade ist. Ist ein
  Event/Weltboss fällig, reist er von dort hin und kehrt danach zurück. Ist der Warteplatz nicht erreichbar, wartet er
  5 min lang dort, wo er ist. Die Einstellung wandert mit in Presets.

## 3.0.8 – Kleine Warnkreise: am Kreisrand weiterkämpfen
- Steht das Digimon absichtlich an der Angriffsposition knapp vor dem Kreisrand (8 px Reserve), jagt das Ausweichen es
  nicht mehr mit der vollen 28-px-Reserve gleich wieder weg (vorher: zweite Flucht 0,3 s vor dem Einschlag). Und „Ziel
  steht kurz vor dem Einschlag in der Zone“ sperrt nur noch Angriffe, für die das Digimon erst laufen müsste – steht es
  schon in Schlagweite außerhalb, schlägt es weiter. Beides nur bei Kreisen; bei Fächern und Strahlen bleibt alles wie
  bisher. Test-Boss (5 Runden): Dark Roar allein 67 → 82 % Schaden, zu dritt 41 → 75 %, weiter 0 Treffer; Kera und
  Armageddemon-Raid unverändert (der Raid streut auch mit 3.0.7 gelegentlich einen Flare-Treffer).
- Ein kürzerer Spät-Ausweich-Puffer (Latenz statt fest 1,5 s) wurde getestet und verworfen: erste Treffer in Gruppe/Raid.
- Test-Boss: `POS=1` schreibt bei jedem Statuswechsel die Positionen von Digimon, Tamer, Boss und Warnkreisen mit.

## 3.0.7 – Vorbereitung auf Adventure 3 (Tamers)
Die Tamers-Daten (21 Maps Lv 99–130, 6 Raids, 109 Quests, Megidramon als Weltboss) sind schon im Spiel, aber noch
nicht freigeschaltet. Damit der Bot beim Freischalten nicht ins Leere läuft:
- **Map-Zugriff:** Eine Map mit Einstiegsquest (alle A02-/Tamers-Maps) zählt erst, wenn diese Quest angenommen oder
  erledigt ist – für 🌍 Weltboss, Named-Runde, Lern-Route, Map-für-Map-Runde und die Quest-Planung. Reisen dorthin
  gibt „Keine Route“ mit Hinweis statt zu scheitern. Der Weltboss-Knopf nimmt zusätzlich nur Bosse bis 15 Level
  (bzw. Level-Unterschied) über dem Digimon – kein Megidramon Lv 120 für ein Lv-94-Team.
- **Serie 3:** Tamers-Quests (`a3_…`) gelten als eigene Serie (werden nur auf Tamers-Maps angeboten), die Map-Liste zeigt
  „A3“, der Quest-Reiter gruppiert nach Adventure / Adventure 02 / Tamers.
- **Reaper:** Ist die eingestellte Zielform auf einer Map blockiert (Reaper – DNA/Super-Ultimate), digitiert der Bot
  zur höchsten freien Form statt in der Grundform zu bleiben; „höchstmögliche Digitation“ überspringt blockierte Äste.
- Geprüft, keine Änderung nötig: Level bis 130 (keine 99-Grenzen im Code), Quest-Ziel „reach“ wird gefahren;
  „evolve“ und „hatch“ bleiben „nicht automatisch“ (2 bzw. 1 Quest in Tamers).
- **Tanken:** Hinrichtung (execute), Heranziehen (pull), Stolpern (trip), Explosion (detonate) und Aussaugen (drain)
  werden nie getankt.
- **Test-Boss Stufe 3** (`NUR=stufe3`): Ocean Wave (Ring + Heranziehen), Dark Recital (Strahl + Stolpern), Dark Roar und
  Gigastick Lance (Hinrichtung), Cherry Field (saugt HP). Ergebnis: alles ausgewichen, 0 Stürze, 0 Hinrichtungen; Dark
  Roar (3 s Ansage, 40 px) kostet aber ~60 % Schaden – der Bot verlässt den kleinen Kreis zu früh.

## 3.0.6 – Kill-Quest: normale Monster vor dem Boss, kein Stehenbleiben neben der Beute
- **Behoben (live, Destiny Lake):** Bei „besiege Tortomon“ lief der Autopilot zum named Tortomon („sichtbaren Boss
  bekämpfen“, 550 px, Weg blockiert) und stand danach 77 s neben einem normalen Tortomon, ohne anzugreifen – die
  3.0.2-Regel „unterwegs zum Boss nicht kämpfen“ griff auch für diese Aufgabe, deren Zielpunkt nur ein Schnappschuss
  des Bosses ist. Jetzt gilt die Regel dort nicht mehr, und ein Boss wird nur bevorzugt, wenn kein normales Monster
  derselben Art in Sicht ist.
- Log: Phase 4 der Map-Runde heißt „Reste anderer Maps“ statt „undefined“; Teilziel-Meldung nennt jede Art nur einmal.

## 3.0.5 – Event-Digitation, Neustart nach Not-Aus, Greifarm, Ausweichen bei Sondermechaniken
- **Event/Weltboss: Digitation in jedem Modus.** Vor Reise, Warten und erstem Angriff digitiert der Bot in die Kampfform
  (Lernrouten-Regel bzw. Quest-Digitation, sonst die höchste Form) – auch beim Grinden und im Modus „Nur Event/WB“ und
  auch, wenn der Autopilot gerade keine Jagd-Aufgabe hat. Vorher kämpfte er beim Event/Weltboss oft in der Grundform.
- **Nach dem Not-Aus alle gemeinsam starten:** Esc oder der Not-Aus-Knopf in irgendeinem Fenster sperrt weiter alle
  Fenster. Ein Klick auf ▶ Start im Leader-Fenster hebt die Sperre jetzt bei allen auf (nur ein echter Klick – kein
  automatischer Start). Die Meldung sagt, ob der Stopp per Esc oder Knopf aus einem anderen Fenster kam.
- **Greifarm (Tentacle Bug, Creep Hands):** Ist das Digimon gepackt, sind Angriff und Skills auf den Arm erlaubt und
  werden nicht mehr zurückgehalten (vorher „Partner festgehalten“: 10+ s keine Eingabe, zwei Drittel der HP ausgesaugt –
  live in Revenge). In der Gruppe greifen die anderen einen Arm, der ein Mitglied hält, mit an (der Gepackte macht laut
  Spieldaten nur halben Schaden am eigenen Arm). Test-Boss mit erzwungenem Griff: vorher 15 s festgehalten, Arm nie
  zerschlagen; jetzt allein nach ~13 s zerschlagen, zu dritt nach 3–4 s.
- **Kleiner Ring mit sicherem Innenkreis (Endless Surge, Rengokusou):** im Innenkreis reichen 4 px Reserve – das Digimon
  bleibt am Boss statt aus dem Ring hinauszulaufen.
- **Schmaler Strahl/Ansturm (Trinity Arm, Behemoth, Súkara, Vimohana):** Sicherheitsabstand schrumpft mit der Breite
  (10 px breit → 12 px statt 28/42), und „Ziel steht in der Gefahr“ misst die Angriffsposition seitlich statt den Boss am
  Linienanfang – kein 1,2-s-Angriffsstopp mehr bei jedem Folge-Stoß.
- **Lade-Ring (Corona Sanctions):** drinbleiben und draufhauen, solange die HP den Treffer überstehen (die Ladung bricht
  durch Schaden) – statt 10 s aus dem 400-px-Kreis zu fliehen.
- **Simulationen:** Revenge- und Test-Boss-Probelauf setzen beim Packen jetzt das Held-Flag wie das Spiel und rechnen
  den halben Eigenschaden am Arm; `GREIF=1` erzwingt im Test-Boss das Packen.
- **Test-Boss (Stufe 2 – Sondermechaniken):** `sim/testboss.js` wirkt jetzt auch Fächer (Reaper), verstreute Kreise in
  Wellen (Terrible Gaze), liegenbleibende Fallen (Banana Slip), Inseln (Kouen), Deckung hinter Platten (Ultimate Flare),
  geteilten Treffer (D-Reaper Zone + Pendulum Feet), Markierung (Tekken Seisai), Lade-Ring (Corona Sanctions) und
  Greifarm (Creep Hands) – mit echten Werten aus den Spieldaten. Neue Spalte „Extra“ (z. B. gebrochen, gepackt, geschützt).
  `NUR=stufe1` / `NUR=stufe2` wählt eine Stufe. Annahmen zum Server-Verhalten stehen im Dateikopf.

## 3.0.4 – Modus „Nur Event/Weltboss“, hinter den Boss bei Fächern
- **Neuer Modus „Nur Event/WB“:** Der Bot tut nichts anderes, als auf das Event (Mega-Jagd) und die Weltbosse zu
  warten – keine Monster suchen, nicht grinden, keine Lern-Route. Ist eins fällig, reist er hin und kämpft, danach
  wartet er wieder. Beim Wählen des Modus werden 🎯 Event und 🌍 Weltboss eingeschaltet.
- **Fächer (Ultimate Flare, Reaper, Bao Bang Sweep …): hinter den Boss statt weit weg.** Neben einem Fächer zählt jetzt
  der Winkel (25° gelten als voller Sicherheitsabstand) statt nur der Abstand zur Spitze. Der Platz direkt hinter dem
  Boss ist damit frei, auch dicht dran, und das Digimon schlägt von dort weiter zu. Test-Boss (5 Runden): Reaper
  allein 69 → 88 % Schaden, zu dritt 51 → 78 %; Ultimate Flare allein 2 → 0 Treffer, zu dritt 70 → 88 % Schaden;
  Armageddemon-Raid weiter ohne Treffer.

## 3.0.3 – Map für Map: pro Map abgeben, längeres Log
- **Abgeben pro Map:** In der Map-für-Map-Runde mit „erst alles erledigen, dann abgeben“ halten nur noch offene Ziele
  von Quests der aktuellen Runden-Map die Abgaben auf. Vorher blockierte jede offene Quest irgendwo (z. B. eine
  liegengebliebene von drei Maps vorher oder eine Bounty) alle Abgaben – fertige Quests sammelten sich über mehrere
  Maps an. Jetzt: annehmen → Ziele dieser Map → hier abgeben → Reste anderer Maps → nächste Map.
- **Längeres Log:** Das Protokoll hält jetzt 2 000 statt 300 Einträge (300 reichten keine 10 Minuten).

## 3.0.2 – Kein Stopp mehr an der Wand, Test-Boss
- **„Alles nicht erreichbar“ behoben:** Stand der Tamer nach einem Kampf dicht an einer Wand (unter 7 px), fiel jede
  Laufprüfung schon am Startpunkt durch – der Bot übersprang im Sekundentakt jede Aufgabe als „nicht erreichbar“ und
  stoppte mit „keine machbaren Quests mehr“ (live in The Kaiser's Fortress). Jetzt:
  - Von einer Wand weggehen ist erlaubt (der Abstand wächst erst vom Startpunkt aus an; in die Wand hinein bleibt verboten).
  - Steht der Tamer auf einem blockierten Feld, geht er zuerst auf freien Boden („Stehe an einer Wand …“ im Log).
  - Sicherheitsgurt: drei Ziele in 15 s „nicht erreichbar“ gelten als Standortproblem – freier Boden, Ziele wieder
    freigeben und neu versuchen statt stoppen (höchstens 2× in 10 min, danach wie bisher).
- **Quest-Bosse wie die Boss-Rotation:** Auf dem Weg zu einem Quest-Boss (Bounty u. a.) kämpft der Autopilot nicht mehr
  gegen Verfolger, sondern läuft weiter zum Spawnpunkt. Dort (ab 200 px, wieder „unterwegs“ ab 350 px) erledigt er sie,
  solange der Boss fehlt; ist der Boss da, wird er bekämpft. Nur bei mindestens halben HP – sonst erst zu Ende kämpfen.
- **Test-Boss (Stufe 1):** `node sim/testboss.js` – eine Arena mit einem Boss, der jede Grundform einer Boss-Attacke
  mit echten Spielwerten wirkt (Warnkreis, tankbarer Kreis, Kreis um den Boss, zwei Ringe mit sicherem Innenkreis,
  Strahl, Ansturm mit Folge-Stößen, vier Bahnen, Spiegel, Zurück-Digitieren, Kreis auf jedem Spieler, raumweiter Kreis).
  Ausgabe je Attacke: getroffen, getankt, ausgewichen, unnötig gelaufen und wie viel Schaden am Boss verloren ging.
  `GRUPPE`, `RUNDEN`, `NUR`, `TEMPO` wie bei den anderen Probeläufen.

## 3.0.1 – Presets, Boss-Quests ohne Leerlauf
- **Presets:** 💾 Preset speichern legt alle Bot-Einstellungen unter einem Namen als `.txt` ab, 📂 Preset laden holt
  sie zurück. Accounts, Benutzernamen und Passwörter kommen nie hinein, Panel-Ansicht und Rundenfortschritt auch nicht.
- **Kein langes Warten am Boss mehr:** Braucht ein Quest-Boss nach der Anreise noch über 90 s bis zum Respawn, erledigt
  der Autopilot erst die anderen Ziele (Jagen, Annehmen, Abgeben) und kommt danach zurück. Wartet er schon am Boss,
  plant er entsprechend um. Grinden verdrängt keinen Boss.
- **Normale Monster sind keine Bosse mehr:** Teilt ein named Boss die Art mit normalen Monstern (z. B. Divermon Captain
  und Divermon in Spiral Sea), gilt nur noch das Monster mit Boss-Markierung als Boss. Normale Divermon werden wieder
  direkt angegriffen statt mit dem vorsichtigen Boss-Anmarsch.
- Für normale Kill-Ziele wählt der Autopilot eine normale Spawn-Zone statt des Boss-Spawnpunkts derselben Art.

## 3.0.0 – Neue Basis: CDigi, mit Fixes
DigiBot baut jetzt auf **CDigi 1.0.34** auf (Fork von 2.54.0 durch einen Freund). Name, Einstellungen und Update-Weg
bleiben gleich.

**Neu aus CDigi**
- Passwörter werden nie gespeichert; Not-Aus (Knopf und Esc); Sicherheitsstopp bei Verbindungsabbruch, hängendem
  Map-/Kanalwechsel und Anwesenheitskontrolle (die beantwortest du selbst); Diagnose-Export.
- Tamer-Skills automatisch, in der Gruppe abgestimmt.
- Digitation: Warp und DNA/Jogress mit Partner, Hinweise zu Dark Tower und Reaper; der Autopilot nutzt die
  Digitationsregeln der Lern-Route.
- Weltboss-Warnung je Boss, Boss-Timer nur bestätigt, Tastendrücke nur, wenn das Digimon nicht castet/digitiert/
  festgehalten wird, Ausweichen mit gemessenem Ping, robusteres Kartenladen, geprüfte Gruppennachrichten.
- Autopilot standardmäßig „erst alles erledigen, dann gemeinsam abgeben“, Tagesquests aus der Ferne annehmen,
  Quest-Runde über mehrere Accounts, Fenster-Anordnung für die Gruppe.
- Viele Feinarbeiten an Laufwegen (nur geprüfte Abschnitte, Wegfindung des Spiels, sichere Annäherung an Bosse).

**Behoben (gefunden mit der DigiBot-Testsuite)**
- Angreifer werden am Boss-Spawn abgewehrt, solange der Boss nicht da ist (Lern-Route, Boss-Quest, Rotation) – vorher
  schlug der Bot beim Warten nicht zurück. Ist der Boss da, hat er Vorrang.
- Nach einem Kanalwechsel, der nicht durchging, griff der Bot bis zu 30 s gar nicht an.
- Große, lange angesagte Warnkreise: kein sofortiges Weglaufen mehr, auch ohne Ziel; ein begonnener Lauf wird
  abgebrochen, wenn noch viel Zeit bleibt.
- Boss knapp im Warnkreis wird von draußen mit der 1 angegriffen; Fernangriffe auch, wenn die Restzeit unbekannt ist
  (das Digimon bleibt danach draußen).
- Batch-Modus: nach dem Abgeben wieder alle Quests beim NPC annehmen, beim selben NPC alles in einem Besuch; eine
  bewusst ausgeschaltete Einstellung wird nicht mehr überschrieben.
- „Höchstmögliche Digitation“: DNA-Linie zuerst (mit Partner), Armor nie vor der normalen Linie.
- Wer knapp neben einem Portal ankam, fand keinen Weg mehr.
- Spiegeln brach mit einem Fehler ab (fehlende Konstante).
- „Gruppe stoppen“ sperrte die Fenster – danach startete „Start“ die anderen nicht mehr. (Der Not-Aus sperrt weiter.)
- Einladung über den Knopf im Mitläufer-Fenster ging bei ausgeschaltetem Bot nicht raus.
- Aufräumen vor dem Kanalwechsel nur bei höchstens 2 Angreifern und höchstens 10 s (nur Taste 1), sonst gleich
  wechseln – vorher konnte der Bot in dichten Zonen nie wechseln.

**Aus DigiBot 2.55 übernommen**
- Event und Weltboss: unterwegs nicht kämpfen, am Spawnpunkt nur abwehren.
- Boss-Sieg nur mit Beleg; verschwindet er mit viel HP, sucht der Bot an der letzten Position und am Spawnpunkt.
- Weltboss-Warnung macht Kanäle ohne Timer fällig – jetzt nur für den Boss aus der Warnung.

**Geändert gegenüber CDigi**
- Gruppenplätze am Boss sind fest je Fenster, ohne Zufall und ohne künstliche Aufbruch-Verzögerung.

**Tests:** Testwelten mit Bewegungsraster, Verbindungsstatus und neuem Gruppenformat (`tests/groupbus.js`); neu
`dnaprio`, `nopasstest`; `logintest`/`profiletest` entfernt (Auto-Login und Profile je Account gibt es nicht mehr).

## 2.55.0 – Weltboss/Event: Kanal halten, Sieg nur mit Beleg, unterwegs nicht kämpfen
- **Weltboss:** solange der Boss auf dem aktuellen Kanal lebt, gekämpft oder gesucht wird, bleibt der Kanal das Ziel – kein Wechsel mitten im Kampf, auch wenn der andere Kanal gleichzeitig fällig ist.
- **Sieg nur mit Beleg** (Weltboss und Boss-Rotation): ein Boss gilt nur als besiegt, wenn er zuletzt bei höchstens 15 % HP war, das Ziel 0 HP zeigt oder er tot daliegt. Verschwindet er mit mehr HP, ist er „vermisst“: der Bot sucht an der letzten Position, dann am Spawnpunkt; erst nach 20 s ohne ihn gilt er als besiegt (Timer 5 min, der nächste Boss-Timer korrigiert).
- **Event und Weltboss unterwegs** (Reise, Kanalwechsel, zum Spawnpunkt, Suche): Angreifer nicht bekämpfen – Digimon zurückrufen und weiterlaufen, wie in der Boss-Rotation. **Beim Warten am Spawnpunkt** nur Angreifer abwehren, nichts Neues anfangen.

## 2.54.0 – Weltboss-Knopf, Event-Boss ohne Sperre
- **🌍 Weltboss** (neuer Knopf neben 🎯 Event, in jedem Modus): Weltbosse aus den Spieldaten (z. B. BlackWarGreymon) spawnen auf Kanal 1 und 2 mit eigenem Timer. Lebt er oder spawnt er in den nächsten 6 min, reist der Bot hin, wechselt den Kanal, wartet am Spawnpunkt und kämpft – zuerst der Kanal, der zuerst spawnt (gleichzeitig: Kanal 1), danach der andere. Die Chat-Warnung (5 min vorher) zählt auch, wenn der Kanal-Timer noch unbekannt ist. Das Event geht vor; danach weiter wie vorher.
- **Event: nächstes Event angesagt, alter Boss lebt noch:** erst den lebenden Boss besiegen, dann reisen.
- **Event-/Weltboss nimmt keinen Schaden** (Schutzphase): nicht mehr 1 min sperren – weiter mit Taste 1, Skills erst, wenn er wieder HP verliert.

## 2.53.1 – Event-Boss bleibt Vorrang
- **Fenster vorbei, Boss lebt noch:** der Bot kämpft weiter (höchstens 10 min), statt mitten im Kampf zur Route, Rotation oder Abgabe zu wechseln.
- **Boss kurz nicht angreifbar oder gesperrt** (z. B. Formwechsel): das Event behält 5 s lang Vorrang – der Bot wartet beim Boss, statt zur Abgabe zu laufen.
- **Zielwahl:** der Event-Boss steht in der Zielwahl ganz oben; nach dem Anvisieren wird sofort mit dem neuen Ziel weitergemacht.

## 2.53.0 – Code-Review: 16 Fehler behoben
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

## 2.52.4 – Feld-Adds nur, wenn sie wirklich gerufen wurden
- Ein Monster der Add-Art zählt erst als Add, wenn es nach dem Unterschreiten der HP-Schwelle des Bosses erschienen ist, das Add-Level aus den Spieldaten hat und am Boss oder an einem Add-Spawnpunkt steht – live griff der Bot bei Puppetmon (Spiral Forest) alle umstehenden normalen Pumpkinmon an. Raids wie bisher.

## 2.52.3 – Event-Boss auch im Autopilot und in der Boss-Rotation angreifen
- Ist der Jagd-Boss (🎯 Event) in Sicht, kämpft der Bot jetzt auch dann, wenn der Autopilot gerade zur Abgabe will oder die Boss-Rotation zum nächsten Boss woanders – vorher stand er „friedlich“ vor dem Event-Boss, bis die Abgabe erledigt war.

## 2.52.2 – Dailies: nur der passende Level-Pool
- Daily-Pools sind Level-Bereiche (z. B. forest 11–12, spiral_low 41–48). Der Autopilot nimmt nur noch den Pool, dessen Bereich zum Level passt (und zur Serie der Welt) – vorher lief er mit Lv 45 für jeden niedrigeren Pool erneut zu Elecmon („keine Dailies angeboten“, alle 3 s).
- Bietet ein NPC keine Dailies an, gelten alle seine Pools für dieses Digimon als erledigt.

## 2.52.1 – Lern-Route plant nach einem Digimon-Wechsel neu
- Wechselt man das Digimon, verwirft die Lern-Route alles, was fürs alte geplant war (Zone, gewählter Feldboss, Kanal-Timer, Digitations-Fehlversuche) und plant sofort für das neue – live wollte ein Lv-43-Digimon noch den Boss bzw. die Golemon Lv 70+ des alten besiegen.
- Unterwegs werden Angreifer, die mehr als 15 Level über dem Digimon liegen (keine Bosse), nicht bekämpft: Digimon zurückrufen und weiter zur passenden Zone.

## 2.52.0 – Eigenständige Verbesserungen: schneller zurück, Skills sparen, sicherer an Bossen
- Bewusstlos: „Zurück zum Lager“, sobald das Spiel es erlaubt – statt auf die automatische Rückkehr zu warten.
- Angreifer ohne Weg (z. B. Fernkämpfer jenseits des Wassers) werden nicht mehr „abgewehrt“ – das Digimon kommt nicht hin; vorher stand der Bot bis zur Hängen-Erkennung (12 s) still und blockierte Lern-Route/Autopilot. Ein gewähltes Ziel ohne Weg wird fallen gelassen (außer Boss-/Leader-Fokus und Adds).
- Normale Monster, die ohnehin gleich fallen (Rest-HP unter ~0,6 s des eigenen Schadens), bekommen keine Skills mehr – spart DS und DS-Tränke. Bosse, Elites und zähe Monster wie bisher.
- Lern-Route: auf dem Weg zum Feldboss und am Spawnpunkt mit F1/F2 auf 70 % HP bzw. 40 % DS auffüllen, auch wenn die normale Trank-Schwelle aus ist (live: Mummymon +15 bei 55 % HP begonnen).
- Lern-Route: ein Feldboss, der das Digimon umgehauen hat, bleibt 30 min aus der Boss-Runde (keine Level-Grenze – aber aus Erfahrung lernen).
- Lern-Route: Suchpunkte in der Zone nur dort, wo man hinkommt – liegt ein Teich in der Zone, läuft der Bot nicht mehr ins Wasser.

## 2.51.0 – Zielwahl nach Weglänge (Seen, Schluchten, Wände)
- Die Zielwahl rechnet mit der Weglänge des Digimons statt der Luftlinie: Dijkstra über das Kollisionsraster der Map (8 Richtungen, diagonal nur ohne Ecke – wie die Wegfindung des Spiels). Der Suchradius gilt für den Weg; ein Monster jenseits eines Sees, dessen Weg außen herum länger ist als der Radius, wird nicht mehr gewählt, sondern das erreichbare.
- Monster ohne Weg (Insel, andere Seite einer Klippe ohne Übergang – getrennte begehbare Bereiche wie im Spiel) werden nie als Ziel genommen; auch der Autopilot läuft nicht mehr zu ihnen. Angreifer werden weiter abgewehrt.
- „Nächstes Monster“ heißt jetzt das nächste zu Fuß. Die Rechnung kostet unter 1 ms und läuft nur, wenn das Digimon ein neues Feld betritt. Ausweichen bleibt wie bisher.

## 2.50.0 – Option „Quests nur erledigen, nicht abgeben“, Fehler aus der Code-Durchsicht
- Autopilot-Einstellung „Quests nur erledigen, nicht abgeben“: der Autopilot nimmt Quests an und erledigt die Ziele, fertige Quests bleiben aber stehen – abgeben macht man selbst. Der Knopf „📜 Abgeben & Annehmen (diese Map)“ gibt weiterhin ab; Mitläufer machen Abgaben des Leaders mit dieser Option nicht nach. Ist alles erledigt, sagt der Bot beim Stoppen, wie viele Quests fertig zum Abgeben sind.
- Boss-Rotation und Named-Elite-Runde erkennen Named Elites jetzt an den Werten (erhöhte HP, Boss-Flag) wie die Lern-Route – vorher galten normale Monster gleicher Art und Stufe als Ziel (z. B. jeder Tyrannomon in Harvest Hills), und der Bot griff sie an, während er auf den Named Elite wartete.
- Lern-Route am Spawnpunkt: die Suchzeit (20 s) zählt erst ab dem Respawn – nach frühem Ankommen gab der Bot sonst genau zum Respawn auf.
- Channel-Checker wechselt nicht mehr weg, solange die Lern-Route einen Boss im Blick hat.
- „Feldbosse mitnehmen“ an/aus und geänderte Kanäle bewerten die Lern-Route sofort neu.
- EXP/Min: ein Partner-Wechsel zählt nicht mehr als EXP-Gewinn. EXP-Messung begrenzt ihren Speicher. Tooltip „Nächste Map“ ohne rohe Zeilenumbrüche im Quelltext.

## 2.49.1 – Digitation in der Lern-Route, Adds erst ab Boss-HP-Schwelle
- Die Lern-Route digitiert jetzt auch auf dem Weg zum Boss und im Kampf (Befehl geht raus, der Kampf läuft weiter) – live blieb ClavisAngemon 12 min Angemon, weil zwischen Bossen und Angreifern nie „zwischen den Kämpfen“ war.
- Fehlversuche beim Digitieren werden nach jedem gelungenen Schritt neu gezählt – vorher galt nach fünf gelungenen Schritten (z. B. Patamon → … → Seraphimon, zurück, Angemon) der nächste als „klappt nicht“.
- Feld-Adds zählen erst, wenn der Boss die HP-Schwelle aus den Spieldaten erreicht hat (atHp), und nur nahe am Boss – live galt in Tower Forest jeder Golemon als Add von Arukenimon, der sie erst ab 50 % ruft.

## 2.49.0 – Lern-Route: Digitation je nach Map (mit / ohne Dark Tower)
- Unter „Lern-Route: zwischen den Kämpfen digitieren“ (Reiter Kampf) zwei Auswahlen: „Form ohne Dark Tower“ (Standard: höchstmögliche Digitation) und „Form mit Dark Tower“ (Standard: höchste freie Armor-Form – unter Kaisers Dark Towers klappt nur Armor). Möglich sind jeweils „keine“, „höchstmögliche“, „höchste Armor-Form“ oder eine bestimmte Form.
- Liegt die Zielform auf einem anderen Ast (z. B. Mega → Armor beim Betreten von Harvest Hills, Kaiser's Canyon, Sunset Bay, Kaiser's Fortress oder Tower Forest), digitiert der Bot erst zurück in die Grundform und dann hoch. Aus einer Armor-Form sucht „höchstmögliche“ von der Grundform aus.

## 2.48.2 – Lern-Route: Boss-Wege live nachgebessert
- Beim Warten am Spawnpunkt wehrt der Bot Angreifer ab (live: HP 99 → 55 % bis Mummymon kam, ohne zurückzuschlagen). Auf dem Weg dorthin bleibt es beim Durchlaufen.
- Kanalliste nur für die aktuelle Map: kurz nach einem Map-Wechsel kam live noch die Liste der alten Map, deren Raum-ID für „Ch 2“ brachte den Bot zurück auf die alte Map.
- Kanäle mit bekanntem Boss-Zustand (gerade besiegt, Boss-Timer der Karte) werden nicht mehr eigens angesehen (spart je 7 s).
- Reisezeit je Map-Wechsel wird auf den Wegen zu Bossen gemessen (gleitend, anfangs 30 s statt 45 s) und für Abfahrt und Bewertung benutzt – live 8–15 s, der Bot stand vorher ~30 s zu früh am Spawnpunkt.

## 2.48.1 – Lern-Route rechnet Feldbosse ein, „Nächste Map“ zeigt den echten Wechsel
- Die Lern-Route bewertet jede Map mit Grinden plus den Feldbossen ihrer Rotation (die Map und bis zu zwei darunter, höchstens 2 Level unter dem Digimon): EXP je Respawn auf allen erlaubten Kanälen, abzüglich Kampf, Weg, Kanalwechsel und Reise (30 s je Map-Wechsel). Live geprüft: Lv 48 in Sunset Bay ≈ 19 800 EXP/min geschätzt, gemessen ≈ 20 000.
- „Nächste Map“ zeigt das Level, ab dem die Lern-Route wirklich wechselt (beste Zone dort mindestens 15 % besser als hier, mit Bossen), statt der einfachen Level-Grenze. Tooltip: beide Raten bei diesem Level.

## 2.48.0 – Lern-Route: Bosse zwei Maps tiefer, schneller Kanalwechsel, Event-Fix
- Feldbosse auch zwei Maps tiefer (gleiche Regel: höchstens 2 Level unter dem Digimon). Gerechnet: direkt nach dem Map-Wechsel (Lv 41 in Sunset Bay + Drimogemon) +14…18 % EXP/min, nach ~6 Level nichts mehr – etwa 3–5 min gespart je Map.
- Kanalwechsel zum nächsten Boss gleich nach dem Sieg, auch wenn gerade ein Monster angreift (wie in der Boss-Rotation). Fehlversuche beim Kanalwechsel werden je neuem Ziel neu gezählt – vorher galt nach drei gelungenen Wechseln der vierte als „klappt nicht“ und Ch 2 wurde 5 min gemieden, obwohl dort der Boss lebte.
- Event (Mega-Jagd): Ist der Jagd-Boss auf der Map, funkt die Lern-Route nicht mehr dazwischen (live bei Regalecusmon: Bot pendelte zwischen „suche“ und „reise zu Sunset Bay“).

## 2.47.1 – EXP je Monster über alle Maps
- „Sitzung: EXP je Monster“ zählt jetzt über alle Maps der Sitzung statt nur der aktuellen. Maus über eine Zeile zeigt zusätzlich, auf welchen Maps die Kills waren.

## 2.47.0 – Übersicht: EXP je Monster
- Neuer Abschnitt „Sitzung: EXP je Monster (diese Map)“: je Monsterart der aktuellen Map die eigenen Kills, die EXP zusammen und der Anteil – nur Arten, die schon EXP gebracht haben. Maus über eine Zeile zeigt Ø EXP je Kill. Eigener ↺-Knopf setzt nur diese Liste zurück; ↺ bei den Sitzungswerten leert sie mit.

## 2.46.0 – Lern-Route: Feldboss der Map darunter mitnehmen
- Die Boss-Runde der Lern-Route nimmt auch die Feldbosse der Map darunter mit (gleiche Serie, nächstniedrigeres Monster-Level), solange der Boss höchstens 2 Level unter dem Digimon liegt. Reisezeit wird eingerechnet (45 s je Map-Wechsel): der Bot fährt los, wenn der Boss lebt oder bis zur Ankunft spawnt, liest dort die Timer der Kanäle und kehrt danach zur Lern-Zone zurück.
- Gerechnet (Lv 40 in Kaiser's Canyon, MetalGreymon Ch 1+2, dazu Drimogemon Ch 1+2): ≈ +32 % EXP/min bei Lv 40, +19 % bei Lv 44, ab Boss-Level +2 kaum noch.
- Boss-EXP gemessen: Basis × Level^1,1 × 1,5 bei +5…+8, darüber −0,0365 je Level.

## 2.45.2 – Lern-Route: auf dem Weg zum Feldboss keine Kämpfe
- Auf dem Weg zum Feldboss kämpft der Bot nicht mehr, auch nicht gegen Angreifer: Digimon zurückrufen und weiterlaufen (live: unterwegs zu MetalGreymon (Virus) Guardromon angegriffen). Ohne Boss-Ziel werden Angreifer wie bisher abgewehrt.

## 2.45.1 – Lern-Route: Feldboss erst 10 s vor dem Spawn, Ch 2 öffnen
- Zum Feldboss läuft der Bot erst, wenn er lebt oder höchstens noch 10 s bis zum Respawn fehlen (vorher 30 s).
- Ist Ch 2 unter „Kanäle“ erlaubt, aber noch nicht offen, öffnet der Bot ihn selbst, um den Boss-Timer dort zu lesen und den Boss mitzunehmen (live: nur Ch 1 offen, Ch 2 wurde nie angesehen).

## 2.45.0 – Übersicht: „Nächste Map“ mit Restzeit
- Unter den Kacheln der Übersicht steht die nächste Map der Serie (die mit dem nächsthöheren niedrigsten Monster-Level), ab welchem Level sie in der Level-Grenze liegt und wie lange es bei der aktuellen EXP/min (Schnitt der letzten 5 min) bis dahin noch dauert. Tooltip: EXP bis dahin.
- EXP-Kurve des Digimons gemessen: 40·L^1,8 + 20, ab Lv 26 × (1 + 0,5·(L − 25)^0,6).

## 2.44.6 – Lern-Route: immer die untersten beiden Stufen der Zone
- Liegt das niedrigste Monster der Zone an der Level-Grenze, sind trotzdem ihre untersten beiden Stufen erlaubt (z. B. Lv 32 mit +8 in Harvest Hills: Lv 40 und 41), höchstens +12 – vorher nur Lv 40, und der Bot suchte lange.

## 2.44.5 – Lern-Route ohne Named Elites, weniger Umwege
- Named Elites gehören nicht mehr zur Boss-Runde der Lern-Route (kaum mehr EXP als ein normales Monster), nur echte Feldbosse.
- Außerhalb der Zone werden sichtbare passende Monster weiter bekämpft; ohne Ziel läuft der Bot nur bis an den nächsten Punkt der Zone statt zur Mitte (live: nach jedem Kampf am Rand zur Mitte und wieder hinaus).

## 2.44.4 – Weg zum Feldboss nicht mehr durch neue Kämpfe unterbrochen
- Ist ein Feldboss der Lern-Map lebendig, läuft der Bot direkt hin und fängt unterwegs keine neuen Kämpfe mit normalen Monstern an (live wurde der Weg bei jedem Monster am Rand abgebrochen). Angreifer werden weiter abgewehrt.

## 2.44.3 – Feldbosse unabhängig von der Level-Grenze
- Die Lern-Route nimmt Feldbosse und Named Elites der Map jetzt unabhängig von der Level-Grenze mit. Live in Harvest Hills lagen Tyrannomon (Lv 44) und Drimogemon (Lv 45) für Lv 30 über +8 und wurden ausgelassen, obwohl sie lebten.
- `levelbosstest` prüft auch einen Boss über der Grenze.

## 2.44.2 – Lern-Route sucht in der Zone
- Bei Zonen über der Level-Grenze gilt jetzt der ganze niedrigste Level-Bereich der Zone als erlaubt, z. B. Lv 40–41 in Harvest Hills / Felder, höchstens +12. Bisher war es nur das einzelne niedrigste Level, und ab Lv 30 stand davon oft keins im Suchradius.
- Steht in der Zone nichts Passendes im Suchradius, läuft der Bot zu einem anderen Punkt der Zone, statt zu warten. Status: „suche Monster in …“.
- `levelroutetest` prüft das jetzt mit.

## 2.44.1 – Lern-Route rechnet mit dem gemessenen Schaden
- Der Bot misst seinen eigenen Schaden je Sekunde laufend selbst, je Digimon-Form und gleitend über die letzten ~10 Kills. Die Lern-Route rechnet damit, sobald 5 Kills gemessen sind. Vorher nimmt sie die Schätzung (1,55 × AT je Angriff).
- Grund: Live lag die Schätzung für Shurimon gegen +11-Gegner 25 % zu hoch (4 015 statt 3 066/s). Die EXP-Formel stimmte dagegen exakt (557 EXP je Kill).

## 2.44.0 – Lern-Route über die Level-Grenze, wenn es sich lohnt
- Liegt eine Zone ganz über der Level-Grenze (z. B. +8), rechnet die Lern-Route sie mit ihren **niedrigsten Monstern** durch, bis höchstens +12. Bringt das mehr EXP/min als die beste Zone innerhalb der Grenze, geht der Bot dorthin und erlaubt dort genau bis zum niedrigsten Monster-Level der Zone. Durch die EXP-Priorität nimmt er dann die niedrigsten zuerst, höhere lässt er stehen. Bosse bleiben an der normalen Grenze.
- Beispiel Shurimon Lv 29: Harvest Hills / Felder ab +11 ≈ 6 330 EXP/min gegenüber Digi-Egg Valley / Grabungsstelle mit +5 bis +8 ≈ 4 860 EXP/min.
- Die aktuelle Zone wird bei jeder Neuberechnung (alle 30 s, bei Level-Up und sofort beim Verstellen der Level-Grenze) neu bewertet. Bringt sie nichts mehr, wechselt der Bot ohne die 3-Minuten-Wartezeit.
- Im Log steht dann „nur die niedrigsten ab +11“.

## 2.43.2 – Named Elites richtig erkennen
- Live in Harvest Hills: Der Named Elite Tyrannomon („The Kaiser's Overseer“, Lv 44) läuft zwischen vielen normalen Tyrannomon derselben Art und desselben Levels herum. Bisher galt jeder davon als dieser Boss, und der Bot meldete alle 15–20 s „Boss besiegt“.
- Jetzt gilt: Hat der Boss-Eintrag einen Werte-Multiplikator (`statMult`, hier 2,06), zählt nur ein Monster mit entsprechend erhöhten HP als Boss. Echte Bosse mit Boss-Flag zählen wie bisher. Das gilt auch für die Boss-Rotation und die Named-Elite-Runde.
- Unter den Dark Towers des Kaisers geht nur Armor-Digitation. Die Lern-Route digitiert dort deshalb z. B. zu Shurimon statt zu Aquilamon.
- Neuer Test `namedmatchtest`.

## 2.43.1 – Lern-Route digitiert
- Neuer Haken **„Lern-Route: zwischen den Kämpfen in die höchstmögliche Digitation“** (an). Nach dem Neuladen ist das Digimon wieder Rookie, und der Grind-Modus digitierte bisher nie selbst. Jetzt digitiert der Bot zwischen zwei Kämpfen Stufe für Stufe in die höchste freigeschaltete Form. Gesperrte Stufen (Quest- oder Item-Voraussetzung) lässt er aus.
- Neuer Test `levelevotest`.

## 2.43.0 – Lern-Route nimmt Feldbosse mit
- Neuer Haken **„Lern-Route: Feldbosse der Map ohne Enrage mitnehmen“** (an). Es zählen Feldbosse und Named Elites der aktuellen Lern-Map, die keinen Enrage-Timer haben und höchstens die Level-Grenze über dem Digimon stehen.
- Beim Ankommen auf der Map besucht der Bot jeden erlaubten Kanal (Reiter Bosse → Kanäle) einmal und liest dort die Boss-Timer, denn das Spiel nennt sie nur für den aktuellen Kanal. Derweil grindet er weiter.
- Lebt ein Boss oder spawnt er in unter 30 s, wechselt der Bot auf dessen Kanal, läuft zum Spawnpunkt und kämpft. Danach (der Respawn-Timer wird gesetzt) geht er zurück in die Zone. Ist der Boss nach 20 s am Spawnpunkt nicht da, vergisst er den Timer und grindet weiter.
- Neuer Test `levelbosstest`.

## 2.42.0 – Lern-Route: selbst zur besten Zone
- Neu im Reiter Kampf: **Lern-Route**. Beim Grinden reist der Bot selbst zur Zone mit den meisten EXP/min für das aktuelle Level, Haken „nur in Adventure 02“ standardmäßig an.
- So bewertet er die Zonen:
  - EXP pro Kill nach der gemessenen Formel, Monster-HP aus den Daten, eigener Schaden aus Angriff und Angriffstempo (1,55 × AT je Angriff, geeicht an Aquilamon), dazu 1,3 s Suchzeit.
  - Es zählen die Monster, die die EXP-Priorität tatsächlich nimmt, und nur bis zur eingestellten Level-Grenze (höchstens +12).
- Neu gerechnet wird alle 30 s und bei jedem Level-Up. Gewechselt wird erst, wenn eine andere Zone mindestens 15 % mehr bringt und der Bot schon 3 Minuten in der jetzigen war.
- Unterwegs wehrt er Angreifer ab und beendet einen laufenden Kampf, in der Zone grindet er wie gewohnt.
- Digitieren macht der Grind-Modus weiterhin nicht von selbst.
- Neuer Test `levelroutetest`.

## 2.41.0 – EXP-Priorität beim Grinden
- Gemessen mit der EXP-Messung (~280 Kills, Hawkmon/Aquilamon in Digi-Egg Valley): **EXP pro Kill = EXP-Grundwert × Monster-Level^1,1 × Faktor.** Der Faktor hängt vom Abstand zum eigenen Digimon ab:
  - −15 % je Level darunter, ab −6 nur noch die Mindestmenge von 1 EXP.
  - +10 % je Level darüber.
  - **+5 bis +8 = ×1,5**, danach wieder weniger (+9 ×1,42, +10 ×1,36, +11 ×1,30).
  - Außerdem gilt: EXP bis zum nächsten Level = 40 × Level^1,8 + 20.
- Neuer Haken im Reiter Kampf, **EXP-Priorität** (an): Beim Grinden nimmt der Bot unter den Monstern im Suchradius zuerst die mit +5 bis +8 Level, dann +4, +3 … bis unter das eigene Level, und erst ganz zuletzt welche über +8. Innerhalb einer Stufe nimmt er das nächste. Angreifer, Quest-Monster, Bosse und Gruppenziele gehen wie bisher vor.
- Damit +5 bis +8 überhaupt in Frage kommen, muss „Max. Level über dem Digimon“ mindestens +8 sein (Standard +5).
- Level-Simulation Lv 1→99 nur mit A2-Maps, reines Grinden, Tamer-Ausrüstung des Testkontos: ~6 h reine Kampfzeit mit EXP-Priorität (ohne ~6,2 h), mit doppelter Suchzeit ~7,6 h.
- Neuer Test `expprio`.

## 2.40.1 – Event: Jagd-Boss sicherer erkennen
- Live stand der Jagd-Boss nah bei der Gruppe, der Bot erkannte ihn aber nicht. Bisher musste seine Art genau der Angabe im Event-Fenster entsprechen, manche Jagd-Bosse wechseln aber die Form (z. B. Justimon → `justimon_hunt_blitz` / `_critical`). Jetzt zählt jede Jagd-Boss-Art (`…_hunt…`) auf der Event-Map. Davon gibt es dort nur einen.
- Sobald der Bot einen Jagd-Boss sieht, steht das im Log mit Art, Flags und Abstand. Wird er künftig wieder nicht angegriffen, sieht man den Grund.
- `hunttest` prüft jetzt auch einen Boss in anderer Form.

## 2.40.0 – EXP-Messung
- Reiter **Log**: Haken **EXP-Messung**, dazu die Knöpfe „Messung kopieren“ und „Messung löschen“. Daneben steht, wie viele Kills und Level schon erfasst sind.
- Je eigenem Kill schreibt der Bot mit: Monster (Art, Level, Max-HP), das eigene Digimon (Art, Level, EXP vorher, EXP bis Level-Up), Tamer-Level, Map, Gruppengröße, die erhaltenen EXP und die Kampfdauer.
  - Die EXP kommen aus der Chat-Meldung „+341 EXP“, inklusive Gruppenanteil. Fehlt die Meldung, nimmt er die EXP-Differenz und markiert das.
  - Dazu die Zeit seit dem vorherigen Kill (Suchen und Laufen) und die eigenen Treffer: Schaden, Krits, Fehlschläge.
  - Je Level wird außerdem festgehalten, wie viele EXP bis zum nächsten nötig sind.
- Kills, die ein anderer beendet, zählen nicht. Gespeichert wird im Browser (`localStorage`, höchstens 3 000 Kills).
- Zweck: Daten für eine Simulation, wie lange Grinden von Level 1 bis 99 dauert. EXP-Formel, Level-Tabelle und Schaden rechnet der Server, sie stehen nicht in den Spieldaten.
- Neuer Test `expmesstest`.

## 2.39.0 – Tamer-Essen vor Pandæmonium Lost
- MaloMyotismons Pandæmonium Lost trifft alle 20 s den ganzen Raum und verbrennt dabei 45 % der Max-DS jedes Tamers (`tamerDsBurn` in den Daten). Ist das Tamer-DS leer, digitiert der Partner zurück. Live wurden so alle vier ClavisAngemon zu Patamon, ohne einen einzigen Sturz, und der Schaden brach ein.
- Wird ein solcher Treffer angesagt und fiele das Tamer-DS danach unter die eingestellte Grenze (Reiter Kampf, Tamer-DS, mindestens 10 %), isst der Bot sofort Tamer-Essen von F3. Sonst gilt die Grenze wie bisher. Das gilt auch beim Spiegeln.
- Voraussetzung: In jedem Fenster liegt Tamer-Essen auf F3, zum Beispiel Bento (+1 000) oder Ramen (+1 500). Bei 45 % Brand alle 20 s lohnt eine Grenze um 50 %.
- Neuer Test `tamerburntest`.
- Simulator: `CLAVIS=Anzahl` (1–4) und `CLAVIS_LV=Level` für die ClavisAngemon. Mit Live-Werten schafft keine Aufstellung aus Bauzel und Clavis Raum 3 rechtzeitig. Am nächsten kommt Bauzel + 2 Clavis Lv 100 mit 7 % Rest.

### Probelauf Hard mit Live-Werten (`LIVE=1`)
- Erster Live-Versuch Hard (Bauzel + 4 ClavisAngemon Lv 70–72): Raum 3 verloren. Diaboromon stand nach ~300 s bei 37 %, und es gab 4 Stürze. Gemessener Schaden am Boss: Bauzel ~9 000/s, ClavisAngemon ~1 000–1 200/s, zusammen ~12 000/s. Mit 5 Spielern hat Diaboromon 6,73 Mio. HP. Für die Uhr (360 s) bräuchte es ~18 700/s.
- Die Stürze: Die Bots liefen nach dem Ende des Warnkreises sofort zurück, live schlug die Volley aber 0,2–0,4 s später ein. Einmal konnte ein vom Tentacle Bug gegriffener Clavis nicht ausweichen.
- `LIVE=1` stellt den Simulator auf diese Werte ein: Schaden Bauzel × 0,72 (→ ~9 000/s), ClavisAngemon × 0,19 (→ ~1 100/s), Einschlag 300 ms nach dem Ende des Warnkreises. Einzeln einstellbar mit `F_PAL`, `F_CLAV` und `EINSCHLAG_MS`. Am Ende steht der Schaden am Boss je Sekunde für jedes Mitglied.
- Ein Lauf `LIVE=1 TEAM=clavis TEMPO=4`: Raum 3 an der Uhr gescheitert, Diaboromon bei 36 %, 0 Stürze. Das deckt sich mit dem Live-Versuch. Fazit: Mit 4 Clavis reicht der Schaden nicht, denn jedes Mitglied über 3 gibt dem Boss +45 % HP, bringt aber nur ~1 100/s.

## 2.38.0 – 🎯 Event: Mega-Jagd
- Neuer Knopf **🎯 Event** neben Start. Er gilt zusätzlich zu jedem Modus, außer im Dungeon.
- So läuft die Mega-Jagd im Spiel: Alle 2 Stunden erscheint ein Mega-Weltboss (Regalecusmon, Marsmon, Gankoomon, Justimon …) an einer zufälligen Stelle einer Feld-Map, nur auf Kanal 1. Er greift nie zuerst an. Der Chat warnt 5 Minuten vorher.
- So macht es der Bot:
  - Er fragt das Event-Fenster des Spiels nach Boss, Map und nächster Jagd: jede Minute, während einer Jagd alle 10 s, bei der Chat-Warnung sofort.
  - Ab 6 Minuten vor dem Erscheinen reist er zur Map und wechselt auf Kanal 1. Dort wartet er mit Countdown.
  - Danach läuft er die Jagdgebiete der Map der Reihe nach ab, bis der Boss in Sicht ist, und kämpft. Der Boss hat Vorrang vor anderen Zielen, Angreifer wehrt er vorher ab.
  - Ist der Boss besiegt oder die Jagd vorbei, geht es mit dem vorherigen Modus weiter.
- In der Gruppe sucht nur der Leader, die anderen folgen ihm wie gewohnt und greifen sein Ziel mit an.
- Neuer Test `hunttest`. Live noch nicht geprüft.

## 2.37.0 – Deckung hinter Platten (Ultimate Flare)
- Laut Spieldaten schützen vier zerbrochene Platten in Raum 4 vor der Ultimate Flare (`slab_1`–`slab_4`, Radius 26 px). Geschützt ist, wer auf der vom Boss abgewandten Seite steht (live bestätigt).
- Steht das Digimon im Flare-Fächer und ist eine Platte näher als der Weg aus dem Fächer hinaus, läuft es 12 px hinter die Platte. Dort gilt es als sicher, weicht nicht weiter aus und läuft nicht zurück. Es gelten dieselben Prüfungen wie sonst: Der Weg ist frei von anderen Zonen, und der Punkt ist vor dem Einschlag erreichbar.
- Funktioniert allgemein für jede Attacke mit `cover` in den Daten.
- Simulator: Platten und Deckung nachgebildet. Im Ergebnis steht, wie oft die Deckung half.
- Probelauf ab Raum 4, je 10 Läufe: alt und neu beide 10/10, 0 Stürze, 0 Flare-Treffer. Die Deckung wurde bei rund 28 % der Flare-Ausweichmanöver genutzt. Der Armageddemon-Kampf dauerte gleich lang (Ø 262 s alt, 264 s neu).
- Neuer Test `covertest`.

### Probelauf Hard: Raum 4 erst Herde, dann Armageddemon
- Der Simulator bildet Raum 4 jetzt ab wie live: zuerst die 10 Kuramon-Wellen, danach erscheint Armageddemon. Bisher lief beides gleichzeitig. Der Enrage (8 min) zählt ab seinem Erscheinen.
- 10 volle Läufe (Raum 3 + 4, Bauzel + 4 ClavisAngemon Lv 70, ×4): **10 von 10 geschafft**, insgesamt 2 Stürze.
  - Raum 3: 210–234 s (Uhr 360 s).
  - Raum 4 mit Herde: 384–398 s. Der reine Armageddemon-Kampf dauert 265–281 s (Enrage 480 s).
- Die zwei Stürze (ein Lauf): Zwei Clavis wichen kurz vor der Black-Rain-Hülle noch einer Zone aus und erreichten den Schutzkreis nicht mehr rechtzeitig.

## 2.36.3 – Fernangriff von draußen nur, wenn es sicher ist
- Nach einem Fernangriff läuft das Digimon dem Ziel zum Nahkampf hinterher. Der Bot feuert deshalb von draußen nur noch, wenn das Digimon auf diesem Weg keine Zone erreicht, bevor sie eingeschlagen hat. Ist die Restzeit unbekannt, bleibt es wie bisher.
- Fächer (Ultimate Flare) haben jetzt auch eine Restzeit.
- Grund (Probelauf Hard): In der Cluster-Phase feuerten die Clavis 0,6–1,2 s vor der Ultimate Flare, liefen hinterher in den Fächer und fielen alle (2 von 10 Läufen).
- 10 volle Läufe (Raum 3 + 4, ×4): **9 geschafft, 0 Stürze in diesen 9**, Raum 3 in 213–235 s, Raum 4 in 294–310 s. Offen: In einem Lauf wechselten alle während einer aktiven Flare auf einen Kuramon der frisch erschienenen Herde. Der Weg war frei, aber die Herde lief weiter, und die Digimon folgten ihr in den Fächer.
- Neuer Test `rangedsafetest`.

## 2.36.2 – Key of Hope auch fern vom Boss
- Geteilte Treffer (Black-Rain-Hülle, Catastrophe Cannon) folgen einem Spieler. Key of Hope deckt sie jetzt unabhängig davon, wie weit der Boss entfernt ist. Andere Block-Treffer gelten weiter nur bis 700 px um den Boss.
- Grund (Probelauf Hard): In der Kuramon-Cluster-Phase (Boss unter 20 %) standen alle weit vom Boss entfernt. Niemand sammelte sich, zwei Clavis zündeten erst nach dem Einschlag, und es gab 2 Stürze.
- 10 volle Läufe (Raum 3 + 4, ×4): 8 geschafft, 0 Stürze durch Black Rain, Raum 3 in 216–236 s, Raum 4 in 289–309 s. Offen: Die zwei Fehlschläge kommen von der Ultimate Flare in der Cluster-Phase. Ein Fernangriff von draußen kurz vor dem Einschlag lässt das Digimon dem Ziel hinterher in den Fächer laufen.
- Neuer Test `kohrangetest`.

## 2.36.1 – Raum 4 (Hard) wieder stabil
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

## 2.36.0 – Lange Ansagen: erst spät herauslaufen
- Bei langen Ansagen kämpft das Digimon weiter und läuft erst kurz vor dem Einschlag heraus, mit großzügigem Puffer (Laufzeit × 1,5 + 1,5 s). Das gilt nur, wenn die Restzeit jedes Kreises bekannt ist, in dem es steht. Beispiele: Machinedramons Infinity Cannon: Full Charge und Daemons Flame Inferno, beide 160 px und 12 s. Bisher stand es dort rund 10 s untätig draußen, jetzt kommen etwa 9 s Schaden dazu. Kurze Ansagen (die meisten, auch Regalecusmons Ocean Wave III mit 3,5 s) laufen wie bisher sofort.
- Raumweite Kreise: Die Suche nach einem Fluchtpunkt reicht so weit, wie das Digimon in der Restzeit kommt (höchstens 900 px statt fest 328 px). Weiter entfernte Punkte zählen nur, wenn der gerade Weg begehbar ist, also keine Wand dazwischen liegt. Damit verlässt es Marsmons Corona Sanctions (400 px, 10 s) auch aus dem Nahkampf. Die Raid-Kreise (640 px) bleiben wie bisher, denn daraus kommt man im Raum nicht heraus.
- Neuer Test `dodgelatetest`.
- Testlauf: Standardmäßig laufen so viele Tests gleichzeitig, wie der Rechner Threads hat, minus 4. Die langsamsten starten zuerst, ihre Dauer merkt sich `tests/.times.json`. Der volle Lauf dauert hier etwa 100 s statt 250 s.

## 2.35.1 – Ausweichen bei mehreren Warnzonen
- **Laufweg:** Der Weg zum Fluchtpunkt führt nicht mehr durch einen anderen Kreis oder Strahl. Durchquert wird nur eine Zone, die nachweislich erst einschlägt, wenn das Digimon schon vorbei ist. Ist die Restzeit unbekannt, wird sie umgangen. Gibt es nur Punkte hinter einem anderen Kreis, nimmt der Bot einen davon als Notlösung.
- **Überlappende Kreise:** Ob ein Fluchtpunkt rechtzeitig erreichbar ist, rechnet der Bot jetzt mit dem frühesten Einschlag aller Kreise, in denen das Digimon steht. Bisher zählte nur der zuerst gefundene Kreis.
- **Raumweite Kreise (ab 320 px):** Sie werden nicht mehr pauschal ignoriert. Liegt der Rand so nah, dass das Digimon vor dem Einschlag herauskommt, weicht es hinaus aus und läuft danach nicht wieder hinein. Kommt es nicht heraus, kämpft es wie bisher weiter.
- Neuer Test `dodgemultitest`.

## 2.35.0 – Ausweichen mit dem Digimon
- Steht das Spiel auf Digimon-Steuerung, bewegt das Ausweichen nur das Digimon, der Tamer zählt nicht. Der Bot schickt beim Ausweichen kein „Folgen“ mehr. Das hat das Digimon bisher alle 1,5 s zum Tamer zurückgezogen, während der nächste Klick es wieder zum Fluchtpunkt schickte (Zickzack).
- Der Fluchtpunkt bleibt fest, bis er erreicht ist, eine neue Warnzone ihn überdeckt oder 3 s vorbei sind. Bisher wurde er alle 0,4 s aus der aktuellen Position neu gesucht und sprang beim Laufen zwischen Nachbarrichtungen (Eiern). Der Klick wird nur bei einem neuen Punkt sofort gesendet, sonst einmal pro Sekunde wiederholt.
- Mit Tamer-Steuerung bleibt es wie bisher (Tamer läuft, Digimon folgt), nur mit festem Fluchtpunkt. Neuer Test `dodgepartnertest`.

## 2.34.3 – Adds nur vom Boss, der wirklich da steht
- „Adds zuerst“ zählt nur noch die Adds des Boss-Eintrags dieser Map, und zwar des Bosses, der am nächsten steht. Bisher galt jede Art als Add, die irgendwo im Spiel ein Boss ruft. Live auf Sea of Darkness: Neben dem Feldboss Divermon galten alle normalen Divermon als Adds, weil MarineDevimon auf Odaiba Divermon ruft. Der Mitläufer griff sie deshalb einen nach dem anderen an, der Leader verteidigte ihn, und die Flächenskills zogen Gesomon und Octomon mit.
- Steht der Leader in der Boss-Rotation, jagen Mitläufer keine Adds mehr selbst. Sie greifen nur sein Ziel an und wehren Angreifer ab. Neuer Test `addmaptest`.
- Einstellung in der Gruppe: Nur der Leader steht auf Boss-Rotation, die anderen auf Autopilot (👑 Bosse + „Bots starten“ stellt das automatisch so ein).

## 2.34.2 – Map für Map nach Serie wie das Digi-Phone
- Die Maps der Map-für-Map-Runde (und die Start-Map-Auswahl) sind jetzt wie im Digi-Phone zuerst nach Serie sortiert, dann nach Level. Bisher galt nur das Level, deshalb stand Spiral Mountain (Adventure, Lv 45–56) mitten zwischen den Adventure-02-Maps. In der Auswahl steht „A1 ·“ oder „A02 ·“ vor jedem Namen.
- Reihenfolge: „von unten nach oben“ = Adventure niedrig → hoch, danach Adventure 02 niedrig → hoch; „von oben nach unten“ genau umgekehrt. Mit einer Start-Map in Adventure 02 (z. B. Digi-Egg Valley) bleibt die Runde aufsteigend in Adventure 02. Neuer Test `sweepseriestest`.

## 2.34.1 – Quests nach Serie getrennt
- Reiter Quests: Die aktiven Quests stehen jetzt unter zwei Überschriften, **Adventure** und **Adventure 02**, jeweils mit Anzahl. Die Serie der Map, auf der man gerade ist, steht oben. Neuer Test `seriestest`.

## 2.34.0 – Map für Map auch von unten nach oben
- Reiter Quests → Reihenfolge „Map für Map“ → neue Auswahl **Richtung**: „von oben nach unten“ (wie bisher, höchste Map zuerst) oder „von unten nach oben“ (niedrigste Map zuerst). Aufsteigend erledigt der Bot auf einer Map alles, was machbar ist, und geht dann zur nächsthöheren. Startet man z. B. mit Start-Map „Digi-Egg Valley“, geht es von dort aus nach oben. Ohne Start-Map beginnt er bei der niedrigsten erreichbaren Map.
- Neuer Test `apt6up` (aufsteigend: Tiefland → Mittelland → Hochland; mit der alten Version umgekehrt).

## 2.33.2 – Boss-Rotation: unterwegs keine Kämpfe durch die Gruppe
- Der Leader meldet der Gruppe nur noch ein Ziel, das er wirklich angreift, und nicht, solange er unterwegs ist (kein Kampf). Live hatte das Spiel beim Leader einen Angreifer ausgewählt, ohne dass er ihn angriff; der Mitläufer griff ihn als „Ziel des Leaders“ an, und so zog ein Kampf den nächsten nach sich. Wird ein Gruppenmitglied angegriffen, helfen die anderen wie bisher.
- Am Spawnpunkt gilt der Bot ab ≤ 200 px als angekommen und erst ab > 350 px wieder als unterwegs. Live pendelte er an der 200-px-Grenze zwischen Kämpfen und Zurücklaufen.
- Die Jagdliste geht nur im Autopilot an die Gruppe. Neuer Test `leadtargettest` (vorher rot).

## 2.33.1 – Tür ohne Leader, MaloMyotismon live gemessen
- An der Dungeon-/Raid-Tür wartet ein als Mitläufer eingetragenes Fenster nur, wenn sein Leader online ist, den Bot fährt und auf derselben Map steht; sonst geht es allein hinein. Live hing es sonst bei „warte auf den Leader“, obwohl der Leader gar nicht da war. Der Leader wartet an der Tür nur auf Mitglieder, die gerade online sind. Neuer Test `doorleadertest`.
- MaloMyotismon live (Bauzel allein): Die HP (2 435 384) stimmen genau mit den Daten. Bauzel macht ~5 000 Schaden/s (evasiv und gepanzert); nach 171 s stand der Boss bei 65 %. Mit Enrage nach 7 min ist das allein nicht zu schaffen. Der Probelauf `sim/raid-malomyotismon.js` ist darauf abgestimmt (Trefferchance 0,85, seine normalen Attacken ergänzt) und endet ebenso im Enrage bei 22–31 %.

## 2.33.0 – MaloMyotismon-Raid im Dungeon-Modus
- Reiter Bosse → Dungeon → Modus „MaloMyotismon-Raid“, genauso wie Apocalymon: Der Bot reist zur Tür in Myotismon Castle, digitiert, betritt den Raid und wartet im Schutzbereich auf HP. Dann kommen zuerst die Phantomon-Adds und die Illusionstürme (sie stärken bzw. füttern den Boss), danach MaloMyotismon. Nach dem Sieg geht er hinaus und stoppt.
- Aus den Spieldaten bekannt: Grisly Wing (Kreis unter jedem, 55 700 und −25 % Verteidigung, wird ausgewichen), Dream Mirror (200 %, Spiegel-Pause), Nightmare Mark, Pandæmonium bei 50 % (raumweit, 8 s Ansage, weiterkämpfen). MaloMyotismon weicht sehr oft aus (×3,5 Ausweichen) und ist gepanzert.
- Test \`raidmodetest\` prüft jetzt beide Raids. Live noch nicht geprüft.

## 2.32.1 – raumweite Angriffe: weiterkämpfen
- Erster Live-Lauf Apocalymon-Raid (Bauzel, solo): **geschafft in ~2 min**. Adds zuerst, Spiegel pausiert, Darkness Zone und Piedmon's Swords ausgewichen, danach hinaus und gestoppt.
- Bei 5 % lädt Apocalymon „Total Annihilation“ (20 s, Kreis über den ganzen Raum). Der Bot fand keinen Fluchtpunkt und stand 20 s still, der Boss heilte sich in der Zeit von 5 auf 8 %. Jetzt gilt:
  - Kreise ab 320 px Radius (raumweit, nicht ausweichbar) ignoriert das Ausweichen; der Bot greift weiter an, um die Ladung durch den Sieg abzubrechen.
  - Findet er allgemein keinen Fluchtpunkt, kämpft er weiter, statt stehen zu bleiben.
- Neuer Test `hugezonetest` (vorher rot).

## 2.32.0 – Apocalymon-Raid im Dungeon-Modus
- Reiter Bosse → Dungeon → Modus „Apocalymon-Raid“. Der Bot reist selbst nach Spiral Summit zur Tür und digitiert dort in die eingestellte Form (Reiter Digimon). Dann betritt er den Raid, wartet im Schutzbereich auf ~volle HP und geht zum Boss.
- Im Raid: Megadramon-Adds zuerst (sie füttern den Boss sonst), dann Apocalymon. Ausweichen, Spiegel-Pause, Markierung und Tanken wie bei allen Bossen. Nach dem Sieg geht er hinaus, und der Bot stoppt. Scheitert der Lauf, versucht er es bis zu 3× neu.
- Allgemein gebaut: Jeder einfache Raid ohne Räume (ein Boss mit Adds) lässt sich so ergänzen.
- Neuer Test `raidmodetest`. Live noch nicht geprüft.

## 2.31.1 – nicht in die Volley zurücklaufen, ein Block pro Cannon
- Ist ein Einschlag in weniger als 1,2 s fällig und steht das Ziel neben der Warnzone, greift der Bot erst danach wieder an, auch nicht mit einem Fernangriff. Bosse laufen weiter, und das Digimon folgte ihnen in den Kreis (Probelauf: 3 Clavis auf einmal durch eine Volley).
- Key of Hope: Die Staffelung zwischen den Clavis zählt ab dem Moment, ab dem gezündet werden darf. Wird eine Volley mit abgedeckt, springt dieser Zeitpunkt nach vorn, und vorher zündeten zwei Clavis gleichzeitig. Jetzt zündet genau einer pro Cannon.
- Probelauf Hard (Bauzel + 4 ClavisAngemon Lv 70, ×4):
  - 5 Läufe à 200 s: 0 Volley-Treffer, 0 Stürze (vorher 2–5 Stürze pro Lauf).
  - 2 volle Läufe: **beide geschafft**. Raum 3 in 240/255 s (Uhr 360 s), Raum 4 in 297/318 s (Enrage 480 s), Catastrophe Cannon und Black-Rain-Hülle zu 100 % geblockt, 0–2 Stürze.

## 2.31.0 – Key of Hope nur für unausweichbare Treffer
- Key of Hope zündet nur noch gegen Treffer, denen man nicht ausweichen kann: Catastrophe Cannon, Black-Rain-Hülle, Ultimate Flare (dazu Infermons geladener Spider Shooter und die Ramme). Cannon Volley, Tentacle Bug, Kopien-Strahlen und Black Rain weicht man aus.
- Fällt so eine Ausweich-Attacke bis zu 1 s vor einen Block-Treffer, zündet der Clavis früher, damit der Schutz (2 s) beides abdeckt. Die Gruppe steht dann schon zusammen und weicht nicht mehr aus.
- Gesammelt wird erst in den letzten 2 s vor dem Einschlag; bis dahin weicht der Bot noch aus, etwa einer Volley.
- Diaboromons Kopien (Liste des Spiels `mechB.view.copies`) greift der Bot nie an, nur das Original.
- Grund (Probelauf Hard, Bauzel + 4 ClavisAngemon Lv 70): 4 Clavis haben 4 Blocks pro 45 s, Diaboromon feuert in der Zeit ~6 blockbare Attacken. Mit allen im Block war für die Cannon oft keiner bereit (3 von 5 geblockt). Jetzt sind es 100 %, und in einem Lauf wurde Hard komplett geschafft (Raum 3 in 223 s, Raum 4 in 320 s). Offen: Kurz vor einer Volley laufen die Digimon einem wandernden Boss hinterher in die Kreise.

## 2.30.6 – „Ziele verteilen“: sichtbar, wann es gilt
- „Ziele verteilen“ wirkt nur im Gruppen-Modus 📜 Quests, wenn alle ihren Bot fahren. In 👣 Spiegeln, ⚔️ + Angriff, 👑 Bosse und 🏰 Dungeon ist es absichtlich aus; in + Angriff greifen alle das Ziel des Leaders an. Bisher stand das nur im Tooltip, live sah es aus, als sei der Haken kaputt. Jetzt ist der Haken in diesen Modi abgeblendet und zeigt „gilt nur im Modus 📜 Quests“.

## 2.30.5 – beim Warten auf einen Boss nichts angreifen
- Wartet der Autopilot auf einen Quest-Boss, der noch nicht da ist, greift er nichts mehr an, nur Angreifer wehrt er ab. Bis 2.30.4 nahm er in der Wartezeit normale Monster in 250 px um den Spawnpunkt mit. Erscheint der Boss, geht er wie bisher sofort auf ihn.
- Test `bossfilltest` angepasst: Beim Warten 0 Kills, ein Angreifer wird abgewehrt, ein anderes Monster in der Nähe bleibt in Ruhe, dann fällt der Boss.

## 2.30.4 – aus dem ersten Hard-Live-Lauf
- **Tentacle Bug:** Der Arm packt erst ~0,2 s nach dem Ende der Ansage, der Strahl ist dann schon vom Boden verschwunden. Live griff der Bot genau in diesem Moment wieder an und wurde gepackt (24 s festgehalten). Strahlen mit Greifarm oder Ansturm gelten jetzt noch 0,8 s nach dem Verschwinden als Gefahr. Simulator: 0 von 18 gepackt (vorher 2 von 18).
- **Digitation abwarten:** An der Tür und vor dem Anziehen eines Raums wartet der Bot, bis die eingestellte Digitation erreicht ist. Live ging er sonst als ExVeemon hinein. Er wartet höchstens 90 s, z. B. wenn Tamer-DS fehlt.
- **Geteilter Treffer:** Die Catastrophe Cannon folgt dem Ziel, live gab es keinen Warnkreis am Boden. Allein macht sie laut Spieldaten ⅓ von 240 % = 80 % der Max-HP. Wird ein geteilter Treffer angesagt, trinkt der Bot F1, bis er bei ≥ 95 % HP ist, unabhängig von der normalen Schwelle.
- Probelauf Hard (allein, ×4, Cannon folgt dem Ziel): Raum 3 in 310 s geschafft. Raum 4 scheitert an der Black-Rain-Hülle (80 % alle ~25 s), während der Boss mit Herden-Stapeln weiter zuschlägt. Die Nahkampfwerte von Armageddemon sind aber nur angenommen; dafür braucht es Live-Daten aus Raum 4.

## 2.30.3 – „Ziele verteilen“ repariert
- Mit „Ziele verteilen“ zählte jedes Monster, das ein Gruppenmitglied angreift, für alle anderen als „Angreifer“, und Angreifer gehen vor. Sobald das Monster des Leaders zurückschlug, gingen also wieder alle darauf. Beim Verteilen ist das Monster eines anderen jetzt dessen Kampf. Jeder wehrt nur ab, was ihn selbst angreift, und sucht sich sonst ein freies Monster.
- Neuer Test `spreadatktest` (vorher rot: 10/10 auf dem Monster des Leaders, jetzt 0/10). Der alte `spreadtest` hatte die Gegenwehr der Monster ständig zurückgesetzt und den Fehler deshalb nicht bemerkt.

## 2.30.2 – Dungeon digitiert vorher
- Der Dungeon-Modus nimmt jetzt die eingestellte Digitation (Reiter Digimon → Digitation) an, wie Autopilot und Boss-Rotation. Das passiert schon an der Tür, vor dem Betreten, und im Dungeon zwischen den Kämpfen wieder, z. B. nach einem Zurück-Digitieren durch Infermons Spider Shooter. Fehlt Tamer-DS, füllt F3 auf. Klappt die Digitation nicht (Abklingzeit, zu wenig DS), geht es in der aktuellen Form weiter.

## 2.30.1 – Diaboromon komplett ausweichen
- Was mehr als Schaden macht, tankt der Bot nie: Packen (Tentacle Bug, 8 000 plus Festhalten und Aussaugen), Zurück-Digitieren, Markieren, geteilter Treffer, Spiegel, Debuffs. Diese Attacken weicht er immer aus.
- Dieselbe Attacke mehrfach gleichzeitig (4 Kopien von Diaboromon, je 30 000) steht nur einmal im Protokoll. Der Bot zählt jetzt die Warnzonen am Boden mit und tankt solche Salven nicht mehr.
- Hard allein: Die Herde ignoriert er (allein ist sie kaum zu stoppen, und die Zeit fehlt beim Boss). In der Gruppe fängt er sie weiterhin ab. „Adds zuerst“ ist im Dungeon aus, die Reihenfolge bestimmt die Dungeon-Zielwahl.
- Simulator (allein, ×4), unter der Annahme, dass man der Catastrophe Cannon ausweichen kann: 2/2 Läufe **geschafft, 0 Stürze**. Raum 3 in 307–324 s (Uhr: 360 s), Raum 4 in 386–396 s (Enrage: 480 s). Folgt die Cannon dem Ziel, ist allein nach 4 Stürzen Schluss (Diaboromon bei ~54–83 %). Welche Variante stimmt, zeigt der Live-Test.

## 2.30.0 – Kera Hard („Revenge“) im Dungeon-Modus
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

## 2.29.8 – nicht vor dem eigenen Schwert weglaufen
- Die Tank-Regel hat auch eigene Skills mitgezählt. Invincible Sword ist eine Kreis-Fläche mit viel Schaden und galt deshalb als „nicht tankbar“: Nach jedem eigenen Schwerthieb wich der Bot doch aus (live: 2 von 3 Crazy Turns). Jetzt zählen nur Attacken von Monstern.
- Probelauf: Die Partner-Skills senden jetzt Skill-Ereignisse wie im Spiel, damit so ein Fehler auffällt. Holy Grace heilt (in den Spieldaten ein Heil-Skill), statt Schaden zu machen. Ergebnis (allein, ×4): Crazy Turn 6 von 7 getankt (vorher 4), Data Crusher 10 von 10 (vorher 8).

## 2.29.7 – auch die Wächter in Raum 1 tanken
- Flächen ohne festen Schaden schätzt der Bot jetzt aus dem Angriffswert des Wirkers: AT × Power % × 1,5 Reserve. Die Chrysalimon-Wächter in Raum 1 (Data Crusher, Power 220, Lv 51) kommen so auf ~2 500 und werden getankt statt ausgewichen.
- Simulator (allein, ×4): in Raum 1 kein einziges Ausweichen mehr; Keramon und Chrysalimon 15 von 16 getankt; Infermons Ramme 9/9 und Spider Shooter 7/7 ausgewichen.

## 2.29.6 – Tanken greift wirklich
- Bisher tankte der Bot nur, wenn nach dem Treffer noch 40 % HP übrig blieben. Bei Crazy Turn (28 000) und 92 660 Max-HP hieß das: erst ab ~65 000 HP. Im Kampf lag er meist darunter und wich deshalb doch aus. Jetzt reichen > 15 % HP danach; ab 50 % trinkt er ohnehin F1.
- Direkt nach dem Einschlag steht der Kreis noch kurz da. Auch dann läuft der Bot nicht mehr heraus (0,8 s).
- Simulator (allein, ×4): getankt 14–15× statt 5×, Boss-Raum ~280–330 s statt ~310 s. Die Streuung kommt daher, dass Infermon zufällig ein Terminal wählt. Die Tränke im Probelauf stehen jetzt auf 400 (live: über 400 Feast).

## 2.29.5 – nicht in die Schutzzone ausweichen
- Ausweichen wählt keine Fluchtpunkte mehr in Schutzzonen. Dort kann man nicht kämpfen, live kostete das in Raum 2 jedes Mal 1–2 s fürs Herauslaufen. Eine Schutzzone nimmt der Bot nur noch, wenn es gar keinen anderen freien Punkt gibt.
- Zeitraffer geprüft (Solo-Lauf, Spielzeit im Dungeon): ×1 388 s, ×4 398 s, ×8 592 s, ×16 484 s. Bis ×4 stimmt das Ergebnis mit Echtzeit überein; ab ×8 wird der Ablauf zu grob (Windows-Timer ~15 ms), und die Ergebnisse weichen deutlich ab. Für Probeläufe also höchstens `TEMPO=4`.

## 2.29.4 – Skills für Infermons Mahlzeit aufheben
- Live wirkte der Bot während „NOT HERE“ keinen einzigen Skill, weil alle kurz vorher verbraucht waren. Mit dem Grundangriff allein kam er nur auf 60–80 % des Abbruchschadens. Jetzt hebt er einen Skill auf, wenn dieser bei der nächsten Mahlzeit (Cooldown von NOT HERE: 24 s) sonst noch abkühlen würde.
- Die Boss-Attacken einer Boss-Form (z. B. Infermon im Kera-Dungeon: Ramme, Spider Shooter, Kokon, NOT HERE) stehen nur in den Spawn-Daten der Form. Skill-Timing und die Attacken-Liste kennen sie jetzt auch.
- Dungeon-Probelauf mit Zeitraffer: `TEMPO=4` lässt alle Uhren und Timer 4× schneller laufen. Ein Solo-Lauf dauert so 98 s statt ~6,5 min und liefert dasselbe Ergebnis wie in Echtzeit (385 s gegenüber 388 s Spielzeit, je 5 von 7 Mahlzeiten abgebrochen).

## 2.29.3 – Dungeon: Fresser nach Zeitpuffer
- Raum 1: Zuerst nimmt der Bot den Fresser mit dem kleinsten Zeitpuffer (Zeit bis zum Verlust minus Laufweg minus Kill-Zeit). Ein gewähltes Ziel behält er, bis ein anderes mindestens 1,5 s dringender ist. Live hatte er zwischen zwei Fressern hin und her gewechselt und dabei 1,5 s verloren.

## 2.29.2 – Dungeon: nur der eigene Raum zählt
- Im Dungeon-Modus sieht der Bot nur Monster in dem Raum, in dem er gerade steht. Übrig gebliebene Kuramon aus Raum 1 gelten in Raum 2 nicht mehr als Angreifer oder als „Add“ des Bosses.
- Erster Live-Lauf solo (Imperialdramon Paladin): Raum 1 in 157 s (4/6 Terminals), Boss bis 6 %, dann Enrage nach 600 s. Grund waren die Infermon-Mahlzeiten (12 Stapel); dagegen helfen 2.29.1 und mehr Leute.

## 2.29.1 – kleine Boss-Treffer tanken, Infermons Mahlzeit abbrechen (aus dem ersten Live-Lauf)
- Neuer Haken (Standard an) „Kleine Boss-Treffer tanken statt ausweichen“: Flächen mit festem Schaden bis 35 % der Max-HP (danach bleiben noch ≥ 40 %) werden nicht mehr ausgewichen. Der Bot greift weiter an, und die Tränke heilen. Beispiel: Keramon „Crazy Turn“ 28 000, Chrysalimon „Data Crusher“ 30 000. Infermons Ramme (60 000) und Spider Shooter (45 000, Zurück-Digitieren) weicht er weiterhin aus.
- Infermon „NOT HERE“: Während er ein Terminal frisst, zählt nur Schaden. Der Bot zündet dann alle Skills sofort, ohne Zurückhalten fürs Ausweichen. Im Live-Lauf fehlten zum Abbrechen oft nur ~10 %, und jede durchgegangene Mahlzeit heilt ihn um 8 % und macht ihn stärker.

## 2.29.0 – Dungeon-Modus (Kera, Easy)
- Neuer Modus **Dungeon** und Gruppen-Modus **🏰 Dungeon**: zur Tür auf der Map Network, an der Tür auf die Gruppe warten (max. 20 s), der Leader betritt Easy („War Game“), die Gruppe an der Tür kommt mit.
- Raum 1: Terminals schützen. Der Bot nimmt zuerst den Tsumemon, dessen Terminal noch zu retten ist. Er rechnet dafür die Zeit bis zum Verlust (8 s Fressen) gegen den gemessenen Schaden pro Sekunde. Danach kommen nicht mehr rettbare Fresser, Angreifer und die übrigen Pflicht-Monster. Kuramon (keine Pflicht) bleiben in Ruhe.
- Zwischen den Wellen wartet der Bot in der Raummitte. Ist der Raum frei, geht er durchs Tor. Einen neuen Raum betritt er erst mit mindestens 90 % HP aus dem Schutzbereich heraus.
- Raum 2: Keramon → Chrysalimon → Infermon mit Ausweichen, Spiegel-Pause und Skill-Timing wie bei Bossen. Danach geht es zum Ausgang, und der Bot stoppt.
- Ein gescheiterter Lauf wird bis zu 3× neu versucht. Hard („Revenge“) folgt.
- Probelauf: `node sim/dungeon-keramon.js` (siehe unten).

## 2.28.1 – Key of Hope gezielter (aus dem Raid-Probelauf)
- Gegen Armageddemons einfachen **Black Rain** (Kreis unter jedem Spieler) wird kein Key of Hope mehr verbraucht, dem
  weicht der Bot aus. Key of Hope bleibt für die **Hülle** von Black Rain (geteilter Schaden, nicht ausweichbar) und
  für **Ultimate Flare**. Im Raid-Probelauf (150 s, 5er-Gruppe) sank der Schaden damit von 252 000 auf 0.

## 2.28.0 – Lage-Karte, weniger Haken
- **Übersicht → Lage:** Auf einen Blick siehst du Modus und ob der Bot läuft, Map und Kanal, das aktuelle Ziel mit
  HP, die Aufgabe und den Status. In der Gruppe kommt eine Zeile je Bot dazu: Leader (◉), HP-Balken (rot unter 35 %),
  Map und Kanal, bei ClavisAngemon „🔑 bereit“ oder die Restzeit, und der Status.
- **Weniger Haken:** „Bei Spiegel/Reflexion nicht angreifen“ und „Skills nur, wenn danach noch Zeit zum Ausweichen
  bleibt“ sind jetzt immer an. Ausgeschaltet schadete man sich nur selbst.

## 2.27.0 – Panel neu geordnet
- **Neuer Reiter 🐣 Digimon:** Hier steht alles zum eigenen Digimon an einer Stelle: Quest-Digimon, Digitation und
  Abgabe-Digimon (bisher im Quest-Reiter), Skills und Heal je Digitationsform sowie Tränke F1–F3 (bisher im
  Kampf-Reiter) und Tamer-DS (bisher in der Übersicht).
- **⚔️ Kampf:** Zielwahl, Boss-Mechaniken, Attacken des Bosses (bisher im Boss-Reiter) und Monster auf dieser Map.
- **Was im aktuellen Modus nicht gilt, wird abgeblendet** und mit „gilt nur im Modus …“ beschriftet. Beispiele:
  Autopilot-Optionen in der Boss-Rotation, die Monsterliste außerhalb von Grinden.
- **Oben im Kopf** steht, für welchen Account die Einstellungen gerade gelten (👤 Login-Name). Der Gruppen-Reiter
  sagt dazu, dass seine Einstellungen für alle Gruppenfenster gelten.
- Alle Einstellungen bleiben erhalten, nur die Anordnung ist neu.

## 2.26.0 – Boss-Rotation: unterwegs nicht kämpfen, am Platz erst der Boss
- **Unterwegs zum Boss** (andere Map, anderer Kanal oder noch nicht am Spawnpunkt) kämpft der Bot nicht mehr gegen
  aggressive Monster, die ihn angreifen. Er ruft das Digimon zurück und läuft weiter. Ein Kanalwechsel geht auch
  mit Verfolgern. Unter 50 % HP wehrt er sich wie bisher.
- **Am Spawnpunkt, Boss noch nicht da:** Verfolger, die mitgekommen sind, darf er erledigen. Von sich aus greift er
  beim Warten nichts an.
- **Boss da:** Erst der Boss, dann die Verfolger. Er wechselt auch mitten im Kampf auf den Boss.

## 2.25.0 – Boss-Wartezeit nutzen, Golemon nicht wegkiten
- **Warten auf einen Quest-Boss:** Ist der Boss nicht da, bekämpft der Bot in der Wartezeit normale Monster im Umkreis
  von 250 px um den Spawnpunkt. Sobald der Boss zu sehen ist, nimmt er keine neuen Füllmonster mehr und geht auf den Boss.
- **Golemon auf Holy Peaks:** Golemon macht einen Flächenangriff um sich herum. Das Ausweichen zog ihn bisher Stück für
  Stück aus seiner Verfolgungsreichweite (320), bis er zurücklief. Beim Ausweichen vor ihm wählt der Bot jetzt nur noch
  Punkte, die höchstens 240 px von seinem Startplatz entfernt sind. Weitere Monster lassen sich in KITE_GUARD ergänzen.

## 2.24.1 – Leader wartet beim NPC statt wegzulaufen
- Hält der Leader eine Abgabe für die Gruppe zurück, weil ein Mitläufer noch nicht so weit ist, macht er in der
  Wartezeit nur noch Aufgaben auf derselben Map. Gibt es dort keine, wartet er. Bisher lief er z. B. nach „The Shrine
  Stone“ zur Tagesquest in Sunset Bay und musste danach den ganzen Weg zurück zu Magnamon.
- Die Log-Zeile „Runde null: Phase -1/3 – undefined“ erscheint nicht mehr. Phasen werden nur im Map-für-Map-Modus gemeldet.

## 2.24.0 – Zum Boss hin ausweichen
- Beim Ausweichen aus einem Warnkreis nimmt der Bot jetzt den freien Punkt, der **dem Boss am nächsten** liegt und vor
  dem Einschlag noch erreichbar ist. Die Restzeit liest er aus dem Warnkreis des Spiels. Bisher ging er immer weg von
  der Kreismitte, oft auf die Seite gegenüber vom Boss.
- Steht das Digimon draußen direkt am Boss (Boss halb im Kreis), greift es mit dem normalen Angriff weiter an, sofern
  der Punkt zum Zuschlagen außerhalb des Kreises liegt. Steht der Boss tief im Kreis, wartet der Bot wie bisher draußen
  (und nutzt Fernkampf-Skills).

## 2.23.0 – Fernangriff beim Ausweichen
- Steht der Boss in einem Warnkreis oder führt der Weg zu ihm durch einen, wartet der Bot draußen. Dabei setzt er jetzt
  bereite **Fernkampf-Skills** ein, deren Reichweite vom aktuellen Platz des Digimons bis zum Boss reicht. So macht er
  weiter Schaden, ohne in den Kreis zu laufen.
- Genutzt werden nur angehakte Skills auf ein Gegner-Ziel mit mindestens 64 Reichweite. Heil-Skills, Key of Hope und
  Ansturm-Skills bleiben aus. Der normale Angriff ist bei allen Digimon Nahkampf und bleibt deshalb ebenfalls aus.
  Spiegel und Spawn-Schutz werden beachtet.

## 2.22.2 – Nach dem Kill gemeinsam aufs nächste Monster
- Stirbt das Monster des Leaders, nehmen die Mitläufer sofort den Angreifer, der dem Leader am nächsten ist. Diesen
  nimmt auch der Leader als Nächstes. Bisher griff in dieser kurzen Lücke jeder sein eigenes angreifendes Monster an.
  Mit weniger als 50 % HP wehrt sich ein Mitläufer weiterhin zuerst selbst.

## 2.22.1 – Gemeinsamer Fokus auf das Ziel des Leaders
- Ohne „🎯 Ziele verteilen“ greifen die Mitläufer jetzt zuverlässig das Ziel des Leaders an. Bisher wehrte jeder zuerst
  das Monster ab, das ihn selbst angriff. In Gebieten mit aggressiven Monstern sah das aus, als würde verteilt.
  Nur mit weniger als 50 % HP wehrt sich ein Mitläufer zuerst selbst.
- Beim Mithelfen gilt das Level-Limit des Mitläufers nicht mehr. Bisher half er nicht mit, wenn das Ziel des Leaders
  über seinem „Max. Level über dem Digimon“ lag.

## 2.22.0 – Beim selben NPC alles auf einmal
- Nach einer Abgabe nimmt der Bot beim selben NPC gleich die Quests an, die es dort gibt, und gibt dort auch alles
  Weitere ab. Erst dann geht er zum nächsten NPC. Vorher lief er z. B. Elder abgeben → Sage abgeben → zurück zu Elder
  zum Annehmen. Das gilt in allen Modi.
- Mit „Erst alle Quests erledigen, dann gemeinsam abgeben“ bleibt die Abgabe-Runde bestehen: Erst werden alle Abgaben
  erledigt, unterwegs wird beim selben NPC gleich angenommen, dann folgen die übrigen Annahmen, dann geht es auf die Jagd.

## 2.21.1 – Gemeinsam abgeben: Annahmen nur auf dieser Map zuerst
- Mit „Erst alle Quests erledigen, dann gemeinsam abgeben“ zog der Bot in der Annahme-Phase auch Quests auf ganz anderen
  Maps vor, z. B. eine Tagesquest in Factorial Town direkt nach einer Annahme in The Kaiser's Canyon. Jetzt nimmt er
  erst alle Quests auf der aktuellen Map an und erledigt sie. Quests woanders nimmt er erst an, wenn hier nichts mehr zu tun ist.

## 2.21.0 – Erst alle Quests erledigen, dann gemeinsam abgeben
- Neuer Haken im Quest-Reiter: **„Erst alle Quests erledigen, dann gemeinsam abgeben“**. Der Autopilot arbeitet dann in
  Runden: erst alle Ziele der angenommenen Quests, dann alle fertigen Quests abgeben, dann alle verfügbaren annehmen,
  dann wieder von vorn. Er unterbricht keine Quest mehr, um zwischendurch eine andere abzugeben.
- In der Map-für-Map-Runde passiert das ohnehin pro Map. Der Haken ist für die Reihenfolge „nächste Aufgabe zuerst“ gedacht.

## 2.20.1 – Nach dem Umkippen weiter bei der Quest
- Nach einem langen Kampf oder nach dem Wiederbeleben hielt der Bot den Weg zurück ins Jagdgebiet fälschlich für
  „nicht erreichbar“. Die Weg-Messung stammte noch von vor dem Kampf. Er übersprang die Quest dann 5 min und fing
  woanders eine andere an. Jetzt beginnt die Messung nach jeder Pause (Kampf, bewusstlos, Laden, Chat) neu.

## 2.20.0 – Erst die Adds, dann der Boss
- Ruft ein Boss Adds, kämpft der Bot zuerst gegen die Adds und geht danach automatisch zurück zum Boss.
- Welche Adds ein Boss ruft, liest der Bot aus den Spieldaten. Beispiele: Apocalymon → Megadramon, MaloMyotismon → Phantomon
  und Illusion Tower, Dark Presence → Ritual Anchor, MarineDevimon → Divermon, Puppetmon → Pumpkinmon,
  Arukenimon/BlackWarGreymon → Golemon.
- In Raid- und Dungeon-Maps (z. B. Kera-Dungeon) zählt zusätzlich jedes normale Monster in der Nähe des Bosses als Add
  (Wellen, Kopien).
- In der Boss-Rotation bleibt alles wie bisher. Auf dem Weg zu einer Abgabe/einem Gespräch jagt der Bot keine Adds.

## 2.19.0 – Markierungen ausweichen (z. B. Apocalymons Big Bang Mark)
- Manche Bosse markieren einen Spieler: Ein Warnkreis folgt ihm, und beim Einschlag bekommt jeder darin Schaden, die
  anderen sogar mehr. Das Ausweichen erkennt diese Markierungen jetzt.
- **Ein anderer ist markiert:** Der Bot geht aus dessen Kreis raus und hält Abstand.
- **Ich bin markiert:** Der Bot läuft von den anderen Spielern weg, damit niemand mit im Kreis steht.
- Gilt mit der Option „Warnkreisen/-strahlen ausweichen“ (Boss-Mechaniken), auch für Mitläufer.

## 2.18.4 – Mitläufer greifen nicht mehr beim Leader mit an
- Mit „🤝 Leader erledigt die Quests der Mitläufer“ zählt für einen Mitläufer nur noch ein Monster als Angreifer, das ihn
  selbst angreift. Bisher galt auch ein Monster, das den Leader in der Nähe angreift, als Angreifer. Dann liefen alle
  hin und schlugen mit.

## 2.18.3 – Mitläufer bleiben wirklich stehen
- Mit „🤝 Leader erledigt die Quests der Mitläufer“ bricht ein Mitläufer jetzt eine noch laufende eigene Aufgabe ab,
  etwa Aufholen oder ein nachgemachtes Gespräch. Er bleibt sofort stehen. Ein angefangener Weg wird gestoppt, statt bis
  zum Ziel weiterzulaufen.

## 2.18.2 – Knopf „👥 Party einladen“
- Neuer Knopf im Gruppen-Reiter: Der Leader lädt sofort alle Gruppenmitglieder in die Party ein, die noch nicht drin
  sind. Die automatische Einladung wartet zwischen zwei Versuchen 30 s, der Knopf nicht. Er geht aus jedem
  Gruppenfenster, auch aus einem Mitläufer-Fenster. Die Mitläufer nehmen automatisch an.

## 2.18.1 – Mitläufer bleiben stehen
- Mit „🤝 Leader erledigt die Quests der Mitläufer“ bleiben die Mitläufer jetzt stehen. Sie folgen nicht, reisen nicht,
  greifen nichts von sich aus an und wehren nur Angreifer ab. Nur der Leader bewegt sich und jagt, was ihnen fehlt.
- Abgeben und Annehmen machst du bei den Mitläufern selbst. Der Knopf „📜 Abgeben & Annehmen“ geht dafür weiterhin.
  Gibt es nichts mehr zu jagen, wartet der Leader, statt die Gruppe zu stoppen.
- Wichtig: Ob Kills des Leaders bei weit entfernt stehenden Mitläufern zählen, hängt von der Party-Reichweite des Spiels ab.

## 2.18.0 – Gruppe: Leader erledigt die Quests der Mitläufer
- Neuer Haken im Gruppen-Reiter: **„🤝 Leader erledigt die Quests der Mitläufer“** (nur im Modus 📜 Quests).
- Der Leader plant dann nur noch mit den Quests der Mitläufer, seine eigenen sind egal. Er jagt, was ihnen fehlt
  (Zähler = der Mitläufer, der am weitesten zurück ist), reist zu ihren Zielen und führt die Gruppe zum NPC.
- Am NPC löst er „Abgeben & Annehmen“ bei den Mitläufern aus: Jeder gibt dort selbst ab, nimmt die nächsten Quests an
  und erledigt Quest-Gespräche. Danach geht es mit der nächsten Mitläufer-Quest weiter. Abgegeben wird, wenn alle
  Mitläufer mit der Quest fertig sind.
- Eigene Quests nimmt der Leader in diesem Modus nicht an.

## 2.17.0 – Gruppe: Abgeben & Annehmen auf dieser Map
- Neuer Knopf im Gruppen-Reiter: **„📜 Abgeben & Annehmen (diese Map)“**. In allen Gruppenfenstern gibt jeder seine
  fertigen Quests auf der aktuellen Map ab und nimmt alle Quests an, die es hier gibt. Jeder arbeitet für sich, ohne auf
  die anderen zu warten. Quests von NPCs auf anderen Maps bleiben liegen.
- Danach geht es weiter wie vorher: Lief der Bot, läuft er im alten Modus weiter, sonst geht er wieder aus. Wechselt
  ein Fenster dabei die Map, bricht es die Runde ab.

## 2.16.1 – Ziele verteilen bleibt beim Leader
- Mit „🎯 Ziele verteilen“ greifen Mitläufer nur noch Monster im Umkreis von 250 px um den Leader an. Vorher suchten
  sie im Suchradius um sich selbst und konnten sich so Kill für Kill von der Gruppe entfernen. Ist in der Nähe des
  Leaders kein freies Monster, helfen sie beim Ziel des Leaders mit.

## 2.16.0 – Gruppe: Ziele verteilen
- Neuer Haken im Gruppen-Reiter: **„🎯 Ziele verteilen: jeder ein anderes Monster“**. Er gilt für die ganze Gruppe.
- Ist er an, hängt sich kein Mitglied mehr ans Ziel des Leaders. Jeder greift ein Quest-Monster an, das noch kein anderes
  Gruppenmitglied angreift. Erwischen zwei dasselbe, weicht der mit der höheren Slot-Nummer auf ein anderes aus,
  solange das Monster noch über 50 % HP hat. Ist keins mehr frei, hilft man mit.
- Bosse greifen weiterhin alle gemeinsam an, Angreifer wehrt jeder selbst ab. Nicht beim Spiegeln und nicht in der Boss-Rotation.

## 2.15.1 – Leader nutzt beim Spiegeln Tränke
- Im Spiegel-Modus (👣 Spiegeln / ⚔️ + Angriff) spielst du den Leader selbst, sein Bot ist aus. Bisher setzten nur die
  Mitläufer ihre Tränke ein. Jetzt nutzt auch der Leader F1–F3 automatisch (nach den Schwellen im Reiter Pflege),
  ebenso den Heil-Skill. Laufen und Angreifen bleiben bei dir. Während du im Chat tippst, passiert nichts.

## 2.15.0 – Channel-Checker
- Neue Option im Reiter Kampf → Zielwahl: **„Channel-Checker: auf den leersten Kanal wechseln“** (standardmäßig aus).
- Kurz nach jedem Map-Wechsel und danach etwa jede Minute schaut der Bot in die Kanalliste der Map. Hat ein anderer Kanal
  nach dem Wechsel mindestens 2 Spieler weniger, wechselt er dorthin. Man selbst zählt dort mit, so gibt es kein Hin und Her.
- Nur außerhalb von Kämpfen und Dialogen. Nicht in der Boss-Rotation und nicht bei Quest-Bossen, dort wählt der Bot den
  Kanal nach den Spawn-Timern. In der Gruppe entscheidet der Leader, die Mitläufer folgen ihm.

## 2.14.2 – Tägliche Quests beim richtigen NPC
- Manche NPCs gibt es mit derselben ID auf mehreren Maps (z. B. Gennai's Hologram), und jeder vergibt nur die Quests
  seiner Map. Der Bot ging bisher zu dem NPC, an dem die Story gerade steht (z. B. Myotismon's Castle), statt zur Map
  der Quest (z. B. Sunset Bay für „Bay Patrol“). Dort versuchte er immer wieder eine Quest anzunehmen, die es da nicht gibt.
  Jetzt gilt die Map, die in der Quest steht (Annehmen und Abgeben, auch bei Mitläufern).
- Die eigene Liste „heute erledigt“ gilt jetzt je Account. Bisher teilten sich alle Accounts eine Liste, und Account B
  übersprang eine Tagesquest, nur weil Account A sie heute schon gemacht hatte.

## 2.14.1 – Ausblenden ohne Sprung in die Adresszeile
- **Alt+D** blendet das Panel aus/ein, ohne dass Chrome zusätzlich in die Adresszeile springt. Neu dazu: **Alt+H** macht dasselbe.

## 2.14.0 – Einstellungen je Account, Account-Wahl loggt ein
- **Einstellungen je Account:** Jeder Account (Login-Name) hat jetzt sein eigenes Profil: Betriebsart, Bosse, Kanäle,
  Digitation, Skills, Heal usw. Die Fenster der Gruppe überschreiben sich nicht mehr gegenseitig. Beim ersten Login
  übernimmt ein Account die bisherigen Einstellungen. Nur die Panel-Ansicht (Reiter, Breite, Kompakt) gilt für alle Fenster.
- **Neuer Tab, anderer Account:** Ein neuer Tab landet in der Charakterauswahl des Accounts, der im anderen Tab
  eingeloggt ist. Wählst du dort im Gruppen-Reiter „Dieses Fenster ist: Account 2“, meldet der Bot ab, loggt Account 2 ein
  und betritt die Welt mit dessen Charakter. Das passiert nur in der Login- oder Charakterauswahl, nie in der Welt.
  Ohne gespeichertes Passwort zeigt er „bitte als … einloggen“.

## 2.13.6 – Boss-Rotation digitiert
- Die Boss-Rotation digitiert zwischen den Kämpfen jetzt in die eingestellte Form (Quest-Reiter → Digitation, auch
  „⬆ höchstmögliche Digitation“). Bisher tat das nur der Autopilot. Im Gruppen-Modus 👑 Bosse digitierten deshalb die
  Mitläufer, der Leader aber nicht.

## 2.13.5 – Boss lebt auf dem anderen Kanal: sofort hin
- Wartet der Bot in der Boss-Rotation auf einem Kanal und meldet der Boss-Timer, dass der Boss auf einem anderen Kanal
  (oder einer anderen Map) lebt oder in wenigen Sekunden spawnt, hört er auf, gegen normale Monster zu kämpfen. Er ruft
  das Digimon zurück und wechselt sofort, auch wenn ihn gerade Monster angreifen. Vorher hielten ihn nachkommende
  aggressive Monster (z. B. in Fog City) bis zu einer Minute auf.
- Gilt nur bei mindestens 50 % HP; darunter wird erst zu Ende gekämpft. Mitläufer im Gruppen-Modus 👑 Bosse hören
  dann ebenfalls auf zu kämpfen und folgen.

## 2.13.4 – Abgabe-Digimon erst beim Quest-Geber
- Mit eingestelltem Abgabe-Digimon läuft der Bot jetzt in seiner aktuellen Form (z. B. Imperialdramon) zum Quest-Geber.
  Erst dort digitiert er zurück, wechselt das Digimon und gibt ab. Bisher passierte das im Map-für-Map-Modus schon vor dem Loslaufen.
- Das Spiel lehnt einen Partner-Wechsel im Kampf und in den 10 s nach dem letzten Wechsel ab. Der Bot wartet das jetzt ab
  (im Kampf ruft er das Digimon zurück), statt es als Fehlversuch zu zählen. Vorher gab er nach 6 abgelehnten Versuchen
  auf und gab mit dem falschen Digimon ab.

## 2.13.3 – Spawn-Schutz in allen Modi
- Die ersten ~3 s nach dem Auftauchen eines Bosses (99 % Schadensreduktion) setzt der Bot keine Skills ein, nur normale
  Angriffe. Das galt bisher nur in der Boss-Rotation und nur für ausgewählte Bosse. Jetzt gilt es für jeden Boss und
  in allen Modi, also auch für die Mitläufer im Gruppen-Modus 👑 Bosse und beim Spiegeln mit Angriff.

## 2.13.2 – Gruppe im Boss-Rotations-Modus starten
- Im Gruppen-Tab gibt es jetzt vier Modi: **📜 Quests**, **👑 Bosse**, 👣 Spiegeln und ⚔️ + Angriff.
- Bei **👑 Bosse** startet ▶ Starten den Leader in der Boss-Rotation (Bosse wie gewohnt im Reiter Bosse auswählen).
  Die anderen Fenster folgen ihm über Maps und Kanäle und kämpfen mit. Quest-Gespräche machen sie dabei nicht nach,
  und verpasste Quests holen sie auch nicht auf.
- Bei **📜 Quests** läuft alles wie bisher (Leader im Autopilot).

## 2.13.1 – Vor Key of Hope sammelt sich die Gruppe beim Clavis
- Sobald ein großer Angriff angesagt wird, meldet der Clavis, der gleich zündet, laufend die Position seines Digimons.
  Er bleibt stehen. Alle anderen Bots der Gruppe (auch Imperialdramon) laufen sofort auf ≤ 80 px an ihn heran,
  statt auszuweichen oder weiterzukämpfen. Das Digimon folgt dem Tamer. Kurz nach dem Einschlag geht es normal weiter.

## 2.13.0 – ClavisAngemon blockt große Raid-Angriffe mit Key of Hope
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

## 2.12.5 – Liegengebliebene NPC-Dialoge schließen
- Nach einem Annehmen oder Abgeben blieb die Folgeseite des NPC-Dialogs offen, wenn der Bot direkt in einen Kampf ging
  (gut bei Mitläufern zu sehen). Jetzt schließt der Bot einen Dialog nach ~1,5 s, wenn er gerade kein Gespräch mit diesem NPC führt.

## 2.12.4 – Gespräche vor Angreifern
- Ein Mitläufer prüft vor jedem neuen Kampf, ob er ein Gespräch des Leaders nachmachen muss (Annehmen, Abgeben, Sprechen).
  Vorher ließ er sich von angreifenden Monstern (z. B. Andromon) in einen Kampf ziehen, statt die Quest anzunehmen.

## 2.12.3 – Hängende Dialogseite
- Bleibt ein NPC-Dialog auf einer veralteten Seite stehen, spricht der Bot den NPC nach 2 wirkungslosen Klicks neu an.
  Vorher klickte er bis zu 6-mal dieselbe Auswahl.

## 2.12.2 – Keine sinnlosen Annahme-Versuche, fehlende Story-Quests nachholen
- Ein Mitläufer macht ein Annehmen des Leaders nur noch nach, wenn der NPC ihm die Quest auch anbietet (Vorquests erledigt,
  Level reicht). Vorher versuchte er es ~15-mal und gab nach ~14 s auf. Der Leader wartete in der Zeit auf ihn.
- **Fehlende Story-Quests nachholen:** Hat der Leader eine Story-Quest schon abgeschlossen, die der Mitläufer verpasst hat,
  nimmt der Mitläufer sie an, erledigt sie und gibt sie ab. So reißt die Quest-Kette nicht ab (z. B. „Word to Gennai“ →
  „The Assembly Hall“).

## 2.12.1 – Mitläufer holen auch im Jagdgebiet auf
- Mitläufer prüfen jetzt **vor jedem neuen Kampf**, ob ein Gespräch des Leaders nachzumachen oder eine Quest aufzuholen ist.
  Vorher passierte das nur, wenn kein Monster in der Nähe war. In Jagdgebieten mit ständig neuen Monstern kam ein
  Mitläufer nie dazu. Beispiel: Fumiko behielt „The Beach Guardian“ fertig, gab sie aber nie ab.

## 2.12.0 – Höchste Digitation, Skills je Form, Beute & Verbrauch
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

## 2.11.7 – Boss-Liste mit Suche
- Im Reiter Bosse unter „Bosse auswählen“ gibt es ein **Suchfeld**, das nach Boss- oder Map-Namen filtert.
- Die Liste hat eine **feste Höhe** und wird mit dem **Balken rechts** gescrollt. Das Panel wächst nicht mehr nach unten.
- Alle scrollbaren Listen haben schlanke, gut sichtbare Scrollbalken.

## 2.11.6 – Kein Kanal-Pingpong bei Boss-Quests
- **Neuer Kanal ist nicht automatisch frisch:** Der Bot merkt sich den Boss-Timer pro Kanalnummer, auch wenn der Kanal
  schließt, sobald niemand mehr drauf ist. Ein neu geöffneter Kanal mit bekanntem Timer wird nicht mehr als „Boss frisch“
  gewertet. Vorher wechselte die Gruppe bei Phantomon ständig Ch 1 ↔ Ch 2.
- **Keine falsche 5-min-Sperre mehr:** Der Zähler für fehlgeschlagene Kanalwechsel wird nach jedem erfolgreichen Wechsel
  zurückgesetzt. Vorher wurde nach einigen Wechseln Ch 1 fälschlich gesperrt („Wechsel klappt nicht“), und die Gruppe
  blieb auf dem Kanal mit dem späteren Respawn.

## 2.11.5 – Zusammen losreisen
- Macht ein Mitläufer gerade **dasselbe** Gespräch nach wie der Leader (gleiches Ziel), wartet der Leader nicht mehr
  „vor dem Map-Wechsel“ auf ihn. Beide reisen gleichzeitig. Vorher lief der Mitläufer vor und der Leader kam ~25 s später.
- Die Regel „nicht allein vorlaufen“ (2.11.3) gilt jetzt auch, während der Leader gerade eine Map lädt.

## 2.11.4 – Kein falsches Aufholen
- Der Leader meldet jetzt auch seine **abgeschlossenen** Quests. Ein Mitläufer holt eine Quest nur noch allein nach, wenn
  der Leader sie wirklich abgeschlossen hat.
- Vorher reichte „Leader hat sie nicht aktiv“, das gilt aber auch, wenn er sie erst noch annimmt. So erledigte z. B.
  Marcus „The Supply Line“ komplett allein, bevor Spencer sie überhaupt angenommen hatte.

## 2.11.3 – Mitläufer laufen nicht mehr allein vor
- Wählt der Leader ein Gespräch auf einer **anderen Map**, während er noch beim Mitläufer steht, läuft der Mitläufer nicht
  mehr allein los. Er meldet „gesehen“, damit der Leader nicht wartet, und folgt ihm.
- Erst wenn der Leader die Map gewechselt hat, übernimmt der Mitläufer das Gespräch. Beide reisen also zusammen.
- Vorher wartete der Leader auf den beschäftigten Mitläufer, der Mitläufer lief allein vor, dann zurück, und beide
  trafen sich wieder.

## 2.11.2 – Boss-Quest: kürzester Respawn wie in der Boss-Rotation
- Ist der Boss einer Quest nicht da, schätzt der Autopilot für jeden Kanal, wann er kämpfbar ist:
  - lebt: sofort
  - tot: Respawn-Timer aus Boss-Fenster/Map-Info oder eigenem Sieg
  - unbekannt: einmal nachsehen
  - neuer Kanal: spawnt frisch
- Er wartet auf dem schnellsten Kanal und wechselt nur, wenn ein anderer deutlich schneller ist (>15 s). Kein Hin-und-her mehr.
- Die Statuszeile zeigt z. B. „warte auf Mammothmon (Ch 2: Respawn in 3:40)“.
- Log der Boss-Rotation korrigiert: Ch 2 lässt sich immer öffnen, erst ab Ch 3 müssen die anderen Kanäle fast voll sein.

## 2.11.1 – Boss-Quest: Ch 2 selbst öffnen
- Ist ein Feldboss auf Ch 1 tot und gibt es keinen anderen Kanal, öffnet der Autopilot Ch 2 selbst. Das Spiel erlaubt
  immer mindestens 2 Kanäle, ab Ch 3 erst bei ~90 % Auslastung. Die Mitläufer wechseln automatisch mit.

## 2.11.0 – Übersichtlicheres Panel und Heil-Skills
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

## 2.10.8 – Leader wartet nicht mehr grundlos
- **„Kämpft gerade“ nur bei echtem Kampf:** Das Kampf-Flag des Spiels bleibt nach einem Kampf noch einige Sekunden
  stehen. Deshalb wartete der Leader vor Abgaben 4–10 s auf einen Mitläufer, der längst zum NPC unterwegs war. Jetzt
  zählt nur ein laufender Angriff oder ein Monster, das gerade angreift. Wer zu einem Gespräch unterwegs ist, kämpft nicht.
- **Leader stoppt die Gruppe nicht mehr zu früh:** Hat er nichts mehr zu tun, hält aber eine Abgabe für einen Mitläufer
  zurück, wartet er, statt mit „keine machbaren Quests“ alle Bots zu stoppen.

## 2.10.7 – Boss-Quests: andere Kanäle prüfen
- Verlangt eine Quest einen Feldboss (z. B. Andromon, Respawn 10 min) und ist er am Spawnpunkt nicht da, wartet der
  Autopilot 20 s und prüft dann der Reihe nach die anderen freien Kanäle, je 20 s.
- Mitläufer wechseln automatisch mit, weil sie dem Kanal des Leaders folgen.
- Sind alle Kanäle geprüft, wartet er normal weiter.

## 2.10.6 – Zonenziele und Aufholen in der Gruppe
- **Zonen-/Reiseziele werden mitgemacht:** Geht der Leader für ein Quest-Ziel in eine Zone (z. B. „The Assembly Hall“ →
  Bereich *assembly*), laufen die Mitläufer selbst hinein. Vorher zählte das Ziel nur für den, der zufällig drinstand.
  Die Mitläufer konnten dann die Folgequests nicht annehmen, und die Gruppe lief auseinander.
- **Leader gibt erst ab, wenn alle das Zonen-/Gesprächsziel haben.** Er wartet dafür höchstens 5 min.
- **Aufholen:** Ist der Leader bei einer Quest schon weiter, erledigt ein Mitläufer das Gespräch, die Zone oder die
  Abgabe selbst. Quests, die der Leader aktiv hat, der Mitläufer aber noch nicht, nimmt dieser von sich aus an.

## 2.10.5
- **Mitläufer digitieren:** Zwischen den Kämpfen digitieren Mitläufer in die Zielform aus den Autopilot-Einstellungen
  (z. B. Patamon → Angemon), wenn ihr eigenes Digimon diese Form freigeschaltet hat. Sonst bleiben sie, wie sie sind.

## 2.10.4 – Jagd-Logik und Gruppe aus dem Live-Test
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

## 2.10.3 – Wandernde NPCs, ruhigere Mitläufer
- **NPCs mit wechselndem Standort:** Manche NPCs (z. B. Leomon, Wizardmon, Gennai-Hologramm, insgesamt rund 20)
  stehen je nach Quest-Stand an einem anderen Punkt der Map. Der Autopilot liest diese „Stationen“ aus den Spieldaten
  und geht zum richtigen Punkt. Vorher suchte er am Standardplatz und meldete „Leomon ist nicht da“.
- **Mitläufer übernehmen die Beute des Leaders in jedem Takt.** Jagt der Leader gerade nicht, z. B. weil er vor einer
  Abgabe auf das Kampfende wartet, fangen sie keine neuen Kämpfe an, sondern wehren nur noch ab. Vorher kämpften sie
  weiter, und der Leader wartete bis zu 2 min.

## 2.8.3 – Unterwegs keine Kämpfe
- Auf dem Weg zum **Annehmen, Abgeben, Sprechen** und zu **Reise-Zielen** (auch über mehrere Maps) ignoriert der
  Autopilot alle Angreifer: Digimon zurückrufen und weiterlaufen. Gekämpft wird nur noch beim Jagen.

## 2.8.2 – Jagdgebiete
- **Bosse nur als letzte Quelle:** Für Sammel-Items wählt der Autopilot normale Monster. Feldbosse (stark, lange
  Respawn-Zeit) nur, wenn es keine andere Quelle gibt. Verlangt eine Kill-Quest genau den Boss, bleibt er das Ziel.
- **Zonen mit mehreren passenden Arten** werden bevorzugt (mehr mögliche Ziele).
- **Leeres Jagdgebiet:** Kommt 90 s lang kein passendes Monster, meidet der Bot das Gebiet 5 min und geht zum
  nächstbesten mit derselben Beute, statt die Aufgabe abzubrechen.

## 2.8.0
- **Runde startet an der Start-Map:** Bei jedem Bot-Start beginnt die Map-für-Map-Runde an der eingestellten Start-Map
  (vorher wurde der Fortschritt des letzten Laufs weitergeführt). Überspringt der Bot eine Map, steht der Grund im Log,
  z. B. „3× heute schon erledigt, 1× Level zu niedrig“.
- **Abgabe ohne Kämpfe:** Ist als Nächstes eine Abgabe dran, kämpft der Autopilot nicht mehr – auch nicht gegen
  Angreifer. Er ruft das Digimon zurück und läuft zum NPC.
- **Ablehnungen des Spiels:** Meldet das Spiel „Your partner cannot reach that target.“ (unreachable) oder
  „Too far away.“ (not_in_range), reagiert der Bot sofort. Bei „cannot reach“ wechselt er ab 2.8.1 erst die Position:
  erst seitlich vom Ziel, dann auf dessen Rückseite (je ~50 px, nur begehbare Punkte mit echtem Weg), und greift neu an.
  Erst nach dem dritten Fehlschlag wird das Ziel 1 min gesperrt. Bei „Too far away“ geht er näher heran. „You cannot fight here.“ (safe_zone) führt aus der Schutzzone.

