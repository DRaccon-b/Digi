// 2.52.0: Lern-Route und Feldbosse.
// A: auf dem Weg zum Boss / am Spawnpunkt mit F1/F2 auf 70 % HP bzw. 40 % DS auffüllen (live: Mummymon +15 bei 55 % HP
//    begonnen) – auch wenn die normale Trank-Schwelle aus ist.
// B: hat der Boss das Digimon umgehauen, kommt er 30 min nicht mehr in die Boss-Runde (keine Level-Grenze, aber lernen).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(mode) {
  const pinAt = Date.now() + (mode === 'prep' ? 12000 : 0);
  const bossEnt = { id: 'b:1', kind: 2, defId: 'bossmon', x: 760, y: 330, hp: 900000, maxHp: 900000, level: 5, flags: 16, targetId: '' };
  const G = makeWorld({ slot: 0, tag: 'M', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.digimon.bossmon = { name: 'Bossmon', base: { hp: 3000 }, growth: { hp: 100 }, mob: { expBase: 20 } };
      content.spawns.native_forest.bosses = [{ species: 'bossmon', at: 'boss_b', level: 5, respawnMs: 900000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_b', x: 760, y: 330 });
    },
    extraEnts: (id) => (id === 'native_forest' && mode === 'faint' ? [bossEnt] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestMapInfo = () => {};
  cmds.requestBossPins = () => { if (mode === 'prep') G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [{ map: 'native_forest', index: 0, channel: 1, respawnInMs: Math.max(1, pinAt - Date.now()) }] } }); };
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, hotbar: ['cmd:attack', null, null, null, null, null, null, null, 'item:hp1', 'item:ds1'], inventory: [{ itemId: 'hp1', qty: 9 }, { itemId: 'ds1', qty: 9 }],
    partner: { ...st.me.partner, level: 3, hp: 500, maxHp: 1000, ds: 100, maxDs: 500, stats: { at: 2000, as: 1200 } } } });
  const keys = [];
  G.w.addEventListener('keydown', (e) => { if (e.code === 'F1' || e.code === 'F2') keys.push(e.code); }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10, radius: 250,
    levelRoute: true, levelA2: false, levelBoss: true, levelEvo: false, farmChannels: [1] }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let r;
  if (mode === 'prep') {
    for (let i = 0; i < 60 && !keys.length; i++) await wait(150);
    r = { keys: [...new Set(keys)].join(','), status: G.status() };
  } else {
    let hit = false;
    for (let i = 0; i < 80 && !hit; i++) { if (G.ents.get('b:1').hp < 900000) hit = true; await wait(150); }
    // umgehauen, 1,5 s später wieder da
    const s1 = G.store.getState(); G.store.setState({ me: { ...s1.me, partner: { ...s1.me.partner, fainted: true, hp: 0 } } });
    await wait(1500);
    // wie im Spiel: nach der Rückkehr ins Lager hat der Boss keine Wut mehr auf uns
    G.ents.get('b:1').targetId = '';
    const s2 = G.store.getState(); G.store.setState({ me: { ...s2.me, partner: { ...s2.me.partner, fainted: false, hp: 1000 } }, target: null });
    const hpAfter = G.ents.get('b:1').hp;
    let again = false;
    for (let i = 0; i < 35; i++) { if (G.store.getState().target?.id === 'b:1' || G.ents.get('b:1').hp < hpAfter) again = true; await wait(150); }
    r = { hit, again, noted: /umgehauen/.test(G.w.document.body.textContent) };
  }
  G.w.close();
  return r;
}
(async () => {
  const prep = await run('prep'), faint = await run('faint');
  console.log({ prep, faint });
  const ok = /F1/.test(prep.keys) && /F2/.test(prep.keys) && faint.hit && faint.noted && !faint.again;
  console.log(ok ? 'OK – vor dem Boss aufgefüllt; Boss, der umhaut, 30 min aus der Runde' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
