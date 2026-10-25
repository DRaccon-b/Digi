// 2.36.3: Boss steht im Warnkreis, der noch 4 s bis zum Einschlag hat – kein Fernangriff: danach liefe das Digimon dem
// Ziel zum Nahkampf hinterher und wäre vor dem Einschlag im Kreis (Probelauf Hard: Ultimate Flare, Clavis gefallen).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  setup({ content }) {
    content.digimon.etemon = { name: 'Etemon', skills: [] };
    content.skills = { 'x.beam': { id: 'x.beam', name: 'Beam', target: 'enemy', range: 128 }, 'x.slash': { id: 'x.slash', name: 'Slash', target: 'enemy', range: 32 },
      'x.rush': { id: 'x.rush', name: 'Rush', target: 'enemy', range: 220, dash: { speed: 600 } } };
  },
  extraEnts: () => [{ id: 'b:1', kind: 2, defId: 'etemon', x: 520, y: 330, hp: 90000, maxHp: 100000, level: 5, flags: 16 | 32, targetId: 'p:me' }] });
const scene = G.w.dmo.game.scene.getScene('world');
scene.telegraphs = { active: [], marksActive: [] }; scene.mechB = { lines: [] };
const me = G.store.getState().me;
G.store.setState({ me: { ...me, hotbar: ['cmd:attack', 'skill:0', 'skill:1', 'skill:2'], partner: { ...me.partner, species: 'patamon', ds: 500,
  skills: [{ id: 'x.beam', name: 'Beam', dsCost: 0, unlocked: true }, { id: 'x.slash', name: 'Slash', dsCost: 0, unlocked: true }, { id: 'x.rush', name: 'Rush', dsCost: 0, unlocked: true }] } } });
const keys = [];
G.w.addEventListener('keydown', (e) => keys.push(e.code), true);
G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20 }));
G.w.eval(script);
(async () => {
  await wait(800);
  G.store.setState({ target: { id: 'b:1', kind: 'mob', name: 'Etemon', level: 5, hp: 90000, maxHp: 100000 } });
  const c = { x: 520, y: 330, r: 45 };
  scene.telegraphs.active = [c]; scene.telegraphs.circles = [{ ...c, end: G.w.performance.now() + 4000 }]; // Boss im Warnkreis, 4 s
  G.w.document.querySelector('[data-act="bot"]').click();
  keys.length = 0;
  await wait(2500);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  const inZone = Math.hypot(p.x - 520, p.y - 330) < 45 || Math.hypot(t.x - 520, t.y - 330) < 45;
  const r = { d2: keys.filter((k) => k === 'Digit2').length, d3: keys.filter((k) => k === 'Digit3').length, d4: keys.filter((k) => k === 'Digit4').length, d1: keys.filter((k) => k === 'Digit1').length, inZone, st: G.status() };
  console.log(r);
  const ok = r.d2 === 0 && r.d3 === 0 && r.d4 === 0 && r.d1 === 0 && !inZone;
  console.log(ok ? 'OK – kein Fernangriff, solange das Digimon vor dem Einschlag im Kreis wäre' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
