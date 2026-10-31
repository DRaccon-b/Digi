// 3.1.42 (Review): A3-Wiederholungen in der Gruppe, wenn Leader und Mitläufer in verschiedenen Phasen sind.
// M: Leader läuft die Quest zum ersten Mal und meldet ihr Reiseziel (Index 1). Der Mitläufer wiederholt sie – dort gibt es
//    kein Ziel 1 (Wiederholung: nur Kunemon). Er darf das Reiseziel nicht übernehmen (sonst läuft er in die Lichtung,
//    das Ziel zählt nie, ~15 s verloren).
// S: „Leader erledigt die Quests der Mitläufer“: F1 hat den Erstlauf fertig (state 2), F2 wiederholt sie mit 0/50
//    Kunemon. Die offenen Ziele von F2 gehen vor – der Leader jagt Kunemon (vorher: Quest galt als fertig, nichts zu jagen).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const today = Math.floor((Date.now() - 7 * 3600e3) / 864e5);
const quest = (content) => {
  content.npcs.elder = { name: 'Elder' };
  content.quests.a3s_g_1 = { id: 'a3s_g_1', name: 'Gruppenkette', giver: 'elder', turnIn: 'elder', minLevel: 1,
    objectives: [{ kind: 'kill', species: 'kunemon', count: 50 }, { kind: 'reach', mapId: 'native_forest', zone: 'glade' }],
    repeat: { objectives: [{ kind: 'kill', species: 'kunemon', count: 50 }] } };
  content.quests.q02_first_steps.minLevel = 99; // nicht ablenken
};
const base = { q00_meet_gennai: { state: 3, counters: [] } };

async function mirror() {
  const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
  const setup = ({ content, MAPS }) => {
    quest(content);
    MAPS.native_forest.layers[0].objects.push({ type: 'zone', name: 'glade', x: 650, y: 450, width: 150, height: 150 });
  };
  const B = makeWorld({ slot: 1, tag: 'Folger', accounts, setup, mobs: [], quests: { ...base, a3s_g_1: { state: 1, counters: [50, 1, today - 1, 0] } } });
  B.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
  B.w.eval(script);
  const bus = require('./groupbus')('digibot-group');
  const talks = [{ key: 'reach:a3s_g_1:1@1', tkey: 'reach:a3s_g_1:1', kind: 'reach', at: Date.now(), questId: 'a3s_g_1', objIndex: 1, need: 1, off: 0,
    pool: null, loc: { mapId: 'native_forest', x: 725, y: 525 }, label: 'Gruppenkette: nach Native Forest (glade) reisen' }];
  const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 400, y: 330,
    bot: true, status: 'x', quests: { a3s_g_1: { state: 1, counters: [10, 0] } }, ents: [], talks, done: [], busy: null, noFight: false, task: null, hunt: [], targetId: null }), 300);
  await wait(1200);
  B.w.document.querySelector('[data-act="bot"]').click();
  let maxX = 0, sawReach = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    maxX = Math.max(maxX, B.ents.get('t:me').x);
    if (/glade|Lichtung|reisen/.test(B.status())) sawReach = true;
    await wait(150);
  }
  clearInterval(tick);
  const r = { maxX: Math.round(maxX), sawReach, status: B.status() };
  B.w.close(); bus.close?.();
  return r;
}

async function serve() {
  const accounts = { leader: 0, popup: true, mirror: false, serve: true,
    list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'f1', char: 'F1' }, { on: true, user: 'f2', char: 'F2' }] };
  const respawn = (m) => setTimeout(() => { m.hp = 300; m.targetId = ''; }, 600);
  const L = makeWorld({ slot: 0, accounts, tag: 'L', setup: ({ content }) => { quest(content); content.quests.a3s_g_1.minLevel = 99; }, quests: { ...base }, onKill: respawn });
  const F1 = makeWorld({ slot: 1, accounts, tag: 'F1', setup: ({ content }) => quest(content), mobs: [], quests: { ...base, a3s_g_1: { state: 2, counters: [50, 1] } } });
  const F2 = makeWorld({ slot: 2, accounts, tag: 'F2', setup: ({ content }) => quest(content), mobs: [], quests: { ...base, a3s_g_1: { state: 1, counters: [50, 1, today - 1, 0] } } });
  for (const W of [L, F1, F2]) { W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, apNoTurnin: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', radius: 400 })); W.w.eval(script); }
  await wait(1500);
  L.w.document.querySelector('[data-act="grp-start"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 12000 && !L.kills) await wait(200);
  const r = { Lkills: L.kills, Lstatus: L.status() };
  for (const W of [L, F1, F2]) W.w.close();
  return r;
}

(async () => {
  const m = await mirror();
  const s = await serve();
  console.log({ m, s });
  const ok = m.maxX < 600 && !m.sawReach && s.Lkills > 0;
  console.log(ok ? 'OK – A3-Wiederholungen in gemischten Gruppen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
