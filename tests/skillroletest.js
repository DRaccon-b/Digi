// 3.1.43: Skill-Rollen je Taste und Digitationsform.
// A: Vorschlag aus den Spieldaten im Rollenfeld (AoE, Tank-Buff, Angriffs-Buff, Gruppen-Heal, Def-Support), Auswahl speichert.
// B: Rollen und AoE-Schwelle überstehen das Speichern (digibotConfig behielt bisher nur skills/heal).
// C: Migration „Heal < 50 %“ mit abgehaktem Haken: Haken an, Heal-Wert bleibt (heute heilte healSkill trotz Haken aus).
// D: Migration Ally-Heal: wird „Gruppen-Heal < 85 %“ (bzw. alter Heal-Wert), Haken an.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SK = {
  'x.aoe': { id: 'x.aoe', name: 'Area', kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, power: 200, dsCost: 5, cooldownMs: 8000, range: 128 },
  'x.selfdef': { id: 'x.selfdef', name: 'Guard', kind: 'buff', target: 'self', shape: 'single', dsCost: 5, cooldownMs: 30000, effects: [{ stat: 'de', pct: 70, durationMs: 30000 }] },
  'x.selfatk': { id: 'x.selfatk', name: 'Rage', kind: 'buff', target: 'self', shape: 'single', dsCost: 5, cooldownMs: 30000, effects: [{ stat: 'at', pct: 30, durationMs: 15000 }] },
  'x.allyheal': { id: 'x.allyheal', name: 'Seal', kind: 'heal', target: 'ally', shape: 'circle', radius: 96, power: 870, dsCost: 5, cooldownMs: 18000, range: 128 },
  'x.slow': { id: 'x.slow', name: 'Lock', kind: 'debuff', target: 'enemy', shape: 'single', dsCost: 5, cooldownMs: 12000, effects: [{ stat: 'as', pct: -20, durationMs: 12000 }] },
};
const IDS = Object.keys(SK);

async function run(set, lateHotbar) {
  const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { Object.assign(content.skills ||= {}, SK); } });
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, hotbar: lateHotbar ? ['cmd:attack'] : ['cmd:attack', 'skill:0', 'skill:1', 'skill:2', 'skill:3', 'skill:4'],
    partner: { ...st0.me.partner, species: 'clavisangemon', skills: IDS.map((id) => ({ id, name: SK[id].name, dsCost: 5, unlocked: true })) } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'mon', skillSets: { clavisangemon: set } }));
  G.w.eval(script);
  await wait(1500);
  return G;
}
const saved = (G) => JSON.parse(G.w.localStorage.getItem('digibot.cfg') || '{}').skillSets?.clavisangemon || {};

(async () => {
  const r = {};
  // A: Vorschlag und Auswahl
  {
    const G = await run({ skills: { 2: true, 3: true, 4: true, 5: true, 6: true }, heal: {}, rolesV: 1 }); // neue Einstellung: keine Migration
    const sel = (k) => G.w.document.querySelector(`[data-rolecfg="${k}"]`);
    r.A = [2, 3, 4, 5, 6].map((k) => `${sel(k)?.value}${sel(k)?.dataset.suggested === '1' ? '*' : ''}`);
    const s2 = sel(2);
    if (s2) { s2.value = 'aoe:3'; s2.dispatchEvent(new G.w.Event('input', { bubbles: true })); }
    await wait(400);
    const sv = saved(G);
    r.A2 = { role: sv.role?.['2'], n: sv.aoeN?.['2'], sug: sel(2)?.dataset.suggested };
    G.w.close();
  }
  // B: Rollen überstehen das Speichern
  {
    const G = await run({ skills: { 2: true, 3: true, 4: true, 5: true, 6: true }, heal: {}, role: { 3: 'atksup' }, aoeN: { 2: 4 } });
    const sv = saved(G);
    r.B = { role3: sv.role?.['3'], aoe2: sv.aoeN?.['2'] };
    G.w.close();
  }
  // C: alte Heal-Taste mit Haken aus
  {
    const G = await run({ skills: { 2: true, 3: true, 4: false, 5: true, 6: true }, heal: { 4: 50 } });
    const sv = saved(G);
    r.C = { on4: sv.skills?.['4'], role4: sv.role?.['4'], heal4: sv.heal?.['4'], v: sv.rolesV };
    G.w.close();
  }
  // D: Ally-Heal-Taste ohne/mit Heal-Wert
  {
    const G = await run({ skills: { 2: true, 3: true, 4: true, 5: false, 6: true }, heal: {} });
    const sv = saved(G);
    r.D = { role5: sv.role?.['5'], g5: sv.grpHeal?.['5'], on5: sv.skills?.['5'] };
    G.w.close();
    const H = await run({ skills: { 2: true, 3: true, 4: true, 5: false, 6: true }, heal: { 5: 60 } });
    const sh = saved(H);
    r.D2 = { role5: sh.role?.['5'], g5: sh.grpHeal?.['5'], heal5: sh.heal?.['5'] };
    H.w.close();
  }
  // E: beim Laden ist die Hotbar noch leer (Spiel lädt nach) -> Migration erst, wenn die Skills da sind
  {
    const G = await run({ skills: { 2: true, 3: true, 4: true, 5: false, 6: true }, heal: {} }, true);
    const s = G.store.getState(); G.store.setState({ me: { ...s.me, hotbar: ['cmd:attack', 'skill:0', 'skill:1', 'skill:2', 'skill:3', 'skill:4'] } });
    await wait(1200);
    const sv = saved(G);
    r.E = { role5: sv.role?.['5'], on5: sv.skills?.['5'] };
    G.w.close();
  }
  console.log(JSON.stringify(r));
  const okA = JSON.stringify(r.A) === JSON.stringify(['attack*', 'tankbuff*', 'atkbuff*', 'grpheal:85*', 'defsup*']) && r.A2.role === 'aoe' && r.A2.n === 3 && r.A2.sug !== '1';
  const okB = r.B.role3 === 'atksup' && r.B.aoe2 === 4;
  const okC = r.C.on4 === true && r.C.role4 === undefined && r.C.heal4 === 50 && r.C.v === 1;
  const okD = r.D.role5 === 'grpheal' && r.D.g5 === 85 && r.D.on5 === true && r.D2.role5 === 'grpheal' && r.D2.g5 === 60 && r.D2.heal5 === undefined;
  const only = process.env.ONLY; // Task 1 prüft B–D, Task 2 zusätzlich A
  const okE = r.E.role5 === 'grpheal' && r.E.on5 === true;
  const ok = (only === 'BCD' || okA) && okB && okC && okD && okE;
  console.log({ okA, okB, okC, okD });
  console.log(ok ? 'OK – Skill-Rollen gespeichert und migriert' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
