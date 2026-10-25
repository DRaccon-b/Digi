// 2.16.0: Gruppe „Ziele verteilen“ – der Leader greift m:1 an. Mit der Option sucht sich der Mitläufer ein anderes
// Quest-Monster (auch wenn er schon auf m:1 zielt), ohne hilft er dem Leader bei m:1. 2.16.1: nur in 250 px um den Leader.
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(spread, mobs = [[410, 330], [470, 300], [500, 360]]) {
  const accounts = { leader: 0, popup: true, mirror: false, spread, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
  const F = makeWorld({ slot: 1, accounts, tag: 'F', mobs,
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_k: { state: 1, counters: [0] } },
    setup({ content }) { content.quests.q_k = { id: 'q_k', name: 'Viele Kunemon', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 999 }] }; } });
  // Monster sterben nicht (es geht nur um die Zielwahl)
  setInterval(() => { for (const m of F.ents.values()) if (m.kind === 2) { m.hp = 300; m.targetId = ''; } }, 50);
  F.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
  F.w.eval(script);
  const bus = require('./cbus')();
  const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 400, y: 330,
    bot: true, status: 'x', quests: { q_k: { state: 1, counters: [0] } }, fin: ['q00_meet_gennai', 'q02_first_steps'], ents: [], talks: [], done: [], busy: null, noFight: false, task: null, hunt: ['kunemon'], targetId: 'm:1' }), 300);
  await wait(1200);
  F.w.document.querySelector('[data-act="bot"]').click();
  await wait(1000);
  F.store.setState({ target: { id: 'm:1', kind: 'mob', name: 'Kunemon', level: 2, hp: 300, maxHp: 300 } }); // erwischt zufällig dasselbe
  const seen = [];
  for (let i = 0; i < 20; i++) { await wait(200); seen.push(F.store.getState().target?.id || '-'); }
  clearInterval(tick); bus.close(); F.w.close();
  const last = seen.slice(-10);
  return { spread, onM1: last.filter((x) => x === 'm:1').length, last: last.join(',') };
}
(async () => {
  const on = await run(true), off = await run(false), far = await run(true, [[410, 330], [660, 330]]);
  console.log({ on, off, far });
  const ok = on.onM1 === 0 && !on.last.includes('-') && off.onM1 >= 8 && far.onM1 >= 8; // weit weg vom Leader: lieber mithelfen
  console.log(ok ? 'OK – mit „Ziele verteilen“ nimmt der Mitläufer ein anderes Monster' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
