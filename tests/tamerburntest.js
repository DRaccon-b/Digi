// 2.39.0: MaloMyotismons Pandæmonium Lost verbrennt 45 % des Tamer-DS (skill.tamerDsBurn) – leer digitiert der Partner
// zurück (live: alle 4 Clavis wurden Patamon). Wird so ein Treffer angesagt und fiele das Tamer-DS danach unter die
// Grenze, isst der Bot sofort Tamer-Essen (F3) – nicht erst, wenn es schon zu spät ist.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BURN = 'malomyotismon.pandaemonium_lost';
const W = makeWorld({ slot: 0, tag: 'B', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'malomyotismon', x: 1500, y: 330, hp: 900000, maxHp: 900000, level: 99, flags: 16 }] : []),
  setup({ content }) {
    content.items.bento = { name: 'Bento', use: { ds: 1000, target: 'tamer' } };
    content.skills = { [BURN]: { id: BURN, name: 'Pandæmonium Lost', shape: 'circle', radius: 640, castMs: 1500, cooldownMs: 20000, tamerDsBurn: 0.45 } };
    content.digimon.malomyotismon = { name: 'MaloMyotismon', skills: [content.skills[BURN]] };
  } });
W.handlers = {};
W.w.dmo.net.on = (name, fn) => { { const prev = W.handlers[name]; W.handlers[name] = prev ? (...a) => { prev(...a); fn(...a); } : fn; } return () => {}; };
W.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 20, tab: 'log' }));
const me = W.store.getState().me;
const hotbar = [...me.hotbar]; hotbar[10] = 'item:bento';
W.store.setState({ me: { ...me, tamerDs: 200, tamerMaxDs: 360, hotbar, inventory: [{ itemId: 'bento', qty: 5 }] } }); // 55 %
const f3 = [];
W.w.addEventListener('keydown', (e) => { if (e.code === 'F3') f3.push(Date.now()); }, true);
W.w.eval(script);
(async () => {
  await wait(1200);
  W.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  const before = f3.length;
  W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: BURN, phase: 'cast' }]);
  await wait(1000);
  const after = f3.length;
  console.log({ vorher: before, nachAnsage: after - before });
  const ok = before === 0 && after - before >= 1;
  console.log(ok ? 'OK – Tamer-Essen vor dem DS-Brand, vorher nicht' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
