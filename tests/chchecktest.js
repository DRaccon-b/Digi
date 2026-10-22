// 2.15.0: Channel-Checker – wechselt auf den leersten Kanal (mind. 2 Spieler weniger), nicht zurück, aus = kein Wechsel
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8').replace('const CH_CHECK_MS = 60000,', 'const CH_CHECK_MS = 3000,');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
async function run(chCheck, counts) {
  const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  const switches = [];
  const ch = () => G.store.getState().world.channel;
  cmds.listChannels = async () => Object.entries(counts).map(([c, n]) => ({ channel: Number(c), roomId: 'r' + c, clients: n + (Number(c) === ch() ? 1 : 0), maxClients: 50 }));
  cmds.switchChannel = (roomId) => { const c = Number(roomId.slice(1)); switches.push(c); const s = G.store.getState(); G.store.setState({ world: { ...s.world, channel: c } }); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', chCheck }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(14000);
  const r = { switches, ch: ch() };
  G.w.close();
  return r;
}
(async () => {
  const a = await run(true, { 1: 19, 2: 4, 3: 18 });
  check('An: wechselt auf den leersten Kanal (Ch 2) und bleibt dort', a.ch === 2 && a.switches.length === 1, JSON.stringify(a));
  const b = await run(true, { 1: 5, 2: 4 });
  check('An: nur 1 Spieler weniger -> kein Wechsel', b.switches.length === 0, JSON.stringify(b));
  const c = await run(false, { 1: 19, 2: 4 });
  check('Aus: kein Wechsel', c.switches.length === 0, JSON.stringify(c));
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
