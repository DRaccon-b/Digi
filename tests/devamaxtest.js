// 3.2.56 (Nutzer 24.11.): Deva-Runde „meiste Kills“. Statt fester Reihe (Ch 1 vorwärts, Ch 2 rückwärts) nimmt der Bot
// immer den Deva, der – Weg eingerechnet – als Nächstes kämpfbar ist: lebende zuerst, sonst der mit dem frühesten
// Respawn (Spawnpunkte wie live weit auseinander – außerhalb der Sichtweite). Live (24.11.) wartete er bis zu 4 min an Pajramon/Sandiramon, während daneben andere Devas wieder lebten.
// A: West Ch 1 – Pajramon Respawn 45 s, Vajramon/Indramon/Kumbhiramon leben -> erst die drei (nicht an Pajramon warten),
//    danach Pajramon.
// B: West Ch 1 alles lange tot, Ch 2 Vajramon lebt -> Kanalwechsel, Vajramon Ch 2 zuerst (keine Reise nach Deva Transit).
// C: West alles lange tot (beide Kanäle), Deva Transit Ch 1 Sandiramon lebt -> hinreisen, Sandiramon zuerst.
// D: West Ch 1: Indramon Respawn 15 s, Pajramon Respawn 40 s, Rest lange tot -> erst Indramon, dann Pajramon
//    (wartet am früheren Respawn, wechselt zum nächsten).
// G/H: siehe unten (Review).
// E: Wartet an Pajramon (Respawn 60 s); 10 s später spawnt Vajramon nebenan neu -> Vajramon mitnehmen, dann Pajramon.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');
const W = 'tamers_west_shinjuku', T = 'tamers_deva_transit';
const tmj = (objs) => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: objs }] });
const P = (k, v) => ({ name: k, type: 'string', value: v });
const MAPS = {
  [W]: tmj([
    { type: 'portal', name: 't', x: 860, y: 300, width: 32, height: 64, properties: [P('toMap', T), P('toSpawn', 'from_w')] },
    { type: 'spawn', name: 'from_t', x: 820, y: 330 },
    { type: 'spawn', name: 'boss_p', x: 200, y: 450 }, { type: 'spawn', name: 'boss_v', x: 1700, y: 450 },
    { type: 'spawn', name: 'boss_i', x: 1700, y: 1700 }, { type: 'spawn', name: 'boss_k', x: 200, y: 1700 },
  ]),
  [T]: tmj([
    { type: 'portal', name: 'w', x: 0, y: 300, width: 32, height: 48, properties: [P('toMap', W), P('toSpawn', 'from_t')] },
    { type: 'spawn', name: 'from_w', x: 48, y: 324 },
    { type: 'spawn', name: 'boss_s1', x: 300, y: 1500 }, { type: 'spawn', name: 'boss_s2', x: 1700, y: 1700 },
  ]),
};
const DEV = {
  [W]: [['pajiramon', 107, 'boss_p'], ['vajramon', 107, 'boss_v'], ['indramon', 108, 'boss_i'], ['kumbhiramon', 109, 'boss_k']],
  [T]: [['sandiramon', 104, 'boss_s2'], ['sinduramon', 106, 'boss_s1']],
};
const NAMES = { pajiramon: 'Pajramon', vajramon: 'Vajramon', indramon: 'Indramon', kumbhiramon: 'Kumbhiramon', sinduramon: 'Sinduramon', sandiramon: 'Sandiramon' };
const LONG = 600000;

function run(name, init, { secs = 60, stopAt = 99, start = { map: W, x: 300, y: 450 }, omit = [], invuln = [], view = 700 } = {}) {
  return new Promise((resolve) => {
    const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
    const w = dom.window;
    w.HTMLCanvasElement.prototype.getContext = () => null;
    const content = {
      digimon: Object.fromEntries(Object.entries(NAMES).map(([k, n]) => [k, { name: n }])),
      items: {}, npcs: {}, quests: {}, dailyById: {},
      maps: { [W]: { id: W, name: 'West Shinjuku', levelRange: [105, 110] }, [T]: { id: T, name: 'Deva Transit', levelRange: [102, 107] } },
      spawns: Object.fromEntries(Object.entries(DEV).map(([m, l]) => [m, { zones: {}, bosses: l.map(([sp, lv, at]) => ({ species: sp, level: lv, at, respawnMs: 300000, namedElite: true })) }])),
    };
    const t0 = Date.now();
    const readyAt = {};
    for (const [k, v] of Object.entries(init)) readyAt[k] = t0 + v; // fehlt: lebt
    const kills = [], log = [], sel = [], stat = [];
    const L = (s) => log.push(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`);
    let state = {};
    const subs = [];
    const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
    const ents = new Map();
    let mapId = start.map, ch = 1, mapChanges = 0;
    const spot = (m, at) => MAPS[m].layers[0].objects.find((o) => o.name === at);
    // wie live: der Server schickt nur Monster in Sichtweite (VIEW px um den Tamer)
    const VIEW = view;
    function spawnDevas() {
      const t = ents.get('t:me');
      for (const [sp, lv, at] of DEV[mapId]) {
        const k = `${sp}#${ch}`, p = spot(mapId, at), id = `d:${sp}:${ch}`;
        const near = !t || Math.hypot(t.x - p.x, t.y - p.y) <= VIEW;
        if (!near) { ents.delete(id); continue; } // außer Sicht (HP bleiben im Spiel – hier reicht: lebt weiter)
        if ((readyAt[k] ?? 0) <= Date.now() && !ents.has(id)) ents.set(id, { id, kind: 2, defId: sp, level: lv, x: p.x, y: p.y, hp: 400, maxHp: 400, flags: 1024, targetId: '' });
      }
    }
    function loadMap(id, sp, channel = 1) {
      if (id !== mapId) mapChanges++;
      mapId = id; ch = channel;
      for (const k of [...ents.keys()]) if (k !== 't:me' && k !== 'p:me') ents.delete(k);
      const t = ents.get('t:me'), p = ents.get('p:me');
      if (sp) { t.x = sp.x; t.y = sp.y; p.x = sp.x + 10; p.y = sp.y; }
      spawnDevas();
      store.setState({ screen: 'world', world: { mapId: id, mapName: content.maps[id].name, channel: ch, roomId: `${id}-${ch}` }, target: null, mapInfo: null, dialog: null });
      L(`Map ${content.maps[id].name} Ch ${ch}`);
    }
    const timers = [setInterval(spawnDevas, 200)];
    ents.set('t:me', { id: 't:me', kind: 0, x: start.x, y: start.y, hp: 1, flags: 0, targetId: '' });
    ents.set('p:me', { id: 'p:me', kind: 1, x: start.x + 10, y: start.y, hp: 1, flags: 0, targetId: '' });
    let goal = null;
    timers.push(setInterval(() => {
      const t = ents.get('t:me');
      if (!goal || state.screen !== 'world') return;
      const dx = goal.x - t.x, dy = goal.y - t.y, d = Math.hypot(dx, dy);
      if (d <= 20) { t.x = goal.x; t.y = goal.y; goal = null; } else { t.x += (dx / d) * 20; t.y += (dy / d) * 20; }
      const p = ents.get('p:me'); p.x = t.x + 10; p.y = t.y;
      for (const o of MAPS[mapId].layers[0].objects) {
        if (o.type !== 'portal') continue;
        if (t.x >= o.x && t.x <= o.x + o.width && t.y >= o.y && t.y <= o.y + o.height) {
          const to = o.properties.find((q) => q.name === 'toMap').value, sp = o.properties.find((q) => q.name === 'toSpawn').value;
          goal = null; store.setState({ screen: 'loading' });
          setTimeout(() => loadMap(to, spot(to, sp), 1), 300); // nach Mapwechsel immer Ch 1 (wie live)
          break;
        }
      }
    }, 50));
    const info = (sp, c) => { const r = (readyAt[`${sp}#${c}`] ?? 0) - Date.now(); return r <= 0 ? { hp: 100 } : { respawnInMs: r }; };
    const commands = {
      requestBossPins() {},
      requestMapInfo() {
        const m = mapId, c = ch;
        setTimeout(() => { if (m === mapId && c === ch) store.setState({ mapInfo: { bosses: DEV[m].map(([sp], index) => ({ index, species: sp, ...info(sp, c) })).filter((e) => !omit.includes(e.species)), zones: [], mapId: m, roomId: `${m}-${c}`, at: w.performance.now() } }); }, 80);
      },
      async listChannels() { return [1, 2].map((c) => ({ roomId: `${mapId}-${c}`, mapId, channel: c, clients: 3, maxClients: 50 })); },
      async switchChannel(roomId) { const c = Number(roomId.split('-').pop()); store.setState({ screen: 'loading' }); setTimeout(() => loadMap(mapId, null, c), 300); },
      talk() {}, chooseDialog() {}, teleportList() {}, teleport() {}, closeDialog() { store.setState({ dialog: null }); }, partnerFollow() {},
    };
    const scene = {
      deps: { content, commands, assetsBase: '/assets/', manifest: { maps: Object.fromEntries(Object.keys(MAPS).map((m) => [m, { tmj: `maps/${m}.tmj` }])) } },
      map: { grid: { w: 120, h: 120, tile: 16, blocked: new Uint8Array(120 * 120) } },
      controlledId: () => 't:me',
      tapGround: (x, y) => { goal = { x, y }; },
      select: (id) => { sel.push({ id, t: (Date.now() - t0) / 1000 }); const e = ents.get(id); store.setState({ target: e ? { id, kind: 'mob', name: content.digimon[e.defId].name, level: e.level, hp: e.hp, maxHp: e.maxHp } : null }); },
      telegraphs: { active: [], mirrors: [] }, mechB: { lines: [] },
    };
    w.fetch = async (url) => ({ ok: true, status: 200, json: async () => MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] });
    w.dmo = { store, net: { state: { entities: ents }, connected: true, transferring: false }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
    w.addEventListener('keydown', (e) => {
      if (e.code !== 'Digit1' || !state.target) return;
      const m = ents.get(state.target.id);
      if (!m || m.hp <= 0 || invuln.includes(m.defId)) return;
      const t = ents.get('t:me');
      if (Math.hypot(m.x - t.x, m.y - t.y) > 320) return;
      m.hp = Math.max(0, m.hp - 200);
      store.setState({ target: { ...state.target, hp: m.hp } });
      if (m.hp === 0) {
        ents.delete(m.id);
        readyAt[`${m.defId}#${ch}`] = Date.now() + 300000;
        kills.push({ k: `${m.defId}#${ch}`, t: (Date.now() - t0) / 1000, maps: mapChanges });
        L(`BESIEGT: ${m.defId} Ch ${ch}`);
      }
    }, true);
    store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, world: { mapId, channel: 1, roomId: `${mapId}-1` }, target: null,
      me: { tamerEntityId: 't:me', tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack'], inventory: [], quests: {}, bits: 5000,
        partner: { entityId: 'p:me', name: 'Gabumon', level: 110, hp: 3000, maxHp: 3000, ds: 500, maxDs: 700, exp: 1, expNext: 100, skills: [] } } });
    loadMap(start.map, { x: start.x, y: start.y }, 1);
    mapChanges = 0;
    w.localStorage.setItem('digibot.cfg', JSON.stringify({ farm: true, farmMode: 'deva', farmChannels: [1, 2], hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 3 }));
    w.eval(script);
    const $ = (s) => w.document.querySelector(s);
    let last = '';
    timers.push(setInterval(() => {
      const s = ($('[data-f="status"]') || {}).textContent;
      const short = s && s.replace(/\(\d+ px\)/g, '').replace(/\d+:\d\d/g, 'm:ss').replace(/\s+$/, '');
      if (short && short !== last && !/Greife an|Wehre ab/.test(short)) { last = short; L('> ' + short); stat.push({ s: short, t: (Date.now() - t0) / 1000 }); }
    }, 100));
    setTimeout(() => { $('[data-tab="farm"]').click(); $('[data-act="bot"]').click(); }, 800);
    const end = Date.now() + secs * 1000;
    const chk = setInterval(() => {
      if (kills.length < stopAt && Date.now() < end) return;
      clearInterval(chk); timers.forEach(clearInterval);
      const devainfo = ($('[data-f="devainfo"]') || {}).textContent || '';
      w.close();
      resolve({ name, kills, log, devainfo, sel, stat });
    }, 250);
  });
}

(async () => {
  const deadT = { 'sandiramon#1': LONG, 'sinduramon#1': LONG, 'sandiramon#2': LONG, 'sinduramon#2': LONG };
  const deadW2 = { 'pajiramon#2': LONG, 'vajramon#2': LONG, 'indramon#2': LONG, 'kumbhiramon#2': LONG };
  const allW = { 'pajiramon#1': LONG, 'vajramon#1': LONG, 'indramon#1': LONG, 'kumbhiramon#1': LONG };
  const [A, B, C, D, E, G, H] = await Promise.all([
    run('A', { 'pajiramon#1': 45000, ...deadW2, ...deadT }, { secs: 90, stopAt: 4 }),
    run('B', { 'pajiramon#1': LONG, 'vajramon#1': LONG, 'indramon#1': LONG, 'kumbhiramon#1': LONG, 'pajiramon#2': LONG, 'indramon#2': LONG, 'kumbhiramon#2': LONG, ...deadT }, { secs: 45, stopAt: 1 }),
    run('C', { 'pajiramon#1': LONG, 'vajramon#1': LONG, 'indramon#1': LONG, 'kumbhiramon#1': LONG, ...deadW2, 'sinduramon#1': LONG, 'sandiramon#2': LONG, 'sinduramon#2': LONG }, { secs: 60, stopAt: 1 }),
    run('D', { 'pajiramon#1': 40000, 'vajramon#1': LONG, 'indramon#1': 15000, 'kumbhiramon#1': LONG, ...deadW2, ...deadT }, { secs: 75, stopAt: 2 }),
    run('E', { 'pajiramon#1': 60000, 'vajramon#1': 18000, 'indramon#1': LONG, 'kumbhiramon#1': LONG, ...deadW2, ...deadT }, { secs: 95, stopAt: 2, start: { map: W, x: 200, y: 450 } }),
    run('G', { ...allW, ...deadW2, ...deadT, 'indramon#1': LONG }, { secs: 50, omit: ['indramon'], start: { map: W, x: 1700, y: 1500 } }),
    run('H', { ...allW, 'vajramon#1': 0, 'pajiramon#1': 90000, ...deadW2, ...deadT }, { secs: 150, invuln: ['vajramon'], view: 3000, start: { map: W, x: 1600, y: 450 } }),
  ]);
  const res = [];
  const ck = (id, ok, txt, r) => { res.push(ok); console.log(`${ok ? 'OK    ' : 'FEHLER'} ${id}: ${txt}`); if (!ok) console.log('   Kills:', JSON.stringify(r.kills), '\n   ' + r.log.slice(-25).join('\n   ')); };
  const ks = (r) => r.kills.map((x) => x.k);
  ck('A', ks(A).length >= 4 && ['vajramon#1', 'indramon#1', 'kumbhiramon#1'].every((k) => ks(A).slice(0, 3).includes(k)) && ks(A)[3] === 'pajiramon#1',
    'lebende Devas nebenan zuerst, nicht an Pajramon warten; danach Pajramon', A);
  ck('B', ks(B)[0] === 'vajramon#2' && B.kills[0].maps === 0 && B.kills[0].t < 30, 'Ch 1 alles tot: Kanalwechsel, Vajramon Ch 2 ohne Reise', B);
  ck('C', ks(C)[0] === 'sandiramon#1' && C.kills[0].t < 45, 'West alles tot: nach Deva Transit, Sandiramon', C);
  ck('D', ks(D).join(',') === 'indramon#1,pajiramon#1', 'früherer Respawn zuerst (Indramon), dann Pajramon', D);
  ck('E', ks(E).join(',') === 'vajramon#1,pajiramon#1', 'beim Warten an Pajramon den neu gespawnten Vajramon nebenan mitnehmen', E);
  ck('F', /Kill|kämpfbar|nächste/i.test(A.devainfo) && !/vorwärts|rückwärts/.test(A.devainfo), 'Panel beschreibt den Planer (keine feste Reihe mehr)', A);
  // G: Spiel liefert für Indramon keinen Timer (Map-Info ohne ihn), er ist nicht da -> nach kurzer Prüfung weiter (Review: hing
  //    endlos auf „prüfe Timer…“, weil die Frist an der alle 5 s neu gestellten Map-Abfrage gemessen wurde)
  const gI = G.stat.findIndex((x) => /Indramon Ch 1 · prüfe/.test(x.s));
  const gAway = gI >= 0 && G.stat.slice(gI + 1).find((x) => /Deva-Runde: /.test(x.s) && !/Indramon Ch 1/.test(x.s));
  ck('G', gI >= 0 && !!gAway && gAway.t < 45, 'kein Timer für Indramon: nach kurzer Prüfung weiter statt endlos „prüfe Timer…“', { ...G, kills: G.stat.slice(-12) });
  // H: Vajramon in Sicht, nimmt aber keinen Schaden -> der Planer gibt ihn auf, besiegt Pajramon (Respawn 90 s) und wählt
  //    Vajramon danach nicht wieder als Ziel, auch wenn er wieder in Sicht ist (Review: Sicht hob die Sperre auf -> Schleife).
  //    Die allgemeine Kampfroutine sperrt „unerreichbare“ Ziele selbst nur 1 min – das gilt in allen Modi und ist hier nicht Thema.
  const hOff = H.stat.find((x) => /Vajramon Ch 1 · (nicht zu finden|kein Kampf möglich)/.test(x.s));
  const hBack = hOff && H.stat.find((x) => x.t > hOff.t && /Deva-Runde: Vajramon Ch 1 · (laufe hin|greife an)/.test(x.s));
  const hPaj = H.kills.find((x) => x.k === 'pajiramon#1');
  ck('H', !!hOff && !!hPaj && !hBack, 'nicht angreifbarer Deva: Planer gibt ihn auf und wählt ihn nicht gleich wieder', { ...H, kills: [...H.kills, hOff, hBack] });
  console.log(res.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(res.every(Boolean) ? 0 : 1);
})();
