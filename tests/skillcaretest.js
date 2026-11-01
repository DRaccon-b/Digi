// 3.1.43: Heals, Gruppen-Heal, Dauer-Buffs, Support und Cleanse nach Rollen (ein Fenster).
// A: „Heal < 50 %“ nur bei eigenen HP unter 50 %.   B: „Gruppen-Heal < 60 %“: Partner in Reichweite bei 40 % -> ja, bei 80 % -> nein.
// C: Tank-Buff im Kampf ohne Effekt -> ja; läuft der Effekt -> nicht erneut.   D: Utility: Partner hat „wounded“ -> ja, ohne -> nein.
// E: Tank-Buff bereit, Effekt läuft noch 10 s (z. B. nach Davis-Reset) -> nicht.   G: ohne Kampf -> kein Tank-Buff.
// F: Key of Hope gleich fällig (Boss sagt Catastrophe Cannon an): Tank-Buff mit 1,2 s Cast wartet, bis der Key gezündet ist.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KOH = 'clavisangemon.key_of_hope';
const SK = {
  'x.heal': { id: 'x.heal', name: 'Mend', kind: 'heal', target: 'self', shape: 'single', power: 500, dsCost: 5, cooldownMs: 1500, castMs: 0 },
  'x.seal': { id: 'x.seal', name: 'Seal', kind: 'heal', target: 'ally', shape: 'circle', radius: 96, power: 870, dsCost: 5, cooldownMs: 1500, castMs: 0, range: 128 },
  'x.guard': { id: 'x.guard', name: 'Guard', kind: 'buff', target: 'self', shape: 'single', dsCost: 5, cooldownMs: 1500, castMs: 0, effects: [{ stat: 'de', pct: 70, durationMs: 30000 }] },
  'x.pray': { id: 'x.pray', name: 'Pray', kind: 'heal', target: 'ally', shape: 'circle', radius: 128, power: 100, dsCost: 5, cooldownMs: 1500, castMs: 0, range: 160, cleanse: true },
  'x.slowguard': { id: 'x.slowguard', name: 'SlowGuard', kind: 'buff', target: 'self', shape: 'single', dsCost: 5, cooldownMs: 30000, castMs: 1200, effects: [{ stat: 'de', pct: 50, durationMs: 30000 }] },
  [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, dsCost: 5, cooldownMs: 45000, castMs: 0 },
  'diaboromon.catastrophe_cannon': { id: 'diaboromon.catastrophe_cannon', name: 'Catastrophe Cannon', shape: 'circle', radius: 64, telegraph: true, hpDamagePct: 240, castMs: 3000, cooldownMs: 24000 },
};

async function trial(o) {
  const accounts = o.group ? { leader: 0, popup: true, dungeon: true, list: [{ on: true, user: 'a', char: 'A' }, { on: true, user: 'b', char: 'B' }] } : { leader: 0, list: [{ user: 'solo' }] };
  const extra = [{ id: 'p:ally', kind: 1, x: 0, y: 0, hp: o.allyHp ?? 3000, maxHp: 3000, flags: 0, targetId: '' }];
  if (o.fight) extra.push({ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 470, y: 330, hp: 800000, maxHp: 900000, level: 5, flags: 16 | 32, targetId: 'p:me' });
  const G = makeWorld({ slot: 0, tag: o.tag, noHash: !o.group, accounts, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? extra : []),
    setup({ content }) { content.skills = { ...(content.skills || {}), ...SK }; content.digimon.armageddemon = { name: 'Armageddemon', skills: [SK['diaboromon.catastrophe_cannon']] }; } });
  G.handlers = {};
  if (o.group) G.w.dmo.net.on = (name, fn) => { G.handlers[name] = fn; return () => {}; };
  const scene = G.w.dmo.game.scene.getScene('world'); scene.telegraphs = { active: [], marksActive: [], circles: [], mirrors: [] }; scene.mechB = { lines: [] };
  const own = G.ents.get('p:me'), ally = G.ents.get('p:ally');
  if (own && ally) { ally.x = own.x + 20; ally.y = own.y; }
  const st0 = G.store.getState();
  G.store.setState({ party: { id: 'party1', members: [{ charId: 'c0', name: 'Ich', me: true, partnerEntityId: 'p:me' }, { charId: 'c1', name: 'Ally', me: false, partnerEntityId: 'p:ally' }] },
    ...(o.fight ? { target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 5, hp: 800000, maxHp: 900000 } } : {}),
    me: { ...st0.me, hotbar: ['cmd:attack', ...o.keys.map((_, i) => 'skill:' + i)], partner: { ...st0.me.partner, entityId: 'p:me', species: 'clavisangemon', ds: 5000, maxDs: 5000,
      hp: o.hp ?? 3000, maxHp: 3000, skills: o.keys.map((id) => ({ id, name: SK[id].name, dsCost: 5, unlocked: true })) } } });
  const keys = [];
  G.w.addEventListener('keydown', (e) => {
    keys.push({ c: e.code, t: Date.now() });
    const n = Number(e.code.replace('Digit', '')) - 2; if (!(n >= 0) || !o.keys[n]) return;
    const s = G.store.getState(); G.store.setState({ cooldowns: { ...s.cooldowns, ['skill:' + n]: { start: G.w.performance.now(), end: G.w.performance.now() + SK[o.keys[n]].cooldownMs } } });
  }, true);
  const role = {}, heal = {}, grpHeal = {};
  o.roles.forEach((r, i) => { const [x, n] = r.split(':'); role[i + 2] = x; if (x === 'heal') heal[i + 2] = Number(n); if (x === 'grpheal') grpHeal[i + 2] = Number(n); });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, dungeon: !!o.group, koh: !!o.group, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20,
    skillSets: { clavisangemon: { skills: { 2: true, 3: true, 4: true, 5: true, 6: true }, heal, role, grpHeal, aoeN: {}, rolesV: 1 } } }));
  if (o.effects) G.store.setState({ effects: o.effects(G) });
  if (o.cd) G.store.setState({ cooldowns: o.cd(G) });
  G.w.eval(script);
  await wait(800);
  return { G, keys };
}
const count = (keys, c, from = 0) => keys.filter((k) => k.c === c && k.t >= from).length;
const start = (G) => G.w.document.querySelector('[data-act="bot"]').click();

(async () => {
  const r = {};
  { const { G, keys } = await trial({ tag: 'A1', keys: ['x.heal'], roles: ['heal:50'], hp: 1000 }); start(G); await wait(2000); r.A1 = count(keys, 'Digit2'); G.w.close(); }
  { const { G, keys } = await trial({ tag: 'A2', keys: ['x.heal'], roles: ['heal:50'], hp: 2700 }); start(G); await wait(2000); r.A2 = count(keys, 'Digit2'); G.w.close(); }
  { const { G, keys } = await trial({ tag: 'B1', keys: ['x.heal', 'x.seal'], roles: ['heal:50', 'grpheal:60'], allyHp: 1200 }); start(G); await wait(2000); r.B1 = count(keys, 'Digit3'); G.w.close(); }
  { const { G, keys } = await trial({ tag: 'B2', keys: ['x.heal', 'x.seal'], roles: ['heal:50', 'grpheal:60'], allyHp: 2400 }); start(G); await wait(2000); r.B2 = count(keys, 'Digit3'); G.w.close(); }
  {
    const { G, keys } = await trial({ tag: 'C', fight: true, keys: ['x.guard'], roles: ['tankbuff'] });
    start(G);
    const t0 = Date.now(); while (Date.now() - t0 < 4000 && !count(keys, 'Digit2')) await wait(100);
    r.C1 = count(keys, 'Digit2');
    G.store.setState({ effects: { 'p:me': [{ id: 'x.guard', end: G.w.performance.now() + 20000, ms: 30000 }] } });
    const t1 = Date.now(); await wait(5000);
    r.C2 = count(keys, 'Digit2', t1);
    G.w.close();
  }
  { const { G, keys } = await trial({ tag: 'D1', keys: ['x.pray'], roles: ['utilsup'], effects: (W) => ({ 'p:ally': [{ id: 'wounded', end: W.w.performance.now() + 5000, ms: 5000 }] }) }); start(G); await wait(2000); r.D1 = count(keys, 'Digit2'); G.w.close(); }
  { const { G, keys } = await trial({ tag: 'D2', keys: ['x.pray'], roles: ['utilsup'] }); start(G); await wait(2000); r.D2 = count(keys, 'Digit2'); G.w.close(); }
  { const { G, keys } = await trial({ tag: 'E', fight: true, keys: ['x.guard'], roles: ['tankbuff'], effects: (W) => ({ 'p:me': [{ id: 'x.guard', end: W.w.performance.now() + 10000, ms: 30000 }] }) }); start(G); await wait(3000); r.E = count(keys, 'Digit2'); G.w.close(); }
  { const { G, keys } = await trial({ tag: 'G', keys: ['x.guard'], roles: ['tankbuff'] }); start(G); await wait(2500); r.G = count(keys, 'Digit2'); G.w.close(); }
  {
    const { G, keys } = await trial({ tag: 'F', group: true, fight: true, keys: ['x.slowguard', KOH], roles: ['tankbuff', 'attack'],
      cd: (W) => ({ 'skill:0': { start: 0, end: W.w.performance.now() + 3200 } }) }); // bereit kurz nach der Ansage
    start(G);
    await wait(2000);
    const ann = Date.now();
    G.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: 'diaboromon.catastrophe_cannon', phase: 'cast' }]);
    await wait(4500);
    const koh = keys.find((k) => k.c === 'Digit3' && k.t >= ann)?.t ?? null;
    const buffs = keys.filter((k) => k.c === 'Digit2' && k.t >= ann).map((k) => k.t);
    r.F = { koh: koh ? koh - ann : null, buffBeforeKoh: buffs.some((t) => koh == null || t < koh), buffs: buffs.map((t) => t - ann) };
    G.w.close();
  }
  console.log(JSON.stringify(r));
  const ok = r.A1 >= 1 && r.A2 === 0 && r.B1 >= 1 && r.B2 === 0 && r.C1 >= 1 && r.C2 === 0 && r.D1 >= 1 && r.D2 === 0 && r.E === 0 && r.G === 0
    && r.F.koh != null && !r.F.buffBeforeKoh && r.F.buffs.length >= 1;
  console.log(ok ? 'OK – Heals, Dauer-Buffs und Support nach Rollen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
