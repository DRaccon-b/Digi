// Simulation: zwei Maps, Portal, NPCs mit Dialog, Monster, Quest-Kette -> Autopilot muss alles allein erledigen
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;

const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
const P = (k, v) => ({ name: k, type: 'string', value: v });
const MAPS = {
  native_forest: tmj([
    { type: 'portal', name: 'pv', x: 0, y: 300, width: 32, height: 48, properties: [P('toMap', 'primary_village'), P('toSpawn', 'from_nf')] },
    { type: 'spawn', name: 'from_pv', x: 48, y: 324 },
    { type: 'zone', name: 'meadow', x: 300, y: 250, width: 200, height: 150 },
  ]),
  primary_village: tmj([
    { type: 'portal', name: 'nf', x: 860, y: 300, width: 32, height: 64, properties: [P('toMap', 'native_forest'), P('toSpawn', 'from_pv')] },
    { type: 'spawn', name: 'from_nf', x: 820, y: 330 },
    { type: 'npc', name: 'gennai', x: 216, y: 200, properties: [P('npcId', 'gennai')] },
    { type: 'npc', name: 'elecmon', x: 200, y: 456, properties: [P('npcId', 'elecmon')] },
  ]),
};
const content = {
  digimon: { kunemon: { name: 'Kunemon' } }, items: {},
  maps: { native_forest: { name: 'Native Forest' }, primary_village: { name: 'Primary Village' } },
  npcs: { gennai: { name: 'Gennai' }, elecmon: { name: 'Elecmon' } },
  spawns: { native_forest: { zones: { meadow: { entries: [{ species: 'kunemon', level: [1, 3] }] } } }, primary_village: { zones: {} } },
  quests: {
    q00_meet_gennai: { id: 'q00_meet_gennai', name: 'Meet Gennai', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'talk', npcId: 'gennai' }] },
    q02_first_steps: { id: 'q02_first_steps', name: 'First Steps', giver: 'elecmon', turnIn: 'elecmon', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 2 }] },
    q99_far: { id: 'q99_far', name: 'Spaeter', giver: 'elecmon', turnIn: 'elecmon', minLevel: 30, objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] },
  },
  dailyById: {},
};

let attackerOn = false, hitsOnAttacker = 0, follows = 0;
let state = {};
const subs = [];
const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
const ents = new Map();
const L = (s) => console.log('   * ' + s);
const me0 = {
  tamerEntityId: 't:me', tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [],
  quests: { q00_meet_gennai: { state: 1, counters: [0] } },
  partner: { entityId: 'p:me', name: 'Gabumon', level: 6, hp: 3000, maxHp: 3000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] },
};
const setQuest = (id, q) => store.setState({ me: { ...state.me, quests: { ...state.me.quests, [id]: q } } });
let mapId = 'native_forest';
function loadMap(id, spawn) {
  mapId = id;
  for (const k of [...ents.keys()]) if (k !== 't:me' && k !== 'p:me') ents.delete(k);
  const t = ents.get('t:me'), p = ents.get('p:me');
  t.x = spawn.x; t.y = spawn.y; p.x = spawn.x + 10; p.y = spawn.y;
  if (id === 'primary_village') {
    ents.set('n:gennai', { id: 'n:gennai', kind: 3, defId: 'gennai', x: 216, y: 200, hp: 0, flags: 0 });
    ents.set('n:elecmon', { id: 'n:elecmon', kind: 3, defId: 'elecmon', x: 200, y: 456, hp: 0, flags: 0 });
  } else {
    let i = 0;
    for (const [x, y] of [[360, 300], [420, 340], [470, 280]]) {
      i++;
      ents.set('m:' + i, { id: 'm:' + i, kind: 2, defId: 'kunemon', level: 2, x, y, hp: 300, maxHp: 300, flags: 0, targetId: '' });
    }
  }
  store.setState({ screen: 'world', world: { mapId: id, mapName: content.maps[id].name }, target: null, dialog: null });
  L('Map geladen: ' + content.maps[id].name); if (id === 'primary_village' && !attackerOn) { const tm = ents.get('t:me'); ents.set('m:att', { id: 'm:att', kind: 2, defId: 'kunemon', level: 2, x: tm.x - 30, y: tm.y, hp: 300, maxHp: 300, flags: 32, targetId: 'p:me' }); attackerOn = true; L('ANGREIFER auf dem Weg zum Gespraech'); }
}
ents.set('t:me', { id: 't:me', kind: 0, x: 400, y: 330, hp: 1, flags: 0, targetId: '' });
ents.set('p:me', { id: 'p:me', kind: 1, x: 410, y: 330, hp: 1, flags: 0, targetId: '' });

// Bewegung: 6 px pro 50 ms Richtung Ziel; Portal-Rechteck betreten -> Map-Wechsel
let goal = null;
setInterval(() => {
  const t = ents.get('t:me');
  if (!goal || state.screen !== 'world') return;
  const dx = goal.x - t.x, dy = goal.y - t.y, d = Math.hypot(dx, dy);
  if (d <= 6) { t.x = goal.x; t.y = goal.y; goal = null; } else { t.x += (dx / d) * 6; t.y += (dy / d) * 6; }
  const p = ents.get('p:me'); p.x = t.x + 10; p.y = t.y;
  for (const o of MAPS[mapId].layers[0].objects) {
    if (o.type !== 'portal') continue;
    if (t.x >= o.x && t.x <= o.x + o.width && t.y >= o.y && t.y <= o.y + o.height) {
      const to = o.properties.find((q) => q.name === 'toMap').value;
      const sp = o.properties.find((q) => q.name === 'toSpawn').value;
      goal = null; store.setState({ screen: 'loading' });
      const spawnObj = MAPS[to].layers[0].objects.find((x) => x.type === 'spawn' && x.name === sp);
      setTimeout(() => loadMap(to, spawnObj), 300);
      break;
    }
  }
}, 50);

const commands = {
  talk(npc) {
    const t = ents.get('t:me');
    const near = [...ents.values()].find((e) => e.defId === npc && Math.hypot(e.x - t.x, e.y - t.y) < 50);
    if (!near) { L('talk(' + npc + ') - ZU WEIT WEG'); return; }
    if (state.me.quests.q00_meet_gennai?.state === 1 && npc === 'gennai') { setQuest('q00_meet_gennai', { state: 2, counters: [1] }); const tm = ents.get('t:me'); ents.set('m:att', { id: 'm:att', kind: 2, defId: 'kunemon', level: 2, x: tm.x + 30, y: tm.y, hp: 300, maxHp: 300, flags: 32, targetId: 'p:me' }); attackerOn = true; L('ANGREIFER erscheint waehrend der Abgabe'); }
    const choices = [];
    for (const def of Object.values(content.quests)) {
      const s = state.me.quests[def.id]?.state ?? 0;
      if (def.turnIn === npc && s === 2) choices.push({ id: 'ti_' + def.id, action: 'turnInQuest', questId: def.id });
      if (def.giver === npc && s === 0 && (def.prereq || []).every((p) => state.me.quests[p]?.state === 3) && def.minLevel <= 6) {
        choices.push({ id: 'ac_' + def.id, action: 'acceptQuest', questId: def.id });
      }
    }
    choices.push({ id: 'bye' });
    L('Gespraech mit ' + npc + ' (Auswahl: ' + choices.map((c) => c.id).join(', ') + ')');
    store.setState({ dialog: { npc, npcName: npc, node: { id: 'root', choices } } });
  },
  chooseDialog(id) {
    if (id.startsWith('ac_')) { setQuest(id.slice(3), { state: 1, counters: [0] }); L('Quest angenommen: ' + id.slice(3)); }
    if (id.startsWith('ti_')) { setQuest(id.slice(3), { state: 3, counters: [] }); L('Quest abgegeben: ' + id.slice(3)); }
    store.setState({ dialog: null });
  },
  closeDialog() { store.setState({ dialog: null }); },
  partnerFollow() { follows++; },
  acceptQuest(id) { L('direct acceptQuest ' + id); },
  turnInQuest(id) { L('direct turnInQuest ' + id); },
};
const scene = {
  deps: {
    content, commands, assetsBase: '/assets/',
    manifest: { maps: { native_forest: { tmj: 'maps/native_forest.tmj' }, primary_village: { tmj: 'maps/primary_village.tmj' } } },
  },
  map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) } }, // begehbares Raster (Wegfindung des Bots)
  controlledId: () => 't:me',
  tapGround: (x, y) => { goal = { x, y }; },
  select: (id) => {
    const e = ents.get(id);
    store.setState({ target: e ? { id, kind: 'mob', name: 'Kunemon', level: e.level, hp: e.hp, maxHp: e.maxHp } : null });
  },
};
w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
w.dmo = { store, net: { state: { entities: ents }, connected: true, transferring: false }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };

// Kampf: Taste 1 -> 150 Schaden aufs Ziel; Tod zaehlt fuer die Kill-Quest
w.addEventListener('keydown', (e) => {
  if (e.code !== 'Digit1' || !state.target) return;
  if (state.target.id === 'm:att' && (state.me.quests.q00_meet_gennai?.state ?? 0) < 3) hitsOnAttacker++;
  const m = ents.get(state.target.id);
  if (!m || m.hp <= 0) return;
  m.hp = Math.max(0, m.hp - 150); m.targetId = 'p:me';
  store.setState({ target: { ...state.target, hp: m.hp } });
  if (m.hp === 0) {
    m.targetId = '';
    const q = state.me.quests.q02_first_steps;
    if (q?.state === 1) {
      const c = q.counters[0] + 1;
      setQuest('q02_first_steps', { state: c >= 2 ? 2 : 1, counters: [c] });
      L('Kunemon besiegt (' + c + '/2)');
    }
  }
}, true);

store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, me: me0, world: { mapId, mapName: 'Native Forest' }, target: null });
loadMap('native_forest', { x: 400, y: 330 });
w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0 }));
w.eval(script);
const $ = (s) => w.document.querySelector(s);
let lastStatus = '';
const watch = setInterval(() => {
  const s = ($('[data-f="status"]') || {}).textContent;
  const short = s && s.replace(/\(\d+ px\)/g, '').replace(/\s+$/, '');
  if (short && short !== lastStatus) { lastStatus = short; console.log('   > ' + short); }
}, 100);
(async () => {
  await new Promise((r) => setTimeout(r, 800));
  $('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 60000 && state.me.quests.q00_meet_gennai?.state !== 3) await new Promise((r) => setTimeout(r, 200));
  clearInterval(watch);
  const ok = attackerOn && state.me.quests.q00_meet_gennai?.state === 3 && hitsOnAttacker === 0; console.log('Abgabe:', state.me.quests.q00_meet_gennai?.state, '| Treffer auf Angreifer waehrend Abgabe:', hitsOnAttacker, '| Digimon gerufen:', follows); console.log(ok ? 'OK - Abgabe ohne Kampf' : 'FEHLER');
  process.exit(0);
})();
