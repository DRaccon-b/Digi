// 3.1.40: Kartenrotation – Named-Gegner nur, wenn ihr 👑-Häkchen gesetzt ist (standardmäßig aus)
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(named) {
  const G = makeWorld({ slot: 0, tag: 'N', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    mobs: [[360, 300, 'kunemon'], [420, 340, 'kunemon']],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.tyrmon = { name: 'Tyrmon', base: { hp: 1000 }, growth: { hp: 100 }, mob: { expBase: 6.5 } };
      content.spawns.native_forest.bosses = [{ species: 'tyrmon', at: 'ridge', level: 5, respawnMs: 300000, statMult: 2.06,
        drops: [{ itemId: 'card_tyrmon', chance: 1, min: 12, max: 12 }] }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'ridge', x: 1300, y: 330 });
      const card = (sp, base) => ({ id: `card_${sp}`, name: sp, training: { stat: 'de', points: 1, rarity: 0, baseUses: base, copiesPerPoint: 10 } });
      Object.assign(content.items, { card_kunemon: card('kunemon', 50), card_tyrmon: card('tyrmon', 48) });
      content.spawns.native_forest.zones.meadow.entries = [{ species: 'kunemon', level: [1, 3], drops: [{ itemId: 'card_kunemon', chance: 0.4 }] }];
    },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'b:1', kind: 2, defId: 'tyrmon', x: 1300, y: 330, hp: 900000, maxHp: 2884, level: 5, flags: 16, targetId: '' }] : []) });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, training: {}, cards: [{ itemId: '', qty: 0 }] } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestBossPins = () => {}; cmds.requestMapInfo = () => {};
  const scene = G.w.dmo.game.scene.getScene('world'), sel = scene.select, picked = [];
  scene.select = (id) => { picked.push(id); return sel(id); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'cards', cardSel: ['card_tyrmon', 'card_kunemon'],
    cardNamed: named ? ['card_tyrmon'] : [], farmChannels: [1], hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', radius: 500 }));
  G.w.eval(script);
  await wait(1500);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !picked.includes('b:1')) await wait(200);
  const r = { named, boss: picked.includes('b:1'), kune: picked.some((id) => id.startsWith('m:')), status: G.status() };
  G.w.close();
  return r;
}
(async () => {
  const a = await run(false), b = await run(true);
  console.log({ a, b });
  const ok = !a.boss && a.kune && b.boss;
  console.log(ok ? 'OK – Named-Gegner nur mit Häkchen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
