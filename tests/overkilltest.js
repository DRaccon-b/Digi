// 2.52.0: Normale Monster, die gleich fallen (Rest-HP unter ~0,6 s des eigenen Schadens), nicht mit Skills erschlagen –
// spart DS und DS-Tränke. Zähe Monster bekommen weiter Skills.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(hp) {
  const G = makeWorld({ slot: 0, tag: 'O', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'm:x', kind: 2, defId: 'kunemon', x: 430, y: 330, hp, maxHp: hp, level: 2, flags: 0, targetId: '' }] : []) });
  const st = G.store.getState();
  // Skill auf Taste 2, bereit, genug DS; geschätzter Schaden 1,55 × 2000 / 1,2 s ≈ 2 600/s -> „fällt gleich“ unter ~1 550 HP
  G.store.setState({ me: { ...st.me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...st.me.partner, ds: 500, maxDs: 500, stats: { at: 2000, as: 1200 },
    skills: [{ id: 'kunemon.zap', name: 'Zap', dsCost: 20, unlocked: true }] } } });
  let skill = 0;
  G.w.addEventListener('keydown', (e) => { if (e.code === 'Digit2') skill++; }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(600);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  G.w.close();
  return skill;
}
(async () => {
  const weak = await run(300), tough = await run(900000);
  console.log({ weak, tough });
  const ok = weak === 0 && tough > 0;
  console.log(ok ? 'OK – fast tote Monster ohne Skills, zähe mit Skills' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
