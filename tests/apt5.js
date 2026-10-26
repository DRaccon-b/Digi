// Simulation 2.0: Map-für-Map-Runde (absteigend), Partner-Wechsel, Digitation mit F3-Trank, Dailies übers Board,
// Quest mit Zielen auf einer anderen Map. Erwartung: alles wird ohne Eingriff erledigt.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;

const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
const P = (k, v) => ({ name: k, type: 'string', value: v });
const portal = (x, to, sp) => ({ type: 'portal', name: to, x, y: 300, width: 32, height: 48, properties: [P('toMap', to), P('toSpawn', sp)] });
const MAPS = {
  hoch: tmj([portal(0, 'mittel', 'from_hoch'), { type: 'spawn', name: 'from_mittel', x: 50, y: 324 },
    { type: 'npc', name: 'drachenwaechter', x: 300, y: 200, properties: [P('npcId', 'waechter')] },
    { type: 'zone', name: 'gipfel', x: 400, y: 250, width: 200, height: 150 }]),
  mittel: tmj([portal(860, 'hoch', 'from_mittel'), portal(0, 'tief', 'from_mittel'),
    { type: 'spawn', name: 'from_hoch', x: 820, y: 324 }, { type: 'spawn', name: 'from_tief', x: 50, y: 324 },
    { type: 'npc', name: 'haendler', x: 400, y: 200, properties: [P('npcId', 'haendler')] },
    { type: 'npc', name: 'tafel', x: 500, y: 200, properties: [P('npcId', 'tafel')] }]),
  tief: tmj([portal(860, 'mittel', 'from_tief'), { type: 'spawn', name: 'from_mittel', x: 820, y: 324 },
    { type: 'npc', name: 'bauer', x: 300, y: 200, properties: [P('npcId', 'bauer')] },
    { type: 'zone', name: 'wiese', x: 300, y: 250, width: 200, height: 150 }]),
};
const dlg = (questIds) => [{ id: 'root', choices: [
  ...questIds.flatMap((q) => [{ id: 'ac_' + q, action: 'acceptQuest', questId: q }, { id: 'ti_' + q, action: 'turnInQuest', questId: q }]),
  { id: 'bye', action: 'close' }] }];
const content = {
  digimon: { patamon: { name: 'Patamon' }, gabumon: { name: 'Gabumon' }, garurumon: { name: 'Garurumon' }, devimon: { name: 'Devimon' }, ogremon: { name: 'Ogremon' } },
  items: { ds_pot: { name: 'DS-Trank' } },
  maps: { hoch: { id: 'hoch', name: 'Hochland', levelRange: [50, 60] }, mittel: { id: 'mittel', name: 'Mittelland', levelRange: [20, 30] },
    tief: { id: 'tief', name: 'Tiefland', levelRange: [1, 10] } },
  npcs: { waechter: { name: 'Wächter', dialog: dlg(['q_hoch']) }, haendler: { name: 'Händler', dialog: dlg(['q_mittel', 'd_ogre']) },
    tafel: { name: 'Daily-Tafel', dialog: [{ id: 'root', choices: [{ id: 'bye', action: 'close' }] }] }, bauer: { name: 'Bauer', dialog: dlg(['q_tief']) } },
  spawns: {
    hoch: { zones: { gipfel: { entries: [{ species: 'devimon', level: [18, 22] }] } } },
    mittel: { zones: {} },
    tief: { zones: { wiese: { entries: [{ species: 'ogremon', level: [18, 22] }] } } },
  },
  quests: {
    q_hoch: { id: 'q_hoch', name: 'Gipfel-Quest', giver: 'waechter', turnIn: 'waechter', minLevel: 1, objectives: [{ kind: 'kill', species: 'devimon', count: 2 }] },
    q_mittel: { id: 'q_mittel', name: 'Händler-Quest', giver: 'haendler', turnIn: 'haendler', minLevel: 1, objectives: [{ kind: 'kill', species: 'ogremon', count: 1 }] },
    q_tief: { id: 'q_tief', name: 'Bauern-Quest', giver: 'bauer', turnIn: 'bauer', minLevel: 1, objectives: [{ kind: 'talk', npcId: 'bauer' }] },
  },
  dailies: { pool_m: { id: 'pool_m', levels: [10, 99], npcs: ['tafel'], quests: [{ id: 'd_ogre', name: 'Daily: Ogremon', objectives: [{ kind: 'kill', species: 'ogremon', count: 2 }] }] } },
};
content.dailyById = { d_ogre: { ...content.dailies.pool_m.quests[0], pool: 'pool_m' } };
// Daily abgeben geht beim Händler (der hat die Auswahl im Dialog), annehmen nur über das Board der Tafel
content.npcs.haendler.dialog[0].choices = content.npcs.haendler.dialog[0].choices.filter((c) => c.id !== 'ac_d_ogre');
content.dailies.pool_m.npcs = ['tafel', 'haendler'];

let state = {};
const subs = [];
const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
const ents = new Map();
const L = (s) => console.log('   * ' + s);
const setQuest = (id, q) => store.setState({ me: { ...state.me, quests: { ...state.me.quests, [id]: q } } });

// Team: Patamon (aktiv) und Gabumon; Gabumon kann zu Garurumon digitieren (120 Tamer-DS)
const partners = {
  pata: { partnerId: 'pata', species: 'patamon', level: 20, evolutions: [{ species: 'patamon', from: null, isCurrent: true, unlocked: true }] },
  gabu: { partnerId: 'gabu', species: 'gabumon', level: 20, evolutions: [
    { species: 'gabumon', from: null, unlocked: true }, { species: 'garurumon', from: 'gabumon', stage: 'champion', level: 11, dsCost: 120, unlocked: true }] },
};
let activeId = 'pata', curSpecies = { pata: 'patamon', gabu: 'gabumon' };
function publishPartner() {
  const p = partners[activeId], sp = curSpecies[activeId];
  const evolutions = p.evolutions.map((e) => ({ ...e, isCurrent: e.species === sp, canEvolveNow: !!e.from && e.from === sp && state.me.tamerDs >= (e.dsCost || 0) }));
  store.setState({
    me: { ...state.me, partner: { ...state.me.partner, entityId: 'p:me', species: sp, name: content.digimon[sp].name, level: p.level, evolutions } },
    archive: { partners: Object.values(partners).map((x) => ({ partnerId: x.partnerId, species: curSpecies[x.partnerId], level: x.level, carried: true, active: x.partnerId === activeId })) },
  });
}
let mapId = 'mittel';
function loadMap(id, spawn) {
  mapId = id;
  for (const k of [...ents.keys()]) if (k !== 't:me' && k !== 'p:me') ents.delete(k);
  const t = ents.get('t:me'), p = ents.get('p:me');
  t.x = spawn.x; t.y = spawn.y; p.x = spawn.x + 10; p.y = spawn.y;
  for (const o of MAPS[id].layers[0].objects) if (o.type === 'npc') {
    const npc = o.properties.find((q) => q.name === 'npcId').value;
    ents.set('n:' + npc, { id: 'n:' + npc, kind: 3, defId: npc, x: o.x, y: o.y, hp: 0, flags: 0 });
  }
  const mobs = id === 'hoch' ? [['devimon', 450, 300], ['devimon', 520, 330], ['devimon', 480, 280]] : id === 'tief' ? [['ogremon', 350, 300], ['ogremon', 420, 330], ['ogremon', 460, 280], ['ogremon', 380, 360]] : [];
  mobs.forEach(([sp, x, y], i) => ents.set(`m:${id}${i}`, { id: `m:${id}${i}`, kind: 2, defId: sp, level: 20, x, y, hp: 300, maxHp: 300, flags: 0, targetId: '' }));
  store.setState({ screen: 'world', world: { mapId: id, mapName: content.maps[id].name }, target: null, dialog: null });
  L('Map: ' + content.maps[id].name);
}
ents.set('t:me', { id: 't:me', kind: 0, x: 400, y: 330, hp: 1, flags: 0, targetId: '' });
ents.set('p:me', { id: 'p:me', kind: 1, x: 410, y: 330, hp: 1, flags: 0, targetId: '' });

let goal = null;
setInterval(() => {
  const t = ents.get('t:me');
  if (!goal || state.screen !== 'world') return;
  const dx = goal.x - t.x, dy = goal.y - t.y, d = Math.hypot(dx, dy);
  if (d <= 8) { t.x = goal.x; t.y = goal.y; goal = null; } else { t.x += (dx / d) * 8; t.y += (dy / d) * 8; }
  const p = ents.get('p:me'); p.x = t.x + 10; p.y = t.y;
  for (const o of MAPS[mapId].layers[0].objects) {
    if (o.type !== 'portal' || t.x < o.x || t.x > o.x + o.width || t.y < o.y || t.y > o.y + o.height) continue;
    const to = o.properties[0].value, sp = o.properties[1].value;
    goal = null; store.setState({ screen: 'loading' });
    setTimeout(() => loadMap(to, MAPS[to].layers[0].objects.find((x) => x.type === 'spawn' && x.name === sp)), 300);
    break;
  }
}, 50);

const node = (npc) => content.npcs[npc].dialog[0];
const commands = {
  talk(npc) {
    const t = ents.get('t:me');
    const e = [...ents.values()].find((x) => x.defId === npc);
    if (!e || Math.hypot(e.x - t.x, e.y - t.y) > 50) { L('talk(' + npc + ') - ZU WEIT WEG'); return; }
    if (npc === 'bauer' && state.me.quests.q_tief?.state === 1) setQuest('q_tief', { state: 2, counters: [1] });
    if (npc === 'tafel') {
      L('Daily-Tafel: Board geöffnet');
      store.setState({ dailies: { pending: [], board: { npc: 'tafel', offers: [{ id: 'd_ogre', reward: 100 }] } } });
      return;
    }
    store.setState({ dialog: { npc, npcName: npc, node: node(npc) } });
  },
  chooseDialog(id) {
    const d = state.dialog; if (!d) return;
    const c = d.node.choices.find((x) => x.id === id); if (!c) return;
    if (c.action === 'acceptQuest' && (state.me.quests[c.questId]?.state ?? 0) === 0) { setQuest(c.questId, { state: 1, counters: [0] }); L('Angenommen: ' + c.questId + ' (aktiv: ' + activeId + ')'); }
    if (c.action === 'turnInQuest' && state.me.quests[c.questId]?.state === 2) { setQuest(c.questId, { state: 3, counters: [] }); L('Abgegeben: ' + c.questId + ' mit ' + curSpecies[activeId]); }
    store.setState({ dialog: null });
  },
  closeDialog() { store.setState({ dialog: null }); },
  acceptQuest(id) { L('direct acceptQuest ' + id); }, turnInQuest(id) { L('direct turnInQuest ' + id); },
  acceptDaily(id) { setQuest(id, { state: 1, counters: [0] }); L('Daily angenommen: ' + id); },
  closeDailyBoard() { store.setState({ dailies: { ...state.dailies, board: null } }); L('Board geschlossen'); },
  switchPartner(id) { activeId = id; L('Partner jetzt: ' + id); publishPartner(); },
  evolve(sp) {
    const e = partners[activeId].evolutions.find((x) => x.species === sp);
    if (state.me.tamerDs < e.dsCost) { L('evolve: zu wenig DS'); return; }
    store.setState({ me: { ...state.me, tamerDs: state.me.tamerDs - e.dsCost } });
    curSpecies[activeId] = sp; L('Digitiert zu ' + sp); publishPartner();
  },
};
const scene = {
  deps: { content, commands, assetsBase: '/assets/', manifest: { maps: Object.fromEntries(Object.keys(MAPS).map((k) => [k, { tmj: `maps/${k}.tmj` }])) } },
  map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) } }, // begehbares Raster (Wegfindung des Bots)
  controlledId: () => 't:me',
  tapGround: (x, y) => { goal = { x, y }; },
  select: (id) => { const e = ents.get(id); store.setState({ target: e ? { id, kind: 'mob', name: e.defId, level: e.level, hp: e.hp, maxHp: e.maxHp } : null }); },
};
w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
w.dmo = { store, net: { state: { entities: ents }, connected: true, transferring: false }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
w.addEventListener('keydown', (e) => {
  if (e.code === 'F3') { // DS-Trank
    const inv = state.me.inventory.map((it) => it && it.itemId === 'ds_pot' ? { ...it, qty: it.qty - 1 } : it);
    store.setState({ me: { ...state.me, tamerDs: state.me.tamerDs + 200, inventory: inv } }); L('F3: Tamer-DS +200'); publishPartner(); return;
  }
  if (e.code !== 'Digit1' || !state.target) return;
  const m = ents.get(state.target.id);
  if (!m || m.hp <= 0) return;
  m.hp = Math.max(0, m.hp - 150); m.targetId = 'p:me';
  store.setState({ target: { ...state.target, hp: m.hp } });
  if (m.hp > 0) return;
  m.targetId = '';
  L(`Besiegt: ${m.defId} (Partner ${curSpecies[activeId]})`);
  for (const [id, q] of Object.entries(state.me.quests)) {
    const def = content.quests[id] || content.dailyById[id];
    const o = def?.objectives[0];
    if (q.state === 1 && o.kind === 'kill' && o.species === m.defId) {
      const c = q.counters[0] + 1; setQuest(id, { state: c >= o.count ? 2 : 1, counters: [c] });
    }
  }
  setTimeout(() => { m.hp = 300; }, 1200);
}, true);

store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, dailies: { pending: [], board: null }, world: { mapId: 'mittel', mapName: 'Mittelland' }, target: null,
  me: { tamerEntityId: 't:me', tamerDs: 50, tamerMaxDs: 400, hotbar: ['cmd:attack', null, null, null, null, null, null, null, null, null, 'item:ds_pot'],
    inventory: [{ itemId: 'ds_pot', qty: 2 }], quests: {},
    partner: { entityId: 'p:me', name: 'Patamon', level: 20, hp: 3000, maxHp: 3000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
publishPartner();
loadMap('mittel', { x: 600, y: 330 });
w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, hpPot: 0, dsPot: 0, tdsPot: 0, apOrder: 'sweep', apStartMap: 'hoch',
  apQuestPartner: 'gabu', apEvo: 'garurumon', apTurninPartner: 'pata', apDailies: true }));
w.eval(script);
const $ = (s) => w.document.querySelector(s);
let last = '';
const watch = setInterval(() => {
  const s = (($('[data-f="status"]') || {}).textContent || '').replace(/\(\d+ px\)/g, '').trim();
  if (s && s !== last && !/laufe zu|Greife an|Wehre ab|Nächstes Ziel|Im Gespräch|Reise nach/.test(s)) console.log('   > ' + s);
  last = s;
}, 100);
(async () => {
  await new Promise((r) => setTimeout(r, 800));
  $('[data-tab="quest"]').click(); await new Promise((r) => setTimeout(r, 300));
  const sel = (k) => { const el = $(`[data-apsel="${k}"]`); return el ? `${el.value} = ${el.selectedOptions[0]?.textContent}` : '-'; };
  console.log('Einstellungen im Panel: Reihenfolge ' + sel('apOrder') + ' | Start ' + sel('apStartMap') + ' | Quest ' + sel('apQuestPartner') + ' | Evo ' + sel('apEvo') + ' | Abgabe ' + sel('apTurninPartner'));
  $('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 150000 && !/gestoppt/.test(last)) await new Promise((r) => setTimeout(r, 200));
  clearInterval(watch);
  console.log('\nErgebnis nach ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s: ' + JSON.stringify(state.me.quests) + ' | aktiv: ' + activeId + ' | Formen: ' + JSON.stringify(curSpecies));
  process.exit(0);
})();
