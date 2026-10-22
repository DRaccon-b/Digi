// Regression 2.2.2: nach dem Ausweichen nicht wieder in den noch aktiven Warnkreis laufen/angreifen.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;
w.eval(fake);
const F = w.__fake, scene = w.dmo.game.scene.getScene('world');
const taps = [], follows = [];
scene.tapGround = (x, y) => taps.push([x, y]);
scene.telegraphs = { active: [] };
scene.deps.commands = { partnerFollow: () => follows.push(1) };
w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 10 }));
const keys = [];
w.addEventListener('keydown', (e) => keys.push(e.code), true);
w.eval(script);
const status = () => w.document.querySelector('[data-f="status"]').textContent;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const attacks = () => keys.filter((k) => k === 'Digit1').length;
(async () => {
  await wait(600);
  // Ziel m:1 (560,470) steht mitten im Warnkreis, Tamer/Digimon draußen
  F.store.setState({ target: F.toTarget('m:1') });
  scene.telegraphs.active = [{ x: 560, y: 470, r: 30 }];
  w.document.querySelector('[data-act="bot"]').click();
  await wait(1200);
  const a1 = attacks(), s1 = status();
  // Tamer steht im Kreis -> weicht aus
  scene.telegraphs.active = [{ x: 515, y: 512, r: 40 }];
  await wait(800);
  const s2 = status(), tapped = taps.length;
  // Tamer ist draußen, Kreis aber noch aktiv -> warten, nicht angreifen
  // (seit 2.24.0 weiter weg: direkt am Ziel darf das Digimon von draußen zuschlagen)
  F.ents.get('t:me').x = 515 + 220;
  F.ents.get('p:me').x = 500 + 220;
  const a2 = attacks();
  await wait(1200);
  const a3 = attacks(), s3 = status();
  // Kreis weg -> wieder angreifen
  scene.telegraphs.active = [];
  await wait(2000);
  const a4 = attacks(), s4 = status();
  console.log({ a1, s1, s2, tapped, held: a3 - a2, s3, a4, s4 });
  const ok = a1 === 0 && /Warte außerhalb/.test(s1) && /Weiche/.test(s2) && tapped > 0 && a3 === a2 && /Warte außerhalb/.test(s3) && a4 > a3;
  console.log(ok ? 'OK – wartet außerhalb, bis der Warnkreis weg ist' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
