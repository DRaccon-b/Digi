// 3.2.31 (Nutzer 18.11.): Digital Rift – Ziel-Ei/-Code wählen. Der Bot spielt mindestens die Mindesttiefe des Ziels, startet
// Läufe mit falschem Biom sofort neu und hält an, sobald ein Scan des Ziels bei Clockmon 100 % hat (umwandeln macht der Nutzer).
// U: Ziel-Auswahl im Panel (12 Optionen, „keins“ zuerst, gespeicherter Wert angezeigt).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');

function world({ cfg, deepest = 5, level = 110, until, hunt = false, caution = false, lowHp = false, mid = false, guard = false, guardNear = false, evt = false, mainFirst = false, farKeep = false, bread = false, biomes = [], scans, staleScans = null, scansDelay = 0 }) {
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
  const sent = { enter: [], patch: [], descend: 0, leave: 0, talk: 0, open: 0, sel: [], buy: 0, buyBeforeEnter: 0 };
  let state = {}; const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  let rs = { warden: null, view: null, run: null, patch: null, result: null, scans: staleScans, floorUi: { going: null } };
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
    rs = { ...rs, warden: null, view: null, result: null, floorUi: { going: null }, run: { depth: sent.enter[sent.enter.length - 1], running: true, signal, clockMs: 600000, floor: { n, of: 3 }, portal: { x: 400, y: 500, open: false }, guardian: 'hidden', objective: hunt ? 'hunt' : 'purge', alphaMarks: [], ...(biomes.length ? { biome: biomes[Math.min(runs, biomes.length) - 1] } : {}) } };
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
      if (c === 'open' && state.dialog?.npc === 'rift_warden') { sent.open++; store.setState({ dialog: null }); rs = { ...rs, warden: { npc: 'rift_warden' }, view: { deepest, party: [{ name: 'me', level, problem: '', leader: true }], iLead: true, blocked: null, depths: [] } }; if (scans !== undefined) setTimeout(() => { rs = { ...rs, scans }; }, scansDelay); }
    },
    closeDialog() { store.setState({ dialog: null }); },
    command(name, args) {
      if (name === 'riftShopBuy') {
        const inv = state.me.inventory, q = (id) => inv.filter((i) => i.itemId === id).reduce((n, i) => n + i.qty, 0);
        if (args?.offer !== 'guilmon_bread' || args?.npc !== 'rift_warden' || q('rift_shard') < 30) return;
        sent.buy++; if (!sent.enter.length) sent.buyBeforeEnter++;
        store.setState({ me: { ...state.me, inventory: [{ itemId: 'guilmon_bread', qty: q('guilmon_bread') + 10 }, { itemId: 'rift_shard', qty: q('rift_shard') - 30 }] } });
        return;
      }
      if (name === 'riftEnter') {
        sent.enter.push(args.depth); L(`riftEnter Tiefe ${args.depth}`);
        if (until && until(sent)) return;
        runs++; signal = 0; store.setState({ screen: 'loading' });
        setTimeout(() => { floorStart(1); loadMap(RS, { x: 200, y: 200 }); }, 300);
      } else if (name === 'riftPatch') {
        sent.patch.push(rs.patch?.offers?.[args.pick]?.id); L(`Patch ${rs.patch?.offers?.[args.pick]?.id}`); rs = { ...rs, patch: null };
      } else if (name === 'riftDescend') {
        if (!rs.run?.portal?.open || !near(rs.run.portal.x, rs.run.portal.y, 112)) return;
        sent.descend++; if (sent.descendAt == null) sent.descendAt = sent.enter.length; sent.sel.push('DESCEND'); L('riftDescend'); store.setState({ screen: 'loading' });
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
  if (bread) store.setState({ me: { ...state.me, hotbar: ['cmd:attack', null, null, null, null, null, null, null, 'item:guilmon_bread'], inventory: [{ itemId: 'guilmon_bread', qty: 2 }, { itemId: 'rift_shard', qty: 100 }] } });
  if (lowHp) store.setState({ me: { ...state.me, partner: { ...state.me.partner, hp: 9000 } } });
  loadMap(PV, { x: 808, y: 900 });
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'rift', hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3, tab: 'log', ...cfg }));
  w.eval(script);
  return { w, sent, log, status: () => w.document.querySelector('[data-f="status"]')?.textContent || '', get runs() { return runs; }, on: () => /■ Stopp/.test(w.document.querySelector('[data-act="bot"]')?.textContent || ''), text: () => w.document.body.textContent || '' };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function go(opts, done, ms) {
  const W = world(opts);
  await wait(900);
  if (opts.start !== false) W.w.document.querySelector('[data-act="bot"]').click();
  const end = Date.now() + ms;
  while (Date.now() < end && !(done && done(W))) await wait(200);
  return W;
}
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };
(async () => {
  // U
  const WU = await go({ cfg: { riftDepthMode: 'max', riftTarget: 'egg_gazimon' }, start: false }, null, 0);
  const sel = WU.w.document.querySelector('select[data-apsel="riftTarget"]');
  const opts = sel ? [...sel.options] : [];
  check('U', !!sel && opts.length === 12 && sel.value === 'egg_gazimon' && opts[0].value === 'none' && opts[0].textContent === 'keins', 'Ziel-Auswahl im Panel', () => sel ? `${opts.length} Optionen, Wert ${sel.value}, erste ${opts[0]?.value}/${opts[0]?.textContent}` : 'Auswahl fehlt');
  WU.w.close();
  // B: feste Tiefe 2, Ziel Gazimon-Ei (ab Tiefe 6) -> betritt Tiefe 6
  const WB = await go({ cfg: { riftDepthMode: 'fixed', riftDepth: 2, riftTarget: 'egg_gazimon' }, deepest: 10, level: 130, scans: [], until: () => true }, (W) => W.sent.enter.length, 25000);
  check('B', WB.sent.enter[0] === 6, 'Mindesttiefe 6 hebt feste Tiefe 2 an', () => `betreten ${WB.sent.enter.join(',') || '–'}`);
  WB.w.close();
  // C: Ziel Dorumon-Ei (ab Tiefe 25), freigeschaltet nur bis 10 -> Tiefe 10 wie sonst, Warnung
  const WC = await go({ cfg: { riftDepthMode: 'max', riftTarget: 'egg_dorumon' }, deepest: 10, level: 130, scans: [], until: () => true }, (W) => W.sent.enter.length && /braucht Tiefe 25/.test(W.text()), 25000);
  check('C', WC.sent.enter[0] === 10 && /braucht Tiefe 25/.test(WC.text()), 'Ziel zu tief – normal weiter mit Warnung', () => `betreten ${WC.sent.enter.join(',') || '–'}, Warnung ${/braucht Tiefe 25/.test(WC.text())}`);
  WC.w.close();
  process.exit(res.every(Boolean) ? 0 : 1);
})();
