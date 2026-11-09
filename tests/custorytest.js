// 3.2.17 (Nutzer 09.11.: „SpencerD rennt Quests annehmen, die gar nicht story-relevant sind“). Leader mit „🤝 Leader erledigt
// die Quests der Mitläufer“ und „📜 Hinterste zuerst“, ein Nachholer F1. Keine Story-Quest im Spiel setzt eine Nebenquest voraus.
// A: F1 nimmt die Story-Quest an.
// B: F1 nimmt die Nebenquest NICHT an.
// C: F1 gibt eine fertige Nebenquest nicht ab, solange es Story zu tun gibt.
// D: Leader jagt für die Story-Quest, F1 gibt sie ab – auch mit offener, jagdbarer Nebenquest im Log (Review: die Sammel-
//    Abgabe-Regel hielt sonst die Story-Abgabe zurück).
// E: Nichts mehr an Story zu tun (z. B. Level-Sperre): die fertige Nebenquest gibt er dann ab (EXP), die offene nimmt er nicht mit.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, serve: true, serveOrder: true,
  list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'f1', char: 'Eins' }] };
const setup = ({ content }) => {
  content.quests.q10_a = { id: 'q10_a', name: 'Story A', giver: 'elecmon', turnIn: 'elecmon', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 2 }] };
  content.quests.s_herb = { id: 's_herb', name: 'Nebenquest', giver: 'gennai', turnIn: 'gennai', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
  content.quests.s_old = { id: 's_old', name: 'Alte Nebenquest', giver: 'gennai', turnIn: 'gennai', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
  content.quests.s_open = { id: 's_open', name: 'Offene Nebenquest', giver: 'gennai', turnIn: 'gennai', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 50 }] };
  content.quests.s_far = { id: 's_far', name: 'Ferne Nebenquest', giver: 'gennai', turnIn: 'gennai', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'gorillamon', count: 5 }] };
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
const L = makeWorld({ slot: 0, accounts, tag: 'L', setup, quests: done('q00_meet_gennai', 'q10_a', 's_herb', 's_old', 's_open', 's_far', 'q02_first_steps'),
  onKill: (m) => { credit(F1); setTimeout(() => { m.hp = 300; m.targetId = ''; }, 600); } });
F1 = makeWorld({ slot: 1, accounts, tag: 'F1', setup, mobs: [], quests: { ...done('q00_meet_gennai', 'q02_first_steps'),
  s_old: { state: 2, counters: [1] }, s_open: { state: 1, counters: [0] }, s_far: { state: 1, counters: [0] } } });
for (const W of [L, F1]) { W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', radius: 400 })); W.w.eval(script); }
const qs = (W, id) => W.state.me.quests[id]?.state ?? 0;
(async () => {
  await wait(1200);
  L.w.document.querySelector('[data-act="bot"]').click();
  const ev = {}; const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const t = Math.round((Date.now() - t0) / 100) / 10;
    if (!ev.a && qs(F1, 'q10_a') >= 1) ev.a = t;
    if (!ev.side && qs(F1, 's_herb') >= 1) ev.side = t;
    if (!ev.old && qs(F1, 's_old') === 3) ev.old = t;
    if (!ev.done && qs(F1, 'q10_a') === 3) ev.done = t;
    if (ev.done && ev.old && t - Math.max(ev.done, ev.old) > 3) break; // danach noch kurz zusehen, ob er doch annimmt
    await wait(100);
  }
  console.log(JSON.stringify({ ev, F1: F1.state.me.quests, Lkills: L.kills, F1status: F1.status(), Lstatus: L.status() }));
  const res = [
    [ev.a != null, 'A: Nachholer nimmt die Story-Quest an'],
    [ev.side == null, 'B: Nachholer nimmt die Nebenquest nicht an'],
    [ev.old == null || (ev.done != null && ev.old > ev.done), 'C: fertige Nebenquest nicht vor der Story abgegeben'],
    [ev.done != null && L.kills >= 2, 'D: Leader jagt für die Story, Nachholer gibt sie ab (trotz offener Nebenquest)'],
    [ev.old != null && qs(F1, 's_open') === 1, 'E: ohne Story-Arbeit: fertige Nebenquest abgegeben, offene bleibt'],
  ];
  for (const [ok, name] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + name);
  process.exit(res.every(([ok]) => ok) ? 0 : 1);
})();
