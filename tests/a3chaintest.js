// 3.1.39: A3-Nebenquests (a3s_…) gehen im Spiel nur in Kettenreihenfolge erneut. Live: „The Walk Home“ (_1) lief noch,
// der Bot wollte trotzdem „Behind the Bakery“ (_3) und „One Safe Delivery“ (_4) wieder annehmen – der Server lehnte mit
// „You already took …“ ab. Erwartung: A) _1 wird angenommen, _2/_3 nicht gleich mit; B) ist _1 heute erledigt, kommt _2
// dran, _3 aber noch nicht.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const today = Math.floor((Date.now() - 7 * 3600e3) / 864e5);
const IDS = ['a3s_x_1', 'a3s_x_2', 'a3s_x_3'];

function run(start) {
  const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, a3_02_rivals: { state: 3, counters: [] }, ...start },
    setup({ content }) {
      for (const m of Object.values(content.maps)) m.series = 3;
      content.quests.a3_02_rivals = { id: 'a3_02_rivals', name: 'Rivals', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'talk', npcId: 'gennai' }] };
      IDS.forEach((id, i) => {
        content.quests[id] = { id, name: `Kette ${i + 1}`, giver: 'elecmon', turnIn: 'elecmon', giverMap: 'primary_village', turnInMap: 'primary_village', minLevel: 1,
          prereq: [i ? IDS[i - 1] : 'a3_02_rivals'], objectives: [{ kind: 'kill', species: 'kunemon', count: 2 }] };
      });
    } });
  G.store.setState({ world: { ...G.store.getState().world, series: 3 } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  const tries = [];
  const Q = () => G.store.getState().me.quests;
  const day = (id) => { const s = Q()[id]; return s?.state === 3 ? s.counters[1] : undefined; };
  // Server wie im Spiel: Wiederholung nur, wenn die Vorquest an einem späteren Tag erledigt ist als diese
  const allowed = (id) => { const i = IDS.indexOf(id), own = Q()[id]?.counters?.[1] ?? -1; return i === 0 || (day(IDS[i - 1]) ?? -Infinity) > own; };
  const accept = (id) => {
    tries.push(id);
    const s = Q()[id];
    if (!s || s.state !== 3 || !allowed(id)) { G.log.push('abgelehnt: ' + id); return; }
    G.store.setState({ me: { ...G.store.getState().me, quests: { ...Q(), [id]: { state: 1, counters: [0, s.counters[1]] } } } });
    G.log.push('angenommen: ' + id);
  };
  cmds.talk = (npc) => {
    const choices = IDS.filter((id) => Q()[id]?.state === 3).map((id) => ({ id: 'ac_' + id, action: 'acceptQuest', questId: id }));
    G.store.setState({ dialog: { npc, npcName: npc, node: { id: 'root', choices: [...choices, { id: 'bye' }] } } });
  };
  cmds.chooseDialog = (id) => { if (id.startsWith('ac_')) accept(id.slice(3)); G.store.setState({ dialog: null }); };
  cmds.acceptQuest = (id) => accept(id);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, apRepeat: true, apOrder: 'near', apBatch: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
  G.w.eval(script);
  return { G, tries };
}

(async () => {
  // A: alle gestern wiederholt – wie live: _1 annehmen, _2/_3 beim selben NPC nicht gleich mitnehmen
  const A = run({ a3s_x_1: { state: 3, counters: [2, today - 1] }, a3s_x_2: { state: 3, counters: [2, today - 1] }, a3s_x_3: { state: 3, counters: [2, today - 1] } });
  await wait(800);
  A.G.w.document.querySelector('[data-act="bot"]').click();
  for (let i = 0; i < 44; i++) { await wait(500); const t=A.G.w.document.querySelector('[data-f="status"]')?.textContent; if(process.env.DBG) console.log(i, t, JSON.stringify(A.G.store.getState().me.quests.a3s_x_3)); }
  const triesA = A.tries.slice();
  A.G.w.close();
  // B: _1 heute schon wiederholt -> _2 ist frei, _3 noch nicht
  const B = run({ a3s_x_1: { state: 3, counters: [2, today] }, a3s_x_2: { state: 3, counters: [2, today - 1] }, a3s_x_3: { state: 3, counters: [2, today - 1] } });
  await wait(800);
  B.G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !B.tries.includes('a3s_x_2')) await wait(200);
  await wait(8000);
  const triesB = B.tries.slice();
  console.log({ triesA, triesB, statusB: B.G.w.document.querySelector('[data-f="status"]')?.textContent });
  const ok = triesA.includes('a3s_x_1') && !triesA.some((id) => id !== 'a3s_x_1') && triesB.includes('a3s_x_2') && !triesB.includes('a3s_x_3') && !triesB.includes('a3s_x_1');
  console.log(ok ? 'OK – A3-Nebenquests nur in Kettenreihenfolge wiederholt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
