// 2.11.5: Mitläufer macht schon dasselbe Gespräch nach (gleiches Ziel) – der Leader wartet nicht „vor dem Map-Wechsel“
// auf ihn, sondern läuft gleich mit
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const G = makeWorld({ slot: 0, tag: 'Leader', accounts, mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 2, counters: [2] } } });
G.w.eval(script);
const bus = require('./cbus')();
const fol = { busy: null };
bus.onmessage = (e) => { const m = e.data; if (m?.type === 'state' && m.slot === 0) { const tk = (m.talks || []).find((x) => x.purpose === 'turnin'); if (tk) fol.busy = tk.key; } };
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 1, role: 'follower', name: 'Foll', inWorld: true, mapId: 'native_forest', channel: 1, x: 300, y: 330,
  bot: true, status: 'x', quests: { q02_first_steps: { state: 2, counters: [2] } }, ents: [], talks: [], done: [], busy: fol.busy, fight: false }), 250);
const statuses = new Set();
const watch = setInterval(() => statuses.add(G.status()), 100);
(async () => {
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && G.state.world.mapId !== 'primary_village') await wait(100);
  clearInterval(tick); clearInterval(watch);
  const waited = [...statuses].some((s) => /warte vor dem Map-Wechsel/.test(s));
  const r = { reachedPV: G.state.world.mapId === 'primary_village', waited, followerBusyWithSame: !!fol.busy };
  console.log(r);
  const ok = r.reachedPV && !waited && r.followerBusyWithSame;
  console.log(ok ? 'OK – Leader läuft mit, statt zu warten' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
