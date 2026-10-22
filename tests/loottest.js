// 2.12.0: Sitzung Beute & Verbrauch – Inventar-Zuwachs = erhalten, Abnahme = verbraucht, Bits rein/raus
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] } } });
const st0 = G.store.getState();
G.store.setState({ me: { ...st0.me, bits: 1000, inventory: [{ itemId: 'potion', qty: 5 }] } });
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ tab: 'data' }));
G.w.eval(script);
const set = (p) => { const s = G.store.getState(); G.store.setState({ me: { ...s.me, ...p } }); };
(async () => {
  await wait(1500);
  set({ inventory: [{ itemId: 'potion', qty: 4 }, { itemId: 'circuit_board', qty: 2 }], bits: 1300 });
  await wait(1500);
  set({ inventory: [{ itemId: 'potion', qty: 3 }, { itemId: 'circuit_board', qty: 3 }], bits: 1100 });
  await wait(1500);
  const $ = (q) => G.w.document.querySelector(q)?.textContent || '';
  const r = { sum: $('[data-f="lootsum"]'), gained: $('[data-f="lootin"]'), used: $('[data-f="lootout"]') };
  console.log(r);
  const ok = /\+300/.test(r.sum) && /−200/.test(r.sum) && /circuit_board×3/.test(r.gained) && /potion×2/.test(r.used);
  console.log(ok ? 'OK – Beute und Verbrauch' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
