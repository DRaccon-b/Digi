// 3.2.53: Beelzemon-Raid solo (Nutzer 23.11.): Clown Trick gegen Heartbreak Shot (seit 3.2.15), Tamer Hikari (Crest of Light:
// Debuffs entfernen + 12 s Schutz vor neuen) statt Iori. Darkness Claw hinterlässt „Wunde“ (halbe Heilung bis voll/gereinigt):
// erst Hikari reinigt, dann wird geheilt – nicht vorher den Trank zur Hälfte verschwenden.
// A: Geteilter Treffer markiert mich (Status „shared“) – Hikari wird NICHT dafür verbraucht.
// B: Wunde, HP 50 % (unter der Trank-Schwelle 70 %), Hikari bereit – zuerst Crest of Light, kein F1 davor.
// C: Wunde gereinigt – jetzt F1.
// D: Wunde, Hikari auf Abklingzeit – F1 sofort (kein Warten).
// E: Wunde, HP 20 % (kritisch), Hikari bereit – F1 sofort.
// F: Hikari bestätigt nicht (Wunde bleibt) – höchstens 3 s warten, dann trotzdem F1.
// G (Review): unbestätigter Druck sperrt die Wunde nicht – der Tamer-Skill wird nach ~3 s erneut gedrückt.
// H (Review): Reinigen gewirkt (Abklingzeit läuft), 6 s später neue Wunde bei bereitem Hikari – sofort wieder Crest of Light
//    (die alte Prüfung darf die neue Wunde nicht als „nicht entfernbar“ sperren).
// I (Nachprüfung): das Spiel meldet die Abklingzeit 600 ms vor dem Entfernen der Wunde – kein Trank dazwischen.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const W = makeWorld({ slot: 0, tag: 'H', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'tamers_beelzemon', x: 360, y: 330, hp: 900000, maxHp: 900000, level: 121, flags: 16 | 8, targetId: 'p:me' }] : []),
  setup({ content }) {
    content.digimon.tamers_beelzemon = { name: 'Beelzebumon', radius: 7, skills: [] };
    content.tamers = { kari: { id: 'kari', name: 'Hikari', skill: { id: 'tamer.light', name: 'Crest of Light', scope: 'party', cooldownMs: 60000, cleanse: true, wardMs: 12000 } } };
    content.items = { ...(content.items || {}), hp_potion: { id: 'hp_potion', name: 'Heiltrank' } };
  } });
W.handlers = {};
W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 70, dsPot: 0, tdsPot: 0, tab: 'log', tamerAuto: true }));
const perf = () => W.w.performance.now();
const me0 = W.store.getState().me;
const hotbar = ['cmd:attack', '', '', '', '', '', '', '', 'item:hp_potion'];
W.store.setState({ me: { ...me0, tamerId: 'kari', hotbar, inventory: [{ itemId: 'hp_potion', qty: 50 }], partner: { ...me0.partner, hp: 10000, maxHp: 10000, skills: [] } },
  target: { id: 'boss:1', kind: 'mob', name: 'Beelzebumon', level: 121, hp: 900000, maxHp: 900000, flags: 24 } });
const calls = [], pots = [];
let okMode = false; // true: der Druck wirkt (Abklingzeit startet, Wunde weg); 'split': erst Abklingzeit, Wunde 600 ms später weg
W.w.dmo.game.scene.getScene('world').deps.commands.tamerSkill = () => { calls.push(Date.now()); if (okMode === 'split') { setFx(wound(), 60000); setTimeout(() => setFx([], 60000), 600); } else if (okMode) setFx([], 60000); };
W.w.addEventListener('keydown', (e) => { if (e.code === 'F1') pots.push(Date.now()); }, true);
const setP = (o) => { const s = W.store.getState(); W.store.setState({ me: { ...s.me, partner: { ...s.me.partner, ...o } } }); };
const setFx = (list, tamerCd) => W.store.setState({ effects: { 'p:me': list }, cooldowns: { tamer: { end: perf() + (tamerCd || -1) } } });
const wound = () => [{ id: 'wounded', end: 0 }];
W.w.eval(script);
const results = [];
const check = (name, ok, info) => { results.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const log = () => W.w.document.querySelector('.digibot__log')?.textContent || '';
(async () => {
  await wait(1200);
  W.w.document.querySelector('[data-act="bot"]').click();
  await wait(800);
  const reset = async () => { setFx([], 0); setP({ hp: 10000 }); await wait(2300); }; // volle HP, Trank-Sperre (2 s) abgelaufen
  // A
  setFx([{ id: 'shared', end: perf() + 5000 }]);
  await wait(1500);
  check('A: geteilter Treffer (shared) – Hikari nicht verbraucht', calls.length === 0, `${calls.length} Aufrufe · ${W.status()}`);
  await reset();
  // B
  setFx(wound()); setP({ hp: 5000 });
  const tB = Date.now();
  await wait(900);
  const potB = pots.filter((t) => t >= tB);
  check('B: Wunde, HP 50 %, Hikari bereit – erst Crest of Light, kein Trank davor', calls.length === 1 && potB.length === 0 && /Wunde: Trank wartet/.test(log()), `${calls.length} Crest · ${potB.length} Tränke · ${log().slice(0, 200)}`);
  // C
  setFx([], 60000);
  const tC = Date.now();
  await wait(700);
  check('C: Wunde gereinigt – jetzt Trank', pots.some((t) => t >= tC), `${pots.filter((t) => t >= tC).length} Tränke`);
  await reset();
  // D
  setFx(wound(), 50000); setP({ hp: 5000 });
  const tD = Date.now(), cD = calls.length;
  await wait(700);
  check('D: Wunde, Hikari auf Abklingzeit – Trank sofort', pots.some((t) => t >= tD) && calls.length === cD, `${pots.filter((t) => t >= tD).length} Tränke · ${calls.length - cD} Crest`);
  await reset();
  // F: Hikari gedrückt, aber die Wunde bleibt (keine Abklingzeit) – höchstens ~3 s warten
  setFx(wound()); setP({ hp: 5000 });
  const tF = Date.now();
  await wait(1100);
  const early = pots.filter((t) => t >= tF).length;
  await wait(2600);
  const late = pots.filter((t) => t >= tF).length;
  check('F: Crest ohne Wirkung – höchstens ~3 s warten, dann trotzdem Trank', early === 0 && late > 0, `früh ${early} · später ${late}`);
  const cF = calls.filter((t) => t >= tF).length;
  check('G: unbestätigter Druck – Tamer-Skill erneut gedrückt', cF >= 2, `${cF} Drücke`);
  await reset();
  // H
  okMode = true; setFx(wound()); setP({ hp: 5000 });
  await wait(800);
  const cH0 = calls.length;
  await wait(5500); // Reinigung bestätigt, Prüfung verfällt
  okMode = false; setP({ hp: 5000 }); setFx(wound()); // Abklingzeit vorbei (Test), neue Wunde
  const tH = Date.now();
  await wait(900);
  check('H: neue Wunde nach erfolgreichem Reinigen – Crest of Light erneut, kein Trank davor', calls.length > cH0 && !pots.some((t) => t >= tH && t < tH + 800), `${calls.length - cH0} Crest · ${pots.filter((t) => t >= tH).length} Tränke`);
  await reset();
  await reset();
  // I
  okMode = 'split'; setFx(wound()); setP({ hp: 5000 });
  const tI = Date.now(), cI = calls.length;
  await wait(1500);
  const pressI = calls.find((t, i) => i >= cI);
  const potsI = pots.filter((t) => t >= tI);
  check('I: Abklingzeit vor dem Entfernen gemeldet – Trank erst nach der Reinigung', !!pressI && potsI.length > 0 && potsI[0] >= pressI + 550, `Druck ${pressI ? pressI - tI : '–'} ms · Trank ${potsI.length ? potsI[0] - tI : '–'} ms`);
  okMode = false;
  await reset();
  // E
  setFx(wound()); setP({ hp: 2000 });
  const tE = Date.now();
  await wait(700);
  check('E: Wunde, HP 20 % (kritisch) – Trank sofort', pots.some((t) => t >= tE), `${pots.filter((t) => t >= tE).length} Tränke`);
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
