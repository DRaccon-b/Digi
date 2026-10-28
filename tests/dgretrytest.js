// 3.1.5: Nach einem gescheiterten Dungeon-Lauf (rausgeflogen, nicht geschafft) stoppt der Bot, statt automatisch neu zu
// betreten – außer der Haken dgRetry ist gesetzt (dann wie bisher bis zu DG_TRIES Versuche).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function trial(retry) {
  const G = makeWorld({ slot: 0, tag: retry ? 'R' : 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    // Native Forest ist der „Dungeon“ (Raid-Map mit Tür auf Primary Village); der Raum liegt weit weg, der Bot bleibt stehen
    setup({ content }) { content.spawns.native_forest.raid = { id: 'test_dg', gate: { mapId: 'primary_village', portal: 'nf' }, party: { min: 1, max: 5 }, deathLimit: 3,
      dungeon: { rooms: [{ id: 'r1', area: 'meadow', landing: 'from_pv', gate: 'pv', waves: [] }], mode: { order: 0, label: 'dg_mode_easy' } } }; } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'easy', dgRetry: retry, autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 100 }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  const inside = G.status();
  // „rausgeflogen“: das Spiel setzt uns vor die Tür (Primary Village), der Lauf ist nicht geschafft
  const t = G.ents.get('t:me'); t.x = 10; t.y = 320; // ins Portal nach Primary Village laufen
  await wait(2500);
  const r = { retry, inside, map: G.state.world.mapId, status: G.status(), on: G.w.document.querySelector('[data-act="bot"]')?.textContent || '', log: G.log.slice(-3) };
  G.w.close();
  return r;
}
(async () => {
  const stop = await trial(false), again = await trial(true);
  console.log(stop, again);
  const ok = stop.map === 'primary_village' && /gescheitert – Bot gestoppt/.test(stop.status)
    && again.map === 'native_forest' && /Stopp/.test(again.on) && !/Bot gestoppt/.test(again.status); // mit Haken: wieder drin, Bot läuft
  console.log(ok ? 'OK – nach dem Rausfliegen gestoppt; mit Haken neuer Versuch' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
