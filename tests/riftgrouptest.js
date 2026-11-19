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
// Review 3.2.32:
//  rest   G-R: Tank mit 40 % HP – kein neues ruhiges Ziel, Erholpause.   left G-L: Leader draußen -> Mitläufer geht nach ~10 s hinaus.
//  mender G-M: Pack greift den Tank an, daneben ein Mender – keine Endlos-Sperre, Leader/DD helfen.
//  noleader G-NL: Leader weg -> Tank/DD greifen wie solo an.   bread G-B: Mitläufer kauft Brot nach (Leader wartet), betritt nicht selbst.
//  second G-2: im zweiten Lauf greift der Tank wieder zuerst an.
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
// hp: Partner-HP je Slot · effects: Effekte je Gegner (z. B. Mender) · bread: Slots mit Guilmon Bread auf F1 · enterOnce: Leader darf nur einmal betreten
function groupWorld({ fights, mobs = () => [], aggro = 'first', cfg = {}, hp = [], effects = {}, bread = [], enterOnce = false, field = false }) {
  const n = fights.length;
  const G = { rs: { run: null, patch: null, result: null, floorUi: { going: null } }, floor: 0, mapOf: [], mobs: new Map(), hidden: new Map(), players: new Map(), wins: [] };
  const accounts = { leader: 0, popup: true, mirror: false, spread: false, dungeon: true, list: fights.map((f, i) => ({ on: true, user: 'u' + i, char: 'Char' + i, fight: f })) };
  const party = { id: 'P', members: fights.map((_, i) => ({ charId: 'c' + i, name: 'Char' + i, partnerEntityId: 'p:' + i })) };
  const content = {
    digimon: { bearmon_rift: { name: 'Bearmon' } }, items: {}, npcs: { rift_warden: { name: 'Clockmon, Rift Warden' } }, quests: {}, dailyById: {},
    maps: { [PV]: { id: PV, name: 'Primary Village', safe: !field }, [RS]: { id: RS, name: 'Digital Rift', levelRange: [130, 130] } },
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
    const list = () => { const out = []; for (const [id, e] of G.players) { const s = Number(id.split(':')[1]); if (G.mapOf[s] === mapNow()) out.push([id, e]); } if (mapNow() === RS || (field && mapNow() === PV)) for (const [id, m] of G.mobs) out.push([id, m]); return out; };
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
        if (name === 'riftShopBuy') {
          const inv = state.me.inventory, q = (id) => inv.filter((i) => i.itemId === id).reduce((k, i) => k + i.qty, 0);
          if (args?.offer !== 'guilmon_bread' || q('rift_shard') < 30) return;
          sent.buy = (sent.buy || 0) + 1; E(slot, 'buy');
          store.setState({ me: { ...state.me, inventory: [{ itemId: 'guilmon_bread', qty: q('guilmon_bread') + 10 }, { itemId: 'rift_shard', qty: q('rift_shard') - 30 }] } });
          return;
        }
        if (name === 'riftEnter') { sent.enter++; E(slot, 'riftEnter'); if (slot !== 0 || (enterOnce && G.entered)) return; G.entered = true; for (const W of G.wins) W.closeWarden(); setTimeout(() => { floorStart(1); moveAll(RS, { x: 200, y: 200 }); }, 300); }
        else if (name === 'riftDescend') { sent.descend++; E(slot, 'riftDescend'); }
        else if (name === 'raidLeave') { sent.leave++; E(slot, 'raidLeave'); if (mapNow() === RS && !W.leaving) { W.leaving = true; setTimeout(() => { W.leaving = false; load(PV, { x: 808 + slot * 14, y: 824 }); }, 600); } }
      },
      raidLeave() { base.command('raidLeave', {}); },
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
      if (!m || m.hp <= 0 || (mapNow() !== RS && !(field && mapNow() === PV)) || Math.hypot(m.x - T.x, m.y - T.y) > 320) return;
      keys.push({ t: Date.now(), id: m.id }); E(slot, 'hit', m.id);
      aggroOn(m, slot);
      m.hp = Math.max(0, m.hp - 40);
      if (m.hp <= 0) { G.mobs.delete(m.id); E(slot, 'kill', m.id); }
    }, true);
    store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, chat: [], target: null, effects: { ...effects },
      session: { username: 'u' + slot, characters: [{ id: 'c' + slot, name: 'Char' + slot }] },
      party: { ...party, members: party.members.map((m, i) => ({ ...m, me: i === slot })) },
      me: { tamerEntityId: T.id, tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests: {}, bits: 5000,
        partner: { entityId: Pp.id, name: 'Dukemon', species: 'gallantmon', level: 130, hp: hp[slot] ?? 30000, maxHp: 30000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
    Pp.hp = hp[slot] ?? 30000;
    if (bread.includes(slot)) store.setState({ me: { ...state.me, hotbar: ['cmd:attack', null, null, null, null, null, null, null, 'item:guilmon_bread'], inventory: [{ itemId: 'guilmon_bread', qty: 2 }, { itemId: 'rift_shard', qty: 100 }] } });
    const W = { slot, w, store, sent, keys, T, P: Pp, load, closeWarden: () => { own = { ...own, warden: null, view: null }; }, status: () => w.document.querySelector('[data-f="status"]')?.textContent || '' };
    G.wins.push(W);
    load(PV, { x: 808 + slot * 14, y: 900 });
    w.localStorage.setItem('digibot.accounts', JSON.stringify(accounts));
    w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'rift', autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3, tab: 'acc', ...cfg }));
  }
  if (field) for (const m of mobs(1)) G.mobs.set(m.id, { kind: 2, defId: 'bearmon_rift', level: 130, hp: 600, maxHp: 600, flags: 0, targetId: '', ...m }); // normale Map (Grinden): Gegner in Primary Village
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
    while (Date.now() - t0 < 30000) { if (/folge/.test(F.status())) seenFollow = true; if (R.G.mapOf[0] === RS && Math.hypot(L.T.x - 200, L.T.y - 200) > 300 && Math.hypot(L.P.x - F.P.x, L.P.y - F.P.y) <= 220) closeAfter = true; /* Gruppenabstand 110 + Laufweg/Fernkampf */ if (R.G.mapOf[0] === RS && R.G.mapOf[1] === RS) { inRift ||= Date.now(); if (Date.now() - inRift > 12000) break; } await wait(250); }
    const dLF = Math.round(Math.hypot(L.P.x - F.P.x, L.P.y - F.P.y)), moved = Math.round(Math.hypot(L.T.x - 200, L.T.y - 200));
    check('G-O', F.sent.talk === 0 && F.sent.enter === 0 && L.sent.enter >= 1 && !!inRift, 'Mitläufer öffnet keinen eigenen Rift, beide im Rift',
      () => `Mitläufer talk ${F.sent.talk} enter ${F.sent.enter}, Leader enter ${L.sent.enter}, Maps ${R.G.mapOf.join('/')}, Status F: ${F.status()}`);
    check('G-F', !!inRift && moved > 300 && closeAfter && F.sent.descend === 0 && seenFollow, `Mitläufer folgt dem Leader (${dLF} px, Leader ${moved} px gelaufen)`,
      () => `Abstand ${dLF} px, Leader gelaufen ${moved} px, Mitläufer Abstieg ${F.sent.descend}, Status F: ${F.status()}`);
    R.close();
  },
  async tank() {
    const R = await fight({ fights: ['dd', 'tank', 'healer'], aggro: 'first' }, (R) => hitsOf(R, 0).length && hitsOf(R, 2).length, 30000);
    const tk = hitsOf(R, 1)[0], l = hitsOf(R, 0)[0], h = hitsOf(R, 2)[0], ag = R.ev.find((e) => e.what === 'aggro' && e.id === 'm:a');
    check('G-T1', !!tk && (!l || tk.t < l.t) && (!h || tk.t < h.t) && tk.id === 'm:a', 'Tank greift zuerst an', () => `Tank ${tk?.t - R.t0 || '–'} ms, Leader ${l ? l.t - R.t0 : '–'}, Heiler ${h ? h.t - R.t0 : '–'}`);
    check('G-T2', !!ag && ag.slot === 1 && !!l && !!h && l.t >= ag.t && h.t >= ag.t && l.id === 'm:a' && h.id === 'm:a', 'Leader und Heiler erst, wenn das Ziel den Tank angreift',
      () => `Aggro ${ag ? `${ag.t - R.t0} ms auf Slot ${ag.slot}` : '–'}, Leader ${l ? `${l.t - R.t0} ms ${l.id}` : '–'}, Heiler ${h ? `${h.t - R.t0} ms ${h.id}` : '–'}`);
    R.close();
  },
  async never() {
    const R = await fight({ fights: ['dd', 'tank', 'healer'], aggro: 'never' }, (R) => hitsOf(R, 0).length && hitsOf(R, 2).length, 30000);
    const tk = hitsOf(R, 1)[0], l = hitsOf(R, 0)[0], h = hitsOf(R, 2)[0];
    const dl = tk && l ? l.t - tk.t : null, dh = tk && h ? h.t - tk.t : null;
    check('G-N', dl != null && dh != null && dl >= 2500 && dl <= 7000 && dh >= 2500 && dh <= 7000, `Ziel greift Tank nie an – nach ~4 s greifen alle an (Leader +${dl} ms, Heiler +${dh} ms)`,
      () => `Leader +${dl} ms, Heiler +${dh} ms nach dem Tank`);
    R.close();
  },
  async self() {
    const R = await fight({ fights: ['dd', 'tank', 'healer'], aggro: 'first', extra: [{ id: 'm:s', x: 250, y: 260, targetId: 'p:0' }] }, (R) => hitsOf(R, 0).length, 20000);
    const l = hitsOf(R, 0)[0];
    check('G-S', !!l && l.id === 'm:s', 'direkter Angreifer – der Leader wehrt sich sofort', () => `erster Leader-Treffer ${l?.id || '–'}`);
    R.close();
  },
  async gone() {
    let closed = 0;
    const R = await fight({ fights: ['dd', 'tank', 'healer'], aggro: 'never', onHit: (R, s) => { if (s === 1 && !closed) { closed = Date.now(); R.wins[1].w.close(); } } }, (R) => hitsOf(R, 0).length && hitsOf(R, 2).length, 30000);
    const l = hitsOf(R, 0)[0], h = hitsOf(R, 2)[0];
    check('G-T', !!closed && !!l && !!h && l.t - closed <= 8000 && h.t - closed <= 8000, 'Tank weg – keine Sperre', () => `Tank zu ${closed ? 'ja' : 'nein'}, Leader ${l ? l.t - closed : '–'} ms, Heiler ${h ? h.t - closed : '–'} ms`);
    R.close();
  },
  async heal() {
    // Ziel greift nie an -> Sperre läuft bis zum Sicherheitsnetz; währenddessen Heiler-Position prüfen
    let best = null;
    const R = await fight({ fights: ['dd', 'tank', 'healer'], aggro: 'never' }, (R) => {
      const [, Tk, H] = R.wins, m = R.G.mobs.get('m:a');
      if (m && /hinter dem Tank/.test(H.status())) {
        const dx = Tk.T.x - m.x, dy = Tk.T.y - m.y, d = Math.hypot(dx, dy) || 1, sx = Tk.T.x + dx / d * 90, sy = Tk.T.y + dy / d * 90;
        const off = Math.hypot(H.T.x - sx, H.T.y - sy), farther = Math.hypot(H.T.x - m.x, H.T.y - m.y) > Math.hypot(Tk.T.x - m.x, Tk.T.y - m.y);
        if (!best || off < best.off) best = { off: Math.round(off), farther };
      }
      return hitsOf(R, 2).length;
    }, 30000);
    check('G-H', !!best && best.off <= 50 && best.farther, `Heiler hinter dem Tank (${best?.off} px vom Platz)`, () => (best ? `${best.off} px vom Platz, weiter weg als der Tank: ${best.farther}` : 'nie „hinter dem Tank“ gesehen'));
    R.close();
  },
  // Review 3.2.32 ---------------------------------------------------------------------------------------------------------
  async rest() { // R1: Tank (Mitläufer) mit 40 % HP – kein neues ruhiges Ziel, erst erholen
    const R = await fight({ fights: ['dd', 'tank', 'dd'], hp: [30000, 12000, 30000], aggro: 'first' }, () => false, 9000);
    const n = R.ev.filter((e) => e.what === 'hit').length;
    check('G-R', n === 0 && /erhol/.test(R.wins[1].status() + R.wins[0].status()), 'Tank mit 40 % HP – niemand greift ein ruhiges Ziel an, Erholpause', () => `${n} Treffer, Status Tank: ${R.wins[1].status()} · Leader: ${R.wins[0].status()}`);
    R.close();
  },
  async left() { // R2: Leader verlässt den Rift ohne Ergebnis (Biom-Neustart, Zeitlimit) -> Mitläufer geht auch hinaus
    const R = groupWorld({ fights: ['dd', 'dd'], enterOnce: true });
    const [L, F] = R.wins;
    await wait(1500); R.start();
    let t = Date.now(), moved = 0;
    while (Date.now() - t < 40000) {
      if (!moved && R.G.mapOf[0] === RS && R.G.mapOf[1] === RS) { await wait(2500); L.load(PV, { x: 808, y: 824 }); moved = Date.now(); }
      if (moved && F.sent.leave) break;
      await wait(250);
    }
    check('G-L', !!moved && F.sent.leave >= 1 && Date.now() - moved <= 25000, `Leader draußen – Mitläufer geht nach ${moved ? Math.round((Date.now() - moved) / 1000) : '–'} s hinaus`, () => `Leader draußen ${!!moved}, Mitläufer raidLeave ${F.sent.leave}, Status F: ${F.status()}`);
    R.close();
  },
  async mender() { // R3: Pack greift den Tank an, Leader würde den Mender (greift niemanden an) ansagen -> keine Endlos-Sperre
    const R = await fight({ fights: ['dd', 'tank', 'dd'], aggro: 'first', extra: [{ id: 'm:x', x: 300, y: 250, targetId: 'p:1' }, { id: 'm:h', x: 380, y: 290 }], effects: { 'm:h': [{ id: 'rift_role_mender' }] } }, (R) => hitsOf(R, 0).length && hitsOf(R, 2).length, 20000);
    const l = hitsOf(R, 0)[0], d = hitsOf(R, 2)[0];
    check('G-M', !!l && !!d && l.t - R.inRift <= 9000 && d.t - R.inRift <= 9000, `Tank kämpft gegen das Pack – Leader/DD helfen (+${l ? l.t - R.inRift : '–'} / +${d ? d.t - R.inRift : '–'} ms)`, () => `Leader ${l ? `${l.t - R.inRift} ms ${l.id}` : '–'}, DD ${d ? `${d.t - R.inRift} ms ${d.id}` : '–'}`);
    R.close();
  },
  async noleader() { // R4: Leader-Fenster weg -> Tank und DD spielen wie solo weiter (greifen ruhige Gegner an)
    let closed = 0;
    const R = await fight({ fights: ['dd', 'tank', 'dd'], aggro: 'never' }, (R) => { if (!closed) { closed = Date.now(); R.wins[0].w.close(); } return hitsOf(R, 1).length && hitsOf(R, 2).length; }, 25000);
    const tk = hitsOf(R, 1)[0], d = hitsOf(R, 2)[0];
    check('G-NL', !!tk && !!d && tk.t - closed <= 14000 && d.t - closed <= 14000, 'ohne Leader greifen Tank und DD wieder selbst an', () => `Tank ${tk ? tk.t - closed : '–'} ms, DD ${d ? d.t - closed : '–'} ms nach Schließen des Leaders`);
    R.close();
  },
  async bread() { // R5: Mitläufer mit Guilmon Bread auf F1 kauft bei Clockmon nach, betritt aber nicht selbst
    const R = groupWorld({ fights: ['dd', 'dd'], bread: [1], enterOnce: true });
    const F = R.wins[1];
    await wait(1500); R.start();
    const t = Date.now();
    while (Date.now() - t < 25000 && !F.sent.buy) await wait(250);
    check('G-B', F.sent.buy >= 1 && F.sent.enter === 0, 'Mitläufer kauft Guilmon Bread nach', () => `Käufe ${F.sent.buy || 0}, betreten ${F.sent.enter}, Status F: ${F.status()}`);
    R.close();
  },
  async second() { // R6: zweiter Lauf – Tank greift wieder zuerst an (Kulanz nach Kartenwechsel auch beim 2. Betreten)
    const R = groupWorld({ fights: ['dd', 'tank', 'healer'], aggro: 'first', mobs: (k) => (k === 1 ? [{ id: 'm:a', x: 330, y: 230 }] : []) });
    await wait(1500); R.start();
    let t = Date.now(), ended = 0, second = 0;
    while (Date.now() - t < 60000) {
      const ent = R.ev.filter((e) => e.slot === 0 && e.what === 'riftEnter');
      if (!ended && R.G.mapOf.every((m) => m === RS)) { await wait(3000); R.G.rs = { ...R.G.rs, run: null, result: { stable: true, depth: 10, timeMs: 100000, loot: {} } }; ended = Date.now(); }
      if (ended && !second && ent.length >= 2) second = ent[1].t;
      if (second && R.ev.some((e) => e.t > second && e.what === 'hit' && e.slot === 0) && R.ev.some((e) => e.t > second && e.what === 'hit' && e.slot === 2)) break;
      await wait(200);
    }
    const after = (s) => R.ev.find((e) => e.t > second && e.what === 'hit' && e.slot === s);
    const tk = after(1), l = after(0), h = after(2);
    check('G-2', !!second && !!tk && !!l && !!h && tk.t < l.t && tk.t < h.t, 'zweiter Lauf: Tank greift wieder zuerst an', () => `2. Lauf ${!!second}, Tank ${tk ? tk.t - second : '–'}, Leader ${l ? l.t - second : '–'}, Heiler ${h ? h.t - second : '–'} ms`);
    R.close();
  },
  // 3.2.34 (Nutzer 19.11.: „alle Gegner egal welche“, in allen Modi): Grinden auf einer normalen Map
  async field() {
    const R = groupWorld({ fights: ['dd', 'tank', 'healer'], field: true, aggro: 'first', cfg: { dungeon: false, autopilot: false, farm: false, radius: 400 }, mobs: () => [{ id: 'm:f', x: 900, y: 960 }] });
    await wait(1500); R.start(); const t0 = Date.now();
    while (Date.now() - t0 < 25000 && !(hitsOf(R, 0).length && hitsOf(R, 2).length)) await wait(150);
    const tk = hitsOf(R, 1)[0], l = hitsOf(R, 0)[0], h = hitsOf(R, 2)[0], ag = R.ev.find((e) => e.what === 'aggro' && e.id === 'm:f');
    check('G-F1', !!tk && !!l && !!h && tk.t < l.t && tk.t < h.t && !!ag && ag.slot === 1 && l.t >= ag.t && h.t >= ag.t, 'Grinden: Tank greift zuerst an, die anderen danach',
      () => `Tank ${tk ? tk.t - t0 : '–'}, Leader ${l ? l.t - t0 : '–'}, Heiler ${h ? h.t - t0 : '–'} ms, Aggro ${ag ? `Slot ${ag.slot} ${ag.t - t0}` : '–'}, Status L: ${R.wins[0].status()}`);
    R.close();
  },
  async fieldnotank() {
    const R = groupWorld({ fights: ['dd', 'dd'], field: true, aggro: 'never', cfg: { dungeon: false, autopilot: false, farm: false, radius: 400 }, mobs: () => [{ id: 'm:f', x: 900, y: 960 }] });
    await wait(1500); R.start(); const t0 = Date.now();
    while (Date.now() - t0 < 15000 && !hitsOf(R, 0).length) await wait(150);
    const l = hitsOf(R, 0)[0];
    check('G-F0', !!l && l.t - t0 <= 6000, `Grinden ohne Tank: Leader greift sofort an (+${l ? l.t - t0 : '–'} ms)`, () => `Leader-Treffer ${l ? l.t - t0 : '–'} ms, Status ${R.wins[0].status()}`);
    R.close();
  },
  async notank() {
    const R = await fight({ fights: ['dd', 'dd', 'dd'], aggro: 'never' }, (R) => hitsOf(R, 0).length, 20000);
    const l = hitsOf(R, 0)[0];
    check('G-0', !!l && l.t - R.inRift <= 3000, `ohne Tank greift der Leader sofort an (+${l ? l.t - R.inRift : '–'} ms)`, () => `Leader-Treffer ${l ? l.t - R.inRift : '–'} ms nach Rift-Start`);
    R.close();
  },
};
// Kampfaufbau: Gruppe startet, betritt den Rift (Lager bei 200/200), ein Gegner m:a 130 px vor der Gruppe
const hitsOf = (R, s) => R.ev.filter((e) => e.slot === s && e.what === 'hit');
async function fight(opts, done, ms) {
  const R = groupWorld({ ...opts, mobs: (k) => (k === 1 ? [{ id: 'm:a', x: 330, y: 230 }, ...(opts.extra || [])] : []) });
  if (opts.onHit) { const push = R.ev.push.bind(R.ev); R.ev.push = (e) => { const r = push(e); if (e.what === 'hit') opts.onHit(R, e.slot); return r; }; }
  await wait(1500); R.start(); R.t0 = Date.now();
  const end = Date.now() + ms;
  while (Date.now() < end) { if (!R.inRift && R.G.mapOf.every((m) => m === RS)) R.inRift = Date.now(); if (R.inRift && done(R)) break; await wait(150); }
  return R;
}

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
