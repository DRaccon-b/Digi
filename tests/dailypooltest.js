// 2.52.2: Daily-Pools sind Level-Bereiche – nur der passende Pool zählt. Live lief der Autopilot mit Lv 45 für jeden
// niedrigeren Pool (forest 11–12, frost 18–20, …) erneut zu Elecmon („keine Dailies angeboten“, alle 3 s).
// Hier: drei Pools darunter, einer passend (40–50), alle beim selben NPC -> höchstens ein Besuch.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'Y', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'n:elder', kind: 3, defId: 'elder', x: 330, y: 300, hp: 0, flags: 0 }] : []),
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.npcs.elder = { name: 'Elder' };
      MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'elder', x: 330, y: 300, properties: [{ name: 'npcId', type: 'string', value: 'elder' }] });
      const pool = (id, lo, hi) => ({ id, levels: [lo, hi], npcs: ['elder'], quests: [{ id: `${id}_d1` }] });
      content.dailies = { forest: pool('forest', 11, 12), frost: pool('frost', 18, 20), arc: pool('arc', 25, 40), mid: pool('mid', 41, 48) };
    } });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 45 } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apDailies: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(14000);
  const n = (G.w.document.body.textContent.match(/keine Dailies angeboten/g) || []).length;
  console.log({ visits: n, status: G.status() });
  G.w.close();
  const ok = n <= 1;
  console.log(ok ? 'OK – nur der passende Daily-Pool, kein Pendeln zum NPC' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
