// 2.9.0 Mitläufer: nimmt die Quest des Leaders an, meldet busy/done, folgt auf die Map des Leaders und hilft beim Jagen
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const G = makeWorld({ slot: 1, tag: 'Folger', accounts, quests: { q00_meet_gennai: { state: 3, counters: [] } } });
G.w.eval(script);
const bus = require('./groupbus')('digibot-group');
const seen = { busy: false, done: false };
bus.onmessage = (e) => {
  const m = e.data;
  if (m?.type !== 'state' || m.slot !== 1) return;
  if (m.busy === 'accept:q02_first_steps@1') seen.busy = true;
  if ((m.done || []).includes('accept:q02_first_steps@1')) seen.done = true;
};
const lead = { mapId: 'primary_village', x: 210, y: 480, hunt: [], targetId: null };
const talks = [{ key: 'accept:q02_first_steps@1', tkey: 'accept:q02_first_steps', at: Date.now(), purpose: 'accept', questId: 'q02_first_steps', objIndex: null, need: null,
  npcId: 'elecmon', pool: null, loc: { mapId: 'primary_village', x: 200, y: 456 }, label: '„First Steps“ annehmen bei Elecmon' }];
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, channel: 1, bot: true, status: 'x', quests: {},
  ents: ['t:lead', 'p:lead'], talks, done: [], busy: null, noFight: false, task: null, ...lead }), 400);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const statuses = [];
const watch = setInterval(() => { const s = G.status(); if (s !== statuses[statuses.length - 1]) { statuses.push(s); if (process.env.V) console.log('   > ' + s); } }, 100);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  let t0 = Date.now();
  while (Date.now() - t0 < 30000 && G.state.me.quests.q02_first_steps?.state !== 1) await wait(100);
  const accepted = G.state.me.quests.q02_first_steps?.state === 1;
  await wait(1500);
  // Leader geht jagen
  Object.assign(lead, { mapId: 'native_forest', x: 400, y: 320, hunt: ['kunemon'], targetId: 'm:2' });
  t0 = Date.now();
  while (Date.now() - t0 < 30000 && (G.state.me.quests.q02_first_steps?.counters?.[0] ?? 0) < 1) await wait(100);
  const followed = G.state.world.mapId === 'native_forest';
  const helped = (G.state.me.quests.q02_first_steps?.counters?.[0] ?? 0) >= 1;
  const accTab = G.w.document.querySelector('[data-accinfo="0"]')?.textContent || '';
  clearInterval(tick); clearInterval(watch);
  const r = { accepted, busyReported: seen.busy, doneReported: seen.done, followed, helped, leaderShown: /Lead · Leader/.test(accTab), accTab, status: G.status() };
  console.log(r);
  const ok = accepted && seen.busy && seen.done && followed && helped && r.leaderShown;
  console.log(ok ? 'OK – Mitläufer macht mit' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
