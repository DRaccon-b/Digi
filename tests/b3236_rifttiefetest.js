// Review 20.11. (3.2.36): Rift-Tiefe „höchstmöglich“ rechnete nur mit dem Level des Leaders (view.party.find(leader)).
// Das Spiel prüft aber alle Partner der Party.
// 3.2.50 (Nutzer 22.11.: „man kann mit jedem Level in das Rift rein“): keine Level-Sperre je Tiefe mehr im Bot.
// A: Leader Lv 99, Mitläufer Lv 80, freigeschaltet bis 5 -> erste Tiefe 5 (die tiefste freigeschaltete, Level egal).
// C: mehrere stabile Läufe hintereinander -> immer Tiefe 5, nichts abgelehnt.
// E: feste Tiefe 5 mit Partner Lv 6 -> betritt Tiefe 5 (vorher: „braucht Partner Lv 120“ – Bot gestoppt).
// B: view.party meldet beim Mitläufer problem 'level' (bleibt stehen) -> der Leader wartet nicht ewig stumm, sondern
//    nimmt nach dem Zeitlimit eine Tiefe weniger (Logeintrag) – Rückfall, falls das Spiel doch ein Level-Problem meldet.
// D: problem 'far' bleibt stehen -> nach dem Zeitlimit genau eine Warnung im Log (nicht je Takt).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');

function world({ cfg, deepest = 5, party, problem = '' }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
  const P = (k, v) => ({ name: k, type: 'string', value: v });
  const PV = 'primary_village', RS = 'rift_sector';
  const MAPS = {
    [PV]: tmj([{ type: 'npc', name: 'rift_warden', x: 808, y: 792, properties: [P('npcId', 'rift_warden')] }, { type: 'spawn', name: 'from_rift', x: 808, y: 824 }]),
    [RS]: tmj([{ type: 'spawn', name: 'camp', x: 584, y: 904 }]),
  };
  const content = {
    digimon: { bearmon_rift: { name: 'Bearmon' } },
    items: {}, npcs: { rift_warden: { name: 'Clockmon, Rift Warden' } }, quests: {}, dailyById: {},
    maps: { [PV]: { id: PV, name: 'Primary Village', safe: true }, [RS]: { id: RS, name: 'Digital Rift', levelRange: [130, 130] } },
    spawns: { [PV]: { zones: {} }, [RS]: { zones: {}, raid: { id: 'rift', gate: { mapId: PV, portal: 'rift' }, party: { min: 1, max: 5, minLevel: 1 }, deathLimit: 1000, landing: 'camp', rift: true } } },
  };
  const sent = { enter: [], refused: [], leave: 0 };
  let state = {}; const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  let rs = { warden: null, view: null, run: null, patch: null, result: null, floorUi: { going: null } };
  const rift = { getState: () => ({ ...rs, set: (p) => { rs = { ...rs, ...p }; } }), setState: (p) => { rs = { ...rs, ...p }; } };
  const ents = new Map();
  let mapId = PV, goal = null;
  const scene = {
    deps: { content, commands: null, assetsBase: '/assets/', manifest: { maps: Object.fromEntries(Object.keys(MAPS).map((m) => [m, { tmj: `maps/${m}.tmj` }])) } },
    map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) }, portals: [], spawns: {}, zones: {} },
    controlledId: () => 't:me',
    tapGround: (x, y) => { goal = { x, y }; },
    select: () => {},
    telegraphs: { active: [], mirrors: [] }, mechB: { lines: [] }, riftFog: null,
  };
  function loadMap(id, sp) {
    mapId = id;
    const t = ents.get('t:me'), p = ents.get('p:me');
    t.x = sp.x; t.y = sp.y; p.x = sp.x + 10; p.y = sp.y;
    scene.riftFog = id === RS ? { rift: { layout: { cells: [{ id: 'c0', role: 'camp', rect: { x: 100, y: 100, w: 200, h: 200 } }], guardian: { x: 200, y: 200 } } } } : null;
    store.setState({ screen: 'world', world: { mapId: id, mapName: content.maps[id].name, channel: 1, roomId: `${id}-1` }, target: null, dialog: null });
  }
  ents.set('t:me', { id: 't:me', kind: 0, x: 808, y: 900, hp: 1, flags: 0, targetId: '' });
  ents.set('p:me', { id: 'p:me', kind: 1, x: 818, y: 900, hp: 1, flags: 0, targetId: '' });
  setInterval(() => {
    const t = ents.get('t:me');
    if (!goal || state.screen !== 'world') return;
    const dx = goal.x - t.x, dy = goal.y - t.y, d = Math.hypot(dx, dy);
    if (d <= 25) { t.x = goal.x; t.y = goal.y; goal = null; } else { t.x += (dx / d) * 25; t.y += (dy / d) * 25; }
    const p = ents.get('p:me'); p.x = t.x + 10; p.y = t.y;
  }, 50);
  const near = (x, y, r) => { const t = ents.get('t:me'); return Math.hypot(t.x - x, t.y - y) <= r; };
  const view = () => ({ deepest, party: party.map((m, i) => ({ name: m.name, level: m.level, problem: i > 0 ? problem : '', leader: i === 0 })), iLead: true, blocked: null, depths: [] });
  const commands = {
    talk(npc) { if (npc === 'rift_warden' && mapId === PV && near(808, 792, 60)) store.setState({ dialog: { npc, node: { id: 'root', choices: [{ id: 'open', action: 'openRift' }, { id: 'bye' }] } } }); },
    chooseDialog(c) { if (c === 'open' && state.dialog?.npc === 'rift_warden') { store.setState({ dialog: null }); rs = { ...rs, warden: { npc: 'rift_warden' }, view: view() }; } },
    closeDialog() { store.setState({ dialog: null }); },
    command(name, args) {
      if (name === 'riftEnter') {
        sent.enter.push(args.depth);
        // wie im Spiel (Nutzer 22.11.): jedes Partner-Level darf jede freigeschaltete Tiefe betreten
        if (args.depth > deepest) { sent.refused.push(args.depth); store.setState({ chat: [...(state.chat || []), { kind: 'system', code: 'rift_depth_locked', ts: Date.now() }] }); return; }
        rs = { ...rs, warden: null, view: null };
        store.setState({ screen: 'loading' });
        // Kurzlauf: Rift betreten, gleich darauf stabil geschafft
        setTimeout(() => {
          rs = { ...rs, run: { depth: args.depth, running: true, signal: 0, clockMs: 600000, floor: { n: 1, of: 3 }, portal: { x: 400, y: 500, open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] } };
          loadMap(RS, { x: 200, y: 200 });
          setTimeout(() => { rs = { ...rs, run: null, result: { stable: true, depth: args.depth, timeMs: 200000, loot: {} } }; }, 300);
        }, 200);
      } else if (name === 'raidLeave') commands.raidLeave();
    },
    raidLeave() { sent.leave++; rs = { ...rs, result: null, run: null }; store.setState({ screen: 'loading' }); setTimeout(() => loadMap(PV, { x: 808, y: 824 }), 200); },
    requestBossPins() {}, requestMapInfo() {}, partnerFollow() {}, partnerStop() {},
    async requestEvents() { return []; },
  };
  scene.deps.commands = commands;
  w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
  w.dmo = { store, rift, net: { state: { entities: ents }, connected: true, transferring: false }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
  store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, chat: [], world: { mapId: PV, channel: 1, roomId: `${PV}-1` }, target: null,
    me: { tamerEntityId: 't:me', tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests: {}, bits: 5000,
      partner: { entityId: 'p:me', name: 'Piemon', species: 'piedmon_dm', level: party[0].level, hp: 30000, maxHp: 30000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
  loadMap(PV, { x: 808, y: 900 });
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'rift', hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3, tab: 'log', ...cfg }));
  w.eval(script);
  const logLines = () => [...w.document.querySelectorAll('.digibot__log div')].map((d) => d.textContent);
  return { w, sent, status: () => w.document.querySelector('[data-f="status"]')?.textContent || '', logLines };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function go(opts, done, ms) {
  const W = world(opts);
  await wait(900);
  W.w.document.querySelector('[data-act="bot"]').click();
  const end = Date.now() + ms;
  while (Date.now() < end && !(done && done(W))) await wait(200);
  return W;
}
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };
const PARTY = [{ name: 'Leader', level: 99 }, { name: 'Mate', level: 80 }];
(async () => {
  const [WA, WB, WD, WE] = await Promise.all([
    go({ cfg: { riftDepthMode: 'max' }, party: PARTY }, (W) => W.sent.enter.length - W.sent.refused.length >= 6, 90000),
    go({ cfg: { riftDepthMode: 'max' }, party: PARTY, problem: 'level' }, (W) => W.logLines().some((l) => /Level zu niedrig/.test(l)), 50000),
    go({ cfg: { riftDepthMode: 'max' }, party: PARTY, problem: 'far' }, null, 48000),
    go({ cfg: { riftDepthMode: 'fixed', riftDepth: 5 }, party: [{ name: 'Leader', level: 6 }] }, (W) => W.sent.enter.length >= 1, 40000),
  ]);
  check('A', WA.sent.enter[0] === 5, 'tiefste freigeschaltete Tiefe (5), Level egal', () => `erste Tiefe ${WA.sent.enter[0]} (betreten ${WA.sent.enter.join(',')})`);
  check('C', WA.sent.enter.length >= 6 && !WA.sent.refused.length && WA.sent.enter.every((d) => d === 5), 'mehrere stabile Läufe – immer Tiefe 5, nichts abgelehnt', () => `betreten ${WA.sent.enter.join(',')}, abgelehnt ${WA.sent.refused.join(',') || '–'}`);
  const bl = WB.logLines().filter((l) => /Level zu niedrig/.test(l));
  check('B', bl.length >= 1 && /Tiefe 4/.test(bl[0]), 'Partner-Level-Problem – nach Zeitlimit eine Tiefe weniger', () => `Log ${bl.join(' | ') || '–'}, Status ${WB.status()}`);
  const dl = WD.logLines().filter((l) => /zu weit weg/.test(l));
  check('D', dl.length === 1, 'Partner zu weit weg – nach Zeitlimit genau eine Warnung', () => `${dl.length}× im Log, Status ${WD.status()}`);
  check('E', WE.sent.enter[0] === 5, 'feste Tiefe 5 mit Partner Lv 6: betritt sie', () => `betreten ${WE.sent.enter.join(',') || '–'}, Status ${WE.status()}`);
  WA.w.close(); WB.w.close(); WD.w.close(); WE.w.close();
  process.exit(res.every(Boolean) ? 0 : 1);
})();
