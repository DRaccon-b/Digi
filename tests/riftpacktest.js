// 3.2.59 (Nutzer 26.11., live T25: beide Ohnmachten gegen 6–8 Angreifer gleichzeitig; Unimon-HP sprangen 83→98→99 %, weil der
// Bot zwischen Angreifern wechselte; der Flächen-Skill traf ruhige Monster daneben und zog sie mit).
// Unter Druck im Rift (mindestens 4 Angreifer oder HP < 60 % bei einem Angreifer):
// A: unter den Angreifern den mit den wenigsten HP zuerst (statt beim vollen Ziel zu bleiben).
// A0: ohne Druck (2 Angreifer, volle HP) bleibt das Ziel wie bisher.
// B: Flächen-Skill nicht, wenn ein ruhiges Monster (greift nicht an) im Trefferkreis steht – B0: ohne ruhiges Monster schon.
// C: kein AoE-Zielwechsel auf die „beste Gruppe“ (hält den Fokus).
// D: „nur beim Guardian ausweichen“: unter 60 % HP auch den Kreisen normaler Gegner ausweichen; D0: bei vollen HP nicht.
// F (Nutzer 26.11.: „Omega Blade öfter gegen stärkere Gegner“): großer Einzelangriff (≥ 20 s Abklingzeit) nicht an einen fast toten
//    schwachen Gegner, wenn ein starker (Boss oder ≥ 2× Max-HP) in der Nähe ist; F0 ohne starken wie bisher; F2 auf den starken.
// E: am Guardian wird ein Skill wegen einer nur möglichen (nicht angesagten) Boss-Attacke höchstens 4 s zurückgehalten.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [src, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const HOOK = '  function pickTarget(sc, resting) {';
if (!src.includes(HOOK)) { console.log('FEHLER setup: Einhängepunkt fehlt'); process.exit(1); }
const script = src.replace(HOOK, '  window.__rp = { scan: (st) => scan(st), riftFocus: (sc) => riftFocus(sc), riftHoldCap: typeof riftHoldCap === \'function\' ? riftHoldCap : null, riftHoldFilter: typeof riftHoldFilter === \'function\' ? riftHoldFilter : null };\n' + HOOK);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function world({ cfg = {}, hp = 100, setup }) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world'), C = scene.deps.content;
  C.spawns.native_forest.raid = { id: 'rift', rift: true };
  C.skills = { 'x.blast': { id: 'x.blast', name: 'Blast', kind: 'damage', shape: 'circle', radius: 56, range: 112, cooldownMs: 6000, castMs: 400, target: 'enemy', power: 330 } };
  const taps = [], keys = [];
  scene.tapGround = (x, y) => taps.push({ x, y });
  scene.controlledId = () => 'p:me';
  scene.telegraphs = { active: [], circles: [] };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => {} };
  w.addEventListener('keydown', (e) => keys.push({ k: e.code, t: Date.now() }));
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
  const st0 = F.store.getState();
  F.store.setState({ me: { ...st0.me, hotbar: ['cmd:attack', 'skill:0', null, null, null, null, null, null], partner: { ...st0.me.partner, species: 'agumon', hp: Math.round(3752 * hp / 100), maxHp: 3752, ds: 700, maxDs: 766, skills: [{ id: 'x.blast', name: 'Blast', dsCost: 10, unlocked: true }] } } });
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 100, dungeon: true, dgMode: 'rift', tab: 'log', dodge: false,
    skillSets: { agumon: { skills: { 2: true }, role: { 2: 'aoe' }, aoeN: { 2: 2 }, rolesV: 1 } }, ...cfg }));
  const run = { depth: 25, running: true, signal: 40, clockMs: 400000, floor: { n: 2, of: 3 }, portal: { open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] };
  w.dmo.rift = { getState: () => ({ run, result: null, patch: null, floorUi: { going: null } }) };
  setup(F, scene, run);
  w.eval(script);
  await wait(500);
  return { w, F, scene, taps, keys, run };
}
const att = (F, id, x, y, hp = 1000) => F.E({ id, kind: 2, defId: 'kunemon', level: 4, x, y, targetId: 'p:me', flags: 32, hp, maxHp: 1000 });
const calm = (F, id, x, y) => F.E({ id, kind: 2, defId: 'mushroomon', level: 4, x, y, targetId: '', flags: 32, hp: 1000, maxHp: 1000 });

(async () => {
  const res = [];
  const ck = (id, ok, txt, info) => { res.push(ok); console.log(`${ok ? 'OK    ' : 'FEHLER'} ${id}: ${txt}`, ok ? '' : JSON.stringify(info)); };
  const focusOf = async (o) => { const X = await world(o); const st = X.F.store.getState(); const t = X.w.__rp.riftFocus(X.w.__rp.scan(st)); X.w.close(); return t?.id || null; };

  // A: vier Angreifer, das aktuelle Ziel (nah) voll, einer mit 25 % etwas weiter weg
  const A = await focusOf({ setup: (F) => { att(F, 'a:1', 530, 500); att(F, 'a:2', 470, 520); att(F, 'a:3', 560, 560, 250); att(F, 'a:4', 450, 470); F.store.setState({ target: F.toTarget('a:1') }); } });
  ck('A', A === 'a:3', 'unter Druck: Angreifer mit den wenigsten HP zuerst', { A });
  // A0: zwei Angreifer, volle HP -> Ziel bleibt
  const A0 = await focusOf({ setup: (F) => { att(F, 'a:1', 530, 500); att(F, 'a:3', 560, 560, 250); F.store.setState({ target: F.toTarget('a:1') }); } });
  ck('A0', A0 === 'a:1', 'ohne Druck bleibt das Ziel', { A0 });
  // A1: ein Angreifer, aber HP 40 % -> auch Druck (keine Änderung der Wahl bei einem Angreifer, nur Absicherung)
  const A1 = await focusOf({ hp: 40, setup: (F) => { att(F, 'a:1', 530, 500); att(F, 'a:3', 560, 560, 250); F.store.setState({ target: F.toTarget('a:1') }); } });
  ck('A1', A1 === 'a:3', 'HP < 60 %: auch bei zwei Angreifern den schwächsten zuerst', { A1 });

  // B/B0/C: Bot läuft (Spielwelt gw wie skillrottest) – wird der Flächen-Skill (Taste 2) gedrückt? wechselt er das Ziel?
  const makeWorld = require('./gw');
  const runBot = async (tag, ents, ms = 3500, o = {}) => {
    const skId = o.skill || 'x.aoe', role = o.role || 'aoe';
    const G = makeWorld({ slot: 0, tag, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
      quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
      setup({ content }) { content.digimon.etemon = { name: 'Etemon', skills: [] }; content.spawns.native_forest.raid = { id: 'rift', rift: true };
        content.skills = { ...(content.skills || {}), 'x.aoe': { id: 'x.aoe', name: 'Area', kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, power: 200, dsCost: 5, cooldownMs: 1500, castMs: 0, range: 128 },
          'x.omega': { id: 'x.omega', name: 'Omega', kind: 'damage', target: 'enemy', shape: 'single', power: 1600, dsCost: 5, cooldownMs: 36000, castMs: 0, range: 64 } }; },
      extraEnts: () => ents });
    const scene = G.w.dmo.game.scene.getScene('world');
    scene.telegraphs = { active: [], marksActive: [], circles: [], mirrors: [] }; scene.mechB = { lines: [] };
    const run = { depth: 25, running: true, signal: 40, clockMs: 400000, floor: { n: 2, of: 3 }, portal: { open: false }, guardian: 'hidden', objective: 'purge', alphaMarks: [] };
    G.w.dmo.rift = { getState: () => ({ run, result: null, patch: null, floorUi: { going: null } }) };
    const t1 = ents[0];
    const st0 = G.store.getState();
    G.store.setState({ target: { id: t1.id, kind: 'mob', name: 'Etemon', level: 5, hp: t1.hp, maxHp: t1.maxHp },
      me: { ...st0.me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...st0.me.partner, species: 'gabumon', ds: 5000, maxDs: 5000, ...(o.partnerHp ? { hp: Math.round(st0.me.partner.maxHp * o.partnerHp / 100) } : {}), skills: [{ id: skId, name: skId, dsCost: 5, unlocked: true }] } } });
    const keys = [], sel = [];
    G.w.addEventListener('keydown', (e) => { keys.push(e.code); if (e.code === 'Digit2') { const s2 = G.store.getState(); G.store.setState({ cooldowns: { ...s2.cooldowns, 'skill:0': { start: G.w.performance.now(), end: G.w.performance.now() + 1500 } } }); } }, true);
    const sel0 = scene.select; scene.select = (id) => { sel.push(id); return sel0.call(scene, id); };
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20, dungeon: true, dgMode: 'rift',
      skillSets: { gabumon: { skills: { 2: true }, heal: {}, role: { 2: role }, aoeN: { 2: 2 }, rolesV: 1 } } }));
    G.w.eval(script);
    await wait(800);
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(ms);
    const r = { k2: keys.filter((k) => k === 'Digit2').length, sel: sel.slice(0, 8), target: G.store.getState().target?.id, st: G.w.document.querySelector('[data-f="status"]').textContent.slice(0, 90) };
    G.w.close();
    return r;
  };
  const A_ = (id, x, y, hp = 900000) => ({ id, kind: 2, defId: 'etemon', x, y, hp, maxHp: 900000, level: 5, flags: 32, targetId: 'p:me' });
  const C_ = (id, x, y) => ({ id, kind: 2, defId: 'etemon', x, y, hp: 900000, maxHp: 900000, level: 5, flags: 32, targetId: '' });
  // vier Angreifer eng um das schwächste Ziel (gw: Digimon bei ~430,330), dazu ein ruhiges Monster im Kreis
  const pack = (withCalm) => [A_('a:1', 440, 330, 200000), A_('a:2', 455, 340), A_('a:3', 430, 345), A_('a:4', 450, 320), ...(withCalm ? [C_('c:1', 465, 330)] : [])];
  const B = await runBot('B', pack(true));
  ck('B', B.k2 === 0, 'unter Druck: kein Flächen-Skill, wenn ein ruhiges Monster im Kreis steht', B);
  const B0 = await runBot('B0', pack(false));
  ck('B0', B0.k2 > 0, 'ohne ruhiges Monster im Kreis: Flächen-Skill wie bisher', B0);
  // C: schwächstes Ziel steht allein, drei Angreifer als Gruppe daneben -> kein Wechsel auf die Gruppe
  const Cx = await runBot('C', [A_('a:1', 440, 330, 150000), A_('a:2', 520, 400), A_('a:3', 535, 410), A_('a:4', 510, 415)]);
  ck('C', Cx.sel.length > 0 ? !Cx.sel.some((id) => id !== 'a:1') : true, 'unter Druck: kein AoE-Wechsel weg vom Fokusziel', Cx);
  ck('C0', Cx.target === 'a:1', 'Fokusziel bleibt', Cx);
  // F: Omega (großer Einzelangriff, 36 s) nicht an fast toten schwachen Gegner, wenn ein starker (2× Max-HP) daneben steht
  const W_ = (id, x, y, hp, maxHp, flags = 32) => ({ id, kind: 2, defId: 'etemon', x, y, hp, maxHp, level: 5, flags, targetId: 'p:me' });
  const F1 = await runBot('F', [W_('w:1', 440, 330, 30000, 150000), W_('s:1', 470, 340, 380000, 380000)], 2500, { skill: 'x.omega', role: 'attack' });
  ck('F', F1.k2 === 0, 'Omega für den starken Gegner aufheben (Ziel fast tot)', F1);
  const F0 = await runBot('F0', [W_('w:1', 440, 330, 30000, 150000), W_('w:2', 470, 340, 150000, 150000)], 2500, { skill: 'x.omega', role: 'attack' });
  ck('F0', F0.k2 > 0, 'ohne starken Gegner: Omega wie bisher', F0);
  const F2 = await runBot('F2', [W_('s:1', 440, 330, 300000, 380000), W_('w:1', 470, 340, 150000, 150000)], 2500, { skill: 'x.omega', role: 'attack' });
  ck('F2', F2.k2 > 0, 'Omega auf den starken Gegner', F2);

  // D/D0: Kreis eines normalen Gegners, Option „nur beim Guardian“ an
  const dodgeRun = async (hp) => {
    const X = await world({ hp, cfg: { riftDodgeGuardian: true, dodge: true }, setup: (F, scene) => {
      F.E({ id: 'm:src', kind: 2, defId: 'kunemon', level: 4, x: 560, y: 470, targetId: 'p:me', flags: 32, hp: 9000, maxHp: 9000 });
      F.store.setState({ target: F.toTarget('m:src') });
    } });
    const t0 = X.w.performance.now();
    X.scene.telegraphs.active = [{ x: 500, y: 500, r: 60, skill: 'x.slam' }];
    X.scene.telegraphs.circles = [{ x: 500, y: 500, r: 60, end: t0 + 2500, src: 'm:src', skill: { id: 'x.slam' } }];
    X.w.document.querySelector('[data-act="bot"]').click();
    await wait(1500);
    const n = X.taps.length; X.w.close(); return n;
  };
  const D = await dodgeRun(40), D0 = await dodgeRun(100);
  ck('D', D > 0, 'HP < 60 %: auch normalem Gegner-Kreis ausweichen', { D });
  ck('D0', D0 === 0, 'volle HP: wie bisher nur beim Guardian', { D0 });

  // E: Zurückhalte-Deckel (Hilfsfunktion): gleicher Grund durchgehend -> nach 4 s frei; neuer Grund -> wieder zurückhalten
  const X = await world({ setup: () => {} });
  const cap = X.w.__rp.riftHoldCap;
  let E = false, info = {};
  if (cap) {
    const t = 1000000;
    const r1 = cap('omega', 'Seven Heavens möglich', t), r1b = cap('omega', 'Seven Heavens möglich', t + 1000), r1c = cap('omega', 'Seven Heavens möglich', t + 2000), r2 = cap('omega', 'Seven Heavens möglich', t + 3000), r3 = cap('omega', 'Seven Heavens möglich', t + 4500);
    const r4 = cap('omega', null, t + 5000), r5 = cap('omega', 'Savage Emperor möglich', t + 5500);
    // Review: nach dem Einsatz (Abklingzeit, keine Abfrage) startet derselbe Grund später wieder neu – nicht sofort frei
    const r6 = cap('omega', 'Savage Emperor möglich', t + 6500); for (const d of [7500, 8500, 9500]) cap('omega', 'Savage Emperor möglich', t + d);
    const r7 = cap('omega', 'Savage Emperor möglich', t + 10000), r8 = cap('omega', 'Savage Emperor möglich', t + 40000);
    info = { r1, r2, r3, r4, r5, r6, r7, r8 };
    E = !!r1 && !!r2 && r3 === null && r4 === null && !!r5 && !!r6 && r7 === null && !!r8;
  }
  X.w.close();
  ck('E', E, 'Zurückhalten wegen nur möglicher Boss-Attacke höchstens 4 s', info);
  // G/G0 (Nutzer 26.11.: „bei solchen Gegnern sämtliche Attack-Skills permanent auf CD“, nur im Rift): starker Gegner (≥ 2× Max-HP der
  //    übrigen) allein im Kreis -> Flächen-Skill (AoE ab 2) kommt trotzdem; normaler Gegner allein -> wie bisher nicht
  const S_ = (id, x, y, maxHp) => ({ id, kind: 2, defId: 'etemon', x, y, hp: maxHp, maxHp, level: 5, flags: 32, targetId: 'p:me' });
  const G1 = await runBot('G', [S_('s:1', 440, 330, 400000), S_('n:1', 620, 480, 150000), S_('n:2', 640, 470, 150000)]);
  ck('G', G1.k2 > 0, 'starker Gegner: Flächen-Skill auch allein im Kreis', G1);
  const G0 = await runBot('G0', [S_('n:0', 440, 330, 150000), S_('n:1', 620, 480, 150000), S_('n:2', 640, 470, 150000)]);
  ck('G0', G0.k2 === 0, 'normaler Gegner allein: AoE ab 2 wie bisher nicht', G0);
  // H: gegen einen starken Gegner kein Zurückhalten wegen einer nur möglichen Attacke; Spiegel-Grund bleibt; normaler Gegner: 4-s-Deckel
  const Y = await world({ setup: (F) => { F.E({ id: 's:1', kind: 2, defId: 'kunemon', level: 4, x: 540, y: 500, targetId: 'p:me', flags: 32, hp: 400000, maxHp: 400000 }); for (const [i, x] of [[1, 600], [2, 620], [3, 640]]) F.E({ id: 'n:' + i, kind: 2, defId: 'kunemon', level: 4, x, y: 560, targetId: 'p:me', flags: 32, hp: 150000, maxHp: 150000 }); } });
  const hf = Y.w.__rp.riftHoldFilter; let H = false, hinfo = {};
  if (hf) {
    const st = Y.F.store.getState(), ents = Y.w.dmo.net.state.entities, now = 5000000, why = 'Gaia Force (Kreis um Boss) möglich – sonst keine Zeit zum Ausweichen';
    const h1 = hf(st, ents.get('s:1'), 'omega', why, now), h2 = hf(st, ents.get('n:1'), 'omega2', why, now), h3 = hf(st, ents.get('s:1'), 'omega3', 'Mirror (Spiegel) möglich', now);
    hinfo = { h1, h2, h3 }; H = h1 === null && h2 === why && h3 === 'Mirror (Spiegel) möglich';
  }
  Y.w.close();
  ck('H', H, 'starker Gegner: nie wegen „möglich“ zurückhalten; Spiegel bleibt; normaler Gegner: Deckel', hinfo);
  console.log(res.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(res.every(Boolean) ? 0 : 1);
})();
