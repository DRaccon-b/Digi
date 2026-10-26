// 2.10.4: Zwei Jagdziele auf derselben Map werden zusammengefasst. Ist eines fertig, jagt der Bot dessen Monster nicht
// weiter, gibt die fertige Quest zwischendurch beim NPC auf derselben Map ab und jagt dann nur noch das andere Ziel.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const killsBy = { kunemon: 0, mushroomon: 0 };
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q_b: { state: 1, counters: [0] }, q_a: { state: 1, counters: [0] } },
  mobs: [[400, 320, 'kunemon'], [430, 340, 'kunemon'], [380, 360, 'kunemon'], [450, 300, 'kunemon'], [700, 520, 'mushroomon'], [740, 540, 'mushroomon'], [720, 480, 'mushroomon']],
  extraEnts: (id) => (id === 'native_forest' ? [{ id: 'n:elder', kind: 3, defId: 'elder', x: 330, y: 300, hp: 0, flags: 0 }] : []),
  setup({ content, MAPS }) {
    content.digimon.mushroomon = { name: 'Mushroomon', mob: { drops: [{ itemId: 'spore', chance: 1 }] } };
    content.items.spore = { name: 'Spore' };
    content.npcs.elder = { name: 'Elder' };
    content.spawns.native_forest.zones.meadow.entries.push({ species: 'mushroomon', level: [1, 3] });
    content.spawns.native_forest.zones.glade = { entries: [{ species: 'mushroomon', level: [1, 3] }] };
    MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'elder', x: 330, y: 300, properties: [{ name: 'npcId', type: 'string', value: 'elder' }] },
      { type: 'zone', name: 'glade', x: 650, y: 450, width: 150, height: 150 });
    content.quests.q_a = { id: 'q_a', name: 'Kunemon-Plage', giver: 'elder', turnIn: 'elder', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
    content.quests.q_b = { id: 'q_b', name: 'Sporen', giver: 'elder', turnIn: 'elder', minLevel: 1, objectives: [{ kind: 'collect', itemId: 'spore', count: 3 }] };
  },
  onKill(m, api) {
    killsBy[m.defId]++;
    const q = api.state.me.quests;
    if (m.defId === 'kunemon' && q.q_a.state === 1) api.setQuest('q_a', { state: 2, counters: [1] });
    if (m.defId === 'mushroomon' && q.q_b.state === 1) { const c = q.q_b.counters[0] + 1; api.setQuest('q_b', { state: c >= 3 ? 2 : 1, counters: [c] }); }
  } });
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apBatch: false })); // 3.0.0: Standard ist jetzt „erst alles erledigen, dann abgeben“ – hier das Abgeben zwischendurch
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  let aDoneBeforeB = null;
  while (Date.now() - t0 < 40000 && G.state.me.quests.q_b.state < 2) {
    if (aDoneBeforeB === null && G.state.me.quests.q_a.state === 3) aDoneBeforeB = G.state.me.quests.q_b.state === 1;
    await wait(100);
  }
  const r = { killsBy, qA: G.state.me.quests.q_a.state, qB: G.state.me.quests.q_b.state, turnedInBetween: aDoneBeforeB === true, status: G.status() };
  console.log(r);
  const ok = killsBy.kunemon === 1 && r.qB >= 2 && r.turnedInBetween;
  console.log(ok ? 'OK – Teilziel raus, zwischendurch abgegeben' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
