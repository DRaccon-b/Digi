// 3.2.41 (Nutzer 20.11.): Rift – Rollen-Gegner einzeln einstellbar „im Kampf zuerst“: Heiler (Mender, Standard an, nur wenn er heilt),
// Rufer (Caller, ruft Verstärkung) und Artillerie (beschießt alle 6 s) – beide Standard aus.
// Ein Angreifer greift an, ein Rollen-Gegner steht 90 px dahinter in derselben Gruppe:
//  C1: Rufer, Haken an  -> erstes Ziel ist der Rufer.   C0: Haken aus -> erst der Angreifer (wie bisher).
//  A1: Artillerie, Haken an -> erst die Artillerie.
//  M0: Heiler heilt, Heiler-Haken aus -> erst der Angreifer.
//  W1/W0: Schildgeber mit/ohne Haken (3.2.44).
//  X1: Rufer einer fremden Gruppe (weit weg, seine Gruppe kämpft nicht) -> trotz Haken nicht vorgezogen.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

async function run({ role, cfg = {}, far = false, heals = false }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  C.spawns.native_forest.raid = { id: 'rift', rift: true };
  w.dmo.rift = { getState: () => ({ run: { depth: 15, running: true, signal: 10, clockMs: 600000, floor: { n: 1, of: 3 }, portal: { x: 0, y: 0, open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] }, result: null, patch: null, floorUi: { going: null } }) };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  F.E({ id: 'm:att', kind: 2, defId: 'kunemon', level: 4, x: 560, y: 500, hp: 900, maxHp: 1000, flags: 32, targetId: 'p:me' });
  F.E({ id: 'm:role', kind: 2, defId: 'kunemon', level: 4, x: far ? 900 : 640, y: far ? 820 : 560, hp: 1000, maxHp: 1000, flags: 0, targetId: '' });
  if (far) F.E({ id: 'm:buddy', kind: 2, defId: 'kunemon', level: 4, x: 930, y: 800, hp: 1000, maxHp: 1000, flags: 0, targetId: '' });
  F.store.setState({ effects: { 'm:role': [{ id: `rift_role_${role}` }], ...(heals ? { 'm:att': [{ id: 'rift_mended' }] } : {}) } });
  const sel = [];
  const s0 = scene.select; scene.select = (id) => { sel.push(id); return s0(id); };
  scene.tapGround = () => {};
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {} };
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 100, radius: 400, tab: 'log', dungeon: true, dgMode: 'rift', ...cfg }));
  w.eval(script);
  await wait(800);
  w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  w.close();
  return sel.filter((x) => x === 'm:att' || x === 'm:role');
}

(async () => {
  const c1 = await run({ role: 'caller', cfg: { riftCallerFirst: true } });
  check('C1', c1[0] === 'm:role', 'Rufer-Haken an: Rufer zuerst', () => c1.join(',') || '–');
  const c0 = await run({ role: 'caller', cfg: { riftCallerFirst: false } });
  check('C0', c0[0] === 'm:att', 'Rufer-Haken aus: erst der Angreifer', () => c0.join(',') || '–');
  const a1 = await run({ role: 'artillery', cfg: { riftArtilleryFirst: true } });
  check('A1', a1[0] === 'm:role', 'Artillerie-Haken an: Artillerie zuerst', () => a1.join(',') || '–');
  const m0 = await run({ role: 'mender', heals: true, cfg: { riftMenderFirst: false } });
  check('M0', m0[0] === 'm:att', 'Heiler-Haken aus: erst der Angreifer, auch wenn er heilt', () => m0.join(',') || '–');
  // 3.2.44 (Nutzer 21.11.): Schildgeber (Warder, +80 % Verteidigung für seine Gruppe) – eigener Haken, Standard aus
  const w1 = await run({ role: 'warder', cfg: { riftWarderFirst: true } });
  check('W1', w1[0] === 'm:role', 'Schildgeber-Haken an: Schildgeber zuerst', () => w1.join(',') || '–');
  const w0 = await run({ role: 'warder' });
  check('W0', w0[0] === 'm:att', 'Schildgeber-Haken aus (Standard): erst der Angreifer', () => w0.join(',') || '–');
  const x1 = await run({ role: 'caller', far: true, cfg: { riftCallerFirst: true } });
  check('X1', x1[0] === 'm:att', 'Rufer einer fremden Gruppe nicht vorgezogen', () => x1.join(',') || '–');
  process.exit(res.every(Boolean) ? 0 : 1);
})();
