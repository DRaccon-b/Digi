// 2.11.4: Kein falsches Aufholen – der Leader hat „Zur Lichtung“ weder aktiv noch abgeschlossen (er nimmt sie erst noch an).
// Der Mitläufer darf sie dann nicht allein erledigen.
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
const bus = require('./groupbus')('digibot-group');
const FIN = ['q00_meet_gennai'];
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 400, y: 330,
  bot: true, status: 'x', quests: { q_next: { state: 1, counters: [0] } }, fin: FIN, ents: [], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: null }), 300);
(async () => {
  await wait(1200);
  B.w.document.querySelector('[data-act="bot"]').click();
  await wait(8000);
  clearInterval(tick);
  const r = { qr: B.state.me.quests.q_r?.state, status: B.status() };
  console.log(r);
  const ok = r.qr === 1;
  console.log(ok ? 'OK – kein Aufholen ohne fertigen Leader' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
