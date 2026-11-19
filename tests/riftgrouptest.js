// 3.2.32 (Nutzer 18.11.): Digital Rift in der Gruppe mit Rollen – Tank, DD, Heiler (manuell im Reiter Gruppe).
// Mitläufer folgen im Rift dem Leader (öffnen/erkunden nicht selbst), der Leader sagt das Ziel an, der Tank greift zuerst an,
// alle anderen erst, wenn das Ziel den Tank angreift (Sicherheitsnetz 4 s). Wer selbst angegriffen wird, wehrt sich sofort.
// Teile (je ein eigener Prozess, damit Bus und Timer nicht durchsickern):
//  ui     G-U: Rollenwahl auf der Gruppenkarte, höchstens ein Tank, Wert bleibt nach Neuzeichnen.
//  follow G-O: Mitläufer öffnet keinen eigenen Rift · G-F: folgt dem Leader im Rift, steigt nicht selbst ab.
//  tank   G-T1: Tank greift zuerst an · G-T2: Leader (DD) und Heiler erst, wenn das Ziel den Tank angreift.
//  never  G-N: Ziel greift den Tank nie an -> nach ~4 s greifen alle an.
//  self   G-S: Gegner greift den Leader direkt an -> der wehrt sich sofort.
//  gone   G-T: Tank-Fenster weg -> keine Sperre mehr.
//  notank G-0: ohne Tank greift der Leader wie bisher sofort an.
//  heal   G-H: Heiler steht während der Sperre ~90 px hinter dem Tank (vom Ziel abgewandt).
const { JSDOM, VirtualConsole } = require('jsdom');
const { BroadcastChannel } = require('worker_threads');
const { spawn } = require('child_process');
const fs = require('fs');
const scriptPath = process.argv[2];
const script = fs.readFileSync(scriptPath, 'utf8');
const part = process.argv[3];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PV = 'primary_village', RS = 'rift_sector';
const CELLS = [{ id: 'c0_1', role: 'camp', rect: { x: 100, y: 100, w: 200, h: 200 } }, { id: 'c1_1', role: 'main', rect: { x: 700, y: 100, w: 200, h: 200 } },
  { id: 'c1_2', role: 'branch', rect: { x: 700, y: 700, w: 200, h: 200 } }, { id: 'c0_2', role: 'deadend:pond', rect: { x: 100, y: 700, w: 200, h: 200 } }];

// Gemeinsame Rift-Welt für n Bot-Fenster (Slot 0 = Leader). fights: Kampfrolle je Slot. mobs(floor): Gegner der Etage.
function groupWorld({ fights, mobs = () => [], aggro = 'first', cfg = {} }) {
  const n = fights.length;
  const G = { rs: { run: null, patch: null, result: null, floorUi: { going: null } }, floor: 0, mapOf: [], mobs: new Map(), hidden: new Map(), players: new Map(), wins: [] };
  const accounts = { leader: 0, popup: true, mirror: false, spread: false, dungeon: true, list: fights.map((f, i) => ({ on: true, user: 'u' + i, char: 'Char' + i, fight: f })) };
  const party = { id: 'P', members: fights.map((_, i) => ({ charId: 'c' + i, name: 'Char' + i, partnerEntityId: 'p:' + i })) };
  const content = {
    digimon: { bearmon_rift: { name: 'Bearmon' } }, items: {}, npcs: { rift_warden: { name: 'Clockmon, Rift Warden' } }, quests: {}, dailyById: {},
    maps: { [PV]: { id: PV, name: 'Primary Village', safe: true }, [RS]: { id: RS, name: 'Digital Rift', levelRange: [130, 130] } },
    spawns: { [PV]: { zones: {} }, [RS]: { zones: {}, raid: { id: 'rift', gate: { mapId: PV, portal: 'rift' }, party: { min: 1, max: 5, minLevel: 1 }, deathLimit: 1000, landing: 'camp', rift: true } } },
  };
  const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
  const P = (k, v) => ({ name: k, type: 'string', value: v });
  const MAPS = {
    [PV]: tmj([{ type: 'npc', name: 'rift_warden', x: 808, y: 792, properties: [P('npcId', 'rift_warden')] }, { type: 'spawn', name: 'from_rift', x: 808, y: 824 }]),
    [RS]: tmj([{ type: 'spawn', name: 'camp', x: 584, y: 904 }]),
  };
  const ev = []; // Zeitleiste: {t, slot, what, id}
  const E = (slot, what, id) => { ev.push({ t: Date.now(), slot, what, id }); if (process.env.V) console.log(`   * [${slot}] ${what} ${id || ''}`); };
  function floorStart(k) {
    G.floor = k; G.mobs.clear(); G.hidden.clear();
    for (const m of mobs(k)) (m.hidden ? G.hidden : G.mobs).set(m.id, { kind: 2, defId: 'bearmon_rift', level: 57, hp: 600, maxHp: 600, flags: 32, targetId: '', ...m });
    G.rs = { ...G.rs, result: null, floorUi: { going: null }, run: { depth: 10, running: true, signal: 0, clockMs: 600000, floor: { n: k, of: 3 }, portal: { x: 400, y: 500, open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] } };
  }
  function moveAll(map, sp) { for (const W of G.wins) W.load(map, { x: sp.x + W.slot * 14, y: sp.y }); }
  // Mob greift an, wen aggro bestimmt
  function aggroOn(m, slot) {
    if (m.targetId) return;
    if (aggro === 'first') { m.targetId = 'p:' + slot; E(slot, 'aggro', m.id); }
  }
  for (let slot = 0; slot < n; slot++) {
    const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: `https://play.digimmo.com.br/#dbslot=${slot}`, pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
    const w = dom.window;
    w.HTMLCanvasElement.prototype.getContext = () => null;
    w.BroadcastChannel = BroadcastChannel;
    const T = { id: 't:' + slot, kind: 0, x: 808 + slot * 14, y: 900, hp: 1, flags: 0, targetId: '' }, Pp = { id: 'p:' + slot, kind: 1, x: 818 + slot * 14, y: 900, hp: 30000, maxHp: 30000, flags: 0, targetId: '' };
    G.players.set(T.id, T); G.players.set(Pp.id, Pp);
    const sent = { talk: 0, open: 0, enter: 0, descend: 0, leave: 0, sel: [] };
    let state = {}; const subs = [];
    const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
    let own = { warden: null, view: null, scans: [] };
    const rift = { getState: () => ({ ...G.rs, ...own, set: (p) => { const { warden, view, scans, ...rest } = p; if ('warden' in p) own.warden = warden; if ('view' in p) own.view = view; if ('scans' in p) own.scans = scans; G.rs = { ...G.rs, ...rest }; } }) };
    const mapNow = () => G.mapOf[slot];
    // Entities: alle Spieler auf meiner Map + Gegner, wenn ich im Rift bin
    const list = () => { const out = []; for (const [id, e] of G.players) { const s = Number(id.split(':')[1]); if (G.mapOf[s] === mapNow()) out.push([id, e]); } if (mapNow() === RS) for (const [id, m] of G.mobs) out.push([id, m]); return out; };
    const ents = { get: (id) => list().find(([k]) => k === id)?.[1], has: (id) => list().some(([k]) => k === id), forEach: (f) => list().forEach(([k, v]) => f(v, k)), keys: () => list().map(([k]) => k)[Symbol.iterator](), values: () => list().map(([, v]) => v)[Symbol.iterator](), entries: () => list()[Symbol.iterator](), [Symbol.iterator]: () => list()[Symbol.iterator](), get size() { return list().length; } };
    let goal = null;
    const scene = {
      deps: { content, commands: null, assetsBase: '/assets/', manifest: { maps: Object.fromEntries(Object.keys(MAPS).map((m) => [m, { tmj: `maps/${m}.tmj` }])) } },
      map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) }, portals: [], spawns: {}, zones: {} },
      controlledId: () => T.id, tapGround: (x, y) => { goal = { x, y }; },
      select: (id) => { sent.sel.push(id); const e = ents.get(id); store.setState({ target: e && e.kind === 2 ? { id, kind: 'mob', name: 'Bearmon', level: e.level, hp: e.hp, maxHp: e.maxHp } : null }); },
      telegraphs: { active: [], mirrors: [] }, mechB: { lines: [] }, riftFog: null,
    };
    function load(map, sp) {
      G.mapOf[slot] = map; T.x = sp.x; T.y = sp.y; Pp.x = sp.x + 10; Pp.y = sp.y;
      scene.riftFog = map === RS ? { rift: { layout: { cells: CELLS, guardian: { x: 800, y: 500 } } } } : null;
      store.setState({ screen: 'world', world: { mapId: map, mapName: content.maps[map].name, channel: 1, roomId: `${map}-1` }, target: null, dialog: null });
    }
    setInterval(() => {
      if (mapNow() === RS) for (const [id, m] of G.hidden) if (Math.hypot(m.x - T.x, m.y - T.y) < 260) { G.hidden.delete(id); G.mobs.set(id, m); }
      if (!goal || state.screen !== 'world') return;
      const dx = goal.x - T.x, dy = goal.y - T.y, d = Math.hypot(dx, dy);
      if (d <= 25) { T.x = goal.x; T.y = goal.y; goal = null; } else { T.x += (dx / d) * 25; T.y += (dy / d) * 25; }
      Pp.x = T.x + 10; Pp.y = T.y;
    }, 50);
    const near = (x, y, r) => Math.hypot(T.x - x, T.y - y) <= r;
    const base = {
      talk(npc) { sent.talk++; if (npc === 'rift_warden' && mapNow() === PV && near(808, 792, 60)) store.setState({ dialog: { npc, node: { id: 'root', choices: [{ id: 'open', action: 'openRift' }, { id: 'bye' }] } } }); },
      chooseDialog(c) { if (c === 'open' && state.dialog?.npc === 'rift_warden') { sent.open++; store.setState({ dialog: null }); own = { ...own, warden: { npc: 'rift_warden' }, view: { deepest: 10, party: fights.map((_, i) => ({ name: 'Char' + i, level: 130, problem: '', leader: i === 0 })), iLead: slot === 0, blocked: null, depths: [] } }; } },
      closeDialog() { store.setState({ dialog: null }); },
      command(name, args) {
        if (name === 'riftEnter') { sent.enter++; E(slot, 'riftEnter'); if (slot !== 0) return; for (const W of G.wins) W.closeWarden(); setTimeout(() => { floorStart(1); moveAll(RS, { x: 200, y: 200 }); }, 300); }
        else if (name === 'riftDescend') { sent.descend++; E(slot, 'riftDescend'); }
        else if (name === 'raidLeave') { sent.leave++; E(slot, 'raidLeave'); }
      },
      requestBossPins() {}, requestMapInfo() {}, partnerFollow() {}, partnerStop() {}, async requestEvents() { return [{ id: 'mega_hunt', now: Date.now(), slot: null, state: 'idle', next: null }]; },
    };
    const commands = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}) });
    scene.deps.commands = commands;
    w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
    w.dmo = { store, rift, net: { state: { entities: ents }, connected: true, transferring: false, charId: 'c' + slot, on: () => () => {} }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
    const keys = [];
    w.addEventListener('keydown', (e) => {
      if (e.code !== 'Digit1' || !state.target) return;
      const m = G.mobs.get(state.target.id);
      if (!m || m.hp <= 0 || mapNow() !== RS || Math.hypot(m.x - T.x, m.y - T.y) > 320) return;
      keys.push({ t: Date.now(), id: m.id }); E(slot, 'hit', m.id);
      aggroOn(m, slot);
      m.hp = Math.max(0, m.hp - 40);
      if (m.hp <= 0) { G.mobs.delete(m.id); E(slot, 'kill', m.id); }
    }, true);
    store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, chat: [], target: null, effects: {},
      session: { username: 'u' + slot, characters: [{ id: 'c' + slot, name: 'Char' + slot }] },
      party: { ...party, members: party.members.map((m, i) => ({ ...m, me: i === slot })) },
      me: { tamerEntityId: T.id, tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests: {}, bits: 5000,
        partner: { entityId: Pp.id, name: 'Dukemon', species: 'gallantmon', level: 130, hp: 30000, maxHp: 30000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
    const W = { slot, w, store, sent, keys, T, P: Pp, load, closeWarden: () => { own = { ...own, warden: null, view: null }; }, status: () => w.document.querySelector('[data-f="status"]')?.textContent || '' };
    G.wins.push(W);
    load(PV, { x: 808 + slot * 14, y: 900 });
    w.localStorage.setItem('digibot.accounts', JSON.stringify(accounts));
    w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'rift', autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3, tab: 'acc', ...cfg }));
  }
  for (const W of G.wins) W.w.eval(script);
  return { G, wins: G.wins, ev, start: () => G.wins[0].w.document.querySelector('[data-act="bot"]').click(), close: () => { for (const W of G.wins) W.w.close(); } };
}

const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

const PARTS = {
  async ui() {
    const R = groupWorld({ fights: ['dd', 'dd', 'dd'] });
    const W = R.wins[0], d = W.w.document;
    await wait(1500);
    const sels = () => [...d.querySelectorAll('select[data-accfight]')];
    const pick = (i, v) => { const s = sels()[i]; s.value = v; s.dispatchEvent(new W.w.Event('input', { bubbles: true })); s.dispatchEvent(new W.w.Event('change', { bubbles: true })); };
    const saved = () => JSON.parse(W.w.localStorage.getItem('digibot.accounts')).list.map((r) => r.fight);
    const n0 = sels().length, v0 = sels().map((s) => s.value).join(',');
    if (n0 === 3) { pick(1, 'tank'); await wait(300); }
    const s1 = n0 === 3 ? saved().slice(0, 3).join(',') : '';
    if (n0 === 3) { pick(2, 'tank'); await wait(3000); }
    const s2 = n0 === 3 ? saved().slice(0, 3).join(',') : '', v2 = sels().map((s) => s.value).join(',');
    check('G-U', n0 === 3 && v0 === 'dd,dd,dd' && s1 === 'dd,tank,dd' && s2 === 'dd,dd,tank' && v2 === 'dd,dd,tank', 'Rollenwahl, höchstens ein Tank, Wert bleibt',
      () => `Selects ${n0} (${v0}), nach Tank 1: ${s1}, nach Tank 2: ${s2}, angezeigt ${v2}`);
    R.close();
  },
  async follow() {
    const R = groupWorld({ fights: ['dd', 'dd'], mobs: (k) => (k === 1 ? [{ id: 'm:far', x: 800, y: 180, hidden: true }] : []) });
    const [L, F] = R.wins;
    await wait(1500); R.start();
    const t0 = Date.now(); let inRift = 0, seenFollow = false;
    let closeAfter = false; // nach >300 px Laufweg des Leaders mindestens einmal wieder höchstens 150 px dran
    while (Date.now() - t0 < 30000) { if (/folge/.test(F.status())) seenFollow = true; if (R.G.mapOf[0] === RS && Math.hypot(L.T.x - 200, L.T.y - 200) > 300 && Math.hypot(L.P.x - F.P.x, L.P.y - F.P.y) <= 150) closeAfter = true; if (R.G.mapOf[0] === RS && R.G.mapOf[1] === RS) { inRift ||= Date.now(); if (Date.now() - inRift > 12000) break; } await wait(250); }
    const dLF = Math.round(Math.hypot(L.P.x - F.P.x, L.P.y - F.P.y)), moved = Math.round(Math.hypot(L.T.x - 200, L.T.y - 200));
    check('G-O', F.sent.talk === 0 && F.sent.enter === 0 && L.sent.enter >= 1 && !!inRift, 'Mitläufer öffnet keinen eigenen Rift, beide im Rift',
      () => `Mitläufer talk ${F.sent.talk} enter ${F.sent.enter}, Leader enter ${L.sent.enter}, Maps ${R.G.mapOf.join('/')}, Status F: ${F.status()}`);
    check('G-F', !!inRift && moved > 300 && closeAfter && F.sent.descend === 0 && seenFollow, `Mitläufer folgt dem Leader (${dLF} px, Leader ${moved} px gelaufen)`,
      () => `Abstand ${dLF} px, Leader gelaufen ${moved} px, Mitläufer Abstieg ${F.sent.descend}, Status F: ${F.status()}`);
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
