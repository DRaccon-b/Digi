// 3.1.40 (Review): Kartenrotation – A: Named gleicher Art ohne 👑 nie angreifen; B: fremd bekämpfte Elite der Karten-Art
// nicht übernehmen; C: reine Named-Karte mit 👑 -> zum Spawnpunkt laufen, statt am Eingang zu warten.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(kind) {
  const G = makeWorld({ slot: 0, tag: kind, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    mobs: kind === 'C' ? [] : [[360, 300, 'kunemon'], [420, 340, 'kunemon'], [470, 280, 'kunemon']],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 1000 }, growth: { hp: 100 }, mob: { expBase: 6.5 } };
      content.digimon.tyrmon = { name: 'Tyrmon', base: { hp: 1000 }, growth: { hp: 100 }, mob: { expBase: 6.5 } };
      const card = (sp, base) => ({ id: `card_${sp}`, name: sp, training: { stat: 'de', points: 1, rarity: 0, baseUses: base, copiesPerPoint: 10 } });
      Object.assign(content.items, { card_kunemon: card('kunemon', 50), card_tyrmon: card('tyrmon', 48) });
      content.spawns.native_forest.zones.meadow.entries = kind === 'C' ? [] : [{ species: 'kunemon', level: [1, 3], drops: [{ itemId: 'card_kunemon', chance: 0.4 }] }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'ridge', x: 1300, y: 330 });
      if (kind === 'A') content.spawns.native_forest.bosses = [{ species: 'kunemon', at: 'ridge', level: 2, respawnMs: 300000, statMult: 2.06, drops: [{ itemId: 'card_kunemon', chance: 1, min: 12, max: 12 }] }];
      if (kind === 'C') content.spawns.native_forest.bosses = [{ species: 'tyrmon', at: 'ridge', level: 5, respawnMs: 300000, statMult: 2.06, drops: [{ itemId: 'card_tyrmon', chance: 1, min: 12, max: 12 }] }];
    },
    extraEnts: (id) => (id !== 'native_forest' ? [] : kind === 'A' ? [{ id: 'b:1', kind: 2, defId: 'kunemon', x: 600, y: 330, hp: 900000, maxHp: 2884, level: 2, flags: 16, targetId: '' }]
      : kind === 'B' ? [{ id: 'e:1', kind: 2, defId: 'kunemon', x: 380, y: 330, hp: 900000, maxHp: 900000, level: 4, flags: 1024, targetId: 'p:other' }] : []) });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, training: {}, cards: [{ itemId: '', qty: 0 }] } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestBossPins = () => {}; cmds.requestMapInfo = () => {};
  const scene = G.w.dmo.game.scene.getScene('world'), sel = scene.select, picked = [];
  scene.select = (id) => { picked.push(id); return sel(id); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'cards', cardSel: kind === 'C' ? ['card_tyrmon'] : ['card_kunemon'],
    cardNamed: kind === 'C' ? ['card_tyrmon'] : [], farmChannels: [1], hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', radius: 500 }));
  G.w.eval(script);
  await wait(1500);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(kind === 'C' ? 15000 : 9000);
  const r = { kind, picked: [...new Set(picked)], x: Math.round(G.ents.get('t:me').x), status: G.status() };
  G.w.close();
  return r;
}
(async () => {
  const a = await run('A'), b = await run('B'), c = await run('C');
  console.log({ a, b, c });
  const ok = !a.picked.includes('b:1') && a.picked.some((id) => id.startsWith('m:'))
    && !b.picked.includes('e:1') && b.picked.some((id) => id.startsWith('m:'))
    && c.x > 1100;
  console.log(ok ? 'OK – Kartenrotation: kein Named ohne Häkchen, keine fremde Elite, Named-Spawnpunkt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
