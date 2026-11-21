// 3.2.40 (Nutzer 20.11.): Rift – beim Ausweichen „immer nur hinten in den Bereich, wo er gerade herkommt, nicht nach vorne, wo
// potentiell noch mehr Gruppen stehen“. Der Bot läuft von West nach Ost (Spur), dann liegt ein Warnkreis um ihn:
//  A: Rift  -> Fluchtpunkt liegt hinter ihm (westlich, x < Startpunkt).
//  B: mit Spur von Ost nach West -> Fluchtpunkt östlich (Gegenprobe: Richtung folgt der Spur, nicht fest Westen).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

async function run(dir) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  C.spawns.native_forest.raid = { id: 'rift', rift: true };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  const taps = [];
  scene.tapGround = (x, y) => taps.push({ x, y });
  scene.controlledId = () => 't:me';
  scene.telegraphs = { active: [], circles: [] };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {} };
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 100, tab: 'log' }));
  w.eval(script);
  await wait(600);
  w.document.querySelector('[data-act="bot"]').click();
  const t = F.ents.get('t:me'), p = F.ents.get('p:me');
  // Spur: 2,4 s lang 300 -> 1000 px/… in Laufrichtung
  const x0 = dir > 0 ? 300 : 900, x1 = 600;
  for (let i = 0; i <= 12; i++) { const x = x0 + (x1 - x0) * i / 12; t.x = x; t.y = 600; p.x = x + 8; p.y = 600; await wait(200); }
  const t0 = w.performance.now();
  scene.telegraphs.active = [{ x: x1, y: 600, r: 70 }]; scene.telegraphs.circles = [{ x: x1, y: 600, r: 70, end: t0 + 3000 }];
  for (let i = 0; i < 15 && !taps.length; i++) await wait(100);
  w.close();
  return { tap: taps[0] || null };
}

(async () => {
  const a = await run(1);
  check('A', !!a.tap && a.tap.x < 600 - 20, `kam von Westen – weicht nach Westen aus (x ${a.tap?.x})`, () => `Fluchtpunkt ${a.tap ? `${a.tap.x}/${a.tap.y}` : '–'}`);
  const b = await run(-1);
  check('B', !!b.tap && b.tap.x > 600 + 20, `kam von Osten – weicht nach Osten aus (x ${b.tap?.x})`, () => `Fluchtpunkt ${b.tap ? `${b.tap.x}/${b.tap.y}` : '–'}`);
  process.exit(res.every(Boolean) ? 0 : 1);
})();
