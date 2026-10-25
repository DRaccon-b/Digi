// 2.50.0: Autopilot-Option „Quests nur erledigen, nicht abgeben“ – fertige Quests bleiben stehen (Abgeben macht man
// selbst), Ziele werden weiter erledigt und neue Quests weiter angenommen. Ohne Haken wird wie bisher abgegeben.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(apNoTurnin) {
  const ev = [];
  const G = makeWorld({ slot: 0, tag: 'T', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[600, 330], [640, 360], [680, 300]],
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'n:elder', kind: 3, defId: 'elder', x: 330, y: 300, hp: 0, flags: 0 }] : []),
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_a: { state: 2, counters: [1] }, q_b: { state: 1, counters: [0] } },
    setup({ content, MAPS }) {
      content.npcs.elder = { name: 'Elder' };
      MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'elder', x: 330, y: 300, properties: [{ name: 'npcId', type: 'string', value: 'elder' }] });
      const q = (id, name, count) => ({ id, name, giver: 'elder', turnIn: 'elder', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count }] });
      Object.assign(content.quests, { q_a: q('q_a', 'Fertig', 1), q_b: q('q_b', 'Noch 3 Kills', 3), q_c: q('q_c', 'Neu C', 99) });
    },
    onKill: (m, api) => { setTimeout(() => { m.hp = 300; m.targetId = ''; }, 300);
      const q = api.state.me.quests.q_b; if (q?.state === 1) { const c = q.counters[0] + 1; api.setQuest('q_b', { state: c >= 3 ? 2 : 1, counters: [c] }); } } });
  const L0 = G.log.push.bind(G.log);
  G.log.push = (s) => { const m = /^(abgegeben|angenommen): (\w+)/.exec(s); if (m) ev.push(m[1] + ':' + m[2]); return L0(s); };
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, apNoTurnin, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && !(G.state.me.quests.q_b?.state === 2 && G.state.me.quests.q_c?.state === 1) && !(!apNoTurnin && ev.length)) await wait(200);
  await wait(3000);
  const qs = G.state.me.quests, r = { ev: ev.join(' > '), a: qs.q_a?.state, b: qs.q_b?.state, c: qs.q_c?.state ?? 0 };
  G.w.close();
  return r;
}
(async () => {
  const on = await run(true), off = await run(false);
  console.log({ on, off });
  const ok = !/abgegeben/.test(on.ev) && on.a === 2 && on.b === 2 && on.c === 1 && /abgegeben:q_a/.test(off.ev);
  console.log(ok ? 'OK – nur erledigen und annehmen, nicht abgeben; ohne Haken wird abgegeben' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
