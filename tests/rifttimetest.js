// 3.2.44 (Nutzer 21.11., Rift schneller Nr. 7): beim Etagenwechsel schreibt das Log, wie viele Sekunden für Kampf, Laufen, Erholen,
// Ausweichen und Warten draufgingen.
//  T1: Etage 1 -> 2 nach ~3 s Erkunden: Logzeile „Rift: Etage 1/3 in … s – Laufen … s“.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  C.spawns.native_forest.raid = { id: 'rift', rift: true };
  let floor = 1;
  w.dmo.rift = { getState: () => ({ run: { depth: 15, running: true, signal: 20, clockMs: 600000, floor: { n: floor, of: 3 }, portal: { x: 0, y: 0, open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] }, result: null, patch: null, floorUi: { going: null } }) };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  scene.riftFog = { rift: { layout: { cells: [{ id: 'c0', role: 'camp', rect: { x: 400, y: 400, w: 200, h: 200 } }, { id: 'c1', role: 'main', rect: { x: 1200, y: 400, w: 200, h: 200 } }] } } };
  scene.tapGround = () => {};
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {}, command: () => {} };
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 100, radius: 400, tab: 'log', dungeon: true, dgMode: 'rift' }));
  w.eval(script);
  await wait(800);
  w.document.querySelector('[data-act="bot"]').click();
  await wait(3500);
  floor = 2;
  await wait(1500);
  const log = [...w.document.querySelectorAll('[data-f="log"] > div')].map((d) => d.textContent);
  w.close();
  const line = log.find((l) => /Rift: Etage 1\/3 in \d+ s/.test(l));
  const ok = !!line && /Laufen \d+ s/.test(line);
  console.log(ok ? `OK     T1: Zeitaufteilung im Log (${line.replace(/^.*Rift:/, 'Rift:')})` : `FEHLER T1: keine Zeitzeile – Log: ${log.slice(0, 6).join(' | ')}`);
  process.exit(ok ? 0 : 1);
})();
