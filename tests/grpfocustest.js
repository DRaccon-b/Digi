// 2.22.1: Ohne „Ziele verteilen“ greift der Mitläufer das Ziel des Leaders an – auch wenn ihn selbst ein anderes
// Monster angreift (außer bei wenig HP) und auch wenn das Ziel über seinem Level-Limit liegt.
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run({ lowHp = false, strong = false } = {}) {
  const accounts = { leader: 0, popup: true, mirror: false, spread: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
  const F = makeWorld({ slot: 1, tag: 'F', accounts, mobs: [[470, 330], [420, 360]], quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
  // m:1 = Ziel des Leaders, m:2 greift den Mitläufer an; beide sterben nicht
  setInterval(() => { const a = F.ents.get('m:1'), b = F.ents.get('m:2');
    if (a) { a.hp = 300; a.targetId = 't:lead'; a.level = strong ? 40 : 2; } if (b) { b.hp = 300; b.targetId = 'p:me'; b.flags |= 32; } }, 50);
  F.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', lvlDiff: 5 }));
  if (lowHp) { const s = F.store.getState(); F.store.setState({ me: { ...s.me, partner: { ...s.me.partner, hp: 900 } } }); }
  F.w.eval(script);
  const bus = require('./cbus')();
  const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 440, y: 330,
    bot: true, status: 'x', quests: {}, fin: ['q00_meet_gennai', 'q02_first_steps'], ents: [], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: 'm:1' }), 300);
  await wait(1200);
  F.w.document.querySelector('[data-act="bot"]').click();
  const seen = [];
  for (let i = 0; i < 25; i++) { await wait(200); seen.push(F.store.getState().target?.id || '-'); }
  clearInterval(tick); bus.close(); F.w.close();
  const last = seen.slice(-10);
  return { m1: last.filter((x) => x === 'm:1').length, m2: last.filter((x) => x === 'm:2').length };
}
(async () => {
  const normal = await run(), low = await run({ lowHp: true }), strong = await run({ strong: true });
  console.log({ normal, low, strong });
  const ok = normal.m1 >= 8 && low.m2 >= 8 && strong.m1 >= 8;
  console.log(ok ? 'OK – Mitläufer bleibt auf dem Ziel des Leaders' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
