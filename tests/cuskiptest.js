// 3.2.11 (Review): Der hinterste Mitläufer F1 kommt nicht weiter – seine nächste Story-Quest braucht Level 99. Nach 30 s ohne
// eigene Aufgabe wird er übersprungen, damit der weitere Mitläufer F2 seine Story-Quest annimmt und der Leader für ihn jagt.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, serve: true, serveOrder: true,
  list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'f1', char: 'Eins' }, { on: true, user: 'f2', char: 'Zwei' }] };
const setup = ({ content }) => {
  content.quests.q10_a = { id: 'q10_a', name: 'Story A', giver: 'elecmon', turnIn: 'elecmon', minLevel: 99, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 2 }] };
  content.quests.q11_b = { id: 'q11_b', name: 'Story B', giver: 'elecmon', turnIn: 'elecmon', minLevel: 1, prereq: ['q10_a'], objectives: [{ kind: 'kill', species: 'kunemon', count: 2 }] };
  content.quests.q02_first_steps.minLevel = 99;
};
const done = (...ids) => Object.fromEntries(ids.map((id) => [id, { state: 3, counters: [] }]));
const L = makeWorld({ slot: 0, accounts, tag: 'L', setup, quests: done('q00_meet_gennai', 'q10_a', 'q11_b', 'q02_first_steps'), onKill: (m) => setTimeout(() => { m.hp = 300; m.targetId = ''; }, 600) });
const F1 = makeWorld({ slot: 1, accounts, tag: 'F1', setup, mobs: [], quests: done('q00_meet_gennai', 'q02_first_steps') });
const F2 = makeWorld({ slot: 2, accounts, tag: 'F2', setup, mobs: [], quests: done('q00_meet_gennai', 'q10_a', 'q02_first_steps') });
for (const W of [L, F1, F2]) { W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', radius: 400 })); W.w.eval(script); }
const qs = (W, id) => W.state.me.quests[id]?.state ?? 0;
(async () => {
  await wait(1200);
  L.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now(); let early = false, at = null;
  while (Date.now() - t0 < 75000) {
    if (qs(F2, 'q11_b') >= 1) { at = (Date.now() - t0) / 1000; break; }
    await wait(200);
  }
  if (at != null && at < 25) early = true;
  const k0 = L.kills; await wait(8000);
  const r = { at, early, Lkills: L.kills - k0, F1q: qs(F1, 'q10_a'), F2status: F2.status(), Lstatus: L.status() };
  console.log(JSON.stringify(r));
  const okA = at != null && !early && r.F1q === 0;
  const okB = r.Lkills > 0;
  console.log(okA ? 'OK     A: blockierter Nachholer übersprungen, F2 nimmt an' : 'FEHLER A');
  console.log(okB ? 'OK     B: Leader jagt dann für F2' : 'FEHLER B');
  process.exit(okA && okB ? 0 : 1);
})();
