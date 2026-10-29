// 3.1.30 (Prüfung Modi, Abschnitt Dungeon):
// A: „Gruppe starten“ (grp-start, echter Klick) schickt den Start mit manual:true – sonst bleiben Mitläufer nach einem
//    Rauswurf gesperrt (dgReenterLocked) bzw. nach einem Not-Aus aus.
// B: „Gruppe starten“ mitten im Lauf setzt den Dungeon-Stand nicht zurück (kein zweites „Dungeon betreten“).
// C: Armageddemon-Seitenregel: Seite aus dem festen Spawnpunkt (nicht der Live-Position), bei Tamer-Steuerung wird das
//    Digimon nachgeholt (partnerFollow), und nach ~6 s vergeblichem Umstellen kämpft der Bot erst einmal weiter.
// D: Klinge im Warnbereich: kein „warte“-Stillstand, die Klinge wird trotzdem erfasst (20-s-Zähler läuft).
// E: Betreten (raidEnter) wird nicht endlos wiederholt – nach DG_ENTER_TRIES Versuchen stoppt der Bot mit Warnung.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const base = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } };
const dgSetup = (extra) => ({ content, MAPS }) => {
  content.spawns.native_forest.raid = { id: 'test_dg', gate: { mapId: 'primary_village', portal: 'nf' }, party: { min: 1, max: 5 }, deathLimit: 3,
    dungeon: { rooms: [{ id: 'r1', area: 'meadow', landing: 'from_pv', gate: 'pv', waves: [] }], mode: { order: 0, label: 'dg_mode_easy' } } };
  extra?.({ content, MAPS });
};
const logText = (G) => G.w.document.querySelector('[data-f="log"]')?.textContent || '';
const btn = (G) => G.w.document.querySelector('[data-act="bot"]')?.textContent || '';
// echter Klick (isTrusted) im Test: Klick-Listener bekommen ein Event, das isTrusted = true meldet
function trustClicks(w) {
  const add = w.EventTarget.prototype.addEventListener;
  w.EventTarget.prototype.addEventListener = function (type, fn, opt) {
    if (type !== 'click' || typeof fn !== 'function') return add.call(this, type, fn, opt);
    return add.call(this, type, function (ev) {
      const px = new Proxy(ev, { get: (t, k) => (k === 'isTrusted' ? true : typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
      return fn.call(this, px);
    }, opt);
  };
}

async function testA() {
  const accounts = { leader: 0, popup: true, mirror: false, dungeon: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'acc2', char: 'Two' }] };
  const G = makeWorld({ slot: 0, tag: 'A', accounts, quests: base, mobs: [] });
  trustClicks(G.w);
  const bus = require('./groupbus')('digibot-group');
  const starts = [];
  bus.onmessage = (e) => { if (e.data?.type === 'start') starts.push(e.data); };
  G.w.eval(script);
  await wait(1200);
  G.w.document.querySelector('[data-act="grp-start"]').click();
  await wait(800);
  G.w.close(); bus.close();
  return { starts: starts.map((m) => ({ manual: m.manual })) };
}

async function testB() {
  const accounts = { leader: 0, popup: true, mirror: false, dungeon: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'acc2', char: 'Two' }] };
  const G = makeWorld({ slot: 0, tag: 'B', accounts, quests: base, mobs: [], setup: dgSetup() });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'easy', autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 100 }));
  G.w.eval(script);
  await wait(1200);
  G.w.document.querySelector('[data-act="grp-start"]').click();
  await wait(1500);
  const n1 = (logText(G).match(/Dungeon betreten/g) || []).length;
  G.w.document.querySelector('[data-act="grp-start"]').click(); // mitten im Lauf noch einmal
  await wait(1500);
  const n2 = (logText(G).match(/Dungeon betreten/g) || []).length;
  const r = { n1, n2, on: btn(G), status: G.status() };
  G.w.close();
  return r;
}

async function testC() {
  const G = makeWorld({ slot: 0, tag: 'C', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: base,
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 360, y: 320, hp: 500000, maxHp: 900000, level: 99, flags: 16, targetId: 'p:me' }] : []),
    setup: dgSetup(({ content, MAPS }) => {
      content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [] };
      content.spawns.native_forest.bosses = [{ species: 'armageddemon', level: 99, at: 'boss_bay', herd: { from: ['x'], species: 'kuramon' } }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_bay', x: 440, y: 320 }); // Spawn rechts der Raummitte (400)
    }) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  let follows = 0; cmds.partnerFollow = () => { follows++; };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'easy', autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 100 }));
  G.w.eval(script);
  await wait(1200);
  // Digimon klebt rechts am Boss (Tamer-Steuerung: es läuft nicht mit)
  const p = G.ents.get('p:me');
  Object.defineProperty(p, 'x', { get: () => 372, set() {}, configurable: true });
  Object.defineProperty(p, 'y', { get: () => 320, set() {}, configurable: true });
  const t = G.ents.get('t:me'); t.x = 380; t.y = 320;
  const tgt = { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 99, hp: 500000, maxHp: 900000, flags: 16 };
  G.store.setState({ target: tgt });
  const keep = setInterval(() => { if (G.state.target?.id !== 'boss:1') G.store.setState({ target: tgt }); }, 100);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seen = [];
  for (let i = 0; i < 45; i++) { await wait(250); const s = G.status(); if (seen[seen.length - 1] !== s) seen.push(s); }
  clearInterval(keep);
  const log = logText(G);
  const r = { seen: seen.slice(-6), follows, left: /alle links von ihm/.test(log), gaveUp: /Seite nicht erreicht/.test(log), lastSide: /Armageddemon: auf die/.test(G.status()) };
  G.w.close();
  return r;
}

async function testD() {
  const boss = { x: 450, y: 330 }, blade = { x: 640, y: 500 }; // weit weg: der Warnkreis betrifft weder Tamer noch Angriffsposition
  const G = makeWorld({ slot: 0, tag: 'D', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: base,
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: boss.x, y: boss.y, hp: 150000, maxHp: 900000, level: 99, flags: 16, targetId: 'p:me' }] : []),
    setup({ content }) { content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [] }; content.digimon.imperialdramon_paladin = { ...(content.digimon.imperialdramon_paladin || {}), name: 'Imperialdramon Paladin Mode', basic: { range: 36 } }; } });
  const sc = G.w.dmo.game.scene.getScene('world');
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: false, tab: 'log', lvlDiff: 20 })); // ohne Ausweichen: sonst übernimmt dodge() den Takt vor der Klinge
  G.w.eval(script);
  await wait(1500);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = 500; t.y = 330; p.x = 492; p.y = 330; p.defId = 'imperialdramon_paladin';
  const me1 = G.store.getState().me; G.store.setState({ me: { ...me1, partner: { ...me1.partner, species: 'imperialdramon_paladin' } }, target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 99, hp: 150000, maxHp: 900000, flags: 16 } });
  sc.mechB = { lines: [], view: { t: 'mech', blade: [{ boss: 'boss:1', x: blade.x, y: blade.y, r: 12, fx: 'sword' }] } };
  const c = { x: blade.x, y: blade.y, r: 40, skill: { id: 'armageddemon.black_rain' }, end: G.w.performance.now() + 60000 };
  sc.telegraphs = { active: [{ x: c.x, y: c.y, r: c.r, skill: c.skill }], circles: [c], marksActive: [] };
  G.w.document.querySelector('[data-act="bot"]').click();
  const seen = new Set();
  for (let i = 0; i < 8; i++) { await wait(200); seen.add(G.status().slice(0, 40)); }
  const d1 = Math.hypot(t.x - blade.x, t.y - blade.y);
  const r = { statuses: [...seen], noch: Math.round(d1), noted: /Klinge am Boden/.test(logText(G)) };
  G.w.close();
  return r;
}

async function testE() {
  const G = makeWorld({ slot: 0, tag: 'E', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: base,
    setup({ content }) {
      content.spawns.primary_village.raid = { id: 'test_dg', gate: { mapId: 'native_forest', portal: 'pv' }, party: { min: 1, max: 5 }, deathLimit: 3,
        dungeon: { rooms: [{ id: 'r1', area: 'meadow', landing: 'from_nf', gate: 'nf', waves: [] }], mode: { order: 0, label: 'dg_mode_easy' } } };
    } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  let enters = 0, closes = 0;
  cmds.raidEnter = () => { enters++; }; // das Spiel lehnt ab: das Tür-Fenster bleibt offen, niemand kommt hinein
  cmds.closeRaidGate = () => { closes++; };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'easy', autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 100 }));
  G.w.eval(script);
  await wait(1200);
  G.store.setState({ raid: { inside: false } });
  G.w.document.querySelector('[data-act="bot"]').click();
  let stopped = false;
  for (let i = 0; i < 160 && !stopped; i++) { await wait(250); stopped = /Start/.test(btn(G)) && i > 4; }
  await wait(4500); // gestoppt: keine weiteren Versuche
  const r = { enters, closes, stopped, status: G.status(), warn: /Spiel lässt nicht hinein/.test(logText(G)), logs: (logText(G).match(/Dungeon: betrete/g) || []).length };
  G.w.close();
  return r;
}

(async () => {
  const A = await testA(); console.log('A', A);
  const B = await testB(); console.log('B', B);
  const C = await testC(); console.log('C', C);
  const D = await testD(); console.log('D', D);
  const E = await testE(); console.log('E', E);
  const okA = A.starts.length > 0 && A.starts.every((m) => m.manual === true);
  const okB = B.n1 === 1 && B.n2 === 1;
  const okC = C.left && C.follows > 0 && C.gaveUp;
  const okD = !D.statuses.some((s) => /Klinge.*warte|Klinge: laufe|Klinge: aufheben/.test(s)) && D.noted;
  const okE = E.stopped && E.warn && E.enters >= 5 && E.enters <= 7 && E.logs === 1;
  console.log(okA ? 'OK     A: Gruppe starten schickt manual:true' : 'FEHLER A: Gruppe starten ohne manual-Flag');
  console.log(okB ? 'OK     B: Gruppe starten mitten im Lauf setzt den Dungeon-Stand nicht zurück' : 'FEHLER B: Dungeon-Stand zurückgesetzt');
  console.log(okC ? 'OK     C: Seite aus dem Spawnpunkt, Digimon nachgeholt, Umstellen nach ~6 s aufgegeben' : 'FEHLER C: Seitenregel');
  console.log(okD ? 'OK     D: Klinge im Warnbereich – kein Stillstand, Klinge erfasst' : 'FEHLER D: Klinge wartet im Warnbereich');
  console.log(okE ? 'OK     E: Betreten nach wenigen Versuchen aufgegeben, Bot gestoppt' : 'FEHLER E: Betreten endlos wiederholt');
  process.exit(okA && okB && okC && okD && okE ? 0 : 1);
})();
