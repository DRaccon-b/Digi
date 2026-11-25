// 3.2.57 (Nutzer 24.11.): „wenn er im Rift drei Mal stirbt, den Rift verlassen, draußen wieder bis zum Ende digitieren und dann
// ein neues Rift starten“. Im Spiel: Ohnmacht im Rift (riftfaint) -> Prompt „fainted“ (canReviveAt sofort) -> revive -> zurück
// zum Landepunkt des Laufs, Partner in der Grundform.
// A: 1. und 2. Ohnmacht -> bleibt im Rift (kein raidLeave).
// B: 3. Ohnmacht -> nach dem Wiederbeleben raidLeave. B2 (Review): auch wenn am Landepunkt ein Gegner angreift – nicht erst
//    in der Grundform weiterkämpfen.
// C: draußen digitiert er bis zur höchsten Form (Veemon -> … -> Imperialdramon), erst danach riftEnter für den neuen Lauf.
// D: im neuen Lauf zählt er wieder von vorn – eine Ohnmacht dort führt nicht zum Verlassen.
// F (Nutzer 25.11., live T25: nach der Ohnmacht als XV-mon weitergekämpft und 10 s später wieder umgefallen): nach einer Ohnmacht
//    im Rift am Landepunkt erst bis zur Zielform digitieren (Abklingzeit je Schritt), nur Angreifer abwehren – dann weiter.
// G (Review): Zielform gesperrt – kein Fortschritt möglich -> nicht 90 s am Landepunkt stehen, gleich weiter.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PV = 'primary_village', RS = 'rift_sector';
const EVOS = [
  { species: 'veemon', stage: 'rookie', from: null },
  { species: 'exveemon', stage: 'champion', from: 'veemon' },
  { species: 'paildramon', stage: 'ultimate', from: 'exveemon' },
  { species: 'imperialdramon_dragon', stage: 'mega', from: 'paildramon' },
].map((e) => ({ ...e, level: 1, unlocked: true, canEvolveNow: true, dsCost: 10 }));
const MAX = 'imperialdramon_dragon';

function world({ faintsRun1 = 3, faintsRun2 = 1, evoCd = 0, calm = false, cfgExtra = {}, evos = EVOS } = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
  const P = (k, v) => ({ name: k, type: 'string', value: v });
  const MAPS = {
    [PV]: tmj([{ type: 'npc', name: 'rift_warden', x: 808, y: 792, properties: [P('npcId', 'rift_warden')] }, { type: 'spawn', name: 'from_rift', x: 808, y: 824 }]),
    [RS]: tmj([{ type: 'spawn', name: 'camp', x: 584, y: 904 }]),
  };
  const content = {
    digimon: Object.fromEntries([...EVOS.map((e) => [e.species, { name: e.species }]), ['bearmon_rift', { name: 'Bearmon' }]]),
    items: {}, npcs: { rift_warden: { name: 'Clockmon, Rift Warden' } }, quests: {}, dailyById: {},
    maps: { [PV]: { id: PV, name: 'Primary Village', safe: true }, [RS]: { id: RS, name: 'Digital Rift', levelRange: [130, 130] } },
    spawns: { [PV]: { zones: {} }, [RS]: { zones: {}, raid: { id: 'rift', gate: { mapId: PV, portal: 'rift' }, party: { min: 1, max: 5, minLevel: 1 }, deathLimit: 1000, landing: 'camp', rift: true } } },
  };
  const log = [], L = (s) => { log.push(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`); if (process.env.V) console.log('   * ' + s); };
  const t0 = Date.now();
  const sent = { enter: [], leave: [], evolve: [], revive: 0, faints: [], sel: [] };
  let state = {}; const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  let rs = { warden: null, view: null, run: null, patch: null, result: null, floorUi: { going: null } };
  const rift = { getState: () => ({ ...rs, set: (p) => { rs = { ...rs, ...p }; } }), setState: (p) => { rs = { ...rs, ...p }; } };
  const ents = new Map();
  let mapId = PV, runs = 0, faintsLeft = 0;
  const scene = {
    deps: { content, commands: null, assetsBase: '/assets/', manifest: { maps: Object.fromEntries(Object.keys(MAPS).map((m) => [m, { tmj: `maps/${m}.tmj` }])) } },
    map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) }, portals: [], spawns: {}, zones: {} },
    controlledId: () => 't:me',
    tapGround: (x, y) => { goal = { x, y }; },
    select: (id) => { sent.sel.push({ id, sp: state.me.partner.species, t: Date.now() - t0 }); const e = ents.get(id); store.setState({ target: e ? { id, kind: 'mob', name: 'Bearmon', level: e.level, hp: e.hp, maxHp: e.maxHp } : null }); },
    telegraphs: { active: [], mirrors: [] }, mechB: { lines: [] }, riftFog: null,
  };
  const partner = (p) => store.setState({ me: { ...state.me, partner: { ...state.me.partner, ...p } } });
  function faintSoon() {
    if (faintsLeft <= 0) return;
    setTimeout(() => {
      if (mapId !== RS || state.me.partner.fainted) return;
      faintsLeft--; sent.faints.push(runs); L(`Ohnmacht (Lauf ${runs})`);
      partner({ fainted: true, hp: 0, species: 'veemon', name: 'Veemon' });
      store.setState({ prompt: { kind: 'fainted', canReviveAt: Date.now() } });
    }, 1200);
  }
  function loadMap(id, sp) {
    mapId = id;
    if (id !== RS) for (const k of [...ents.keys()]) if (k !== 't:me' && k !== 'p:me') ents.delete(k);
    const t = ents.get('t:me'), p = ents.get('p:me');
    t.x = sp.x; t.y = sp.y; p.x = sp.x + 10; p.y = sp.y;
    if (id !== RS) scene.riftFog = null;
    store.setState({ screen: 'world', world: { mapId: id, mapName: content.maps[id].name, channel: 1, roomId: `${id}-1` }, target: null, dialog: null });
    L(`Map ${id}`);
  }
  ents.set('t:me', { id: 't:me', kind: 0, x: 808, y: 900, hp: 1, flags: 0, targetId: '' });
  ents.set('p:me', { id: 'p:me', kind: 1, x: 818, y: 900, hp: 1, flags: 0, targetId: '' });
  let goal = null;
  setInterval(() => {
    const t = ents.get('t:me');
    if (!goal || state.screen !== 'world') return;
    const dx = goal.x - t.x, dy = goal.y - t.y, d = Math.hypot(dx, dy);
    if (d <= 25) { t.x = goal.x; t.y = goal.y; goal = null; } else { t.x += (dx / d) * 25; t.y += (dy / d) * 25; }
    const p = ents.get('p:me'); p.x = t.x + 10; p.y = t.y;
  }, 50);
  const near = (x, y, r) => { const t = ents.get('t:me'); return Math.hypot(t.x - x, t.y - y) <= r; };
  const commands = {
    talk(npc) { if (npc === 'rift_warden' && mapId === PV && near(808, 792, 60)) store.setState({ dialog: { npc, node: { id: 'root', choices: [{ id: 'open', action: 'openRift' }, { id: 'bye' }] } } }); },
    chooseDialog(c) {
      if (c === 'open' && state.dialog?.npc === 'rift_warden') { store.setState({ dialog: null }); rs = { ...rs, warden: { npc: 'rift_warden' }, view: { deepest: 5, party: [{ name: 'me', level: 110, problem: '', leader: true }], iLead: true, blocked: null, depths: [] } }; }
    },
    closeDialog() { store.setState({ dialog: null }); },
    evolve(sp) {
      sent.evolve.push({ sp, map: mapId, t: Date.now() - t0 }); L(`evolve ${sp}`);
      partner({ evolving: true });
      if (evoCd) store.setState({ cooldowns: { ...(state.cooldowns || {}), evolve: { end: w.performance.now() + evoCd } } }); // Abklingzeit je Schritt (live ~10 s)
      setTimeout(() => partner({ evolving: false, species: sp, name: sp }), 300);
    },
    revive() {
      sent.revive++; L('revive');
      store.setState({ prompt: null });
      partner({ fainted: false, hp: 30000 });
      if (mapId === RS) {
        loadMap(RS, { x: 200, y: 200 }); faintSoon();
        // F: nach der Ohnmacht steht ein ruhiger Gegner (greift nicht an) am Landepunkt
        if (calm && !ents.has('n:1')) { sent.calmAt = Date.now() - t0; ents.set('n:1', { id: 'n:1', kind: 2, defId: 'bearmon_rift', level: 57, x: 240, y: 230, hp: 400, maxHp: 400, flags: 0, targetId: '' }); }
        // B2: nach der 3. Ohnmacht greift am Landepunkt ein Gegner an (stirbt hier nie) – trotzdem sofort hinaus
        if (runs === 1 && sent.revive === 3) { sent.rev3 = Date.now() - t0; ents.set('a:1', { id: 'a:1', kind: 2, defId: 'bearmon_rift', level: 57, x: 230, y: 210, hp: 400, maxHp: 400, flags: 32, targetId: 'p:me' }); }
      }
    },
    command(name, args) {
      if (name === 'riftEnter') {
        sent.enter.push({ depth: args.depth, species: state.me.partner.species, t: Date.now() - t0 }); L(`riftEnter Tiefe ${args.depth} als ${state.me.partner.species}`);
        runs++; faintsLeft = runs === 1 ? faintsRun1 : faintsRun2;
        store.setState({ screen: 'loading' });
        setTimeout(() => {
          scene.riftFog = { rift: { layout: { cells: [{ id: 'c0', role: 'camp', rect: { x: 100, y: 100, w: 200, h: 200 } }], guardian: { x: 800, y: 500 } } } };
          rs = { ...rs, warden: null, view: null, result: null, floorUi: { going: null }, run: { depth: args.depth, running: true, signal: 0, clockMs: 600000, floor: { n: 1, of: 3 }, portal: { x: 400, y: 500, open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] } };
          loadMap(RS, { x: 200, y: 200 }); faintSoon();
        }, 300);
      } else if (name === 'raidLeave') commands.raidLeave();
    },
    raidLeave() { sent.leave.push({ run: runs, t: Date.now() - t0 }); L('raidLeave'); rs = { ...rs, result: null, run: null }; store.setState({ screen: 'loading' }); setTimeout(() => loadMap(PV, { x: 808, y: 824 }), 300); },
    requestBossPins() {}, requestMapInfo() {}, partnerFollow() {}, partnerStop() {},
    async requestEvents() { return []; },
  };
  scene.deps.commands = commands;
  w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
  w.dmo = { store, rift, net: { state: { entities: ents }, connected: true, transferring: false }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
  store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, chat: [], world: { mapId: PV, channel: 1, roomId: `${PV}-1` }, target: null, prompt: null,
    me: { tamerEntityId: 't:me', tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests: {}, bits: 5000,
      partner: { entityId: 'p:me', name: MAX, species: MAX, level: 110, hp: 30000, maxHp: 30000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [], evolutions: evos } } });
  loadMap(PV, { x: 808, y: 900 });
  // ohne eingestellte Zielform: im Rift digitiert der Bot nicht nach – „bis zum Ende“ heißt dann die höchste Form
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'rift', riftDepthMode: 'fixed', riftDepth: 2, hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3, tab: 'log', ...cfgExtra }));
  w.eval(script);
  const $ = (s) => w.document.querySelector(s);
  return { w, sent, log, start: () => { $('[data-act="bot"]').click(); }, status: () => $('[data-f="status"]')?.textContent || '', get runs() { return runs; } };
}

(async () => {
  const res = [];
  const ck = (id, ok, txt, X) => { res.push(ok); console.log(`${ok ? 'OK    ' : 'FEHLER'} ${id}: ${txt}`); if (!ok && X) console.log('   ' + JSON.stringify({ enter: X.sent.enter, leave: X.sent.leave, evolve: X.sent.evolve.map((e) => `${e.sp}@${e.map}`), faints: X.sent.faints, status: X.status() }) + '\n   ' + X.log.slice(-20).join('\n   ')); };
  const X = world();
  const Y = world({ faintsRun1: 1, faintsRun2: 0, evoCd: 2500, calm: true });
  // G: eingestellte Zielform Paildramon ist gesperrt -> Digitieren geht nicht weiter: nicht 90 s warten, gleich weiterkämpfen
  const Z = world({ faintsRun1: 1, faintsRun2: 0, calm: true, cfgExtra: { levelEvoForm: 'paildramon' }, evos: EVOS.map((e) => (e.species === 'paildramon' ? { ...e, unlocked: false, canEvolveNow: false } : e)) });
  await wait(800);
  X.start(); Y.start(); Z.start();
  // bis zum zweiten Lauf plus dessen Ohnmacht (oder Zeitlimit)
  const end = Date.now() + 60000;
  let afterTwo = null;
  while (Date.now() < end) {
    if (!afterTwo && X.sent.faints.length >= 2) { afterTwo = Date.now(); }
    if (X.sent.enter.length >= 2 && X.sent.faints.filter((r) => r === 2).length >= 1 && X.sent.revive >= 4) { await wait(4000); break; }
    await wait(200);
  }
  const leave1 = X.sent.leave.filter((l) => l.run === 1);
  const thirdFaintIdx = 2;
  ck('A', X.sent.faints.length >= 2 && !(X.sent.leave.length && X.sent.revive < 3), '1. und 2. Ohnmacht: bleibt im Rift', X);
  ck('B', leave1.length >= 1 && X.sent.revive >= 3, '3. Ohnmacht: verlässt den Rift', X);
  ck('B2', leave1.length >= 1 && X.sent.rev3 != null && leave1[0].t - X.sent.rev3 < 3000, 'auch wenn am Landepunkt ein Gegner angreift: sofort hinaus (Review)', X);
  const e2 = X.sent.enter[1];
  const outEvo = X.sent.evolve.filter((e) => e.map === PV).map((e) => e.sp);
  ck('C', !!e2 && e2.species === MAX && outEvo.join(',') === 'exveemon,paildramon,imperialdramon_dragon', 'draußen bis zur höchsten Form digitiert, erst dann neuer Lauf', X);
  ck('D', X.sent.enter.length >= 2 && X.sent.leave.filter((l) => l.run === 2).length === 0, 'neuer Lauf zählt von vorn (1 Ohnmacht -> bleibt)', X);
  void thirdFaintIdx;
  // F: nach einer Ohnmacht im Rift erst bis zur Zielform digitieren (Abklingzeit je Schritt), den ruhigen Gegner erst danach angreifen
  const yMax = Y.sent.evolve.find((e) => e.sp === MAX && e.map === RS);
  const ySel = Y.sent.sel.filter((x) => x.id === 'n:1');
  ck('F', Y.sent.faints.length === 1 && !!yMax && ySel.length > 0 && ySel.every((x) => x.sp === MAX), 'nach Ohnmacht erst fertig digitieren, dann weiterkämpfen', { ...Y, sent: { ...Y.sent, enter: Y.sent.enter, leave: Y.sent.leave, evolve: Y.sent.evolve, faints: Y.sent.faints, sel: ySel.slice(0, 4) } });
  const zSel = Z.sent.sel.find((x) => x.id === 'n:1');
  ck('G', Z.sent.faints.length === 1 && Z.sent.calmAt != null && !!zSel && zSel.t - Z.sent.calmAt < 15000, 'Zielform nicht erreichbar: nach der Ohnmacht nicht 90 s warten (Review)', Z);
  console.log(res.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(res.every(Boolean) ? 0 : 1);
})();
