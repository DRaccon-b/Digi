// 2.9.0 Leader: gibt erst ab, wenn der Mitläufer auch fertig ist; wartet nach der Abgabe auf ihn; lädt in die Party ein
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const G = makeWorld({ slot: 0, tag: 'Leader', accounts, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } } });
G.w.eval(script);
const bus = new BroadcastChannel('digibot-group');
let leaderMsg = null;
bus.onmessage = (e) => { if (e.data?.type === 'state' && e.data.slot === 0) leaderMsg = e.data; };
const fol = { q: { state: 1, counters: [0] }, busy: null, done: [], fight: false };
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 1, role: 'follower', name: 'Foll', inWorld: true, mapId: 'native_forest', channel: 1, x: 900, y: 900,
  bot: true, status: 'folgt', quests: { q02_first_steps: fol.q }, ents: ['t:foll', 'p:foll'], talks: [], done: fol.done, busy: fol.busy, fight: fol.fight }), 400);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const statuses = [];
const watch = setInterval(() => { const s = G.status(); if (s !== statuses[statuses.length - 1]) { statuses.push(s); if (process.env.V) console.log('   > ' + s); } }, 100);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  // Leader erledigt sein Ziel …
  let t0 = Date.now();
  while (Date.now() - t0 < 20000 && G.state.me.quests.q02_first_steps.state !== 2) await wait(100);
  const ownReady = G.state.me.quests.q02_first_steps.state === 2;
  const killsAtReady = G.kills;
  await wait(4000);
  // … und jagt weiter, weil der Mitläufer noch 0/2 hat (keine Abgabe)
  const keptHunting = G.kills > killsAtReady && G.state.me.quests.q02_first_steps.state === 2;
  const noTurninYet = !statuses.some((s) => /abgeben/.test(s));
  // Mitläufer fertig -> Leader gibt ab
  fol.q = { state: 2, counters: [2] }; fol.fight = true;
  await wait(4000);
  const heldForFight = G.state.me.quests.q02_first_steps.state === 2 && statuses.some((x) => /warte, bis Foll den Kampf beendet/.test(x));
  fol.fight = false;
  t0 = Date.now();
  while (Date.now() - t0 < 30000 && G.state.me.quests.q02_first_steps.state !== 3) await wait(100);
  const turnedIn = G.state.me.quests.q02_first_steps.state === 3;
  const talk = leaderMsg?.talks?.find((x) => x.purpose === 'turnin');
  // Mitläufer hat die Abgabe noch nicht übernommen -> Leader wartet; sobald er sie übernimmt (busy), geht es weiter
  await wait(1200);
  const waited = /Gruppe: warte auf Foll/.test(G.status());
  fol.busy = talk?.key || null;
  await wait(2500);
  const released = !/Gruppe: warte/.test(G.status());
  fol.busy = null; fol.done = [talk?.key];
  clearInterval(tick); clearInterval(watch);
  const invited = G.invites.includes('Foll');
  const r = { heldForFight, ownReady, keptHunting, noTurninYet, turnedIn, talkShared: !!talk, waited, released, invited, status: G.status() };
  console.log(r);
  const ok = Object.entries(r).every(([k, v]) => k === 'status' || v === true);
  console.log(ok ? 'OK – Leader wartet auf die Gruppe' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
