// 2.24.0: Wie im Bild – großer Warnkreis, Boss am Rand, wir links von der Mitte. Ausweichen zur Seite des Bosses
// (knapp außerhalb, direkt bei ihm) statt weg von der Mitte, und dort mit der 1 weiter angreifen.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  setup({ content }) { content.digimon.etemon = { name: 'Etemon', skills: [] }; },
  extraEnts: () => [{ id: 'b:1', kind: 2, defId: 'etemon', x: 540, y: 330, hp: 90000, maxHp: 100000, level: 5, flags: 16 | 32, targetId: 'p:me' }] });
const scene = G.w.dmo.game.scene.getScene('world');
scene.telegraphs = { active: [], marksActive: [], circles: [] }; scene.mechB = { lines: [] };
const keys = [];
G.w.addEventListener('keydown', (e) => keys.push({ c: e.code, t: Date.now() }), true);
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20 }));
G.w.eval(script);
(async () => {
  await wait(800);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = 360; t.y = 330; p.x = 370; p.y = 330;
  G.store.setState({ target: { id: 'b:1', kind: 'mob', name: 'Etemon', level: 5, hp: 90000, maxHp: 100000 } });
  const z = { x: 400, y: 330, r: 150 };
  scene.telegraphs.active = [z]; scene.telegraphs.circles = [{ ...z, end: G.w.performance.now() + 6000 }];
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  await wait(6500);
  const out = { x: Math.round(t.x), y: Math.round(t.y) };
  const d1 = keys.filter((k) => k.c === 'Digit1' && k.t > t0 + 1500).length;
  const r = { out, distBoss: Math.round(Math.hypot(t.x - 540, t.y - 330)), outside: Math.hypot(t.x - 400, t.y - 330) > 150, d1, st: G.status() };
  console.log(r);
  const ok = r.outside && out.x > 520 && r.distBoss < 110 && d1 > 0;
  console.log(ok ? 'OK – zur Seite des Bosses ausgewichen und weiter angegriffen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
