// 2.30.2: Dungeon-Modus digitiert in die eingestellte Form (Reiter Digimon → Digitation), schon vor dem Betreten
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
async function run(evo, want) {
  const G = makeWorld({ slot: 0, tag: 'D', noHash: true, accounts: { leader: 0, list: [{ user: 'acc1' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] } } });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, tamerDs: 300, partner: { ...st.me.partner, species: 'patamon', level: 30, evolutions: [{ species: 'patamon' },
    { species: 'angemon', from: 'patamon', canEvolveNow: true, dsCost: 10 }, { species: 'magnaangemon', from: 'angemon', dsCost: 10, level: 20 }] } } });
  const evolved = [];
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.evolve = (sp) => { evolved.push(sp); const s = G.store.getState(); const evos = s.me.partner.evolutions.map((e) => ({ ...e, canEvolveNow: e.from === sp }));
    G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp, evolutions: evos } } }); };
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, farm: false, dungeon: true, hpPot: 0, dsPot: 0, tdsPot: 0, apEvo: evo, tab: 'log' }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  let sawStatus = false;
  for (let i = 0; i < 40; i++) { await wait(200); if (/^Dungeon: Digitiere/.test(G.status())) sawStatus = true; }
  const r = { evo, evolved, species: G.store.getState().me.partner.species, sawStatus, status: G.status() };
  console.log(r);
  results.push(r.species === want && sawStatus);
  G.w.close();
}
(async () => {
  await run('angemon', 'angemon');
  await run('__max', 'magnaangemon');
  const ok = results.every(Boolean);
  console.log(ok ? 'OK – Dungeon-Modus digitiert vor dem Betreten' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
