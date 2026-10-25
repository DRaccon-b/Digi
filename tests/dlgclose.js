// 2.12.5: Liegengebliebener NPC-Dialog nach einer Annahme wird geschlossen, auch während der Bot danach kämpft
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const B = makeWorld({ slot: 1, tag: 'Folger', accounts, mobs: [[380, 330, 'kunemon']], extraEnts: (id) => (id === 'native_forest' ? [{ id: 'n:elder', kind: 3, defId: 'elder', x: 330, y: 300, hp: 0, flags: 0 }] : []),
  quests: { q00_meet_gennai: { state: 3, counters: [] } },
  setup({ content, MAPS }) {
    content.npcs.elder = { name: 'Elder' };
    MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'elder', x: 330, y: 300, properties: [{ name: 'npcId', type: 'string', value: 'elder' }] });
    content.quests.q07_task = { id: 'q07_task', name: 'Patrol', giver: 'elder', turnIn: 'elder', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 9 }] };
    content.quests.q02_first_steps.minLevel = 99;
  } });
B.w.eval(script);
// Angreifer: hört nie auf anzugreifen (stirbt nicht, HP bleiben)
setInterval(() => { const m = B.ents.get('m:1'); if (m) { m.targetId = 'p:me'; m.flags = 32; m.hp = 300; } }, 100);
const bus = require('./cbus')();
const talks = [{ key: 'accept:q07_task@1', tkey: 'accept:q07_task', kind: 'talk', at: Date.now(), purpose: 'accept', questId: 'q07_task', objIndex: null, need: null,
  npcId: 'elder', pool: null, loc: { mapId: 'native_forest', x: 330, y: 300 }, label: '„Patrol“ annehmen bei Elder' }];
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 340, y: 320,
  bot: true, status: 'x', quests: { q07_task: { state: 1, counters: [0] } }, fin: ['q00_meet_gennai'], ents: [], talks, done: [], busy: null, task: null, hunt: [], targetId: null }), 300);
(async () => {
  await wait(1200);
  B.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && B.state.me.quests.q07_task?.state !== 1) await wait(100);
  clearInterval(tick);
  await wait(500);
  B.state.me.quests.q07_task || process.exit(1);
  B.store.setState({ dialog: { npc: "elder", npcName: "Elder", node: { id: "after", choices: [] } } });
  const t1 = Date.now();
  while (Date.now() - t1 < 6000 && B.store.getState().dialog) await wait(100);
  const r = { closed: !B.store.getState().dialog, secs: ((Date.now() - t1) / 1000).toFixed(1), status: B.status() };
  console.log(r);
  console.log(r.closed ? "OK – Rest-Dialog geschlossen" : "FEHLER");
  process.exit(r.closed ? 0 : 1);
})();
