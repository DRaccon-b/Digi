// 3.2.48 (Nutzer 21.11.: „wie können wir das Ausweichen schneller machen“, Messung Rift T15: ~100 s Ausweichen je Lauf).
//  S: Nach einem Stopp (Ziel lief kurz) kommt die 1 sofort wieder, sobald der Plan gilt – nicht erst nach der 1,5-s-Sperre.
//  M: Rift: ein Angreifer läuft auf mich zu, steht und läuft weit weg von allen Zonen, Weg frei -> angreifen statt warten.
//  M0: wie M, aber der Weg zum Angreifer führt durch die Zone -> nicht angreifen (warten).
//  M2 (Review): wie M; das Digimon ist am laufenden Angreifer, dann kommt ein Kreis nah an ihn -> sofort anhalten (partnerStop),
//     nicht per „Angriff im Stand“ weiter hinterher.
//  R (Review): kein Rift, Ziel läuft (nicht verfolgt), steht schon in Schlagweite nahe einer Zone -> Angriff im Stand wie vor 3.2.48.
//  O: Gerade aus dem Kreis heraus (Digimon läuft noch, aber schon mit voller Reserve draußen) -> sofort angreifen, nicht auf
//     den Stillstand warten.
//  O0: wie O, Digimon noch innerhalb der vollen Reserve (nur 12 px draußen) -> nicht angreifen.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

async function world({ rift = true } = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  if (rift) C.spawns.native_forest.raid = { id: 'rift', rift: true };
  C.skills = {};
  const taps = [], keys = [];
  scene.tapGround = (x, y) => { taps.push({ x, y, t: w.performance.now() }); if (scene.onTap) scene.onTap(x, y); };
  scene.controlledId = () => 'p:me';
  scene.telegraphs = { active: [], circles: [] };
  const cmds = { stops: 0 };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => { cmds.stops++; } };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  const me = F.store.getState().me;
  F.store.setState({ me: { ...me, hotbar: ['cmd:attack', null, null, null, null, null, null, null, null],
    partner: { ...me.partner, species: 'testmon', hp: 3700, maxHp: 3752, ds: 700, skills: [] } } });
  w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') keys.push(w.performance.now()); }, true);
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 100, radius: 400, tab: 'log' }));
  w.eval(script);
  await wait(600);
  const status = () => w.document.querySelector('[data-f="status"]')?.textContent || '';
  return { w, F, scene, taps, keys, cmds, status, start: () => w.document.querySelector('[data-act="bot"]').click() };
}

(async () => {
  // S (kein Rift): Ziel steht 70 px östlich, ein Kreis liegt westlich in der Nähe (near), Plan gilt -> 1. Dann läuft das Ziel kurz
  // (Plan weg -> Stopp), steht wieder -> die 1 muss gleich wieder kommen (Sperre 1,5 s)
  {
    const R = await world({ rift: false });
    R.F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 570, y: 500, flags: 32 });
    R.F.store.setState({ target: R.F.toTarget('m:t') });
    const t0 = R.w.performance.now();
    R.scene.telegraphs.active = [{ x: 380, y: 500, r: 40 }]; R.scene.telegraphs.circles = [{ x: 380, y: 500, r: 40, end: t0 + 8000 }];
    R.start();
    for (let i = 0; i < 20 && !R.keys.length; i++) await wait(100);
    const first = R.keys.length;
    const tg = R.F.ents.get('m:t');
    tg.flags |= 1; await wait(350); // läuft kurz
    tg.flags &= ~1; const back = R.w.performance.now();
    await wait(700);
    const again = R.keys.find((k) => k > back);
    const st = R.status(); R.w.close();
    check('S', first > 0 && again != null && again - back < 600, `nach dem Stopp sofort wieder die 1 (${again != null ? Math.round(again - back) : '–'} ms)`, () => `erste 1: ${first}, danach: ${again != null ? Math.round(again - back) + ' ms' : 'keine'}, Status ${st}`);
  }
  // M / M0 (Rift): Angreifer läuft auf mich zu (Flag Moving), Zone 150 px nordwestlich (near)
  for (const [id, zx, zy, ok] of [['M', 380, 400, true], ['M0', 600, 500, false]]) {
    const R = await world();
    R.F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 690, y: 500, targetId: 'p:me', flags: 32 | 1 });
    R.F.store.setState({ target: R.F.toTarget('m:t') });
    const t0 = R.w.performance.now();
    R.scene.telegraphs.active = [{ x: zx, y: zy, r: 40 }]; R.scene.telegraphs.circles = [{ x: zx, y: zy, r: 40, end: t0 + 8000 }];
    R.start();
    await wait(1500);
    const n = R.keys.length, st = R.status(); R.w.close();
    if (ok) check(id, n > 0, 'heranlaufenden Angreifer außerhalb der Zonen angegriffen', () => `keine 1, Status ${st}`);
    else check(id, n === 0, 'Weg führt durch die Zone: kein Angriff', () => `${n}× 1, Status ${st}`);
  }
  // M2 (Rift)
  {
    const R = await world();
    R.F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 690, y: 500, targetId: 'p:me', flags: 32 | 1 });
    R.F.store.setState({ target: R.F.toTarget('m:t') });
    const t0 = R.w.performance.now();
    R.scene.telegraphs.active = [{ x: 380, y: 400, r: 40 }]; R.scene.telegraphs.circles = [{ x: 380, y: 400, r: 40, end: t0 + 8000 }];
    R.start();
    for (let i = 0; i < 20 && !R.keys.length; i++) await wait(100);
    const p = R.F.ents.get('p:me'); p.x = 670; p.y = 500; p.targetId = 'm:t'; // am Angreifer, greift ihn an (wie im Spiel)
    await wait(400);
    const s0 = R.cmds.stops, t1 = R.w.performance.now();
    R.scene.telegraphs.active.push({ x: 690, y: 590, r: 40 }); R.scene.telegraphs.circles.push({ x: 690, y: 590, r: 40, end: t1 + 8000 }); // Kreis 50 px neben dem Angreifer
    await wait(600);
    const st = R.status(); R.w.close();
    check('M2', R.keys.length > 0 && R.cmds.stops > s0, 'Angreifer kommt an einen Kreis: sofort angehalten', () => `1: ${R.keys.length}, Stopps vorher/nachher ${s0}/${R.cmds.stops}, Status ${st}`);
  }
  // R (kein Rift)
  {
    const R = await world({ rift: false });
    R.F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 530, y: 500, flags: 32 | 1 });
    R.F.store.setState({ target: R.F.toTarget('m:t') });
    const t0 = R.w.performance.now();
    R.scene.telegraphs.active = [{ x: 530, y: 590, r: 40 }]; R.scene.telegraphs.circles = [{ x: 530, y: 590, r: 40, end: t0 + 8000 }];
    R.start();
    await wait(1200);
    const n = R.keys.length, st = R.status(); R.w.close();
    check('R', n > 0, 'laufendes Ziel in Schlagweite nahe Zone: Angriff im Stand bleibt', () => `keine 1, Status ${st}`);
  }
  // O / O0 (Rift): Kreis um mich, Ziel steht 150 px östlich; der Fluchtklick setzt das Digimon auf den Rand + dx und lässt es „laufen“
  for (const [id, dx, ok] of [['O', 34, true], ['O0', 12, false]]) {
    const R = await world();
    R.F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 650, y: 500, targetId: 'p:me', flags: 32 });
    R.F.store.setState({ target: R.F.toTarget('m:t') });
    const p = R.F.ents.get('p:me');
    R.scene.onTap = (x, y) => { if (R.taps.length === 1) { const a = Math.atan2(y - 500, x - 500); p.x = 500 + Math.cos(a) * (40 + dx); p.y = 500 + Math.sin(a) * (40 + dx); p.flags |= 1; } };
    const t0 = R.w.performance.now();
    R.scene.telegraphs.active = [{ x: 500, y: 500, r: 40 }]; R.scene.telegraphs.circles = [{ x: 500, y: 500, r: 40, end: t0 + 6000 }];
    R.start();
    for (let i = 0; i < 20 && !R.taps.length; i++) await wait(100);
    const out = R.w.performance.now();
    await wait(900);
    const k = R.keys.find((x) => x > out), st = R.status(); R.w.close();
    if (ok) check(id, k != null, `draußen sofort angegriffen (${k != null ? Math.round(k - out) : '–'} ms)`, () => `keine 1 nach dem Herauslaufen, Status ${st}`);
    else check(id, k == null, 'noch nicht voll draußen: kein Angriff', () => `1 nach ${Math.round(k - out)} ms, Status ${st}`);
  }
  process.exit(res.every(Boolean) ? 0 : 1);
})();
