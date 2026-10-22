// 2.10.0: Mitläufer greift das Ziel des Leaders sofort an (aus der Spielwelt gelesen), schließt liegengebliebene Dialoge,
// und „Bewegungen spiegeln“ lässt ein Fenster ohne Bot dem Leader nachlaufen (auch auf eine andere Map)
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const q = () => ({ q00_meet_gennai: { state: 3, counters: [] } });
const acc = (mirror) => ({ leader: 0, popup: true, mirror, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }, { on: true, user: 'f2', char: 'F2' }] });
const B = makeWorld({ slot: 1, tag: 'Folger', accounts: acc(false), quests: q() });
const C = makeWorld({ slot: 2, tag: 'Spiegel', accounts: acc(true), quests: q() });
B.w.eval(script); C.w.eval(script);
const bus = new BroadcastChannel('digibot-group');
const lead = { mapId: 'native_forest', x: 420, y: 330 };
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, channel: 1, bot: true, status: 'x', quests: {},
  ents: ['t:lead', 'p:lead'], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: null, ...lead }), 1000);
const pos = { mapId: 'native_forest', x: 450, y: 350 };
const ptick = setInterval(() => bus.postMessage({ type: 'pos', slot: 0, channel: 1, ...pos }), 100);
const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms && !fn()) await wait(20); return fn() ? Date.now() - t0 : null; };
(async () => {
  await wait(1500);
  B.ents.set('p:lead', { id: 'p:lead', kind: 1, x: 425, y: 330, hp: 1, flags: 0, targetId: '' });
  B.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  const r = {};
  // 1) Leader-Digimon greift m:3 an – gemeldet wird (noch) nichts
  B.ents.get('p:lead').targetId = 'm:3';
  r.assistMs = await until(() => B.state.target?.id === 'm:3', 3000);
  // 2) liegengebliebener Dialog beim Folgen
  await until(() => B.ents.get('m:3').hp <= 0, 8000);
  B.ents.get('p:lead').targetId = '';
  await wait(800);
  B.store.setState({ dialog: { npc: 'gennai', npcName: 'gennai', node: { id: 'root', choices: [] } } });
  r.dialogClosedMs = await until(() => !B.state.dialog, 3000);
  // 3) Spiegeln: Fenster C (Bot aus) läuft dem Leader nach
  const near = (x, y) => { const t = C.ents.get('t:me'); return Math.hypot(t.x - x, t.y - y) < 10; };
  r.mirror1 = (await until(() => near(450 + 26, 350 + 18), 6000)) !== null; // 2. Mitläufer -> Versatz rechts
  Object.assign(pos, { x: 330, y: 280 });
  r.mirror2Ms = await until(() => near(330 + 26, 280 + 18), 6000);
  Object.assign(pos, { mapId: 'primary_village', x: 500, y: 330 });
  r.mirrorMap = (await until(() => C.state.world?.mapId === 'primary_village', 20000)) !== null;
  r.mirrorOnMap = (await until(() => near(500 + 26, 330 + 18), 15000)) !== null;
  r.status = C.status();
  r.botOffC = !C.w.document.querySelector('[data-act="bot"]').classList.contains('on');
  clearInterval(tick); clearInterval(ptick);
  console.log(r);
  const ok = r.assistMs !== null && r.assistMs < 800 && r.dialogClosedMs !== null && r.dialogClosedMs < 1000 && r.mirror1 && r.mirror2Ms !== null && r.mirrorMap && r.mirrorOnMap && r.botOffC;
  console.log(ok ? 'OK – Gruppe reagiert sofort, Spiegeln läuft' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
