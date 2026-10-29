# Fehler in den Spieldaten von Digi MMO

Stand: Spieldaten-Hash 0565f3e2 (content-Bz3rP3OW.js), geprüft am 28.10.2026 im laufenden Client.
Jeder Punkt wurde von drei unabhängigen Prüfern nachgerechnet; aufgeführt ist nur, was mindestens zwei bestätigt haben.

## Hoch

### 1. Evil-Ring-Monster im Digi-Egg Valley haben rund 10-fachen Angriff
Betroffen: `kokuwamon_ring`, `gekomon_ring`, `mojyamon_ring`, `kuwagamon_ring`, `deltamon_ring` (Karte `egg_valley`, Zonen creek, outcrops, dig_site).

| Monster | base.at / growth.at | Normalform | andere Ring-Monster |
|---|---|---|---|
| kokuwamon_ring | 363 / 54,2 | kokuwamon 35 / 5,1 | gazimon_ring 84 / 12,2 |
| gekomon_ring | 334 / 50,2 | gekomon 45 / 6,6 | guardromon_ring 101 / 14,4 |
| mojyamon_ring | 353 / 49,5 | mojyamon 38 / 5,4 | mekanorimon_ring 102 / 14,6 |
| kuwagamon_ring | 359 / 50,5 | kuwagamon 39 / 5,8 | gesomon_ring 87 / 12,4 |
| deltamon_ring (Boss) | 315 / 45,2 | deltamon 172 / 25,6 | |

Nur Angriff und Angriffswachstum sind betroffen, HP, Verteidigung und Belohnungen sind normal für die Stufe. Angriff auf Spawnstufe: kokuwamon_ring Lv 11 = 905, Feldmonster gleicher Stufe sonst etwa 86 bis 121. Dazu kommt der Zonenbonus at ×1,37 bis ×1,46. Sieht nach einer verrutschten Kommastelle aus. Die Wiese derselben Karte (koromon_ring, pagumon_ring) ist normal.

Folge: Ein Partner auf Lv 11 bis 16 fällt nach zwei bis drei Treffern. Die Karte ist auf ihrer Zielstufe kaum spielbar.

### 2. Portal-Mindeststufen in Abenteuer 1 liegen über dem Stufenbereich der Zielkarte

| Portal | minLevel | levelRange Ziel |
|---|---|---|
| factorial_town → gear_savanna | 19 | 14–17 |
| gear_savanna → toy_town | 23 | 17–19 |
| gear_savanna → freezeland | 25 | 19–21 |
| freezeland → overdell | 31 | 21–23 |
| overdell → server_desert | 34 | 23–25 |
| server_desert → myotismon_keep | 35 | 25–33 |

Bei allen anderen Portalen gilt minLevel = Untergrenze der Zielkarte minus 2 (z. B. native_forest → factorial_town 9 bei 11–14, tower_forest → holy_peaks 67 bei 69–75). Folge: Man kommt erst auf eine Karte, wenn man ihre Monster und den Boss schon um 2 bis 8 Stufen überholt hat.

### 3. Apocalymon's Realm: Portal verlangt Stufe 99, Karte und Boss sind Stufe 50–55
Portal `spiral_summit` → `apocalymon_realm` hat minLevel 99. `apocalymon_realm` hat levelRange 50–55, Boss `apocalymon` Lv 55, Adds Lv 55. Die Spiral-Kette läuft 41–45, 45–49, 49–53, 53–56, erwartet wären etwa 53. Die Quest `q22_apocalymon` (minLevel 50) verlangt den Kill, ist mit dem Portal also erst ab 99 machbar.

## Mittel

### 4. Apocalymons „Mirror of Grudges“ wirft 700 % zurück, der Text sagt „doppelt so hart“
`apocalymon.grudge_mirror`: reflect pct 700, 3 s, Text „any blow struck at it comes back twice as hard“. Das baugleiche `malomyotismon.dream_mirror` hat pct 200 bei gleichem Text. Andere Spiegel: 170 bis 250 %. Vermutlich 200 gemeint.

### 5. Angewomon: Angriffswachstum kleiner als bei der Vorstufe Gatomon
`angewomon` at 650 / growth 23,6, `gatomon` at 185 / growth 27,7. Einzige Entwicklung im Spiel, deren growth.at unter der Vorstufe liegt. Auf Lv 99: Angewomon 2963 AT, Gatomon 2900, andere Ultimates 4053 bis 6485 (Lillymon 4725, MagnaAngemon 4053, Silphymon 6485). Verhältnis Basis zu Wachstum 27,5, bei allen anderen Partner-Ultimates 6,9 bis 10,2. Sieht nach verdrehten oder falsch skalierten Zahlen aus.

### 6. Zwei verschiedene Nebenquests bei Gennai (Hologramm) heißen beide „Reef Patrol“
`gennai_holo` zeigt zweimal „Reef Patrol: count me in.“ und zweimal „Reef Patrol: done!“ (`s_reef_patrol`, `s_divermon`). Beide in spiral_sea, gleiche Vorbedingung `q18e_diver_squads`, aber andere Ziele: 8 Gesomon + 8 Divermon gegen 15 Divermon. Einzige Doppelbeschriftung unter allen 142 NPCs. `s_divermon` braucht einen eigenen Namen.

## Niedrig

### 7. Stufenbereich von Digi-Egg Valley passt nicht zu den Spawns
`egg_valley` levelRange 15–31, die Wiese spawnt aber Lv 1–8 und der Bach Lv 11–18. Bei 37 von 40 Karten ist die Untergrenze genau die niedrigste Spawnstufe.

### 8. 22 Trainingskarten ohne Bezugsquelle
`card_tamers_cherrymon`, `card_tamers_chrysalimon`, `card_tamers_divermon`, `card_tamers_goburimon`, `card_tamers_infermon`, `card_tamers_megadramon`, `card_tamers_meramon`, `card_tamers_metalseadramon`, `card_tamers_skullmeramon`, `card_jagamon`, `card_makuramon` und ihre `_rare`-Varianten. Sie stehen in keiner Droptabelle, keinem Shop, keiner Quest, keiner Daily und keiner Sammlung. Die zugehörigen Monster erscheinen auf keiner Karte (tamers_megadramon nur als Boss-Add).

### 9. Quest-Item „Gekomon Horn“ ist verwaist
`tamers_gekomon_horn` (kind quest, „A spare musical horn from the Gekomon settlement.“) wird von nichts fallen gelassen und von keiner Quest verlangt oder vergeben. Alle anderen Quest-Items haben Quelle und Ziel. Vermutlich Rest einer Sumpf-Quest (a3s_marsh_*).

## Live beobachtet (nicht aus den Daten)

### 10. Gankoomon-Jagd: Schutzmechanik nirgends erklärt
`gankoomon_hunt` ruft bei 50 % und 25 % je drei `hinukamuy` (Lv 75, 427 844 HP). Solange einer lebt, werden alle Treffer am Boss geblockt. Der Boss zeigt dabei keinen Hinweis (keine Markierung „unangreifbar“), und im Beschreibungstext der Jagd steht nichts dazu. Falls gewollt: ein sichtbarer Hinweis am Boss wäre sinnvoll.

(Bereits bekannt und deshalb nicht aufgeführt: überhöhter Brandschaden der Jagd-Marsmon.)
