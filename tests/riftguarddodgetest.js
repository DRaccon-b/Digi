// 3.2.55 (Nutzer 24.11.): Option „Rift: nur beim Guardian ausweichen“ – im Digital Rift den Warnkreisen normaler Gegner nicht
// ausweichen, denen des Endbosses (Guardian, letzte Etage, gerufen) schon – auch wenn „Ausweichen“ sonst aus ist.
// A: Option an, Ausweichen aus, Kreis des Guardians um mich -> weicht aus.
// B: Option an, Ausweichen aus, Kreis eines normalen Gegners -> weicht nicht aus.
// C: Option an, Ausweichen an, Kreis eines normalen Gegners -> weicht nicht aus (im Rift nur der Guardian).
// D: Option aus, Ausweichen aus, Guardian-Kreis -> weicht nicht aus (wie bisher).
// E: Option aus, Ausweichen an, normaler Gegner -> weicht aus (wie bisher).
// G (Review): Guardian gerufen, aber der Kreis kommt von einem Boss-Flag-Monster weit weg von der Guardian-Arena (Alpha auf einer
//    Purge-Etage) -> nicht ausweichen; steht die Quelle an der Arena -> ausweichen.
// H (Review): Spiel schickt keine Etage mit (run.floor fehlt), Guardian gerufen -> trotzdem ausweichen.
// F: Option an, Ausweichen aus, Alpha (Boss-Flag) auf Etage 1 -> weicht nicht aus (nur der Guardian zählt).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run({ opt, dodge, guardian, floor = 3, called = true, arena = null, noFloor = false }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  C.spawns.native_forest.raid = { id: 'rift', rift: true }; // Karte gilt als Rift
  const taps = [];
  scene.tapGround = (x, y) => taps.push({ x, y });
  scene.controlledId = () => 'p:me';
  scene.telegraphs = { active: [], circles: [] };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {} };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge, riftDodgeGuardian: opt, lvlDiff: 100, dungeon: true, dgMode: 'rift', tab: 'log' }));
  const run = { depth: 5, running: true, signal: floor === 3 ? 100 : 20, clockMs: 400000, ...(noFloor ? {} : { floor: { n: floor, of: 3 } }), portal: { open: false }, guardian: called ? 'called' : 'hidden', objective: 'hunt', alphaMarks: [] };
  w.dmo.rift = { getState: () => ({ run, result: null, patch: null, floorUi: { going: null } }) };
  if (arena) scene.riftFog = { rift: { layout: { cells: [], guardian: arena } } };
  w.eval(script);
  await wait(600);
  const t0 = w.performance.now();
  // Quelle des Kreises: Guardian/Alpha (Boss-Flag) oder normaler Gegner – steht neben mir und greift mich an
  F.E({ id: 'm:src', kind: 2, defId: 'kunemon', level: 4, x: 560, y: 470, targetId: 'p:me', flags: guardian ? 16 | 32 : 32, hp: 9000, maxHp: 9000 });
  F.store.setState({ target: F.toTarget('m:src') });
  scene.telegraphs.active = [{ x: 500, y: 500, r: 60, skill: 'x.slam' }];
  scene.telegraphs.circles = [{ x: 500, y: 500, r: 60, end: t0 + 2500, src: 'm:src', skill: { id: 'x.slam' } }];
  w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  const r = { taps: taps.length, st: w.document.querySelector('[data-f="status"]').textContent.slice(0, 80) };
  w.close();
  return r;
}
(async () => {
  const res = [];
  const ck = (id, ok, txt, info) => { res.push(ok); console.log(`${ok ? 'OK    ' : 'FEHLER'} ${id}: ${txt}`, ok ? '' : JSON.stringify(info)); };
  const A = await run({ opt: true, dodge: false, guardian: true });
  ck('A', A.taps > 0, 'Option an, Ausweichen aus: Guardian-Kreis -> ausweichen', A);
  const B = await run({ opt: true, dodge: false, guardian: false });
  ck('B', B.taps === 0, 'Option an, Ausweichen aus: normaler Gegner -> nicht ausweichen', B);
  const Cc = await run({ opt: true, dodge: true, guardian: false });
  ck('C', Cc.taps === 0, 'Option an, Ausweichen an: normaler Gegner im Rift -> nicht ausweichen', Cc);
  const D = await run({ opt: false, dodge: false, guardian: true });
  ck('D', D.taps === 0, 'Option aus, Ausweichen aus: wie bisher kein Ausweichen', D);
  const E = await run({ opt: false, dodge: true, guardian: false });
  ck('E', E.taps > 0, 'Option aus, Ausweichen an: wie bisher ausweichen', E);
  const Fa = await run({ opt: true, dodge: false, guardian: true, floor: 1, called: false });
  ck('F', Fa.taps === 0, 'Option an: Alpha (Boss-Flag) auf Etage 1 zählt nicht als Guardian', Fa);
  const G1 = await run({ opt: true, dodge: false, guardian: true, arena: { x: 1500, y: 1500 } });
  ck('G1', G1.taps === 0, 'Boss-Flag weit weg von der Guardian-Arena: kein Ausweichen', G1);
  const G2 = await run({ opt: true, dodge: false, guardian: true, arena: { x: 600, y: 500 } });
  ck('G2', G2.taps > 0, 'Quelle an der Guardian-Arena: ausweichen', G2);
  const H = await run({ opt: true, dodge: false, guardian: true, noFloor: true });
  ck('H', H.taps > 0, 'ohne Etagenangabe, Guardian gerufen: ausweichen', H);
  console.log(res.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(res.every(Boolean) ? 0 : 1);
})();
