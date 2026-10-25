// 2.22.0: Beim selben NPC gleich alles erledigen – nach der Abgabe bei Elder die neue Quest bei Elder annehmen, bevor es
// zu Sage geht (nicht Elder -> Sage -> wieder Elder). Mit und ohne „gemeinsam abgeben“.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(apBatch) {
  const ev = [];
  const npc = (id, x) => ({ id: 'n:' + id, kind: 3, defId: id, x, y: 300, hp: 0, flags: 0 });
  const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    extraEnts: (id) => (id === 'native_forest' ? [npc('elder', 330), npc('sage', 760)] : []),
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_x: { state: 2, counters: [1] }, q_y: { state: 2, counters: [1] } },
    setup({ content, MAPS }) {
      for (const [id, x] of [['elder', 330], ['sage', 760]]) {
        content.npcs[id] = { name: id };
        MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: id, x, y: 300, properties: [{ name: 'npcId', type: 'string', value: id }] });
      }
      const q = (id, giver, turnIn) => ({ id, name: id, giver, turnIn, minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 99 }] });
      Object.assign(content.quests, { q_x: q('q_x', 'elder', 'elder'), q_y: q('q_y', 'sage', 'sage'), q_n: q('q_n', 'elder', 'elder') });
    } });
  const L0 = G.log.push.bind(G.log);
  G.log.push = (s) => { const m = /^(abgegeben|angenommen): (\w+)/.exec(s); if (m) ev.push(m[1].slice(0, 2) + ':' + m[2]); return L0(s); };
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, apBatch, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
  G.w.localStorage.setItem('cdigi.cfg.batch.v1', '1'); // gespeichertes apBatch gilt (sonst stellt CDigi 1.0.14 einmalig auf „an“ um)
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 40000 && ev.length < 3) await wait(200);
  G.w.close();
  return ev.join(' > ');
}
(async () => {
  const batch = await run(true), near = await run(false);
  console.log({ batch, near });
    // CDigi 1.0.14: mit „gemeinsam abgeben“ erst alle Abgaben, dann annehmen – der selbe NPC zieht dort nicht vor
  const ok = batch === 'ab:q_x > ab:q_y > an:q_n' && near === 'ab:q_x > an:q_n > ab:q_y';
  console.log(ok ? 'OK – beim selben NPC gleich abgeben und annehmen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
