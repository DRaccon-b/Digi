// 2.43.2: Named Elite zwischen normalen Monstern derselben Art und desselben Levels (live: Tyrannomon in Harvest Hills)
// – nur das Monster mit den erhöhten HP (statMult) ist der Boss; stirbt ein normaler, gibt es kein „Boss besiegt“.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'N', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  setup({ content, MAPS }) {
    content.digimon.tyrmon = { name: 'Tyrmon', base: { hp: 1000 }, growth: { hp: 100 }, mob: { expBase: 6.5 } };
    content.spawns.native_forest.zones.meadow = { entries: [{ species: 'tyrmon', level: [5, 5], weight: 1 }] };
    content.spawns.native_forest.bosses = [{ species: 'tyrmon', at: 'ridge', level: 5, respawnMs: 240000, statMult: 2.06 }];
    MAPS.native_forest.layers[0].objects.push({ type: 'zone', name: 'ridge', x: 700, y: 280, width: 120, height: 100 });
  },
  // normaler Tyrmon Lv 5 (1 400 HP) direkt beim Spieler, Named Elite (2 884 HP) in der Zone „ridge“
  extraEnts: (id) => (id === 'native_forest' ? [
    { id: 'n:1', kind: 2, defId: 'tyrmon', x: 420, y: 330, hp: 300, maxHp: 1400, level: 5, flags: 0, targetId: '' },
    { id: 'b:1', kind: 2, defId: 'tyrmon', x: 760, y: 330, hp: 900000, maxHp: 2884, level: 5, flags: 1024, targetId: '' },
  ] : []) });
const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
cmds.requestBossPins = () => {}; cmds.requestMapInfo = () => {};
const st = G.store.getState();
G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 3, stats: { at: 2000, as: 1200 } } } });
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 8, radius: 250,
  levelRoute: true, levelA2: false, levelBoss: true, levelEvo: false, farmChannels: [1] }));
G.w.eval(script);
(async () => {
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let bossHit = false;
  for (let i = 0; i < 110; i++) { if (G.ents.get('b:1').hp < 900000) { bossHit = true; break; } await wait(150); }
  const log = [...G.w.document.querySelectorAll('[data-f="log"] > *')].map((x) => x.textContent);
  const falseKill = log.some((t) => /Boss besiegt/.test(t));
  console.log({ normalTot: G.ents.get('n:1').hp === 0, bossHit, falseKill, log: log.filter((t) => /Boss|Leveln/.test(t)).slice(0, 5) });
  const ok = G.ents.get('n:1').hp === 0 && bossHit && !falseKill;
  console.log(ok ? 'OK – normaler Tyrmon ist kein Boss, der Named Elite wird angegriffen' : 'FEHLER');
  G.w.close();
  process.exit(ok ? 0 : 1);
})();
