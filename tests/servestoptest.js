// 2.18.3: Mitläufer läuft gerade zu einem Aufhol-Ziel; dann schaltet der Leader „erledigt die Quests der Mitläufer“
// ein -> der Mitläufer bricht ab und bleibt stehen.
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const B = makeWorld({ slot: 1, tag: 'F', accounts, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q_r: { state: 1, counters: [0] } },
  setup({ content, MAPS }) {
    MAPS.native_forest.layers[0].objects.push({ type: 'zone', name: 'glade', x: 1400, y: 900, width: 150, height: 150 });
    content.quests.q_r = { id: 'q_r', name: 'Zur Lichtung', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'reach', mapId: 'native_forest', zone: 'glade' }] };
    content.quests.q02_first_steps.minLevel = 99;
  } });
B.w.eval(script);
const bus = require('./groupbus')('digibot-group');
let serve = false;
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 400, y: 330,
  bot: true, status: 'x', quests: {}, fin: ['q00_meet_gennai', 'q_r'], ents: [], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: null, serve }), 300);
const pos = () => { const t = B.ents.get('t:me'); return Math.round(t.x) + ',' + Math.round(t.y); };
(async () => {
  await wait(1200);
  B.w.document.querySelector('[data-act="bot"]').click();
  await wait(4000);
  const walking = { p: pos(), st: B.status() };
  serve = true;
  await wait(1500);
  const p1 = pos();
  await wait(2000);
  const p2 = pos();
  clearInterval(tick);
  const r = { walking, p1, p2, st: B.status() };
  console.log(r);
  const ok = walking.p !== '400,330' && p1 === p2 && /bleibe stehen/.test(r.st);
  console.log(ok ? 'OK – Mitläufer bleibt stehen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
