// 3.2.10 (Nutzer 03.11.: Mitläufer warpt nie, digitiert Schritt für Schritt, isst ständig Bento). Der Server meldet beim Warp
// warpBlocker 'not_enough_tamer_energy' (Warp kostet die Summe aller Schritte bis zur Mega-Form) – der Bot nahm dann sofort den
// schrittweisen Weg. A: nur Tamer-DS fehlt, F3 vorhanden, Maximum reicht -> F3 essen, dann Warp (evolve(seraphimon, –, true)).
// B: anderes Hindernis (evolve_unavailable) -> schrittweise wie bisher (evolve(angemon)).
// C: Maximum zu klein für den Warp -> schrittweise, kein F3-Dauerfeuer.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const COST = 300, NEED = Math.ceil(COST * 1.1);

async function run(kind) {
  const G = makeWorld({ slot: 0, tag: 'W' + kind, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { Object.assign(content.digimon, { patamon: { name: 'Patamon' }, angemon: { name: 'Angemon' }, holyangemon: { name: 'Holy Angemon' }, seraphimon: { name: 'Seraphimon' } }); } });
  const maxDs = kind === 'C' ? 200 : 600;
  const evos = (sp, tds) => {
    const blocker = kind === 'B' ? 'evolve_unavailable' : tds < NEED ? 'not_enough_tamer_energy' : '';
    return [
      { species: 'patamon', from: null, stage: 'rookie', level: 1, unlocked: true, isCurrent: sp === 'patamon' },
      { species: 'angemon', from: 'patamon', stage: 'champion', level: 1, dsCost: 50, unlocked: true, canEvolveNow: sp === 'patamon' && tds >= 55, isCurrent: sp === 'angemon' },
      { species: 'holyangemon', from: 'angemon', stage: 'ultimate', level: 1, dsCost: 100, unlocked: true, canEvolveNow: sp === 'angemon' && tds >= 110, isCurrent: sp === 'holyangemon' },
      { species: 'seraphimon', from: 'holyangemon', stage: 'mega', level: 1, dsCost: 150, unlocked: true, canEvolveNow: sp === 'holyangemon' && tds >= 165, isCurrent: sp === 'seraphimon',
        ...(sp === 'patamon' ? { warp: { dsCost: COST, blocker } } : {}) },
    ];
  };
  const set = (sp, tds) => { const s = G.store.getState(); G.store.setState({ me: { ...s.me, tamerDs: tds, tamerMaxDs: maxDs, partner: { ...s.me.partner, species: sp, stage: sp === 'patamon' ? 'rookie' : 'x', level: 99, evolutions: evos(sp, tds) } } }); };
  const s0 = G.store.getState();
  G.store.setState({ me: { ...s0.me, hotbar: ['cmd:attack', null, null, null, null, null, null, null, null, null, 'item:bento'], inventory: [{ itemId: 'bento', qty: 20 }] } });
  set('patamon', 150);
  const evolves = []; let f3 = 0;
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.evolve = (sp, withP, warp) => { evolves.push(`${sp}${warp ? ':warp' : ''}`); const s = G.store.getState(); set(sp, s.me.tamerDs - (warp ? COST : 50)); };
  G.w.addEventListener('keydown', (e) => { if (e.code === 'F3') { f3++; const s = G.store.getState(); set(s.me.partner.species, Math.min(maxDs, s.me.tamerDs + 200)); } }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', evoWarp: true, levelEvoForm: 'seraphimon', levelEvoDark: '' }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(7000);
  G.w.close();
  return { kind, evolves, f3 };
}
(async () => {
  const A = await run('A'), B = await run('B'), C = await run('C');
  console.log(JSON.stringify({ A, B, C }));
  const okA = A.evolves[0] === 'seraphimon:warp' && A.f3 >= 1;
  const okB = B.evolves[0] === 'angemon';
  const okC = C.evolves[0] === 'angemon' && C.f3 <= 2;
  console.log(okA ? 'OK     A: nur Tamer-DS fehlt – F3, dann Warp' : 'FEHLER A');
  console.log(okB ? 'OK     B: anderes Warp-Hindernis – schrittweise' : 'FEHLER B');
  console.log(okC ? 'OK     C: Maximum reicht nicht – schrittweise' : 'FEHLER C');
  process.exit(okA && okB && okC ? 0 : 1);
})();
