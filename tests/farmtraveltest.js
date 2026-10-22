// 2.26.0: Boss-Rotation – unterwegs zum Boss nicht gegen Verfolger kämpfen; am Spawnpunkt (Boss nicht da) darf er sie
// erledigen; erscheint der Boss, zuerst der Boss.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[430, 330]],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  setup({ content, MAPS }) {
    content.digimon.arukenimon = { name: 'Arukenimon' };
    content.spawns.native_forest.bosses = [{ species: 'arukenimon', at: 'boss_a', level: 3, respawnMs: 900000 }];
    MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_a', x: 1200, y: 800 });
  } });
const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 2, maxClients: 40 }];
cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [{ map: 'native_forest', index: 0, channel: 1, respawnInMs: 120000 }] } });
cmds.requestMapInfo = () => {};
// Verfolger: zäh, bleibt dicht hinter dem Tamer und greift an
const t = G.ents.get('t:me');
const chase = setInterval(() => { const m = G.ents.get('m:1'); if (!m) return; if (m.hp <= 0) return; m.targetId = 'p:me'; m.flags |= 32; m.x = t.x + 25; m.y = t.y; }, 50);
const hits = [];
G.w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') hits.push({ at: Date.now(), d: Math.round(Math.hypot(t.x - 1200, t.y - 800)), tgt: G.store.getState().target?.id }); }, true);
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'boss', farmBosses: ['native_forest#arukenimon'], farmChannels: [1],
  hpPot: 0, dsPot: 0, tdsPot: 0, radius: 300, lvlDiff: 20, tab: 'log' }));
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && Math.hypot(t.x - 1200, t.y - 800) > 70) await wait(200);
  const arrived = Math.hypot(t.x - 1200, t.y - 800) <= 70;
  const enRoute = hits.filter((h) => h.d > 200).length;
  const m = G.ents.get('m:1'); m.hp = 1e6; m.maxHp = 1e6; // zäh: der Kampf läuft noch, als der Boss kommt
  await wait(2500);
  const atSpot = hits.filter((h) => h.d <= 200 && h.tgt === 'm:1').length;
  G.ents.set('b:1', { id: 'b:1', kind: 2, defId: 'arukenimon', level: 3, x: 1210, y: 810, hp: 50000, maxHp: 60000, flags: 16, targetId: '' });
  await wait(2500);
  clearInterval(chase);
  const r = { arrived, enRoute, atSpot, target: G.store.getState().target?.id, st: G.status() };
  console.log(r);
  const ok = arrived && enRoute === 0 && atSpot > 0 && r.target === 'b:1';
  console.log(ok ? 'OK – unterwegs nicht gekämpft, am Spawnpunkt Verfolger, dann der Boss' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
