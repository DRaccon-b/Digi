// 2.52.0: Lern-Route sucht Monster nur an Punkten der Zone, zu denen es einen Weg gibt – liegt ein Teich in der Zone,
// läuft der Bot nicht mehr ins Wasser (vorher zufälliger Punkt der Zone, oft mitten im See, dann 15 s Hängen).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 16, W = 60, H = 45;
(async () => {
  const G = makeWorld({ slot: 0, tag: 'R', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.spawns.native_forest.zones = { pond: { entries: [{ species: 'kunemon', level: [8, 9], weight: 1 }] } };
      MAPS.native_forest.layers[0].objects.push({ type: 'zone', name: 'pond', x: 360, y: 220, width: 300, height: 240 });
    } });
  // Teich mitten in der Zone: x 400–620, y 260–420 (Rand der Zone bleibt begehbar)
  const blocked = new Uint8Array(W * H);
  for (let y = Math.floor(260 / T); y <= Math.floor(420 / T); y++) for (let x = Math.floor(400 / T); x <= Math.floor(620 / T); x++) blocked[y * W + x] = 1;
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.map = { grid: { tile: T, w: W, h: H, blocked } };
  // wie im Spiel: ins Wasser kommt man nicht (die Testwelt läuft sonst geradeaus hindurch)
  const keep = (id) => { const e = G.ents.get(id); if (!e) return; const c = Math.floor(e.y / T) * W + Math.floor(e.x / T); if (blocked[c] === 1) { e.x = e.lastX ?? e.x; e.y = e.lastY ?? e.y; } else { e.lastX = e.x; e.lastY = e.y; } };
  const guard = setInterval(() => { keep('t:me'); keep('p:me'); }, 20);
  const taps = [], tap0 = scene.tapGround;
  scene.tapGround = (x, y) => { taps.push([x, y]); return tap0(x, y); };
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 3, stats: { at: 2000, as: 1200 } } } });
  // Start am Zonenrand (links unten, begehbar)
  Object.assign(G.ents.get('t:me'), { x: 380, y: 440 }); Object.assign(G.ents.get('p:me'), { x: 390, y: 440 });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10, radius: 250,
    levelRoute: true, levelA2: false, levelBoss: false, levelEvo: false }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(9000);
  // tief im Wasser = das Feld und alle Nachbarn gesperrt (am Ufer versetzt der Bot Laufklicks bei Wiederholung um ±12 px –
  // das Spiel schiebt solche Klicks ans Ufer)
  const deep = (x, y) => { const cx = Math.floor(x / T), cy = Math.floor(y / T); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (blocked[(cy + dy) * W + cx + dx] !== 1) return false; return true; };
  const wet = taps.filter(([x, y]) => deep(x, y));
  const roamed = /suche Monster/.test(G.w.document.body.textContent) || taps.length > 0;
  console.log({ taps: taps.length, wet: wet.length, sample: wet.slice(0, 3), status: G.status() });
  clearInterval(guard); G.w.close();
  const ok = taps.length > 0 && roamed && wet.length === 0;
  console.log(ok ? 'OK – Suchpunkte nur dort, wo ein Weg hinführt (nicht in den Teich)' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
