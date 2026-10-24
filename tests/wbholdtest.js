// 2.55.0: Weltboss – der Bot kämpft auf Kanal 2 gegen den Weltboss (der gerade einen anderen Spieler angreift). Kanal 1
// ist laut Chat-Warnung gleichzeitig fällig (Gleichstand -> Kanal 1 bevorzugt). Vorher forderte die Neuplanung mitten im
// Kampf den Wechsel auf Kanal 1 an. Jetzt bleibt der Kanal, solange der Boss hier lebt.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'B', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.bwg = { name: 'BlackWarGreymon' };
      content.spawns.native_forest.bosses = [{ species: 'bwg', at: 'boss_w', level: 3, respawnMs: 10800000, worldBoss: { warnMs: 3000 } }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_w', x: 470, y: 330 });
    } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 3, maxClients: 40, mapId: 'native_forest' }, { channel: 2, roomId: 'r2', clients: 3, maxClients: 40, mapId: 'native_forest' }];
  let switches = 0; cmds.switchChannel = () => { switches++; };
  cmds.requestMapInfo = () => {}; cmds.requestBossPins = () => {};
  // auf Kanal 2, der Weltboss steht da und greift einen anderen Spieler an
  G.store.setState({ world: { ...G.state.world, channel: 2, roomId: 'r2' } });
  const boss = { id: 'w:2', kind: 2, defId: 'bwg', x: 470, y: 330, hp: 90000, maxHp: 90000, level: 3, flags: 16, targetId: 'p:other' };
  G.ents.set('w:2', boss);
  const keepT = setInterval(() => { boss.targetId = 'p:other'; }, 5);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, radius: 200, wboss: true, autopilot: false, levelRoute: false }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  G.store.setState({ chat: [{ code: 'worldboss_warning', ts: Date.now(), text: 'BlackWarGreymon erscheint gleich' }] });
  const hp0 = boss.hp, sts = new Set();
  for (let i = 0; i < 60; i++) { sts.add(G.status().slice(0, 70)); await wait(150); }
  clearInterval(keepT);
  const r = { switches, hpLoss: hp0 - boss.hp, sts: [...sts].slice(0, 5) };
  console.log(r);
  G.w.close();
  const ok = r.switches === 0 && r.hpLoss > 0;
  console.log(ok ? 'OK – Weltboss-Kampf auf Kanal 2 läuft weiter, kein Wechsel auf Kanal 1' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
