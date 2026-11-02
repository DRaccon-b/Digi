// 2.13.2 / 3.2.0: Gruppe „Folgen“ – der Leader fährt die Boss-Rotation (Betriebsart oben), ▶ Start im Leader-Fenster startet
// alle; die Mitläufer folgen ihm und holen keine Quests auf. Danach Leader auf Autopilot umgestellt: nächster Start wieder Autopilot.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, mirrorAtk: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const L = makeWorld({ slot: 0, accounts, tag: 'L', quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } }, onKill: (m) => { m.hp = m.maxHp = 300; } });
// Mitläufer hat „Meet Gennai“ (Story) verpasst – im Quest-Modus würde er sie nachholen
const F = makeWorld({ slot: 1, accounts, tag: 'F', quests: {} });
L.w.localStorage.setItem('digibot.cfg', JSON.stringify({ farm: true, autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
F.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
for (const W of [L, F]) W.w.eval(script);
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
(async () => {
  await wait(1200);
  check('Keine Knöpfe Starten/Stoppen/Abgeben im Gruppenreiter', !L.w.document.querySelector('[data-act="grp-start"],[data-act="grp-stop"],[data-act="grp-maptalk"]'));
  check('Mitläufer-Verhalten „Folgen“ gewählt', L.w.document.querySelector('[data-gmode="follow"]')?.classList.contains('on'));
  L.w.document.querySelector('[data-act="bot"]').click();
  const seen = new Set();
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) { seen.add(F.status()); await wait(200); }
  check('Leader startet in der Boss-Rotation', /^Bosse:/.test(L.status()), L.status());
  const fs2 = [...seen].join(' | ');
  check('Mitläufer läuft (Bot an)', [...seen].some((x) => /Gruppe/.test(x)), fs2.slice(0, 200));
  check('Mitläufer holt keine Quest auf', ![...seen].some((x) => /Meet Gennai|annehmen|Aufholen|hole/i.test(x)) && !F.state.me.quests.q00_meet_gennai, fs2.slice(0, 200));
  // Leader stoppt (alle stoppen), stellt auf Autopilot um, startet wieder
  L.w.document.querySelector('[data-act="bot"]').click();
  await wait(800);
  check('■ im Leader-Fenster stoppt auch den Mitläufer', /Start/.test(F.w.document.querySelector('[data-act="bot"]')?.textContent || ''));
  L.w.document.querySelector('[data-mode="auto"]').click();
  await wait(300);
  L.w.document.querySelector('[data-act="bot"]').click();
  await wait(2000);
  check('Betriebsart Autopilot: Leader wieder im Autopilot', !/^Bosse:/.test(L.status()), L.status());
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
