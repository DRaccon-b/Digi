// 3.2.44 (Nutzer 21.11., Rift schneller Nr. 3): die nächste Zelle nach dem echten Weg über die Zellverbindungen (layout.links)
// wählen, nicht nach Luftlinie durch Wände.
// Lager (100/100). Zelle A liegt 400 px Luftlinie entfernt, ist aber nur über B (1000 px weg) erreichbar; Zelle C liegt 500 px
// entfernt und hängt direkt am Lager.
//  P1: mit Verbindungen -> erkundet zuerst C (nicht A).
//  P0: ohne Verbindungen (alte Karten) -> Luftlinie wie bisher (A).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

async function run({ links }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  C.spawns.native_forest.raid = { id: 'rift', rift: true };
  w.dmo.rift = { getState: () => ({ run: { depth: 15, running: true, signal: 10, clockMs: 600000, floor: { n: 1, of: 3 }, portal: { x: 0, y: 0, open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] }, result: null, patch: null, floorUi: { going: null } }) };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  const t = F.ents.get('t:me'), p = F.ents.get('p:me'); t.x = 100; t.y = 100; p.x = 110; p.y = 100;
  const cells = [
    { id: 'c0', role: 'camp', rect: { x: 0, y: 0, w: 200, h: 200 } },
    { id: 'cA', role: 'main', rect: { x: 400, y: 0, w: 200, h: 200 } },
    { id: 'cC', role: 'main', rect: { x: 0, y: 500, w: 200, h: 200 } },
    { id: 'cB', role: 'main', rect: { x: 0, y: 1000, w: 200, h: 200 } },
  ];
  scene.riftFog = { rift: { layout: { cells, ...(links ? { links: [['c0', 'cB'], ['cA', 'cB'], ['c0', 'cC']] } : {}) } } };
  const taps = [];
  scene.tapGround = (x, y) => taps.push({ x, y });
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {}, command: () => {} };
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 100, radius: 400, tab: 'log', dungeon: true, dgMode: 'rift' }));
  w.eval(script);
  await wait(800);
  w.document.querySelector('[data-act="bot"]').click();
  await wait(2000);
  const st = w.document.querySelector('[data-f="status"]')?.textContent || '';
  w.close();
  return { tap: taps[taps.length - 1] || null, st };
}

(async () => {
  const p1 = await run({ links: true });
  check('P1', !!p1.tap && p1.tap.y > 300 && p1.tap.x < 300, `echter Weg: erst Zelle C (Tap ${p1.tap?.x}/${p1.tap?.y})`, () => `Tap ${p1.tap ? `${p1.tap.x}/${p1.tap.y}` : '–'}, Status ${p1.st}`);
  const p0 = await run({ links: false });
  check('P0', !!p0.tap && p0.tap.x > 300 && p0.tap.y < 300, `ohne Verbindungen: Luftlinie wie bisher (Tap ${p0.tap?.x}/${p0.tap?.y})`, () => `Tap ${p0.tap ? `${p0.tap.x}/${p0.tap.y}` : '–'}, Status ${p0.st}`);
  process.exit(res.every(Boolean) ? 0 : 1);
})();
