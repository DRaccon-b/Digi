// 3.2.46 (Review 2): „📗 Nachholer nehmen auch Nebenquests mit“ zusammen mit der Map-Runde (apOrder 'sweep', gilt für alle
// Fenster). Die Young-Bounty-Sperre („nur auf der Runden-Map abgeben“) gilt nur für Leader/Solo – der Nachholer läuft keine
// Runde. Sonst nahm er a2b_daemon an, konnte die fertige Bounty aber nie abgeben.
// B1: F1 gibt die fertige Bounty bei Gennai ab, obwohl die Runde auf einer anderen Map steht.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, serve: true, serveOrder: true, serveSide: true,
  list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'f1', char: 'Eins' }] };
const setup = ({ content }) => {
  content.quests.a2b_daemon = { id: 'a2b_daemon', name: 'Bounty: Daemon', giver: 'gennai', turnIn: 'gennai', turnInMap: 'primary_village', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] }; // Abgabe nur im Dorf
  content.quests.s_open = { id: 's_open', name: 'Offene Nebenquest', giver: 'gennai', turnIn: 'gennai', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 50 }] }; // hält den Leader am Jagen
  for (const [k, m] of Object.entries(content.maps)) m.id = k; // für die Runden-Liste (sweepList)
  content.quests.q02_first_steps.minLevel = 99; // nicht ablenken
};
const done = (...ids) => Object.fromEntries(ids.map((id) => [id, { state: 3, counters: [] }]));
const L = makeWorld({ slot: 0, accounts, tag: 'L', setup, quests: done('q00_meet_gennai', 'a2b_daemon', 's_open', 'q02_first_steps'),
  onKill: (m) => { setTimeout(() => { m.hp = 300; m.targetId = ''; }, 600); } });
const F1 = makeWorld({ slot: 1, accounts, tag: 'F1', setup, mobs: [], quests: { ...done('q00_meet_gennai', 'q02_first_steps'), a2b_daemon: { state: 2, counters: [1] }, s_open: { state: 1, counters: [0] } } });
for (const W of [L, F1]) {
  const other = 'native_forest'; // Runde steht woanders (nur beim Nachholer: in der Testwelt läuft die Runde des Leaders nicht – geprüft wird F1)
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, ...(W === F1 ? { apOrder: 'sweep', apStartMap: other } : {}), hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', radius: 400 }));
  W.w.eval(script);
}
const qs = (W, id) => W.state.me.quests[id]?.state ?? 0;
(async () => {
  await wait(1200);
  L.w.document.querySelector('[data-act="bot"]').click();
  let at = null; const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    if (qs(F1, 'a2b_daemon') === 3) { at = Math.round((Date.now() - t0) / 100) / 10; break; }
    await wait(100);
  }
  console.log(JSON.stringify({ at, map: F1.state.world.mapId, F1: F1.state.me.quests, F1status: F1.status(), Lstatus: L.status() }));
  const ok = at != null;
  console.log((ok ? 'OK     ' : 'FEHLER ') + 'B1: Nachholer gibt die fertige Bounty ab (Map-Runde an)');
  process.exit(ok ? 0 : 1);
})();
