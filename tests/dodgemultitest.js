// 2.35.1: Ausweichen bei mehreren Warnzonen
//  1) der Laufweg zum Fluchtpunkt führt nicht durch einen anderen Kreis
//  2) überlappende Kreise: es zählt der früheste Einschlag (nicht nur der Kreis, der zuerst gefunden wird)
//  3) raumweiter Kreis, dessen Rand nah ist: hinaus ausweichen (bisher immer ignoriert)
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(name, setup) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world');
  const taps = [];
  scene.tapGround = (x, y) => taps.push({ x, y });
  scene.controlledId = () => 'p:me';
  scene.telegraphs = { active: [], circles: [] };
  scene.deps.commands = { partnerFollow: () => {} };
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 10 }));
  w.eval(script);
  await wait(600);
  setup(F, scene, w.performance.now());
  F.store.setState({ target: F.toTarget('m:1') });
  w.document.querySelector('[data-act="bot"]').click();
  const st = new Set();
  for (let i = 0; i < 20; i++) { st.add(w.document.querySelector('[data-f="status"]').textContent); await wait(100); }
  w.close();
  return { name, tap: taps[0] || null, st: [...st] };
}
// kleinster Abstand des Punkts c zur Strecke a -> b
const segDist = (a, b, c) => {
  const dx = b.x - a.x, dy = b.y - a.y, k = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(a.x + dx * k - c.x, a.y + dy * k - c.y);
};
(async () => {
  const P = { x: 500, y: 500 }; // Digimon (fakeworld)
  const res = [];
  // 1) Kreis A um das Digimon, Kreis B liegt genau zwischen Digimon und Ziel
  const B = { x: 590, y: 500, r: 30 };
  const r1 = await run('Weg', (F, sc) => {
    F.ents.get('m:1').x = 760; F.ents.get('m:1').y = 500;
    sc.telegraphs.active = [{ x: P.x, y: P.y, r: 100 }, B];
  });
  const d1 = r1.tap ? segDist(P, r1.tap, B) - B.r : -1;
  res.push(['1) Weg führt nicht durch den zweiten Kreis', !!r1.tap && d1 >= 14, { tap: r1.tap && [Math.round(r1.tap.x), Math.round(r1.tap.y)], abstand: Math.round(d1) }]);
  // 2) zwei Kreise übereinander: A schlägt in 4 s ein (wird zuerst gefunden), B schon in 0,7 s -> nächster freier Punkt
  const r2 = await run('Restzeit', (F, sc, t) => {
    F.ents.get('m:1').x = 830; F.ents.get('m:1').y = 500;
    const A = { x: P.x, y: P.y, r: 50 }, B2 = { x: P.x + 5, y: P.y, r: 50 };
    sc.telegraphs.active = [A, B2];
    sc.telegraphs.circles = [{ ...A, end: t + 4000 }, { ...B2, end: t + 700 }];
  });
  const d2 = r2.tap ? Math.hypot(r2.tap.x - P.x, r2.tap.y - P.y) : 999;
  res.push(['2) früher Einschlag zählt: kurzer Weg', d2 <= 150, { weg: Math.round(d2) }]);
  // 3) raumweiter Kreis (Radius 400), Digimon steht 20 px innerhalb des Rands, 3 s bis zum Einschlag
  const H = { x: P.x - 380, y: P.y, r: 400 };
  const r3 = await run('Raumweit', (F, sc, t) => {
    sc.telegraphs.active = [H];
    sc.telegraphs.circles = [{ ...H, end: t + 3000 }];
  });
  const out3 = r3.tap ? Math.hypot(r3.tap.x - H.x, r3.tap.y - H.y) - H.r : -1;
  res.push(['3) raumweiter Kreis mit nahem Rand: hinaus', r3.st.some((s) => /Weiche/.test(s)) && out3 >= 28, { draußen: Math.round(out3), st: r3.st.slice(0, 2) }]);
  for (const [n, ok, info] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + n, JSON.stringify(info));
  const all = res.every((r) => r[1]);
  console.log(all ? 'ALLES OK' : 'FEHLER');
  process.exit(all ? 0 : 1);
})();
