// 3.2.36 (Review 20.11.): Heal, Gruppen-Heal und Cleanse fielen beim Ausweichen weg – dodge() kehrte im Tick vor skillCare
// zurück; nur im Rift heilte riftWaitAct. Szenario: Feldboss/Dungeon mit Warnkreis um das Ziel, Bot wartet sicher draußen
// („Warte außerhalb, bis der Flächenangriff vorbei ist…“) – mit wenig HP muss er trotzdem heilen.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(setup, { hp = 3000, riftMap = false, walk = false } = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  if (riftMap) C.spawns.native_forest.raid = { id: 'rift', rift: true }; // Karte gilt als Rift
  C.skills = { 'test.heal': { id: 'test.heal', name: 'Holy Grace', kind: 'heal', target: 'self', shape: 'single', power: 400, castMs: 300, cooldownMs: 15000, dsCost: 50 } };
  const taps = [], keys = [];
  scene.tapGround = (x, y) => { taps.push({ x, y }); if (walk) for (const id of ['p:me', 't:me']) { const e = F.ents.get(id); if (e) { e.x = x; e.y = y; } } }; // walk: sofort am Tap-Punkt
  scene.controlledId = () => 'p:me';
  scene.telegraphs = { active: [], circles: [] };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {} };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  const me = F.store.getState().me;
  F.store.setState({ me: { ...me, hotbar: ['cmd:attack', 'skill:0', null, null, null, null, null, null, 'item:meat'],
    partner: { ...me.partner, species: 'testmon', hp, maxHp: 3752, ds: 700, skills: [{ id: 'test.heal', name: 'Holy Grace', dsCost: 50, unlocked: true }] } } });
  w.addEventListener('keydown', (e) => keys.push(e.code), true);
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 100, dungeon: riftMap, dgMode: 'rift', tab: 'log',
    skillSets: { testmon: { skills: { 2: true, 3: false, 4: false, 5: false, 6: false }, heal: { 2: 60 }, role: { 2: 'heal' }, aoeN: {}, grpHeal: {}, rolesV: 1 } } }));
  w.eval(script);
  await wait(600);
  const t0 = w.performance.now();
  setup(F, scene, t0);
  w.document.querySelector('[data-act="bot"]').click();
  const st = new Set();
  for (let i = 0; i < 25; i++) { st.add(w.document.querySelector('[data-f="status"]').textContent.slice(0, 70)); await wait(100); }
  const r = { tap: taps[0] || null, keys: [...new Set(keys)], st: [...st].slice(0, 12) };
  w.close();
  return r;
}
(async () => {
  const res = [];
  const zone = (F, sc, t) => {
    F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 640, y: 500, targetId: 'p:me', flags: 32 });
    F.store.setState({ target: F.toTarget('m:t') });
    sc.telegraphs.active = [{ x: 640, y: 500, r: 70 }]; sc.telegraphs.circles = [{ x: 640, y: 500, r: 70, end: t + 3000 }];
  };
  // A) Feldboss/Dungeon (kein Rift): Ziel im Warnkreis, ich draußen sicher, 30 % HP – wartet draußen und heilt trotzdem
  const a = await run(zone, { hp: 1100 });
  res.push(['A: ausserhalb des Rifts beim Warten mit 30 % HP heilen', a.keys.includes('Digit2') && a.st.some((x) => /Warte außerhalb/.test(x)), a]);
  // B) Gegenprobe volle HP: kein Heal
  const b = await run(zone, { hp: 3752 });
  res.push(['B: volle HP beim Warten: kein Heal', !b.keys.includes('Digit2') && b.st.some((x) => /Warte außerhalb/.test(x)), b]);
  // C) Rift wie bisher: heilen
  const c = await run(zone, { hp: 1100, riftMap: true });
  res.push(['C: im Rift beim Warten heilen (wie bisher)', c.keys.includes('Digit2'), c]);
  // E) Anmarsch (Ziel > 220 px, Warnkreis am Ziel): am sicheren Platz nahe am Boss angekommen und wartend -> heilen (Prüfung 20.11.)
  const e = await run((F, sc, t) => {
    F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 1000, y: 500, targetId: '', flags: 32 });
    F.store.setState({ target: F.toTarget('m:t') });
    sc.telegraphs.active = [{ x: 1000, y: 500, r: 70 }]; sc.telegraphs.circles = [{ x: 1000, y: 500, r: 70, end: t + 8000 }];
  }, { hp: 1100, walk: true });
  res.push(['E: am Anmarsch-Platz wartend mit 30 % HP heilen', e.keys.includes('Digit2') && e.st.some((x) => /Warte außerhalb/.test(x)), e]);
  // D) ich stehe selbst im Warnkreis: ausweichen (Fluchtpunkt), der Wartezweig greift nicht
  const d = await run((F, sc, t) => {
    F.E({ id: 'm:t', kind: 2, defId: 'kunemon', level: 4, x: 640, y: 500, targetId: 'p:me', flags: 32 });
    F.store.setState({ target: F.toTarget('m:t') });
    sc.telegraphs.active = [{ x: 500, y: 500, r: 60 }]; sc.telegraphs.circles = [{ x: 500, y: 500, r: 60, end: t + 2500 }];
  }, { hp: 1100 });
  res.push(['D: im Warnkreis wird ausgewichen', !!d.tap, d]);
  for (const [n, ok, info] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + n, JSON.stringify(info));
  const all = res.every((x) => x[1]);
  console.log(all ? 'ALLES OK' : 'FEHLER');
  process.exit(all ? 0 : 1);
})();
