// 2.43.1: Lern-Route digitiert zwischen den Kämpfen in die höchstmögliche Form (nach dem Neuladen ist es wieder Rookie);
// gesperrte Stufen bleiben aus. Ohne Haken „Digitation“ bleibt es Rookie.
// 2.49.1: auch unter Angriff (Befehl geht raus, Kampf läuft weiter); eine Kette aus sechs Schritten klappt ganz
// (Fehlversuche wurden nie zurückgesetzt – nach fünf gelungenen Schritten galt der nächste als „klappt nicht“).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(levelEvo, { chain = false, attacked = false } = {}) {
  const G = makeWorld({ slot: 0, tag: 'E', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } }; } });
  const st0 = G.store.getState();
  const evos = chain ? ['hawkmon', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6'].map((sp, i, a) => (i ? { species: sp, from: a[i - 1], canEvolveNow: true, level: 1 } : { species: sp }))
    : [{ species: 'hawkmon' }, { species: 'aquilamon', from: 'hawkmon', canEvolveNow: true, level: 11 }, { species: 'shurimon', from: 'aquilamon', unlocked: false, canEvolveNow: false }];
  G.store.setState({ me: { ...st0.me, tamerDs: 300, partner: { ...st0.me.partner, level: 30, species: 'hawkmon', stats: { at: 2000, as: 1200 }, evolutions: evos } } });
  if (attacked) G.ents.set('m:agg', { id: 'm:agg', kind: 2, defId: 'kunemon', level: 2, x: 420, y: 330, hp: 900000, maxHp: 900000, flags: 0, targetId: 'p:me' });
  const evolved = [];
  G.w.dmo.game.scene.getScene('world').deps.commands.evolve = (sp) => { evolved.push(sp); const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp } } }); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10, levelRoute: true, levelA2: false, levelEvo, levelBoss: false }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(chain ? 30000 : 6000);
  const r = { evolved, species: G.store.getState().me.partner.species };
  G.w.close();
  return r;
}
(async () => {
  const on = await run(true), off = await run(false), busy = await run(true, { attacked: true }), chain = await run(true, { chain: true });
  console.log({ on, off, busy, chain });
  const ok = on.evolved.join() === 'aquilamon' && on.species === 'aquilamon' && !off.evolved.length
    && busy.species === 'aquilamon' && chain.species === 'f6';
  console.log(ok ? 'OK – Lern-Route digitiert in die höchste freie Form, ohne Haken nicht' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
