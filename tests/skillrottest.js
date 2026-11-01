// 3.1.43: Skill-Rotation nach Rollen (gegnerseitig).
// A: „AoE ab 3“ mit nur einem Gegner -> nicht; mit drei Gegnern im Kreis -> ja.   B: gegen einen Boss allein -> ja.
// C: Boss, Angriffs-Buff (Taste 3) + Angriff (Taste 2): Buff erst ~3 s nach dem ersten Angriff und vor dem ersten Angriffsskill.
// D: wie C, aber der Boss spiegelt: kein Buff, solange der Spiegel läuft.   E: normales Monster: kein Angriffs-Buff, Angriff sofort.
// F: Def-Support als Gegner-Debuff (Taste 4): nicht neu, solange der Effekt auf dem Gegner läuft; danach wieder.
// G: Kreisrand: Ansturm-Angriff (dash) nicht, Angriffs-Buff im Stand gegen den Boss ja.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SK = {
  'x.hit': { id: 'x.hit', name: 'Hit', kind: 'damage', target: 'enemy', shape: 'single', power: 200, dsCost: 5, cooldownMs: 1500, castMs: 0, range: 64 },
  'x.aoe': { id: 'x.aoe', name: 'Area', kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, power: 200, dsCost: 5, cooldownMs: 1500, castMs: 0, range: 128 },
  'x.rage': { id: 'x.rage', name: 'Rage', kind: 'buff', target: 'self', shape: 'single', dsCost: 5, cooldownMs: 30000, castMs: 0, effects: [{ stat: 'at', pct: 30, durationMs: 15000 }] },
  'x.slow': { id: 'x.slow', name: 'Lock', kind: 'debuff', target: 'enemy', shape: 'single', dsCost: 5, cooldownMs: 2000, castMs: 0, range: 96, effects: [{ stat: 'as', pct: -20, durationMs: 12000 }] },
};
const CD = { 'x.hit': 1500, 'x.aoe': 1500, 'x.rage': 30000, 'x.slow': 2000 };

async function trial(o) {
  const ents = [{ id: 'b:1', kind: 2, defId: 'etemon', x: 440, y: 330, hp: 800000, maxHp: 900000, level: 5, flags: (o.boss ? 16 : 0) | 32, targetId: 'p:me' }];
  for (let i = 0; i < (o.extra || 0); i++) ents.push({ id: 'b:x' + i, kind: 2, defId: 'etemon', x: 450 + i * 10, y: 340, hp: 900000, maxHp: 900000, level: 5, flags: 32, targetId: 'p:me' });
  const G = makeWorld({ slot: 0, tag: o.tag, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.etemon = { name: 'Etemon', skills: [] }; content.skills = { ...(content.skills || {}), ...SK, ...(o.dash ? { 'x.hit': { ...SK['x.hit'], dash: true } } : {}) }; },
    extraEnts: () => ents });
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], marksActive: [], circles: [], mirrors: [] }; scene.mechB = { lines: [] };
  const ids = o.keys; // Skill-IDs auf Taste 2, 3, …
  const st0 = G.store.getState();
  G.store.setState({ target: { id: 'b:1', kind: 'mob', name: 'Etemon', level: 5, hp: 800000, maxHp: 900000 },
    me: { ...st0.me, hotbar: ['cmd:attack', ...ids.map((_, i) => 'skill:' + i)], partner: { ...st0.me.partner, species: 'gabumon', ds: 5000, maxDs: 5000,
      skills: ids.map((id) => ({ id, name: SK[id].name, dsCost: 5, unlocked: true })) } } });
  const keys = [];
  G.w.addEventListener('keydown', (e) => {
    keys.push({ c: e.code, t: Date.now() });
    const n = Number(e.code.replace('Digit', '')) - 2; if (!(n >= 0) || !ids[n]) return;
    const s = G.store.getState(); G.store.setState({ cooldowns: { ...s.cooldowns, ['skill:' + n]: { start: G.w.performance.now(), end: G.w.performance.now() + CD[ids[n]] } } });
  }, true);
  const roles = {}, aoeN = {};
  o.roles.forEach((r, i) => { const [role, n] = r.split(':'); roles[i + 2] = role; if (role === 'aoe') aoeN[i + 2] = Number(n); });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20,
    skillSets: { gabumon: { skills: { 2: true, 3: true, 4: true, 5: true, 6: true }, heal: {}, role: roles, aoeN, rolesV: 1 } } }));
  G.w.eval(script);
  await wait(800);
  return { G, keys, scene, ents };
}
const count = (keys, c, from = 0) => keys.filter((k) => k.c === c && k.t >= from).length;
const first = (keys, c) => keys.find((k) => k.c === c)?.t ?? null;

(async () => {
  const r = {};
  // A: AoE ab 3
  {
    const { G, keys, ents } = await trial({ tag: 'A', keys: ['x.aoe'], roles: ['aoe:3'] });
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(4000);
    r.A1 = count(keys, 'Digit2');
    for (let i = 0; i < 2; i++) G.ents.set('b:y' + i, { id: 'b:y' + i, kind: 2, defId: 'etemon', x: 445 + i * 8, y: 335, hp: 900000, maxHp: 900000, level: 5, flags: 32, targetId: 'p:me' });
    const t0 = Date.now(); await wait(3000);
    r.A2 = count(keys, 'Digit2', t0);
    G.w.close();
  }
  // B: AoE gegen Boss allein
  {
    const { G, keys } = await trial({ tag: 'B', boss: true, keys: ['x.aoe'], roles: ['aoe:3'] });
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(3000);
    r.B = count(keys, 'Digit2');
    G.w.close();
  }
  // C: Angriffs-Buff vor dem ersten Angriffsskill
  {
    const { G, keys } = await trial({ tag: 'C', boss: true, keys: ['x.hit', 'x.rage'], roles: ['attack', 'atkbuff'] });
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(7000);
    const d1 = first(keys, 'Digit1'), d2 = first(keys, 'Digit2'), d3 = first(keys, 'Digit3');
    r.C = { buffAfter: d3 && d1 ? d3 - d1 : null, buffFirst: !!d3 && (!d2 || d3 <= d2), d2: count(keys, 'Digit2') };
    G.w.close();
  }
  // D: Spiegel -> kein Buff
  {
    const { G, keys, scene } = await trial({ tag: 'D', boss: true, keys: ['x.hit', 'x.rage'], roles: ['attack', 'atkbuff'] });
    const p0 = G.w.performance.now();
    scene.telegraphs.mirrors = [{ src: 'b:1', start: p0, tellEnd: p0, end: p0 + 6000 }];
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(5000);
    r.D1 = count(keys, 'Digit3');
    await wait(5000);
    r.D2 = count(keys, 'Digit3');
    G.w.close();
  }
  // E: normales Monster: kein Buff, Angriff gleich
  {
    const { G, keys } = await trial({ tag: 'E', keys: ['x.hit', 'x.rage'], roles: ['attack', 'atkbuff'] });
    const t0 = Date.now();
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(5000);
    const d2 = first(keys, 'Digit2');
    r.E = { d3: count(keys, 'Digit3'), d2early: d2 != null && d2 - t0 < 2500 };
    G.w.close();
  }
  // F: Def-Support auf dem Gegner halten
  {
    const { G, keys } = await trial({ tag: 'F', keys: ['x.slow'], roles: ['defsup'] });
    G.w.document.querySelector('[data-act="bot"]').click();
    const t0 = Date.now(); while (Date.now() - t0 < 4000 && !count(keys, 'Digit2')) await wait(100);
    const firstAt = Date.now();
    G.store.setState({ effects: { 'b:1': [{ id: 'x.slow', end: G.w.performance.now() + 8000, ms: 12000 }] } });
    await wait(6000);
    r.F1 = { first: count(keys, 'Digit2'), again: count(keys, 'Digit2', firstAt + 100) };
    G.store.setState({ effects: {} });
    await wait(4500); // eigene Laufzeit des ersten Casts (12 s) läuft noch? Nein: Effekt war sichtbar und ist weg -> neu
    r.F2 = count(keys, 'Digit2', firstAt + 6100);
    G.w.close();
  }
  // G: Kreisrand (wie edgeskilltest): Ansturm-Angriff nicht, Angriffs-Buff im Stand ja
  {
    const { G, keys, scene } = await trial({ tag: 'G', boss: true, dash: true, keys: ['x.hit', 'x.rage'], roles: ['attack', 'atkbuff'] });
    const t = G.ents.get('t:me'), p = G.ents.get('p:me'), b = G.ents.get('b:1');
    b.x = 540; t.x = 592; t.y = 330; p.x = 581; p.y = 330;
    const z = { x: 400, y: 330, r: 150 };
    scene.telegraphs.active = [z]; scene.telegraphs.circles = [{ ...z, end: G.w.performance.now() + 20000 }];
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(1500); p.x = 575; t.x = 586;
    await wait(6000);
    r.G = { d2: count(keys, 'Digit2'), d3: count(keys, 'Digit3'), st: G.status() };
    G.w.close();
  }
  // H: Gegner-Debuff, das Spiel meldet keinen Effekt; nach dem Cast setzt ein Davis-Reset die Abklingzeit zurück -> nicht neu
  {
    const { G, keys } = await trial({ tag: 'H', keys: ['x.slow'], roles: ['defsup'] });
    G.w.document.querySelector('[data-act="bot"]').click();
    const t0 = Date.now(); while (Date.now() - t0 < 4000 && !count(keys, 'Digit2')) await wait(100);
    await wait(500);
    G.store.setState({ cooldowns: {} }); // Davis
    const t1 = Date.now(); await wait(4000);
    r.H = count(keys, 'Digit2', t1);
    G.w.close();
  }
  console.log(JSON.stringify(r));
  const ok = r.A1 === 0 && r.A2 >= 1 && r.B >= 1
    && r.C.buffAfter != null && r.C.buffAfter >= 2500 && r.C.buffFirst
    && r.D1 === 0 && r.D2 >= 1
    && r.E.d3 === 0 && r.E.d2early
    && r.F1.first >= 1 && r.F1.again === 0 && r.F2 >= 1
    && r.G.d2 === 0 && r.G.d3 >= 1 && r.H === 0;
  console.log(ok ? 'OK – Skill-Rotation nach Rollen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
