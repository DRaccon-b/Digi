// 3.2.51 (live 22.11., Bauzel: Beelzebumon Lv 130, Quest-Autopilot in der Gruppe mit Tank): Fernkämpfer halten Abstand.
// Bisher lief der Bot mit Fernkämpfern (basic.range 192, Blast Mode 208) bis auf 24–111 px an das Ziel heran (Boss-Anmarsch für
// angesagte normale Mobs, Tank-Sperre, „Nächstes Ziel“, Annäherung beim Ausweichen). Jeder Fall läuft mit einem Fernkämpfer
// (beelzemon, 192) UND einem Nahkämpfer (agumon, 32) – der Nahkämpfer muss sich wie bisher verhalten.
// Einheitentest: die Funktionen werden aus dem Skript gelöst und in einer kleinen Testumgebung (Stubs) ausgeführt.
//  T1  Boss-Anmarsch nur für echte Bosse (FLAG.Boss / Boss-Fokus), nicht für angesagte normale Mobs (focusAssist)
//  T2  Boss-Anmarsch: Laufziel auf Reichweite · Hysterese (Partner greift an: kein Neustart) · 260 px: Anmarsch startet
//  T3  Zugang frei: Mob 5 px neben gesperrter Kachel bzw. ohne Raster -> bereit
//  T4  Quest-Jagd: Laufziel vor der Beute auf Reichweite · „Nächstes Ziel“: Stopp-Tap (nicht beim Ausweich-Lauf)
//  T5  Tank-Sperre: Stopp, partnerStop bei eigenem Angriff, Fernkämpfer-Warteplatz außerhalb der Warnzonen
//  T6  Ausweichen: Warteplatz auf Reichweite, kein partnerFollow in Reichweite, ein partnerStop vor der 1 „ohne Annäherung“
//  T7  Blast Mode: defId (208) vor species (192)
//  T8  Gruppe folgen: Fernkämpfer-Laufziel im Gruppenabstand neben dem Leader, kein Stopp/Go hinter einem laufenden Leader
//  T2e–h (Review): Wand zwischen Haltepunkt und Boss, Rückfall auf den Boss, angreifendes Digimon hinter Wand, Hysterese nur frei
//  TW  Spielwelt (fakeworld): Fernkämpfer, Boss hinter einer Wand – greift nach dem Anmarsch an, kein Dauerstehen
const fs = require('fs');
const script = fs.readFileSync(process.argv[2], 'utf8');
const res = [];
const check = (id, ok, info) => { res.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + id, info === undefined ? '' : JSON.stringify(info)); };
const fnSrc = (name) => {
  const i = script.indexOf(`function ${name}(`); if (i < 0) return null;
  let d = 0; const j = script.indexOf('{', script.indexOf(')', i));
  for (let k = j; k < script.length; k++) { if (script[k] === '{') d++; else if (script[k] === '}' && --d === 0) return script.slice(i, k + 1); }
  return null;
};
const NAMES = ['zoneDist', 'digibotDodgeZoneSafe', 'digibotDodgeZonePath', 'digibotDodgeGridClear', 'digibotOutsideStop', 'digibotBossWalkIn', 'digibotDodgeApproach',
  'followLeader', 'digibotBasicRange', 'digibotRangeStand', 'digibotRangeSpot', 'digibotStopRun', 'digibotBossLike', 'digibotNextStop', 'digibotTankHold',
  'digibotPreStop', 'digibotPreyGoal', 'digibotFollowPoint', 'digibotPartnerInReach', 'digibotRangeLineClear'];
const CONSTS = ['BASIC_RANGED_MIN', 'BOSS_WALK_FOCUS', 'BOSS_SPOT_WAIT_MS', 'BOSS_SPOT_STALL_MS'].map((n) => (script.match(new RegExp(`const ${n} = [^;]+;`)) || [null])[0]).filter(Boolean);
const SRC = [...CONSTS, ...NAMES.map(fnSrc).filter(Boolean)].join('\n');
const FLAG = { Moving: 1, Evolving: 4, Casting: 128, Held: 8192, Dead: 2, InCombat: 8, Boss: 16, Aggressive: 32, Hidden: 64, Untargetable: 256, Elite: 1024 };
const KIND = { Tamer: 0, Partner: 1, Mob: 2, Npc: 3 };
const SPECIES = { R: 'beelzemon', M: 'agumon' };

// Testwelt: Ziel b:1 bei (1000,1000), Tamer t:me, Digimon p:me; ctl: wer gesteuert wird
function makeEnv({ kind = 'R', ctl = 'tamer', partner = { x: 1400, y: 1000 }, tamer = { x: 1410, y: 1000 }, boss = { x: 1000, y: 1000 }, zones = [], grid, defId, bossFlags = FLAG.Boss } = {}) {
  const ents = new Map();
  const T = { id: 't:me', kind: 0, flags: 0, targetId: '', hp: 1, ...tamer };
  const P = { id: 'p:me', kind: 1, flags: 0, targetId: '', hp: 3000, defId: defId || SPECIES[kind], ...partner };
  const B = { id: 'b:1', kind: 2, defId: 'bossmon', flags: bossFlags, targetId: '', hp: 50000, maxHp: 50000, level: 120, ...boss };
  [T, P, B].forEach((e) => ents.set(e.id, e));
  const rec = { taps: [], walks: [], follows: 0, stops: 0, keys: [] };
  const C = { digimon: { beelzemon: { name: 'Beelzemon', radius: 7, basic: { range: 192 } }, beelzemon_blast: { name: 'Beelzemon Blast Mode', radius: 7, basic: { range: 208 } },
    agumon: { name: 'Agumon', radius: 7, basic: { range: 32 } }, bossmon: { name: 'Bossmon', radius: 7 } } };
  const scene = { map: { grid: grid === undefined ? { w: 200, h: 200, tile: 16, blocked: new Uint8Array(200 * 200) } : grid }, controlledId: () => (ctl === 'tamer' ? 't:me' : 'p:me'),
    tapGround: (x, y) => rec.taps.push({ x, y }) };
  const env = {
    FLAG, KIND, DODGE_MARGIN: 28, DODGE_EDGE_MARGIN: 8, DODGE_HOLD_RANGE: 220, DODGE_BASIC_PAD: 4, DODGE_BASIC_RANGE: 32, DODGE_GOAL_REACHED: 12, DODGE_SOON_PAD: 70,
    FAN_APEX_R: 64, FAN_REAR_DEG: 40, FAN_REAR_R: 30, FAN_SAFE_DEG: 25, ATTACK_REPEAT_MS: 1500, SAFE_MARGIN: 10,
    cfg: { dodge: true }, window: { dmo: { net: { state: { entities: ents } } } },
    content: () => C, worldScene: () => scene, controlled: () => ents.get(scene.controlledId()),
    commands: () => ({ partnerFollow: () => { rec.follows++; }, partnerStop: () => { rec.stops++; } }),
    autopilot: { nav: null, route: null }, blacklist: new Map(), logEvent: () => {},
    bot: { on: true, attackedId: null, engage: null, lastPress: {}, canOk: true, can() { return this.canOk; }, hit(c) { rec.keys.push(c); return true; } },
    walkTo: (st, x, y, now, opt) => { rec.walks.push({ x, y, opt }); env.autopilot.nav = { tx: x, ty: y, wp: { x, y } }; return 300; },
    dangerZones: () => zones, safeRectAt: () => null, pathField: () => null, pathFree: () => true,
    noFightEarly: () => false, digibotBossPeace: () => false, mirrorActive: () => false,
    digibotBossWalk: null, digibotAttackTravel: null,
    dodgeState: { active: false, lastTap: 0, lastFollow: 0, goal: null, late: false, basicTarget: null, lastStop: 0, approachTarget: null, approachStopped: false, approachGoal: null, chase: false, outAt: 0, chaseId: null, chaseAt: 0 },
    digibotCombat: { waiting: () => false }, digibotCombatPolicy: () => null, digibotCombatInputReason: () => null,
    followDist: () => 110, group: { standAt: null, cuIdle: false }, catchupOn: () => false, catchupWait: () => null, travel: () => true, farmSwitch: () => ({ done: true }),
  };
  const proxy = new Proxy(env, { has: (t, k) => typeof k === 'string', get: (t, k) => (k === Symbol.unscopables ? undefined : k in t ? t[k] : globalThis[k]), set: (t, k, v) => { t[k] = v; return true; } });
  // eslint-disable-next-line no-new-func
  const fns = new Function('env', `with (env) { ${SRC}\n return { ${NAMES.map((n) => `${n}: typeof ${n} === 'function' ? ${n} : undefined`).join(', ')} }; }`)(proxy);
  const st = { world: { mapId: 'm1', channel: 1 }, me: { tamerEntityId: 't:me', partner: { entityId: 'p:me', species: SPECIES[kind] } }, target: { id: 'b:1' } };
  return { env, fns, st, ents, T, P, B, rec, scene };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const safe = (id, f) => { try { f(); } catch (e) { check(id, false, { fehler: String(e && e.message || e).slice(0, 120) }); } };
const need = (W, ...names) => { const miss = names.filter((n) => !W.fns[n]); if (miss.length) throw new Error(`fehlt: ${miss.join(', ')}`); };

for (const kind of ['R', 'M']) {
  const R = kind === 'R';
  // T1: normaler Quest-Mob, vom Leader angesagt (focusAssist) – kein Boss-Anmarsch; Gegenprobe mit FLAG.Boss / Boss-Fokus
  safe(`T1-${kind}`, () => {
    const W = makeEnv({ kind }); need(W, 'digibotBossLike');
    const plain = { flags: FLAG.Aggressive }, info = { cat: 'normal', mapBoss: false };
    const a = W.fns.digibotBossLike(plain, info, 'assist', true), b = W.fns.digibotBossLike({ flags: FLAG.Boss }, { cat: 'boss' }, 'assist', true);
    const c = W.fns.digibotBossLike(plain, info, 'hunt', true), d = W.fns.digibotBossLike(plain, info, null, false);
    check(`T1-${kind} angesagter normaler Mob: kein Anmarsch · FLAG.Boss/Boss-Fokus: Anmarsch`, !a && b && c && !d, { assist: a, flagBoss: b, huntFocus: c, ohneFokus: d });
  });
  // T1b (Review 2, Fund 2): vom Leader angesagter Elite-Kartenboss (Bosse-Modus, cat 'elite', ohne eigene Farm-Auswahl) -> weiter Anmarsch
  safe(`T1b-${kind}`, () => {
    const W = makeEnv({ kind }); need(W, 'digibotBossLike');
    const e = W.fns.digibotBossLike({ flags: FLAG.Elite }, { cat: 'elite', mapBoss: false }, 'assist', true);
    check(`T1b-${kind} angesagter Elite-Boss: Anmarsch wie bisher`, e === true, { elite: e });
  });
  // T2a: Anmarsch – Laufziel. Digimon gesteuert: auf Reichweite (Fernkämpfer ≥ stand−24 = 175); Tamer gesteuert: Tamer 160–180 px
  safe(`T2a-${kind}`, () => {
    const W = makeEnv({ kind, ctl: 'partner' });
    const s = W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000);
    const wk = W.rec.walks[0], d = wk ? dist(wk, W.B) : -1;
    const ok = !!s && /Spiel-Wegfindung/.test(s) && (R ? d >= 175 && d <= 200 : d <= 1);
    check(`T2a-${kind} Anmarsch (Digimon gesteuert): Laufziel ${R ? '≥ 175 px vor dem Boss' : 'wie bisher am Boss'}`, ok, { status: s, abstand: Math.round(d) });
  });
  safe(`T2b-${kind}`, () => {
    const W = makeEnv({ kind, ctl: 'tamer' });
    const s = W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000);
    const wk = W.rec.walks[0], d = wk ? dist(wk, W.B) : -1;
    const ok = !!s && (R ? d >= 160 && d <= 180 : d <= 1) && W.rec.follows === 1;
    check(`T2b-${kind} Anmarsch (Tamer gesteuert): Laufziel ${R ? '160–180 px' : 'wie bisher am Boss'}, Digimon folgt`, ok, { status: s, abstand: Math.round(d), follows: W.rec.follows });
  });
  // T2c: Hysterese – Digimon greift den Boss aus 199 bzw. 203 px an, Tamer 250 px weg: über mehrere Takte kein Folgen, kein Anmarsch
  for (const pd of [199, 203]) safe(`T2c-${kind}-${pd}`, () => {
    const W = makeEnv({ kind, ctl: 'tamer', partner: { x: 1000 + pd, y: 1000, targetId: 'b:1' }, tamer: { x: 1250, y: 1000 } });
    W.env.bot.attackedId = 'b:1';
    const st = []; for (let i = 0; i < 4; i++) st.push(W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000 + i * 250));
    if (R) check(`T2c-${kind}-${pd} Digimon greift aus ${pd} px an: kein Folgen, kein neuer Anmarsch`, st.every((x) => x === null) && W.rec.follows === 0 && !W.rec.walks.length && W.env.bot.attackedId === 'b:1', { st, follows: W.rec.follows, walks: W.rec.walks.length });
    else check(`T2c-${kind}-${pd} Nahkämpfer wie bisher: Anmarsch mit Folgen`, st.every((x) => /Spiel-Wegfindung/.test(x || '')) && W.rec.follows === 1, { st: st[0], follows: W.rec.follows });
  });
  // T2d: 260 px, Digimon greift nicht an -> Anmarsch startet
  safe(`T2d-${kind}`, () => {
    const W = makeEnv({ kind, ctl: 'tamer', partner: { x: 1260, y: 1000 }, tamer: { x: 1270, y: 1000 } });
    const s = W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000);
    check(`T2d-${kind} 260 px ohne Angriff: Anmarsch startet`, /Spiel-Wegfindung/.test(s || '') && W.rec.walks.length === 1, { status: s });
  });
  // T3: Zugang – Boss 5 px neben gesperrter Kachel, Digimon 150 px weg: bereit; ohne Raster ebenfalls bereit
  safe(`T3-${kind}`, () => {
    const g = { w: 200, h: 200, tile: 16, blocked: new Uint8Array(200 * 200) };
    // Boss bei (1000,1000) in Kachel (62,62) = x 992..1008; Kachel (61,62) (x 976..992) sperren -> 8 px links vom Boss … 5 px: Boss bei x 997
    g.blocked[62 * 200 + 61] = 1;
    const W = makeEnv({ kind, ctl: 'tamer', boss: { x: 997, y: 1000 }, partner: { x: 1147, y: 1000 }, tamer: { x: 1150, y: 1010 }, grid: g });
    const a = W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000);
    const W2 = makeEnv({ kind, ctl: 'tamer', partner: { x: 1150, y: 1000 }, tamer: { x: 1150, y: 1010 }, grid: null });
    const b = W2.fns.digibotBossWalkIn(W2.st, { id: 'b:1', name: 'Bossmon' }, 1000);
    // Nahkämpfer (Review Fund 5): Prüfung wie im alten Stand – die Kachel am Boss und ein fehlendes Raster zählen als nicht frei
    if (R) check(`T3-${kind} Boss neben gesperrter Kachel bzw. ohne Raster: bereit (kein Anmarsch)`, a === null && b === null, { kachel: a, ohneRaster: b });
    else check(`T3-${kind} Nahkämpfer wie bisher: Kachel 5 px am Boss bzw. ohne Raster -> weiter Anmarsch`, /Spiel-Wegfindung/.test(a || '') && /Spiel-Wegfindung/.test(b || ''), { kachel: a, ohneRaster: b });
  });
  // Wand (Kachelspalte x 1072–1088, y 928–1072) zwischen dem geraden Haltepunkt (1179,1000) und dem Boss (1000,1000)
  const wallGrid = () => { const g = { w: 200, h: 200, tile: 16, blocked: new Uint8Array(200 * 200) }; for (let gy = 58; gy <= 66; gy++) g.blocked[gy * 200 + 67] = 1; return g; };
  // Ring aus gesperrten Kacheln um den Boss (Abstand ~96–112 px): keine freie Linie von außen
  const ringGrid = () => { const g = { w: 200, h: 200, tile: 16, blocked: new Uint8Array(200 * 200) }; for (let gy = 0; gy < 200; gy++) for (let gx = 0; gx < 200; gx++) { const d = Math.hypot((gx + 0.5) * 16 - 1000, (gy + 0.5) * 16 - 1000); if (d >= 96 && d <= 112) g.blocked[gy * 200 + gx] = 1; } return g; };
  if (R) {
    // T2e (Fund 1): Haltepunkt mit verbauter Linie zum Boss -> anderer Winkel; dort angekommen ist der Anmarsch bereit
    safe('T2e', () => {
      const W = makeEnv({ kind, ctl: 'partner', grid: wallGrid() });
      W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000);
      const wk = W.rec.walks[0]; W.P.x = wk.x; W.P.y = wk.y; W.T.x = wk.x + 10; W.T.y = wk.y;
      const s = W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1300);
      check('T2e Wand zwischen Haltepunkt und Boss: anderer Winkel, dort bereit', s === null && Math.abs(wk.y - 1000) > 20, { ziel: wk, status: s });
    });
    // T2h (Fund 1): keine freie Linie (Ring um den Boss) – angekommen, nicht bereit: nach kurzer Zeit wie früher auf den Boss selbst
    safe('T2h', () => {
      const W = makeEnv({ kind, ctl: 'partner', grid: ringGrid() });
      W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000);
      const wk = W.rec.walks[0]; W.P.x = wk.x; W.P.y = wk.y;
      for (const t of [1300, 2500, 4000, 5000]) W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, t);
      const last = W.rec.walks[W.rec.walks.length - 1];
      check('T2h ohne freie Linie: nach Ankunft Rückfall auf den Boss (kein Dauerstehen)', !!last && dist(last, W.B) <= 1, { erst: wk && dist(wk, W.B), zuletzt: last && Math.round(dist(last, W.B)) });
    });
    // T2i (Review 2, Fund 1): kein Winkel mit freier Schusslinie (safe:false) -> sofort wie früher auf den Boss, nicht per nearestSafe ins Leere
    safe('T2i', () => {
      const W = makeEnv({ kind, ctl: 'tamer', grid: ringGrid() });
      W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000);
      const wk = W.rec.walks[0];
      check('T2i kein freier Haltepunkt: gleich auf den Boss (ohne nearestSafe)', !!wk && dist(wk, W.B) <= 1 && !wk.opt?.nearestSafe, { ziel: wk && Math.round(dist(wk, W.B)), opt: wk?.opt });
    });
    // T2j (Review 2, Fund 1): freier Haltepunkt, aber kein Fortschritt (Tamer steht 6 s, nicht bereit) -> Rückfall auf den Boss
    safe('T2j', () => {
      const W = makeEnv({ kind, ctl: 'tamer' });
      for (let t = 1000; t <= 8000; t += 500) W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, t);
      const first = W.rec.walks[0], last = W.rec.walks[W.rec.walks.length - 1];
      check('T2j 6 s ohne Fortschritt: Rückfall auf den Boss', !!first && dist(first, W.B) > 150 && !!last && dist(last, W.B) <= 1, { erst: first && Math.round(dist(first, W.B)), zuletzt: last && Math.round(dist(last, W.B)) });
    });
    // T2f (Fund 3): Digimon greift an, hängt aber hinter einer Wand (300 px) -> wird beim Anmarsch zurückgerufen
    safe('T2f', () => {
      const W = makeEnv({ kind, ctl: 'tamer', grid: wallGrid(), partner: { x: 1300, y: 1000, targetId: 'b:1' }, tamer: { x: 1320, y: 1000 } });
      const s = W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000);
      check('T2f angreifendes Digimon hinter einer Wand: Anmarsch mit partnerFollow', /Spiel-Wegfindung/.test(s || '') && W.rec.follows === 1, { status: s, follows: W.rec.follows });
    });
    // T2g (Fund 4): Hysterese nur mit freier Linie – Digimon greift aus 210 px an, Wand dazwischen -> Anmarsch
    safe('T2g', () => {
      const W = makeEnv({ kind, ctl: 'tamer', grid: wallGrid(), partner: { x: 1210, y: 1000, targetId: 'b:1' }, tamer: { x: 1220, y: 1000 } });
      const s = W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000);
      check('T2g Hysterese mit Wand dazwischen: kein Festhalten, Anmarsch', /Spiel-Wegfindung/.test(s || ''), { status: s });
    });
  }
  // T4a: Quest-Jagd – Laufziel vor der Beute
  safe(`T4a-${kind}`, () => {
    const W = makeEnv({ kind, ctl: 'tamer', tamer: { x: 1500, y: 1003 }, partner: { x: 1510, y: 1003 } }); need(W, 'digibotPreyGoal');
    const prey = { id: 'b:1', x: 1003, y: 1003, species: 'bossmon' };
    const g = W.fns.digibotPreyGoal(W.st, prey, W.T), d = g ? dist(g, prey) : -1;
    check(`T4a-${kind} Quest-Jagd: Laufziel ${R ? '≥ 176 px vor der Beute' : 'wie bisher auf der Beute (16er-Raster)'}`, !!g && (R ? d >= 176 && d <= 205 : g.x === 1008 && g.y === 1008), { ziel: g, abstand: Math.round(d) });
  });
  // T4b: „Nächstes Ziel“ – Tamer läuft auf das Ziel zu: Stopp-Tap auf die eigene Position; mit Ausweich-Lauf: kein Stopp
  safe(`T4b-${kind}`, () => {
    const W = makeEnv({ kind, ctl: 'tamer', tamer: { x: 1300, y: 1000, flags: FLAG.Moving }, partner: { x: 1310, y: 1000 } }); need(W, 'digibotNextStop');
    W.env.autopilot.nav = { tx: 1008, ty: 1008, wp: { x: 1008, y: 1008 } };
    W.fns.digibotNextStop(W.st, { id: 'b:1', x: 1000, y: 1000, species: 'bossmon' }, 1000);
    const tapMe = W.rec.taps.some((t) => t.x === 1300 && t.y === 1000);
    const W2 = makeEnv({ kind, ctl: 'tamer', tamer: { x: 1300, y: 1000, flags: FLAG.Moving }, partner: { x: 1310, y: 1000 } });
    W2.env.autopilot.nav = { tx: 1008, ty: 1008, wp: { x: 1008, y: 1008 } }; W2.env.dodgeState.goal = { x: 1400, y: 1100 };
    W2.fns.digibotNextStop(W2.st, { id: 'b:1', x: 1000, y: 1000, species: 'bossmon' }, 1000);
    if (R) check(`T4b-${kind} Nächstes Ziel: Stopp-Tap, bei Ausweich-Lauf keiner`, tapMe && W.env.autopilot.nav === null && !W2.rec.taps.length, { taps: W.rec.taps, nav: W.env.autopilot.nav, ausweichen: W2.rec.taps });
    else check(`T4b-${kind} Nahkämpfer wie bisher: kein Stopp`, !W.rec.taps.length && !!W.env.autopilot.nav, { taps: W.rec.taps });
  });
  // T5: Tank-Sperre – DD mit laufendem Weg; eigenes Digimon greift das Ziel schon an; Warnkreis auf der geraden Linie
  safe(`T5-${kind}`, () => {
    const zones = [{ kind: 'circle', x: 1180, y: 1000, r: 40 }];
    const W = makeEnv({ kind, ctl: 'tamer', zones, tamer: { x: 1400, y: 1000 }, partner: { x: 1060, y: 1000, targetId: 'b:1' } }); need(W, 'digibotTankHold');
    W.env.autopilot.nav = { tx: 1000, ty: 1000, wp: { x: 1000, y: 1000 } };
    const t = { id: 'b:1', name: 'Bossmon' }, wst = {};
    W.fns.digibotTankHold(W.st, t, 1000, wst); W.fns.digibotTankHold(W.st, t, 1100, wst);
    const wk = W.rec.walks[W.rec.walks.length - 1], d = wk ? dist(wk, W.B) : -1;
    const out = wk ? zones.every((z) => Math.hypot(wk.x - z.x, wk.y - z.y) >= z.r + 28) : false;
    const stopped = W.rec.taps.some((p) => p.x === 1400 && p.y === 1000) || (!!wk && Math.hypot(W.env.autopilot.nav?.tx - 1000, W.env.autopilot.nav?.ty - 1000) > 150);
    if (R) check(`T5-${kind} Tank-Sperre: Lauf zum Ziel beendet, partnerStop, Warteplatz 176–199 px außerhalb der Zone`, stopped && W.rec.stops === 1 && d >= 176 && d <= 200 && out, { taps: W.rec.taps, stops: W.rec.stops, ziel: wk, abstand: Math.round(d), draußen: out });
    else check(`T5-${kind} Tank-Sperre (Nahkampf): Stopp-Tap, partnerStop, kein Warteplatz`, W.rec.taps.some((p) => p.x === 1400 && p.y === 1000) && W.env.autopilot.nav === null && W.rec.stops === 1 && !W.rec.walks.length, { taps: W.rec.taps, stops: W.rec.stops, walks: W.rec.walks });
  });
  // T6a: Ausweichen – Annäherung: Warteplatz (Digimon gesteuert) ≥ 180 px bzw. 96 px; Tamer gesteuert ≤ 175 px bzw. 96 px
  safe(`T6a-${kind}`, () => {
    const W = makeEnv({ kind, ctl: 'partner', partner: { x: 1400, y: 1000 }, tamer: { x: 1410, y: 1000 } });
    W.fns.digibotDodgeApproach(W.st, W.B, W.P, W.P, [], 1000);
    const d = W.rec.walks[0] ? dist(W.rec.walks[0], W.B) : -1;
    const W2 = makeEnv({ kind, ctl: 'tamer', partner: { x: 1400, y: 1000 }, tamer: { x: 1410, y: 1000 } });
    W2.fns.digibotDodgeApproach(W2.st, W2.B, W2.T, W2.P, [], 1000);
    const d2 = W2.rec.walks[0] ? dist(W2.rec.walks[0], W2.B) : -1;
    check(`T6a-${kind} Annäherung beim Ausweichen: Warteplatz ${R ? '≥ 180 px (Tamer 160–180)' : '96 px wie bisher'}`, R ? d >= 180 && d2 >= 160 && d2 <= 180 : Math.round(d) === 96 && Math.round(d2) === 96, { digimon: Math.round(d), tamer: Math.round(d2) });
  });
  // T6b: Digimon steht schon in Reichweite auf sicherem Boden -> kein partnerFollow (Nahkämpfer: wie bisher Folgen)
  safe(`T6b-${kind}`, () => {
    const pd = R ? 180 : 30;
    const W = makeEnv({ kind, ctl: 'tamer', partner: { x: 1000 + pd, y: 1000 }, tamer: { x: 1400, y: 1000 } });
    W.fns.digibotDodgeApproach(W.st, W.B, W.T, W.P, [{ kind: 'circle', x: 700, y: 700, r: 40 }], 1000);
    check(`T6b-${kind} Digimon in Reichweite (${pd} px): ${R ? 'kein partnerFollow' : 'partnerFollow wie bisher'}`, R ? W.rec.follows === 0 : W.rec.follows === 1, { follows: W.rec.follows });
  });
  // T6c: „normaler Angriff ohne Annäherung“, Digimon folgt noch: genau ein partnerStop vor der 1; 1 zurückgehalten -> kein Stop
  safe(`T6c-${kind}`, () => {
    const W = makeEnv({ kind, ctl: 'tamer', partner: { x: 1180, y: 1000, flags: FLAG.Moving }, tamer: { x: 1250, y: 1000 } }); need(W, 'digibotPreStop');
    const plan = { point: { x: 1180, y: 1000 }, walking: false, chase: false };
    W.fns.digibotPreStop(W.st, W.B, W.P, [], 1000, plan); W.fns.digibotPreStop(W.st, W.B, W.P, [], 1100, plan);
    const W2 = makeEnv({ kind, ctl: 'tamer', partner: { x: 1180, y: 1000, flags: FLAG.Moving }, tamer: { x: 1250, y: 1000 } }); W2.env.bot.canOk = false;
    W2.fns.digibotPreStop(W2.st, W2.B, W2.P, [], 1000, plan);
    const W3 = makeEnv({ kind, ctl: 'tamer', partner: { x: 1180, y: 1000, flags: FLAG.Moving }, tamer: { x: 1250, y: 1000 } }); W3.env.digibotCombat.waiting = () => true;
    W3.fns.digibotPreStop(W3.st, W3.B, W3.P, [], 1000, plan);
    if (R) check(`T6c-${kind} ohne Annäherung: ein partnerStop, bei zurückgehaltener 1 keiner`, W.rec.stops === 1 && W2.rec.stops === 0 && W3.rec.stops === 0, { stops: W.rec.stops, gesperrt: W2.rec.stops, wartet: W3.rec.stops });
    else check(`T6c-${kind} Nahkämpfer wie bisher: kein zusätzlicher partnerStop`, W.rec.stops === 0, { stops: W.rec.stops });
  });
  // T7: Blast Mode – defId beelzemon_blast (208) vor species (192); Anmarsch-Grenze danach (Digimon 230 px, Tamer 170 px)
  if (R) safe('T7', () => {
    const W = makeEnv({ kind: 'R', ctl: 'tamer', defId: 'beelzemon_blast', partner: { x: 1230, y: 1000 }, tamer: { x: 1170, y: 1000 } }); need(W, 'digibotBasicRange', 'digibotRangeStand');
    const br = W.fns.digibotBasicRange(W.st), rs = W.fns.digibotRangeStand(W.st, W.B);
    const a = W.fns.digibotBossWalkIn(W.st, { id: 'b:1', name: 'Bossmon' }, 1000);
    const W2 = makeEnv({ kind: 'R', ctl: 'tamer', partner: { x: 1230, y: 1000 }, tamer: { x: 1170, y: 1000 } });
    const b = W2.fns.digibotBossWalkIn(W2.st, { id: 'b:1', name: 'Bossmon' }, 1000);
    const W3 = makeEnv({ kind: 'R', ctl: 'partner', defId: 'beelzemon_blast' }); W3.fns.digibotDodgeApproach(W3.st, W3.B, W3.P, W3.P, [], 1000);
    const d3 = W3.rec.walks[0] ? dist(W3.rec.walks[0], W3.B) : -1;
    check('T7 Blast Mode: Reichweite 208 (reach 211), Anmarsch bei 230 px fertig, mit 192 nicht; Warteplatz 199', br === 208 && rs === 211 && a === null && /Spiel-Wegfindung/.test(b || '') && Math.round(d3) === 199, { br, rs, blast: a, normal: b, warteplatz: Math.round(d3) });
  });
  // T8: Gruppe folgen – Fernkämpfer: Laufziel neben dem Leader (nicht auf ihm); Nahkämpfer wie bisher auf den Leader.
  //     Kein Stopp-Tap beim Ankommen (Review Funde 2/6/7: Stop/Go hinter einem laufenden Leader) – nav = null wie bisher
  safe(`T8-${kind}`, () => {
    const W = makeEnv({ kind, ctl: 'tamer', tamer: { x: 1400, y: 1000 }, partner: { x: 1410, y: 1000 } });
    const L = { name: 'Makota', inWorld: true, mapId: 'm1', channel: 1, x: 1000, y: 1000 };
    W.fns.followLeader(W.st, { mobs: [] }, L, 1000);
    const wk = W.rec.walks[0], d = wk ? dist(wk, L) : -1;
    W.T.x = 1090; W.fns.followLeader(W.st, { mobs: [] }, L, 1500); W.fns.followLeader(W.st, { mobs: [] }, L, 2000);
    const okD = R ? d >= 50 && d <= 110 : d <= 1;
    check(`T8-${kind} Gruppe folgen: Ziel ${Math.round(d)} px vom Leader, beim Ankommen kein Stopp-Tap`, okD && W.rec.taps.length === 0 && W.env.autopilot.nav === null, { abstand: Math.round(d), taps: W.rec.taps.length });
  });
  // T8b: Leader läuft gleichmäßig (6 px je Takt), Mitläufer folgt mit 8 px je Takt zum Laufziel: keine Stopp-Taps, kein Pendeln
  safe(`T8b-${kind}`, () => {
    const W = makeEnv({ kind, ctl: 'tamer', tamer: { x: 1130, y: 1000 }, partner: { x: 1140, y: 1000 } });
    const L = { name: 'Makota', inWorld: true, mapId: 'm1', channel: 1, x: 1000, y: 1000 };
    let goal = null; W.scene.tapGround = (x, y) => { W.rec.taps.push({ x, y }); goal = { x, y }; };
    W.env.walkTo = (st, x, y) => { W.rec.walks.push({ x, y }); if (!W.env.autopilot.nav || Math.hypot(W.env.autopilot.nav.tx - x, W.env.autopilot.nav.ty - y) > 24) W.env.autopilot.nav = { tx: x, ty: y, wp: { x, y } }; goal = { x, y }; return 1; };
    for (let i = 0; i < 60; i++) {
      L.x -= 6;
      W.fns.followLeader(W.st, { mobs: [] }, L, 1000 + i * 100);
      if (goal) { const dx = goal.x - W.T.x, dy = goal.y - W.T.y, dd = Math.hypot(dx, dy); if (dd > 8) { W.T.x += dx / dd * 8; W.T.y += dy / dd * 8; } else { W.T.x = goal.x; W.T.y = goal.y; } }
    }
    const lag = Math.hypot(W.T.x - L.x, W.T.y - L.y);
    check(`T8b-${kind} laufender Leader: keine Stopp-Taps, Mitläufer bleibt dran`, W.rec.taps.length === 0 && lag <= 140, { taps: W.rec.taps.length, abstand: Math.round(lag) });
  });
}
// Hilfen: Stopp (Tamer gesteuert, Digimon greift nicht an -> folgt) und Haltepunkt außerhalb einer Zone auf der geraden Linie
safe('H1', () => {
  const W = makeEnv({ kind: 'R', ctl: 'tamer', tamer: { x: 1300, y: 1000 } }); need(W, 'digibotStopRun', 'digibotRangeSpot');
  W.env.autopilot.nav = { tx: 1, ty: 1 };
  W.fns.digibotStopRun(W.st, { id: 'b:1' });
  const W2 = makeEnv({ kind: 'R', ctl: 'tamer', tamer: { x: 1300, y: 1000 }, partner: { x: 1200, y: 1000, targetId: 'b:1' } }); W2.fns.digibotStopRun(W2.st, { id: 'b:1' });
  const zones = [{ kind: 'circle', x: 1180, y: 1000, r: 40 }];
  const W3 = makeEnv({ kind: 'R', zones }); const q = W3.fns.digibotRangeSpot(W3.st, W3.B, { x: 1400, y: 1000 });
  const qd = q ? dist(q, W3.B) : -1, out = q && Math.hypot(q.x - 1180, q.y - 1000) >= 40 + 28;
  check('H1 digibotStopRun / digibotRangeSpot', W.rec.taps.length === 1 && W.rec.taps[0].x === 1300 && W.env.autopilot.nav === null && W.rec.follows === 1 && W2.rec.follows === 0 && qd >= 170 && qd <= 190 && out,
    { taps: W.rec.taps, follows: [W.rec.follows, W2.rec.follows], spot: q, abstand: Math.round(qd) });
});
// TW (Review Fund 1, Spielwelt fakeworld): Fernkämpfer (Beelzebumon 192) wählt einen Feldboss hinter einer Wand – der Bot muss nach dem
// Anmarsch angreifen (Taste 1), statt am verbauten Haltepunkt für immer „Laufe über Spiel-Wegfindung zum Boss“ zu melden
async function tickWorld() {
  const { JSDOM, VirtualConsole } = require('jsdom');
  const path = require('path');
  const fake = fs.readFileSync(path.join(__dirname, 'fakeworld.js'), 'utf8');
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  C.digimon.beelzemon = { name: 'Beelzemon', radius: 7, basic: { range: 192 } }; C.digimon.kuwagamon.radius = 7; C.skills = {};
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:6']) F.ents.delete(id);
  const B = F.ents.get('m:5'), T = F.ents.get('t:me'), P = F.ents.get('p:me');
  B.flags = 16 | 32; B.targetId = 'p:me'; P.defId = 'beelzemon'; // greift an: gilt als Ziel ohne Monster-Auswahl
  // Wand quer zur Linie Boss -> Digimon, ~100 px vor dem Boss, ±64 px breit
  const g = scene.map.grid, ux = (P.x - B.x) / Math.hypot(P.x - B.x, P.y - B.y), uy = (P.y - B.y) / Math.hypot(P.x - B.x, P.y - B.y);
  for (let s = -64; s <= 64; s += 4) { const x = B.x + ux * 100 - uy * s, y = B.y + uy * 100 + ux * s; g.blocked[Math.floor(y / 16) * g.w + Math.floor(x / 16)] = 1; }
  let goal = null; const keys = [];
  scene.controlledId = () => 't:me';
  scene.tapGround = (x, y) => { goal = { x, y }; };
  scene.telegraphs = { active: [] };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {} };
  const iv = setInterval(() => { if (!goal) return; const dx = goal.x - T.x, dy = goal.y - T.y, d = Math.hypot(dx, dy); if (d <= 8) { T.x = goal.x; T.y = goal.y; goal = null; } else { T.x += dx / d * 8; T.y += dy / d * 8; } P.x = T.x + 10; P.y = T.y; }, 50);
  const me = F.store.getState().me;
  F.store.setState({ me: { ...me, hotbar: ['cmd:attack', null, null, null, null, null, null, null, null], partner: { ...me.partner, species: 'beelzemon', skills: [] } } });
  w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') keys.push(e.code); }, true);
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: false, lvlDiff: 100, radius: 400, tab: 'log' }));
  w.eval(script);
  await new Promise((r) => setTimeout(r, 600));
  F.store.setState({ target: F.toTarget('m:5') });
  w.document.querySelector('[data-act="bot"]').click();
  const sts = [];
  for (let i = 0; i < 100 && !keys.length; i++) { await new Promise((r) => setTimeout(r, 100)); sts.push(w.document.querySelector('[data-f="status"]').textContent.slice(0, 60)); }
  clearInterval(iv);
  const pd = Math.round(Math.hypot(P.x - B.x, P.y - B.y));
  w.close();
  check('TW Spielwelt: Boss hinter Wand – nach dem Anmarsch Taste 1 (kein Dauerstehen am Haltepunkt)', keys.length > 0, { taste1: keys.length, abstand: pd, status: [...new Set(sts)].slice(-3) });
}
tickWorld().catch((e) => check('TW', false, { fehler: String(e?.message || e) })).then(() => {
  const all = res.length > 0 && res.every(Boolean);
  console.log(all ? 'ALLES OK' : 'FEHLER');
  process.exit(all ? 0 : 1);
});
