// 3.1.40: Kartenrotation – Kartenliste im Reiter Bosse: Fortschritt (benutzt + Kartentasche), Auswahl, Reihenfolge, Restzeit
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content }) {
      content.digimon.tsunomon = { name: 'Tsunomon' };
      content.items.card_kunemon = { id: 'card_kunemon', name: 'Kunemon DE Card', training: { stat: 'de', points: 1, rarity: 0, baseUses: 20, copiesPerPoint: 10 } };
      content.items.card_tsunomon = { id: 'card_tsunomon', name: 'Tsunomon HT Card', training: { stat: 'ht', points: 1, rarity: 0, baseUses: 30, copiesPerPoint: 10 } };
      content.items.card_kunemon_rare = { id: 'card_kunemon_rare', name: 'Kunemon Rare DE Card', training: { stat: 'de', points: 1, rarity: 1, baseUses: 9, copiesPerPoint: 3 } };
      content.spawns.native_forest.zones.meadow.entries = [
        { species: 'kunemon', level: [1, 3], drops: [{ itemId: 'card_kunemon', chance: 0.4 }, { itemId: 'card_kunemon_rare', chance: 0.04 }] },
        { species: 'tsunomon', level: [1, 3], drops: [{ itemId: 'card_tsunomon', chance: 0.4 }] },
      ];
    } });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, training: { card_kunemon: 5 }, cards: [{ itemId: 'card_kunemon', qty: 3 }, { itemId: '', qty: 0 }] } });
  G.w.localStorage.setItem('digibot.cardKillMs', JSON.stringify({ kunemon: { ms: 10000, n: 5 } }));
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'cards', farmChannels: [1], hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'farm' }));
  G.w.eval(script);
  await wait(1500);
  const D = G.w.document, cfg = () => JSON.parse(G.w.localStorage.getItem('digibot.cfg'));
  const row = (id) => D.querySelector(`[data-f="cardpick"] [data-cardrow="${id}"]`);
  const fails = [];
  const ok = (c, m) => { if (!c) fails.push(m); };
  ok(row('card_kunemon')?.textContent.includes('8/20'), `Fortschritt 8/20: ${row('card_kunemon')?.textContent}`);
  ok(row('card_tsunomon')?.textContent.includes('0/30'), 'Tsunomon 0/30');
  ok(!row('card_kunemon_rare'), 'keine Rare-Karte in der Liste');
  const boxPick = D.querySelector('[data-f="bosspick"]')?.closest('[data-farmmode]');
  ok(boxPick?.classList.contains('hide'), 'Boss-Auswahl ausgeblendet');
  ok(!D.querySelector('[data-f="cardpick"]').closest('[data-farmmode]').classList.contains('hide'), 'Kartenliste sichtbar');
  const tick = (id) => { const b = row(id).querySelector('[data-card]'); b.checked = !b.checked; b.dispatchEvent(new G.w.Event('input', { bubbles: true })); };
  tick('card_kunemon'); await wait(300);
  ok(JSON.stringify(cfg().cardSel) === '["card_kunemon"]', `Auswahl 1: ${JSON.stringify(cfg().cardSel)}`);
  tick('card_tsunomon'); await wait(300);
  ok(JSON.stringify(cfg().cardSel) === '["card_kunemon","card_tsunomon"]', `Auswahl 2: ${JSON.stringify(cfg().cardSel)}`);
  row('card_tsunomon').querySelector('[data-cardmove="up"]').click(); await wait(300);
  ok(JSON.stringify(cfg().cardSel) === '["card_tsunomon","card_kunemon"]', `Reihenfolge: ${JSON.stringify(cfg().cardSel)}`);
  tick('card_tsunomon'); await wait(1200);
  // nur Kunemon gewählt: 12 offen / 0,448 × (10 s + 4 s) ≈ 375 s
  const eta = D.querySelector('[data-f="cardeta"]')?.textContent || '';
  ok(/noch ca\. 6 min/.test(eta), `Restzeit: ${eta}`);
  console.log(fails.length ? fails : 'alle Prüfungen gut');
  console.log(fails.length ? 'FEHLER' : 'OK – Kartenliste mit Fortschritt, Auswahl und Restzeit');
  process.exit(fails.length ? 1 : 0);
})();
