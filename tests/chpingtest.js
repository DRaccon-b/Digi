// 2.11.6: Wie live bei Phantomon – Ch 2 schließt, sobald niemand mehr drauf ist; der Boss ist auf beiden Kanälen tot, auf Ch 1
// kommt er früher. Der Bot darf nicht endlos Ch 1 <-> Ch 2 wechseln und Ch 1 nicht fälschlich 5 min sperren.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8').replace('const BOSS_CH_WAIT_MS = 20000;', 'const BOSS_CH_WAIT_MS = 1500;');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q_boss: { state: 1, counters: [0] } },
  setup({ content, MAPS }) {
    content.digimon.phantomon = { name: 'Phantomon' };
    content.spawns.native_forest.bosses = [{ species: 'phantomon', at: 'boss_x', level: 3, respawnMs: 900000 }];
    MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_x', x: 700, y: 500 });
    content.quests.q_boss = { id: 'q_boss', name: 'Reaper', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'phantomon', count: 1 }] };
    content.quests.q02_first_steps.minLevel = 99;
  },
  onKill(m, api) { if (m.defId === 'phantomon') api.setQuest('q_boss', { state: 2, counters: [1] }); } });
const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
const t0 = Date.now(), ready = { 1: t0 + 95000, 2: t0 + 130000 };
const switched = [];
let ch2Open = false;
const ch = () => G.store.getState().world.channel;
cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 2, maxClients: 40 }, ...(ch2Open ? [{ channel: 2, roomId: 'r2', clients: 1, maxClients: 40 }] : [])];
const setCh = (c) => { const s = G.store.getState(); G.store.setState({ world: { ...s.world, channel: c } }); if (c === 1) ch2Open = false; G.ents.delete('m:boss'); };
cmds.switchChannel = (roomId) => { switched.push(roomId); setCh(roomId === 'r2' ? 2 : 1); };
cmds.openChannel = async () => { switched.push('open2'); ch2Open = true; setCh(2); };
cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [{ map: 'native_forest', index: 0, channel: 1, respawnInMs: Math.max(1, ready[1] - Date.now()) }] } });
cmds.requestMapInfo = () => G.store.setState({ mapInfo: { mapId: 'native_forest', at: G.w.performance.now(), bosses: [{ index: 0, respawnInMs: Math.max(1, ready[ch()] - Date.now()) }] } });
setInterval(() => { if (Date.now() >= ready[ch()] && !G.ents.has('m:boss')) G.ents.set('m:boss', { id: 'm:boss', kind: 2, defId: 'phantomon', level: 3, x: 705, y: 505, hp: 300, maxHp: 300, flags: 16, targetId: '' }); }, 200);
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  while (Date.now() - t0 < 110000 && G.state.me.quests.q_boss.state !== 2) await wait(100);
  const log = G.w.document.querySelector('[data-f="log"]').textContent;
  if (process.env.V) console.log(log.slice(0, 1500));
  const r = { switched, killedOnCh: ch(), quest: G.state.me.quests.q_boss.state, falseBan: /Wechsel klappt nicht/.test(log), secs: Math.round((Date.now() - t0) / 1000) };
  console.log(r);
  const ok = r.quest === 2 && r.killedOnCh === 1 && switched.length <= 2 && !r.falseBan;
  console.log(ok ? 'OK – kein Kanal-Pingpong, Boss auf Ch 1' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
