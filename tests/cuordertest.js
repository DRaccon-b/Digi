// 3.2.11 (Nutzer 03.11.: der Stärkste hilft, die Hintersten zuerst). Leader mit „🤝 Leader erledigt die Quests der Mitläufer“
// und „📜 Hinterste zuerst“. F1 ist in der Story zurück (1 Story-Quest fertig), F2 weiter (2 fertig).
// Erwartet: F1 nimmt Story- und Nebenquest selbst an (läuft dabei ohne zu kämpfen, obwohl ein Monster ihn angreift), der
// Leader jagt für F1, F1 gibt selbst ab. F2 ist dabei kurz im Ladebildschirm (darf F1 nicht verdrängen). F2 nimmt erst etwas an, wenn F1 ihn eingeholt hat – dann beide die nächste Story-Quest.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, serve: true, serveOrder: true,
  list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'f1', char: 'Eins' }, { on: true, user: 'f2', char: 'Zwei' }] };
const setup = ({ content }) => {
  content.quests.q10_a = { id: 'q10_a', name: 'Story A', giver: 'elecmon', turnIn: 'elecmon', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 2 }] };
  content.quests.q11_b = { id: 'q11_b', name: 'Story B', giver: 'elecmon', turnIn: 'elecmon', minLevel: 1, prereq: ['q10_a'], objectives: [{ kind: 'kill', species: 'kunemon', count: 2 }] };
  content.quests.s_herb = { id: 's_herb', name: 'Nebenquest', giver: 'gennai', turnIn: 'gennai', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
  content.quests.q02_first_steps.minLevel = 99; // nicht ablenken
};
const done = (...ids) => Object.fromEntries(ids.map((id) => [id, { state: 3, counters: [] }]));
let F1, F2;
// Kill des Leaders zählt für alle Mitläufer mit (Party)
const credit = (W) => {
  const q = W.state.me.quests;
  for (const [id, x] of Object.entries(q)) {
    if (x.state !== 1 || !['q10_a', 'q11_b', 's_herb'].includes(id)) continue;
    const need = id === 's_herb' ? 1 : 2, c = (x.counters[0] || 0) + 1;
    W.store.setState({ me: { ...W.state.me, quests: { ...W.state.me.quests, [id]: { state: c >= need ? 2 : 1, counters: [c] } } } });
  }
};
const L = makeWorld({ slot: 0, accounts, tag: 'L', setup, quests: done('q00_meet_gennai', 'q10_a', 'q11_b', 's_herb', 'q02_first_steps'),
  onKill: (m) => { credit(F1); credit(F2); setTimeout(() => { m.hp = 300; m.targetId = ''; }, 600); } });
F1 = makeWorld({ slot: 1, accounts, tag: 'F1', setup, quests: done('q00_meet_gennai', 'q02_first_steps') });
F2 = makeWorld({ slot: 2, accounts, tag: 'F2', setup, mobs: [], quests: done('q00_meet_gennai', 'q10_a', 'q02_first_steps') });
for (const W of [L, F1, F2]) { W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', radius: 400 })); W.w.eval(script); }
const qs = (W, id) => W.state.me.quests[id]?.state ?? 0;
(async () => {
  await wait(1200);
  L.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500); // erst wenn der Leader die Nachholgruppe gemeldet hat (vorher gilt das alte Stehenbleiben mit Abwehr)
  const m = F1.ents.get('m:1'); if (m) { m.targetId = 'p:me'; m.flags |= 32; } // Angreifer auf dem Weg
  const ev = {}; const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    const t = Math.round((Date.now() - t0) / 100) / 10;
    if (!ev.f1a && qs(F1, 'q10_a') >= 1) ev.f1a = t;
    if (!ev.f1s && qs(F1, 's_herb') >= 1) ev.f1s = t;
    if (!ev.f1done && qs(F1, 'q10_a') === 3) ev.f1done = t;
    if (!ev.f2first && (qs(F2, 'q11_b') >= 1 || qs(F2, 's_herb') >= 1)) ev.f2first = t;
    if (ev.f1a && !ev.f2load) { ev.f2load = t; F2.store.setState({ screen: 'loading' }); setTimeout(() => F2.store.setState({ screen: 'world' }), 3000); } // F2 lädt kurz neu
    if (ev.f2load && !ev.f1done && /bleibe stehen/.test(F1.status())) ev.f1stand = t;
    if (!ev.f1fight && (F1.store.getState().target?.id === 'm:1' || F1.kills > 0)) ev.f1fight = t;
    if (qs(F1, 'q11_b') >= 1 && qs(F2, 'q11_b') >= 1) { ev.both = t; break; }
    await wait(100);
  }
  const r = { ev, F1: F1.state.me.quests, F2: F2.state.me.quests, Lkills: L.kills, F1kills: F1.kills, F1status: F1.status(), F2status: F2.status(), Lstatus: L.status() };
  console.log(JSON.stringify(r));
  const okA = ev.f1a != null && ev.f1s != null;
  const okB = ev.f1done != null && L.kills >= 3;
  const okC = ev.f2first != null && ev.f2first >= ev.f1done;
  const okD = ev.both != null;
  const okF = !ev.f1stand; // F2 im Ladebildschirm zählt nicht als Story 0
  const okE = !ev.f1fight || ev.f1fight > ev.f1a; // vor dem Annehmen (unterwegs) kein Kampf
  console.log(okA ? 'OK     A: Nachholer nimmt Story- und Nebenquest selbst an' : 'FEHLER A');
  console.log(okB ? 'OK     B: Leader jagt, Nachholer gibt selbst ab' : 'FEHLER B');
  console.log(okC ? 'OK     C: Weiterer Mitläufer wartet, bis er eingeholt ist' : 'FEHLER C');
  console.log(okD ? 'OK     D: danach nehmen beide die nächste Story-Quest an' : 'FEHLER D');
  console.log(okE ? 'OK     E: unterwegs kein Kampf' : 'FEHLER E');
  console.log(okF ? 'OK     F: Ladebildschirm eines Mitläufers ändert die Nachholgruppe nicht' : 'FEHLER F');
  process.exit(okF && okA && okB && okC && okD && okE ? 0 : 1);
})();
