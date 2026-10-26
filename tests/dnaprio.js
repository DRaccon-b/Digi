// 3.0.0: „Höchstmögliche Digitation“ – DNA hat Vorrang, sofern ein DNA-Partner da ist; Armor nie vor der normalen Linie.
// A: Veemon mit DNA-Partner -> ExVeemon -> Paildramon (DNA) -> Imperialdramon. B: ohne Partner -> normale Linie
// (AeroVeedramon). C: Lv 20, nur Champion oder Armor möglich -> ExVeemon, nicht Flamedramon.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(level, partner) {
  const G = makeWorld({ slot: 0, tag: 'D', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } } });
  const st0 = G.store.getState();
  const dna = partner ? { partner: { partnerId: 'pt:stingmon' } } : {};
  G.store.setState({ me: { ...st0.me, tamerDs: 300, partner: { ...st0.me.partner, level, species: 'veemon', evolutions: [
    { species: 'veemon' },
    { species: 'flamedramon', stage: 'armor', from: 'veemon', canEvolveNow: true, level: 15 },
    { species: 'exveemon', stage: 'champion', from: 'veemon', canEvolveNow: true, level: 11 },
    { species: 'aeroveedramon', stage: 'ultimate', from: 'exveemon', canEvolveNow: true, level: 25 },
    { species: 'paildramon', stage: 'jogress', from: 'exveemon', canEvolveNow: true, level: 25, jogress: dna },
    { species: 'imperialdramon_fighter', stage: 'mega', from: 'paildramon', canEvolveNow: true, level: 41 }] } } });
  const evolved = [];
  G.w.dmo.game.scene.getScene('world').deps.commands.evolve = (sp, withPartner) => { evolved.push(sp + (withPartner ? '+' + withPartner : '')); const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp } } }); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, apEvo: '__max', apMapEvo: false }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(level > 40 ? 16000 : 9000);
  G.w.close();
  return evolved.join(' > ');
}
(async () => {
  const a = await run(50, true), b = await run(50, false), c = await run(20, true);
  console.log({ a, b, c });
  const ok = a === 'exveemon > paildramon+pt:stingmon > imperialdramon_fighter' && b === 'exveemon > aeroveedramon' && c === 'exveemon';
  console.log(ok ? 'OK – DNA zuerst (mit Partner), sonst normale Linie, Armor nie vor Champion' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
