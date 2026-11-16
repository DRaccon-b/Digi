// 3.2.27 (live 16.11., Tiefe 15, Paladin): im Rift zweimal gestorben – beide Male beim Ausweichen.
// 1) Fluchtpunkt: beim Ausweichen lief er in die Nachbargruppen (Rift-Gegner greifen ab 64 px an und verfolgen ohne Leine) –
//    2 → 11 Angreifer in 8 s. Jetzt: Fluchtpunkte nah an ruhigen Gegnern meiden.
// 2) Warten: „Warte außerhalb, bis der Flächenangriff vorbei ist“, während ihn 3 Gegner schlugen – 50 % → 0 in 5 s. Jetzt:
//    einen Angreifer, der außerhalb der Warnzone steht, angreifen …
// 3) … und mit wenig HP den Heil-Skill nutzen, statt still zu stehen.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(setup, { hp = 3000, rift = null } = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  let off = 0; const rn = w.Date.now.bind(w.Date); w.Date.now = () => rn() + off; const shift = (ms) => { off = ms; };
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  C.spawns.native_forest.raid = { id: 'rift', rift: true }; // Karte gilt als Rift
  C.skills = { 'test.heal': { id: 'test.heal', name: 'Holy Grace', kind: 'heal', target: 'self', shape: 'single', power: 400, castMs: 300, cooldownMs: 15000, dsCost: 50 } };
  const taps = [], keys = [];
  scene.tapGround = (x, y) => taps.push({ x, y });
  scene.controlledId = () => 'p:me';
  scene.telegraphs = { active: [], circles: [] };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {} };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  const me = F.store.getState().me;
  F.store.setState({ me: { ...me, hotbar: ['cmd:attack', 'skill:0', null, null, null, null, null, null, 'item:meat'],
    partner: { ...me.partner, species: 'testmon', hp, maxHp: 3752, ds: 700, skills: [{ id: 'test.heal', name: 'Holy Grace', dsCost: 50, unlocked: true }] } } });
  w.addEventListener('keydown', (e) => keys.push(e.code), true);
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 100, dungeon: true, dgMode: 'rift', tab: 'log',
    skillSets: { testmon: { skills: { 2: true, 3: false, 4: false, 5: false, 6: false }, heal: { 2: 60 }, role: { 2: 'heal' }, aoeN: {}, grpHeal: {}, rolesV: 1 } } }));
  if (rift) w.dmo.rift = { getState: () => rift };
  w.eval(script);
  await wait(600);
  const t0 = w.performance.now();
  setup(F, scene, t0, shift);
  w.document.querySelector('[data-act="bot"]').click();
  const st = new Set();
  for (let i = 0; i < 25; i++) { st.add(w.document.querySelector('[data-f="status"]').textContent.slice(0, 70)); await wait(100); }
  const r = { tap: taps[0] || null, sel: [...F.selects], keys: [...new Set(keys)], st: [...st].slice(0, 12) };
  w.close();
  return r;
}
(async () => {
  const res = [];
  // 1) im Kreis um das Digimon, Ziel greift an (NO), ruhige Gruppe auf der Ziel-Seite
  const idle = [{ x: 590, y: 430 }, { x: 615, y: 450 }, { x: 600, y: 405 }];
  const r1 = await run((F, sc, t) => {
    F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 565, y: 470, targetId: 'p:me', flags: 32 });
    idle.forEach((p, i) => F.E({ id: `m:i${i}`, kind: 2, defId: 'kunemon', level: 4, x: p.x, y: p.y, flags: 32 }));
    F.store.setState({ target: F.toTarget('m:t') });
    sc.telegraphs.active = [{ x: 500, y: 500, r: 60 }]; sc.telegraphs.circles = [{ x: 500, y: 500, r: 60, end: t + 2500 }];
  });
  const d1 = r1.tap ? Math.min(...idle.map((p) => Math.hypot(p.x - r1.tap.x, p.y - r1.tap.y))) : -1;
  res.push(['1) Fluchtpunkt weg von der ruhigen Gruppe', !!r1.tap && d1 >= 100, { tap: r1.tap && [Math.round(r1.tap.x), Math.round(r1.tap.y)], abstand: Math.round(d1) }]);
  // 2) Ziel steht im Kreis, ich draußen; ein Angreifer außerhalb schlägt mich
  const r2 = await run((F, sc, t) => {
    F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 640, y: 500, targetId: 'p:me', flags: 32 });
    F.E({ id: 'm:a', kind: 2, defId: 'kunemon', level: 4, x: 470, y: 520, targetId: 'p:me', flags: 32 });
    F.store.setState({ target: F.toTarget('m:t') });
    sc.telegraphs.active = [{ x: 640, y: 500, r: 70 }]; sc.telegraphs.circles = [{ x: 640, y: 500, r: 70, end: t + 3000 }];
  });
  res.push(['2) beim Warten den Angreifer außerhalb der Warnzone angreifen', r2.sel.includes('m:a'), r2]);
  // 3) wie 2 ohne zweiten Angreifer, HP 30 %: heilen
  const r3 = await run((F, sc, t) => {
    F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 640, y: 500, targetId: 'p:me', flags: 32 });
    F.store.setState({ target: F.toTarget('m:t') });
    sc.telegraphs.active = [{ x: 640, y: 500, r: 70 }]; sc.telegraphs.circles = [{ x: 640, y: 500, r: 70, end: t + 3000 }];
  }, { hp: 1100 });
  res.push(['3) beim Warten mit 30 % HP heilen', r3.keys.includes('Digit2'), r3]);
  // 4) live 16.11. (3.2.30): Flächenangriff um den Gegner, ein Angreifer steht direkt neben mir am Zonenrand – zurückschlagen statt warten
  const r4 = await run((F, sc, t) => {
    F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 580, y: 500, targetId: 'p:me', flags: 32 });
    F.E({ id: 'm:a', kind: 2, defId: 'kunemon', level: 4, x: 530, y: 500, targetId: 'p:me', flags: 32 });
    F.store.setState({ target: F.toTarget('m:t') });
    sc.telegraphs.active = [{ x: 580, y: 500, r: 40 }]; sc.telegraphs.circles = [{ x: 580, y: 500, r: 40, end: t + 3000 }];
  });
  res.push(['4) beim Warten den Angreifer am Zonenrand in Schlagweite angreifen', r4.sel.includes('m:a') && r4.keys.includes('Digit1'), r4]);
  // 5) live 16.11. (3.2.30): Ziel 250 px weg, keine Zone – nicht „Laufe über Spiel-Wegfindung zum Boss … Angriff erst bei freiem Zugang“
  const r5 = await run((F, sc, t) => {
    F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 750, y: 500, targetId: 'p:me', flags: 32 });
    F.store.setState({ target: F.toTarget('m:t') });
  });
  res.push(['5) normaler Rift-Gegner: kein Boss-Anmarsch ohne Angriff', !r5.st.some((x) => /Spiel-Wegfindung zum Boss/.test(x)) && r5.keys.includes('Digit1'), r5]);
  // 6) live 16.11. (3.2.30): 1–12 % HP, griff weiter einen ruhigen Gegner an, der dann zurückschlug – Ohnmacht. Unter 30 %: fallen lassen
  const r6 = await run((F, sc, t) => {
    F.E({ id: 'm:q', kind: 2, defId: 'kunemon', level: 4, x: 540, y: 500, flags: 32 });
    F.store.setState({ target: F.toTarget('m:q') });
  }, { hp: 750, rift: { run: { depth: 1, running: true, floor: { n: 1, of: 3 }, clockMs: 600000, objective: 'purge' } } });
  res.push(['6) unter 30 % HP: ruhiges Ziel nicht weiter angreifen', !r6.keys.includes('Digit1'), r6]);
  // 7) Review 3.2.30: Anmarsch zum Ziel in der Zone läuft schon, dann holt ein Angreifer auf – trotzdem zurückschlagen
  const r7 = await run((F, sc, t) => {
    F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 800, y: 500, targetId: 'p:me', flags: 32 });
    F.store.setState({ target: F.toTarget('m:t') });
    sc.telegraphs.active = [{ x: 800, y: 500, r: 40 }]; sc.telegraphs.circles = [{ x: 800, y: 500, r: 40, end: t + 60000 }];
    setTimeout(() => F.E({ id: 'm:a', kind: 2, defId: 'kunemon', level: 4, x: 525, y: 500, targetId: 'p:me', flags: 32 }), 900);
  });
  res.push(['7) Angreifer holt während des Anmarschs auf: zurückschlagen', r7.sel.includes('m:a') && r7.keys.includes('Digit1'), r7]);
  // 8) Review 3.2.30: Erholfenster nach einem Kampf mit Angreifern neu – sonst galt der alte Zeitstempel und er erholte sich nicht mehr
  const r8 = await run((F, sc, t, shift) => {
    F.E({ id: 'm:q', kind: 2, defId: 'kunemon', level: 4, x: 540, y: 500, flags: 32 });
    F.store.setState({ target: F.toTarget('m:q') });
    setTimeout(() => { F.ents.get('m:q').targetId = 'p:me'; }, 800);
    setTimeout(() => { F.ents.delete('m:q'); F.store.setState({ target: null }); shift(30000); }, 1600);
  }, { hp: 750, rift: { run: { depth: 1, running: true, floor: { n: 1, of: 3 }, clockMs: 600000, objective: 'purge' } } });
  res.push(['8) nach dem Kampf wieder erholen (neues Erholfenster)', r8.st.some((x) => /· erhole mich/.test(x)), r8]);
  for (const [n, ok, info] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + n, JSON.stringify(info));
  const all = res.every((x) => x[1]);
  console.log(all ? 'ALLES OK' : 'FEHLER');
  process.exit(all ? 0 : 1);
})();
