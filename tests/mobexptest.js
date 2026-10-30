// 2.47.0: Übersicht „EXP je Monster“ – eigene Kills je Art mit der EXP aus der Chat-Meldung, nur Arten mit EXP, Anteil
// in %; fremde Kills zählen nicht; ↺ leert die Liste. 2.47.1: über alle Maps der Sitzung, nicht nur die aktuelle.
// 3.1.36: Ø Kampfzeit (erster eigener Treffer bis Tod, Pause > 20 s startet neu) und EXP pro Kampfminute je Art.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const W = makeWorld({ slot: 0, tag: 'X', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[430, 330], [470, 330, 'bigmon'], [450, 360], [480, 360, 'tokomon'], [500, 330, 'gapmon']],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  setup({ content }) { content.digimon.bigmon = { name: 'Bigmon' }; content.digimon.tokomon = { name: 'Tokomon' }; content.digimon.gapmon = { name: 'Gapmon' }; } });
W.handlers = {};
W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'data' }));
W.store.setState({ chat: [] });
W.w.eval(script);
const ev = (list) => W.handlers.evs?.(list);
const chat = (exp) => W.store.setState({ chat: [...W.store.getState().chat, { channel: 'system', code: 'exp', params: { exp }, text: `+${exp} EXP`, ts: W.w.Date.now() }] });
async function kill(id, exp, killer = 'p:me', fightMs = 100) {
  ev([{ t: 'dmg', src: 'p:me', dst: id, amount: 100, outcome: 'hit' }]);
  await wait(fightMs / 2);
  ev([{ t: 'dmg', src: 'p:me', dst: id, amount: 100, outcome: 'hit' }]); // weitere Treffer verschieben den Start nicht
  await wait(fightMs / 2);
  ev([{ t: 'die', id, killer }]);
  await wait(50);
  if (exp) chat(exp);
  await wait(300);
}
const rows = () => [...W.w.document.querySelectorAll('[data-f="mobexp"] > div:not(.digibot__mobhead)')].map((d) => [...d.children].map((c) => c.textContent).join('|'));
const cell = (r, i) => r.split('|')[i];
const sec = (t) => parseFloat(String(t).replace(',', '.'));
(async () => {
  await wait(1200);
  await kill('m:1', 341, 'p:me', 1000); // Kunemon, ~1 s
  await kill('m:2', 500, 'p:me', 2000); // Bigmon, ~2 s
  await kill('m:3', 259, 'p:me', 1000); // Kunemon, ~1 s
  await kill('m:4', 0, 'p:other'); // Tokomon, fremder Kill -> nicht anzeigen
  await wait(1300);
  const a0 = rows();
  W.store.setState({ world: { ...W.store.getState().world, mapId: 'primary_village' } }); // andere Map: zählt mit
  await kill('m:4', 100); // Tokomon
  await wait(1300);
  const a = rows();
  const h0 = W.w.document.querySelector('[data-f="mobexp"] .digibot__mobhead')?.textContent || '';
  W.w.document.querySelector('[data-act="mobexp-reset"]').click();
  await wait(1300);
  const b = W.w.document.querySelector('[data-f="mobexp"]').textContent;
  // Kampfpause > 20 s am selben Monster: Zeit startet neu (Uhr der Seite 30 s vorstellen)
  const realNow = W.w.Date.now.bind(W.w.Date); let skew = 0; W.w.Date.now = () => realNow() + skew;
  ev([{ t: 'dmg', src: 'p:me', dst: 'm:5', amount: 100, outcome: 'hit' }]);
  await wait(100); skew = 30000;
  await kill('m:5', 200, 'p:me', 1000);
  await wait(1300);
  const g = rows();
  console.log({ a0, a, b, g });
  const head = h0;
  // Spalten: Name | Kills | EXP | Ø Kampf | EXP/Min | Anteil
  const kun = a[0] || '', big = a[1] || '', kunRate = Number(cell(kun, 4).replace(/\./g, '')), bigRate = Number(cell(big, 4).replace(/\./g, ''));
  const ok = a0.length === 2 && !a0.some((r) => /Tokomon/.test(r))
    && a.length === 3 && cell(kun, 0) === 'Kunemon' && cell(kun, 1) === '2×' && cell(kun, 2) === '600' && cell(kun, 5) === '50 %'
    && cell(big, 0) === 'Bigmon' && cell(big, 1) === '1×' && cell(big, 2) === '500' && cell(big, 5) === '42 %'
    && /Tokomon/.test(a[2]) && cell(a[2], 1) === '1×' && cell(a[2], 2) === '100'
    && sec(cell(kun, 3)) >= 0.9 && sec(cell(kun, 3)) <= 1.6 && /s$/.test(cell(kun, 3))
    && sec(cell(big, 3)) >= 1.9 && sec(cell(big, 3)) <= 2.6
    && kunRate > 12000 && kunRate < 19000 && bigRate > 10000 && bigRate < 15500 // 600 EXP / ~2 s ≈ 18 000, 500 / ~2 s ≈ 15 000
    && /Ø Kampf/.test(head) && /EXP\/Min/.test(head) && /noch keine EXP/.test(b) && !/Kills/.test(b) && g.length === 1 && cell(g[0], 0) === 'Gapmon' && sec(cell(g[0], 3)) >= 0.9 && sec(cell(g[0], 3)) <= 1.6;
  console.log(ok ? 'OK – EXP je Monsterart mit Kampfzeit und EXP/Min, fremde Kills nicht, Reset leert' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
