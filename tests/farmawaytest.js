// 2.13.5: Wie live bei Myotismon – der Bot wartet auf Ch 1 (Respawn in 2 min) und grindet dort normale Monster.
// Dann meldet der Boss-Timer: auf Ch 2 lebt der Boss. Der Bot muss sofort wechseln, statt weiter Monster zu kloppen.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
  mobs: [[690, 470, 'kunemon'], [720, 520, 'kunemon'], [740, 470, 'kunemon']],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  setup({ content, MAPS }) {
    content.digimon.myotismon_fog = { name: 'Myotismon' };
    content.spawns.native_forest.bosses = [{ species: 'myotismon_fog', at: 'boss_x', level: 3, respawnMs: 900000 }];
    MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_x', x: 700, y: 500 });
  },
  onKill(m) { setTimeout(() => { m.hp = m.maxHp; m.flags = 0; }, 800); } });
// Fog City: aggressive Monster greifen an, sobald man in der Nähe steht
setInterval(() => { const t = G.ents.get("t:me"); for (const m of G.ents.values()) if (m.kind === 2 && m.defId === "kunemon" && m.hp > 0 && Math.hypot(m.x - t.x, m.y - t.y) < 200) { m.targetId = "p:me"; m.flags |= 32; } }, 200);
const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
const t0 = Date.now(), ready = { 1: t0 + 120000, 2: t0 + 600000 };
let ch2Alive = false, switchedAt = null;
const ch = () => G.store.getState().world.channel;
cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 2, maxClients: 40 }, { channel: 2, roomId: 'r2', clients: 2, maxClients: 40 }];
cmds.switchChannel = (roomId) => { const c = roomId === 'r2' ? 2 : 1; const s = G.store.getState(); G.store.setState({ world: { ...s.world, channel: c } }); if (c === 2 && !switchedAt) switchedAt = Date.now(); };
cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [ch2Alive
  ? { map: 'native_forest', index: 0, channel: 2 }
  : { map: 'native_forest', index: 0, channel: 2, respawnInMs: ready[2] - Date.now() }] } });
cmds.requestMapInfo = () => G.store.setState({ mapInfo: { mapId: 'native_forest', at: G.w.performance.now(), bosses: [ch() === 2 && ch2Alive ? { index: 0 } : { index: 0, respawnInMs: Math.max(1, ready[ch()] - Date.now()) }] } });
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'boss', farmBosses: ['native_forest#myotismon_fog'], farmChannels: [1, 2],
  hpPot: 0, dsPot: 0, tdsPot: 0, radius: 400, lvlDiff: 20, tab: 'log' }));
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(12000); // wartet auf Ch 1 und grindet
  const before = { ch: ch(), kills: G.kills, status: G.status() };
  ch2Alive = true; const tAlive = Date.now();
  while (Date.now() - tAlive < 20000 && !switchedAt) await wait(100);
  const r = { before, switchedAfterMs: switchedAt ? switchedAt - tAlive : null, now: G.status() };
  console.log(r);
  const ok = before.ch === 1 && before.kills > 0 && r.switchedAfterMs !== null && r.switchedAfterMs < 8000;
  console.log(ok ? 'OK – Boss lebt auf Ch 2: sofort gewechselt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
