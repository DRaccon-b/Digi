// 2.36.0: Lange Ansagen – weiterkämpfen und erst spät (Laufzeit × 1,5 + 1,5 s vor dem Einschlag) herauslaufen;
// raumweite Kreise (Marsmons Corona Sanctions, 400 px) auch aus dem Nahkampf verlassen, wenn die Zeit reicht
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(circle, leftMs, watchMs) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world');
  const taps = [], keys = [];
  scene.tapGround = (x, y) => taps.push({ x, y, t: Date.now() });
  scene.controlledId = () => 'p:me';
  scene.telegraphs = { active: [], circles: [] };
  scene.deps.commands = { partnerFollow: () => {} };
  w.addEventListener('keydown', (e) => keys.push({ code: e.code, t: Date.now() }), true);
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 10 }));
  w.eval(script);
  await wait(600);
  F.store.setState({ target: F.toTarget('m:1') });
  w.document.querySelector('[data-act="bot"]').click();
  await wait(300);
  const t0 = Date.now();
  scene.telegraphs.active = [circle];
  scene.telegraphs.circles = [{ ...circle, end: w.performance.now() + leftMs }];
  const st = new Set();
  while (Date.now() - t0 < watchMs) { st.add(w.document.querySelector('[data-f="status"]').textContent.replace(/ · Skill.*/, '')); await wait(100); }
  w.close();
  const tap = taps.find((p) => p.t >= t0);
  return { tapAt: tap ? (tap.t - t0) / 1000 : null, tap, atk: keys.filter((k) => /^Digit[1-6]$/.test(k.code) && k.t >= t0 && (!tap || k.t < tap.t)).length, st: [...st] };
}
(async () => {
  const res = [];
  const boss = { x: 560, y: 470 }; // m:1 in fakeworld, Digimon steht 67 px daneben
  // A) Machinedramon-artig: Radius 160 um den Boss, 12 s Ansage -> die ersten 2 s weiter angreifen, kein Klick
  const a = await run({ x: boss.x, y: boss.y, r: 160 }, 12000, 2000);
  res.push(['Lange Ansage (12 s): kämpft erst weiter', a.tapAt === null && a.atk > 0 && !a.st.some((s) => /Weiche|Warte außerhalb/.test(s)), { tapAt: a.tapAt, atk: a.atk, st: a.st.slice(0, 3) }]);
  // B) Marsmon-artig: Radius 400 um den Boss, 8 s -> erst angreifen, nach gut 2 s hinaus (über die alte 328-px-Grenze)
  const R = 400;
  const b = await run({ x: boss.x, y: boss.y, r: R }, 8000, 4000);
  const out = b.tap ? Math.hypot(b.tap.x - boss.x, b.tap.y - boss.y) - R : -1;
  res.push(['Raumweit (400 px, 8 s): erst kämpfen, dann aus dem Kreis', b.tapAt != null && b.tapAt > 1 && b.atk > 0 && out >= 28 && b.st.some((s) => /Weiche/.test(s)),
    { tapAt: b.tapAt, atk: b.atk, draußen: Math.round(out) }]);
  for (const [n, ok, info] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + n, JSON.stringify(info));
  const all = res.every((r) => r[1]);
  console.log(all ? 'ALLES OK' : 'FEHLER');
  process.exit(all ? 0 : 1);
})();
