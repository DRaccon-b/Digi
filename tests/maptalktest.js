// 2.17.0: Gruppen-Knopf „Abgeben & Annehmen“ – jedes Fenster gibt fertige Quests dieser Map ab und nimmt die hier
// verfügbaren an (nicht die einer anderen Map), danach ist der Bot wieder aus wie vorher.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const setup = ({ content, MAPS }) => {
  content.npcs.elder = { name: 'Elder' };
  MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'elder', x: 330, y: 300, properties: [{ name: 'npcId', type: 'string', value: 'elder' }] });
  content.quests.q_a = { id: 'q_a', name: 'Hier annehmen', giver: 'elder', turnIn: 'elder', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 99 }] };
  content.quests.q_b = { id: 'q_b', name: 'Hier abgeben', giver: 'elder', turnIn: 'elder', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
  content.quests.q_far = { id: 'q_far', name: 'Andere Map', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 99 }] };
  content.quests.q02_first_steps.minLevel = 99;
};
const ents = (id) => (id === 'native_forest' ? [{ id: 'n:elder', kind: 3, defId: 'elder', x: 330, y: 300, hp: 0, flags: 0 }] : []);
const base = { q00_meet_gennai: { state: 3, counters: [] } };
const L = makeWorld({ slot: 0, accounts, tag: 'L', mobs: [], extraEnts: ents, setup, quests: { ...base, q_b: { state: 3, counters: [] } } });
const F = makeWorld({ slot: 1, accounts, tag: 'F', mobs: [], extraEnts: ents, setup, quests: { ...base, q_b: { state: 2, counters: [1] } } });
for (const W of [L, F]) W.w.eval(script);
const botOn = (W) => W.w.document.querySelector('[data-act="bot"]')?.classList.contains('on');
(async () => {
  await wait(1500);
  L.w.document.querySelector('[data-act="grp-maptalk"]').click();
  const t0 = Date.now();
  const seenOn = { L: false, F: false };
  const watch = setInterval(() => { seenOn.L ||= botOn(L); seenOn.F ||= botOn(F); }, 30);
  await wait(1500);
  while (Date.now() - t0 < 30000 && (botOn(L) || botOn(F))) await wait(200);
  const r = {
    started: seenOn.L && seenOn.F, botsOff: !botOn(L) && !botOn(F), secs: Math.round((Date.now() - t0) / 1000),
    L: { q_a: L.state.me.quests.q_a?.state, q_far: L.state.me.quests.q_far?.state ?? 0 },
    F: { q_a: F.state.me.quests.q_a?.state, q_b: F.state.me.quests.q_b?.state, q_far: F.state.me.quests.q_far?.state ?? 0 },
  };
  console.log(r);
  const ok = r.started && r.botsOff && r.L.q_a === 1 && r.F.q_a === 1 && r.F.q_b === 3 && r.L.q_far === 0 && r.F.q_far === 0;
  console.log(ok ? 'OK – beide haben auf dieser Map abgegeben/angenommen, Bots wieder aus' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
