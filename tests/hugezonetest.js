// 2.32.1: Raumweiter Warnkreis (Apocalymons „Total Annihilation“, Radius 640) – nicht ausweichen und nicht
// stehen bleiben, sondern weiter angreifen (live: 20 s stillgestanden, der Boss heilte sich)
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'H', noHash: true, accounts: { leader: 0, list: [{ user: 'acc1' }] }, mobs: [[430, 330]],
    quests: { q00_meet_gennai: { state: 3, counters: [] } }, onKill(m) { setTimeout(() => { m.hp = 300; }, 300); } });
  const sc = G.w.dmo.game.scene.getScene('world');
  const huge = { x: 420, y: 330, r: 640 };
  sc.telegraphs = { active: [huge], circles: [{ ...huge, end: G.w.performance.now() + 20000 }], marksActive: [] };
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, farm: false, dodge: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 100 }));
  G.w.eval(script);
  await wait(1200);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seen = new Set();
  for (let i = 0; i < 20; i++) { await wait(200); seen.add(G.status().replace(/ · Skill.*/, '').slice(0, 30)); }
  const r = { kills: G.kills, statuses: [...seen] };
  console.log(r);
  const ok = G.kills > 0 && ![...seen].some((x) => /Weiche|bleibe stehen|Warte außerhalb/.test(x));
  console.log(ok ? 'OK – raumweiter Kreis: weiter angreifen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
