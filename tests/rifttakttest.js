// 3.2.54 (Nutzer 23.11., live T21: Etage 1 brauchte 5:50 von 12:00, Etage 3 reichte nicht – unterwegs jede Gruppe mitgenommen,
// Abstand zum Alpha wuchs 657 -> 1114 px): Rift-Zeitplan. Die Uhr (12 min für den ganzen Lauf) wird gegen die geschätzte Restarbeit
// gerechnet (Weg zum Ziel, Alpha, restliche Etagen, Guardian). Puffer groß: wie bisher. Puffer knapp: nur Gegner auf dem Weg.
// Kein Puffer: direkt zum Ziel, unterwegs nichts anfangen; am Ziel wird gekämpft.
// A (Eile): Etage 3/3, Uhr 150 s, Alpha 700 px weit – Angreifer hinter mir und ruhiger Gegner abseits werden NICHT gewählt, er läuft zum Alpha.
// B (viel Zeit): wie A mit Uhr 600 s – Angreifer zuerst (bisheriges Verhalten).
// C (knapp): Uhr 250 s – ruhiger Gegner auf dem Weg wird gewählt, der abseits nicht.
// D (Purge): Signal über Kills, Uhr 150 s – kein Eile-Modus, der Angreifer wird gewählt.
// E (Eile am Ziel): Uhr 150 s, ich stehe am Alpha, ein Angreifer neben mir – Alpha zuerst, Kampf am Ziel erlaubt.
// G (Etage 1): Uhr 400 s, Alpha 700 px – noch 2 Etagen + Guardian geplant -> Eile, Angreifer hinten nicht gewählt.
// H (Portal offen, Etage 1): Uhr 450 s – zum Portal, Angreifer hinten nicht gewählt.
// I (Review): Alpha noch nicht markiert, Eile – Angreifer direkt an mir wird abgewehrt (kein Weg, an dem man sparen könnte).
// J (Review): Eile mit Ziel, HP 30 % – Angreifer direkt an mir wird abgewehrt.
// K (Review): Ziel wird wegen Eile fallen gelassen – Digimon wird zurückgerufen (partnerFollow).
// F (Status): im Eile-Modus sagt der Status „Zeitplan“ mit dem Puffer.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function world({ clockS, objective = 'hunt', me0 = { x: 200, y: 200 }, mobs, floor = 3, portalOpen = false, noMark = false, hp = 30000 }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  const RS = 'rift_sector';
  const content = {
    digimon: { bearmon_rift: { name: 'Bearmon' } }, items: {}, npcs: {}, quests: {}, dailyById: {},
    maps: { [RS]: { id: RS, name: 'Digital Rift', levelRange: [130, 130] } },
    spawns: { [RS]: { zones: {}, raid: { id: 'rift', party: { min: 1, max: 5, minLevel: 1 }, deathLimit: 1000, landing: 'camp', rift: true } } },
  };
  let state = {}; const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  const clockEnd = Date.now() + clockS * 1000;
  const run = { depth: 21, running: true, signal: 67, floor: { n: floor, of: 3 }, portal: { x: 900, y: 300, open: portalOpen }, guardian: 'hidden', objective,
    alphaMarks: objective === 'hunt' && !portalOpen && !noMark ? [{ id: 'al:1', x: 900, y: 200 }] : [] };
  Object.defineProperty(run, 'clockMs', { enumerable: true, configurable: true, get: () => Math.max(0, clockEnd - Date.now()) });
  const rs = { warden: null, view: null, run, patch: null, result: null, floorUi: { going: null } };
  const rift = { getState: () => rs, setState: () => {} };
  const ents = new Map();
  const sel = [];
  const scene = {
    deps: { content, commands: null, assetsBase: '/assets/', manifest: { maps: {} } },
    map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) }, portals: [], spawns: {}, zones: {} },
    controlledId: () => 't:me',
    tapGround: (x, y) => { goal = { x, y }; },
    select: (id) => { sel.push(id); const e = ents.get(id); store.setState({ target: e ? { id, kind: 'mob', name: 'Bearmon', level: 130, hp: e.hp, maxHp: e.maxHp } : null }); },
    telegraphs: { active: [], mirrors: [] }, mechB: { lines: [] },
    riftFog: { rift: { layout: { cells: [{ id: 'c1', role: 'main', rect: { x: 0, y: 0, w: 1400, h: 600 } }], guardian: { x: 1200, y: 300 } } } },
  };
  ents.set('t:me', { id: 't:me', kind: 0, x: me0.x, y: me0.y, hp: 1, flags: 0, targetId: '' });
  ents.set('p:me', { id: 'p:me', kind: 1, x: me0.x + 10, y: me0.y, hp: 1, flags: 0, targetId: '' });
  if (objective === 'hunt') ents.set('al:1', { id: 'al:1', kind: 2, defId: 'bearmon_rift', level: 130, x: 900, y: 200, hp: 99999, maxHp: 99999, flags: 16 | 32, targetId: '' });
  for (const m of mobs) ents.set(m.id, { kind: 2, defId: 'bearmon_rift', level: 130, hp: 99999, maxHp: 99999, flags: 0, targetId: '', ...m });
  let goal = null;
  const follows = { n: 0 };
  setInterval(() => {
    const t = ents.get('t:me');
    if (!goal) return;
    const dx = goal.x - t.x, dy = goal.y - t.y, d = Math.hypot(dx, dy);
    if (d <= 10) { t.x = goal.x; t.y = goal.y; goal = null; } else { t.x += (dx / d) * 10; t.y += (dy / d) * 10; }
    const p = ents.get('p:me'); p.x = t.x + 10; p.y = t.y;
    for (const [id, m] of ents) if (m.targetId === 'p:me' && id !== 'al:1') { const dd = Math.hypot(t.x - m.x, t.y - m.y); if (dd > 40) { m.x += (t.x - m.x) / dd * 9; m.y += (t.y - m.y) / dd * 9; } } // Angreifer folgen
  }, 50);
  scene.deps.commands = { command() {}, raidLeave() {}, requestBossPins() {}, requestMapInfo() {}, partnerFollow() { follows.n++; }, partnerStop() {}, talk() {}, async requestEvents() { return []; } };
  w.fetch = async () => ({ ok: true, status: 200, json: async () => ({ layers: [] }) });
  w.dmo = { store, rift, net: { state: { entities: ents }, connected: true, transferring: false }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
  store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, chat: [], effects: {}, world: { mapId: RS, mapName: 'Digital Rift', channel: 1, roomId: `${RS}-1` }, target: null,
    me: { tamerEntityId: 't:me', tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests: {}, bits: 5000,
      partner: { entityId: 'p:me', name: 'Imperialdramon', species: 'piedmon_dm', level: 130, hp, maxHp: 30000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'rift', hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3, tab: 'log' }));
  w.eval(script);
  return { w, sel, ents, follows, status: () => w.document.querySelector('[data-f="status"]')?.textContent || '' };
}

async function go(opts, ms) {
  const W = world(opts);
  await wait(900);
  W.w.document.querySelector('[data-act="bot"]').click();
  const sts = [];
  const end = Date.now() + ms;
  while (Date.now() < end) { await wait(200); sts.push(W.status()); }
  W.sts = sts;
  return W;
}
const res = [];
const check = (id, ok, okText, bad) => { res.push(!!ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };
const back = { id: 'a:back', x: 60, y: 200, targetId: 'p:me' };   // Angreifer hinter mir (140 px)
const side = { id: 'n:side', x: 300, y: 480 };                    // ruhig, abseits des Wegs (280 px quer)
const lane = { id: 'n:lane', x: 420, y: 230 };                    // ruhig, auf dem Weg zum Alpha
(async () => {
  // A
  const A = await go({ clockS: 150, mobs: [back, side] }, 3500);
  const tA = A.ents.get('t:me');
  check('A', !A.sel.includes('a:back') && !A.sel.includes('n:side') && tA.x > 420, 'Eile: nichts abseits/hinten, läuft zum Alpha',
    () => `gewählt ${A.sel.join(',') || '–'}, Tamer x ${Math.round(tA.x)}, Status ${A.status()}`);
  // F
  check('F', A.sts.some((s) => /Zeitplan/.test(s)), 'Status nennt den Zeitplan', () => `Status ${[...new Set(A.sts)].slice(-4).join(' | ')}`);
  A.w.close();
  // B
  const B = await go({ clockS: 600, mobs: [back, side] }, 2500);
  check('B', B.sel[0] === 'a:back', 'viel Zeit: Angreifer zuerst wie bisher', () => `gewählt ${B.sel.join(',') || '–'}, Status ${B.status()}`);
  B.w.close();
  // C
  const C = await go({ clockS: 250, mobs: [{ id: 'n:side', x: 220, y: 430 }, { id: 'n:lane', x: 480, y: 210 }] }, 3000); // abseits näher als auf dem Weg
  check('C', C.sel.includes('n:lane') && !C.sel.includes('n:side'), 'knapp: Gegner auf dem Weg ja, abseits nein', () => `gewählt ${C.sel.join(',') || '–'}, Status ${C.status()}`);
  C.w.close();
  // D
  const D = await go({ clockS: 150, objective: 'purge', mobs: [back, side] }, 2500);
  check('D', D.sel[0] === 'a:back', 'Purge (Kills bringen Signal): kein Eile-Modus', () => `gewählt ${D.sel.join(',') || '–'}, Status ${D.status()}`);
  D.w.close();
  // E
  const E = await go({ clockS: 150, me0: { x: 860, y: 200 }, mobs: [{ id: 'a:near', x: 820, y: 240, targetId: 'p:me' }] }, 2500);
  check('E', E.sel[0] === 'al:1', 'Eile am Ziel: Alpha zuerst', () => `gewählt ${E.sel.join(',') || '–'}, Status ${E.status()}`);
  E.w.close();
  const G = await go({ clockS: 400, floor: 1, mobs: [back] }, 2500);
  check('G', !G.sel.includes('a:back') && G.ents.get('t:me').x > 300, 'Etage 1: restliche Etagen + Guardian eingeplant -> Eile', () => `gewählt ${G.sel.join(',') || '–'}, Status ${G.status()}`);
  G.w.close();
  const H = await go({ clockS: 450, floor: 1, portalOpen: true, mobs: [back] }, 2500);
  check('H', !H.sel.includes('a:back') && H.ents.get('t:me').x > 300 && /zum Portal/.test(H.status()), 'Portal offen, wenig Zeit: direkt zum Portal', () => `gewählt ${H.sel.join(',') || '–'}, Status ${H.status()}`);
  H.w.close();
  const I = await go({ clockS: 150, noMark: true, mobs: [{ id: 'a:near', x: 240, y: 230, targetId: 'p:me' }] }, 2500);
  check('I', I.sel[0] === 'a:near', 'ohne Markierung: Angreifer wird abgewehrt', () => `gewählt ${I.sel.join(',') || '–'}, Status ${I.status()}`);
  I.w.close();
  const J = await go({ clockS: 150, hp: 9000, mobs: [{ id: 'a:near', x: 240, y: 230, targetId: 'p:me' }] }, 2500);
  check('J', J.sel[0] === 'a:near', 'Eile mit wenig HP: Angreifer direkt an mir wird abgewehrt', () => `gewählt ${J.sel.join(',') || '–'}, Status ${J.status()}`);
  J.w.close();
  const K = await go({ clockS: 600, mobs: [back] }, 1800);
  const t0 = K.follows.n;
  const runK = K.w.dmo.rift.getState().run; Object.defineProperty(runK, 'clockMs', { get: () => 150000 });
  await wait(2000);
  check('K', K.sel[0] === 'a:back' && K.follows.n > t0, 'Ziel wegen Eile fallen gelassen: Digimon zurückgerufen', () => `gewählt ${K.sel.join(',') || '–'}, partnerFollow ${t0} -> ${K.follows.n}, Status ${K.status()}`);
  K.w.close();
  console.log(res.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(res.every(Boolean) ? 0 : 1);
})();
