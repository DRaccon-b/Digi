// 2.10.1: Angriffe spiegeln – Fenster ohne Bot greift das Ziel des Leaders an (und nichts, solange er nicht angreift)
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const C = makeWorld({ slot: 1, tag: 'Spiegel', accounts, quests: { q00_meet_gennai: { state: 3, counters: [] } } });
C.w.eval(script);
const keys = [];
C.w.addEventListener('keydown', (e) => keys.push(e.code), true);
const bus = require('./groupbus')('digibot-group');
const st = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 400, y: 320, bot: false,
  status: 'x', quests: {}, ents: ['t:lead', 'p:lead'], talks: [], done: [], busy: null, task: null, hunt: [], targetId: null }), 1000);
const pos = { mapId: 'native_forest', x: 400, y: 320, atk: null };
const pt = setInterval(() => bus.postMessage({ type: 'pos', slot: 0, channel: 1, ...pos }), 100);
const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms && !fn()) await wait(20); return fn() ? Date.now() - t0 : null; };
(async () => {
  await wait(2500);
  const r = {};
  r.noAttackWithoutTarget = !keys.includes('Digit1') && !C.state.target;
  pos.atk = 'm:2';
  r.selectMs = await until(() => C.state.target?.id === 'm:2', 3000);
  r.killedMs = await until(() => C.ents.get('m:2').hp <= 0, 8000);
  r.attacked = keys.filter((k) => k === 'Digit1').length;
  pos.atk = null;
  await wait(1500);
  const before = keys.filter((k) => k === 'Digit1').length;
  await wait(2000);
  r.stopsAfterKill = keys.filter((k) => k === 'Digit1').length === before;
  r.botOff = !C.w.document.querySelector('[data-act="bot"]').classList.contains('on');
  r.status = C.status();
  clearInterval(st); clearInterval(pt);
  console.log(r);
  const ok = r.noAttackWithoutTarget && r.selectMs !== null && r.selectMs < 800 && r.killedMs !== null && r.attacked >= 1 && r.stopsAfterKill && r.botOff;
  console.log(ok ? 'OK – Angriffe werden gespiegelt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
