// 2.13.2: Gruppe „👑 Bosse“ – Start bringt den Leader in die Boss-Rotation, Mitläufer folgen (kein Quest-Aufholen)
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, mirrorAtk: true, leadBoss: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const L = makeWorld({ slot: 0, accounts, tag: 'L', quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } }, onKill: (m) => { m.hp = m.maxHp = 300; } });
// Mitläufer hat „Meet Gennai“ (Story) verpasst – im Quest-Modus würde er sie nachholen
const F = makeWorld({ slot: 1, accounts, tag: 'F', quests: {} });
for (const W of [L, F]) W.w.eval(script);
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
(async () => {
  await wait(1200);
  L.w.document.querySelector('[data-act="grp-start"]').click();
  const seen = new Set();
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) { seen.add(F.status()); await wait(200); }
  check('Modus-Schalter zeigt „Bosse“', L.w.document.querySelector('[data-gmode="boss"]')?.classList.contains('on'), '');
  check('Leader startet in der Boss-Rotation', /^Bosse:/.test(L.status()), L.status());
  const fs2 = [...seen].join(' | ');
  check('Mitläufer läuft (Bot an)', [...seen].some((x) => /Gruppe/.test(x)), fs2.slice(0, 200));
  check('Mitläufer holt keine Quest auf', ![...seen].some((x) => /Meet Gennai|annehmen|Aufholen|hole/i.test(x)) && !F.state.me.quests.q00_meet_gennai, fs2.slice(0, 200));
  // Umschalten auf Quests: nächster Start wieder Autopilot
  L.w.document.querySelector('[data-act="grp-stop"]').click();
  await wait(500);
  L.w.document.querySelector('[data-gmode="bots"]').click();
  await wait(300);
  L.w.document.querySelector('[data-act="grp-start"]').click();
  await wait(2000);
  check('Modus „Quests“: Leader wieder im Autopilot', !/^Bosse:/.test(L.status()), L.status());
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
