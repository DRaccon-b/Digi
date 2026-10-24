// 2.53.1: Event-Jagd – Lücken im Event-Vorrang. Autopilot mit fälliger Abgabe (die sonst „nicht kämpfen“ bedeutet):
// A: das Event-Fenster endet mitten im Kampf, der Boss lebt noch -> weiterkämpfen (vorher: Event verworfen, ab zur Abgabe).
// B: der Boss ist kurz unangreifbar (Formwechsel) -> beim Boss warten (vorher: Abgabe übernahm, der Bot lief weg).
// 2.54.0: C: Fenster vorbei und das nächste Event (andere Map) ist schon angesagt -> erst den lebenden Boss fertig machen.
// D: der Boss nimmt 15 s keinen Schaden (Schutzphase) -> nicht sperren, weiter Taste 1 (vorher: 1 min gesperrt).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(mode) {
  const G = makeWorld({ slot: 0, tag: 'H', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_t: { state: 2, counters: [1] } },
    setup({ content }) {
      content.digimon.bigmon_hunt = { name: 'Bigmon' };
      content.quests.q_t = { id: 'q_t', name: 'Abgabe', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
    },
    extraEnts: (id) => (id === 'primary_village' ? [{ id: 'm:boss', kind: 2, defId: 'bigmon_hunt', level: 3, x: 640, y: 330, hp: 900000, maxHp: 900000, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  let endMs = Date.now() + 3600000, nextSoon = false;
  cmds.requestEvents = async () => {
    const now = Date.now();
    if (nextSoon) return [{ id: 'mega_hunt', now, slot: { key: 's1', startMs: now - 3600000, endMs: now - 1000 }, boss: 'bigmon_hunt', mapId: 'primary_village', channel: 1, state: 'defeated',
      next: { boss: 'bigmon_hunt', mapId: 'native_forest', startMs: now + 180000 } }];
    return [{ id: 'mega_hunt', now, slot: { key: 's1', startMs: now - 60000, endMs },
      boss: 'bigmon_hunt', mapId: 'primary_village', channel: 1, state: 'up', next: { boss: 'bigmon_hunt', mapId: 'primary_village', startMs: now + 7200000 } }];
  };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, hunt: true, autopilot: true, apGrind: false, levelRoute: false }));
  const keys = []; G.w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') keys.push(Date.now()); }, true);
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let hit = false;
  for (let i = 0; i < 80 && !hit; i++) { if (G.ents.get('m:boss')?.hp < 900000) hit = true; await wait(150); }
  const sts = new Set();
  if (mode === 'end') endMs = Date.now() - 1000; // Fenster vorbei (Serverzeit), Boss lebt weiter
  else if (mode === 'next') nextSoon = true;
  else if (mode === 'hide') G.ents.get('m:boss').flags = 16 | 256; // unangreifbar
  let keep = null;
  if (mode === 'immune') { const b = G.ents.get('m:boss'), hp = b.hp; keep = setInterval(() => { b.hp = hp; b.targetId = 'p:other'; }, 5); } // greift gerade einen anderen an (Zielwechsel des Bosses)
  const hp0 = G.ents.get('m:boss').hp, me0 = { ...G.ents.get('t:me') };
  let left = 0;
  const n = mode === 'immune' ? 110 : 80; // 16,5 s bzw. 12 s – das Event-Fenster wird alle 10 s neu abgefragt
  for (let i = 0; i < n; i++) {
    sts.add(G.status().slice(0, 70));
    const me = G.ents.get('t:me');
    if (G.state.world.mapId !== 'primary_village' || Math.hypot(me.x - me0.x, me.y - me0.y) > 120) left++;
    await wait(150);
  }
  const tEnd = Date.now();
  if (keep) clearInterval(keep);
  if (mode === 'hide') { G.ents.get('m:boss').flags = 16; await wait(2000); }
  if (mode === 'immune') await wait(1500); // er nimmt wieder Schaden
  const log = G.w.document.body.textContent;
  const r = { hit, hpLoss: hp0 - G.ents.get('m:boss').hp, left, lateKeys: keys.filter((t) => t > tEnd - 3000 && t <= tEnd).length,
    banned: /gesperrt/.test(log), noDmg: /nimmt gerade keinen Schaden/.test(log), sts: [...sts].slice(0, 5) };
  G.w.close();
  return r;
}
(async () => {
  const a = await run('end'), b = await run('hide'), c = await run('next'), d = await run('immune');
  console.log(JSON.stringify({ a, b, c, d }, null, 1));
  const res = [
    ['A Fenster vorbei, Boss lebt: weiterkämpfen', a.hit && a.hpLoss > 0 && a.left === 0],
    ['B kurz unangreifbar: beim Boss warten', b.hit && b.left === 0 && b.hpLoss > 0 && !b.sts.some((s) => /Autopilot/.test(s))],
    ['C nächstes Event angesagt: erst den lebenden Boss', c.hit && c.left === 0 && c.hpLoss > 0],
    ['D kein Schaden (Schutzphase): nicht sperren, weiter Taste 1', d.hit && !d.banned && d.noDmg && d.lateKeys > 0 && d.hpLoss > 0],
  ];
  for (const [nm, ok] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + nm);
  const all = res.every((x) => x[1]);
  console.log(all ? 'ALLES OK' : 'FEHLER');
  process.exit(all ? 0 : 1);
})();
