// 2.12.0: „Höchstmögliche Digitation“ – Patamon digitiert über Angemon zu MagnaAngemon (Pegasusmon-Ast ist gesperrt)
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } } });
const st0 = G.store.getState();
G.store.setState({ me: { ...st0.me, tamerDs: 300, partner: { ...st0.me.partner, level: 35, species: 'patamon', evolutions: [
  { species: 'patamon' }, { species: 'angemon', from: 'patamon', canEvolveNow: true, level: 11 },
  { species: 'pegasusmon', from: 'patamon', unlocked: false, canEvolveNow: false }, { species: 'magnaangemon', from: 'angemon', canEvolveNow: true, level: 30 },
  { species: 'seraphimon', from: 'magnaangemon', unlocked: false }] } } });
const evolved = [];
G.w.dmo.game.scene.getScene('world').deps.commands.evolve = (sp) => { evolved.push(sp); const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp } } }); };
G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, apEvo: '__max' }));
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(12000);
  const r = { evolved, species: G.store.getState().me.partner.species };
  console.log(r);
  const ok = evolved.join() === 'angemon,magnaangemon' && r.species === 'magnaangemon';
  console.log(ok ? 'OK – höchstmögliche Digitation' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
