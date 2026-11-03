// 3.2.8 (Nutzer 03.11.: Named-Elite-Runde auf den A3-Maps). Die A3-Named-Elites (Devas, adr_jeri, Story-Duelle) haben einen
// Spawnpunkt statt einer Zone (at: boss_named_elite …) und das Kennzeichen namedElite – die Runde kannte nur Zonen-Named und je
// Map einen. A: zwei Devas auf einer Map (Spawnpunkt, namedElite) -> beide in der Runde, die Map nur einmal in Start/Ende.
// B: Lern-Route-Liste (kind 'field') unverändert: die Devas bleiben dort Feldbosse.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const G = makeWorld({ slot: 0, tag: 'N', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) {
      content.digimon.pajiramon = { name: 'Pajiramon' }; content.digimon.vajramon = { name: 'Vajramon' };
      content.spawns.native_forest.bosses = [
        { species: 'pajiramon', level: 5, at: 'from_pv', respawnMs: 300000, namedElite: true, engaged: true },
        { species: 'vajramon', level: 5, at: 'from_pv', respawnMs: 300000, namedElite: true, engaged: true },
      ];
    } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'farm', farm: true, farmMode: 'named', farmChannels: [1] }));
  G.w.eval(script);
  await wait(1800);
  const D = G.w.document;
  const opts = [...(D.querySelector('[data-apsel="routeStart"]')?.options || [])].map((o) => `${o.value}=${o.textContent}`);
  const info = D.querySelector('[data-f="routeinfo"]')?.textContent || '';
  G.w.close();
  const nf = opts.filter((o) => o.startsWith('native_forest='));
  console.log(JSON.stringify({ opts, info }));
  const okA = nf.length === 1 && /Pajiramon/.test(nf[0]) && /Vajramon/.test(nf[0]) && /2 Named/.test(info);
  console.log(okA ? 'OK     A: beide A3-Devas in der Named-Runde, Map einmal in der Auswahl' : 'FEHLER A');
  process.exit(okA ? 0 : 1);
})();
