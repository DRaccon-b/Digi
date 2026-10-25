// 2.10.3: Mitläufer übernimmt die Beute des Leaders in jedem Takt – hört der Leader auf zu jagen (z. B. weil er auf
// das Kampfende wartet, um abzugeben), fängt der Mitläufer nach dem laufenden Kampf keinen neuen an
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const B = makeWorld({ slot: 1, tag: 'Folger', accounts, quests: { q00_meet_gennai: { state: 3, counters: [] } } });
B.w.eval(script);
const bus = require('./cbus')();
const lead = { hunt: ['kunemon'] };
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 410, y: 320,
  bot: true, status: 'x', quests: {}, ents: ['t:lead', 'p:lead'], talks: [], done: [], busy: null, noFight: false, task: null, targetId: null, ...lead }), 300);
(async () => {
  await wait(1500);
  B.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 10000 && B.kills < 1) await wait(50);
  const killsWhileHunting = B.kills;
  lead.hunt = []; // Leader jagt nicht mehr
  await wait(400);
  const k1 = B.kills;
  await wait(5000);
  const r = { killsWhileHunting, extraKills: B.kills - k1, status: B.status() };
  clearInterval(tick);
  console.log(r);
  const ok = killsWhileHunting >= 1 && r.extraKills <= 1; // laufenden Kampf darf er beenden, keinen neuen anfangen
  console.log(ok ? 'OK – keine neuen Kämpfe ohne Jagd des Leaders' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
