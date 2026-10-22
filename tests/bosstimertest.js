// 2.11.2: Boss-Quest – Boss auf Ch 1 und Ch 2 tot; laut Boss-Timer kommt er auf Ch 2 (wo der Bot steht) viel früher.
// Der Bot bleibt auf Ch 2 (kein Wechsel zum langsameren Ch 1) und besiegt ihn nach dem Respawn.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8').replace('const BOSS_CH_WAIT_MS = 20000;', 'const BOSS_CH_WAIT_MS = 1500;');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q_boss: { state: 1, counters: [0] } },
  setup({ content, MAPS }) {
    content.digimon.andromon = { name: 'Andromon' };
    content.spawns.native_forest.bosses = [{ species: 'andromon', at: 'boss_x', level: 3, respawnMs: 600000 }];
    MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_x', x: 700, y: 500 });
    content.quests.q_boss = { id: 'q_boss', name: 'Herz der Maschine', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'andromon', count: 1 }] };
    content.quests.q02_first_steps.minLevel = 99;
  },
  onKill(m, api) { if (m.defId === 'andromon') api.setQuest('q_boss', { state: 2, counters: [1] }); } });
const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
const switched = [];
const rooms = [{ channel: 1, roomId: 'r1', clients: 5, maxClients: 40 }, { channel: 2, roomId: 'r2', clients: 3, maxClients: 40 }];
cmds.listChannels = async () => rooms;
cmds.openChannel = async () => { throw new Error('soll nicht öffnen'); };
cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [
  { map: 'native_forest', index: 0, channel: 1, respawnInMs: 300000 }, { map: 'native_forest', index: 0, channel: 2, respawnInMs: Math.max(1, ch2At - Date.now()) }] } });
cmds.requestMapInfo = () => {};
let ch2At = Date.now() + 14000;
cmds.switchChannel = (roomId) => { switched.push(roomId); const s = G.store.getState(); G.store.setState({ world: { ...s.world, channel: roomId === 'r2' ? 2 : 1 } }); };
setInterval(() => { // Respawn auf Ch 2
  if (Date.now() >= ch2At && G.store.getState().world.channel === 2 && !G.ents.has('m:boss')) G.ents.set('m:boss', { id: 'm:boss', kind: 2, defId: 'andromon', level: 3, x: 705, y: 505, hp: 300, maxHp: 300, flags: 16, targetId: '' });
}, 200);
{ const s0 = G.store.getState(); G.store.setState({ world: { ...s0.world, channel: 2 } }); }
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 35000 && G.state.me.quests.q_boss.state !== 2) await wait(100);
  const r = { switched, quest: G.state.me.quests.q_boss.state, status: G.status() };
  console.log(r);
  const ok = switched.length === 0 && r.quest === 2;
  console.log(ok ? 'OK – bleibt beim kürzesten Respawn' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
