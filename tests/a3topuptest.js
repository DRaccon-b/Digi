// 3.2.5 (A3-Bosse): Schild- und Puls-Phasen. Der Blast während des Schilds kommt mit nur 0,6 s Ansage (45 % der Max-HP auf
// alle, nicht blockbar/ausweichbar), der Puls an festen Boss-HP-Schwellen mit 2,5 s Ansage (arenaweit, unausweichbar).
// S1: Schild steht (Status gate_shield am Boss), HP 60 % -> F1, bis über 65 % (Blast 45 % + 20).   S0: kein Schild, HP 60 %
//     (Einstellung 30 %) -> kein F1.
// S2: Schild mit Ablaufzeit (end in performance.now()-Zeit, wie der Client es speichert) -> ebenso F1.
// P1: Boss bei 82 %, nächste Puls-Schwelle 80 % -> vorher auf 85 % (HP 80 % -> F1).   P0: Boss bei 90 % -> kein F1.
// P2: Boss bei 82 %, HP 88 % -> kein F1 (vor der Schwelle nur bis 85 %, sonst Trank bei jedem Cooldown, minutenlang).
// C1: Puls angesagt (Cast), Boss bei 90 %, HP 85 % -> F1.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const Q = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } };
const HOTBAR = ['cmd:attack', null, null, null, null, null, null, null, 'item:hp_pot'];
const BLAST = { id: 'oro.blast', name: 'Crush Blade', shape: 'circle', origin: 'caster', radius: 2000, power: 0, hpDamagePct: 45, castMs: 600, cooldownMs: 0 };
const PULSE = { id: 'oro.pulse', name: 'Shadow Fang', shape: 'circle', origin: 'caster', radius: 2000, power: 0, mechPower: 5, castMs: 2500, cooldownMs: 0, tell: 'boss_arena_charge' };

async function run({ shield = false, bossPct = 0.9, hp = 1800, cast = false, timed = false }) {
  const G = makeWorld({ slot: 0, tag: 'T', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: Q,
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'b:1', kind: 2, defId: 'oro', x: 470, y: 330, hp: bossPct * 1000000, maxHp: 1000000, level: 120, flags: 16, targetId: 'p:me' }] : []),
    setup({ content }) {
      content.skills = { ...(content.skills || {}), [BLAST.id]: BLAST, [PULSE.id]: PULSE };
      content.digimon.oro = { name: 'Orochimon', radius: 7, base: { at: 2000 } };
      content.spawns.native_forest.bosses = [{ species: 'oro', level: 120, at: 'meadow', respawnMs: 3600000, engaged: true,
        cadence: { skill: PULSE.id, atHp: [0.8, 0.6, 0.4, 0.2] },
        shieldGates: { atHp: [0.75, 0.5, 0.25], shieldPct: 18, pulse: BLAST.id, pulseEvery: 3, controlPct: 50, breakOn: ['as'] } }];
    } });
  G.handlers = {};
  G.w.dmo.net.on = (name, fn) => { G.handlers[name] = fn; return () => {}; };
  const sc = G.w.dmo.game.scene.getScene('world');
  sc.telegraphs = { active: [], marksActive: [], circles: [] }; sc.mechB = { lines: [] };
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, hotbar: HOTBAR, inventory: [{ itemId: 'hp_pot', qty: 20 }], partner: { ...st0.me.partner, hp, maxHp: 3000 } },
    effects: shield ? { 'b:1': [{ id: 'gate_shield', end: timed ? G.w.performance.now() + 60000 : 0, ms: timed ? 60000 : 0 }] } : {} });
  const keys = [];
  G.w.addEventListener('keydown', (e) => {
    keys.push(e.code);
    if (e.code === 'F1') { const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, hp: Math.min(3000, s.me.partner.hp + 150) } } }); }
  }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 30, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 200, potCdMs: 500 }));
  G.w.eval(script);
  await wait(800);
  G.store.setState({ target: { id: 'b:1', kind: 'mob', name: 'Orochimon', level: 120, hp: bossPct * 1000000, maxHp: 1000000 } });
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(400);
  if (cast) G.handlers.evs?.([{ t: 'skill', src: 'b:1', skill: PULSE.id, phase: 'cast' }]);
  await wait(2500);
  const r = { f1: keys.filter((k) => k === 'F1').length, hp: G.store.getState().me.partner.hp };
  G.w.close();
  return r;
}

(async () => {
  const S1 = await run({ shield: true, bossPct: 0.7, hp: 1800 }), S0 = await run({ shield: false, bossPct: 0.7, hp: 1800 });
  const S2 = await run({ shield: true, timed: true, bossPct: 0.7, hp: 1800 });
  const P1 = await run({ bossPct: 0.82, hp: 2400 }), P0 = await run({ bossPct: 0.9, hp: 2550 }), P2 = await run({ bossPct: 0.82, hp: 2640 });
  const C1 = await run({ bossPct: 0.9, hp: 2550, cast: true });
  console.log(JSON.stringify({ S1, S2, S0, P1, P0, P2, C1 }));
  const ok = { S1: S1.f1 >= 1 && S1.hp >= 1950, S2: S2.f1 >= 1 && S2.hp >= 1950, S0: S0.f1 === 0, P1: P1.f1 >= 1 && P1.hp >= 2550, P0: P0.f1 === 0, P2: P2.f1 === 0, C1: C1.f1 >= 1 && C1.hp >= 2850 };
  console.log(ok.S1 ? 'OK     S1: Schild – HP über Blast + 20 %' : 'FEHLER S1 ' + JSON.stringify(S1));
  console.log(ok.S2 ? 'OK     S2: Schild mit Ablaufzeit erkannt' : 'FEHLER S2 ' + JSON.stringify(S2));
  console.log(ok.P2 ? 'OK     P2: vor der Schwelle nur bis 85 %' : 'FEHLER P2 ' + JSON.stringify(P2));
  console.log(ok.S0 ? 'OK     S0: ohne Schild normale Grenze' : 'FEHLER S0 ' + JSON.stringify(S0));
  console.log(ok.P1 ? 'OK     P1: Puls-Schwelle naht – auf 85 %' : 'FEHLER P1 ' + JSON.stringify(P1));
  console.log(ok.P0 ? 'OK     P0: Schwelle weit weg – kein F1' : 'FEHLER P0 ' + JSON.stringify(P0));
  console.log(ok.C1 ? 'OK     C1: Puls angesagt – auf 95 %' : 'FEHLER C1 ' + JSON.stringify(C1));
  process.exit(Object.values(ok).every(Boolean) ? 0 : 1);
})();
