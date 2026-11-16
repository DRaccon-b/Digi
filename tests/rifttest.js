// 3.2.19 (Nutzer 16.11.): Digital Rift – solo starten, clearen, endlos wiederholen.
// Ablauf im Spiel: Clockmon (rift_warden) in Primary Village ansprechen -> Dialog „open“ -> Rift-Fenster (window.dmo.rift:
// warden/view) -> riftEnter{depth}. Im Rift 3 Etagen: Monster (erst in der Nähe sichtbar) füllen das Signal; Portal öffnet bei
// n/3, riftDescend am Portal; Patch-Angebot bei 33 % -> riftPatch{offer,pick}; letzte Etage bei 100 % Guardian -> besiegen ->
// riftResult -> raidLeave -> zurück in Primary Village -> nächster Lauf.
// A: Tiefe „höchstmöglich“: freigeschaltet 5, Partner Lv 110 -> Tiefe 4 (Lv 99), nicht 5 (Lv 120).
// B: Patch-Wahl nach Priorität (overclock vor data_mass/firewall).
// C: drei Etagen, zweimal abgestiegen, Guardian besiegt, raidLeave gesendet.
// D: danach zweiter Lauf gestartet.
// E (zweiter Durchgang, feste Tiefe 2): riftEnter mit Tiefe 2.
// F (Nutzer 16.11.: „der Heiler zuerst“): Etage 1 – ein Angreifer greift an, ein Heiler (Rolle rift_role_mender) steht dahinter:
//    der Bot nimmt zuerst den Heiler.
// G (Nutzer 16.11.: „rennt quer über die Map zum Heiler einer anderen Gruppe“): ein zweiter Heiler steht weit weg bei einer
//    anderen Gruppe – nach dem nahen Heiler kommt der Angreifer dran, nicht der ferne Heiler.
// H (live 16.11., Tiefe 10): Alpha-Jagd-Etage – der markierte Alpha trägt das Boss-Flag und steht 110 px neben dem Bot (greift
//    nicht an): der Bot greift ihn an (vorher ausgeschlossen, er lief erkunden).
// I (Nutzer 16.11.: „rennt an 1000 Digimon vorbei nur um den Alpha zu besiegen – dabei stirbt er immer“): der markierte
//    Alpha steht weit weg, ein Gegner nah – erst der nahe Gegner (vorsichtig durchkämpfen).
// J: Portal offen, ein Gegner (greift nicht an) steht nah am Weg – erst den Gegner, dann absteigen.
// K: wenig HP, niemand greift an – der Bot wartet und erholt sich, statt weiterzulaufen.
// L (Nutzer 16.11.: Suchradius runterstellen): Suchradius im Panel 150 – einen Gegner (greift nicht an) nimmt der Bot erst,
//    wenn er höchstens 150 px entfernt ist (vorher fest 450 px im Rift).
// M (Nutzer 16.11.: „sobald der Boss gespawnt ist, rennt er direkt zu ihm ohne die Gegner auf dem Weg zu töten“): letzte
//    Etage, Guardian gerufen und weit weg, ein Gegner nah – erst der nahe Gegner, dann der Guardian.
// N (Nutzer 16.11.: „er soll sich immer zuerst um die anderen Mobs kümmern“): Guardian steht sogar näher als ein anderer
//    Gegner im Suchradius – trotzdem erst der andere Gegner.
// O (Nutzer 16.11.: Event „auch aus dem Rift hin“): 🎯 Event an, mitten im Lauf beginnt die Alter Hunt in Primary Village –
//    der Bot verlässt den Rift, greift den Event-Boss an und startet erst danach den nächsten Lauf.
// P (Live 16.11.: Etage 1 brauchte 1:40 mit 40 s Erkunden): eine Sackgasse liegt näher als eine Hauptweg-Zelle – der Bot
//    erkundet zuerst den Hauptweg (dort 1–2 Gruppen je Zelle, in Sackgassen höchstens eine).
// Q (Live 16.11., Lauf 3: lief 280 px einem fernen Angreifer hinterher, während ihn nahe Gegner schlugen – 1 → 6 Angreifer):
//    Ziel ist ein Angreifer 300 px weg, ein zweiter greift direkt daneben an – der Bot wechselt zum nahen.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');

function world({ cfg, deepest = 5, level = 110, until, hunt = false, caution = false, lowHp = false, mid = false, guard = false, guardNear = false, evt = false, mainFirst = false, farKeep = false }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
  const P = (k, v) => ({ name: k, type: 'string', value: v });
  const PV = 'primary_village', RS = 'rift_sector';
  const MAPS = {
    [PV]: tmj([{ type: 'npc', name: 'rift_warden', x: 808, y: 792, properties: [P('npcId', 'rift_warden')] }, { type: 'spawn', name: 'from_rift', x: 808, y: 824 }]),
    [RS]: tmj([{ type: 'spawn', name: 'camp', x: 584, y: 904 }]), // Platzhalter wie im Spiel – der Bot darf ihn im Lauf nicht benutzen
  };
  const content = {
    digimon: { bearmon_rift: { name: 'Bearmon' }, cherrymon: { name: 'Cherrymon' }, tyrantkabuterimon_hunt: { name: 'TyrantKabuterimon' } },
    items: {}, npcs: { rift_warden: { name: 'Clockmon, Rift Warden' } }, quests: {}, dailyById: {},
    maps: { [PV]: { id: PV, name: 'Primary Village', safe: true }, [RS]: { id: RS, name: 'Digital Rift', levelRange: [130, 130] } },
    spawns: { [PV]: { zones: {} }, [RS]: { zones: {}, raid: { id: 'rift', gate: { mapId: PV, portal: 'rift' }, party: { min: 1, max: 5, minLevel: 1 }, deathLimit: 1000, landing: 'camp', rift: true } } },
  };
  const log = [], L = (s) => { log.push(s); if (process.env.V) console.log('   * ' + s); };
  const sent = { enter: [], patch: [], descend: 0, leave: 0, talk: 0, open: 0, sel: [] };
  let state = {}; const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  let rs = { warden: null, view: null, run: null, patch: null, result: null, floorUi: { going: null } };
  const rift = { getState: () => ({ ...rs, set: (p) => { rs = { ...rs, ...p }; } }), setState: (p) => { rs = { ...rs, ...p }; } };
  const ents = new Map(), hidden = new Map();
  let mapId = PV, floor = 0, signal = 0, guardianUp = false, runs = 0, evtUp = false;
  // Rift-Etage: drei Zellen, je ein Monster am Rand (erst sichtbar, wenn man näher als 260 px kommt)
  const CELLS = [{ id: 'c0_1', role: 'camp', rect: { x: 100, y: 100, w: 200, h: 200 } }, { id: 'c1_1', role: 'main', rect: { x: 700, y: 100, w: 200, h: 200 } },
    { id: 'c1_2', role: 'branch', rect: { x: 700, y: 700, w: 200, h: 200 } }, { id: 'c0_2', role: 'deadend:pond', rect: { x: 100, y: 700, w: 200, h: 200 } }];
  const CELLS_P = [{ id: 'p0', role: 'camp', rect: { x: 100, y: 100, w: 200, h: 200 } }, { id: 'pd', role: 'deadend:well', rect: { x: 100, y: 450, w: 200, h: 200 } },
    { id: 'pm', role: 'main', rect: { x: 500, y: 300, w: 200, h: 200 } }];
  const scene = {
    deps: { content, commands: null, assetsBase: '/assets/', manifest: { maps: Object.fromEntries(Object.keys(MAPS).map((m) => [m, { tmj: `maps/${m}.tmj` }])) } },
    map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) }, portals: [], spawns: {}, zones: {} },
    controlledId: () => 't:me',
    tapGround: (x, y) => { goal = { x, y }; },
    select: (id) => { if (id === 'n:mid' && sent.midD == null) { const tm = ents.get('t:me'), e0 = ents.get(id); if (e0) sent.midD = Math.round(Math.hypot(e0.x - tm.x, e0.y - tm.y)); } sent.sel.push(id); const e = ents.get(id); store.setState({ target: e ? { id, kind: 'mob', name: content.digimon[e.defId].name, level: e.level, hp: e.hp, maxHp: e.maxHp } : null }); },
    telegraphs: { active: [], mirrors: [] }, mechB: { lines: [] }, riftFog: null,
  };
  const setRun = (p) => { rs = { ...rs, run: { ...rs.run, ...p } }; };
  function floorStart(n) {
    floor = n; guardianUp = false; hidden.clear();
    [[790, 160], [800, 780], [160, 790]].forEach(([x, y], i) => hidden.set(`m:${n}:${i}`, { id: `m:${n}:${i}`, kind: 2, defId: 'bearmon_rift', level: 57, x, y, hp: 400, maxHp: 400, flags: 32, targetId: '' }));
    scene.riftFog = { rift: { layout: { cells: mainFirst ? CELLS_P : CELLS, guardian: { x: 800, y: 500 } } } };
    if (n === 1 && runs === 1 && !farKeep) { // F: Angreifer vorn, Heiler dahinter (beide gleich sichtbar)
      ents.set('a:att', { id: 'a:att', kind: 2, defId: 'bearmon_rift', level: 57, x: 330, y: 200, hp: 400, maxHp: 400, flags: 32, targetId: 'p:me' });
      ents.set('h:heal', { id: 'h:heal', kind: 2, defId: 'bearmon_rift', level: 57, x: 420, y: 330, hp: 400, maxHp: 400, flags: 0, targetId: '' });
      ents.set('h:far', { id: 'h:far', kind: 2, defId: 'bearmon_rift', level: 57, x: 720, y: 560, hp: 400, maxHp: 400, flags: 0, targetId: '' });
      store.setState({ effects: { ...(state.effects || {}), 'h:heal': [{ id: 'rift_role_mender' }], 'h:far': [{ id: 'rift_role_mender' }] } });
    }
    rs = { ...rs, warden: null, view: null, result: null, floorUi: { going: null }, run: { depth: sent.enter[sent.enter.length - 1], running: true, signal, clockMs: 600000, floor: { n, of: 3 }, portal: { x: 400, y: 500, open: false }, guardian: 'hidden', objective: hunt ? 'hunt' : 'purge', alphaMarks: [] } };
    if (evt && n === 1) setTimeout(() => { evtUp = true; L('Event beginnt'); }, 1500);
    if ((guard || guardNear) && n === 1) { // M: als letzte Etage mit gerufenem Guardian weit weg und einem Gegner nah
      rs = { ...rs, run: { ...rs.run, floor: { n: 3, of: 3 }, signal: 100, guardian: 'called' } };
      ents.set('g:2', { id: 'g:2', kind: 2, defId: 'cherrymon', level: 60, x: guardNear ? 260 : 520, y: guardNear ? 230 : 430, hp: 1200, maxHp: 1200, flags: 16 | 32, targetId: '' });
      ents.set('n:g', { id: 'n:g', kind: 2, defId: 'bearmon_rift', level: 57, x: guardNear ? 420 : 300, y: guardNear ? 330 : 260, hp: 400, maxHp: 400, flags: 0, targetId: '' });
    }
    if (farKeep && n === 1) {
      ents.set('a:far', { id: 'a:far', kind: 2, defId: 'bearmon_rift', level: 57, x: 500, y: 200, hp: 4000, maxHp: 4000, flags: 32, targetId: 'p:me' });
      ents.set('a:near', { id: 'a:near', kind: 2, defId: 'bearmon_rift', level: 57, x: 230, y: 225, hp: 400, maxHp: 400, flags: 32, targetId: 'p:me' });
      setTimeout(() => { scene.select('a:far'); sent.sel.length = 0; }, 350);
    }
    if (mid && n === 1) ents.set('n:mid', { id: 'n:mid', kind: 2, defId: 'bearmon_rift', level: 57, x: 500, y: 200, hp: 400, maxHp: 400, flags: 0, targetId: '' });
    if (caution && n === 1) { // I/J: Alpha weit weg, naher Gegner; Portal von Anfang an offen, Gegner am Weg
      ents.set('al:2', { id: 'al:2', kind: 2, defId: 'bearmon_rift', level: 57, x: 520, y: 420, hp: 1200, maxHp: 1200, flags: 16 | 32, targetId: '' });
      ents.set('n:near', { id: 'n:near', kind: 2, defId: 'bearmon_rift', level: 57, x: 330, y: 260, hp: 400, maxHp: 400, flags: 0, targetId: '' });
      rs = { ...rs, run: { ...rs.run, objective: 'hunt', alphaMarks: [{ id: 'al:2', x: 520, y: 420 }] } };
    }
    if (caution && n === 2) { signal = 40; rs = { ...rs, run: { ...rs.run, signal: 40, portal: { x: 400, y: 600, open: true } } }; ents.set('n:path', { id: 'n:path', kind: 2, defId: 'bearmon_rift', level: 57, x: 330, y: 380, hp: 400, maxHp: 400, flags: 0, targetId: '' }); }
    if (hunt && n === 1) { ents.set('al:1', { id: 'al:1', kind: 2, defId: 'bearmon_rift', level: 57, x: 250, y: 300, hp: 1200, maxHp: 1200, flags: 16 | 32, targetId: '' }); rs = { ...rs, run: { ...rs.run, alphaMarks: [{ id: 'al:1', x: 250, y: 300 }] } }; }
  }
  function loadMap(id, sp) {
    mapId = id;
    for (const k of [...ents.keys()]) if (k !== 't:me' && k !== 'p:me' && !(id === RS && /^(a:att|h:heal|h:far|al:1|al:2|n:near|n:path|n:mid|g:2|n:g|a:far|a:near)$/.test(k))) ents.delete(k);
    const t = ents.get('t:me'), p = ents.get('p:me');
    t.x = sp.x; t.y = sp.y; p.x = sp.x + 10; p.y = sp.y;
    if (id !== RS) scene.riftFog = null;
    if (id === PV && evtUp) ents.set('hb:1', { id: 'hb:1', kind: 2, defId: 'tyrantkabuterimon_hunt', level: 60, x: 900, y: 850, hp: 5000, maxHp: 5000, flags: 16, targetId: '' });
    store.setState({ screen: 'world', world: { mapId: id, mapName: content.maps[id].name, channel: 1, roomId: `${id}-1` }, target: null, dialog: null });
    L(`Map ${id}${id === RS ? ` Etage ${floor}` : ''}`);
  }
  ents.set('t:me', { id: 't:me', kind: 0, x: 808, y: 900, hp: 1, flags: 0, targetId: '' });
  ents.set('p:me', { id: 'p:me', kind: 1, x: 818, y: 900, hp: 1, flags: 0, targetId: '' });
  let goal = null;
  setInterval(() => {
    const t = ents.get('t:me');
    if (mapId === RS) for (const [id, m] of hidden) if (Math.hypot(m.x - t.x, m.y - t.y) < 260) { hidden.delete(id); ents.set(id, m); }
    if (!goal || state.screen !== 'world') return;
    const dx = goal.x - t.x, dy = goal.y - t.y, d = Math.hypot(dx, dy);
    if (d <= 25) { t.x = goal.x; t.y = goal.y; goal = null; } else { t.x += (dx / d) * 25; t.y += (dy / d) * 25; }
    const p = ents.get('p:me'); p.x = t.x + 10; p.y = t.y;
  }, 50);
  const near = (x, y, r) => { const t = ents.get('t:me'); return Math.hypot(t.x - x, t.y - y) <= r; };
  const commands = {
    talk(npc) { sent.talk++; if (npc === 'rift_warden' && mapId === PV && near(808, 792, 60)) store.setState({ dialog: { npc, node: { id: 'root', choices: [{ id: 'open', action: 'openRift' }, { id: 'bye' }] } } }); },
    chooseDialog(c) {
      if (c === 'open' && state.dialog?.npc === 'rift_warden') { sent.open++; store.setState({ dialog: null }); rs = { ...rs, warden: { npc: 'rift_warden' }, view: { deepest, party: [{ name: 'me', level, problem: '', leader: true }], iLead: true, blocked: null, depths: [] } }; }
    },
    closeDialog() { store.setState({ dialog: null }); },
    command(name, args) {
      if (name === 'riftEnter') {
        sent.enter.push(args.depth); L(`riftEnter Tiefe ${args.depth}`);
        if (until && until(sent)) return;
        runs++; signal = 0; store.setState({ screen: 'loading' });
        setTimeout(() => { floorStart(1); loadMap(RS, { x: 200, y: 200 }); }, 300);
      } else if (name === 'riftPatch') {
        sent.patch.push(rs.patch?.offers?.[args.pick]?.id); L(`Patch ${rs.patch?.offers?.[args.pick]?.id}`); rs = { ...rs, patch: null };
      } else if (name === 'riftDescend') {
        if (!rs.run?.portal?.open || !near(rs.run.portal.x, rs.run.portal.y, 112)) return;
        sent.descend++; sent.sel.push('DESCEND'); L('riftDescend'); store.setState({ screen: 'loading' });
        setTimeout(() => { floorStart(floor + 1); loadMap(RS, { x: 200, y: 200 }); }, 300);
      } else if (name === 'raidLeave') commands.raidLeave();
    },
    raidLeave() { sent.leave++; L('raidLeave'); rs = { ...rs, result: null, run: null }; store.setState({ screen: 'loading' }); setTimeout(() => loadMap(PV, { x: 808, y: 824 }), 300); },
    requestBossPins() {}, requestMapInfo() {}, partnerFollow() {}, partnerStop() {},
    async requestEvents() { const now = Date.now(); return [{ id: 'mega_hunt', now, slot: null, state: 'idle', next: null }, ...(evtUp ? [{ id: 'alter_hunt', now, slot: { key: 'e1', startMs: now - 1000, endMs: now + 3600000 }, boss: 'tyrantkabuterimon_hunt', mapId: PV, channel: 1, state: 'up' }] : [])]; },
  };
  scene.deps.commands = commands;
  w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
  w.dmo = { store, rift, net: { state: { entities: ents }, connected: true, transferring: false }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
  w.addEventListener('keydown', (e) => {
    if (e.code !== 'Digit1' || !state.target) return;
    const m = ents.get(state.target.id);
    if (!m || m.hp <= 0 || mapId !== RS) return;
    const t = ents.get('t:me');
    if (Math.hypot(m.x - t.x, m.y - t.y) > 320) return;
    m.hp = Math.max(0, m.hp - 200);
    store.setState({ target: { ...state.target, hp: m.hp } });
    if (m.hp > 0) return;
    ents.delete(m.id);
    if (m.id === 'al:2') { setRun({ alphaMarks: [], signal: 33, portal: { ...rs.run.portal, open: true } }); signal = 33; L('Alpha besiegt'); return; }
    if (m.flags & 16) { // Guardian
      L('Guardian besiegt'); rs = { ...rs, run: null, patch: null, result: { stable: true, depth: rs.run.depth, timeMs: 200000, loot: { shards: 40 } } };
      return;
    }
    signal = Math.min(100, signal + 12); L(`Kill ${m.id} Signal ${signal}`);
    setRun({ signal, portal: { ...rs.run.portal, open: floor < 3 && signal >= Math.round(100 * floor / 3) } });
    if (signal >= 33 && !rs.patchDone) { rs = { ...rs, patchDone: true, patch: { offerId: 'o1', source: 'signal', offers: [{ id: 'data_mass' }, { id: 'overclock' }, { id: 'firewall' }] } }; }
    if (floor === 3 && signal >= 100 && !guardianUp) {
      guardianUp = true; setRun({ guardian: 'called' }); L('Guardian erscheint');
      ents.set('g:1', { id: 'g:1', kind: 2, defId: 'cherrymon', level: 60, x: 800, y: 500, hp: 1200, maxHp: 1200, flags: 16 | 32, targetId: '' });
    }
  }, true);
  store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, chat: [], world: { mapId: PV, channel: 1, roomId: `${PV}-1` }, target: null,
    me: { tamerEntityId: 't:me', tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests: {}, bits: 5000,
      partner: { entityId: 'p:me', name: 'Piemon', species: 'piedmon_dm', level, hp: 30000, maxHp: 30000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
  if (lowHp) store.setState({ me: { ...state.me, partner: { ...state.me.partner, hp: 9000 } } });
  loadMap(PV, { x: 808, y: 900 });
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'rift', hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3, tab: 'log', ...cfg }));
  w.eval(script);
  return { w, sent, log, status: () => w.document.querySelector('[data-f="status"]')?.textContent || '', get runs() { return runs; } };
}

(async () => {
  const W = world({ cfg: { riftDepthMode: 'max' } });
  await new Promise((r) => setTimeout(r, 900));
  W.w.document.querySelector('[data-act="bot"]').click();
  const tEnd = Date.now() + 150000;
  while (Date.now() < tEnd && W.sent.enter.length < 2) await new Promise((r) => setTimeout(r, 300));
  const st1 = W.status(); W.w.close();
  console.log(JSON.stringify({ sent: W.sent, status: st1 }));
  if (!process.env.V) console.log(W.log.slice(-30).join('\n'));
  const okA = W.sent.enter[0] === 4;
  const okB = W.sent.patch[0] === 'overclock';
  const okC = W.sent.descend === 2 && W.log.includes('Guardian besiegt') && W.sent.leave >= 1;
  const okD = W.sent.enter.length >= 2;
  const W2 = world({ cfg: { riftDepthMode: 'fixed', riftDepth: 2 }, until: () => true });
  await new Promise((r) => setTimeout(r, 900));
  W2.w.document.querySelector('[data-act="bot"]').click();
  const t2 = Date.now() + 30000;
  while (Date.now() < t2 && !W2.sent.enter.length) await new Promise((r) => setTimeout(r, 300));
  W2.w.close();
  const okE = W2.sent.enter[0] === 2;
  const W11 = world({ cfg: { riftDepthMode: 'max' }, farKeep: true, until: (s) => s.enter.length > 1 });
  await new Promise((r) => setTimeout(r, 900));
  W11.w.document.querySelector('[data-act="bot"]').click();
  const t11 = Date.now() + 25000;
  while (Date.now() < t11 && !W11.sent.sel.includes('a:near')) await new Promise((r) => setTimeout(r, 200));
  W11.w.close();
  const okQ = W11.sent.sel.includes('a:near') && W11.sent.sel.indexOf('a:near') < (W11.sent.sel.indexOf('a:far') < 0 ? 1e9 : W11.sent.sel.indexOf('a:far') + 1e9);
  const W10 = world({ cfg: { riftDepthMode: 'max' }, mainFirst: true, until: (s) => s.enter.length > 1 });
  await new Promise((r) => setTimeout(r, 900));
  W10.w.document.querySelector('[data-act="bot"]').click();
  let firstExplore = ''; const t10 = Date.now() + 30000;
  while (Date.now() < t10 && !firstExplore) { const m = /erkunde ([A-Za-zÄÖÜäöü]+)/.exec(W10.status()); if (m) firstExplore = m[1]; await new Promise((r) => setTimeout(r, 200)); }
  W10.w.close();
  const okP = firstExplore === 'Hauptweg';
  const W3 = world({ cfg: { riftDepthMode: 'max' }, hunt: true, until: (s) => s.enter.length > 1 });
  await new Promise((r) => setTimeout(r, 900));
  W3.w.document.querySelector('[data-act="bot"]').click();
  const t3 = Date.now() + 40000;
  while (Date.now() < t3 && !W3.sent.sel.includes('al:1')) await new Promise((r) => setTimeout(r, 300));
  W3.w.close();
  const okH = W3.sent.sel.includes('al:1');
  const W4 = world({ cfg: { riftDepthMode: 'max' }, caution: true, until: (s) => s.enter.length > 1 });
  await new Promise((r) => setTimeout(r, 900));
  W4.w.document.querySelector('[data-act="bot"]').click();
  const t4 = Date.now() + 90000;
  while (Date.now() < t4 && W4.sent.descend < 2) await new Promise((r) => setTimeout(r, 300));
  W4.w.close();
  const s4 = W4.sent.sel;
  const okI = s4.indexOf('n:near') >= 0 && (s4.indexOf('al:2') < 0 || s4.indexOf('n:near') < s4.indexOf('al:2'));
  const d2 = s4.indexOf('DESCEND', s4.indexOf('DESCEND') + 1);
  const okJ = s4.indexOf('n:path') >= 0 && (d2 < 0 || s4.indexOf('n:path') < d2);
  const W5 = world({ cfg: { riftDepthMode: 'max' }, lowHp: true, until: (s) => s.enter.length > 1 });
  await new Promise((r) => setTimeout(r, 900));
  W5.w.document.querySelector('[data-act="bot"]').click();
  const t5 = Date.now() + 30000; let rested = false;
  while (Date.now() < t5 && !rested) { rested = /erhole/.test(W5.status()); await new Promise((r) => setTimeout(r, 300)); }
  W5.w.close();
  const okK = rested;
  const W6 = world({ cfg: { riftDepthMode: 'max', radius: 150 }, mid: true, until: (s) => s.enter.length > 1 });
  await new Promise((r) => setTimeout(r, 900));
  W6.w.document.querySelector('[data-act="bot"]').click();
  const t6 = Date.now() + 60000;
  while (Date.now() < t6 && W6.sent.midD == null) await new Promise((r) => setTimeout(r, 300));
  W6.w.close();
  const okL = W6.sent.midD != null && W6.sent.midD <= 165;
  const W7 = world({ cfg: { riftDepthMode: 'max' }, guard: true, until: (s) => s.enter.length > 1 });
  await new Promise((r) => setTimeout(r, 900));
  W7.w.document.querySelector('[data-act="bot"]').click();
  const t7 = Date.now() + 40000;
  while (Date.now() < t7 && !W7.sent.sel.includes('g:2')) await new Promise((r) => setTimeout(r, 300));
  W7.w.close();
  const s7 = W7.sent.sel, okM = s7.includes('n:g') && s7.indexOf('n:g') < s7.indexOf('g:2');
  const W8 = world({ cfg: { riftDepthMode: 'max' }, guardNear: true, until: (s) => s.enter.length > 1 });
  await new Promise((r) => setTimeout(r, 900));
  W8.w.document.querySelector('[data-act="bot"]').click();
  const t8 = Date.now() + 40000;
  while (Date.now() < t8 && !W8.sent.sel.includes('g:2')) await new Promise((r) => setTimeout(r, 300));
  W8.w.close();
  const W9 = world({ cfg: { riftDepthMode: 'max', hunt: true }, evt: true, until: (s) => s.enter.length > 1 });
  await new Promise((r) => setTimeout(r, 900));
  W9.w.document.querySelector('[data-act="bot"]').click();
  const t9 = Date.now() + 60000;
  while (Date.now() < t9 && !W9.sent.sel.includes('hb:1')) await new Promise((r) => setTimeout(r, 300));
  W9.w.close();
  const okO = W9.sent.leave >= 1 && W9.sent.sel.includes('hb:1') && W9.sent.enter.length === 1; // abgestiegen sein darf er schon (Event beginnt 1,5 s nach Etage 1 – unter Last später)
  const s8 = W8.sent.sel, okN = s8.includes('n:g') && s8.indexOf('n:g') < s8.indexOf('g:2');
  const fsel = W.sent.sel.filter((x) => x === 'a:att' || x === 'h:heal');
  const okF = fsel[0] === 'h:heal';
  const gsel = W.sent.sel.filter((x) => x === 'a:att' || x === 'h:far');
  const okG = gsel[0] === 'a:att';
  console.log(okA ? 'OK     A: höchstmögliche Tiefe nach Partner-Level (4)' : `FEHLER A: ${W.sent.enter[0]}`);
  console.log(okB ? 'OK     B: Patch overclock gewählt' : `FEHLER B: ${W.sent.patch.join(',')}`);
  console.log(okC ? 'OK     C: 3 Etagen, Guardian besiegt, Rift verlassen' : `FEHLER C: descend ${W.sent.descend} leave ${W.sent.leave}`);
  console.log(okD ? 'OK     D: zweiter Lauf gestartet' : 'FEHLER D');
  console.log(okE ? 'OK     E: feste Tiefe 2' : `FEHLER E: ${W2.sent.enter.join(',')}`);
  console.log(okF ? 'OK     F: Heiler zuerst' : `FEHLER F: ${fsel.join(',')}`);
  console.log(okG ? 'OK     G: ferner Heiler einer anderen Gruppe nicht vorgezogen' : `FEHLER G: ${gsel.join(',')}`);
  console.log(okH ? 'OK     H: markierter Alpha (Boss-Flag) wird angegriffen' : `FEHLER H: ${W3.sent.sel.join(',')}`);
  console.log(okI ? 'OK     I: erst der nahe Gegner, dann der ferne Alpha' : `FEHLER I: ${s4.join(',')}`);
  console.log(okJ ? 'OK     J: Gegner am Weg vor dem Abstieg erledigt' : `FEHLER J: ${s4.join(',')}`);
  console.log(okK ? 'OK     K: wenig HP – erholt sich vor dem Weiterlaufen' : 'FEHLER K');
  console.log(okM ? 'OK     M: Guardian weit weg – erst die Gegner auf dem Weg' : `FEHLER M: ${s7.join(',')}`);
  console.log(okN ? 'OK     N: Guardian nah – trotzdem erst der andere Gegner' : `FEHLER N: ${s8.join(',')}`);
  console.log(okO ? 'OK     O: Event im Rift – hinaus und Event-Boss angegriffen' : `FEHLER O: leave ${W9.sent.leave} enter ${W9.sent.enter.length} descend ${W9.sent.descend} sel ${W9.sent.sel.join(',')}`);
  console.log(okP ? 'OK     P: erst Hauptweg, Sackgasse zuletzt' : `FEHLER P: zuerst ${firstExplore || '–'}`);
  console.log(okQ ? 'OK     Q: vom fernen Angreifer zum nahen gewechselt' : `FEHLER Q: ${W11.sent.sel.join(',')}`);
  console.log(okL ? `OK     L: Suchradius 150 gilt im Rift (angegriffen bei ${W6.sent.midD} px)` : `FEHLER L: angegriffen bei ${W6.sent.midD} px`);
  process.exit(okA && okB && okC && okD && okE && okF && okG && okH && okI && okJ && okK && okL && okM && okN && okO && okP && okQ ? 0 : 1);
})();
