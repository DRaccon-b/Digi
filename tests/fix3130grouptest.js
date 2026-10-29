// 3.1.30: Gruppe, Food, Infrastruktur (Prüfbericht 29.10.)
//  food1: Food, Server lehnt den Feast-Kauf ab – nach 2 Versuchen übersprungen, DS Drive gekauft, Bot stoppt; „zu wenig Bits“ nur einmal
//         (vorher: endlose Feast-Kaufschleife, Warnung alle 250 ms)
//  food2: Food-Map ohne Route – Abbruch mit Hinweis statt ewig „Keine Route“
//  mt1:   „Nur Event/WB“ + Abgeben & Annehmen – Runde läuft durch, danach wieder „Nur Event/WB“ (vorher: Tick blockiert)
//  mt2:   Food + Abgeben & Annehmen – danach wieder Food (vorher: Grinden)
//  mt3:   Stopp mitten in Abgeben & Annehmen – Betriebsart „Bosse“ zurück (vorher: Autopilot)
//  grp1:  Leader, Mitläufer-Bot gestoppt – Leader gibt trotzdem ab (vorher: hielt die Quest für den Mitläufer offen)
//  grp2:  Leader startet „Food kaufen“ – kein Start an die Gruppe (vorher: Mitläufer liefen im Autopilot los)
//  leave: Leader-Wartegrenze vor dem Map-Wechsel beginnt nach Zeitlimit neu (vorher: alte Grenze blieb, kein Warten mehr)
//  stor:  Bot läuft im Grind-Modus, anderes Fenster speichert Autopilot – Modus bleibt (vorher: umgeschaltet); Bot aus: übernimmt
// Aufruf: node tests/fix3130grouptest.js <script>   (startet jedes Szenario als eigenen Prozess)
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const scriptPath = path.resolve(process.argv[2]);
const only = process.argv[3];
const NAMES = ['food1', 'food2', 'mt1', 'mt2', 'mt3', 'grp1', 'grp2', 'stor', 'leave'];

if (!only) {
  const runs = NAMES.map((n) => new Promise((res) => {
    const c = spawn(process.execPath, [__filename, scriptPath, n], { cwd: __dirname });
    let out = ''; c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { out += d; });
    const to = setTimeout(() => { out += 'Zeitlimit'; c.kill(); }, 120000);
    c.on('close', (code) => { clearTimeout(to); res({ n, ok: code === 0, out: out.trim() }); });
  }));
  Promise.all(runs).then((rs) => {
    for (const r of rs) console.log(`${r.ok ? 'OK    ' : 'FEHLER'} ${r.n}: ${r.out.split('\n').pop()}`);
    const bad = rs.filter((r) => !r.ok);
    console.log(bad.length ? `FEHLER – ${bad.length} von ${rs.length} Szenarien` : `OK – alle ${rs.length} Szenarien`);
    process.exit(bad.length ? 1 : 0);
  });
  return;
}

const makeWorld = require('./gw');
const script = fs.readFileSync(scriptPath, 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const QUESTS = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } };
const CFG = { autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10 };
const mode = (G) => G.w.document.querySelector('[data-mode].on')?.dataset.mode;
const isOff = (G) => /Start/.test(G.w.document.querySelector('[data-act="bot"]')?.textContent || '');
const html = (G) => G.w.document.body.innerHTML;
const done = (ok, info) => { console.log(`${ok ? 'OK' : 'FEHLER'} – ${info}`); process.exit(ok ? 0 : 1); };
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(200); } return !!fn(); }
function foodShop(G, reject) {
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands, calls = [];
  cmds.talk = (npc) => { calls.push(`talk ${npc}`); G.store.setState({ dialog: { npc } }); };
  cmds.chooseDialog = (id) => { calls.push(`choose ${id}`); if (id === 'shop') G.store.setState({ shop: { npc: 'elecmon' } }); };
  cmds.buy = (itemId, qty) => { calls.push(`buy ${itemId} ${qty}`); if (reject.includes(itemId)) return; const s = G.store.getState();
    G.store.setState({ me: { ...s.me, inventory: [...s.me.inventory, { itemId, qty }], bits: s.me.bits - qty * (G.content.items[itemId].price) } }); };
  cmds.closeShop = () => { calls.push('closeShop'); G.store.setState({ shop: null }); };
  cmds.closeDialog = () => { G.store.setState({ dialog: null }); };
  return calls;
}
const ITEMS = { feast: { name: 'Feast', price: 1200, stack: 99 }, ds_drive: { name: 'DS Drive', price: 780, stack: 99 }, ramen: { name: 'Ramen', price: 1e9, stack: 99 } };

const S = {
  async food1() {
    let content0;
    const G = makeWorld({ slot: 0, tag: 'F1', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: QUESTS,
      setup({ content }) { content0 = content; content.items = { ...ITEMS }; } });
    G.content = content0;
    const calls = foodShop(G, ['feast']);
    G.store.setState({ me: { ...G.store.getState().me, bits: 99 * 1200 + 9 * 780 + 100, inventory: [] } });
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG, foodBuy: true, foodMap: 'primary_village', foodNpc: 'elecmon', foodHp: 'feast', foodHpQty: 99, foodDs: 'ds_drive', foodDsQty: 9, foodTamer: 'ramen', foodTamerQty: 99 }));
    G.w.eval(script); await wait(800);
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(1000);
    const stopped = await until(() => isOff(G) && calls.includes('closeShop'), 60000);
    const feast = calls.filter((c) => /^buy feast/.test(c)).length, ds = calls.some((c) => /^buy ds_drive 9$/.test(c));
    const h = html(G), rows = h.split('zu wenig Bits für Ramen').length - 1, rep = /Ramen[^<]*<b>×/.test(h);
    done(stopped && feast === 2 && ds && /übersprungen/.test(h) && rows === 1 && !rep, `gestoppt=${stopped} Feast-Käufe=${feast} DS=${ds} Ramen-Warnzeilen=${rows}${rep ? ' (wiederholt)' : ''}`);
  },
  async food2() {
    const G = makeWorld({ slot: 0, tag: 'F2', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: QUESTS,
      setup({ content }) { content.items = { ...ITEMS }; content.maps.dark_area = { name: 'Dark Area' }; } });
    G.store.setState({ me: { ...G.store.getState().me, bits: 100000, inventory: [] } });
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG, foodBuy: true, foodMap: 'dark_area', foodNpc: 'elecmon', foodHp: 'feast', foodHpQty: 10, foodDs: '', foodTamer: '' }));
    G.w.eval(script); await wait(800);
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(1000);
    const stopped = await until(() => isOff(G), 10000);
    done(stopped && /kein Weg nach Dark Area/.test(html(G)), `gestoppt=${stopped} Status „${G.status()}“`);
  },
  async mt1() { return mapTalkTrial({ eventsOnly: true }, 'events'); },
  async mt2() { return mapTalkTrial({ foodBuy: true, foodMap: 'primary_village', foodNpc: 'elecmon' }, 'food'); },
  async mt3() {
    const P = (k, v) => ({ name: k, type: 'string', value: v });
    const G = makeWorld({ slot: 0, tag: 'M3', accounts: { leader: 0, list: [{ on: true, user: 'solo', char: 'X' }] }, mobs: [],
      quests: { ...QUESTS, q_t: { state: 2, counters: [1] } },
      setup({ content, MAPS }) { content.npcs.leomon = { name: 'Leomon' };
        content.quests.q_t = { id: 'q_t', name: 'Test', giver: 'leomon', turnIn: 'leomon', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
        MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'leomon', x: 1500, y: 330, properties: [P('npcId', 'leomon')] }); },
      extraEnts: (id) => (id === 'native_forest' ? [{ id: 'n:leomon', kind: 3, defId: 'leomon', x: 1500, y: 330, hp: 0, flags: 0 }] : []) });
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG, farm: true }));
    G.w.eval(script); await wait(1000);
    const m0 = mode(G);
    G.w.document.querySelector('[data-act="grp-maptalk"]').click();
    const running = await until(() => !isOff(G), 3000);
    await wait(600);
    const mid = mode(G);
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(800);
    done(m0 === 'farm' && running && isOff(G) && mode(G) === 'farm', `vorher=${m0} läuft=${running} mittendrin=${mid} nach Stopp=${mode(G)}`);
  },
  async grp1() {
    const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
    const G = makeWorld({ slot: 0, tag: 'G1', accounts, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } } });
    G.w.eval(script);
    const bus = require('./groupbus')('digibot-group');
    setInterval(() => bus.postMessage({ type: 'state', slot: 1, role: 'follower', name: 'Foll', inWorld: true, mapId: 'native_forest', channel: 1, x: 900, y: 900,
      bot: false, status: 'Bot aus', quests: { q02_first_steps: { state: 1, counters: [0] } }, ents: ['t:foll', 'p:foll'], talks: [], done: [], busy: null, fight: false }), 400);
    await wait(800);
    G.w.document.querySelector('[data-act="bot"]').click();
    const turned = await until(() => G.state.me.quests.q02_first_steps.state === 3, 60000);
    done(turned, `Quest-Stand ${G.state.me.quests.q02_first_steps.state} · Status „${G.status()}“`);
  },
  async grp2() {
    const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
    let content0;
    const G = makeWorld({ slot: 0, tag: 'G2', accounts, mobs: [], quests: QUESTS, setup({ content }) { content0 = content; content.items = { ...ITEMS }; } });
    G.content = content0; foodShop(G, []);
    G.store.setState({ me: { ...G.store.getState().me, bits: 100000, inventory: [] } });
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG, foodBuy: true, foodMap: 'primary_village', foodNpc: 'elecmon', foodHp: 'feast', foodHpQty: 10, foodDs: '', foodTamer: '' }));
    G.w.eval(script);
    const bus = require('./groupbus')('digibot-group');
    let starts = 0, states = 0;
    bus.onmessage = (e) => { if (e.data?.type === 'start') starts++; if (e.data?.type === 'state' && e.data.slot === 0) states++; };
    setInterval(() => bus.postMessage({ type: 'state', slot: 1, role: 'follower', name: 'Foll', inWorld: true, mapId: 'native_forest', channel: 1, x: 900, y: 900,
      bot: false, status: 'Bot aus', quests: {}, ents: ['t:foll', 'p:foll'], talks: [], done: [], busy: null, fight: false }), 400);
    await wait(1000);
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(2500);
    done(states > 0 && starts === 0 && mode(G) === 'food', `Start-Nachrichten an die Gruppe: ${starts} (Leader-Status gesehen: ${states > 0}) · Modus ${mode(G)}`);
  },
  async leave() {
    // groupLeaveWait als Einheit (aus dem Skript gelöst): alte Abfahrts-Grenze nach Zeitlimit darf das nächste Warten nicht verhindern
    const src = /function groupLeaveWait\(st, t, now\) \{[\s\S]*?\n  \}\n/.exec(script)?.[0];
    if (!src) return done(false, 'groupLeaveWait nicht gefunden');
    const group = { role: () => 'leader', talks: [], leaveSince: 0 };
    let members = [];
    const fn = new Function('group', 'groupMembers', 'GROUP_WAIT_MS', `${src}; return groupLeaveWait;`)(group, () => members, 180000);
    const st = { world: { mapId: 'a' } }, t = { key: 'k1', loc: { mapId: 'b' } }, busy = [{ inWorld: true, busy: 'x', mapId: 'a', name: 'Foll', slot: 1 }];
    let now = 1e6;
    members = busy; group.talks = [{ at: now, key: 'g1', tkey: 'z' }];
    const w1 = fn(st, t, now);
    now += 200000; const w2 = fn(st, t, now);                      // erstes Zeitlimit abgelaufen (lt veraltet)
    now += 600000; group.talks.push({ at: now, key: 'g2', tkey: 'z' }); // 10 min später: neues Gespräch, Mitläufer beschäftigt
    const w3 = fn(st, { key: 'k2', loc: { mapId: 'b' } }, now);
    done(!!w1 && w2 === null && /warte vor dem Map-Wechsel/.test(w3 || ''), `erstes Warten=${!!w1} nach Zeitlimit=${w2} nächster Map-Wechsel=${w3}`);
  },
  async stor() {
    const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: QUESTS });
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG }));
    G.w.eval(script); await wait(800);
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(800);
    const fire = (cfg) => G.w.dispatchEvent(new G.w.StorageEvent('storage', { key: 'digibot.cfg', newValue: JSON.stringify(cfg) }));
    fire({ ...CFG, autopilot: true, tab: 'attack' });
    await wait(500);
    const running = mode(G), on = !isOff(G);
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(500);
    fire({ ...CFG, autopilot: true, tab: 'log' });
    await wait(500);
    done(on && running === 'grind' && mode(G) === 'auto', `läuft=${on} Modus bei laufendem Bot=${running} · bei Bot aus=${mode(G)}`);
  },
};
async function mapTalkTrial(extra, want) {
  const G = makeWorld({ slot: 0, tag: 'MT', accounts: { leader: 0, list: [{ on: true, user: 'solo', char: 'X' }] }, mobs: [], quests: QUESTS,
    setup({ content }) { content.items = { ...ITEMS }; } });
  G.w.dmo.game.scene.getScene('world').deps.commands.requestEvents = async () => [];
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG, foodHp: 'feast', foodDs: '', foodTamer: '', ...extra }));
  G.w.eval(script); await wait(1000);
  const m0 = mode(G);
  G.w.document.querySelector('[data-act="grp-maptalk"]').click();
  const fin = await until(() => /Abgeben &amp; Annehmen fertig|Abgeben & Annehmen fertig/.test(html(G)) && isOff(G), 12000);
  done(m0 === want && fin && mode(G) === want, `vorher=${m0} Runde fertig=${fin} danach=${mode(G)} · Status „${G.status()}“`);
}
S[only]().catch((e) => done(false, `Ausnahme: ${e.message}`));
