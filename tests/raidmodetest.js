// 2.32.0: Dungeon-Modus „Apocalymon-Raid“ – digitiert vor der Tür, läuft selbst hin und hinein, Adds vor dem Boss,
// nach dem Sieg hinaus, dann stoppt der Bot. Kleine Welt: Native Forest = Tür-Map, Primary Village = Raid-Map.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(RAID, BOSS, ADD) {
const order = [];
const G = makeWorld({ slot: 0, tag: 'R', noHash: true, accounts: { leader: 0, list: [{ user: 'acc1' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] } },
  setup({ content, MAPS }) {
    content.digimon[RAID] = { name: BOSS }; content.digimon[ADD] = { name: ADD };
    content.spawns.primary_village.raid = { id: RAID, gate: { mapId: 'native_forest', portal: 'pv' }, party: { min: 1, max: 5 }, deathLimit: 3, landing: 'from_nf' };
    content.spawns.primary_village.bosses = [{ species: RAID, level: 3, at: 'boss_x', adds: { species: ADD, level: 3 } }];
    MAPS.primary_village.layers[0].objects.push({ type: 'spawn', name: 'boss_x', x: 600, y: 330 });
  },
  extraEnts: (id) => (id === 'primary_village' ? [
    { id: 'b:1', kind: 2, defId: RAID, level: 3, x: 610, y: 330, hp: 600, maxHp: 600, flags: 16, targetId: '' },
    { id: 'a:1', kind: 2, defId: ADD, level: 3, x: 640, y: 360, hp: 300, maxHp: 300, flags: 0, targetId: '' },
  ] : []),
  onKill(m, api) {
    order.push(m.defId);
    if (m.defId === RAID) G.store.setState({ raid: { raid: RAID, inside: true, cleared: true } });
  } });
const st0 = G.store.getState();
G.store.setState({ me: { ...st0.me, tamerDs: 300, partner: { ...st0.me.partner, species: 'patamon', level: 30, evolutions: [{ species: 'patamon' },
  { species: 'angemon', from: 'patamon', canEvolveNow: true, dsCost: 10 }] } } });
let evolvedOn = null;
const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
cmds.evolve = (sp) => { evolvedOn = G.store.getState().world.mapId; const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp } } }); };
G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, farm: false, dungeon: true, dgMode: RAID, apEvo: 'angemon', hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 100 }));
G.w.eval(script);
return (async () => {
  await wait(1200);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now(); let wasInside = false;
  while (Date.now() - t0 < 60000) {
    await wait(300);
    if (G.store.getState().world.mapId === 'primary_village') wasInside = true;
    if (wasInside && /Bot aus|geschafft/.test(G.status()) && G.store.getState().world.mapId === 'native_forest') break;
  }
  const r = { evolvedOn, wasInside, order, map: G.store.getState().world.mapId, status: G.status() };
  console.log(r);
  const ok = evolvedOn === 'native_forest' && wasInside && order[0] === ADD && order.includes(RAID) && r.map === 'native_forest';
  G.w.close();
  return ok;
})();
}
(async () => {
  const a = await run('apocalymon', 'Apocalymon', 'megadramon'), m = await run('malomyotismon', 'MaloMyotismon', 'phantomon');
  console.log({ apocalymon: a, malomyotismon: m });
  console.log(a && m ? 'OK – beide Raids: digitiert, hineingelaufen, Add vor Boss, wieder hinaus' : 'FEHLER');
  process.exit(a && m ? 0 : 1);
})();
