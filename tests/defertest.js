// 2.11.3: Gespräch des Leaders auf einer anderen Map – Mitläufer läuft nicht allein los, solange der Leader noch auf
// seiner Map ist (meldet „gesehen“), und übernimmt es erst, wenn der Leader die Map gewechselt hat
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const B = makeWorld({ slot: 1, tag: 'Folger', accounts, mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 2, counters: [2] } } });
B.w.eval(script);
const bus = require('./cbus')();
let last = null;
bus.onmessage = (e) => { if (e.data?.type === 'state' && e.data.slot === 1) last = e.data; };
const key = 'turnin:q02_first_steps@1';
const lead = { mapId: 'native_forest', x: 420, y: 330 };
const talks = [{ key, tkey: 'turnin:q02_first_steps', kind: 'talk', at: Date.now(), purpose: 'turnin', questId: 'q02_first_steps', objIndex: null, need: null,
  npcId: 'elecmon', pool: null, loc: { mapId: 'primary_village', x: 200, y: 456 }, label: '„First Steps“ abgeben bei Elecmon' }];
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, channel: 1, bot: true, status: 'x', quests: { q02_first_steps: { state: 2, counters: [2] } },
  ents: [], talks, done: [], busy: null, noFight: false, task: null, hunt: [], targetId: null, ...lead }), 300);
(async () => {
  await wait(1200);
  B.w.document.querySelector('[data-act="bot"]').click();
  await wait(4000);
  const stayed = B.state.world.mapId === 'native_forest' && B.state.me.quests.q02_first_steps.state === 2;
  const seen = (last?.deferred || []).includes(key) && last?.busy !== key;
  Object.assign(lead, { mapId: 'primary_village', x: 800, y: 330 }); // Leader wechselt die Map
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && B.state.me.quests.q02_first_steps.state !== 3) await wait(100);
  clearInterval(tick);
  const r = { stayed, seen, turnedIn: B.state.me.quests.q02_first_steps.state === 3, map: B.state.world.mapId };
  console.log(r);
  const ok = stayed && seen && r.turnedIn;
  console.log(ok ? 'OK – Mitläufer reist mit dem Leader' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
