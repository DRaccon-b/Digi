// 3.2.8 (Nutzer 03.11.: einstellen, wann der Bot zu einem Event aufbricht). Event (Mega-Jagd) beginnt in 8 min.
// A: „Event: aufbrechen 10 min vorher“ -> der Bot nimmt das Event als Ziel und reist hin.
// B: Standard (6 min) -> noch kein Aufbruch.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(lead) {
  const G = makeWorld({ slot: 0, tag: 'L' + (lead || 0), noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.bigmon_hunt = { name: 'Bigmon' }; } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.requestEvents = async () => { const now = Date.now(); return [{ id: 'mega_hunt', now, slot: null, state: 'idle', next: { boss: 'bigmon_hunt', mapId: 'primary_village', startMs: now + 8 * 60000 } }]; };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ hunt: true, autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', ...(lead ? { huntLeadMin: lead } : {}) }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let left = false;
  for (let i = 0; i < 40; i++) { await wait(150); if (/Event: Bigmon/.test(G.w.document.querySelector('.digibot__log')?.textContent || '') || G.state.world.mapId === 'primary_village') left = true; }
  G.w.close();
  return { lead, left };
}
(async () => {
  const A = await run(10), B = await run(0);
  console.log(JSON.stringify({ A, B }));
  const okA = A.left, okB = !B.left;
  console.log(okA ? 'OK     A: 10 min vorher eingestellt – bricht 8 min vorher auf' : 'FEHLER A');
  console.log(okB ? 'OK     B: Standard 6 min – noch nicht' : 'FEHLER B');
  process.exit(okA && okB ? 0 : 1);
})();
