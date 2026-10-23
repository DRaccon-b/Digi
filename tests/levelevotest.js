// 2.43.1: Lern-Route digitiert zwischen den Kämpfen in die höchstmögliche Form (nach dem Neuladen ist es wieder Rookie);
// gesperrte Stufen bleiben aus. Ohne Haken „Digitation“ bleibt es Rookie.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(levelEvo) {
  const G = makeWorld({ slot: 0, tag: 'E', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } }; } });
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, tamerDs: 300, partner: { ...st0.me.partner, level: 30, species: 'hawkmon', stats: { at: 2000, as: 1200 }, evolutions: [
    { species: 'hawkmon' }, { species: 'aquilamon', from: 'hawkmon', canEvolveNow: true, level: 11 },
    { species: 'shurimon', from: 'aquilamon', unlocked: false, canEvolveNow: false }] } } });
  const evolved = [];
  G.w.dmo.game.scene.getScene('world').deps.commands.evolve = (sp) => { evolved.push(sp); const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp } } }); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10, levelRoute: true, levelA2: false, levelEvo, levelBoss: false }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(6000);
  const r = { evolved, species: G.store.getState().me.partner.species };
  G.w.close();
  return r;
}
(async () => {
  const on = await run(true), off = await run(false);
  console.log({ on, off });
  const ok = on.evolved.join() === 'aquilamon' && on.species === 'aquilamon' && !off.evolved.length;
  console.log(ok ? 'OK – Lern-Route digitiert in die höchste freie Form, ohne Haken nicht' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
