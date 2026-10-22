// 2.10.3: NPC mit „stations“ (je Quest-Stand woanders) wird am richtigen Ort gesucht – Elecmon steht bei „ready“
// im Lager (600/200) statt an seinem normalen Platz (200/456); NPCs sind nur in Sichtweite in der Entity-Liste
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, list: [{ on: false, user: 'solo' }] };
const G = makeWorld({ slot: 0, tag: 'Solo', accounts, noHash: true, viewRange: 200,
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 2, counters: [2] } },
  setup({ content, MAPS, npcPos }) {
    content.npcs.elecmon.stations = [
      { mapId: 'primary_village', point: 'elecmon_start', when: { quest: 'q02_first_steps', state: 'available' } },
      { mapId: 'primary_village', point: 'camp', when: { quest: 'q02_first_steps', state: ['active', 'ready'] } },
    ];
    MAPS.primary_village.layers[0].objects.push({ type: 'spawn', name: 'camp', x: 500, y: 60 }, { type: 'spawn', name: 'elecmon_start', x: 200, y: 456 });
    npcPos.elecmon = { x: 500, y: 60 };
  } });
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 40000 && G.state.me.quests.q02_first_steps.state !== 3) await wait(200);
  const r = { turnedIn: G.state.me.quests.q02_first_steps.state === 3, notThere: G.log.some((l) => /nicht da/.test(l)) || /nicht da/.test(G.status()), status: G.status() };
  console.log(r);
  const ok = r.turnedIn;
  console.log(ok ? 'OK – NPC an seiner Station gefunden' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
