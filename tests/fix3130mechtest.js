// 3.1.30: Boss-Mechaniken / Key of Hope (Prüfbericht 29.10.)
//  edge   – Skill vom Kreisrand: während das Digimon castet, kein partnerStop (bisher im nächsten Takt abgebrochen)
//  davis  – Davis ohne Key of Hope: abgehakter stärkster Skill (Omega Blade) sperrt Davis nicht mehr
//  faint  – Anker (Slot 0) wird bewusstlos: die anderen laufen zum neuen Anker (Slot 1) statt zur alten Position;
//           bei Digimon-Steuerung kein partnerFollow beim Sammeln; Boss stirbt: Sammeln/Anker sofort vorbei
//  range  – Slot 0 steht > 700 px vom Boss: Slot 1 wird Anker, die Gruppe sammelt sich bei ihm;
//           Spiegel am Ziel: beim Halten im Schutzkreis kein Angriff
// Aufruf: node tests/fix3130mechtest.js <script> [teil] – ohne Teil laufen alle Teile nacheinander (je ein eigener Prozess)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const scriptPath = path.resolve(process.argv[2] || '');
const part = process.argv[3];
if (!part) {
  let ok = true;
  for (const p of ['edge', 'davis', 'faint', 'range']) {
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
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const done = () => { const ok = results.length > 0 && results.every(Boolean); console.log(ok ? 'TEIL OK' : 'TEIL FEHLER'); process.exit(ok ? 0 : 1); };
const Q = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } };

async function edge() {
  const G = makeWorld({ slot: 0, tag: 'E', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: Q,
    setup({ content }) { content.digimon.etemon = { name: 'Etemon', skills: [] }; content.skills = { 'gabumon.blue_blaster': { id: 'gabumon.blue_blaster', name: 'Blue Blaster', kind: 'attack', target: 'enemy', range: 48, castMs: 400, cooldownMs: 6000 } }; },
    extraEnts: () => [{ id: 'b:1', kind: 2, defId: 'etemon', x: 540, y: 330, hp: 90000, maxHp: 100000, level: 5, flags: 16 | 32, targetId: 'p:me' }] });
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], marksActive: [], circles: [] }; scene.mechB = { lines: [] };
  const stops = [];
  scene.deps.commands.partnerStop = () => stops.push(Date.now());
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...st0.me.partner, species: 'gabumon', ds: 500, skills: [{ id: 'gabumon.blue_blaster', name: 'Blue Blaster', dsCost: 5, unlocked: true }] } } });
  // Digit2 (Skill) → das Digimon castet 1,5 s (FLAG.Casting = 128)
  let castFrom = 0;
  G.w.addEventListener('keydown', (e) => { if (e.code !== 'Digit2' || castFrom) return; castFrom = Date.now(); const p = G.ents.get('p:me'); p.flags |= 128; setTimeout(() => { p.flags &= ~128; }, 1500); }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20, skillSets: { gabumon: { skills: { 2: true }, heal: {} } } }));
  G.w.eval(script);
  await wait(800);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = 592; t.y = 330; p.x = 581; p.y = 330;
  G.store.setState({ target: { id: 'b:1', kind: 'mob', name: 'Etemon', level: 5, hp: 90000, maxHp: 100000 } });
  const z = { x: 400, y: 330, r: 150 };
  scene.telegraphs.active = [z]; scene.telegraphs.circles = [{ ...z, end: G.w.performance.now() + 12000 }];
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500); p.x = 575; t.x = 586;
  const sts = new Set();
  for (let i = 0; i < 20 && !(castFrom && Date.now() - castFrom > 1500); i++) { await wait(200); if (castFrom) sts.add(G.status()); }
  const during = stops.filter((s) => castFrom && s >= castFrom && s <= castFrom + 1500).length;
  check('Skill vom Kreisrand gewirkt', !!castFrom, [...sts].join(' | '));
  check('Während des Casts kein partnerStop', castFrom && during === 0, `${during} partnerStop in 1,5 s Cast`);
  check('Digimon bleibt draußen (kein Hin und Her)', Math.hypot(p.x - 400, p.y - 330) > 150, `${Math.round(p.x)},${Math.round(p.y)}`);
}

async function davis() {
  const OB = 'imperialdramon_paladin.omega_blade', IS = 'imperialdramon_paladin.invincible_sword', PG = 'imperialdramon_paladin.paladin_guard', ST = 'imperialdramon_paladin.strike';
  const W = makeWorld({ slot: 0, tag: 'D', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: Q,
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 360, y: 330, hp: 800000, maxHp: 900000, level: 99, flags: 16 | 8, targetId: 'p:me' }] : []),
    setup({ content }) {
      content.skills = {
        [OB]: { id: OB, name: 'Omega Blade', kind: 'damage', target: 'enemy', shape: 'single', power: 712, range: 64, castMs: 900, cooldownMs: 20000 },
        [IS]: { id: IS, name: 'Invincible Sword', kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, power: 282, range: 112, castMs: 600, cooldownMs: 20000 },
        [PG]: { id: PG, name: 'Paladin Guard', kind: 'buff', target: 'self', shape: 'single', power: 0, range: 32, castMs: 0, cooldownMs: 30000 },
        [ST]: { id: ST, name: 'Strike', kind: 'damage', target: 'enemy', shape: 'single', power: 100, range: 64, castMs: 300, cooldownMs: 8000 },
      };
      content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [] };
      content.tamers = { davis: { id: 'davis', name: 'Davis', skill: { id: 'tamer.miracles', name: 'Digi-Egg of Miracles', scope: 'self', cooldownMs: 150000, resetCooldowns: true } } };
    } });
  // Omega Blade (Taste 2) in den Skill-Haken abgehakt
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', tamerAuto: true, skillSets: { imperialdramon_paladin: { skills: { 2: false, 3: true, 4: true, 5: true }, heal: {} } } }));
  const me = W.store.getState().me;
  const perf = () => W.w.performance.now();
  W.store.setState({ me: { ...me, tamerId: 'davis', hotbar: ['cmd:attack', 'skill:0', 'skill:1', 'skill:2', 'skill:3'], partner: { ...me.partner, species: 'imperialdramon_paladin', ds: 9000, maxDs: 9000,
    skills: [{ id: OB, name: 'Omega Blade', dsCost: 1050, cooldownMs: 20000, castMs: 900, unlocked: true }, { id: IS, name: 'Invincible Sword', dsCost: 370, cooldownMs: 20000, castMs: 600, unlocked: true },
      { id: PG, name: 'Paladin Guard', dsCost: 600, cooldownMs: 30000, castMs: 0, unlocked: true }, { id: ST, name: 'Strike', dsCost: 100, cooldownMs: 8000, castMs: 300, unlocked: true }] } },
    target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 99, hp: 800000, maxHp: 900000, flags: 24 },
    cooldowns: { 'skill:1': { end: perf() + 60000 }, 'skill:2': { end: perf() + 60000 }, 'skill:3': { end: perf() + 60000 } } });
  const calls = [];
  W.w.dmo.game.scene.getScene('world').deps.commands.tamerSkill = () => calls.push(Date.now());
  W.w.eval(script);
  await wait(1200);
  W.w.document.querySelector('[data-act="bot"]').click();
  await wait(1000);
  // Omega Blade (abgehakt) bereit, Invincible Sword 15 s, Strike 4 s auf Abklingzeit → Davis
  for (let i = 0; i < 8; i++) { W.store.setState({ cooldowns: { 'skill:0': { end: perf() - 1 }, 'skill:1': { end: perf() + 15000 }, 'skill:2': { end: perf() + 60000 }, 'skill:3': { end: perf() + 4000 } } }); await wait(200); }
  check('Omega Blade abgehakt, Invincible Sword 15 s + Strike 4 s – Davis gezündet', calls.length === 1, `${calls.length} Aufrufe · ${W.status()}`);
}

// drei Fenster: Slot 0/1 Clavis, Slot 2 Imperialdramon; Boss boss:1 bei (520,330)
const KOH = 'clavisangemon.key_of_hope';
function group3({ digimonCtrl = false, setupWin } = {}) {
  const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'a', char: 'ClavisA' }, { on: true, user: 'b', char: 'ClavisB' }, { on: true, user: 'c', char: 'Imperial' }] };
  const skills = {
    [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, dsCost: 535, cooldownMs: 45000, castMs: 0 },
    'infermon.cocoon_ram': { id: 'infermon.cocoon_ram', name: 'Cocoon Ram', shape: 'circle', radius: 64, telegraph: true, hpDamagePct: 240, castMs: 3000, cooldownMs: 24000 },
  };
  return [0, 1, 2].map((slot) => {
    const W = makeWorld({ slot, accounts, tag: 'S' + slot, quests: Q,
      extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'infermon', x: 520, y: 330, hp: 900000, maxHp: 900000, level: 80, flags: 16 }] : []),
      setup({ content }) { content.skills = skills; content.digimon.infermon = { name: 'Infermon', radius: 7, skills: [skills['infermon.cocoon_ram']] }; } });
    W.handlers = {};
    W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
    W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
    const me = W.store.getState().me;
    const clavis = slot < 2;
    W.store.setState({ me: { ...me, hotbar: ['cmd:attack', clavis ? 'skill:0' : null], partner: { ...me.partner, species: clavis ? 'clavisangemon' : 'imperialdramon', ds: 5000, maxDs: 5000,
      skills: clavis ? [{ id: KOH, name: 'Key of Hope', dsCost: 535, unlocked: true }] : [] } } });
    W.scene = W.w.dmo.game.scene.getScene('world');
    if (digimonCtrl && slot === 2) W.scene.controlledId = () => 'p:me';
    W.follows = [];
    W.scene.deps.commands.partnerFollow = () => W.follows.push(Date.now());
    W.keys = []; W.d1 = [];
    W.w.addEventListener('keydown', (e) => { if (e.code === 'Digit2') W.keys.push(Date.now()); if (e.code === 'Digit1') W.d1.push(Date.now()); }, true);
    if (setupWin) setupWin(W, slot);
    W.w.eval(script);
    return W;
  });
}
const cast = (wins) => { for (const W of wins) W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: 'infermon.cocoon_ram', phase: 'cast' }]); };

async function faint() {
  const wins = group3({ digimonCtrl: true });
  await wait(1200);
  wins[0].w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
  for (const W of wins.slice(1)) { const t = W.ents.get('t:me'), p = W.ents.get('p:me'); t.x = 150; t.y = 330; p.x = 160; p.y = 330; }
  await wait(600);
  cast(wins);
  await wait(600);
  check('Imperial läuft zum Anker ClavisA', /Schutzkreis von ClavisA/.test(wins[2].status()), wins[2].status());
  // Anker A wird bewusstlos → meldet kohAt=null, sendet keinen Plan mehr; B wird Anker
  const a = wins[0].store.getState().me;
  wins[0].store.setState({ me: { ...a, partner: { ...a.partner, fainted: true } } });
  const f0 = wins[2].follows.length;
  // bis 1,1 s warten (Statusmeldung, neuer Plan, Bot-Takt) – Zünden erst ~2,3 s nach der Ansage
  let sB = '', sI = '';
  for (let i = 0; i < 11 && !(/halte Position/.test(sB) && /Schutzkreis von ClavisB/.test(sI)); i++) { await wait(100); if (!/halte Position/.test(sB)) sB = wins[1].status(); if (!/Schutzkreis von ClavisB/.test(sI)) sI = wins[2].status(); }
  check('ClavisB hält Position (neuer Anker)', /halte Position/.test(sB), sB);
  check('Imperial läuft zum neuen Anker ClavisB', /Schutzkreis von ClavisB/.test(sI), sI);
  check('Digimon-Steuerung: kein partnerFollow beim Sammeln', wins[2].follows.length === 0, `${wins[2].follows.length} (davon ${wins[2].follows.length - f0} nach dem Ausfall)`);
  // Boss stirbt vor dem Einschlag (Zünden erst ~2,3 s nach der Ansage)
  for (const W of wins) W.handlers.evs?.([{ t: 'die', id: 'boss:1' }]);
  await wait(300);
  // verspäteter Plan von ClavisB (vor seinem 'die' abgeschickt, kommt erst danach an) – darf nicht wieder angenommen werden
  const { BroadcastChannel } = require('worker_threads');
  const bc = new BroadcastChannel('digibot-group-v1');
  const tB = wins[1].ents.get('t:me');
  bc.postMessage({ type: 'kohplan', slot: 1, x: tB.x, y: tB.y, mapId: 'native_forest', end: Date.now() + 2500, src: 'boss:1', opt: false,
    protocol: 'digibot/1', leader: 0, session: 'spaet', seq: 1, sentAt: Date.now() });
  // bis 1,2 s nach dem Tod in kurzen Abständen prüfen statt einmal nach fester Wartezeit
  const bad = [];
  for (let i = 0; i < 9; i++) { await wait(100); for (const W of wins) if (/Key of Hope/.test(W.status())) bad.push(W.status()); }
  bc.close();
  check('Boss tot: niemand sammelt/hält mehr (auch nach verspätetem Plan)', !bad.length, bad[0] || wins.map((W) => W.status()).join(' | '));
  check('Boss tot: kein Key of Hope gezündet', wins.every((W) => W.keys.length === 0), wins.map((W) => W.keys.length).join(','));
}

async function range() {
  // Slot 0: Digimon p:A steht weit weg vom Boss (in allen Welten sichtbar); Slot 1 nah am Boss, Ziel = Boss
  const wins = group3({ setupWin(W, slot) {
    W.ents.set('p:A', { id: 'p:A', kind: 1, x: 1400, y: 330, hp: 1, flags: 0, targetId: '' });
    if (slot === 0) { const me = W.store.getState().me; W.store.setState({ me: { ...me, partner: { ...me.partner, entityId: 'p:A' } } }); }
  } });
  await wait(1200);
  wins[0].w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
  { const t = wins[0].ents.get('t:me'); t.x = 1390; t.y = 330; }
  { const t = wins[1].ents.get('t:me'), p = wins[1].ents.get('p:me'); t.x = 490; t.y = 330; p.x = 500; p.y = 330; }
  { const t = wins[2].ents.get('t:me'), p = wins[2].ents.get('p:me'); t.x = 150; t.y = 330; p.x = 160; p.y = 330; }
  wins[1].store.setState({ target: { id: 'boss:1', kind: 'mob', name: 'Infermon', level: 80, hp: 900000, maxHp: 900000 } });
  await wait(600);
  cast(wins);
  await wait(800);
  check('ClavisB (Slot 1) wird Anker, obwohl Slot 0 bereit ist', /halte Position/.test(wins[1].status()), wins[1].status());
  check('Imperial sammelt sich bei ClavisB', /Schutzkreis von ClavisB/.test(wins[2].status()), wins[2].status());
  // Spiegel am Ziel: beim Halten nicht weiter zuschlagen
  const now = wins[1].w.performance.now();
  wins[1].scene.telegraphs = { ...(wins[1].scene.telegraphs || {}), mirrors: [{ src: 'boss:1', tellEnd: now - 100, end: now + 10000 }] };
  await wait(400);
  const n1 = wins[1].d1.length;
  await wait(700);
  check('Spiegel: kein Angriff beim Halten im Schutzkreis', wins[1].d1.length === n1 && /Spiegel/.test(wins[1].status()), `${wins[1].d1.length - n1} × Taste 1 · ${wins[1].status()}`);
}

({ edge, davis, faint, range })[part]().then(done, (e) => { console.log('FEHLER', e?.stack || e); process.exit(1); });
