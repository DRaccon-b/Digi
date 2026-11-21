// 3.2.44 (Nutzer 21.11., Rift schneller Nr. 1): in der Rift-Erholpause (HP unter 60 %, niemand greift an) Guilmon Bread essen,
// statt bis zu 25 s herumzustehen.
//  B1: Brot auf F2 -> Taste F2 wird gedrückt, Status „esse Brot“.
//  B0: kein Brot auf der Leiste -> keine F-Taste, Status „erhole mich“ (wie bisher).
//  BL: unter 30 % HP mit gewähltem ruhigem Ziel -> isst trotzdem Brot (Review 3.2.44).
//  BC: Brot in Abklingzeit -> nicht drücken.
//  BX: Option „Rift: Brot statt Erholpause“ aus -> kein Brot.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

async function run({ bread, cfg = {}, low = false, cd = false }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  C.spawns.native_forest.raid = { id: 'rift', rift: true };
  C.items = { guilmon_bread: { id: 'guilmon_bread', name: 'Guilmon Bread' }, meat: { id: 'meat', name: 'Meat' } };
  w.dmo.rift = { getState: () => ({ run: { depth: 15, running: true, signal: 10, clockMs: 600000, floor: { n: 1, of: 3 }, portal: { x: 0, y: 0, open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] }, result: null, patch: null, floorUi: { going: null } }) };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  const me = F.store.getState().me;
  const hotbar = [...me.hotbar]; hotbar[9] = bread ? 'item:guilmon_bread' : null; // Index 7+2 = F2
  F.store.setState({ me: { ...me, hotbar, inventory: [...me.inventory, ...(bread ? [{ itemId: 'guilmon_bread', qty: 5 }] : [])],
    partner: { ...me.partner, hp: low ? 900 : 1500, maxHp: 3752 } }, // 40 % (low: 24 %) – Trank-Schwelle 0 (aus), unter 60 %
    cooldowns: cd ? { 'item:guilmon_bread': { end: w.performance.now() + 60000 } } : {} });
  // low: ein ruhiges Monster ist schon gewählt (Zweig „wenig HP – lasse das Ziel und erhole mich“)
  if (low) { F.E({ id: 'm:q', kind: 2, defId: 'kunemon', level: 4, x: 600, y: 500, hp: 900, maxHp: 1000 }); scene.select('m:q'); }
  scene.tapGround = () => {};
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {}, command: () => {} };
  const keys = [];
  w.addEventListener('keydown', (e) => { if (/^F\d$/.test(e.code)) keys.push(e.code); }, true);
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 100, radius: 400, tab: 'log', dungeon: true, dgMode: 'rift', ...cfg }));
  w.eval(script);
  await wait(800);
  w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  const st = w.document.querySelector('[data-f="status"]')?.textContent || '';
  w.close();
  return { keys, st };
}

(async () => {
  const b1 = await run({ bread: true });
  check('B1', b1.keys.includes('F2') && /esse Brot/.test(b1.st), 'Erholpause: isst Guilmon Bread (F2)', () => `Tasten ${b1.keys.join(',') || '–'}, Status ${b1.st}`);
  const b0 = await run({ bread: false });
  check('B0', !b0.keys.length && /erhole mich/.test(b0.st), 'kein Brot: Erholpause wie bisher', () => `Tasten ${b0.keys.join(',') || '–'}, Status ${b0.st}`);
  const bx = await run({ bread: true, cfg: { riftBread: false } });
  check('BX', !bx.keys.includes('F2') && /erhole mich/.test(bx.st), 'Option aus: kein Brot', () => `Tasten ${bx.keys.join(',') || '–'}, Status ${bx.st}`);
  const bl = await run({ bread: true, low: true });
  check('BL', bl.keys.includes('F2'), 'unter 30 % mit gewähltem ruhigem Ziel: isst trotzdem Brot', () => `Tasten ${bl.keys.join(',') || '–'}, Status ${bl.st}`);
  const bc = await run({ bread: true, cd: true });
  check('BC', !bc.keys.includes('F2'), 'Brot in Abklingzeit: nicht drücken', () => `Tasten ${bc.keys.join(',') || '–'}, Status ${bc.st}`);
  process.exit(res.every(Boolean) ? 0 : 1);
})();
