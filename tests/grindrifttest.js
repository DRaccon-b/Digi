// 3.2.52 (Nutzer 22.11.: „Nur Rift-Leveln“): Grinden levelt im Digital Rift, immer in der passenden EXP-Tiefe (1–5).
// Spielwelt wie b3236_rifttiefetest (Clockmon in Primary Village, riftEnter, Kurzlauf, Ergebnis), dazu Ergebnis mit exp.
// A: Grinden, grindRift an, Lv 60, freigeschaltet bis 5 -> Tiefe 2.   B: Lv 90 -> 4, Lv 110 -> 5, Lv 30 -> 1.
// C: freigeschaltet bis 2, Lv 90 -> 2.   D: Ergebnis exp {partner 48300} in 7:12 -> Logzeile „Rift-EXP … 48 300 … /min“.
// E: Level 66 -> 67 nach dem ersten Betreten -> zweiter Lauf Tiefe 3 (Wechsel nur zwischen Läufen).
// F: Lv 130 (keine passende Tiefe) -> kein Rift, Logzeile, normales Grinden (Bot läuft weiter).
// G: grindRift aus -> kein Rift.   H: EXP-Ergebnis ohne stable -> nächster Lauf gleiche Tiefe (nicht gesenkt).
// I: feste Tiefe 3 bei Lv 30 -> 3.   J: Dungeon-Modus Rift („höchstmöglich“) unverändert -> Tiefe 5.
// Review 3.2.52:
// R: Lv 135, Rückfall „keine passende“, dann Regler „fest Tiefe 5“ -> betritt gleich Tiefe 5 (nicht erst nach Level-Up).
// N: Bot aus, Lv 135 -> keine Rückfall-Logzeile (Panel rechnet nur).   S: Status nach EXP-Läufen „geschafft“ statt „0 stabil“.
// Gruppe (je ein eigener Prozess, Bus): K: Mitläufer im Rift, Leader verstummt -> spielt den Lauf zu Ende und geht hinaus.
//   K2: Leader meldet mitten im Lauf riftGrind=false -> Mitläufer bleibt bis zum Verlassen im Grind-Modus, danach Autopilot
//   mit Logzeile „grindet nicht mehr im Rift“.   P: Leader Lv 135, Mitläufer Lv 60 -> Gruppe levelt im Rift (Tiefe 2).
const { JSDOM, VirtualConsole } = require('jsdom');
const { BroadcastChannel } = require('worker_threads');
const { spawn } = require('child_process');
const fs = require('fs');
const scriptPath = process.argv[2], part = process.argv[3];
const script = fs.readFileSync(scriptPath, 'utf8');

function world({ cfg, deepest = 5, lv = 60, onEnter = null, slot = null, accounts = null, party = [] }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: `https://play.digimmo.com.br/${slot != null ? `#dbslot=${slot}` : ''}`, pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  if (accounts) w.BroadcastChannel = BroadcastChannel;
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
  // Server-View wie im Spiel: depths[] mit pays 'exp' für 1–5 (Level der ersten Etage), party mit dem aktuellen Partner-Level
  const T1 = [41, 65, 75, 99, 120];
  const view = () => ({ deepest, party: [{ name: 'Ich', level: state.me.partner.level, problem: '', leader: !slot }, ...party.map((L, i) => ({ name: 'M' + i, level: L, problem: '', leader: false }))], iLead: !slot, blocked: null,
    depths: Array.from({ length: Math.max(deepest, 6) }, (_, i) => ({ depth: i + 1, level: T1[i] ?? 130, open: i + 1 <= deepest, pays: i < 5 ? 'exp' : 'rift' })) });
  const setLv = (L) => store.setState({ me: { ...state.me, partner: { ...state.me.partner, level: L } } });
  const commands = {
    talk(npc) { if (npc === 'rift_warden' && mapId === PV && near(808, 792, 60)) store.setState({ dialog: { npc, node: { id: 'root', choices: [{ id: 'open', action: 'openRift' }, { id: 'bye' }] } } }); },
    chooseDialog(c) { if (c === 'open' && state.dialog?.npc === 'rift_warden') { store.setState({ dialog: null }); rs = { ...rs, warden: { npc: 'rift_warden' }, view: view() }; } },
    closeDialog() { store.setState({ dialog: null }); },
    command(name, args) {
      if (name === 'riftEnter') {
        sent.enter.push(args.depth);
        if (args.depth > deepest) { sent.refused.push(args.depth); store.setState({ chat: [...(state.chat || []), { kind: 'system', code: 'rift_depth_locked', ts: Date.now() }] }); return; }
        if (onEnter) onEnter(sent.enter.length, setLv);
        rs = { ...rs, warden: null, view: null };
        store.setState({ screen: 'loading' });
        setTimeout(() => {
          rs = { ...rs, run: { depth: args.depth, running: true, signal: 0, clockMs: 600000, floor: { n: 1, of: 3 }, portal: { x: 400, y: 500, open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] } };
          loadMap(RS, { x: 200, y: 200 });
          // EXP-Tiefe: Ergebnis wie die Demo des Spiels (riftexpresult) – exp, ohne stable; sonst stabil wie bisher
          const res = args.depth <= 5 ? { depth: args.depth, timeMs: 432000, exp: { partner: 48300, tamer: 7245 }, loot: { bits: 900 } } : { stable: true, depth: args.depth, timeMs: 200000, loot: {} };
          setTimeout(() => { rs = { ...rs, run: null, result: res }; }, 300);
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
      partner: { entityId: 'p:me', name: 'Piemon', species: 'piedmon_dm', level: lv, hp: 30000, maxHp: 30000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
  loadMap(PV, { x: 808, y: 900 });
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: false, autopilot: false, farm: false, hunt: false, wboss: false, hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3, tab: 'log', ...cfg }));
  if (accounts) w.localStorage.setItem('digibot.accounts', JSON.stringify(accounts));
  w.eval(script);
  const logLines = () => [...w.document.querySelectorAll('.digibot__log div')].map((d) => d.textContent);
  // Lauf von außen (der Leader hat betreten): Mitläufer in den Rift setzen bzw. das Ergebnis melden
  const enterRun = (depth) => { rs = { ...rs, warden: null, view: null, run: { depth, running: true, signal: 0, clockMs: 600000, floor: { n: 1, of: 3 }, portal: { x: 400, y: 500, open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] } }; loadMap(RS, { x: 200, y: 200 }); };
  const endRun = (r) => { rs = { ...rs, run: null, result: r }; };
  return { w, sent, status: () => w.document.querySelector('[data-f="status"]')?.textContent || '', logLines, enterRun, endRun, mapNow: () => mapId };
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
const enters = (n) => (W) => W.sent.enter.length >= n;
const fmt = (W) => `betreten ${W.sent.enter.join(',') || '–'}, Status ${W.status()}`;
const ACC = { leader: 0, popup: true, mirror: false, spread: false, dungeon: false, list: [{ on: true, user: 'u0', char: 'Char0' }, { on: true, user: 'u1', char: 'Char1' }] };
// nachgebauter Gruppen-Partner (Kanal wie der Bot): schickt alle 500 ms seine Meldung, solange st() etwas liefert
function fakePeer(slot, st) {
  const bus = require('./groupbus')('digibot-group', 0);
  const t = setInterval(() => { const m = st(); if (m) bus.postMessage({ type: 'state', slot, inWorld: true, ents: ['t:x' + slot], channel: 1, quests: {}, ...m }); }, 500);
  return { bus, stop: () => { clearInterval(t); bus.close(); } };
}
const leadMsg = (o) => ({ role: 'leader', bot: true, mode: 'grind', riftGrind: true, mapId: 'primary_village', x: 808, y: 820, lvl: 60, ...o });
const PARTS = {
  async K() { // Mitläufer im Rift, Leader verstummt -> Lauf zu Ende spielen und hinaus
    let L = leadMsg({});
    const peer = fakePeer(0, () => L);
    await wait(700);
    const F = world({ cfg: {}, lv: 60, slot: 1, accounts: ACC });
    await wait(1500);
    peer.bus.postMessage({ type: 'start', slot: 0, manual: true });
    await wait(2500);
    const rg0 = F.logLines().some((l) => /Gruppe: Start/.test(l));
    L = leadMsg({ mapId: 'rift_sector', x: 200, y: 200 }); F.enterRun(2);
    await wait(2500);
    L = null; // Leader verstummt (Fenster zu / Bot hängt)
    await wait(7500); // länger als GROUP_STALE_MS
    F.endRun({ depth: 2, timeMs: 432000, exp: { partner: 48300 }, loot: {} });
    const t0 = Date.now(); while (Date.now() - t0 < 15000 && !F.sent.leave) await wait(200);
    check('K', rg0 && F.sent.leave >= 1, 'Mitläufer ohne frischen Leader spielt den Rift-Lauf zu Ende und geht hinaus', () => `gestartet ${rg0}, raidLeave ${F.sent.leave}, Map ${F.mapNow()}, Status ${F.status()}, Log ${F.logLines().slice(-5).join(' | ')}`);
    peer.stop(); F.w.close();
  },
  async K2() { // Leader grindet nicht mehr im Rift, Mitläufer noch im Lauf -> bleibt bis zum Verlassen, dann Autopilot
    let L = leadMsg({});
    const peer = fakePeer(0, () => L);
    await wait(700);
    const F = world({ cfg: {}, lv: 60, slot: 1, accounts: ACC });
    await wait(1500);
    peer.bus.postMessage({ type: 'start', slot: 0, manual: true });
    await wait(2500);
    L = leadMsg({ mapId: 'rift_sector', x: 200, y: 200 }); F.enterRun(2);
    await wait(2000);
    L = leadMsg({ riftGrind: false }); // Leader schon draußen, Rückfall aufs Feld-Grinden
    await wait(2000);
    const early = F.logLines().filter((l) => /folge wieder/.test(l)).length;
    F.endRun({ depth: 2, timeMs: 432000, exp: { partner: 48300 }, loot: {} });
    let t0 = Date.now(); while (Date.now() - t0 < 15000 && !F.sent.leave) await wait(200);
    t0 = Date.now(); while (Date.now() - t0 < 8000 && !F.logLines().some((l) => /folge wieder/.test(l))) await wait(200);
    const fl = F.logLines().filter((l) => /folge wieder/.test(l));
    check('K2', !early && F.sent.leave >= 1 && fl.length === 1 && /grindet nicht mehr im Rift/.test(fl[0]), 'Mitläufer bleibt bis zum Verlassen im Rift-Grinden, dann Autopilot („grindet nicht mehr im Rift“)',
      () => `vorher ${early}× „folge wieder“, raidLeave ${F.sent.leave}, Log ${fl.join(' | ') || '–'}, Status ${F.status()}`);
    peer.stop(); F.w.close();
  },
  async P() { // Leader Lv 135, Mitläufer Lv 60: es zählt das niedrigste Level -> Rift (Tiefe 2)
    const peer = fakePeer(1, () => ({ role: 'follower', bot: true, mode: 'grind', mapId: 'primary_village', x: 820, y: 820, lvl: 60 }));
    await wait(700);
    const W = await go({ cfg: {}, lv: 135, slot: 0, accounts: ACC, party: [60] }, enters(1), 30000);
    check('P', W.sent.enter[0] === 2 && !W.logLines().some((l) => /keine passende/.test(l)), 'Leader Lv 135 mit Mitläufer Lv 60: Gruppe levelt im Rift (Tiefe 2)', () => `${fmt(W)}, Log ${W.logLines().filter((l) => /Rift/.test(l)).slice(-4).join(' | ')}`);
    peer.stop(); W.w.close();
  },
};
(async () => {
  if (part) { await PARTS[part](); process.exit(res.every(Boolean) ? 0 : 1); }
  const [WA, W90, W110, W30, WC, WE] = await Promise.all([
    go({ cfg: {}, lv: 60 }, enters(2), 60000),
    go({ cfg: {}, lv: 90 }, enters(1), 30000),
    go({ cfg: {}, lv: 110 }, enters(1), 30000),
    go({ cfg: {}, lv: 30 }, enters(1), 30000),
    go({ cfg: {}, lv: 90, deepest: 2 }, enters(1), 30000),
    go({ cfg: {}, lv: 66, onEnter: (n, setLv) => { if (n === 1) setLv(67); } }, enters(2), 60000),
  ]);
  check('A', WA.sent.enter[0] === 2, 'Grinden mit Lv 60 betritt Tiefe 2', () => fmt(WA));
  check('B-90', W90.sent.enter[0] === 4, 'Lv 90 -> Tiefe 4', () => fmt(W90));
  check('B-110', W110.sent.enter[0] === 5, 'Lv 110 -> Tiefe 5', () => fmt(W110));
  check('B-30', W30.sent.enter[0] === 1, 'Lv 30 -> Tiefe 1', () => fmt(W30));
  check('C', WC.sent.enter[0] === 2 && !WC.sent.refused.length, 'nur freigeschaltete: bis 2 und Lv 90 -> Tiefe 2', () => fmt(WC));
  const xl = WA.logLines().filter((l) => /Rift-EXP/.test(l));
  check('D', xl.length >= 1 && /48 300/.test(xl[0]) && /7:12/.test(xl[0]) && /6 708\/min/.test(xl[0]), 'Logzeile Rift-EXP mit 48 300 in 7:12 (6 708/min)', () => `Log ${xl.join(' | ') || '–'}`);
  check('E', WE.sent.enter[0] === 2 && WE.sent.enter[1] === 3, 'Level 66 -> 67 zwischen den Läufen: erst Tiefe 2, dann 3', () => fmt(WE));
  check('H', WA.sent.enter[1] === 2 && !WA.logLines().some((l) => /nicht stabil|höchstens Tiefe/.test(l)), 'EXP-Ergebnis ohne stable: nächster Lauf wieder Tiefe 2', () => `${fmt(WA)}, Log ${WA.logLines().filter((l) => /Rift/.test(l)).slice(-4).join(' | ')}`);
  [WA, W90, W110, W30, WC, WE].forEach((W) => W.w.close());
  const [WF, WG, WI, WJ] = await Promise.all([
    go({ cfg: {}, lv: 130 }, null, 15000),
    go({ cfg: { grindRift: false }, lv: 60 }, null, 15000),
    go({ cfg: { grindRiftDepth: 3 }, lv: 30 }, enters(1), 30000),
    go({ cfg: { dungeon: true, dgMode: 'rift', riftDepthMode: 'max' }, lv: 60 }, enters(1), 30000),
  ]);
  const fl = WF.logLines().filter((l) => /keine passende/.test(l));
  check('F', !WF.sent.enter.length && fl.length === 1 && /Kein passendes Monster/.test(WF.status()), 'Lv 130: kein Rift, eine Logzeile, normales Grinden läuft weiter', () => `${fmt(WF)}, Log ${fl.join(' | ') || '–'}`);
  check('G', !WG.sent.enter.length && /Kein passendes Monster/.test(WG.status()), 'grindRift aus: kein Rift im Grind-Modus', () => fmt(WG));
  check('I', WI.sent.enter[0] === 3, 'feste Tiefe 3 bei Lv 30 -> Tiefe 3', () => fmt(WI));
  check('J', WJ.sent.enter[0] === 5, 'Dungeon-Modus Rift „höchstmöglich“ unverändert: Tiefe 5', () => fmt(WJ));
  [WF, WG, WI, WJ].forEach((W) => W.w.close());
  // R: Rückfall bei Lv 135, dann Regler auf feste Tiefe 5 -> gleich wieder Rift.   N: Bot aus (Reiter Übersicht) -> keine Rückfall-Logzeile
  // S: Übersicht nach einem EXP-Lauf: „(1 geschafft)“, nicht „(0 stabil)“
  const WN = world({ cfg: { tab: 'data' }, lv: 135 });
  const lage = (W) => W.w.document.querySelector('[data-f="lage"]')?.textContent || '';
  const sLab = [];
  const [WR, WS] = await Promise.all([
    go({ cfg: {}, lv: 135 }, (W) => W.logLines().some((l) => /keine passende/.test(l)), 15000),
    go({ cfg: { tab: 'data' }, lv: 60 }, (W) => { const m = lage(W).match(/Läufe \([^)]*\)/); if (m) sLab.push(m[0]); return W.sent.enter.length >= 2; }, 60000),
  ]);
  const sl = WR.w.document.querySelector('[data-cfg="grindRiftDepth"]');
  if (sl) { sl.value = '5'; sl.dispatchEvent(new WR.w.Event('input', { bubbles: true })); sl.dispatchEvent(new WR.w.Event('change', { bubbles: true })); }
  { const t0 = Date.now(); while (Date.now() - t0 < 20000 && !WR.sent.enter.length) await wait(200); }
  check('R', !!sl && WR.sent.enter[0] === 5, 'Regler „fest Tiefe 5“ hebt den Rückfall auf: Tiefe 5', () => `Regler ${!!sl}, ${fmt(WR)}`);
  check('S', sLab.some((x) => /1 geschafft/.test(x)) && !sLab.some((x) => /stabil/.test(x)), 'Übersicht beim Rift-Grinden: „1 geschafft“ statt „0 stabil“', () => `Labels ${[...new Set(sLab)].join(' | ') || '–'}`);
  WN.w.document.querySelector('[data-tab="log"]')?.click();
  await wait(800);
  const nl = WN.logLines().filter((l) => /Rift-Grinden/.test(l));
  check('N', !nl.length && !WN.sent.enter.length, 'Bot aus: keine Rift-Grinden-Logzeile', () => `Log ${nl.join(' | ')}`);
  [WN, WR, WS].forEach((W) => W.w.close());
  // Gruppe: je Teil ein eigener Prozess (Bus und Timer sickern sonst durch)
  for (const p of Object.keys(PARTS)) {
    const out = await new Promise((resolve) => { const c = spawn(process.execPath, [__filename, scriptPath, p], { cwd: __dirname }); let o = ''; c.stdout.on('data', (x) => { o += x; }); c.stderr.on('data', (x) => { o += x; }); c.on('close', (code) => resolve({ o, code })); });
    process.stdout.write(out.o);
    res.push(out.code === 0);
  }
  process.exit(res.every(Boolean) ? 0 : 1);
})();
