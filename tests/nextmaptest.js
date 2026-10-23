// 2.45.0: Übersicht „Nächste Map“ – Map mit dem nächsthöheren niedrigsten Monster-Level, Restzeit bei der aktuellen EXP/min.
// 2.48.1: Ziel-Level wie die Lern-Route: ab dem ihre beste Zone ≥ 15 % mehr EXP/min bringt (mit Feldbossen der Rotation).
// A: Native Forest Kunemon Lv 1–3, Primary Village Bigmon Lv 8–9, Digimon Lv 3 -> Kunemon bringen fast nichts: „jetzt“.
// B: Native Forest Kunemon Lv 1–9 (gleich gut), Digimon Lv 1 -> Wechsel erst einige Level später, EXP bis dahin passt.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const need = (from, exp, next, to) => { let n = next - exp; for (let L = from + 1; L < to; L++) n += Math.round((40 * Math.pow(L, 1.8) + 20) * (L > 25 ? 1 + 0.5 * Math.pow(L - 25, 0.6) : 1)); return n; };
async function run(nfHi, lv) {
  const G = makeWorld({ slot: 0, tag: 'N', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.digimon.bigmon = { name: 'Bigmon', base: { hp: 400 }, growth: { hp: 30 }, mob: { expBase: 6.5 } };
      content.spawns.native_forest.zones = { wood: { entries: [{ species: 'kunemon', level: [1, nfHi], weight: 1 }] } };
      content.spawns.primary_village.zones = { field: { entries: [{ species: 'bigmon', level: [8, 9], weight: 1 }] } };
    } });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: lv, exp: 10, expNext: 60, stats: { at: 2000, as: 1200 } } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'data', lvlDiff: 3 }));
  G.w.eval(script);
  await wait(1500);
  const text = G.w.document.querySelector('[data-f="nextmap"]')?.textContent || '', tip = G.w.document.querySelector('[data-tip="nextmap"]')?.title || '';
  G.w.close();
  const m = text.match(/ab Lv (\d+)/), m2 = tip.match(/Noch ([\d.]+) EXP/);
  return { text, tip, level: m ? +m[1] : null, need: m2 ? +m2[1].replace(/\./g, '') : 0 };
}
(async () => {
  const a = await run(3, 3), b = await run(9, 1);
  console.log({ a, b, bWant: b.level ? need(1, 10, 60, b.level) : null });
  const ok = /jetzt/.test(a.text) && /15 %/.test(a.tip)
    && b.level > 1 && !/jetzt/.test(b.text) && b.need === need(1, 10, 60, b.level);
  console.log(ok ? 'OK – Nächste Map: Wechsel-Level wie die Lern-Route, EXP bis dahin' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
