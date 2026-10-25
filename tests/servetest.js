// 2.18.1: „Leader erledigt die Quests der Mitläufer“ – der Mitläufer hat eine Kill-Quest, die der Leader weder hat noch
// annehmen kann. Der Leader jagt dafür; der Mitläufer bleibt stehen, greift von sich aus nichts an, wehrt aber Angreifer ab.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, serve: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const setup = ({ content }) => {
  content.npcs.elder = { name: 'Elder' };
  content.quests.q_k = { id: 'q_k', name: 'Kunemon jagen', giver: 'elder', turnIn: 'elder', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 50 }] };
  content.quests.q_lead = { id: 'q_lead', name: 'Nur für den Leader', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 99 }] };
  content.quests.q02_first_steps.minLevel = 99;
};
const base = { q00_meet_gennai: { state: 3, counters: [] } };
const respawn = (m) => setTimeout(() => { m.hp = 300; m.targetId = ''; }, 600);
const L = makeWorld({ slot: 0, accounts, tag: 'L', setup: (x) => { setup(x); x.content.quests.q_k.minLevel = 99; }, quests: { ...base }, onKill: respawn });
const F = makeWorld({ slot: 1, accounts, tag: 'F', setup, mobs: [[600, 330], [650, 360]], quests: { ...base, q_k: { state: 1, counters: [0] }, q_lead: { state: 3, counters: [] } }, onKill: respawn });
for (const W of [L, F]) { W.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', radius: 400 })); W.w.eval(script); }
const pos = (W) => { const t = W.ents.get('t:me'); return { x: Math.round(t.x), y: Math.round(t.y) }; };
(async () => {
  await wait(1200);
  const start = pos(F);
  L.w.document.querySelector('[data-act="grp-start"]').click();
  await wait(8000);
  const mid = { pos: pos(F), kills: F.kills, status: F.status() };
  // jetzt greift ein Monster den Mitläufer an
  const m = F.ents.get('m:1'); m.targetId = 'p:me'; m.flags |= 32;
  const t1 = Date.now(); let defended = false;
  while (Date.now() - t1 < 6000 && !defended) { defended = F.store.getState().target?.id === 'm:1' || F.kills > mid.kills; await wait(100); }
  const r = { start, mid, defended, end: pos(F), Lkills: L.kills, Lq: L.state.me.quests.q_lead?.state ?? 0, Lstatus: L.status() };
  console.log(r);
  const ok = r.mid.pos.x === start.x && r.mid.pos.y === start.y && r.mid.kills === 0 && r.defended && r.Lkills > 0 && r.Lq === 0;
  console.log(ok ? 'OK – Mitläufer bleibt stehen, Leader jagt für ihn' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
