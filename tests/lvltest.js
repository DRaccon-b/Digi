// Regression: Quest-Modus mit ± 3, Quest-Monster 5 Level schwächer -> muss angegriffen werden (kein Auswahl-Kreislauf).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;
w.eval(fake);
const F = w.__fake, C = w.dmo.game.scene.getScene('world').deps.content;
C.quests = { q_kune: { id: 'q_kune', name: 'Kunemon', objectives: [{ kind: 'kill', species: 'kunemon', count: 3 }] } };
C.dailyById = {};
const me = F.store.getState().me;
F.store.setState({ me: { ...me, quests: { q_kune: { state: 1, counters: [0] } }, partner: { ...me.partner, level: 9 } } });
w.localStorage.setItem('cdigi.cfg', JSON.stringify({ questMode: true, lvlDiff: 3, hpPot: 0, dsPot: 0, tdsPot: 0 }));
const keys = [];
w.addEventListener('keydown', (e) => keys.push(e.code), true);
w.eval(script);
(async () => {
  await new Promise((r) => setTimeout(r, 600));
  w.document.querySelector('[data-act="bot"]').click();
  await new Promise((r) => setTimeout(r, 2000));
  const status = w.document.querySelector('[data-f="status"]').textContent;
  const attacks = keys.filter((k) => k === 'Digit1').length;
  console.log('Auswahlen:', F.selects.length, '| Angriffe (Taste 1):', attacks, '| Status:', status);
  console.log(attacks > 0 && F.selects.length <= 2 ? 'OK – greift das schwächere Quest-Monster an' : 'FEHLER – Auswahl-Kreislauf');
  process.exit(0);
})();
