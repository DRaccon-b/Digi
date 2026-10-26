// 2.33.2: Der Leader meldet der Gruppe nur ein Ziel, das er wirklich angreift – nicht eines, das bloß ausgewählt ist
// (live: Boss-Rotation unterwegs, das Spiel wählte einen Angreifer aus, Makota griff ihn als „Ziel des Leaders“ an)
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const accounts = { leader: 0, popup: true, mirror: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
  const L = makeWorld({ slot: 0, accounts, tag: 'L', mobs: [[430, 330]], quests: { q00_meet_gennai: { state: 3, counters: [] } } });
  L.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
  L.w.eval(script);
  const seen = [];
  const bus = require('./groupbus')('digibot-group');
  bus.onmessage = (e) => { if (e.data?.type === 'state' && e.data.slot === 0) seen.push(e.data.targetId ?? null); };
  await wait(1500);
  L.store.setState({ target: { id: 'm:1', kind: 'mob', name: 'Kunemon', level: 2, hp: 300, maxHp: 300 } }); // nur ausgewählt, Bot aus
  await wait(3000);
  bus.close(); L.w.close();
  const sel = seen.slice(-3);
  console.log({ letzte: sel });
  const ok = sel.length > 0 && sel.every((x) => x === null);
  console.log(ok ? 'OK – bloß ausgewähltes Ziel wird nicht gemeldet' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
