// 3.1.41: Kartenrotation bevorzugt Elites (80 % statt 40 % Karte, kaum mehr HP – live Whamon Lv 120 97.836 / Elite Lv 123 100.165)
// A: Elite etwas außerhalb des Radius, normale Kunemon daneben -> zuerst die Elite. B: fremd bekämpfte Elite bleibt tabu.
// D: Elite 610 px Luftlinie hinter einer Wand (echter Weg über 3000 px) -> nicht vorziehen. E: dieselbe Entfernung frei -> vorziehen.
// C: Restzeit nutzt den gemessenen Elite-Anteil (Hälfte Elites: 12 / 0,6 × 14 s ≈ 5 min statt 6 min).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(kind) {
  const G = makeWorld({ slot: 0, tag: kind, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    mobs: kind === 'C' ? [] : [[360, 300, 'kunemon'], [420, 340, 'kunemon'], [470, 280, 'kunemon']],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 1000 }, growth: { hp: 100 }, mob: { expBase: 6.5 } };
      content.items.card_kunemon = { id: 'card_kunemon', name: 'Kunemon DE Card', training: { stat: 'de', points: 1, rarity: 0, baseUses: kind === 'C' ? 20 : 50, copiesPerPoint: 10 } };
      content.spawns.native_forest.zones.meadow.entries = [{ species: 'kunemon', level: [1, 3], elite: [3, 4], drops: [{ itemId: 'card_kunemon', chance: 0.4 }] }];
    },
    extraEnts: (id) => (id !== 'native_forest' || kind === 'C' ? [] : [{ id: 'e:1', kind: 2, defId: 'kunemon', x: kind === 'D' ? 1010 : kind === 'E' ? 1050 : 820, y: 330, hp: 1300, maxHp: 1300, level: 4, flags: 1024,
      targetId: kind === 'B' ? 'p:other' : '' }]) });
  if (kind === 'D') { const g = G.w.dmo.game.scene.getScene('world').map.grid; for (let y = 0; y < 110; y++) g.blocked[y * g.w + 40] = 1; }
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, training: kind === 'C' ? { card_kunemon: 5 } : {}, cards: [{ itemId: kind === 'C' ? 'card_kunemon' : '', qty: kind === 'C' ? 3 : 0 }, { itemId: '', qty: 0 }] } });
  const scene = G.w.dmo.game.scene.getScene('world'), sel = scene.select, picked = [];
  scene.select = (id) => { picked.push(id); return sel(id); };
  if (kind === 'C') G.w.localStorage.setItem('digibot.cardKillMs', JSON.stringify({ kunemon: { ms: 10000, n: 20, e: 0.5 } }));
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'cards', cardSel: ['card_kunemon'], farmChannels: [1],
    hpPot: 0, dsPot: 0, tdsPot: 0, tab: kind === 'C' ? 'farm' : 'log', radius: 300 }));
  G.w.eval(script);
  await wait(1500);
  if (kind === 'C') { await wait(1200); const eta = G.w.document.querySelector('[data-f="cardeta"]')?.textContent || ''; G.w.close(); return { kind, eta }; }
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(6000);
  const r = { kind, picked: [...new Set(picked)], status: G.status() };
  G.w.close();
  return r;
}
(async () => {
  const a = await run('A'), b = await run('B'), c = await run('C'), d = await run('D'), e = await run('E');
  console.log({ a, b, c, d, e });
  const ok = a.picked[0] === 'e:1'
    && !b.picked.includes('e:1') && b.picked.some((id) => id.startsWith('m:'))
    && /noch ca\. 5 min/.test(c.eta)
    && d.picked[0] !== 'e:1' && d.picked.some((id) => id.startsWith('m:')) && e.picked[0] === 'e:1';
  console.log(ok ? 'OK – Kartenrotation bevorzugt Elites' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
