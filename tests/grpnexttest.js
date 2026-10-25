// 2.22.2: Das Monster des Leaders stirbt – bis der Leader ein neues Ziel meldet, nimmt der Mitläufer den Angreifer,
// der dem Leader am nächsten ist (den nimmt auch der Leader), nicht den, der ihn selbst angreift.
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, spread: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const F = makeWorld({ slot: 1, tag: 'F', accounts, mobs: [[580, 330], [430, 345], [630, 350]], quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  extraEnts: () => [{ id: 't:lead', kind: 0, x: 600, y: 330, hp: 1, flags: 0, targetId: '' }] });
let m1Dead = false;
setInterval(() => { const a = F.ents.get('m:1'), b = F.ents.get('m:2'), c = F.ents.get('m:3');
  if (a) { if (m1Dead) { a.hp = 0; a.flags |= 2; } else { a.hp = 300; a.targetId = 't:lead'; } }
  if (b) { b.hp = 300; b.targetId = 'p:me'; b.flags |= 32; } if (c) { c.hp = 300; c.targetId = 't:lead'; c.flags |= 32; } }, 50);
F.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', radius: 400 }));
F.w.eval(script);
const bus = require('./cbus')();
let lt = 'm:1';
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 600, y: 330,
  bot: true, status: 'x', quests: {}, fin: ['q00_meet_gennai', 'q02_first_steps'], ents: ['t:lead'], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: lt }), 200);
(async () => {
  await wait(1200);
  F.w.document.querySelector('[data-act="bot"]').click();
  await wait(3000);
  const before = F.store.getState().target?.id;
  m1Dead = true; lt = null; // Leader-Monster tot, Leader hat noch kein neues Ziel
  const tg = F.store.getState().target; if (tg?.id === 'm:1') F.store.setState({ target: { ...tg, hp: 0 } });
  await wait(4000);
  const gap = F.store.getState().target?.id;
  clearInterval(tick); bus.close();
  const r = { before, gap };
  console.log(r);
  const ok = before === 'm:1' && gap === 'm:3';
  console.log(ok ? 'OK – nach dem Tod des Leader-Ziels gleich auf das Monster am Leader' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
