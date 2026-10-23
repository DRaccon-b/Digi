// 2.36.1: Ziel verschwindet aus der Spielwelt (Kuramon der Herde am Ei angekommen), die Auswahl bleibt aber stehen –
// der Bot lässt es nach kurzer Frist fallen und nimmt ein anderes (Probelauf Raum 4: 5 min „Greife an“ ins Leere)
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;
w.eval(fake);
const F = w.__fake;
w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 10 }));
w.eval(script);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(600);
  F.store.setState({ target: F.toTarget('m:1') });
  w.document.querySelector('[data-act="bot"]').click();
  await wait(1200);
  const before = F.store.getState().target?.id;
  F.ents.delete('m:1'); // verschwindet, die Auswahl im Store bleibt
  await wait(2500);
  const after = F.store.getState().target?.id, status = w.document.querySelector('[data-f="status"]').textContent;
  console.log({ before, after, status });
  const ok = before === 'm:1' && after && after !== 'm:1';
  console.log(ok ? 'OK – verschwundenes Ziel fallen gelassen, neues gewählt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
