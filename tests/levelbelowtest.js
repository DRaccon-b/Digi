// 2.46.0: Lern-Route nimmt auch den Feldboss der Map darunter mit, solange er höchstens 2 Level unter dem Digimon liegt.
// Lern-Map Primary Village (Bigmon Lv 8–9), darunter Native Forest (Kunemon Lv 1–3) mit Bossmon. Digimon Lv 7:
// Bossmon Lv 6 (−1) -> mitnehmen; Bossmon Lv 4 (−3) -> stehen lassen und zur Lern-Map.
// Spawnt er erst in 25 s: zur Lern-Map, von dort rechtzeitig (Reisezeit eingerechnet) zurück zum Boss.
// 2.48.2: auf dem Weg zum Boss wird die Reisezeit je Map-Wechsel gemessen (Log).
// 2.50.0: früh am Spawnpunkt, Boss kommt erst 6 s nach dem Respawn-Zeitpunkt -> trotzdem warten (Suchzeit ab Respawn).
// 2.48.0: auch zwei Maps tiefer – mit einer Map dazwischen (Lv 5–6) liegt Native Forest zwei unter der Lern-Map.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(bossLv, spawnIn = 0, mid = false, late = 0) {
  const pinAt = Date.now() + spawnIn, showAt = pinAt + late;
  const bossEnt = { id: 'b:1', kind: 2, defId: 'bossmon', x: 760, y: 330, hp: 900000, maxHp: 900000, level: bossLv, flags: 16, targetId: '' };
  const G = makeWorld({ slot: 0, tag: 'B', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[360, 300], [420, 340]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.digimon.bigmon = { name: 'Bigmon', base: { hp: 400 }, growth: { hp: 30 }, mob: { expBase: 6.5 } };
      content.digimon.bossmon = { name: 'Bossmon', base: { hp: 3000 }, growth: { hp: 100 }, mob: { expBase: 20 } };
      content.spawns.native_forest.zones = { meadow: { entries: [{ species: 'kunemon', level: [1, 3], weight: 1 }] } };
      content.spawns.native_forest.bosses = [{ species: 'bossmon', at: 'boss_b', level: bossLv, respawnMs: 900000 }];
      content.spawns.primary_village.zones = { field: { entries: [{ species: 'bigmon', level: [8, 9], weight: 1 }] } };
      if (mid) { content.maps.mid_hills = { name: 'Mid Hills' }; content.spawns.mid_hills = { zones: { hill: { entries: [{ species: 'kunemon', level: [5, 6], weight: 1 }] } } }; }
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_b', x: 760, y: 330 });
      MAPS.primary_village.layers[0].objects.push({ type: 'zone', name: 'field', x: 500, y: 250, width: 200, height: 150 });
    },
    extraEnts: (id) => (id === 'native_forest' && Date.now() >= showAt ? [bossEnt] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestBossPins = () => { if (spawnIn) G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [{ map: 'native_forest', index: 0, channel: 1, respawnInMs: Math.max(1, pinAt - Date.now()) }] } }); }; cmds.requestMapInfo = () => {};
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 7, stats: { at: 2000, as: 1200 } } } });
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 8, radius: 250,
    levelRoute: true, levelA2: false, levelBoss: true, farmChannels: [1] }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seen = new Set();
  let hit = false, visited = false;
  for (let i = 0; i < (spawnIn ? 320 + late / 150 : 110); i++) {
    seen.add(G.status().replace(/ · .*/, '').slice(0, 60));
    if (G.state.world.mapId === 'native_forest' && Date.now() >= showAt && !G.ents.has('b:1')) G.ents.set('b:1', bossEnt);
    if ((G.ents.get('b:1')?.hp ?? 900000) < 900000 || bossEnt.hp < 900000) { hit = true; break; }
    if (G.state.world.mapId === 'primary_village') { visited = true; if (!spawnIn) break; }
    await wait(150);
  }
  const r = { hit, visited, hop: /Reisezeit gemessen/.test(G.w.document.body.textContent), map: G.state.world.mapId, st: [...seen].filter((x) => /Leveln|Boss|reise/.test(x)).slice(0, 5) };
  G.w.close();
  return r;
}
(async () => {
  const near = await run(6), low = await run(4), away = await run(6, 25000), two = await run(6, 0, true), lateB = await run(6, 25000, false, 22000);
  console.log({ near, low, away, two, lateB });
  const ok = near.hit && !low.hit && low.map === 'primary_village' && away.visited && away.hit && away.hop && two.hit && lateB.hit;
  console.log(ok ? 'OK – Boss der Map darunter mitgenommen, solange er höchstens 2 Level darunter liegt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
