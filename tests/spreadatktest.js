// 2.30.3: „Ziele verteilen“ – das Monster des Leaders schlägt zurück (zielt auf sein Digimon). Es darf für den
// Mitläufer trotzdem nicht als „Angreifer“ gelten, sonst gehen wieder alle auf dasselbe Monster.
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(spread) {
  const accounts = { leader: 0, popup: true, mirror: false, spread, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
  const F = makeWorld({ slot: 1, accounts, tag: 'F', mobs: [[410, 330], [470, 300], [500, 360]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_k: { state: 1, counters: [0] } },
    setup({ content }) { content.quests.q_k = { id: 'q_k', name: 'Viele Kunemon', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 999 }] }; },
    extraEnts: () => [{ id: 't:L', kind: 0, x: 395, y: 330, hp: 1, flags: 0, targetId: '' }, { id: 'p:L', kind: 1, x: 405, y: 330, hp: 1, flags: 0, targetId: 'm:1' }] });
  // Monster sterben nicht; m:1 kämpft mit dem Digimon des Leaders, die anderen sind frei
  setInterval(() => { for (const m of F.ents.values()) if (m.kind === 2) { m.hp = 300; m.targetId = m.id === 'm:1' ? 'p:L' : ''; } }, 50);
  F.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
  F.w.eval(script);
  const bus = require('./cbus')();
  const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 395, y: 330,
    bot: true, status: 'x', quests: { q_k: { state: 1, counters: [0] } }, fin: ['q00_meet_gennai', 'q02_first_steps'], ents: ['t:L', 'p:L'], talks: [], done: [], busy: null, noFight: false, task: null, hunt: ['kunemon'], targetId: 'm:1' }), 300);
  await wait(1200);
  F.w.document.querySelector('[data-act="bot"]').click();
  const seen = [];
  for (let i = 0; i < 25; i++) { await wait(200); seen.push(F.store.getState().target?.id || '-'); }
  clearInterval(tick); bus.close(); F.w.close();
  const last = seen.slice(-10);
  return { spread, onM1: last.filter((x) => x === 'm:1').length, last: last.join(',') };
}
(async () => {
  const on = await run(true), off = await run(false);
  console.log({ on, off });
  const ok = on.onM1 === 0 && !on.last.includes('-') && off.onM1 >= 8;
  console.log(ok ? 'OK – Monster des Leaders zählt beim Verteilen nicht als Angreifer' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
