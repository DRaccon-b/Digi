// 3.1.30: Bosse (Rotation/Named-Runde) – Korrekturen aus der Prüfung vom 29.10.
// A: Boss bei ≤ 15 % HP, danach anderer Kanal (Lager/Kanalwechsel) -> kein „Boss besiegt“.
// B: Ohnmacht bei ≤ 15 % auf derselben Map -> Kampf verworfen, kein „Boss besiegt“.
// C: Rotation: Boss laut Timer da, am Spawnpunkt nicht zu sehen -> nach 20 s 2 min übersprungen, nicht sofort wieder „lebt“.
// D: listChannels wirft synchron -> Bot hängt nicht bei „lade Kanalliste…“, wechselt den Kanal.
// E: Named-Runde mit einer Map, alle Kanäle Respawn > 2 min -> ruht, statt die Runde in jedem Takt neu zu loggen.
// F: Named-Runde: nach dem Warten auf den Respawn wird die Zone abgesucht, nicht sofort abgehakt.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const Q = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } };
const ACC = { leader: 0, list: [{ user: 'solo' }] };
const CFG = { autopilot: false, farm: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 8, radius: 500 };
const logText = (G) => G.w.document.body.textContent;

function fieldWorld(extra) {
  return makeWorld({ slot: 0, tag: 'F', noHash: true, accounts: ACC, mobs: [], quests: Q,
    setup({ content, MAPS }) {
      content.digimon.tyrmon = { name: 'Tyrmon' };
      content.spawns.native_forest.bosses = [{ species: 'tyrmon', at: 'ridge', level: 5, respawnMs: 240000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'ridge', x: 470, y: 330 });
    }, ...extra });
}
async function start(G, cfg) {
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG, ...cfg }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
}

// A/B: Boss bei 10 % – dann Kanalwechsel (A) bzw. Ohnmacht und er verschwindet (B)
async function lowHp(faint) {
  const G = fieldWorld({ extraEnts: (id) => (id === 'native_forest' ? [{ id: 'b:1', kind: 2, defId: 'tyrmon', x: 470, y: 330, hp: 20000, maxHp: 20000, level: 5, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }, { channel: 2, roomId: 'r2', clients: 1, maxClients: 40 }];
  cmds.requestBossPins = () => {}; cmds.requestMapInfo = () => {}; cmds.switchChannel = () => {}; cmds.revive = () => {};
  await start(G, { farmMode: 'boss', farmBosses: ['native_forest#tyrmon'], farmChannels: [1] });
  for (let i = 0; i < 80 && G.store.getState().target?.id !== 'b:1'; i++) await wait(150);
  const attacked = G.store.getState().target?.id === 'b:1';
  await wait(800);
  G.ents.get('b:1').hp = 2000; await wait(600); // der Bot sieht ihn mit 10 %
  const s = G.store.getState();
  if (faint) G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, fainted: true } }, target: null });
  else G.store.setState({ world: { ...s.world, channel: 2, roomId: 'r2' }, target: null });
  G.ents.delete('b:1');
  await wait(1500);
  if (faint) { const s2 = G.store.getState(); G.store.setState({ me: { ...s2.me, partner: { ...s2.me.partner, fainted: false } } }); } // zurück vom Lager
  await wait(2000);
  const r = { attacked, killed: /Boss besiegt: Tyrmon/.test(logText(G)) };
  G.w.close();
  return r;
}

// C: Rotation, Pins melden „lebt“, Boss nirgends zu sehen
async function ghost() {
  const G = fieldWorld({});
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [{ map: 'native_forest', index: 0, channel: 1, hp: 100 }] } });
  cmds.requestMapInfo = () => G.store.setState({ mapInfo: { mapId: 'native_forest', at: G.w.performance.now(), bosses: [{ index: 0, hp: 100 }] } });
  await start(G, { farmMode: 'boss', farmBosses: ['native_forest#tyrmon'], farmChannels: [1] });
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && !/prüfe in 2 min erneut/.test(logText(G))) await wait(300);
  const skipped = /prüfe in 2 min erneut/.test(logText(G));
  const st = [];
  for (let i = 0; i < 20; i++) { st.push(G.status()); await wait(500); } // 10 s: mehrere Pin-/Map-Info-Antworten „lebt“
  const r = { skipped, text: /lebt laut Timer, aber nicht zu sehen/.test(logText(G)), searchingAgain: st.slice(2).some((s) => /laut Timer da/.test(s)), last: st[st.length - 1] };
  G.w.close();
  return r;
}

// D: listChannels wirft beim ersten Aufruf synchron
async function chThrow() {
  const G = fieldWorld({});
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  let calls = 0; const used = [];
  cmds.listChannels = () => { if (++calls === 1) throw new Error('kein Raum'); return Promise.resolve([{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }, { channel: 2, roomId: 'r2', clients: 1, maxClients: 40 }]); };
  cmds.switchChannel = (roomId) => { used.push(roomId); const s = G.store.getState(); G.store.setState({ world: { ...s.world, channel: 2, roomId }, target: null }); };
  cmds.requestBossPins = () => {}; cmds.requestMapInfo = () => {};
  await start(G, { farmMode: 'boss', farmBosses: ['native_forest#tyrmon'], farmChannels: [2] });
  const t0 = Date.now();
  while (Date.now() - t0 < 8000 && !used.length) await wait(200);
  const r = { calls, used: used.join(','), status: G.status() };
  G.w.close();
  return r;
}

// E/F: Named Elite in der Zone „meadow“ (eine Map)
function namedWorld(readyAt, appearAt) {
  return makeWorld({ slot: 0, tag: 'N', noHash: true, accounts: ACC, mobs: [], quests: Q,
    setup({ content }) {
      content.digimon.tyrmon = { name: 'Tyrmon' };
      content.spawns.native_forest.bosses = [{ species: 'tyrmon', at: 'meadow', level: 5, respawnMs: 240000 }];
    },
    extraEnts: (id) => (id === 'native_forest' && appearAt && Date.now() >= appearAt ? [{ id: 'nb:1', kind: 2, defId: 'tyrmon', x: 480, y: 380, hp: 20000, maxHp: 20000, level: 5, flags: 1024, targetId: '' }] : []) });
}
async function namedSetup(G, readyAt) {
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  const info = () => { const r = readyAt - Date.now(); return r > 0 ? { respawnInMs: r } : { hp: 100 }; };
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestBossPins = () => {};
  cmds.requestMapInfo = () => G.store.setState({ mapInfo: { mapId: 'native_forest', at: G.w.performance.now(), bosses: [{ index: 0, ...info() }] } });
  await start(G, { farmMode: 'named', farmChannels: [1] });
}
async function namedRest() {
  const G = namedWorld();
  await namedSetup(G, Date.now() + 600000);
  await wait(7000);
  const n = (logText(G).match(/Runde fertig/g) || []).length;
  const r = { roundsLogged: n, status: G.status() };
  G.w.close();
  return r;
}
async function namedSearch() {
  const readyAt = Date.now() + 52000, appearAt = readyAt + 7000;
  const G = namedWorld(readyAt, appearAt);
  // Entity erst nach der Map-Info „lebt“ (spawnt woanders/kommt später in Sicht)
  const iv = setInterval(() => { if (Date.now() >= appearAt && !G.ents.has('nb:1')) G.ents.set('nb:1', { id: 'nb:1', kind: 2, defId: 'tyrmon', x: 480, y: 380, hp: 20000, maxHp: 20000, level: 5, flags: 1024, targetId: '' }); }, 200);
  await namedSetup(G, readyAt);
  const t0 = Date.now();
  while (Date.now() - t0 < 75000 && !(G.ents.get('nb:1')?.hp < 20000)) await wait(300);
  clearInterval(iv);
  const r = { gaveUp: /nicht zu finden – Kanal abgehakt/.test(logText(G)), hit: G.ents.get('nb:1')?.hp < 20000, status: G.status() };
  G.w.close();
  return r;
}

(async () => {
  const [a, b, c, d, e, f] = await Promise.all([lowHp(false), lowHp(true), ghost(), chThrow(), namedRest(), namedSearch()]);
  let ok = true;
  const check = (cond, okMsg, errMsg, data) => { if (cond) console.log('OK – ' + okMsg); else { ok = false; console.log('FEHLER – ' + errMsg, JSON.stringify(data)); } };
  check(a.attacked && !a.killed, 'Boss bei 10 % und Kanalwechsel: kein Sieg gebucht', 'Kanalwechsel bei ≤ 15 % als Sieg gezählt', a);
  check(b.attacked && !b.killed, 'Ohnmacht bei 10 %: Kampf verworfen, kein Sieg gebucht', 'Ohnmacht bei ≤ 15 % als Sieg gezählt', b);
  check(c.skipped && c.text && !c.searchingAgain, 'Boss laut Timer da, nicht zu sehen: 2 min übersprungen, Timer-„lebt“ überschreibt es nicht', 'unsichtbarer „lebt“-Boss wird sofort wieder gesucht', c);
  check(d.used === 'r2' && d.calls >= 2, 'listChannels wirft: neu gefragt und Kanal gewechselt', 'Kanalliste hängt nach synchronem Fehler', d);
  check(e.roundsLogged <= 2 && /Runde fertig – prüfe erneut/.test(e.status), 'Named-Runde mit einer Map ruht bis zum Respawn', 'Named-Runde läuft jeden Takt neu', e);
  check(!f.gaveUp && f.hit, 'Named-Runde: nach dem Warten Zone abgesucht und Elite angegriffen', 'Kanal nach dem Warten sofort abgehakt', f);
  process.exit(ok ? 0 : 1);
})();
