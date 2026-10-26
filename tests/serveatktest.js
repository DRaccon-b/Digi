// 2.18.4: Leader erledigt die Quests – ein Monster greift den Leader neben dem Mitläufer an. Mit der Option bleibt der
// Mitläufer stehen (nur eigene Angreifer zählen), ohne hilft er wie bisher.
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(serve) {
  const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
  const F = makeWorld({ slot: 1, tag: 'F', accounts, mobs: [[480, 330]], quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: () => [{ id: 't:lead', kind: 0, x: 440, y: 330, hp: 1, flags: 0, targetId: 'm:1' }] });
  setInterval(() => { const m = F.ents.get('m:1'); if (m) { m.targetId = 't:lead'; m.flags |= 32 | 8; m.hp = 300; } }, 50);
  F.w.eval(script);
  const bus = require('./groupbus')('digibot-group');
  const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 440, y: 330,
    bot: true, status: 'x', quests: {}, fin: ['q00_meet_gennai'], ents: ['t:lead'], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: 'm:1', serve }), 300);
  await wait(1200);
  F.w.document.querySelector('[data-act="bot"]').click();
  let hit = false;
  F.w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') hit = true; }, true);
  await wait(4000);
  const t = F.ents.get('t:me');
  const r = { serve, target: F.store.getState().target?.id || '-', hit, pos: Math.round(t.x) + ',' + Math.round(t.y), st: F.status() };
  clearInterval(tick); bus.close(); F.w.close();
  return r;
}
(async () => {
  const on = await run(true), off = await run(false);
  console.log({ on, off });
  const ok = !on.hit && on.target !== 'm:1' && on.pos === '400,330' && off.hit;
  console.log(ok ? 'OK – Mitläufer bleibt stehen, auch wenn der Leader angegriffen wird' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
