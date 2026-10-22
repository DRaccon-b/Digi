const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window; w.HTMLCanvasElement.prototype.getContext = () => null;
w.eval(fake); w.eval(script);
setTimeout(() => {
  const p = w.document.querySelector('.digibot'), b = p.querySelector('[data-act="min"]');
  b.click();
  const vis = (s) => w.getComputedStyle(p.querySelector(s)).display !== 'none';
  const r = { min: p.classList.contains('is-min'), head: vis('.digibot__head'), runbar: vis('.digibot__runbar'), tabs: vis('.digibot__tabs'), body: vis('.digibot__body'), btn: b.textContent, saved: JSON.parse(w.localStorage.getItem('digibot.cfg')).min };
  b.click();
  r.back = vis('.digibot__runbar') && vis('.digibot__body') && b.textContent === '–';
  console.log(r);
  const ok = r.min && r.head && !r.runbar && !r.tabs && !r.body && r.btn === '+' && r.saved === true && r.back;
  console.log(ok ? 'OK – nur Kopfleiste' : 'FEHLER'); process.exit(ok ? 0 : 1);
}, 700);
