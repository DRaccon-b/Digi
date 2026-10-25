// 2.24.1: Wie live bei „The Shrine Stone“ – der Leader ist fertig, der Mitläufer muss die Zone noch erreichen. Der Leader
// hält die Abgabe zurück und darf in der Wartezeit nicht zu einer Quest auf einer anderen Map laufen.
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const L = makeWorld({ slot: 0, tag: 'L', accounts, mobs: [],
  extraEnts: (id) => (id === 'native_forest' ? [{ id: 'n:elder', kind: 3, defId: 'elder', x: 330, y: 300, hp: 0, flags: 0 }] : []),
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_s: { state: 2, counters: [1] } },
  setup({ content, MAPS }) {
    content.npcs.elder = { name: 'Elder' };
    MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'elder', x: 330, y: 300, properties: [{ name: 'npcId', type: 'string', value: 'elder' }] },
      { type: 'zone', name: 'terraces', x: 600, y: 250, width: 100, height: 100 });
    content.quests.q_s = { id: 'q_s', name: 'The Shrine Stone', giver: 'elder', turnIn: 'elder', minLevel: 1, objectives: [{ kind: 'reach', mapId: 'native_forest', zone: 'terraces' }] };
    content.quests.s_far = { id: 's_far', name: 'Bay Patrol', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 8 }] };
  } });
L.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
L.w.eval(script);
const bus = require('./cbus')();
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 1, role: 'follower', name: 'Foll', inWorld: true, mapId: 'native_forest', channel: 1, x: 420, y: 330,
  bot: true, status: 'x', quests: { q_s: { state: 1, counters: [0] } }, ents: ['t:f'], talks: [], done: [], busy: null, task: null, hunt: [], targetId: null, fight: false }), 300);
(async () => {
  await wait(1200);
  L.w.document.querySelector('[data-act="bot"]').click();
  await wait(9000);
  clearInterval(tick); bus.close();
  const r = { map: L.store.getState().world.mapId, far: L.state.me.quests.s_far?.state ?? 0, st: L.status() };
  console.log(r);
  const ok = r.map === 'native_forest' && r.far === 0;
  console.log(ok ? 'OK – Leader wartet auf der Map, statt wegzulaufen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
