// 3.1.34: Kuramon-Herde und Not-Aus-Hinweis
//  aggro – im Dungeon/Raid wird ein Flächenskill nicht mehr zurückgehalten, nur weil weitere Monster daneben stehen
//          (live 30.10.: „Invincible Sword zurückgehalten: Flächenskill würde möglicherweise weitere Gegner anlocken“ in der Herde)
//  count – Herden-Zähler: abgefangen / am Ei / Stapel ins Protokoll (Funktion aus dem Skript mit kleinen Stubs)
//  esc   – Not-Aus (Knopf/Esc): kein rotes Fenster mehr; andere Sperren: kleiner Hinweis, Klicks gehen durch
// Aufruf: node tests/herd3134test.js <script> [teil]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const scriptPath = path.resolve(process.argv[2] || '');
const part = process.argv[3];
if (!part) {
  let ok = true;
  for (const p of ['aggro', 'count', 'esc']) {
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

async function aggro() {
  const SW = 'imperialdramon_paladin.invincible_sword';
  const G = makeWorld({ slot: 0, tag: 'A', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: Q,
    extraEnts: (id) => (id === 'native_forest' ? [
      { id: 'm:k1', kind: 2, defId: 'kuramon', x: 440, y: 330, hp: 15000, maxHp: 15000, level: 99, flags: 0, targetId: 'p:me' },
      { id: 'm:k2', kind: 2, defId: 'kuramon', x: 455, y: 345, hp: 15000, maxHp: 15000, level: 99, flags: 0, targetId: '' }] : []),
    setup({ content }) {
      content.spawns.native_forest.raid = { id: 'test_dg', gate: { mapId: 'primary_village', portal: 'nf' }, party: { min: 1, max: 5 }, dungeon: { rooms: [] } };
      content.digimon.kuramon = { name: 'Kuramon', radius: 3, skills: [] };
      content.skills = { [SW]: { id: SW, name: 'Invincible Sword', kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, range: 112, power: 282, castMs: 600, cooldownMs: 6000 } };
    } });
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...st0.me.partner, species: 'imperialdramon_paladin', ds: 5000, maxDs: 5000, skills: [{ id: SW, name: 'Invincible Sword', dsCost: 50, unlocked: true }] } } });
  const keys = [];
  G.w.addEventListener('keydown', (e) => keys.push(e.code), true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 200, radius: 400, skillSets: { imperialdramon_paladin: { skills: { 2: true }, heal: {} } } }));
  G.w.eval(script);
  await wait(800);
  G.store.setState({ target: { id: 'm:k1', kind: 'mob', name: 'Kuramon', level: 99, hp: 15000, maxHp: 15000 } });
  G.w.document.querySelector('[data-act="bot"]').click();
  const sts = new Set();
  for (let i = 0; i < 20 && !keys.includes('Digit2'); i++) { await wait(250); sts.add(G.status()); }
  check('Dungeon: Invincible Sword trotz zweitem Kuramon daneben gewirkt', keys.includes('Digit2'), [...sts].slice(-3).join(' | '));
  G.w.close(); done();
}

function count() {
  const i = script.indexOf('const HERD_EGG_PAD'), j = script.indexOf('function dgHerdPost(');
  const src = script.slice(i, j);
  const logs = [];
  let ents = new Map();
  const here = { b: { species: 'armageddemon', herd: { species: 'kuramon', to: 'egg_bay', perStack: 4, arriveRadius: 24 } }, R: { m: { spawns: { egg_bay: { x: 1288, y: 680 } } } } };
  const env = { dgHerdBossHere: () => here, dg: { insideAt: 1 }, KIND: { Mob: 2 }, FLAG: { Hidden: 256, Untargetable: 4096 }, logEvent: (k, t) => logs.push(t), window: { dmo: { net: { state: { get entities() { return ents; } } } } } };
  const f = new Function(...Object.keys(env), `${src}\nreturn { dgHerdCount, herdCount };`)(...Object.values(env));
  const st = { world: { mapId: 'network_revenge' } };
  const K = (id, x, hp = 15000) => [id, { id, kind: 2, defId: 'kuramon', x, y: 680, hp }];
  ents = new Map([K('k1', 1100), K('k2', 1150), K('k3', 1450), K('k4', 1400), K('k5', 1300)]);
  f.dgHerdCount(st, 1000);
  // k1, k2 erschlagen (die-Ereignis), k3 HP 0, k4 und k5 am Ei verschwunden
  f.herdCount.dead.add('k1'); f.herdCount.dead.add('k2');
  ents = new Map([K('k3', 1450, 0), K('k4', 1296), K('k5', 1280)]);
  f.dgHerdCount(st, 1100);
  ents = new Map([K('k3', 1450, 0)]);
  f.dgHerdCount(st, 1900);
  ents = new Map([['boss', { id: 'boss', kind: 2, defId: 'armageddemon', hp: 1, flags: 0 }]]);
  f.dgHerdCount(st, 2600);
  check('Zähler: 3/5 abgefangen, 2 am Ei, 0 Stapel', logs.length === 1 && /Herde: 3\/5 abgefangen, 2 am Ei – Boss \+0 Stapel/.test(logs[0]), logs.join(' | '));
  f.dgHerdCount(st, 2700);
  check('… nur einmal gemeldet', logs.length === 1);
  done();
}

async function esc() {
  const G = makeWorld({ slot: 0, tag: 'E', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: Q });
  trustClicks(G.w);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(600);
  G.w.document.querySelector('[data-act="digibot-stop"]').click();
  await wait(400);
  check('Not-Aus: kein rotes Fenster', !G.w.document.getElementById('digibot-notice'), G.w.document.getElementById('digibot-notice')?.textContent);
  // andere Sperre: Anwesenheitskontrolle → Hinweis, aber ohne Klick-Blockade
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(600);
  G.store.setState({ challenge: { id: 'c1' } });
  let n = null;
  for (let i = 0; i < 20 && !n; i++) { await wait(200); n = G.w.document.getElementById('digibot-notice'); }
  check('Anwesenheitskontrolle: Hinweis da, Klicks gehen durch', !!n && n.style.pointerEvents === 'none', n ? `${n.style.cssText.slice(0, 60)}… ${n.textContent}` : 'kein Hinweis');
  G.w.close(); done();
}

({ aggro, count, esc })[part]().catch((e) => { console.log('FEHLER', e); process.exit(1); });
