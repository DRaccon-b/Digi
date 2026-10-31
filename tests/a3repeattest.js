// 3.1.42: Spiel-Update 2026-10-31 – A3-Nebenquests (a3s_…) haben einen eigenen Block `repeat`. Nimmt man sie nach dem
// Abschluss erneut an, stehen die Original-Ziele schon voll, dahinter der Tageszähler und dann die Zähler der
// Wiederholungsziele (Spiel: aa(def, counters) -> offset = objectives.length + 1).
// A: laufende Wiederholung (Original „sprich mit Gennai“ voll, Wiederholung „2 Kunemon“ offen) -> der Bot jagt Kunemon.
// B: Vorquest-Regel neu (Spiel: na): _4 (erstmals) ist annehmbar, obwohl die a3s-Vorquest _3 gerade wiederholt wird.
//    Kettenregel (Spiel: ea/ta): _1/_2 dürfen erst wieder, wenn jede Quest der Kette schon einmal fertig war – _4 nie -> nein.
// D: Kette nur _1–_3: _2 darf wieder angenommen werden, obwohl die Folgequest _3 gerade selbst als Wiederholung läuft
//    (state 1 mit Tageszähler) – früher verlangte der Bot state 3.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const today = Math.floor((Date.now() - 7 * 3600e3) / 864e5);
const IDS = (kind) => ['a3s_x_1', 'a3s_x_2', 'a3s_x_3', 'a3s_x_4'].slice(0, kind === 'A' ? 0 : kind === 'D' ? 3 : 4);

function run(kind, start) {
  const G = makeWorld({ slot: 0, tag: kind, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    mobs: kind === 'A' ? [[360, 300, 'kunemon'], [420, 340, 'kunemon']] : [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, a3_02_rivals: { state: 3, counters: [] }, ...start },
    setup({ content }) {
      for (const m of Object.values(content.maps)) m.series = 3;
      content.quests.a3_02_rivals = { id: 'a3_02_rivals', name: 'Rivals', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'talk', npcId: 'gennai' }] };
      content.quests.a3s_r_1 = { id: 'a3s_r_1', name: 'Wiederholung', giver: 'gennai', turnIn: 'gennai', minLevel: 1, prereq: ['a3_02_rivals'],
        objectives: [{ kind: 'talk', npcId: 'gennai' }], repeat: { objectives: [{ kind: 'kill', species: 'kunemon', count: 2 }] } };
      IDS(kind).forEach((id, i, all) => {
        content.quests[id] = { id, name: `Kette ${i + 1}`, giver: 'elecmon', turnIn: 'elecmon', giverMap: 'primary_village', turnInMap: 'primary_village', minLevel: 1,
          prereq: [i ? all[i - 1] : 'a3_02_rivals'], objectives: [{ kind: 'talk', npcId: 'gennai' }], repeat: { objectives: [{ kind: 'kill', species: 'kunemon', count: 3 }] } };
      });
    } });
  G.store.setState({ world: { ...G.store.getState().world, series: 3 } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  const tries = [];
  const Q = () => G.store.getState().me.quests;
  const accept = (id) => {
    tries.push(id);
    const s = Q()[id];
    G.store.setState({ me: { ...G.store.getState().me, quests: { ...Q(), [id]: s?.state === 3 ? { state: 1, counters: [1, s.counters[1], 0] } : { state: 1, counters: [0] } } } });
    G.log.push('angenommen: ' + id);
  };
  cmds.talk = (npc) => {
    const choices = IDS(kind).filter((id) => (Q()[id]?.state ?? 0) === 0 || Q()[id].state === 3).map((id) => ({ id: 'ac_' + id, action: 'acceptQuest', questId: id }));
    G.store.setState({ dialog: { npc, npcName: npc, node: { id: 'root', choices: [...choices, { id: 'bye' }] } } });
  };
  cmds.chooseDialog = (id) => { if (id.startsWith('ac_')) accept(id.slice(3)); G.store.setState({ dialog: null }); };
  cmds.acceptQuest = (id) => accept(id);
  const scene = G.w.dmo.game.scene.getScene('world'), sel = scene.select, picked = [];
  scene.select = (id) => { picked.push(id); return sel(id); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, apRepeat: true, apOrder: 'near', apBatch: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log',
    questOff: kind === 'A' ? {} : { a3s_x_3: true } })); // laufende _3 nicht jagen – es geht ums Annehmen
  G.w.eval(script);
  return { G, tries, picked };
}

(async () => {
  // A: Wiederholung läuft – Original voll (1), Tageszähler, Wiederholungsziel 0/2
  const A = run('A', { a3s_r_1: { state: 1, counters: [1, today - 1, 0] } });
  await wait(800);
  A.G.w.document.querySelector('[data-act="bot"]').click();
  for (let i = 0; i < 20 && !A.picked.length; i++) await wait(500);
  const statusA = A.G.w.document.querySelector('[data-f="status"]')?.textContent || '';
  const pickedA = A.picked.slice();
  A.G.w.close();
  // B/C: _1/_2 gestern wiederholt, _3 läuft gerade als Wiederholung, _4 nie angenommen
  const B = run('B', { a3s_r_1: { state: 3, counters: [1, today] }, a3s_x_1: { state: 3, counters: [1, today - 1] }, a3s_x_2: { state: 3, counters: [1, today - 1] }, a3s_x_3: { state: 1, counters: [1, today - 1, 0] } });
  await wait(800);
  B.G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !B.tries.includes('a3s_x_4')) await wait(200);
  await wait(6000);
  const triesB = B.tries.slice(), statusB = B.G.w.document.querySelector('[data-f="status"]')?.textContent || '';
  B.G.w.close();
  const D = run('D', { a3s_r_1: { state: 3, counters: [1, today] }, a3s_x_1: { state: 3, counters: [1, today - 1] }, a3s_x_2: { state: 3, counters: [1, today - 1] }, a3s_x_3: { state: 1, counters: [1, today - 1, 0] } });
  await wait(800);
  D.G.w.document.querySelector('[data-act="bot"]').click();
  const t1 = Date.now();
  while (Date.now() - t1 < 25000 && !D.tries.includes('a3s_x_2')) await wait(200);
  const triesD = D.tries.slice();
  D.G.w.close();
  console.log({ statusA, pickedA, triesB, statusB, triesD });
  const ok = pickedA.some((id) => id.startsWith('m:')) && triesB.includes('a3s_x_4') && !triesB.includes('a3s_x_1') && !triesB.includes('a3s_x_2')
    && triesD.includes('a3s_x_2');
  console.log(ok ? 'OK – A3-Wiederholungen mit eigenem Ziel und neuer Kettenregel' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
