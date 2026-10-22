// 2.10.6: Reise-/Zonenziele in der Gruppe – Mitläufer läuft selbst in die Zone; Leader gibt erst ab, wenn der Mitläufer
// das Ziel auch hat
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const setup = ({ content, MAPS }) => {
  content.npcs.elder = { name: 'Elder' };
  MAPS.native_forest.layers[0].objects.push({ type: 'zone', name: 'glade', x: 650, y: 450, width: 150, height: 150 },
    { type: 'npc', name: 'elder', x: 330, y: 300, properties: [{ name: 'npcId', type: 'string', value: 'elder' }] });
  content.quests.q_r = { id: 'q_r', name: 'Zur Lichtung', giver: 'elder', turnIn: 'elder', minLevel: 1, objectives: [{ kind: 'reach', mapId: 'native_forest', zone: 'glade' }] };
  content.quests.q02_first_steps.minLevel = 99; // nicht ablenken
};
const extraEnts = (id) => (id === 'native_forest' ? [{ id: 'n:elder', kind: 3, defId: 'elder', x: 330, y: 300, hp: 0, flags: 0 }] : []);
// --- Mitläufer ---
const B = makeWorld({ slot: 1, tag: 'Folger', accounts, setup, extraEnts, mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] }, q_r: { state: 1, counters: [0] } } });
B.w.eval(script);
setInterval(() => { // Spiel: Zone betreten zählt
  const t = B.ents.get('t:me'), q = B.store.getState().me.quests.q_r;
  if (q.state === 1 && t.x >= 650 && t.x <= 800 && t.y >= 450 && t.y <= 600) { const s = B.store.getState(); B.store.setState({ me: { ...s.me, quests: { ...s.me.quests, q_r: { state: 2, counters: [1] } } } }); }
}, 100);
// --- Leader ---
const A = makeWorld({ slot: 0, tag: 'Leader', accounts, setup, extraEnts, mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] }, q_r: { state: 2, counters: [1] } } });
A.w.eval(script);
const bus = new BroadcastChannel('digibot-group');
const talks = [{ key: 'reach:q_r:0@1', tkey: 'reach:q_r:0', kind: 'reach', at: Date.now(), purpose: undefined, questId: 'q_r', objIndex: 0, need: 1, npcId: undefined,
  pool: null, loc: { mapId: 'native_forest', x: 725, y: 525 }, label: 'Zur Lichtung: nach Native Forest (glade) reisen' }];
// Für B spielt ein Test-Leader (Slot 0) – A ist auch Slot 0; damit B nicht A folgt, schickt der Test die Gespräche mit
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 400, y: 330,
  bot: true, status: 'x', quests: {}, ents: [], talks, done: [], busy: null, noFight: false, task: null, hunt: [], targetId: null }), 300);
(async () => {
  await wait(1200);
  A.w.document.querySelector('[data-act="bot"]').click();
  B.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  const heldBack = A.state.me.quests.q_r.state === 2; // B ist noch nicht in der Zone -> A gibt noch nicht ab
  const t0 = Date.now();
  while (Date.now() - t0 < 20000 && B.state.me.quests.q_r.state !== 2) await wait(100);
  const followerReached = B.state.me.quests.q_r.state === 2;
  const t1 = Date.now();
  while (Date.now() - t1 < 20000 && A.state.me.quests.q_r.state !== 3) await wait(100);
  clearInterval(tick);
  const r = { heldBack, followerReached, leaderTurnedIn: A.state.me.quests.q_r.state === 3, a: A.status(), b: B.status() };
  console.log(r);
  const ok = r.heldBack && r.followerReached && r.leaderTurnedIn;
  console.log(ok ? 'OK – Zonenziel in der Gruppe' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
