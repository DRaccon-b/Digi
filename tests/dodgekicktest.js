// 3.2.48: Ausweichen sofort anstoßen, wenn das Spiel eine Ansage meldet (net „evs“: skill/cast) – nicht erst im nächsten
// 250-ms-Takt. Gemessen: Zeit von der Ansage (Warnkreis + Ereignis) bis zum Fluchtklick, über mehrere Ansagen.
//  K: Mittel unter 90 ms (vorher im Mittel ~125 ms, bis 250 ms).
//  K0: Ereignis ohne Warnfläche (Fläche kommt nie) -> kein blinder Zusatz-Takt, der einen Klick verschluckt: der Bot läuft
//      danach trotzdem normal (Klick kommt mit der Fläche im regulären Takt).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

(async () => {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  const hs = {}; w.dmo.net.on = (k, f) => { (hs[k] ||= []).push(f); };
  const emit = (k, x) => (hs[k] || []).forEach((f) => f(x));
  C.skills = { 'mob.slam': { id: 'mob.slam', name: 'Slam', kind: 'damage', shape: 'circle', radius: 50, castMs: 2500, origin: 'caster' } };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  F.E({ id: 'm:s', kind: 2, defId: 'kunemon', level: 4, x: 900, y: 900, flags: 32 }); // Wirker (weit weg, kein Ziel)
  const taps = [];
  scene.tapGround = (x, y) => taps.push(w.performance.now());
  scene.controlledId = () => 'p:me';
  scene.telegraphs = { active: [], circles: [] };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {} };
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 100, radius: 60, tab: 'log' }));
  w.eval(script);
  await wait(600);
  w.document.querySelector('[data-act="bot"]').click();
  await wait(700);
  const p = F.ents.get('p:me');
  const delays = [];
  for (let i = 0; i < 8; i++) {
    p.x = 500; p.y = 500; const n0 = taps.length;
    await wait(40 + i * 29); // Ansage zu verschiedenen Zeitpunkten im Takt
    const t = w.performance.now();
    emit('evs', [{ t: 'skill', src: 'm:s', skill: 'mob.slam', phase: 'cast', dst: 'p:me' }]); // Ereignis vor der Fläche (Reihenfolge wie im Spiel unbekannt)
    setTimeout(() => { scene.telegraphs.active = [{ x: 500, y: 500, r: 50 }]; scene.telegraphs.circles = [{ x: 500, y: 500, r: 50, end: w.performance.now() + 2500 }]; }, 5);
    for (let k = 0; k < 40 && taps.length === n0; k++) await wait(5);
    if (taps.length > n0) delays.push(taps[n0] - t);
    scene.telegraphs.active = []; scene.telegraphs.circles = [];
    emit('evs', [{ t: 'skill', src: 'm:s', skill: 'mob.slam', phase: 'release' }]);
    await wait(400);
  }
  const mean = delays.reduce((a, b) => a + b, 0) / (delays.length || 1);
  check('K', delays.length === 8 && mean < 90, `Fluchtklick im Mittel nach ${Math.round(mean)} ms (max ${Math.round(Math.max(...delays))})`, () => `${delays.length}/8 Klicks, Mittel ${Math.round(mean)} ms: ${delays.map(Math.round).join(', ')}`);
  // K0: Ereignis ohne Fläche, danach Fläche erst 200 ms später -> Klick muss trotzdem kommen
  p.x = 500; p.y = 500; const n0 = taps.length;
  emit('evs', [{ t: 'skill', src: 'm:s', skill: 'mob.slam', phase: 'cast', dst: 'p:me' }]);
  await wait(200);
  scene.telegraphs.active = [{ x: 500, y: 500, r: 50 }]; scene.telegraphs.circles = [{ x: 500, y: 500, r: 50, end: w.performance.now() + 2500 }];
  await wait(500);
  check('K0', taps.length > n0, 'Ereignis ohne Fläche: Klick kommt mit der Fläche', () => 'kein Fluchtklick');
  w.close();
  process.exit(res.every(Boolean) ? 0 : 1);
})();
