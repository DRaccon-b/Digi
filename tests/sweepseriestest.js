// 2.34.2: Map-für-Map-Liste wie das Digi-Phone erst nach Serie, dann nach Level – Adventure-Maps (ohne series) nicht
// zwischen den Adventure-02-Maps (live: Spiral Mountain, Lv 53–56, stand mitten unter den A02-Maps)
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'W', noHash: true, accounts: { leader: 0, list: [{ user: 'acc1' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content }) {
      content.maps.native_forest = { id: 'native_forest', name: 'Spiral Mountain', levelRange: [53, 56] };          // Adventure
      content.maps.primary_village = { id: 'primary_village', name: 'Sunset Bay', levelRange: [49, 55], series: 2 }; // A02, niedriger
    } });
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apOrder: 'sweep', apSweepDir: 'up', hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'quest' }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click(); // lädt die Weltkarte
  await wait(1500);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(500);
  const opts = [...G.w.document.querySelectorAll('[data-apsel="apStartMap"] option')].map((o) => o.textContent).slice(1);
  console.log(opts);
  const ok = opts.length === 2 && /^A1 · Spiral Mountain/.test(opts[0]) && /^A02 · Sunset Bay/.test(opts[1]);
  console.log(ok ? 'OK – aufsteigend: erst Adventure, dann Adventure 02' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
