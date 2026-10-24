// 2.48.2: Kanalliste nur für die aktuelle Map – live kam kurz nach einem Map-Wechsel noch die Liste der alten Map, ihre
// Raum-ID für „Ch 2“ brachte den Bot zurück auf die alte Map. Hier liefern die ersten beiden Abfragen Räume von Primary
// Village, obwohl der Bot in Native Forest steht: diese Raum-IDs darf er nie benutzen, danach wechselt er richtig auf Ch 2.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'C', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[360, 300], [420, 340]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.digimon.bossmon = { name: 'Bossmon', base: { hp: 3000 }, growth: { hp: 100 }, mob: { expBase: 20 } };
      content.spawns.native_forest.bosses = [{ species: 'bossmon', at: 'boss_b', level: 5, respawnMs: 120000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_b', x: 520, y: 330 });
    } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  let calls = 0;
  cmds.listChannels = async () => (++calls <= 2
    ? [{ channel: 1, roomId: 'p1', mapId: 'primary_village', clients: 1, maxClients: 40 }, { channel: 2, roomId: 'p2', mapId: 'primary_village', clients: 1, maxClients: 40 }]
    : [{ channel: 1, roomId: 'r1', mapId: 'native_forest', clients: 1, maxClients: 40 }, { channel: 2, roomId: 'r2', mapId: 'native_forest', clients: 1, maxClients: 40 }]);
  cmds.requestMapInfo = () => {};
  cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [
    { map: 'native_forest', index: 0, channel: 1, respawnInMs: 120000 }, { map: 'native_forest', index: 0, channel: 2 }] } });
  const used = [];
  cmds.switchChannel = (roomId) => { used.push(roomId); const s = G.store.getState(); G.store.setState({ world: { ...s.world, channel: roomId === 'r2' || roomId === 'p2' ? 2 : 1 }, target: null }); };
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 3, stats: { at: 2000, as: 1200 } } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10, radius: 250,
    levelRoute: true, levelA2: false, levelBoss: true, farmChannels: [1, 2] }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 20000 && !used.includes('r2')) await wait(200);
  console.log({ calls, used, status: G.status() });
  G.w.close();
  const ok = used.includes('r2') && !used.some((r) => r.startsWith('p'));
  console.log(ok ? 'OK – Raum-IDs einer anderen Map nie benutzt, Ch 2 der aktuellen Map erreicht' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
