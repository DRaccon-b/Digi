// 3.1.30: Grinden / Lern-Route – Fixes aus der Prüfung vom 29.10.2026
//  A) am Boss-Spawnpunkt unter Angriff: abwehren, nicht alle 1,5 s zurückrufen
//  B) Ruhemodus (HP unter Schwelle, F1 leer): keine Lern-Route (kein Boss-Abstecher, keine Reise)
//  C) Portal zur Lern-Map nicht erreichbar: Map auslassen und neu planen statt für immer zu stehen
//  D) Feldboss mit Add: nicht zwischen Boss und Add hin- und herwählen
//  E) leere Zone, volle Map: Channel-Checker greift auch beim Suchen
//  F) Randpunkt der Zone blockiert: begehbaren Ersatzpunkt nehmen und in die Zone kommen
// Aufruf: node tests/fix3130grindtest.js digibot.user.js
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const QUESTS = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } };
const ACC = { leader: 0, list: [{ user: 'solo' }] };

function world({ mobs = [], boss = false, adds = false, setup, partner = {}, cfg = {} }) {
  const G = makeWorld({ slot: 0, tag: 'G', noHash: true, accounts: ACC, mobs, quests: QUESTS,
    setup(o) {
      o.content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      o.content.digimon.bossmon = { name: 'Bossmon', base: { hp: 3000 }, growth: { hp: 100 }, mob: { expBase: 20 } };
      o.content.digimon.golemon = { name: 'Golemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      if (boss) {
        o.content.spawns.native_forest.bosses = [{ species: 'bossmon', at: 'boss_b', level: 5, respawnMs: 900000, ...(adds ? { adds: { species: 'golemon', atHp: [1] } } : {}) }];
        o.MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_b', x: 760, y: 330 });
      }
      setup?.(o);
    },
    extraEnts: (id) => (id === 'native_forest' && boss === 'alive' ? [{ id: 'b:1', kind: 2, defId: 'bossmon', x: 760, y: 330, hp: 900000, maxHp: 900000, level: 5, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestMapInfo = () => {};
  G.follows = 0; cmds.partnerFollow = () => { G.follows++; };
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 3, stats: { at: 2000, as: 1200 }, ...partner } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10, radius: 250,
    levelRoute: true, levelA2: false, levelBoss: !!boss, levelEvo: false, farmChannels: [1], ...cfg }));
  G.start = async () => { G.w.eval(script); await wait(1000); G.w.document.querySelector('[data-act="bot"]').click(); };
  G.text = () => G.w.document.body.textContent;
  return G;
}

// A) Warten am Spawnpunkt, ein zäher Angreifer kommt: abwehren ohne ständigen Rückruf
async function spawnDefense() {
  const G = world({ mobs: [[360, 300], [420, 340]], boss: true });
  const pinAt = Date.now() + 25000;
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [{ map: 'native_forest', index: 0, channel: 1, respawnInMs: Math.max(1, pinAt - Date.now()) }] } });
  await G.start();
  let r0 = null, aggHp = null, waited = false;
  for (let i = 0; i < 360; i++) {
    if (/warte auf Bossmon/.test(G.status())) waited = true;
    if (waited || G.ents.has('m:agg')) {
      const me = G.ents.get('t:me');
      if (!G.ents.has('m:agg')) G.ents.set('m:agg', { id: 'm:agg', kind: 2, defId: 'kunemon', level: 2, x: me.x + 20, y: me.y + 10, hp: 30000, maxHp: 30000, flags: 0, targetId: 'p:me' });
      const a = G.ents.get('m:agg'); a.targetId = 'p:me'; if (Math.hypot(a.x - me.x, a.y - me.y) > 60) { a.x = me.x + 20; a.y = me.y + 10; }
      aggHp = a.hp;
    }
    if (aggHp != null && aggHp < 30000 && !r0) r0 = { i, follows: G.follows, hp: aggHp };
    if (r0 && i - r0.i > 70) break;
    await wait(150);
  }
  const r = { waited, r0, follows: r0 ? G.follows - r0.follows : null, hp0: r0?.hp, hp: aggHp };
  G.w.close();
  return r;
}

// B) Ruhemodus: leere Zone – nicht durch die Zone laufen (Roam), keine „Leveln:“-Statuszeile, stehen bleiben
async function resting() {
  const G = world({ mobs: [], partner: { hp: 900, maxHp: 3000 }, cfg: { hpPot: 50 } });
  const scene = G.w.dmo.game.scene.getScene('world'), tap0 = scene.tapGround; let taps = 0;
  scene.tapGround = (x, y) => { taps++; return tap0(x, y); };
  await G.start();
  const seen = new Set();
  for (let i = 0; i < 40; i++) { seen.add(G.status().slice(0, 50)); await wait(150); }
  const r = { taps, leveln: [...seen].filter((s) => /^Leveln/.test(s)), sample: [...seen].slice(0, 4) };
  G.w.close();
  return r;
}

// C) Lern-Map hinter einer Wand (Portal per Raster nicht erreichbar): auslassen, neu planen
async function portalBlocked() {
  const G = world({ mobs: [],
    setup({ content, MAPS }) {
      content.spawns.primary_village.zones = { field: { entries: [{ species: 'kunemon', level: [9, 10] }] } };
      MAPS.primary_village.layers[0].objects.push({ type: 'zone', name: 'field', x: 400, y: 80, width: 300, height: 150 });
    } });
  const grid = G.w.dmo.game.scene.getScene('world').map.grid;
  for (let y = 0; y < grid.h; y++) for (let x = 9; x <= 11; x++) grid.blocked[y * grid.w + x] = 1; // Wand bei x 144–192
  await G.start();
  const seen = new Set();
  for (let i = 0; i < 100; i++) { seen.add(G.status().replace(/\(.*/, '').slice(0, 60)); await wait(150); }
  const r = { map: G.store.getState().world.mapId, banned: /ausgelassen/.test(G.text()), last: G.status().slice(0, 70), stuckNow: /Portal nicht erreichbar|reise zu/.test(G.status()) };
  G.w.close();
  return r;
}

// D) Feldboss mit Add (Add immer aktiv): nach dem Anwählen des Adds den Boss nicht wieder anwählen
async function bossAdds() {
  const G = world({ mobs: [], boss: 'alive', adds: true });
  const scene = G.w.dmo.game.scene.getScene('world'), sel0 = scene.select, sels = [];
  scene.select = (id) => { sels.push(id); return sel0(id); };
  await G.start();
  let added = false;
  for (let i = 0; i < 120; i++) {
    const me = G.ents.get('t:me');
    if (!added && Math.hypot(me.x - 760, me.y - 330) < 200) { added = true; G.ents.set('m:add', { id: 'm:add', kind: 2, defId: 'golemon', level: 5, x: 740, y: 350, hp: 300000, maxHp: 300000, flags: 0, targetId: 'p:me' }); }
    await wait(150);
  }
  const first = sels.indexOf('m:add');
  const after = first < 0 ? [] : sels.slice(first);
  const r = { added, first, bossAfter: after.filter((x) => x === 'b:1').length, addSel: after.filter((x) => x === 'm:add').length, addHp: G.ents.get('m:add')?.hp };
  G.w.close();
  return r;
}

// E) Zone leer, eigener Kanal voll: der Channel-Checker wechselt auch, während die Lern-Route Monster sucht
async function chCheck() {
  const G = world({ mobs: [], cfg: { chCheck: true } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  const sw = [];
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 30, maxClients: 40 }, { channel: 2, roomId: 'r2', clients: 1, maxClients: 40 }];
  cmds.switchChannel = (room) => { sw.push(room); const s = G.store.getState(); G.store.setState({ world: { ...s.world, channel: Number(room.slice(1)) } }); };
  await G.start();
  await wait(10000);
  const r = { sw, ch: G.store.getState().world.channel, status: G.status().slice(0, 60) };
  G.w.close();
  return r;
}

// F) Bot unterhalb der Zone, der nächste Randpunkt liegt tief im Wasser (> 96 px bis festes Land): Ersatzpunkt in der Zone
async function zoneEnter() {
  const G = world({ mobs: [],
    setup({ content, MAPS }) {
      const objs = MAPS.native_forest.layers[0].objects;
      objs.splice(objs.findIndex((o) => o.type === 'zone'), 1);
      objs.push({ type: 'zone', name: 'lake', x: 300, y: 250, width: 400, height: 200 });
      content.spawns.native_forest.zones = { lake: { entries: [{ species: 'kunemon', level: [8, 9] }] } };
    } });
  const grid = G.w.dmo.game.scene.getScene('world').map.grid, T = grid.tile;
  for (let y = Math.floor(230 / T); y <= Math.floor(500 / T); y++) for (let x = Math.floor(280 / T); x <= Math.floor(640 / T); x++) grid.blocked[y * grid.w + x] = 1;
  Object.assign(G.ents.get('t:me'), { x: 400, y: 600 }); Object.assign(G.ents.get('p:me'), { x: 410, y: 600 });
  await G.start();
  let inside = false;
  for (let i = 0; i < 160 && !inside; i++) {
    const me = G.ents.get('t:me');
    inside = me.x >= 300 && me.x <= 700 && me.y >= 250 && me.y <= 450;
    await wait(150);
  }
  const me = G.ents.get('t:me');
  const r = { inside, pos: [Math.round(me.x), Math.round(me.y)], status: G.status().slice(0, 60) };
  G.w.close();
  return r;
}

(async () => {
  const a = await spawnDefense();
  check('A) am Spawnpunkt: Angreifer abwehren ohne ständigen Rückruf', a.waited && a.r0 && a.follows <= 1 && a.hp < a.hp0, JSON.stringify(a));
  const b = await resting();
  check('B) Ruhemodus: kein Boss-Abstecher, keine Lern-Route', b.leveln.length === 0 && b.taps === 0, JSON.stringify(b));
  const c = await portalBlocked();
  check('C) Portal nicht erreichbar: Map ausgelassen, kein Dauer-Stehen', c.banned && !c.stuckNow, JSON.stringify(c));
  const d = await bossAdds();
  check('D) Feldboss mit Add: kein Hin und Her beim Anwählen', d.added && d.first >= 0 && d.bossAfter === 0 && d.addHp < 300000, JSON.stringify(d));
  const e = await chCheck();
  check('E) leere Zone, voller Kanal: Channel-Checker wechselt', e.sw.length === 1 && e.ch === 2, JSON.stringify(e));
  const f = await zoneEnter();
  check('F) Randpunkt im Wasser: Ersatzpunkt, Bot kommt in die Zone', f.inside, JSON.stringify(f));
  const ok = results.every(Boolean);
  console.log(ok ? 'ALLES OK' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
