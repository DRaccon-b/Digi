// 2.33.1: Dungeon-/Raid-Tür – ein als Mitläufer eingetragenes Fenster wartet nicht ewig auf einen Leader, der gar nicht
// online ist, sondern geht allein hinein (live: „An der Dungeon-Tür – warte auf den Leader“, Leader nicht da)
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, dungeon: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'acc2', char: 'Me' }] };
const G = makeWorld({ slot: 1, tag: 'F', accounts, mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] } },
  setup({ content, MAPS }) {
    content.digimon.apocalymon = { name: 'Apocalymon' };
    content.spawns.primary_village.raid = { id: 'apocalymon', gate: { mapId: 'native_forest', portal: 'pv' }, party: { min: 1, max: 5 }, deathLimit: 3, landing: 'from_nf' };
    content.spawns.primary_village.bosses = [{ species: 'apocalymon', level: 3, at: 'boss_x' }];
    MAPS.primary_village.layers[0].objects.push({ type: 'spawn', name: 'boss_x', x: 600, y: 330 });
  } });
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: false, dungeon: true, dgMode: 'apocalymon', hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
G.w.eval(script);
(async () => {
  await wait(1200);
  G.w.document.querySelector('[data-act="bot"]').click();
  let inside = false, waited = false;
  for (let i = 0; i < 60 && !inside; i++) { await wait(250); if (/warte auf den Leader/.test(G.status())) waited = true; inside = G.store.getState().world.mapId === 'primary_village'; }
  console.log({ inside, waited, status: G.status() });
  console.log(inside ? 'OK – Leader nicht da: allein hinein' : 'FEHLER');
  process.exit(inside ? 0 : 1);
})();
