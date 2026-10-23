// 2.45.0: Übersicht „Nächste Map“ – die Map mit dem nächsthöheren niedrigsten Monster-Level, ab dem Level, ab dem dieses
// in der Level-Grenze liegt, und die EXP bis dahin (Restzeit bei der aktuellen EXP/min).
// Native Forest: Kunemon Lv 1–3; Primary Village: Bigmon ab Lv 8. Grenze +3 -> ab Lv 5; Partner Lv 3 mit 100/700 EXP.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'N', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.digimon.bigmon = { name: 'Bigmon', base: { hp: 400 }, growth: { hp: 30 }, mob: { expBase: 6.5 } };
      content.spawns.native_forest.zones = { wood: { entries: [{ species: 'kunemon', level: [1, 3], weight: 1 }] } };
      content.spawns.primary_village.zones = { field: { entries: [{ species: 'bigmon', level: [8, 9], weight: 1 }] } };
    } });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 3, exp: 100, expNext: 700 } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'data', lvlDiff: 3 }));
  G.w.eval(script);
  await wait(1500);
  const el = G.w.document.querySelector('[data-f="nextmap"]'), tip = G.w.document.querySelector('[data-tip="nextmap"]')?.title || '';
  const need = 600 + Math.round(40 * Math.pow(4, 1.8) + 20); // Rest von Lv 3 + ganzes Lv 4
  const fmtNeed = need.toLocaleString('de-DE');
  const ok = /ab Lv 5/.test(el?.textContent || '') && tip.includes(fmtNeed) && /niedrigste Monster Lv 8/.test(tip);
  console.log((ok ? 'OK – ' : 'FEHLER – ') + 'Nächste Map: ' + JSON.stringify({ text: el?.textContent, tip, need }));
  G.w.close();
  process.exit(ok ? 0 : 1);
})();
