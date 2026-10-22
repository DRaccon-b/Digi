// 2.10.6: Aufholen – der Leader ist mit „Zur Lichtung“ schon fertig und hat die Folgequest aktiv. Der Mitläufer läuft
// selbst in die Zone, gibt ab und nimmt die Folgequest an.
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const B = makeWorld({ slot: 1, tag: 'Folger', accounts, mobs: [], extraEnts: (id) => (id === 'native_forest' ? [{ id: 'n:elder', kind: 3, defId: 'elder', x: 330, y: 300, hp: 0, flags: 0 }] : []),
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q_r: { state: 1, counters: [0] } },
  setup({ content, MAPS }) {
    content.npcs.elder = { name: 'Elder' };
    MAPS.native_forest.layers[0].objects.push({ type: 'zone', name: 'glade', x: 650, y: 450, width: 150, height: 150 },
      { type: 'npc', name: 'elder', x: 330, y: 300, properties: [{ name: 'npcId', type: 'string', value: 'elder' }] });
    content.quests.q_r = { id: 'q_r', name: 'Zur Lichtung', giver: 'elder', turnIn: 'elder', minLevel: 1, objectives: [{ kind: 'reach', mapId: 'native_forest', zone: 'glade' }] };
    content.quests.q_next = { id: 'q_next', name: 'Danach', giver: 'elder', turnIn: 'elder', minLevel: 1, prereq: ['q_r'], objectives: [{ kind: 'kill', species: 'kunemon', count: 5 }] };
    content.quests.q02_first_steps.minLevel = 99; // nicht ablenken
  } });
B.w.eval(script);
setInterval(() => {
  const t = B.ents.get('t:me'), q = B.store.getState().me.quests.q_r;
  if (q.state === 1 && t.x >= 650 && t.x <= 800 && t.y >= 450 && t.y <= 600) { const s = B.store.getState(); B.store.setState({ me: { ...s.me, quests: { ...s.me.quests, q_r: { state: 2, counters: [1] } } } }); }
}, 100);
const bus = new BroadcastChannel('digibot-group');
const FIN = process.env.NOFIN ? ['q00_meet_gennai'] : ['q00_meet_gennai', 'q_r'];
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 400, y: 330,
  bot: true, status: 'x', quests: { q_next: { state: 1, counters: [0] } }, fin: FIN, ents: [], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: null }), 300);
(async () => {
  await wait(1200);
  B.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 40000 && B.state.me.quests.q_next?.state !== 1) await wait(100);
  clearInterval(tick);
  const q = B.state.me.quests;
  const r = { qr: q.q_r?.state, qnext: q.q_next?.state, status: B.status() };
  console.log(r);
  const ok = r.qr === 3 && r.qnext === 1;
  console.log(ok ? 'OK – Mitläufer holt auf' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
