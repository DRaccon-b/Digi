// 3.2.4 (A3-Bosse): In der Boss-Rotation blieben Adds unbeachtet. Bei den Tamers-Bossen stärken sie den Boss (empowerPct 18)
// und heilen ihn nach 20 s (feedPctPerSec). A: Boss mit solchen Adds unter 70 %, Add erscheint -> der Bot nimmt das Add.
// C: wie A, danach heilt sich der Boss über die Schwelle (80 %) -> das Add bleibt Ziel (kein Hin und Her).
// B: gleicher Boss, Add ohne empowerPct/feedPctPerSec (alte Feldbosse) -> in der Rotation bleibt der Boss das Ziel (wie bisher).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(empower, heal = false) {
  const adds = { species: 'doku', level: 5, atHp: [0.7, 0.35], count: 2, points: [], ...(empower ? { empowerPct: 18, feedPctPerSec: 0.5, feedAfterMs: 20000 } : {}) };
  const W = makeWorld({ slot: 0, tag: empower ? 'A' : 'B', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'b:1', kind: 2, defId: 'oro', x: 470, y: 330, hp: 900000, maxHp: 900000, level: 5, flags: 16, targetId: '' }] : []),
    setup({ content }) {
      content.digimon.oro = { name: 'Orochimon', radius: 7 }; content.digimon.doku = { name: 'Dokugumon', radius: 7 };
      content.spawns.native_forest.bosses = [{ species: 'oro', level: 5, at: 'meadow', respawnMs: 3600000, adds }];
    } });
  W.handlers = {};
  W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
  const sc = W.w.dmo.game.scene.getScene('world'), sel = sc.select, picked = [];
  sc.select = (id) => { picked.push(id); return sel(id); };
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', farm: true, farmMode: 'boss', farmBosses: ['native_forest#oro'], farmChannels: [1] }));
  W.w.eval(script);
  await wait(1500);
  W.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  const b = W.ents.get('b:1'); b.hp = 540000; // 60 %
  await wait(600);
  W.ents.set('a:1', { id: 'a:1', kind: 2, defId: 'doku', x: 500, y: 360, hp: 50000, maxHp: 50000, level: 5, flags: 0, targetId: '' });
  const n0 = picked.length; await wait(2500);
  let backToBoss = null;
  if (heal) { b.hp = 720000; const n1 = picked.length; await wait(2000); backToBoss = picked.slice(n1).includes('b:1') || W.store.getState().target?.id === 'b:1'; }
  const after = picked.slice(n0);
  const r = { empower, heal, backToBoss, bossFirst: picked.includes('b:1'), add: after.includes('a:1'), st: W.status().slice(0, 70), target: W.store.getState().target?.id };
  W.w.close();
  return r;
}
(async () => {
  const A = await run(true), B = await run(false), C = await run(true, true);
  console.log(JSON.stringify({ A, B, C }));
  const okC = C.add && C.backToBoss === false;
  const okA = A.bossFirst && A.add && A.target === 'a:1', okB = B.bossFirst && !B.add && B.target === 'b:1';
  console.log(okA ? 'OK     A: Boss-Rotation – stärkende Adds zuerst' : 'FEHLER A ' + JSON.stringify(A));
  console.log(okB ? 'OK     B: Boss-Rotation – andere Adds wie bisher ignoriert' : 'FEHLER B ' + JSON.stringify(B));
  console.log(okC ? 'OK     C: Boss über die Schwelle geheilt – Add bleibt Ziel' : 'FEHLER C ' + JSON.stringify(C));
  process.exit(okA && okB && okC ? 0 : 1);
})();
