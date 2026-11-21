// 3.2.48: Warnkreise, deren Endzeit schon über 600 ms vorbei ist (das Spiel lässt sie ohne Einschlag-Ereignis bis zu 1,5 s stehen),
// gelten mit der Option „Abgelaufene Warnkreise nicht mehr meiden“ (dodgeCircleTail) nicht mehr als Gefahr.
//  T1: Option an, Kreis seit 900 ms abgelaufen, ich stehe darin -> kein Ausweichen.
//  T0: Option aus (Standard) -> wie bisher ausweichen.
//  T2: Option an, Kreis läuft noch (Ende in 2 s) -> ausweichen.
//  T3 (Review): Option an, abgelaufener Kreis mit Inseln (sicherer Platz) -> weiter meiden (Ausnahme), ausweichen.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };
async function run({ on, endIn, isl = false }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world');
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  const taps = [];
  scene.tapGround = (x, y) => taps.push({ x, y });
  scene.controlledId = () => 'p:me';
  scene.telegraphs = { active: [], circles: [] };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {} };
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 100, radius: 60, tab: 'log', dodgeCircleTail: on }));
  w.eval(script);
  await wait(600);
  w.document.querySelector('[data-act="bot"]').click();
  await wait(300);
  // Endzeit wird mit der Zeit nachgezogen: „seit 900 ms abgelaufen“ bleibt während der Messung so
  const sk = isl ? { skill: 'isl' } : {}, raw = isl ? { skill: { id: 'isl', islands: true } } : {};
  const iv = w.setInterval(() => { const e = w.performance.now() + endIn; scene.telegraphs.active = [{ x: 500, y: 500, r: 50, ...sk }]; scene.telegraphs.circles = [{ x: 500, y: 500, r: 50, end: e, src: 'm:x', ...raw }]; scene.telegraphs.islands = []; }, 20);
  await wait(1200);
  w.clearInterval(iv); w.close();
  return taps.length;
}
(async () => {
  const t1 = await run({ on: true, endIn: -900 });
  check('T1', t1 === 0, 'abgelaufener Kreis: kein Ausweichen', () => `${t1} Fluchtklicks`);
  const t0 = await run({ on: false, endIn: -900 });
  check('T0', t0 > 0, 'Option aus: weicht wie bisher aus', () => 'kein Fluchtklick');
  const t2 = await run({ on: true, endIn: 2000 });
  check('T2', t2 > 0, 'laufender Kreis: weicht aus', () => 'kein Fluchtklick');
  const t3 = await run({ on: true, endIn: -900, isl: true });
  check('T3', t3 > 0, 'Kreis mit Inseln: Ausnahme, weicht aus', () => 'kein Fluchtklick');
  process.exit(res.every(Boolean) ? 0 : 1);
})();
