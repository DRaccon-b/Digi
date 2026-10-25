// 2.13.6: Boss-Rotation (z. B. Leader im Gruppen-Modus Bosse) digitiert in die eingestellte Form – vorher nur Autopilot/Mitläufer
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
async function run(evo, want) {
  const G = makeWorld({ slot: 0, tag: 'L', noHash: true, accounts: { leader: 0, list: [{ user: 'lead' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.myotismon_fog = { name: 'Myotismon' };
      content.spawns.native_forest.bosses = [{ species: 'myotismon_fog', at: 'boss_x', level: 3, respawnMs: 900000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_x', x: 420, y: 340 });
    } });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, tamerDs: 300, partner: { ...st.me.partner, species: 'patamon', level: 30, evolutions: [{ species: 'patamon' },
    { species: 'angemon', from: 'patamon', canEvolveNow: true, dsCost: 10 }, { species: 'magnaangemon', from: 'angemon', dsCost: 10, level: 20 }] } } });
  const evolved = [];
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.evolve = (sp) => { evolved.push(sp); const s = G.store.getState(); const evos = s.me.partner.evolutions.map((e) => ({ ...e, canEvolveNow: e.from === sp }));
    G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp, evolutions: evos } } }); };
  cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [{ map: 'native_forest', index: 0, channel: 1, respawnInMs: 300000 }] } });
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 2, maxClients: 40 }];
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'boss', farmBosses: ['native_forest#myotismon_fog'], farmChannels: [1],
    hpPot: 0, dsPot: 0, tdsPot: 0, apEvo: evo, tab: 'log' }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(9000);
  const r = { evo, evolved, species: G.store.getState().me.partner.species, status: G.status() };
  console.log(r);
  results.push(r.species === want);
  G.w.close();
}
(async () => {
  await run('angemon', 'angemon');
  await run('__max', 'magnaangemon');
  const ok = results.every(Boolean);
  console.log(ok ? 'OK – Boss-Rotation digitiert' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
