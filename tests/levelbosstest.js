// 2.43.0: Lern-Route nimmt Feldbosse der Map mit (ohne Enrage-Timer): beim Ankommen Kanäle ansehen, dann zum
// lebenden Boss laufen und kämpfen. Ohne Haken „Feldbosse mitnehmen“ bleibt er in der Zone und lässt den Boss stehen.
// 2.45.1: ist Ch 2 erlaubt, aber noch nicht offen, öffnet der Bot ihn zum Ansehen (live: nur Ch 1 offen, Ch 2 nie angesehen).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(levelBoss, lvlDiff = 10, chans = [1]) {
  const G = makeWorld({ slot: 0, tag: 'L', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[360, 300], [420, 340]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.digimon.bossmon = { name: 'Bossmon', base: { hp: 3000 }, growth: { hp: 100 }, mob: { expBase: 20 } };
      content.spawns.native_forest.bosses = [{ species: 'bossmon', at: 'boss_b', level: 5, respawnMs: 900000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_b', x: 760, y: 330 });
    },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'b:1', kind: 2, defId: 'bossmon', x: 760, y: 330, hp: 900000, maxHp: 900000, level: 5, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  let opened = 0; cmds.openChannel = async () => { opened++; };
  cmds.requestBossPins = () => {}; cmds.requestMapInfo = () => {};
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 3, stats: { at: 2000, as: 1200 } } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff, radius: 250,
    levelRoute: true, levelA2: false, levelBoss, farmChannels: chans }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seen = new Set();
  let hit = false;
  for (let i = 0; i < 110; i++) { seen.add(G.status().replace(/ · .*/, '').slice(0, 60)); if (G.ents.get('b:1').hp < 900000) { hit = true; if (chans.length < 2) break; } if (opened) break; await wait(150); }
  const r = { hit, opened, st: [...seen].filter((x) => /Leveln|Boss|warte|laufe/.test(x)).slice(0, 5) };
  G.w.close();
  return r;
}
(async () => {
  const on = await run(true), off = await run(false), high = await run(true, 1); // 2.44.3: Boss Lv 5 bei Grenze +1 (Lv 3)
  const two = await run(true, 10, [1, 2]);
  console.log({ on, off, high, two });
  const ok = on.hit && !off.hit && high.hit && two.opened > 0 && !on.opened;
  console.log(ok ? 'OK – Feldboss der Lern-Map mitgenommen, ohne Haken nicht' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
