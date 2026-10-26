// 3.0.3: Map-für-Map-Runde mit „erst alles erledigen, dann abgeben“ gibt pro Map ab. Auf der Runden-Map (Primary
// Village) ist eine Quest fertig; eine liegengebliebene Quest einer anderen Map (Native Forest) ist noch offen.
// Vorher hielt die fremde Quest alle Abgaben auf (live: fertige Quests von drei Maps vorher noch im Log). Jetzt: erst
// hier abgeben, danach die Reste anderer Maps.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] },
      q_local: { state: 2, counters: [1] }, q_foreign: { state: 1, counters: [0] } },
    setup({ content }) {
      content.maps.native_forest = { id: 'native_forest', name: 'Native Forest', levelRange: [1, 5] };
      content.maps.primary_village = { id: 'primary_village', name: 'Primary Village', levelRange: [1, 5] };
      content.quests.q_local = { id: 'q_local', name: 'Hier fertig', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'talk', npcId: 'gennai' }] };
      content.quests.q_foreign = { id: 'q_foreign', name: 'Rest von woanders', giver: 'waldgeist', turnIn: 'waldgeist', giverMap: 'native_forest', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 2 }] };
      content.npcs.waldgeist = { name: 'Waldgeist' };
    } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apOrder: 'sweep', apSweepDir: 'up', apStartMap: 'primary_village', apSweepMap: 'primary_village',
    apBatch: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'quest', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let turnedAt = -1, killAt = -1;
  for (let i = 0; i < 200 && turnedAt < 0; i++) {
    if (killAt < 0 && G.kills > 0) killAt = i;
    if (G.state.me.quests.q_local?.state === 3) turnedAt = i;
    await wait(100);
  }
  const r = { turnedIn: turnedAt >= 0, killsBefore: killAt >= 0 && killAt < turnedAt, kills: G.kills, map: G.state.world.mapId, status: G.status() };
  console.log(r);
  G.w.close();
  const ok = r.turnedIn && !r.killsBefore;
  console.log(ok ? 'OK – erst auf der Runden-Map abgegeben, dann Reste anderer Maps' : 'FEHLER – fremde Quest hält die Abgabe auf');
  process.exit(ok ? 0 : 1);
})();
