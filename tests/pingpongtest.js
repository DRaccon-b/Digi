// 2.10.4: Schutzzonen-Pingpong – das Spiel zieht den Tamer nach jedem Herauslaufen wieder in die Zone; nach 3 Ausflügen
// lässt der Bot das Ziel in Ruhe statt endlos hin und her zu laufen
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;
w.eval(fake);
const F = w.__fake, scene = w.dmo.game.scene.getScene('world');
const taps = [], order = [];
scene.tapGround = (x, y) => { taps.push({ x, y, at: Date.now() }); order.push('tap'); const t = F.ents.get('t:me'), p = F.ents.get('p:me'); t.x = x; t.y = y; p.x = x - 5; p.y = y; setTimeout(() => { t.x = 500; t.y = 510; p.x = 495; p.y = 510; }, 700); };
scene.controlledId = () => 't:me';
scene.deps.commands = { partnerFollow() {} };
scene.deps.assetsBase = '/assets/';
scene.deps.manifest = { maps: { native_forest: { tmj: 'maps/native_forest.tmj' } } };
// Schutzzone um den Tamer (480..560 x 470..540), Ziel m:1 bei 560,470 liegt am Rand -> wird verschoben
w.fetch = async () => ({ ok: true, status: 200, json: async () => ({ layers: [{ type: 'objectgroup', objects: [{ type: 'safe', name: 'gate', x: 470, y: 480, width: 80, height: 60 }] }] }) });
for (const id of ['m:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
const m1 = F.ents.get('m:1'); m1.x = 640; m1.y = 510;
const keys = [];
w.addEventListener('keydown', (e) => { keys.push(e.code); if (e.code === 'Digit1') order.push('1'); }, true);
w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 10 }));
w.eval(script);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(600);
  w.document.querySelector('[data-act="bot"]').click();
  await wait(800);
  F.store.setState({ target: F.toTarget('m:1') });
  await wait(9000);
  const tapsAt9 = taps.length;
  await wait(4000);
  const lateTaps = taps.length - tapsAt9;
  const s2 = w.document.querySelector('[data-f="status"]').textContent;
  console.log({ taps: tapsAt9, lateTaps, s2 });
  const ok = tapsAt9 >= 2 && lateTaps <= 1;
  console.log(ok ? 'OK – kein endloses Pingpong an der Schutzzone' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
