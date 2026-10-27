// 3.0.7: Maps mit Einstiegsquest (alle A02-/Tamers-Maps) zählen erst, wenn die Quest angenommen oder erledigt ist.
// Eine Tamers-Map (Serie 3, Megidramon-Weltboss) hängt per Portal am Primary Village: ohne die Tor-Quest darf sie weder
// in der Map-Runde noch beim Weltboss auftauchen, der Autopilot reist nicht hin; mit erledigter Quest schon – mit „A3“.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function trial(gateDone) {
  const G = makeWorld({ slot: 0, tag: gateDone ? 'T' : 'L', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, ...(gateDone ? { a3_gate: { state: 3, counters: [1] } } : {}) },
    setup({ content, MAPS }) {
      content.maps.native_forest = { id: 'native_forest', name: 'Native Forest', levelRange: [1, 5] };
      content.maps.primary_village = { id: 'primary_village', name: 'Primary Village', levelRange: [1, 5] };
      content.maps.tamers_x = { id: 'tamers_x', name: 'Shinjuku Park', levelRange: [19, 23], series: 3, entryQuest: 'a3_gate' };
      content.digimon.megidramon = { name: 'Megidramon' };
      content.quests.a3_gate = { id: 'a3_gate', name: 'Across the Digital Gate', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'talk', npcId: 'gennai' }] };
      content.spawns.tamers_x = { zones: {}, bosses: [{ species: 'megidramon', level: 20, at: 'boss_mg', respawnMs: 600000, worldBoss: { warnMs: 300000 }, enrageMs: 300000 }] };
      MAPS.tamers_x = { layers: [{ type: 'objectgroup', name: 'objects', objects: [{ type: 'spawn', name: 'from_pv', x: 100, y: 300 }, { type: 'spawn', name: 'boss_mg', x: 500, y: 300 }] }] };
      MAPS.primary_village.layers[0].objects.push({ type: 'portal', name: 'gate', x: 400, y: 100, width: 32, height: 32, properties: [{ name: 'toMap', type: 'string', value: 'tamers_x' }, { name: 'toSpawn', type: 'string', value: 'from_pv' }] });
    } });
  const sc = G.w.dmo.game.scene.getScene('world');
  sc.deps.manifest.maps.tamers_x = { tmj: 'maps/tamers_x.tmj' };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apOrder: 'sweep', apSweepDir: 'up', wboss: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'quest', lvlDiff: 100 }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click(); // lädt die Weltkarte
  await wait(2500);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(400);
  const opts = [...G.w.document.querySelectorAll('[data-apsel="apStartMap"] option')].map((o) => o.textContent);
  G.w.document.querySelector('[data-act="wboss"]').click(); // schreibt die gewählten Weltbosse ins Log
  G.w.document.querySelector('[data-tab="log"]').click();
  await wait(500);
  const log = [...G.w.document.querySelectorAll('[data-f="log"] > div')].map((d) => d.textContent);
  const r = { gateDone, tamersListed: opts.some((o) => /Shinjuku Park/.test(o)), a3Label: opts.some((o) => /^A3 · Shinjuku Park/.test(o)),
    wbNamed: log.some((l) => /Weltboss.*Megidramon/.test(l)), wbNone: log.some((l) => /Weltboss an – keine Weltbosse/.test(l)) };
  G.w.close();
  return r;
}
(async () => {
  const locked = await trial(false), open = await trial(true);
  console.log(locked, open);
  const ok = !locked.tamersListed && !locked.wbNamed && open.tamersListed && open.a3Label && open.wbNamed;
  console.log(ok ? 'OK – Tamers-Map nur mit erledigter Einstiegsquest, als A3' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
