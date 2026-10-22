// 2.30.5: Warten auf einen Quest-Boss – in der Wartezeit nichts angreifen außer Angreifern (bis 2.30.4 wurden normale
// Monster am Spawnpunkt mitgenommen); erscheint der Boss, geht es auf den Boss.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8').replace('const BOSS_CH_WAIT_MS = 20000;', 'const BOSS_CH_WAIT_MS = 999999;');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[470, 360], [520, 300]],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_boss: { state: 1, counters: [0] } },
  setup({ content, MAPS }) {
    content.digimon.arukenimon = { name: 'Arukenimon' };
    content.spawns.native_forest.bosses = [{ species: 'arukenimon', at: 'boss_a', level: 3, respawnMs: 900000 }];
    MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_a', x: 450, y: 330 });
    content.quests.q_boss = { id: 'q_boss', name: 'The Spider Queen', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'arukenimon', count: 1 }] };
  },
  onKill(m, api) { if (m.defId === 'arukenimon') api.setQuest('q_boss', { state: 2, counters: [1] }); else { killedIds.push(m.id); setTimeout(() => { m.hp = 300; m.targetId = ''; }, 500); } } });
const killedIds = [];
const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 2, maxClients: 40 }];
cmds.requestBossPins = () => {}; cmds.requestMapInfo = () => {};
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(6000);
  const idleKills = killedIds.length; // nur warten – nichts angreifen
  // jetzt greift m:2 an: das wird abgewehrt
  const atk = setInterval(() => { const m = G.ents.get('m:2'); if (m && !killedIds.includes('m:2')) m.targetId = 'p:me'; }, 200);
  await wait(5000);
  clearInterval(atk);
  const fillKills = idleKills;
  const attackerKilled = killedIds.includes('m:2'), otherKilled = killedIds.includes('m:1');
  G.ents.set('b:1', { id: 'b:1', kind: 2, defId: 'arukenimon', level: 3, x: 455, y: 335, hp: 600, maxHp: 600, flags: 16, targetId: '' });
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && G.state.me.quests.q_boss.state !== 2) await wait(200);
  const r = { fillKills, attackerKilled, otherKilled, bossKilled: G.state.me.quests.q_boss.state === 2, secs: Math.round((Date.now() - t0) / 1000), st: G.status() };
  console.log(r);
  const ok = fillKills === 0 && attackerKilled && !otherKilled && r.bossKilled;
  console.log(ok ? 'OK – beim Warten nur Angreifer abgewehrt, dann den Boss' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
