// 2.25.0: Golemon (Holy Peaks) macht einen Kreis um sich – beim Ausweichen in seiner Verfolgungsreichweite bleiben
// (auf die Seite zu seinem Startplatz), statt ihn Stück für Stück wegzukiten.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8').replace("golemon_peaks: 'holy_peaks'", "golemon_peaks: ''");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  setup({ content }) { content.digimon.golemon_peaks = { name: 'Golemon', mob: { aggroRange: 112, leashRange: 320 } }; },
  extraEnts: () => [{ id: 'g:1', kind: 2, defId: 'golemon_peaks', x: 300, y: 330, hp: 9000, maxHp: 10000, level: 5, flags: 32, targetId: 'p:me' }] });
const scene = G.w.dmo.game.scene.getScene('world');
scene.telegraphs = { active: [], marksActive: [], circles: [] }; scene.mechB = { lines: [] };
G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20 }));
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500); // Startplatz (300,330) gemerkt
  const g = G.ents.get('g:1'), t = G.ents.get('t:me'), p = G.ents.get('p:me');
  g.x = 520; g.y = 330; t.x = 540; t.y = 330; p.x = 545; p.y = 330; // Golemon ist hinter uns her
  G.store.setState({ target: { id: 'g:1', kind: 'mob', name: 'Golemon', level: 5, hp: 9000, maxHp: 10000 } });
  const z = { x: 520, y: 330, r: 64 };
  scene.telegraphs.active = [z]; scene.telegraphs.circles = [{ ...z, end: G.w.performance.now() + 5000 }];
  await wait(3500);
  const home = Math.round(Math.hypot(t.x - 300, t.y - 330));
  const r = { x: Math.round(t.x), y: Math.round(t.y), distHome: home, outside: Math.hypot(t.x - 520, t.y - 330) > 64 };
  console.log(r);
  const ok = r.outside && home <= 240;
  console.log(ok ? 'OK – in der Verfolgungsreichweite geblieben' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
