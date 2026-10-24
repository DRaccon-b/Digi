// 2.55.0: Boss-Rotation – der Boss verschwindet bei ~90 % HP für 3 s aus der Sicht (Sichtweite/Verfolgung) und taucht
// wieder auf. Vorher galt „verschwunden auf derselben Map/demselben Kanal“ sofort als Sieg (Respawn-Timer, nächstes Ziel).
// Jetzt: vermisst, suchen, weiterkämpfen. B: verschwindet mit 10 % HP -> Sieg wie bisher.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(lowHp) {
  const G = makeWorld({ slot: 0, tag: 'F', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.tyrmon = { name: 'Tyrmon' };
      content.spawns.native_forest.bosses = [{ species: 'tyrmon', at: 'ridge', level: 5, respawnMs: 240000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'ridge', x: 470, y: 330 });
    },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'b:1', kind: 2, defId: 'tyrmon', x: 470, y: 330, hp: 20000, maxHp: 20000, level: 5, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestBossPins = () => {}; cmds.requestMapInfo = () => {};
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'boss', farmBosses: ['native_forest#tyrmon'], farmChannels: [1],
    hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 8, radius: 500 }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  for (let i = 0; i < 60 && G.ents.get('b:1').hp > 18000; i++) await wait(150);
  const b = G.ents.get('b:1');
  if (lowHp) { b.hp = 2000; await wait(500); } // der Bot sieht ihn noch mit 10 %
  G.store.setState({ target: null });
  G.ents.delete('b:1'); // aus der Sicht
  await wait(3000);
  const log1 = G.w.document.body.textContent;
  if (!lowHp) G.ents.set('b:1', b); // wieder da
  const hpBack = b.hp;
  await wait(3000);
  const log = G.w.document.body.textContent;
  const r = { killedLog: /Boss besiegt: Tyrmon/.test(log1), missLog: /aus der Sicht verloren/.test(log), hpLossAfter: hpBack - b.hp, status: G.status() };
  G.w.close();
  return r;
}
(async () => {
  const a = await run(false), b = await run(true);
  console.log({ a, b });
  const ok = !a.killedLog && a.missLog && a.hpLossAfter > 0 && b.killedLog;
  console.log(ok ? 'OK – verschwundener Boss mit viel HP ist vermisst, nicht besiegt; mit wenig HP besiegt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
