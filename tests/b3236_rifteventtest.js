// Review 20.11. (3.2.36): Rift-Gruppe mit 🎯 Event – Event beginnt, alle sind draußen (Primary Village, bei Clockmon).
// Vorher: Leader meldet im Rift-Modus kein Event-Ziel (digibotObjective: cfg.dungeon -> null), huntStep kehrt beim Mitläufer
// zurück, sobald ein Leader da ist, und riftOutside meldet nur „Event läuft – danach weiter“ – der Mitläufer reiste nie zur Event-Map.
//  RE-O: Leader meldet das Event als Gruppenziel (objective.kind === 'event') · RE-F: Mitläufer erreicht die Event-Map.
//  RE-S: Mitläufer ohne Event-Ziel vom Leader (Leader-Event aus) reist selbst zur Event-Map.
// Teile laufen je in einem eigenen Prozess (Bus und Timer sollen nicht durchsickern).
const { JSDOM, VirtualConsole } = require('jsdom');
const { BroadcastChannel } = require('worker_threads');
const { spawn } = require('child_process');
const fs = require('fs');
const scriptPath = process.argv[2];
const script = fs.readFileSync(scriptPath, 'utf8');
const part = process.argv[3];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PV = 'primary_village', RS = 'rift_sector', EM = 'event_field';
const PORTAL = { x: 1400, y: 880, w: 32, h: 40 };

function groupWorld({ n = 2, cfgOf = () => ({}) }) {
  const G = { mapOf: [], players: new Map(), wins: [], boss: { id: 'hb:1', kind: 2, defId: 'tyrantkabuterimon_hunt', level: 60, x: 1500, y: 1500, hp: 5000, maxHp: 5000, flags: 16, targetId: '' } };
  const accounts = { leader: 0, popup: true, mirror: false, spread: false, dungeon: true, list: Array.from({ length: n }, (_, i) => ({ on: true, user: 'u' + i, char: 'Char' + i, fight: 'dd' })) };
  const party = { id: 'P', members: Array.from({ length: n }, (_, i) => ({ charId: 'c' + i, name: 'Char' + i, partnerEntityId: 'p:' + i })) };
  const content = {
    digimon: { bearmon_rift: { name: 'Bearmon' }, tyrantkabuterimon_hunt: { name: 'TyrantKabuterimon' } }, items: {}, npcs: { rift_warden: { name: 'Clockmon, Rift Warden' } }, quests: {}, dailyById: {},
    maps: { [PV]: { id: PV, name: 'Primary Village', safe: true }, [EM]: { id: EM, name: 'Event Field' }, [RS]: { id: RS, name: 'Digital Rift', levelRange: [130, 130] } },
    spawns: { [PV]: { zones: {} }, [EM]: { zones: {} }, [RS]: { zones: {}, raid: { id: 'rift', gate: { mapId: PV, portal: 'rift' }, party: { min: 1, max: 5, minLevel: 1 }, deathLimit: 1000, landing: 'camp', rift: true } } },
  };
  const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
  const P = (k, v) => ({ name: k, type: 'string', value: v });
  const MAPS = {
    [PV]: tmj([{ type: 'npc', name: 'rift_warden', x: 808, y: 792, properties: [P('npcId', 'rift_warden')] }, { type: 'spawn', name: 'from_rift', x: 808, y: 824 },
      { type: 'portal', name: 'to_event', ...{ x: PORTAL.x, y: PORTAL.y, width: PORTAL.w, height: PORTAL.h }, properties: [P('toMap', EM), P('toSpawn', 'from_pv')] }]),
    [EM]: tmj([{ type: 'spawn', name: 'from_pv', x: 200, y: 200 }, { type: 'portal', name: 'to_pv', x: 100, y: 100, width: 32, height: 32, properties: [P('toMap', PV), P('toSpawn', 'from_rift')] }]),
    [RS]: tmj([{ type: 'spawn', name: 'camp', x: 584, y: 904 }]),
  };
  for (let slot = 0; slot < n; slot++) {
    const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: `https://play.digimmo.com.br/#dbslot=${slot}`, pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
    const w = dom.window;
    w.HTMLCanvasElement.prototype.getContext = () => null;
    w.BroadcastChannel = BroadcastChannel;
    const T = { id: 't:' + slot, kind: 0, x: 808 + slot * 14, y: 900, hp: 1, flags: 0, targetId: '' }, Pp = { id: 'p:' + slot, kind: 1, x: 818 + slot * 14, y: 900, hp: 30000, maxHp: 30000, flags: 0, targetId: '' };
    G.players.set(T.id, T); G.players.set(Pp.id, Pp);
    const sent = { talk: 0, enter: 0, sel: [] };
    let state = {}; const subs = [];
    const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
    let own = { warden: null, view: null, scans: [] }, rs = { run: null, patch: null, result: null, floorUi: { going: null } };
    const rift = { getState: () => ({ ...rs, ...own, set: (p) => { const { warden, view, scans, ...rest } = p; if ('warden' in p) own.warden = warden; if ('view' in p) own.view = view; if ('scans' in p) own.scans = scans; rs = { ...rs, ...rest }; } }) };
    const mapNow = () => G.mapOf[slot];
    const list = () => { const out = []; for (const [id, e] of G.players) { const s = Number(id.split(':')[1]); if (G.mapOf[s] === mapNow()) out.push([id, e]); } if (mapNow() === EM) out.push([G.boss.id, G.boss]); return out; };
    const ents = { get: (id) => list().find(([k]) => k === id)?.[1], has: (id) => list().some(([k]) => k === id), forEach: (f) => list().forEach(([k, v]) => f(v, k)), keys: () => list().map(([k]) => k)[Symbol.iterator](), values: () => list().map(([, v]) => v)[Symbol.iterator](), entries: () => list()[Symbol.iterator](), [Symbol.iterator]: () => list()[Symbol.iterator](), get size() { return list().length; } };
    let goal = null;
    const scene = {
      deps: { content, commands: null, assetsBase: '/assets/', manifest: { maps: Object.fromEntries(Object.keys(MAPS).map((m) => [m, { tmj: `maps/${m}.tmj` }])) } },
      map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) }, portals: [], spawns: {}, zones: {} },
      controlledId: () => T.id, tapGround: (x, y) => { goal = { x, y }; },
      select: (id) => { sent.sel.push(id); const e = ents.get(id); store.setState({ target: e && e.kind === 2 ? { id, kind: 'mob', name: 'TyrantKabuterimon', level: e.level, hp: e.hp, maxHp: e.maxHp } : null }); },
      telegraphs: { active: [], mirrors: [] }, mechB: { lines: [] }, riftFog: null,
    };
    function load(map, sp) {
      G.mapOf[slot] = map; T.x = sp.x; T.y = sp.y; Pp.x = sp.x + 10; Pp.y = sp.y; goal = null;
      store.setState({ screen: 'world', world: { mapId: map, mapName: content.maps[map].name, channel: 1, roomId: `${map}-1` }, target: null, dialog: null });
    }
    setInterval(() => {
      // Portal: wer in Primary Village im Portal-Rechteck steht, landet auf der Event-Map
      if (mapNow() === PV && T.x >= PORTAL.x - 8 && T.x <= PORTAL.x + PORTAL.w + 8 && T.y >= PORTAL.y - 8 && T.y <= PORTAL.y + PORTAL.h + 8) { load(EM, { x: 200 + slot * 14, y: 200 }); return; }
      if (!goal || state.screen !== 'world') return;
      const dx = goal.x - T.x, dy = goal.y - T.y, d = Math.hypot(dx, dy);
      if (d <= 40) { T.x = goal.x; T.y = goal.y; goal = null; } else { T.x += (dx / d) * 40; T.y += (dy / d) * 40; }
      Pp.x = T.x + 10; Pp.y = T.y;
    }, 50);
    const near = (x, y, r) => Math.hypot(T.x - x, T.y - y) <= r;
    const base = {
      talk(npc) { sent.talk++; if (npc === 'rift_warden' && mapNow() === PV && near(808, 792, 60)) store.setState({ dialog: { npc, node: { id: 'root', choices: [{ id: 'open', action: 'openRift' }, { id: 'bye' }] } } }); },
      chooseDialog(c) { if (c === 'open' && state.dialog?.npc === 'rift_warden') { store.setState({ dialog: null }); own = { ...own, warden: { npc: 'rift_warden' }, view: { deepest: 10, party: [], iLead: slot === 0, blocked: null, depths: [] } }; } },
      closeDialog() { store.setState({ dialog: null }); },
      command(name) { if (name === 'riftEnter') sent.enter++; },
      raidLeave() {},
      requestBossPins() {}, requestMapInfo() {}, partnerFollow() {}, partnerStop() {},
      async requestEvents() { const now = Date.now(); return [{ id: 'mega_hunt', now, slot: null, state: 'idle', next: null }, { id: 'alter_hunt', now, slot: { key: 'e1', startMs: now - 1000, endMs: now + 3600000 }, boss: 'tyrantkabuterimon_hunt', mapId: EM, channel: 1, state: 'up' }]; },
    };
    const commands = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}) });
    scene.deps.commands = commands;
    w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
    w.dmo = { store, rift, net: { state: { entities: ents }, connected: true, transferring: false, charId: 'c' + slot, on: () => () => {} }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
    store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, chat: [], target: null, effects: {},
      session: { username: 'u' + slot, characters: [{ id: 'c' + slot, name: 'Char' + slot }] },
      party: { ...party, members: party.members.map((m, i) => ({ ...m, me: i === slot })) },
      me: { tamerEntityId: T.id, tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests: {}, bits: 5000,
        partner: { entityId: Pp.id, name: 'Dukemon', species: 'gallantmon', level: 130, hp: 30000, maxHp: 30000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
    const W = { slot, w, store, sent, T, load, status: () => w.document.querySelector('[data-f="status"]')?.textContent || '' };
    G.wins.push(W);
    load(PV, { x: 808 + slot * 14, y: 900 });
    w.localStorage.setItem('digibot.accounts', JSON.stringify(accounts));
    w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'rift', hunt: true, autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3, tab: 'acc', ...cfgOf(slot) }));
  }
  for (const W of G.wins) W.w.eval(script);
  return { G, wins: G.wins, start: () => G.wins[0].w.document.querySelector('[data-act="bot"]').click(), close: () => { for (const W of G.wins) W.w.close(); } };
}

const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

const PARTS = {
  async shared() {
    const R = groupWorld({});
    const [L, F] = R.wins;
    const bus = new BroadcastChannel('digibot-group-v1'); let obj = null;
    bus.onmessage = (e) => { const m = e.data; if (m?.type === 'state' && m.slot === 0 && m.objective) obj = m.objective; };
    await wait(1500); R.start();
    const t0 = Date.now(); let fAt = 0;
    while (Date.now() - t0 < 30000) { if (R.G.mapOf[1] === EM) { fAt = Date.now(); break; } await wait(200); }
    bus.close();
    check('RE-O', obj?.kind === 'event' && obj.mapId === EM, 'Leader meldet das Event als Gruppenziel', () => `Ziel vom Leader: ${JSON.stringify(obj)}, Status L: ${L.status()}`);
    check('RE-F', !!fAt && F.sent.enter === 0, `Mitläufer reist zur Event-Map (${fAt ? Math.round((fAt - t0) / 1000) : '–'} s)`, () => `Maps ${R.G.mapOf.join('/')}, Status F: ${F.status()} · L: ${L.status()}`);
    R.close();
  },
  async self() { // Leader ohne Event (🎯 aus): kein Event-Ziel vom Leader -> der Mitläufer reist selbst
    const R = groupWorld({ cfgOf: (s) => (s === 0 ? { hunt: false } : {}) });
    const F = R.wins[1];
    await wait(1500); R.start();
    const t0 = Date.now(); let fAt = 0;
    while (Date.now() - t0 < 30000) { if (R.G.mapOf[1] === EM) { fAt = Date.now(); break; } await wait(200); }
    check('RE-S', !!fAt, `Mitläufer ohne Event-Ziel vom Leader reist selbst (${fAt ? Math.round((fAt - t0) / 1000) : '–'} s)`, () => `Maps ${R.G.mapOf.join('/')}, Status F: ${F.status()}`);
    R.close();
  },
};

(async () => {
  if (part) {
    await PARTS[part]();
    process.exit(res.every(Boolean) ? 0 : 1);
  }
  let ok = true;
  for (const p of Object.keys(PARTS)) {
    const out = await new Promise((resolve) => { const c = spawn(process.execPath, [__filename, scriptPath, p], { cwd: __dirname }); let o = ''; c.stdout.on('data', (x) => { o += x; }); c.stderr.on('data', (x) => { o += x; }); c.on('close', (code) => resolve({ o, code })); });
    process.stdout.write(out.o);
    if (out.code !== 0) ok = false;
  }
  process.exit(ok ? 0 : 1);
})();
