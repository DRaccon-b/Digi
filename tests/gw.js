// Kleine Spielwelt für die Gruppen-Tests: Native Forest (Kunemon) <-> Primary Village (Gennai, Elecmon)
const { JSDOM, VirtualConsole } = require('jsdom');
const { BroadcastChannel } = require('worker_threads');
module.exports = function makeWorld({ slot, quests, accounts, tag, setup, viewRange, noHash, onKill, extraEnts, mobs }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: noHash ? 'https://play.digimmo.com.br/' : `https://play.digimmo.com.br/#dbslot=${slot}`, pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.BroadcastChannel = BroadcastChannel;
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
    },
    dailyById: {},
  };
  const npcPos = {};
  if (setup) setup({ content, MAPS, npcPos });
  const log = [];
  const L = (s) => { log.push(s); if (process.env.V) console.log(`   [${tag}] ${s}`); };
  let state = {};
  const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  const ents = new Map();
  const setQuest = (id, q) => store.setState({ me: { ...state.me, quests: { ...state.me.quests, [id]: q } } });
  let mapId = 'native_forest', kills = 0;
  function loadMap(id, spawn) {
    mapId = id;
    for (const k of [...ents.keys()]) if (k !== 't:me' && k !== 'p:me') ents.delete(k);
    hiddenNpc.clear();
    const t = ents.get('t:me'), p = ents.get('p:me');
    t.x = spawn.x; t.y = spawn.y; p.x = spawn.x + 10; p.y = spawn.y;
    if (id === 'primary_village') {
      ents.set('n:gennai', { id: 'n:gennai', kind: 3, defId: 'gennai', x: 216, y: 200, hp: 0, flags: 0, ...npcPos.gennai });
      ents.set('n:elecmon', { id: 'n:elecmon', kind: 3, defId: 'elecmon', x: 200, y: 456, hp: 0, flags: 0, ...npcPos.elecmon });
    } else {
      let i = 0;
      for (const [x, y, sp] of mobs || [[360, 300], [420, 340], [470, 280], [380, 360], [450, 380]]) {
        i++;
        ents.set('m:' + i, { id: 'm:' + i, kind: 2, defId: sp || 'kunemon', level: 2, x, y, hp: 300, maxHp: 300, flags: 0, targetId: '' });
      }
    }
    for (const e of extraEnts?.(id) || []) ents.set(e.id, { ...e });
    store.setState({ screen: 'world', world: { mapId: id, mapName: content.maps[id].name, channel: 1 }, target: null, dialog: null });
    L('Map: ' + content.maps[id].name);
  }
  ents.set('t:me', { id: 't:me', kind: 0, x: 400, y: 330, hp: 1, flags: 0, targetId: '' });
  ents.set('p:me', { id: 'p:me', kind: 1, x: 410, y: 330, hp: 1, flags: 0, targetId: '' });
  const hiddenNpc = new Map();
  if (viewRange) setInterval(() => {
    const t = ents.get('t:me');
    for (const [id, e] of [...ents, ...hiddenNpc]) {
      if (e.kind !== 3) continue;
      const near = Math.hypot(e.x - t.x, e.y - t.y) <= viewRange;
      if (near && hiddenNpc.has(id)) { hiddenNpc.delete(id); ents.set(id, e); }
      if (!near && ents.has(id)) { ents.delete(id); hiddenNpc.set(id, e); }
    }
  }, 100);
  let goal = null;
  setInterval(() => {
    const t = ents.get('t:me');
    if (!goal || state.screen !== 'world') return;
    const dx = goal.x - t.x, dy = goal.y - t.y, d = Math.hypot(dx, dy);
    if (d <= 8) { t.x = goal.x; t.y = goal.y; goal = null; } else { t.x += (dx / d) * 8; t.y += (dy / d) * 8; }
    const p = ents.get('p:me'); p.x = t.x + 10; p.y = t.y;
    for (const o of MAPS[mapId].layers[0].objects) {
      if (o.type !== 'portal') continue;
      if (t.x >= o.x && t.x <= o.x + o.width && t.y >= o.y && t.y <= o.y + o.height) {
        const to = o.properties.find((q) => q.name === 'toMap').value;
        const sp = o.properties.find((q) => q.name === 'toSpawn').value;
        goal = null; store.setState({ screen: 'loading' });
        setTimeout(() => loadMap(to, MAPS[to].layers[0].objects.find((x) => x.type === 'spawn' && x.name === sp)), 300);
        break;
      }
    }
  }, 50);
  const invites = [];
  const commands = {
    talk(npc) {
      const t = ents.get('t:me');
      const near = [...ents.values()].find((e) => e.defId === npc && Math.hypot(e.x - t.x, e.y - t.y) < 50);
      if (!near) { L('talk(' + npc + ') zu weit'); return; }
      const choices = [];
      for (const def of Object.values(content.quests)) {
        const s = state.me.quests[def.id]?.state ?? 0;
        if (def.turnIn === npc && s === 2) choices.push({ id: 'ti_' + def.id, action: 'turnInQuest', questId: def.id });
        if (def.giver === npc && s === 0 && (def.prereq || []).every((p) => state.me.quests[p]?.state === 3)) choices.push({ id: 'ac_' + def.id, action: 'acceptQuest', questId: def.id });
      }
      choices.push({ id: 'bye' });
      store.setState({ dialog: { npc, npcName: npc, node: { id: 'root', choices } } });
    },
    chooseDialog(id) {
      if (id.startsWith('ac_')) { setQuest(id.slice(3), { state: 1, counters: [0] }); L('angenommen: ' + id.slice(3)); }
      if (id.startsWith('ti_')) { setQuest(id.slice(3), { state: 3, counters: [] }); L('abgegeben: ' + id.slice(3)); }
      store.setState({ dialog: null });
    },
    closeDialog() { store.setState({ dialog: null }); },
    partnerFollow() {},
    acceptQuest() {}, turnInQuest() {},
    partyInvite(name) { invites.push(name); L('partyInvite ' + name); },
    partyRespond() {},
  };
  const scene = {
    deps: { content, commands, assetsBase: '/assets/', manifest: { maps: { native_forest: { tmj: 'maps/native_forest.tmj' }, primary_village: { tmj: 'maps/primary_village.tmj' } } } },
    controlledId: () => 't:me',
    map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) } }, // begehbares Raster (Wegfindung des Bots)
    tapGround: (x, y) => { goal = { x, y }; },
    select: (id) => {
      const e = ents.get(id);
      store.setState({ target: e ? { id, kind: 'mob', name: 'Kunemon', level: e.level, hp: e.hp, maxHp: e.maxHp } : null });
    },
  };
  w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
  w.dmo = { store, net: { state: { entities: ents }, charId: 'c1', connected: true, transferring: false }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
  w.addEventListener('keydown', (e) => {
    if (e.code !== 'Digit1' || !state.target) return;
    const m = ents.get(state.target.id);
    if (!m || m.hp <= 0) return;
    m.hp = Math.max(0, m.hp - 150); m.targetId = 'p:me';
    store.setState({ target: { ...state.target, hp: m.hp } });
    if (m.hp === 0) {
      m.targetId = ''; kills++;
      if (onKill) onKill(m, { get state() { return state; }, setQuest });
      const q = state.me.quests.q02_first_steps;
      if (q?.state === 1) { const c = q.counters[0] + 1; setQuest('q02_first_steps', { state: c >= 2 ? 2 : 1, counters: [c] }); }
      L('Kunemon besiegt (Kills ' + kills + ')');
    }
  }, true);
  store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, session: { username: accounts.list[slot].user, characters: [{ id: 'c1', name: accounts.list[slot].char || 'X' }] },
    me: { tamerEntityId: 't:me', tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests,
      partner: { entityId: 'p:me', name: 'Gabumon', level: 6, hp: 3000, maxHp: 3000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } },
    world: { mapId, mapName: 'Native Forest', channel: 1 }, target: null });
  loadMap('native_forest', { x: 400, y: 330 });
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
  w.localStorage.setItem('digibot.accounts', JSON.stringify(accounts));
  return { w, store, ents, log, invites, get state() { return state; }, get kills() { return kills; }, status: () => w.document.querySelector('[data-f="status"]')?.textContent || '' };
};
