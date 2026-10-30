// 2.12.0: Sitzung Beute & Verbrauch – Inventar-Zuwachs = erhalten, Abnahme = verbraucht, Bits rein/raus
// 3.1.37: Tränke & Food zum Ladenpreis (verbraucht/erhalten) und Bilanz in Bits; Nicht-Verbrauchsgüter ohne Wert;
//  ohne Ladenpreis zum Verkaufswert; Einlagern ist kein Verbrauch; Charakterwechsel bucht nichts
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] } },
  setup({ content }) {
    content.items.potion = { name: 'potion', kind: 'consumable', price: 1200, use: { hp: 100 } };
    content.items.tea = { name: 'tea', kind: 'consumable', price: 0, sell: 63, use: { ds: 100 } };
    content.items.circuit_board = { name: 'circuit_board', kind: 'material', price: 50 };
  } });
const st0 = G.store.getState();
G.store.setState({ me: { ...st0.me, charId: 'A', bits: 1000, inventory: [{ itemId: 'potion', qty: 5 }, { itemId: 'tea', qty: 2 }], warehouse: [null, null] } });
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ tab: 'data' }));
G.w.eval(script);
const set = (p) => { const s = G.store.getState(); G.store.setState({ me: { ...s.me, ...p } }); };
const $ = (q) => G.w.document.querySelector(q)?.textContent || '';
const read = () => ({ sum: $('[data-f="lootsum"]'), gained: $('[data-f="lootin"]'), used: $('[data-f="lootout"]') });
(async () => {
  await wait(1500);
  set({ inventory: [{ itemId: 'potion', qty: 4 }, { itemId: 'circuit_board', qty: 2 }, { itemId: 'tea', qty: 2 }], bits: 1300 });
  await wait(1500);
  set({ inventory: [{ itemId: 'potion', qty: 3 }, { itemId: 'circuit_board', qty: 3 }, { itemId: 'tea', qty: 1 }], bits: 1100 });
  await wait(1500);
  const r = read();
  const tip = G.w.document.querySelector('[data-f="lootout"] span')?.title || '';
  // Bits +300 −200 = +100; 2 potion à 1.200 + 1 tea à 63 (Verkaufswert) = −2.463 → Bilanz −2.363; circuit_board zählt nicht
  const ok1 = /\+300/.test(r.sum) && /−200/.test(r.sum) && /circuit_board×3/.test(r.gained) && /potion×2/.test(r.used) && /tea×1/.test(r.used)
    && /verbraucht −2\.463/.test(r.sum) && /Bilanz −2\.363 Bits/.test(r.sum) && !/erhalten \+/.test(r.sum) && /2 × 1\.200 = 2\.400 Bits Ladenpreis/.test(tip);
  // 2 potion ins Lager: kein Verbrauch
  set({ inventory: [{ itemId: 'potion', qty: 1 }, { itemId: 'circuit_board', qty: 3 }, { itemId: 'tea', qty: 1 }], warehouse: [{ itemId: 'potion', qty: 2 }, null] });
  await wait(1500);
  const r2 = read();
  const ok2 = /potion×2/.test(r2.used) && /verbraucht −2\.463/.test(r2.sum);
  // anderer Charakter mit weniger Inventar und Bits: bucht nichts
  set({ charId: 'B', bits: 50, inventory: [{ itemId: 'potion', qty: 1 }], warehouse: [] });
  await wait(1500);
  const r3 = read();
  const ok3 = /potion×2/.test(r3.used) && /verbraucht −2\.463/.test(r3.sum) && /−200/.test(r3.sum);
  console.log({ r, tip, r2, r3, ok1, ok2, ok3 });
  const ok = ok1 && ok2 && ok3;
  console.log(ok ? 'OK – Beute und Verbrauch' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
