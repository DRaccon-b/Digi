// CDigi 1.1.0: Not-Aus nur mit Alt+Esc – Esc allein schließt im Spiel Dialoge und darf den Bot nicht stoppen.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'N', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
  G.w.eval(script);
  await wait(1000);
  const on = () => G.w.document.querySelector('[data-act="bot"]').classList.contains('on');
  G.trustedClick('[data-act="bot"]');
  await wait(600);
  const started = on();
  G.trustedKey('Escape');
  await wait(400);
  const afterEsc = on();
  G.trustedKey('Escape', { altKey: true });
  await wait(400);
  const r = { started, afterEsc, afterAltEsc: on(), notice: G.w.document.getElementById('cdigi-notice')?.textContent || '',
    label: G.w.document.querySelector('[data-act="cdigi-stop"]')?.textContent };
  console.log(r);
  G.w.close();
  const ok = started && afterEsc && !r.afterAltEsc && /Not-Aus/.test(r.notice) && /Alt\+Esc/.test(r.label);
  console.log(ok ? 'OK – Esc lässt den Bot laufen, Alt+Esc ist der Not-Aus' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
