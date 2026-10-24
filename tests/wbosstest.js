// 2.54.0: Knopf 🌍 Weltboss – ein Weltboss (worldBoss in den Spieldaten, z. B. BlackWarGreymon) spawnt auf Kanal 1 und 2.
// A: Chat-Warnung, beide Kanäle ohne Timer (gleichzeitig) -> erst Kanal 1, dann Kanal 2.
// B: Boss-Timer: Kanal 2 lebt schon, Kanal 1 spawnt erst 40 s nach der Warnung -> erst Kanal 2, dann Kanal 1.
// C: Knopf aus -> kein Kanalwechsel, kein Angriff auf den Weltboss.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run({ on, ch2Up }) {
  const order = [];
  const boss = (ch) => ({ id: `w:${ch}`, kind: 2, defId: 'bwg', x: 520, y: 330, hp: 900, maxHp: 900, level: 3, flags: 16, targetId: '' });
  const dead = new Set();
  const G = makeWorld({ slot: 0, tag: 'B', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.bwg = { name: 'BlackWarGreymon' };
      content.spawns.native_forest.bosses = [{ species: 'bwg', at: 'boss_w', level: 3, respawnMs: 10800000, worldBoss: { warnMs: ch2Up ? 40000 : 4000 } }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_w', x: 520, y: 330 });
    },
    onKill(m) { order.push(m.id); dead.add(m.id); } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 3, maxClients: 40, mapId: 'native_forest' }, { channel: 2, roomId: 'r2', clients: 3, maxClients: 40, mapId: 'native_forest' }];
  let switches = 0;
  // Kanalwechsel wie im Spiel: anderer Raum, andere Monster
  cmds.switchChannel = (roomId) => {
    switches++;
    const ch = roomId === 'r2' ? 2 : 1;
    setTimeout(() => {
      for (const k of [...G.ents.keys()]) if (k.startsWith('w:')) G.ents.delete(k);
      if (!dead.has(`w:${ch}`) && (on || ch === 1)) G.ents.set(`w:${ch}`, boss(ch));
      G.store.setState({ world: { ...G.state.world, channel: ch, roomId }, target: null });
    }, 300);
  };
  cmds.requestMapInfo = () => {};
  let pinned = false;
  cmds.requestBossPins = () => {
    if (!ch2Up || pinned) return; pinned = true;
    G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [{ map: 'native_forest', index: 0, channel: 2 }] } }); // Ch 2 lebt
  };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, radius: 120, wboss: on, autopilot: false, levelRoute: false }));
  G.w.eval(script);
  await wait(1000);
  // Kanal 1: der Boss spawnt erst nach der Warnung (4 s), Kanal 2 hat ihn schon (B) bzw. auch erst dann (A)
  G.w.document.querySelector('[data-act="bot"]').click();
  G.store.setState({ chat: [{ code: 'worldboss_warning', ts: Date.now(), text: 'BlackWarGreymon erscheint gleich' }] });
  setTimeout(() => { if (G.state.world.channel === 1 && !dead.has('w:1')) G.ents.set('w:1', boss(1)); }, 4000);
  const sts = new Set();
  for (let i = 0; i < 420 && order.length < 2; i++) { sts.add(G.status().replace(/\d+:\d\d/, 'm:ss').replace(/\(\d+ px\)/, '').slice(0, 75)); await wait(150); }
  const r = { order: order.join(' > '), switches, sts: [...sts].slice(0, 8), btn: G.w.document.querySelector('[data-act="wboss"]')?.classList.contains('on') };
  G.w.close();
  return r;
}
(async () => {
  const a = await run({ on: true, ch2Up: false });
  const b = await run({ on: true, ch2Up: true });
  const c = await run({ on: false, ch2Up: true });
  console.log(JSON.stringify({ a, b, c }, null, 1));
  const res = [
    ['gleichzeitig angekündigt: erst Ch 1, dann Ch 2', a.order === 'w:1 > w:2' && a.btn],
    ['Ch 2 lebt schon: erst Ch 2, dann Ch 1', b.order === 'w:2 > w:1'],
    ['Knopf aus: kein Weltboss, kein Kanalwechsel', c.switches === 0 && !c.order.includes('w:2') && !c.btn],
  ];
  for (const [n, ok] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + n);
  const all = res.every((x) => x[1]);
  console.log(all ? 'ALLES OK' : 'FEHLER');
  process.exit(all ? 0 : 1);
})();
