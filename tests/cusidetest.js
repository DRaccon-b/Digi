// 3.2.46 (Nutzer 21.11.: „wieso macht er auf Autopilot nur Story-Quests und keine Nebenquests, wenn er das erste Mal die Story
// spielt?“). Mit „📜 Hinterste zuerst“ nehmen die Nachholer seit 3.2.17 nur Story-Quests an. Neue Option „📗 Nachholer nehmen
// auch Nebenquests mit“ (accounts.serveSide): Leader mit „🤝 Leader erledigt die Quests der Mitläufer“, ein Nachholer F1.
// A: F1 nimmt die Story-Quest an.
// B: F1 nimmt auch die Nebenquest an.
// C: der Leader jagt für die Nebenquest, F1 gibt sie ab.
// D: die Story-Quest wird trotzdem fertig und abgegeben.
// E: eine schon fertige Nebenquest gibt F1 ab.
// F (Review): eine offene Nebenquest, die nie fertig wird (Leader jagt, Kills zählen nicht), hält die Story-Abgabe und die
//    anderen Abgaben nicht zurück (apBatch-Regel „erst alle Ziele, dann abgeben“).
// G (Review): eine fertige Daily (per Board angenommen) gibt F1 trotzdem ab.
// Ohne Option bleibt alles wie 3.2.17 (tests/custorytest.js).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, serve: true, serveOrder: true, serveSide: true,
  list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'f1', char: 'Eins' }] };
const setup = ({ content }) => {
  content.quests.q10_a = { id: 'q10_a', name: 'Story A', giver: 'elecmon', turnIn: 'elecmon', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 2 }] };
  content.quests.s_herb = { id: 's_herb', name: 'Nebenquest', giver: 'gennai', turnIn: 'gennai', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
  content.quests.s_old = { id: 's_old', name: 'Alte Nebenquest', giver: 'gennai', turnIn: 'gennai', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
  content.quests.s_open = { id: 's_open', name: 'Offene Nebenquest', giver: 'gennai', turnIn: 'gennai', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 50 }] };
  content.dailies = { pool_g: { id: 'pool_g', levels: [1, 99], npcs: ['gennai'], quests: [{ id: 'd_kune', name: 'Daily: Kunemon', objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] }] } };
  content.dailyById = { d_kune: { ...content.dailies.pool_g.quests[0], pool: 'pool_g' } };
  content.quests.q02_first_steps.minLevel = 99; // nicht ablenken
};
const done = (...ids) => Object.fromEntries(ids.map((id) => [id, { state: 3, counters: [] }]));
let F1;
const credit = (W) => {
  const q = W.state.me.quests;
  for (const [id, x] of Object.entries(q)) {
    if (x.state !== 1 || !['q10_a', 's_herb'].includes(id)) continue;
    const need = id === 's_herb' ? 1 : 2, c = (x.counters[0] || 0) + 1;
    W.store.setState({ me: { ...W.state.me, quests: { ...W.state.me.quests, [id]: { state: c >= need ? 2 : 1, counters: [c] } } } });
  }
};
const L = makeWorld({ slot: 0, accounts, tag: 'L', setup, quests: done('q00_meet_gennai', 'q10_a', 's_herb', 's_old', 's_open', 'q02_first_steps'),
  onKill: (m) => { credit(F1); setTimeout(() => { m.hp = 300; m.targetId = ''; }, 600); } });
F1 = makeWorld({ slot: 1, accounts, tag: 'F1', setup, mobs: [], quests: { ...done('q00_meet_gennai', 'q02_first_steps'), s_old: { state: 2, counters: [1] },
  s_open: { state: 1, counters: [0] }, d_kune: { state: 2, counters: [1] } } });
for (const W of [L, F1]) { W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', radius: 400 })); W.w.eval(script); }
const qs = (W, id) => W.state.me.quests[id]?.state ?? 0;
(async () => {
  await wait(1200);
  L.w.document.querySelector('[data-act="bot"]').click();
  const ev = {}; const t0 = Date.now();
  while (Date.now() - t0 < 75000) {
    const t = Math.round((Date.now() - t0) / 100) / 10;
    if (!ev.a && qs(F1, 'q10_a') >= 1) ev.a = t;
    if (!ev.side && qs(F1, 's_herb') >= 1) ev.side = t;
    if (!ev.sideDone && qs(F1, 's_herb') === 3) ev.sideDone = t;
    if (!ev.old && qs(F1, 's_old') === 3) ev.old = t;
    if (!ev.done && qs(F1, 'q10_a') === 3) ev.done = t;
    if (!ev.daily && qs(F1, 'd_kune') === 3) ev.daily = t;
    if (ev.done && ev.sideDone && ev.old && ev.daily) break;
    await wait(100);
  }
  console.log(JSON.stringify({ ev, F1: F1.state.me.quests, Lkills: L.kills, F1status: F1.status(), Lstatus: L.status() }));
  const res = [
    [ev.a != null, 'A: Nachholer nimmt die Story-Quest an'],
    [ev.side != null, 'B: Nachholer nimmt auch die Nebenquest an'],
    [ev.sideDone != null, 'C: Leader jagt für die Nebenquest, Nachholer gibt sie ab'],
    [ev.done != null, 'D: Story-Quest trotzdem fertig und abgegeben'],
    [ev.old != null, 'E: fertige Nebenquest abgegeben'],
    [ev.done != null && ev.sideDone != null && qs(F1, 's_open') === 1, 'F: nie fertige Nebenquest hält die Abgaben nicht zurück'],
    [ev.daily != null, 'G: fertige Daily abgegeben'],
  ];
  for (const [ok, name] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + name);
  process.exit(res.every(([ok]) => ok) ? 0 : 1);
})();
