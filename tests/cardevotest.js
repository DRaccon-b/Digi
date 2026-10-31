// 3.1.40: Kartenrotation – beste Form je Map nach Element/Attribut × AT (Veemon-Armor wie live, Lv 116)
// A: nur Steel-Mob -> Raidramon. B: nur Dark-Mob -> Magnamon. C: Steel und Dark gleich viel offen -> Magnamon.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(cards) {
  const G = makeWorld({ slot: 0, tag: 'E', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    mobs: [[900, 300, 'knightmon'], [950, 340, 'devimon']],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content }) {
      Object.assign(content.digimon, {
        veemon: { name: 'Veemon', stage: 'rookie', element: 'neutral', attribute: 'free', base: { at: 30 }, growth: { at: 5 } },
        flamedramon: { name: 'Flamedramon', stage: 'armor', element: 'fire', attribute: 'free', base: { at: 225 }, growth: { at: 32.2 } },
        raidramon: { name: 'Raidramon', stage: 'armor', element: 'thunder', attribute: 'free', base: { at: 272 }, growth: { at: 38.9 } },
        magnamon: { name: 'Magnamon', stage: 'armor', element: 'light', attribute: 'free', base: { at: 284 }, growth: { at: 40.6 } },
        knightmon: { name: 'Knightmon', element: 'steel', attribute: 'data' },
        devimon: { name: 'Devimon', element: 'dark', attribute: 'virus' },
      });
      const card = (sp) => ({ id: `card_${sp}`, name: sp, training: { stat: 'de', points: 1, rarity: 0, baseUses: 100, copiesPerPoint: 10 } });
      Object.assign(content.items, { card_knightmon: card('knightmon'), card_devimon: card('devimon') });
      content.spawns.native_forest.zones.meadow.entries = ['knightmon', 'devimon'].map((sp) => ({ species: sp, level: [1, 3], drops: [{ itemId: `card_${sp}`, chance: 0.4 }] }));
    } });
  const st = G.store.getState();
  const evos = ['veemon', 'flamedramon', 'raidramon', 'magnamon'].map((sp) => ({ species: sp, from: sp === 'veemon' ? '' : 'veemon', stage: sp === 'veemon' ? 'rookie' : 'armor',
    level: sp === 'veemon' ? 1 : 25, unlocked: true, canEvolveNow: sp !== 'veemon', dsCost: 10 }));
  G.store.setState({ me: { ...st.me, tamerDs: 300, training: {}, cards: [{ itemId: '', qty: 0 }],
    partner: { ...st.me.partner, species: 'veemon', level: 116, evolutions: evos } } });
  const evolved = [];
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.evolve = (sp) => { evolved.push(sp); const s = G.store.getState();
    G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp, evolutions: s.me.partner.evolutions.map((e) => ({ ...e, canEvolveNow: e.from === sp })) } } }); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'cards', cardSel: cards, farmChannels: [1],
    hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
  G.w.eval(script);
  await wait(1500);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(6000);
  const r = { cards, evolved, species: G.store.getState().me.partner.species };
  G.w.close();
  return r;
}
(async () => {
  const a = await run(['card_knightmon']), b = await run(['card_devimon']), c = await run(['card_knightmon', 'card_devimon']);
  console.log({ a, b, c });
  const ok = a.species === 'raidramon' && b.species === 'magnamon' && c.species === 'magnamon';
  console.log(ok ? 'OK – Kartenrotation wählt die beste Form' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
