// 2.41.0: EXP-Priorität beim Grinden – zuerst Monster +5…+8 über dem Digimon (gemessen ×1,5 EXP), dann +4, +3, …;
// innerhalb einer Stufe das nächste. Ausgeschaltet: wie bisher das nächste passende Monster.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(expPrio) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake;
  const st = F.store.getState();
  F.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 1 } } }); // m:1 Lv 4 (+3) am nächsten, m:3/m:4 Lv 6 (+5)
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 8, radius: 400, expPrio }));
  w.eval(script);
  await wait(600);
  w.document.querySelector('[data-act="bot"]').click();
  await wait(900);
  const first = F.selects[0] || null;
  w.close();
  return first;
}
(async () => {
  const on = await run(true), off = await run(false);
  console.log({ mitPrioritaet: on, ohne: off });
  const ok = (on === 'm:3' || on === 'm:4') && off === 'm:1';
  console.log(ok ? 'OK – zuerst +5, ohne Priorität das nächste Monster' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
