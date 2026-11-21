// 3.2.40 (Nutzer 20.11.): Rift – Kampf mit einem AoE-Skill eröffnen (Option „Rift: Kampf mit AoE-Skill eröffnen“).
// Drei ruhige Gegner stehen in einer Reihe (40 px Abstand), der Bot hat einen Einzelziel-Skill (Taste 2) und einen Flächen-Skill
// um das Ziel (Taste 3, Radius 48). Vor dem ersten Schlag wählt er den Mittelpunkt, der mit der Fläche die meisten trifft (das
// mittlere Monster), und eröffnet mit Taste 3 – nicht mit der Standardattacke.
//  A: Option an  -> erste Kampftaste ist 3, Ziel dabei das mittlere Monster.
//  B: Option aus -> wie bisher (erste Kampftaste ist nicht 3).
//  C: Option an, AoE-Skill noch in Abklingzeit -> normal ziehen (Taste 1/2), nicht warten.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

async function run({ open, aoeCd = false, far = false }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  C.spawns.native_forest.raid = { id: 'rift', rift: true }; // Karte gilt als Rift
  C.skills = {
    'test.hit': { id: 'test.hit', name: 'Single Bite', kind: 'damage', target: 'enemy', shape: 'single', power: 200, castMs: 0, cooldownMs: 4000, dsCost: 20, range: 160 },
    'test.aoe': { id: 'test.aoe', name: 'Frost Ring', kind: 'damage', target: 'enemy', shape: 'circle', radius: 48, power: 300, castMs: 0, cooldownMs: 8000, dsCost: 40, range: 160 },
  };
  C.digimon.testmon = { name: 'Testmon', basic: { range: 30 } };
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  for (const [id, x] of [['m:a', far ? 800 : 600], ['m:b', far ? 840 : 640], ['m:c', far ? 880 : 680]]) F.E({ id, kind: 2, defId: 'kunemon', level: 4, x, y: 500, hp: 5000, maxHp: 5000 });
  const me = F.store.getState().me;
  F.store.setState({ me: { ...me, hotbar: ['cmd:attack', 'skill:0', 'skill:1', null, null, null, null, null, null],
    partner: { ...me.partner, species: 'testmon', level: 6, hp: 3752, maxHp: 3752, ds: 700, maxDs: 766,
      skills: [{ id: 'test.hit', name: 'Single Bite', dsCost: 20, unlocked: true }, { id: 'test.aoe', name: 'Frost Ring', dsCost: 40, unlocked: true }] } },
    cooldowns: aoeCd ? { 'skill:1': { end: w.performance.now() + 60000 } } : {} });
  // far: Laufen sofort ausführen (Tamer + Digimon an den Tap-Punkt), damit der Anmarsch bis in Skill-Reichweite wirkt
  scene.tapGround = (x, y) => { if (!far) return; const t = F.ents.get('t:me'), p = F.ents.get('p:me'); p.x = x; p.y = y; t.x = p.x + 10; t.y = p.y; };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {} };
  const keys = [];
  w.addEventListener('keydown', (e) => { if (/^Digit[1-3]$/.test(e.code)) keys.push({ k: e.code, t: F.store.getState().target?.id || '' }); }, true);
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 100, radius: 400, tab: 'log', riftAoeOpen: open,
    skillSets: { testmon: { skills: { 2: true, 3: true, 4: false, 5: false, 6: false }, heal: {}, role: { 2: 'attack', 3: 'aoe' }, aoeN: { 3: 2 }, grpHeal: {}, rolesV: 1 } } }));
  w.eval(script);
  await wait(800);
  w.document.querySelector('[data-act="bot"]').click();
  await wait(3500);
  const st = w.document.querySelector('[data-f="status"]')?.textContent || '';
  w.close();
  return { keys, st };
}

(async () => {
  const a = await run({ open: true });
  const a0 = a.keys[0];
  check('A', !!a0 && a0.k === 'Digit3' && a0.t === 'm:b', 'Option an: eröffnet mit dem Flächen-Skill auf das mittlere Monster',
    () => `erste Tasten ${a.keys.slice(0, 4).map((x) => `${x.k}@${x.t}`).join(' ') || '–'}, Status ${a.st}`);
  const b = await run({ open: false });
  check('B', !!b.keys[0] && b.keys[0].k !== 'Digit3', 'Option aus: wie bisher (keine AoE-Eröffnung)', () => `erste Tasten ${b.keys.slice(0, 4).map((x) => `${x.k}@${x.t}`).join(' ') || '–'}`);
  const c = await run({ open: true, aoeCd: true });
  check('C', !!c.keys[0] && c.keys[0].k !== 'Digit3', 'AoE in Abklingzeit: normal ziehen, nicht warten', () => `erste Tasten ${c.keys.slice(0, 4).map((x) => `${x.k}@${x.t}`).join(' ') || '–'}, Status ${c.st}`);
  // D (live 21.11.: Ziel 300 px weit weg -> Standardattacke lief an, AoE kam nie): erst heranlaufen, dann mit der Fläche eröffnen
  const d = await run({ open: true, far: true });
  check('D', !!d.keys[0] && d.keys[0].k === 'Digit3', 'Ziel weit weg: erst heranlaufen, dann AoE-Eröffnung', () => `erste Tasten ${d.keys.slice(0, 4).map((x) => x.k + '@' + x.t).join(' ') || '–'}, Status ${d.st}`);
  process.exit(res.every(Boolean) ? 0 : 1);
})();
