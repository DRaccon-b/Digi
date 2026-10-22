// 2.18.2: Knopf „👥 Party einladen“ – lädt sofort erneut ein (statt 30 s Pause), auch wenn im Mitläufer-Fenster geklickt
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const L = makeWorld({ slot: 0, accounts, tag: 'L', mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] } } });
const F = makeWorld({ slot: 1, accounts, tag: 'F', mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] } } });
for (const W of [L, F]) W.w.eval(script);
const n = () => L.invites.filter((x) => x === 'Foll').length;
(async () => {
  await wait(3000);
  const auto = n(); // automatische Einladung (Foll nimmt hier nicht an – Party bleibt leer)
  L.w.document.querySelector('[data-act="grp-invite"]').click();
  await wait(300);
  const afterLeaderBtn = n();
  await wait(1500);
  F.w.document.querySelector('[data-act="grp-invite"]').click();
  await wait(800);
  const afterFollBtn = n();
  const r = { auto, afterLeaderBtn, afterFollBtn, msg: L.w.document.querySelector('[data-f="grpinfo"]')?.textContent };
  console.log(r);
  const ok = auto === 1 && afterLeaderBtn === 2 && afterFollBtn === 3;
  console.log(ok ? 'OK – Knopf lädt sofort ein' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
