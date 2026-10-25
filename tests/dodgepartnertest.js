// 2.35.0: Ausweichen mit Digimon-Steuerung – der Klick bewegt das Digimon selbst: kein „Folgen“ (zog es zum Tamer
// zurück, Zickzack) und ein fester Fluchtpunkt statt alle 0,4 s neu gesucht (Eiern beim Laufen)
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;
w.eval(fake);
const F = w.__fake, scene = w.dmo.game.scene.getScene('world');
const taps = [], follows = [];
let goal = null;
scene.tapGround = (x, y) => { taps.push([Math.round(x), Math.round(y)]); goal = { x, y }; };
scene.controlledId = () => 'p:me'; // Spiel steht auf Digimon-Steuerung
scene.telegraphs = { active: [] };
scene.deps.commands = { partnerFollow: () => follows.push(1) };
w.localStorage.setItem('cdigi.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 10 }));
w.eval(script);
const status = () => w.document.querySelector('[data-f="status"]').textContent;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(600);
  const P = F.ents.get('p:me');
  F.store.setState({ target: F.toTarget('m:1') });
  w.document.querySelector('[data-act="bot"]').click();
  await wait(300);
  // großer Warnkreis genau um das Digimon (Tamer steht auch drin – egal), 4 s bis zum Einschlag
  const end = w.performance.now() + 4000;
  scene.telegraphs.active = [{ x: P.x, y: P.y, r: 80, end }];
  const startAt = { x: P.x, y: P.y };
  // Digimon läuft langsam (60 px/s) zum zuletzt geklickten Punkt
  const iv = setInterval(() => {
    if (!goal) return;
    const dx = goal.x - P.x, dy = goal.y - P.y, d = Math.hypot(dx, dy);
    if (d < 1) return;
    const s = Math.min(d, 6);
    P.x += dx / d * s; P.y += dy / d * s;
  }, 100);
  const st = new Set();
  for (let i = 0; i < 30; i++) { st.add(status()); await wait(100); }
  clearInterval(iv);
  const out = Math.hypot(P.x - startAt.x, P.y - startAt.y);
  const points = new Set(taps.map((t) => t.join(','))).size;
  console.log({ taps: taps.length, points, follows: follows.length, out: Math.round(out), status: [...st].slice(0, 3) });
  const ok = [...st].some((s) => /Weiche/.test(s)) && follows.length === 0 && points === 1 && out > 80;
  console.log(ok ? 'OK – Digimon läuft direkt zu einem festen Fluchtpunkt, ohne „Folgen“' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
