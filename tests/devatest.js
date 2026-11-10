// 3.2.18 (Nutzer 10.11.): Deva-Runde. Ch 1 vorwärts Pajramon → Vajramon → Indramon → Kumbhiramon (West Shinjuku) →
// Sinduramon → Sandiramon (Deva Transit), dort Kanal wechseln und die Reihe rückwärts, danach wieder Ch 1 vorwärts.
// Ist einer nicht da: Wendepunkte (Pajramon, Sandiramon) bis 5 min warten, die anderen höchstens 1 min, sonst überspringen.
// Erwartet (Ch 1, Ch 2):
//   Pajramon Ch1 Respawn 70 s  -> Wendepunkt: warten, besiegen
//   Vajramon Ch1 Respawn 10 min -> überspringen
//   Indramon Ch1 Respawn 12 s nach Ankunft -> kurz warten, besiegen
//   Sandiramon Ch2 Respawn 20 s nach Ankunft -> warten, besiegen
//   Pajramon Ch2: ein Fremder besiegt ihn kurz nach Beginn des Ch-2-Durchgangs (Respawn 40 s) -> Wendepunkt: warten,
//   besiegen (Review: fremder Kill galt sonst als eigener, er wurde übersprungen)
//   alle anderen leben; Kumbhiramon Ch1 steht beim Start in Sicht und fällt zuerst (Kampf nimmt Devas in Sicht mit),
//   bei seinem Halt läuft dann der Respawn -> überspringen. Nach Pajramon Ch2 zurück auf Ch 1.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;

const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
const P = (k, v) => ({ name: k, type: 'string', value: v });
const W = 'tamers_west_shinjuku', T = 'tamers_deva_transit';
const MAPS = {
  [W]: tmj([
    { type: 'portal', name: 't', x: 860, y: 300, width: 32, height: 64, properties: [P('toMap', T), P('toSpawn', 'from_w')] },
    { type: 'spawn', name: 'from_t', x: 820, y: 330 },
    { type: 'spawn', name: 'boss_p', x: 200, y: 450 }, { type: 'spawn', name: 'boss_v', x: 400, y: 450 },
    { type: 'spawn', name: 'boss_i', x: 600, y: 450 }, { type: 'spawn', name: 'boss_k', x: 600, y: 150 },
  ]),
  [T]: tmj([
    { type: 'portal', name: 'w', x: 0, y: 300, width: 32, height: 48, properties: [P('toMap', W), P('toSpawn', 'from_t')] },
    { type: 'spawn', name: 'from_w', x: 48, y: 324 },
    { type: 'spawn', name: 'boss_s1', x: 300, y: 450 }, { type: 'spawn', name: 'boss_s2', x: 600, y: 450 },
  ]),
};
const DEV = {
  [W]: [['pajiramon', 107, 'boss_p'], ['vajramon', 107, 'boss_v'], ['indramon', 108, 'boss_i'], ['kumbhiramon', 109, 'boss_k']],
  [T]: [['sandiramon', 104, 'boss_s2'], ['sinduramon', 106, 'boss_s1']],
};
const NAMES = { pajiramon: 'Pajramon', vajramon: 'Vajramon', indramon: 'Indramon', kumbhiramon: 'Kumbhiramon', sinduramon: 'Sinduramon', sandiramon: 'Sandiramon' };
const content = {
  digimon: Object.fromEntries(Object.entries(NAMES).map(([k, n]) => [k, { name: n }])),
  items: {}, npcs: {}, quests: {}, dailyById: {},
  maps: { [W]: { id: W, name: 'West Shinjuku', levelRange: [105, 110] }, [T]: { id: T, name: 'Deva Transit', levelRange: [102, 107] } },
  spawns: Object.fromEntries(Object.entries(DEV).map(([m, l]) => [m, { zones: {}, bosses: l.map(([sp, lv, at]) => ({ species: sp, level: lv, at, respawnMs: sp === 'pajiramon' ? 40000 : 300000, namedElite: true, engaged: true })) }])),
};
const t0 = Date.now();
const readyAt = { 'pajiramon#1': t0 + 70000, 'vajramon#1': t0 + 600000 };
const lazy = { 'indramon#1': 12000, 'sandiramon#2': 20000 }; // Respawn ab Ankunft am Spawnpunkt
const armed = new Set();
const kills = [], L = (s) => console.log(`   * [${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`);
const ready = (k) => (k in lazy && !armed.has(k) ? Date.now() + lazy[k] : readyAt[k] ?? 0);

let state = {};
const subs = [];
const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
const ents = new Map();
let mapId = W, ch = 1;
const spot = (m, at) => MAPS[m].layers[0].objects.find((o) => o.name === at);
function spawnDevas() {
  const t = ents.get('t:me');
  for (const [sp, lv, at] of DEV[mapId]) {
    const k = `${sp}#${ch}`, p = spot(mapId, at);
    if (k in lazy && !armed.has(k) && Math.hypot(t.x - p.x, t.y - p.y) < 120) { armed.add(k); readyAt[k] = Date.now() + lazy[k]; L(`${sp} Ch ${ch}: Respawn in ${lazy[k] / 1000} s`); }
    const id = `d:${sp}:${ch}`;
    if (ready(k) <= Date.now() && !ents.has(id)) ents.set(id, { id, kind: 2, defId: sp, level: lv, x: p.x, y: p.y, hp: 400, maxHp: 400, flags: 1024, targetId: '' });
  }
}
let foreign = false;
function loadMap(id, sp, channel = 1) {
  mapId = id; ch = channel;
  if (ch === 2 && !foreign) { foreign = true; readyAt['pajiramon#2'] = Date.now() + 40000; L('Fremder besiegt Pajramon Ch 2 (Respawn 40 s)'); }
  for (const k of [...ents.keys()]) if (k !== 't:me' && k !== 'p:me') ents.delete(k);
  const t = ents.get('t:me'), p = ents.get('p:me');
  if (sp) { t.x = sp.x; t.y = sp.y; p.x = sp.x + 10; p.y = sp.y; }
  spawnDevas();
  store.setState({ screen: 'world', world: { mapId: id, mapName: content.maps[id].name, channel: ch, roomId: `${id}-${ch}` }, target: null, mapInfo: null, dialog: null });
  L(`Map ${content.maps[id].name} Ch ${ch}`);
}
setInterval(spawnDevas, 200);
ents.set('t:me', { id: 't:me', kind: 0, x: 820, y: 330, hp: 1, flags: 0, targetId: '' });
ents.set('p:me', { id: 'p:me', kind: 1, x: 830, y: 330, hp: 1, flags: 0, targetId: '' });

let goal = null;
setInterval(() => {
  const t = ents.get('t:me');
  if (!goal || state.screen !== 'world') return;
  const dx = goal.x - t.x, dy = goal.y - t.y, d = Math.hypot(dx, dy);
  if (d <= 20) { t.x = goal.x; t.y = goal.y; goal = null; } else { t.x += (dx / d) * 20; t.y += (dy / d) * 20; }
  const p = ents.get('p:me'); p.x = t.x + 10; p.y = t.y;
  for (const o of MAPS[mapId].layers[0].objects) {
    if (o.type !== 'portal') continue;
    if (t.x >= o.x && t.x <= o.x + o.width && t.y >= o.y && t.y <= o.y + o.height) {
      const to = o.properties.find((q) => q.name === 'toMap').value, sp = o.properties.find((q) => q.name === 'toSpawn').value;
      goal = null; store.setState({ screen: 'loading' });
      setTimeout(() => loadMap(to, spot(to, sp), 1), 300);
      break;
    }
  }
}, 50);

const info = (sp, c) => { const r = ready(`${sp}#${c}`) - Date.now(); return r <= 0 ? { hp: 100 } : { respawnInMs: r }; };
const commands = {
  requestBossPins() {},
  requestMapInfo() {
    const m = mapId, c = ch;
    setTimeout(() => { if (m === mapId && c === ch) store.setState({ mapInfo: { bosses: DEV[m].map(([sp], index) => ({ index, species: sp, ...info(sp, c) })), zones: [], mapId: m, roomId: `${m}-${c}`, at: w.performance.now() } }); }, 80);
  },
  async listChannels() { return [1, 2].map((c) => ({ roomId: `${mapId}-${c}`, mapId, channel: c, clients: 3, maxClients: 50 })); },
  async switchChannel(roomId) { const c = Number(roomId.split('-').pop()); store.setState({ screen: 'loading' }); setTimeout(() => loadMap(mapId, null, c), 300); },
  talk() {}, chooseDialog() {}, teleportList() {}, teleport() {}, closeDialog() { store.setState({ dialog: null }); }, partnerFollow() {},
};
const scene = {
  deps: { content, commands, assetsBase: '/assets/', manifest: { maps: Object.fromEntries(Object.keys(MAPS).map((m) => [m, { tmj: `maps/${m}.tmj` }])) } },
  map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) } },
  controlledId: () => 't:me',
  tapGround: (x, y) => { goal = { x, y }; },
  select: (id) => { const e = ents.get(id); store.setState({ target: e ? { id, kind: 'mob', name: content.digimon[e.defId].name, level: e.level, hp: e.hp, maxHp: e.maxHp } : null }); },
  telegraphs: { active: [], mirrors: [] }, mechB: { lines: [] },
};
w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
w.dmo = { store, net: { state: { entities: ents }, connected: true, transferring: false }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
w.addEventListener('keydown', (e) => {
  if (e.code !== 'Digit1' || !state.target) return;
  const m = ents.get(state.target.id);
  if (!m || m.hp <= 0) return;
  const t = ents.get('t:me');
  if (Math.hypot(m.x - t.x, m.y - t.y) > 320) return;
  m.hp = Math.max(0, m.hp - 200);
  store.setState({ target: { ...state.target, hp: m.hp } });
  if (m.hp === 0) {
    ents.delete(m.id);
    readyAt[`${m.defId}#${ch}`] = Date.now() + 300000; delete lazy[`${m.defId}#${ch}`];
    kills.push(`${m.defId}#${ch}`);
    L(`BESIEGT: ${m.defId} Ch ${ch}`);
  }
}, true);

store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, world: { mapId, channel: 1, roomId: `${W}-1` }, target: null,
  me: { tamerEntityId: 't:me', tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests: {}, bits: 5000,
    partner: { entityId: 'p:me', name: 'Gabumon', level: 110, hp: 3000, maxHp: 3000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
loadMap(W, { x: 820, y: 330 }, 1);
w.localStorage.setItem('digibot.cfg', JSON.stringify({ farm: true, farmMode: 'deva', farmChannels: [1, 2], hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3 }));
w.eval(script);
const $ = (s) => w.document.querySelector(s);
let last = '';
const watch = setInterval(() => {
  const s = ($('[data-f="status"]') || {}).textContent;
  const short = s && s.replace(/\(\d+ px\)/g, '').replace(/\d+:\d\d/g, 'm:ss').replace(/\s+$/, '');
  if (short && short !== last && !/Greife an|Wehre ab|Nächstes Ziel/.test(short)) { last = short; console.log('   > ' + short); }
}, 100);
const EXP = 'kumbhiramon#1,pajiramon#1,indramon#1,sinduramon#1,sandiramon#1,sandiramon#2,sinduramon#2,kumbhiramon#2,indramon#2,vajramon#2,pajiramon#2';
(async () => {
  await new Promise((r) => setTimeout(r, 800));
  $('[data-tab="farm"]').click();
  $('[data-act="bot"]').click();
  const tEnd = Date.now() + 185000;
  let backAt = 0;
  while (Date.now() < tEnd) {
    if (kills.length >= 11 && ch === 1 && !backAt) backAt = Date.now();
    if (backAt && Date.now() - backAt > 1500) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  clearInterval(watch);
  console.log('\nKills:', kills.join(', '), '| zurück auf Ch 1:', !!backAt);
  // Kampf nimmt Devas in Sicht unterwegs mit – darum Menge und Ablauf statt genauer Reihenfolge
  const exp = EXP.split(','), ch1 = kills.filter((k) => k.endsWith('#1')), ch2 = kills.filter((k) => k.endsWith('#2'));
  const lastCh1 = kills.findIndex((k) => k.endsWith('#2'));
  const okA = kills.length === exp.length && exp.every((k) => kills.includes(k)) && !kills.includes('vajramon#1')
    && ch1.length === 5 && kills.slice(0, lastCh1).every((k) => k.endsWith('#1')) // erst Ch 1 ganz, dann Ch 2
    && ch2.slice(0, 2).every((k) => /sandiramon|sinduramon/.test(k)); // Ch 2 rückwärts: erst Deva Transit, dann West Shinjuku
  const okB = !!backAt;
  const okC = $('[data-apsel="farmMode"] option[value="deva"]') != null;
  console.log(okA ? 'OK     A: Reihenfolge Ch 1 vorwärts, Ch 2 rückwärts, Warten/Überspringen wie verlangt' : 'FEHLER A: ' + kills.join(','));
  console.log(okB ? 'OK     B: danach wieder Ch 1' : 'FEHLER B');
  console.log(okC ? 'OK     C: Art „Deva-Runde“ wählbar' : 'FEHLER C');
  process.exit(okA && okB && okC ? 0 : 1);
})();
