// 2.14.2: Wie live „Bay Patrol“: Gennai's Hologram steht auf mehreren Maps (gleiche NPC-ID); die Story-Station zeigt
// auf Primary Village, die tägliche Quest gibt es aber nur beim Hologramm im Native Forest (giverMap).
// Erwartung: der Bot nimmt sie im Native Forest an, statt es beim falschen Hologramm endlos zu versuchen.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const today = Math.floor((Date.now() - 7 * 3600e3) / 864e5);
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  extraEnts: (id) => [{ id: 'n:holo', kind: 3, defId: 'holo', x: id === 'native_forest' ? 600 : 500, y: 200, hp: 0, flags: 0 }],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, s_bay: { state: 3, counters: [8, today - 10] } },
  setup({ content, MAPS }) {
    content.npcs.holo = { name: "Gennai's Hologram", stations: [{ mapId: 'primary_village', point: 'holo_camp', when: { quest: 'q00_meet_gennai', state: 'done' } }] };
    content.quests.s_bay = { id: 's_bay', name: 'Bay Patrol', giver: 'holo', turnIn: 'holo', giverMap: 'native_forest', turnInMap: 'native_forest', minLevel: 1,
      objectives: [{ kind: 'kill', species: 'kunemon', count: 8 }] };
    const P = (k, v) => ({ name: k, type: 'string', value: v });
    MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'holo', x: 600, y: 200, properties: [P('npcId', 'holo')] });
    MAPS.primary_village.layers[0].objects.push({ type: 'npc', name: 'holo', x: 500, y: 200, properties: [P('npcId', 'holo')] },
      { type: 'spawn', name: 'holo_camp', x: 500, y: 200 });
  } });
// Server: jedes Hologramm bietet nur die Quests seiner Map an
const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
const talks = [];
cmds.talk = (npc) => {
  const map = G.store.getState().world.mapId;
  talks.push(map);
  const choices = map === 'native_forest' ? [{ id: 'ac_s_bay', action: 'acceptQuest', questId: 's_bay' }] : [{ id: 'other', action: 'acceptQuest', questId: 'x_other' }];
  G.store.setState({ dialog: { npc, npcName: npc, node: { id: 'root', choices: [...choices, { id: 'bye' }] } } });
};
cmds.chooseDialog = (id) => {
  if (id === 'ac_s_bay' && G.store.getState().world.mapId === 'native_forest') {
    const s = G.store.getState(); G.store.setState({ me: { ...s.me, quests: { ...s.me.quests, s_bay: { state: 1, counters: [0, today - 10] } } } });
  }
  G.store.setState({ dialog: null });
};
G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, apRepeat: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && G.state.me.quests.s_bay.state !== 1) await wait(200);
  const r = { accepted: G.state.me.quests.s_bay.state === 1, talks, secs: Math.round((Date.now() - t0) / 1000), status: G.status() };
  console.log(r);
  const ok = r.accepted && !talks.includes('primary_village');
  console.log(ok ? 'OK – Quest beim richtigen Hologramm angenommen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
