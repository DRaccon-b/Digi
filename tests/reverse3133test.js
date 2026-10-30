// 3.1.33: Vorschläge H1–H7 aus dem Reverse-Bericht (Spieldaten 30.10.)
//  megiddo  – H5: Megiddo Flame (90 % der Max-HP, bricht nicht): F1 hält die HP schon vorher über 95 %, bei voller HP
//             während der 12-s-Ladung drinbleiben und weiterschlagen; ohne Trank und mit zu wenig HP: herauslaufen
//  spirytus – H5: Spirytus Breath (Stärke 5000, Kreis 640 um den Boss, bricht nicht): auch ohne Warnkreis des Spiels
//             aus dem Kreis laufen
//  refuse   – H1: Ablehnung kommt als Systemzeile im Chat (code invalid_target) → Ziel übersprungen
//  rules    – H2 isStory a3, H3 mapOpen/mapWalkable, H7 teleportTargets ohne gesperrte Ziele (Funktionen aus dem Skript)
//  warp     – H4: Warp braucht ceil(1,1·Kosten) Tamer-DS → erst F3, kein Fehlversuch
//  share    – H6: geteilter Treffer in der Gruppe (ohne Key of Hope): zum Ziel des Treffers laufen statt auszuweichen
// Aufruf: node tests/reverse3133test.js <script> [teil]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const scriptPath = path.resolve(process.argv[2] || '');
const part = process.argv[3];
const PARTS = ['megiddo', 'megiddolow', 'spirytus', 'refuse', 'rules', 'warp', 'share'];
if (!part) {
  let ok = true;
  for (const p of PARTS) {
    const r = spawnSync(process.execPath, [__filename, scriptPath, p], { cwd: __dirname, encoding: 'utf8', timeout: 120000 });
    process.stdout.write(`--- ${p} ---\n${r.stdout || ''}${r.stderr || ''}`);
    if (r.status !== 0) ok = false;
  }
  console.log(ok ? 'ALLES OK' : 'FEHLER');
  process.exit(ok ? 0 : 1);
}
const makeWorld = require('./gw');
const script = fs.readFileSync(scriptPath, 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const done = () => { const ok = results.length > 0 && results.every(Boolean); console.log(ok ? 'TEIL OK' : 'TEIL FEHLER'); process.exit(ok ? 0 : 1); };
const Q = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } };
const HOTBAR = ['cmd:attack', null, null, null, null, null, null, null, 'item:hp_pot'];

// Boss mit Lade-Angriff; liefert Welt, Ereignis-Haken und gedrückte Tasten
function bossWorld({ species, skill, charge, hp = 3000, pots = 20, bossAt = { x: 560, y: 330 } }) {
  const G = makeWorld({ slot: 0, tag: species, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: Q,
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'b:1', kind: 2, defId: species, x: bossAt.x, y: bossAt.y, hp: 900000, maxHp: 1000000, level: 120, flags: 16, targetId: 'p:me' }] : []),
    setup({ content }) {
      content.skills = { [skill.id]: skill };
      content.digimon[species] = { name: species, radius: 7, skills: [skill], base: { at: 2000 } };
      content.worldBosses = { [species]: { id: species, species, skills: [skill], charge } };
    } });
  G.handlers = {};
  G.w.dmo.net.on = (name, fn) => { G.handlers[name] = fn; return () => {}; };
  G.scene = G.w.dmo.game.scene.getScene('world');
  G.scene.telegraphs = { active: [], marksActive: [], circles: [] }; G.scene.mechB = { lines: [] };
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, hotbar: HOTBAR, inventory: pots ? [{ itemId: 'hp_pot', qty: pots }] : [], partner: { ...st0.me.partner, hp, maxHp: 3000 } } });
  G.keys = [];
  G.w.addEventListener('keydown', (e) => {
    G.keys.push({ code: e.code, at: Date.now() });
    if (e.code === 'F1') { const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, hp: Math.min(3000, s.me.partner.hp + 600) } } }); }
  }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 30, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 200 }));
  G.w.eval(script);
  return G;
}
const setHp = (G, hp) => { const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, hp } } }); };
const dist = (G, id, x, y) => { const e = G.ents.get(id); return Math.round(Math.hypot(e.x - x, e.y - y)); };

const MEGIDDO = { id: 'megidramon.megiddo_flame_full', name: 'Megiddo Flame', element: 'fire', shape: 'circle', origin: 'caster', radius: 400, hpDamagePct: 90, castMs: 12000, cooldownMs: 600000, chargeRing: true };
const MEGIDDO_CH = { skill: MEGIDDO.id, atHp: 0.5, breakAtHp: 0, interruptStat: 'as' };

async function megiddo() {
  const G = bossWorld({ species: 'megidramon', skill: MEGIDDO, charge: MEGIDDO_CH, hp: 2600 });
  await wait(800);
  G.store.setState({ target: { id: 'b:1', kind: 'mob', name: 'Megidramon', level: 120, hp: 900000, maxHp: 1000000 } });
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(3000);
  const f1 = G.keys.filter((k) => k.code === 'F1').length;
  check('Vor der Ladung: F1 hält die HP über 95 % (Einstellung 30 %)', f1 >= 1 && G.store.getState().me.partner.hp >= 2850, `F1 ${f1}×, HP ${G.store.getState().me.partner.hp}`);
  setHp(G, 2960);
  G.handlers.evs?.([{ t: 'skill', src: 'b:1', skill: MEGIDDO.id, phase: 'cast' }]);
  const sts = new Set(); let maxD = 0;
  for (let i = 0; i < 15; i++) { await wait(200); sts.add(G.status()); maxD = Math.max(maxD, dist(G, 'p:me', 560, 330)); }
  const atk = G.keys.filter((k) => k.code === 'Digit1').length;
  check('Bei 98 % HP: kein Herauslaufen aus Megiddo Flame', maxD < 300 && ![...sts].some((s) => /Ausweich|Warnkreis|weiche/i.test(s)), `max ${maxD} px vom Boss · ${[...sts].slice(-3).join(' | ')}`);
  check('… und weiter angegriffen', atk >= 2, `${atk}× Taste 1`);
  // Boss-Treffer drückt die HP während der Ladung auf 92 %: kein Pendeln hinaus (Grenze nach dem Drinbleiben 90,5 %)
  setHp(G, 2760); maxD = 0;
  for (let i = 0; i < 6; i++) { await wait(200); maxD = Math.max(maxD, dist(G, 'p:me', 560, 330)); }
  check('Bei 92 % HP mitten in der Ladung: bleibt drin', maxD < 300, `max ${maxD} px · ${G.status()}`);
  G.w.close(); done();
}

async function megiddoLow() {
  const G = bossWorld({ species: 'megidramon', skill: MEGIDDO, charge: MEGIDDO_CH, hp: 2400, pots: 0 });
  await wait(800);
  G.store.setState({ target: { id: 'b:1', kind: 'mob', name: 'Megidramon', level: 120, hp: 900000, maxHp: 1000000 } });
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  G.handlers.evs?.([{ t: 'skill', src: 'b:1', skill: MEGIDDO.id, phase: 'cast' }]);
  let maxD = 0;
  for (let i = 0; i < 50; i++) { await wait(200); maxD = Math.max(maxD, dist(G, 'p:me', 560, 330), dist(G, 't:me', 560, 330)); if (dist(G, 'p:me', 560, 330) > 400 && dist(G, 't:me', 560, 330) > 400) break; }
  check('80 % HP ohne Trank: aus Megiddo Flame (400 px) herausgelaufen', dist(G, 'p:me', 560, 330) > 400 && dist(G, 't:me', 560, 330) > 400, `Digimon ${dist(G, 'p:me', 560, 330)} px, Tamer ${dist(G, 't:me', 560, 330)} px · ${G.status()}`);
  G.w.close(); done();
}

async function spirytus() {
  const SP = { id: 'orochimon.spirytus_breath', name: 'Spirytus Breath', element: 'fire', power: 5000, shape: 'circle', origin: 'caster', radius: 640, castMs: 8000, cooldownMs: 600000, chargeRing: true };
  const G = bossWorld({ species: 'orochimon', skill: SP, charge: { skill: SP.id, atHp: 0.5, breakAtHp: 0, interruptStat: 'as' }, hp: 3000, bossAt: { x: 400, y: 330 } });
  await wait(800);
  G.store.setState({ target: { id: 'b:1', kind: 'mob', name: 'Orochimon', level: 110, hp: 900000, maxHp: 1000000 } });
  for (const id of ['t:me', 'p:me']) { const e = G.ents.get(id); e.x = id === 't:me' ? 440 : 430; e.y = 330; }
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(1200);
  G.handlers.evs?.([{ t: 'skill', src: 'b:1', skill: SP.id, phase: 'cast' }]);
  const t0 = Date.now(); let out = 0;
  while (Date.now() - t0 < 8000) { await wait(200); if (dist(G, 'p:me', 400, 330) > 640 && dist(G, 't:me', 400, 330) > 640) { out = Date.now() - t0; break; } }
  check('Spirytus Breath: vor dem Einschlag (8 s) aus dem 640-px-Kreis', out > 0, `nach ${out} ms · Digimon ${dist(G, 'p:me', 400, 330)} px, Tamer ${dist(G, 't:me', 400, 330)} px · ${G.status()}`);
  G.w.close(); done();
}

async function refuse() {
  const G = makeWorld({ slot: 0, tag: 'R', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: Q,
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'm:x', kind: 2, defId: 'kunemon', x: 470, y: 330, hp: 5000, maxHp: 5000, level: 6, flags: 0 }] : []) });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, radius: 500 }));
  // alte Zeile ohne Zeitstempel vor dem Start: darf nicht zählen
  G.store.setState({ chat: [{ channel: 'system', notice: true, code: 'unreachable' }] });
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  for (let i = 0; i < 20 && G.store.getState().target?.id !== 'm:x'; i++) await wait(200);
  await wait(400);
  const before = G.w.document.body.textContent;
  check('Alte Chatzeile beim Start ignoriert', !/kommt nicht hin/.test(before));
  G.store.setState({ chat: [...G.store.getState().chat, { channel: 'system', notice: true, code: 'invalid_target', params: {}, ts: Date.now() }] });
  let hit = false;
  for (let i = 0; i < 15 && !hit; i++) { await wait(200); hit = /ungültiges Ziel/.test(G.w.document.body.textContent); }
  check('Systemzeile invalid_target im Chat → Ziel übersprungen', hit, G.status());
  G.w.close(); done();
}

function rules() {
  // Funktionen aus dem Skript herauslösen und mit kleinen Spieldaten prüfen
  const grab = (re) => { const m = script.match(re); if (!m) throw new Error('nicht gefunden: ' + re); return m[0]; };
  const isStorySrc = grab(/const isStory = [^\n]*/);
  const fnSrc = (name) => { const i = script.indexOf(`function ${name}(`); let d = 0, j = script.indexOf('{', i); for (let k = j; k < script.length; k++) { if (script[k] === '{') d++; else if (script[k] === '}' && --d === 0) return script.slice(i, k + 1); } throw new Error(name); };
  const C = { maps: {
    a3safe: { id: 'a3safe', series: 3, safe: true, entryQuest: 'a3_01' },
    a3open: { id: 'a3open', series: 3, safe: false, entryQuest: 'a3_02', entryQuestState: 'accepted' },
    a3done: { id: 'a3done', series: 3, safe: false, entryQuest: 'a3_03' },
    a2map: { id: 'a2map', series: 2, entryQuest: 'a2_05' }, plain: { id: 'plain' } } };
  const mk = new Function('content', 'getStore', `${isStorySrc}
${fnSrc("mapOpen")}
${fnSrc("mapWalkable")}
return { isStory, mapOpen, mapWalkable };`);
  const f = mk(() => C, () => null);
  check('H2: a3-Story erkannt', f.isStory('a3_02b_blue') && f.isStory('a3q_x') && f.isStory('a2_01_x') && !f.isStory('a3daily_x'));
  const st = (q, mapId = 'plain') => ({ world: { mapId }, me: { quests: q } });
  check('H3: angenommen reicht nicht ohne entryQuestState', !f.mapOpen(st({ a3_03: { state: 1 } }), 'a3done') && f.mapOpen(st({ a3_03: { state: 3 } }), 'a3done'));
  check('H3: entryQuestState accepted: angenommen reicht', f.mapOpen(st({ a3_02: { state: 1 } }), 'a3open') && !f.mapOpen(st({}), 'a3open'));
  check('H3: aktuelle Map gilt als offen', f.mapOpen(st({}, 'a3done'), 'a3done'));
  check('H3: zu Fuß: angenommen reicht außerhalb von A3 ohne Schutzzone', f.mapWalkable(st({ a2_05: { state: 1 } }), 'a2map') && f.mapWalkable(st({ a3_01: { state: 1 } }), 'a3safe') && !f.mapWalkable(st({ a3_03: { state: 1 } }), 'a3done'));
  const tt = new Function('content', 'performance', `${fnSrc('teleportTargets')};return teleportTargets;`)(() => ({ maps: { m1: {}, m2: {}, m3: {} } }), { now: () => 1000 });
  const ids = tt({ world: { mapId: 'here' }, teleport: { mapId: 'here', at: 900, maps: [{ mapId: 'm1', unlocked: true }, { mapId: 'm2', unlocked: false }, { mapId: 'm3' }] } });
  check('H7: gesperrte Teleport-Ziele übersprungen', ids.join() === 'm1,m3', ids.join());
  done();
}

async function warp() {
  const G = makeWorld({ slot: 0, tag: 'W', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } } });
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, tamerDs: 105, tamerMaxDs: 360, hotbar: ['cmd:attack', null, null, null, null, null, null, null, null, null, 'item:food'], inventory: [{ itemId: 'food', qty: 5 }],
    partner: { ...st0.me.partner, level: 35, species: 'patamon', evolutions: [
      { species: 'patamon' }, { species: 'angemon', from: 'patamon', canEvolveNow: false, level: 11, dsCost: 60 },
      { species: 'magnaangemon', from: 'angemon', canEvolveNow: false, level: 30, dsCost: 80, warp: { dsCost: 100 } }] } } });
  const evolved = [];
  G.w.dmo.game.scene.getScene('world').deps.commands.evolve = (sp, a, w) => { evolved.push(sp + (w ? '(warp)' : '')); };
  const keys = [];
  G.w.addEventListener('keydown', (e) => { keys.push(e.code); if (e.code === 'F3') { const s = G.store.getState(); G.store.setState({ me: { ...s.me, tamerDs: 360 } }); } }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, apEvo: 'magnaangemon', evoWarp: true }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(7000);
  const f3 = keys.indexOf('F3');
  check('H4: 105 Tamer-DS bei Warp-Kosten 100 (braucht 110): erst F3', f3 >= 0, `Tasten: ${keys.filter((k) => k.startsWith('F')).join(',')} · Digitation: ${evolved.join(',')}`);
  check('… danach Warp', evolved.includes('magnaangemon(warp)'), evolved.join(','));
  G.w.close(); done();
}

async function share() {
  const SH = { id: 'tamers_x.cannon', name: 'Share Cannon', shape: 'circle', radius: 64, telegraph: true, share: { target: 'rotate', minPartners: 3 }, castMs: 4000, cooldownMs: 30000, power: 400 };
  const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'a', char: 'A' }, { on: true, user: 'b', char: 'B' }] };
  const wins = [0, 1].map((slot) => {
    const W = makeWorld({ slot, accounts, tag: 'SH' + slot, quests: Q,
      extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'tamersboss', x: 520, y: 330, hp: 900000, maxHp: 900000, level: 80, flags: 16 }] : []),
      setup({ content }) { content.skills = { [SH.id]: SH }; content.digimon.tamersboss = { name: 'Boss', skills: [SH] }; } });
    W.handlers = {};
    W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
    const sc = W.w.dmo.game.scene.getScene('world');
    sc.telegraphs = { active: [], marksActive: [], circles: [] }; sc.mechB = { lines: [] };
    W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', dodge: true }));
    W.w.eval(script);
    return W;
  });
  await wait(1200);
  wins[0].w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
  // B steht weit weg; der Treffer gilt dem Digimon von A (bei B: Fremd-Entität 'p:a' an A's Position)
  { const t = wins[1].ents.get('t:me'), p = wins[1].ents.get('p:me'); t.x = 200; t.y = 330; p.x = 210; p.y = 330; }
  const a = wins[0].ents.get('p:me');
  wins[1].ents.set('p:a', { id: 'p:a', kind: 1, x: a.x, y: a.y, hp: 3000, maxHp: 3000, flags: 0 });
  const circ = { x: a.x, y: a.y, r: 64, skill: SH.id };
  for (const W of wins) { const sc = W.w.dmo.game.scene.getScene('world'); sc.telegraphs.active = [circ]; sc.telegraphs.circles = [{ ...circ, skill: { id: SH.id }, end: W.w.performance.now() + 4000 }]; }
  wins[0].handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: SH.id, phase: 'cast', dst: 'p:me' }]);
  wins[1].handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: SH.id, phase: 'cast', dst: 'p:a' }]);
  await wait(800);
  check('Ziel des Treffers hält Position', /auf mir/.test(wins[0].status()), wins[0].status());
  check('Mitspieler läuft in den geteilten Kreis', /geteilten Kreis/.test(wins[1].status()), wins[1].status());
  await wait(2600);
  const p = wins[1].ents.get('p:me'), d = Math.round(Math.hypot(p.x - circ.x, p.y - circ.y));
  check('Vor dem Einschlag: Digimon von B im Kreis (≤ 54 px)', d <= 54, `${d} px`);
  for (const W of wins) W.w.close();
  done();
}

({ megiddo, megiddolow: megiddoLow, spirytus, refuse, rules, warp, share })[part]().catch((e) => { console.log('FEHLER', e); process.exit(1); });
