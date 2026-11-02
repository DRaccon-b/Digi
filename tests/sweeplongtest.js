// 3.2.1 (live 02.11., Bauzel): Die Map-Runde sprang pro Takt höchstens 40 Maps weiter. Von Primary Village (Platz 2) aus
// endete das genau bei Water Realm (Platz 42) – die Reaper-Dailies lagen auf Platz 45/46. Der Bot meldete „keine machbaren
// Quests mehr“ und stand am Event-Warteplatz. Welt hier: 50 Maps in einer Kette (m00 … m49, aufsteigend), die einzige Quest
// gibt der Wirt auf m49. Erwartung: die Runde läuft bis m49 durch und nimmt die Quest als Aufgabe – kein „keine machbaren
// Quests“, kein Stopp.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;

const N = 50, id = (i) => `m${String(i).padStart(2, '0')}`;
const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
const P = (k, v) => ({ name: k, type: 'string', value: v });
const portal = (x, to, sp) => ({ type: 'portal', name: to, x, y: 300, width: 32, height: 48, properties: [P('toMap', to), P('toSpawn', sp)] });
const MAPS = {}, maps = {}, spawns = {};
for (let i = 0; i < N; i++) {
  const objs = [{ type: 'spawn', name: 'start', x: 400, y: 324 }];
  if (i > 0) objs.push(portal(0, id(i - 1), 'start'));
  if (i < N - 1) objs.push(portal(860, id(i + 1), 'start'));
  if (i === N - 1) objs.push({ type: 'npc', name: 'wirt', x: 300, y: 200, properties: [P('npcId', 'wirt')] });
  MAPS[id(i)] = tmj(objs);
  maps[id(i)] = { id: id(i), name: `Map ${i}`, levelRange: [i + 1, i + 1] };
  spawns[id(i)] = { zones: {} };
}
const content = {
  digimon: { patamon: { name: 'Patamon' } }, items: {}, maps, spawns,
  npcs: { wirt: { name: 'Wirt', dialog: [{ id: 'root', choices: [{ id: 'ac_q_end', action: 'acceptQuest', questId: 'q_end' }, { id: 'bye', action: 'close' }] }] } },
  quests: { q_end: { id: 'q_end', name: 'Ende-Quest', giver: 'wirt', turnIn: 'wirt', minLevel: 1, objectives: [{ kind: 'talk', npcId: 'wirt' }] } },
  dailies: {}, dailyById: {},
};
let state = {};
const subs = [];
const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
const ents = new Map([['t:me', { id: 't:me', kind: 0, x: 400, y: 330, hp: 1, flags: 0, targetId: '' }], ['p:me', { id: 'p:me', kind: 1, x: 410, y: 330, hp: 1, flags: 0, targetId: '' }]]);
const commands = { talk() {}, chooseDialog() {}, closeDialog() {}, partnerFollow() {}, partnerStop() {} };
const scene = {
  deps: { content, commands, assetsBase: '/assets/', manifest: { maps: Object.fromEntries(Object.keys(MAPS).map((k) => [k, { tmj: `maps/${k}.tmj` }])) } },
  map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) } },
  controlledId: () => 't:me', tapGround() {}, select() {},
};
w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
w.dmo = { store, net: { state: { entities: ents }, connected: true, transferring: false }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, dailies: { pending: [], board: null }, world: { mapId: 'm00', mapName: 'Map 0', channel: 1 }, target: null, dialog: null,
  me: { tamerEntityId: 't:me', tamerDs: 50, tamerMaxDs: 400, hotbar: [], inventory: [], quests: {},
    partner: { entityId: 'p:me', species: 'patamon', name: 'Patamon', level: 60, hp: 3000, maxHp: 3000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [], evolutions: [] } } });
w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, hpPot: 0, dsPot: 0, tdsPot: 0, apOrder: 'sweep', apSweepDir: 'up', apStartMap: '', apSweepMap: '', apTeleport: false, apDailies: false, tab: 'log' }));
w.eval(script);
const $ = (s) => w.document.querySelector(s);
(async () => {
  await new Promise((r) => setTimeout(r, 800));
  $('[data-act="bot"]').click();
  const t0 = Date.now(); let st = '', seen = new Set();
  while (Date.now() - t0 < 6000) {
    st = ($('[data-f="status"]')?.textContent || '').trim(); seen.add(st.slice(0, 80));
    if (/Ende-Quest|gestoppt|keine machbaren/i.test(st)) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const log = $('.digibot__log')?.textContent || '';
  const task = /Aufgabe: „Ende-Quest“ annehmen bei Wirt/.test(log) || /Ende-Quest/.test(st);
  const idle = /keine machbaren Quests/i.test(log) || /gestoppt|keine machbaren/i.test(st);
  console.log(JSON.stringify({ status: st, seen: [...seen].slice(-5), weitBis: (log.match(/weiter mit (Map \d+?)(?=\d\d:\d\d|$)/) || [])[1] || '-' })); // Log steht neueste zuerst
  const ok = task && !idle;
  console.log(ok ? 'OK     Runde über 50 Maps: Quest auf der letzten Map wird Aufgabe' : 'FEHLER Runde bricht vor der letzten Map ab (keine machbaren Quests)');
  process.exit(ok ? 0 : 1);
})();
