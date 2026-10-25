// 2.47.0: Übersicht „EXP je Monster“ – eigene Kills je Art mit der EXP aus der Chat-Meldung, nur Arten mit EXP, Anteil
// in %; fremde Kills zählen nicht; ↺ leert die Liste. 2.47.1: über alle Maps der Sitzung, nicht nur die aktuelle.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const W = makeWorld({ slot: 0, tag: 'X', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[430, 330], [470, 330, 'bigmon'], [450, 360], [480, 360, 'tokomon']],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  setup({ content }) { content.digimon.bigmon = { name: 'Bigmon' }; content.digimon.tokomon = { name: 'Tokomon' }; } });
W.handlers = {};
W.w.dmo.net.on = (name, fn) => { { const prev = W.handlers[name]; W.handlers[name] = prev ? (...a) => { prev(...a); fn(...a); } : fn; } return () => {}; };
W.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'data' }));
W.store.setState({ chat: [] });
W.w.eval(script);
const ev = (list) => W.handlers.evs?.(list);
const chat = (exp) => W.store.setState({ chat: [...W.store.getState().chat, { channel: 'system', code: 'exp', params: { exp }, text: `+${exp} EXP`, ts: Date.now() }] });
async function kill(id, exp, killer = 'p:me') {
  ev([{ t: 'dmg', src: 'p:me', dst: id, amount: 100, outcome: 'hit' }]);
  await wait(100);
  ev([{ t: 'die', id, killer }]);
  await wait(50);
  if (exp) chat(exp);
  await wait(300);
}
const rows = () => [...W.w.document.querySelectorAll('[data-f="mobexp"] > div')].map((d) => d.textContent);
(async () => {
  await wait(1200);
  await kill('m:1', 341); // Kunemon
  await kill('m:2', 500); // Bigmon
  await kill('m:3', 259); // Kunemon
  await kill('m:4', 0, 'p:other'); // Tokomon, fremder Kill -> nicht anzeigen
  await wait(1300);
  const a0 = rows();
  W.store.setState({ world: { ...W.store.getState().world, mapId: 'primary_village' } }); // andere Map: zählt mit
  await kill('m:4', 100); // Tokomon
  await wait(1300);
  const a = rows();
  W.w.document.querySelector('[data-act="mobexp-reset"]').click();
  await wait(1300);
  const b = W.w.document.querySelector('[data-f="mobexp"]').textContent;
  console.log({ a0, a, b });
  const ok = a0.length === 2 && !a0.some((r) => /Tokomon/.test(r))
    && a.length === 3 && /Kunemon/.test(a[0]) && /2×600/.test(a[0]) && /50 %/.test(a[0]) && /Bigmon/.test(a[1]) && /1×500/.test(a[1]) && /42 %/.test(a[1])
    && /Tokomon/.test(a[2]) && /1×100/.test(a[2]) && /noch keine EXP/.test(b);
  console.log(ok ? 'OK – EXP je Monsterart angezeigt, fremde Kills nicht, Reset leert' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
