// 2.30.6 / 3.2.0: „Ziele verteilen“ wirkt nur beim Folgen – beim Spiegeln/Angreifen und in der Boss-Rotation abgeblendet mit Hinweis
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(extra, cfgX = {}) {
  const accounts = { leader: 0, popup: true, spread: true, ...extra, list: [{ on: true, user: 'acc1', char: 'Char1' }, { on: true, user: 'acc2', char: 'Char2' }] };
  const G = makeWorld({ slot: 0, accounts, tag: 'N', mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', ...cfgX }));
  G.w.eval(script);
  await wait(1500);
  const note = G.w.document.querySelector('[data-f="spreadoff"]')?.textContent || '';
  const op = G.w.document.querySelector('[data-accspread]')?.closest('label')?.style.opacity || '';
  G.w.close();
  return { note, op };
}
(async () => {
  const quests = await run({ mirror: false }), both = await run({ mirror: true, mirrorAtk: true }), boss = await run({ mirror: false }, { farm: true });
  console.log({ quests, both, boss });
  const ok = !quests.note && !quests.op && /nur beim Folgen/.test(both.note) && both.op === '0.5' && /Boss-Rotation/.test(boss.note);
  console.log(ok ? 'OK – Hinweis nur außerhalb von „Folgen“' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
