// 2.21.0/2.21.1: „Erst alle Quests erledigen, dann gemeinsam abgeben“ – Reihenfolge: Ziele -> alle Abgaben -> alle Annahmen
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(apBatch) {
  const ev = [];
  const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[600, 330], [640, 360], [680, 300]],
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'n:elder', kind: 3, defId: 'elder', x: 330, y: 300, hp: 0, flags: 0 }] : []),
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_a: { state: 2, counters: [1] }, q_b: { state: 1, counters: [0] } },
    setup({ content, MAPS }) {
      content.npcs.elder = { name: 'Elder' };
      MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'elder', x: 330, y: 300, properties: [{ name: 'npcId', type: 'string', value: 'elder' }] });
      const q = (id, name, count) => ({ id, name, giver: 'elder', turnIn: 'elder', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count }] });
      Object.assign(content.quests, { q_a: q('q_a', 'Fertig', 1), q_b: q('q_b', 'Noch 3 Kills', 3), q_c: q('q_c', 'Neu C', 99), q_d: q('q_d', 'Neu D', 99),
        q_far: { ...q('q_far', 'Andere Map', 99), giver: 'gennai', turnIn: 'gennai' } }); // 2.21.1: Annahme auf einer anderen Map erst später
    },
    onKill: (m, api) => { ev.push('kill'); setTimeout(() => { m.hp = 300; m.targetId = ''; }, 300);
      const q = api.state.me.quests.q_b; if (q?.state === 1) { const c = q.counters[0] + 1; api.setQuest('q_b', { state: c >= 3 ? 2 : 1, counters: [c] }); } } });
  const L0 = G.log.push.bind(G.log);
  G.log.push = (s) => { const m = /^(abgegeben|angenommen): (\w+)/.exec(s); if (m) ev.push(m[1] + ':' + m[2]); return L0(s); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, apBatch, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 45000 && !(G.state.me.quests.q_c?.state === 1 && G.state.me.quests.q_d?.state === 1)) await wait(200);
  await wait(apBatch ? 8000 : 500);
  const map = G.store.getState().world.mapId, far = G.state.me.quests.q_far?.state ?? 0;
  G.w.close();
  if (apBatch) ev.push('map=' + map, 'far=' + far);
  // aufeinanderfolgende Kills zusammenfassen
  return ev.filter((e, i) => !(e === 'kill' && ev[i - 1] === 'kill')).join(' > ');
}
(async () => {
  const on = await run(true), off = await run(false);
  console.log({ on, off });
  const ok = /^kill > abgegeben:q_\w > abgegeben:q_\w > angenommen:q_[cd] > angenommen:q_[cd]/.test(on) && /map=native_forest > far=0/.test(on) && /^abgegeben:q_a/.test(off);
  console.log(ok ? 'OK – erst erledigen, dann alles abgeben, dann alles annehmen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
