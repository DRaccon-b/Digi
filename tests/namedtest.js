// Simulation Named-Elite-Runde: 3 Maps (A–B–C über Portale), je 2 Kanäle, Named Elite in einer Zone (als Elite markiert).
// Erwartet: A Ch1 lebt -> besiegen; A Ch2 Respawn 5 min -> nicht warten; B Ch1 Respawn 8 s -> warten + besiegen;
// B Ch2 lebt -> besiegen; C beide 10 min -> überspringen; dann per Digi-Phone zurück nach A.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;

const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
const P = (k, v) => ({ name: k, type: 'string', value: v });
const MAPS = {
  map_a: tmj([
    { type: 'portal', name: 'b', x: 860, y: 300, width: 32, height: 64, properties: [P('toMap', 'map_b'), P('toSpawn', 'from_a')] },
    { type: 'spawn', name: 'from_b', x: 820, y: 330 },
    { type: 'zone', name: 'za', x: 300, y: 450, width: 120, height: 100 },
  ]),
  map_b: tmj([
    { type: 'portal', name: 'a', x: 0, y: 300, width: 32, height: 48, properties: [P('toMap', 'map_a'), P('toSpawn', 'from_b')] },
    { type: 'portal', name: 'c', x: 860, y: 300, width: 32, height: 64, properties: [P('toMap', 'map_c'), P('toSpawn', 'from_b')] },
    { type: 'spawn', name: 'from_a', x: 48, y: 324 },
    { type: 'spawn', name: 'from_c', x: 820, y: 330 },
    { type: 'zone', name: 'zb', x: 500, y: 100, width: 120, height: 100 },
  ]),
  map_c: tmj([
    { type: 'portal', name: 'b', x: 0, y: 300, width: 32, height: 48, properties: [P('toMap', 'map_b'), P('toSpawn', 'from_c')] },
    { type: 'spawn', name: 'from_b', x: 48, y: 324 },
    { type: 'zone', name: 'zc', x: 400, y: 500, width: 120, height: 100 },
    { type: 'npc', name: 'phone', x: 120, y: 330, properties: [P('npcId', 'digiphone')] },
  ]),
};
const NAMED = { map_a: { sp: 'ogremon', lv: 22, zone: 'za' }, map_b: { sp: 'bakemon', lv: 30, zone: 'zb' }, map_c: { sp: 'raremon', lv: 40, zone: 'zc' } };
const content = {
  digimon: { ogremon: { name: 'Ogremon' }, bakemon: { name: 'Bakemon' }, raremon: { name: 'Raremon' } },
  items: {}, npcs: { digiphone: { name: 'Digi-Phone' } }, quests: {}, dailyById: {},
  maps: { map_a: { id: 'map_a', name: 'Map A', levelRange: [20, 25] }, map_b: { id: 'map_b', name: 'Map B', levelRange: [28, 33] }, map_c: { id: 'map_c', name: 'Map C', levelRange: [38, 41] } },
  spawns: Object.fromEntries(Object.entries(NAMED).map(([m, n]) => [m, { zones: { [n.zone]: { entries: [] } }, bosses: [{ species: n.sp, level: n.lv, at: n.zone, respawnMs: 240000 }] }])),
};
const t0 = Date.now();
const readyAt = {
  'map_a#1': t0, 'map_a#2': t0 + 300000,
  'map_b#1': t0 + 26000, 'map_b#2': t0,
  'map_c#1': t0 + 600000, 'map_c#2': t0 + 600000,
};
const kills = [], L = (s) => console.log(`   * [${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`);
let teleports = 0, normalHits = 0;

let state = {};
const subs = [];
const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
const ents = new Map();
let mapId = 'map_a', ch = 1;
function zoneOf(m) { return MAPS[m].layers[0].objects.find((o) => o.name === NAMED[m].zone); }
function spawnNamed() {
  const n = NAMED[mapId], z = zoneOf(mapId), id = `n:${mapId}:${ch}`;
  if (readyAt[`${mapId}#${ch}`] <= Date.now() && !ents.has(id)) {
    ents.set(id, { id, kind: 2, defId: n.sp, level: n.lv, x: z.x + 30, y: z.y + 30, hp: 600, maxHp: 600, flags: 1024, targetId: '' });
  }
  // gleiche Art als normales Monster (anderes Level) – darf nicht gejagt werden
  if (!ents.has('x:normal')) ents.set('x:normal', { id: 'x:normal', kind: 2, defId: n.sp, level: n.lv - 3, x: z.x + 90, y: z.y + 60, hp: 300, maxHp: 300, flags: 0, targetId: '' });
}
function loadMap(id, spawn, channel = 1) {
  mapId = id; ch = channel;
  for (const k of [...ents.keys()]) if (k !== 't:me' && k !== 'p:me') ents.delete(k);
  const t = ents.get('t:me'), p = ents.get('p:me');
  if (spawn) { t.x = spawn.x; t.y = spawn.y; p.x = spawn.x + 10; p.y = spawn.y; }
  if (id === 'map_c') ents.set('npc:phone', { id: 'npc:phone', kind: 3, defId: 'digiphone', x: 120, y: 330, hp: 0, flags: 0 });
  spawnNamed();
  store.setState({ screen: 'world', world: { mapId: id, mapName: content.maps[id].name, channel: ch, roomId: `${id}-${ch}` }, target: null, mapInfo: null, dialog: null });
  L(`Map ${content.maps[id].name} Ch ${ch}`);
}
setInterval(spawnNamed, 200);
ents.set('t:me', { id: 't:me', kind: 0, x: 400, y: 330, hp: 1, flags: 0, targetId: '' });
ents.set('p:me', { id: 'p:me', kind: 1, x: 410, y: 330, hp: 1, flags: 0, targetId: '' });

let goal = null;
setInterval(() => {
  const t = ents.get('t:me');
  if (!goal || state.screen !== 'world') return;
  const dx = goal.x - t.x, dy = goal.y - t.y, d = Math.hypot(dx, dy);
  if (d <= 14) { t.x = goal.x; t.y = goal.y; goal = null; } else { t.x += (dx / d) * 14; t.y += (dy / d) * 14; }
  const p = ents.get('p:me'); p.x = t.x + 10; p.y = t.y;
  for (const o of MAPS[mapId].layers[0].objects) {
    if (o.type !== 'portal') continue;
    if (t.x >= o.x && t.x <= o.x + o.width && t.y >= o.y && t.y <= o.y + o.height) {
      const to = o.properties.find((q) => q.name === 'toMap').value;
      const sp = o.properties.find((q) => q.name === 'toSpawn').value;
      goal = null; store.setState({ screen: 'loading' });
      const spawnObj = MAPS[to].layers[0].objects.find((x) => x.type === 'spawn' && x.name === sp);
      setTimeout(() => loadMap(to, spawnObj, 1), 300);
      break;
    }
  }
}, 50);

const info = (m, c) => { const r = readyAt[`${m}#${c}`] - Date.now(); return r <= 0 ? { hp: 100 } : { respawnInMs: r }; };
const commands = {
  requestBossPins() { /* Server antwortet hier nicht – die Runde muss ohne auskommen */ },
  requestMapInfo() {
    const n = NAMED[mapId], m = mapId, c = ch;
    setTimeout(() => { if (m === mapId && c === ch) store.setState({ mapInfo: { bosses: [{ index: 0, species: n.sp, ...info(m, c) }], zones: [], mapId: m, roomId: `${m}-${c}`, at: w.performance.now() } }); }, 80);
  },
  async listChannels() { return [1, 2].map((c) => ({ roomId: `${mapId}-${c}`, mapId, channel: c, clients: 3, maxClients: 50 })); },
  async switchChannel(roomId) {
    const c = Number(roomId.split('-').pop());
    store.setState({ screen: 'loading' });
    setTimeout(() => loadMap(mapId, null, c), 300);
  },
  talk(npc) {
    const t = ents.get('t:me');
    if (npc === 'digiphone' && mapId === 'map_c' && Math.hypot(t.x - 120, t.y - 330) < 50) store.setState({ dialog: { npc: 'digiphone', node: { id: 'root', choices: [{ id: 'travel', action: 'teleport' }] } } });
  },
  chooseDialog() { store.setState({ dialog: null }); },
  teleportList() { store.setState({ teleport: { maps: ['map_a', 'map_b', 'map_c'], mapId, at: w.performance.now() } }); },
  teleport(to) { teleports++; L(`Digi-Phone -> ${to}`); store.setState({ screen: 'loading' }); setTimeout(() => loadMap(to, { x: 820, y: 330 }, 1), 300); },
  closeDialog() { store.setState({ dialog: null }); }, partnerFollow() {},
};
const scene = {
  deps: { content, commands, assetsBase: '/assets/', manifest: { maps: Object.fromEntries(Object.keys(MAPS).map((m) => [m, { tmj: `maps/${m}.tmj` }])) } },
  controlledId: () => 't:me',
  tapGround: (x, y) => { goal = { x, y }; },
  select: (id) => { const e = ents.get(id); store.setState({ target: e ? { id, kind: 'mob', name: content.digimon[e.defId].name, level: e.level, hp: e.hp, maxHp: e.maxHp } : null }); },
  telegraphs: { active: [], mirrors: [] }, mechB: { lines: [] },
};
w.fetch = async (url) => ({ json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
w.dmo = { store, net: { state: { entities: ents } }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
w.addEventListener('keydown', (e) => {
  if (e.code !== 'Digit1' || !state.target) return;
  const m = ents.get(state.target.id);
  if (!m || m.hp <= 0) return;
  if (m.id === 'x:normal') normalHits++;
  const t = ents.get('t:me');
  if (Math.hypot(m.x - t.x, m.y - t.y) > 320) return;
  m.hp = Math.max(0, m.hp - 200);
  store.setState({ target: { ...state.target, hp: m.hp } });
  if (m.hp === 0) {
    ents.delete(m.id);
    readyAt[`${mapId}#${ch}`] = Date.now() + 240000;
    kills.push(`${mapId}#${ch}`);
    L(`BESIEGT: ${m.defId} (${mapId} Ch ${ch})`);
  }
}, true);

store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, world: { mapId, channel: 1, roomId: 'map_a-1' }, target: null,
  me: { tamerEntityId: 't:me', tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests: {}, bits: 5000,
    partner: { entityId: 'p:me', name: 'Gabumon', level: 30, hp: 3000, maxHp: 3000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
loadMap('map_a', { x: 820, y: 330 }, 1);
w.localStorage.setItem('digibot.cfg', JSON.stringify({ farm: true, farmMode: 'named', routeStart: 'map_a', routeEnd: 'map_c', farmChannels: [1, 2], hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3 }));
w.eval(script);
const $ = (s) => w.document.querySelector(s);
let last = '';
const watch = setInterval(() => {
  const s = ($('[data-f="status"]') || {}).textContent;
  const short = s && s.replace(/\(\d+ px\)/g, '').replace(/\d+:\d\d/g, 'm:ss').replace(/\s+$/, '');
  if (short && short !== last && !/Greife an|Wehre ab|Nächstes Ziel/.test(short)) { last = short; console.log('   > ' + short); }
}, 100);
(async () => {
  await new Promise((r) => setTimeout(r, 800));
  $('[data-tab="farm"]').click();
  $('[data-act="bot"]').click();
  const tEnd = Date.now() + 95000;
  while (Date.now() < tEnd && !(teleports >= 1 && mapId === 'map_a' && Date.now() - t0 > 10000 && kills.length >= 3 && /Map B|map_b/.test(last))) await new Promise((r) => setTimeout(r, 300));
  clearInterval(watch);
  console.log('\nKills:', kills.join(', '), '| Digi-Phone:', teleports, '| normale Art angegriffen:', normalHits);
  console.log('Routen-Info:', $('[data-f="routeinfo"]').textContent);
  const ok = kills.join(',') === 'map_a#1,map_b#1,map_b#2' && teleports >= 1 && normalHits === 0;
  console.log(ok ? 'OK – Named-Runde läuft' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
