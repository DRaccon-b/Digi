// 2.37.0: Ultimate Flare – hinter einer Platte (skill.cover, Spawn-Punkte der Karte) ist man geschützt, und zwar auf der
// vom Boss abgewandten Seite. Liegt eine Platte näher als der Weg aus dem Fächer hinaus, läuft der Bot dorthin.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const boss = { x: 450, y: 330 }, slab = { x: 545, y: 350 }, me0 = { x: 500, y: 330 };
const G = makeWorld({ slot: 0, tag: 'C', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  setup({ MAPS }) { MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'slab_a', x: slab.x, y: slab.y }); } });
const sc = G.w.dmo.game.scene.getScene('world');
const taps = [];
sc.tapGround = (x, y) => taps.push({ x, y });
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20 }));
G.w.eval(script);
(async () => {
  await wait(1500); // Karte laden
  for (const id of [...G.ents.keys()]) if (id.startsWith('m:')) G.ents.delete(id);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = me0.x; t.y = me0.y; p.x = me0.x + 4; p.y = me0.y;
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(500);
  // Fächer der Ultimate Flare vom Boss nach rechts, 2,5 s bis zum Einschlag
  sc.mechB = { lines: [{ src: 'boss:1', fx: boss.x, fy: boss.y, tx: boss.x + 360, ty: boss.y, r: 20, end: G.w.performance.now() + 2500,
    skill: { id: 'armageddemon.ultimate_flare', sweep: { arc: 140, ms: 1600 }, cover: { points: ['slab_a'], radius: 26 } } }] };
  await wait(800);
  const tap = taps[taps.length - 1];
  const d = tap ? Math.hypot(tap.x - slab.x, tap.y - slab.y) : null;
  const behind = tap ? (tap.x - slab.x) * (slab.x - boss.x) + (tap.y - slab.y) * (slab.y - boss.y) > 0 : false;
  console.log({ tap: tap && [Math.round(tap.x), Math.round(tap.y)], abstand: d && Math.round(d), hinter: behind, status: G.status() });
  // dort angekommen: gilt als sicher – kein weiteres Ausweichen, keine neuen Klicks woandershin
  if (tap) { t.x = tap.x; t.y = tap.y; p.x = tap.x; p.y = tap.y; }
  const n0 = taps.length;
  await wait(700);
  const st2 = G.status(), moved = taps.slice(n0).some((q) => Math.hypot(q.x - tap.x, q.y - tap.y) > 6);
  console.log({ danach: st2, neueKlicks: taps.length - n0, woandershin: moved });
  const ok = !!tap && d <= 22 && behind && !/Weiche/.test(st2) && !moved;
  console.log(ok ? 'OK – hinter die nahe Platte ausgewichen und dort sicher' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
