// 3.1.43: Gruppen-Skills nach Wirkungsklasse abstimmen – nur ein Fenster zündet.
// A: zwei Clavis mit demselben Def-Support (Gruppen-Schild), Effekt fehlt überall -> genau ein Tastendruck (kleinster Slot).
// B: Effekt läuft aus -> wieder genau einer.   C: Fenster 0 kann nicht drücken (Skill-Warteschlange) -> keine Beanspruchung, Fenster 1 springt ein.
// D: Gruppen-Heal < 60 %, Imperialdramon bei 40 % -> genau eine Heilung.   E: Def-Support als Gegner-Debuff auf den Boss -> genau einer.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SK = {
  'x.field': { id: 'x.field', name: 'Field', kind: 'buff', target: 'self', shape: 'circle', radius: 96, dsCost: 5, cooldownMs: 1500, castMs: 0, effects: [{ stat: 'de', pct: 35, durationMs: 6000 }] },
  'x.seal': { id: 'x.seal', name: 'Seal', kind: 'heal', target: 'ally', shape: 'circle', radius: 96, power: 870, dsCost: 5, cooldownMs: 1500, castMs: 0, range: 128 },
  'x.field2': { id: 'x.field2', name: 'Field2', kind: 'buff', target: 'self', shape: 'circle', radius: 96, dsCost: 5, cooldownMs: 1500, castMs: 0, effects: [{ stat: 'de', pct: 40, durationMs: 6000 }] },
  'x.slow': { id: 'x.slow', name: 'Lock', kind: 'debuff', target: 'enemy', shape: 'single', dsCost: 5, cooldownMs: 1500, castMs: 0, range: 128, effects: [{ stat: 'as', pct: -20, durationMs: 6000 }] },
};
const KEYS = ['x.field', 'x.seal', 'x.slow'];
const accounts = { leader: 0, popup: true, dungeon: true, list: [{ on: true, user: 'a', char: 'ClavisA' }, { on: true, user: 'b', char: 'ClavisB' }, { on: true, user: 'c', char: 'Imperial' }] };
const party = { id: 'party1', members: [0, 1, 2].map((x) => ({ charId: 'c' + x, name: accounts.list[x].char, partnerEntityId: x === 2 ? 'p:imp' : 'p:cl' + x })) };

function worlds(o) {
  const wins = [0, 1, 2].map((slot) => {
    const W = makeWorld({ slot, accounts, tag: o.tag + slot, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
      extraEnts: (id) => (id === 'native_forest' ? [
        { id: 'boss:1', kind: 2, defId: 'armageddemon', x: 470, y: 330, hp: 800000, maxHp: 900000, level: 5, flags: 16 | 32, targetId: 'p:me' },
        ...[0, 1, 2].filter((x) => x !== slot).map((x) => ({ id: party.members[x].partnerEntityId, kind: 1, x: 420 + x * 20, y: 340, hp: x === 2 ? (o.impHp ?? 3000) : 3000, maxHp: 3000, flags: 0, targetId: '' }))] : []),
      setup({ content }) { content.skills = { ...(content.skills || {}), ...SK }; content.digimon.armageddemon = { name: 'Armageddemon', skills: [] }; } });
    const clavis = slot < 2, role = {}, grpHeal = {}, keys = o.alt && slot === 1 ? ['x.field2', ...KEYS.slice(1)] : KEYS;
    if (clavis) { role[2] = 'defsup'; role[3] = o.heal ? 'grpheal' : 'attack'; grpHeal[3] = 60; role[4] = o.enemy ? 'defsup' : 'attack'; }
    W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, dungeon: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc',
      skillSets: { clavisangemon: { skills: { 2: !!o.field, 3: !!o.heal, 4: !!o.enemy, 5: true, 6: true }, heal: {}, role, grpHeal, aoeN: {}, rolesV: 1 } } }));
    const me = W.store.getState().me;
    W.store.setState({ party: { ...party, members: party.members.map((m, x) => ({ ...m, me: x === slot })) },
      target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 5, hp: 800000, maxHp: 900000 },
      me: { ...me, hotbar: ['cmd:attack', ...(clavis ? keys.map((_, i) => 'skill:' + i) : [])], partner: { ...me.partner, entityId: 'p:me', species: clavis ? 'clavisangemon' : 'imperialdramon', ds: 5000, maxDs: 5000,
        hp: 3000, maxHp: 3000, skills: clavis ? keys.map((id) => ({ id, name: SK[id].name, dsCost: 5, unlocked: true })) : [] } } });
    W.keys = [];
    W.w.addEventListener('keydown', (e) => {
      const n = Number(e.code.replace('Digit', '')) - 2; if (!(n >= 0) || n > 2 || !clavis) return;
      W.keys.push({ k: e.code, t: Date.now() });
      const s = W.store.getState(); W.store.setState({ cooldowns: { ...s.cooldowns, ['skill:' + n]: { start: W.w.performance.now(), end: W.w.performance.now() + 1500 } } });
      // wie im Spiel: der Gruppen-Schild liegt danach bei allen Partnern im Kreis, der Debuff auf dem Boss
      if (n === 0 || n === 2) for (const V of wins) {
        const ids = n === 0 ? ['p:me', 'p:cl0', 'p:cl1', 'p:imp'] : ['boss:1'];
        const ef = { ...(V.store.getState().effects || {}) };
        for (const id of ids) ef[id] = [...(ef[id] || []).filter((x) => x.id !== keys[n]), { id: keys[n], end: V.w.performance.now() + 6000, ms: 6000 }];
        V.store.setState({ effects: ef });
      }
    }, true);
    W.w.eval(script);
    return W;
  });
  return wins;
}
const n = (W, k, from = 0) => W.keys.filter((x) => x.k === k && x.t >= from).length;

// Jeder Fall läuft in einem eigenen Prozess: geschlossene Testfenster senden sonst weiter auf dem Gruppenkanal
const CASE = process.argv[3];
if (!CASE) {
  const { execFileSync } = require('child_process');
  const r = {};
  for (const c of ['AB', 'C', 'D', 'E', 'F']) {
    let out = '';
    try { out = execFileSync(process.execPath, [__filename, process.argv[2], c], { encoding: 'utf8', timeout: 120000 }); } catch (e) { out = String(e.stdout || ''); }
    Object.assign(r, JSON.parse((out.match(/^RES (.*)$/m) || [, '{}'])[1]));
  }
  console.log(JSON.stringify(r));
  const one = (a) => !!a && a[0] + a[1] === 1;
  const ok = one(r.A) && r.A[0] === 1 && one(r.B) && r.C?.[0] === 0 && r.C?.[1] >= 1 && one(r.D) && one(r.E) && one(r.F);
  console.log(ok ? 'OK – Gruppen-Skills abgestimmt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
}
(async () => {
  const r = {};
  // A + B: Gruppen-Schild
  if (CASE === 'AB') {
    const wins = worlds({ tag: 'A', field: true });
    await wait(1200);
    for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
    wins[0].w.document.querySelector('[data-act="bot"]').click();
    await wait(3500);
    r.A = [n(wins[0], 'Digit2'), n(wins[1], 'Digit2')];
    await wait(3500); // Effekt (6 s) läuft aus
    const t1 = Date.now() - 1000;
    await wait(3000);
    r.B = [n(wins[0], 'Digit2', t1), n(wins[1], 'Digit2', t1)];
    for (const W of wins) W.w.close();
  }
  // C: Fenster 0 kann nicht drücken
  if (CASE === 'C') {
    const wins = worlds({ tag: 'C', field: true });
    wins[0].w.dmo.client = { ...(wins[0].w.dmo.client || {}), skillQueue: { queued: true } };
    await wait(1200);
    for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
    wins[0].w.document.querySelector('[data-act="bot"]').click();
    await wait(4000);
    r.C = [n(wins[0], 'Digit2'), n(wins[1], 'Digit2')];
    for (const W of wins) W.w.close();
  }
  // D: Gruppen-Heal
  if (CASE === 'D') {
    const wins = worlds({ tag: 'D', heal: true, impHp: 1200 });
    await wait(1200);
    for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
    wins[0].w.document.querySelector('[data-act="bot"]').click();
    await wait(2300);
    r.D = [n(wins[0], 'Digit3'), n(wins[1], 'Digit3')];
    for (const W of wins) W.w.close();
  }
  // E: Gegner-Debuff
  if (CASE === 'E') {
    const wins = worlds({ tag: 'E', enemy: true });
    await wait(1200);
    for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
    wins[0].w.document.querySelector('[data-act="bot"]').click();
    await wait(5000); // erst Position am Boss, dann Wartezeit der Gruppenwahl
    r.E = [n(wins[0], 'Digit4'), n(wins[1], 'Digit4')];
    for (const W of wins) W.w.close();
  }
  // F: verschiedene Digimon-Skills mit gleicher Wirkung (Abwehr-Schild): der zweite zündet nicht, solange der erste wirkt
  if (CASE === 'F') {
    const wins = worlds({ tag: 'F', field: true, alt: true });
    await wait(1200);
    for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
    wins[0].w.document.querySelector('[data-act="bot"]').click();
    await wait(5500);
    r.F = [n(wins[0], 'Digit2'), n(wins[1], 'Digit2')];
    for (const W of wins) W.w.close();
  }
  console.log('RES ' + JSON.stringify(r));
  process.exit(0);
})();
