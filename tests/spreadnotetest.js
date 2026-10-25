// 2.30.6: „Ziele verteilen“ wirkt nur im Gruppen-Modus Quests – in Spiegeln/+ Angriff/Bosse/Dungeon abgeblendet mit Hinweis
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(extra) {
  const accounts = { leader: 0, popup: true, spread: true, ...extra, list: [{ on: true, user: 'acc1', char: 'Char1' }, { on: true, user: 'acc2', char: 'Char2' }] };
  const G = makeWorld({ slot: 0, accounts, tag: 'N', mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] } } });
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
  G.w.eval(script);
  await wait(1500);
  const note = G.w.document.querySelector('[data-f="spreadoff"]')?.textContent || '';
  const op = G.w.document.querySelector('[data-accspread]')?.closest('label')?.style.opacity || '';
  G.w.close();
  return { note, op };
}
(async () => {
  const quests = await run({ mirror: false }), both = await run({ mirror: true, mirrorAtk: true }), boss = await run({ mirror: false, leadBoss: true });
  console.log({ quests, both, boss });
  const ok = !quests.note && !quests.op && /nur im Modus/.test(both.note) && both.op === '0.5' && /nur im Modus/.test(boss.note);
  console.log(ok ? 'OK – Hinweis nur außerhalb des Modus Quests' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
