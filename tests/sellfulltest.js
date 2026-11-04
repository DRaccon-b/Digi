// 3.2.12: Verkaufen bei vollem Inventar (Einstellungen → Food). Betriebsart Grinden, Inventar voll (4 Plätze belegt):
// A: Seltenheit Common gewählt – zum Händler (auf Native Forest gibt es keinen, also Elecmon in Primary Village), nur die zwei
//    Common-Teile verkaufen (Rare-Teil und Feast bleiben), zurück zum Startpunkt, Bot läuft weiter im Grinden.
// B: Haken aus – kein Verkauf. C: Inventar nicht voll – kein Verkauf.
// D: voll, aber nichts mit der gewählten Seltenheit – kein Weg zum Händler, Hinweis im Protokoll.
// E: gebundenes Teil wird nicht verkauft. F (Review): Favorit und Teil eines Ausrüstungs-Sets bleiben.
// G (Review): Bot während des Verkaufslaufs gestoppt, Inventar wieder frei, neu gestartet – kein alter Lauf mehr.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const ring = (uid, rarity, extra = {}) => ({ itemId: 'gear_ring', qty: 1, gear: { uid, rarity }, ...extra });

async function run(tag, { inv, cfg = {}, ms = 30000, mid = null } = {}) {
  const G = makeWorld({ slot: 0, tag, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) {
      content.items.feast = { name: 'Feast', price: 1200, stack: 99, kind: 'consumable', sell: 300 };
      content.items.gear_ring = { name: 'Iron Ring', kind: 'gear', gear: { slot: 'ring' }, sell: 100 };
      content.npcs.elecmon.shop = { items: [{ itemId: 'feast' }] };
    } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  const calls = [];
  cmds.talk = (npc) => { calls.push(`talk ${npc}`); G.store.setState({ dialog: { npc } }); };
  cmds.chooseDialog = (id) => { calls.push(`choose ${id}`); if (id === 'shop') G.store.setState({ shop: { npc: 'elecmon' } }); };
  cmds.sell = (slot, qty) => { const s = G.store.getState(), it = s.me.inventory[slot]; calls.push(`sell ${slot} ${it?.gear?.uid || it?.itemId} ${qty}`);
    if (!it || it.bound) return;
    const inventory = s.me.inventory.slice(); inventory[slot] = null;
    G.store.setState({ me: { ...s.me, inventory, bits: s.me.bits + 100 * qty } }); };
  cmds.closeShop = () => { calls.push('closeShop'); G.store.setState({ shop: null }); };
  cmds.closeDialog = () => { G.store.setState({ dialog: null }); };
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, bits: 1000, inventory: inv } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'set', stab: 'food', lvlDiff: 10,
    foodHp: '', foodDs: '', foodTamer: '', sellFull: true, sellRar: [0], ...cfg }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const sts = new Set(); let back = false, left = false;
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    sts.add(G.status().slice(0, 60));
    if (mid && /Verkaufen: Reise/.test(G.status())) { const f = mid; mid = null; await f(G, calls); continue; }
    const map = G.store.getState().world.mapId;
    if (map === 'primary_village') left = true;
    if (left && calls.includes('closeShop') && map === 'native_forest' && !/Verkauf/.test(G.status())) { back = true; break; }
    await wait(200);
  }
  const s = G.store.getState(), p = G.ents.get('p:me') || {}, t = G.ents.get('t:me') || {};
  const home = Math.min(Math.hypot(p.x - 400, p.y - 330), Math.hypot(t.x - 400, t.y - 330)) <= 60;
  const log = G.w.document.querySelector('[data-f="log"]')?.textContent || '';
  const boxes = [...G.w.document.querySelectorAll('[data-sellrar]')].map((b) => `${b.dataset.sellrar}:${b.checked ? 1 : 0}`).join(',');
  const r = { calls, left, back, home, inv: s.me.inventory.map((i) => i ? (i.gear?.uid || i.itemId) : '-').join(','), bits: s.me.bits,
    running: !/Start/.test(G.w.document.querySelector('[data-act="bot"]')?.textContent || ''),
    mode: G.w.document.querySelector('[data-mode].on')?.dataset.mode, sts: [...sts].join(' | ').slice(0, 300), log, boxes };
  G.w.close();
  return r;
}

(async () => {
  const full = () => [ring('c1', 0), { itemId: 'feast', qty: 5 }, ring('r1', 2), ring('c2', 0)];
  const A = await run('A', { inv: full() });
  console.log('A', A);
  check('A: Auswahl Common im Panel angehakt (nur Common)', A.boxes === '0:1,1:0,2:0,3:0,4:0', A.boxes);
  check('A: voll – zum Händler, nur die zwei Common-Teile verkauft', A.left && A.calls.includes('talk elecmon') && A.calls.includes('sell 0 c1 1') && A.calls.includes('sell 3 c2 1')
    && !A.calls.some((c) => /r1|feast/.test(c)) && A.inv === '-,feast,r1,-' && A.bits === 1200, A.calls.join(',') + ' · ' + A.inv);
  check('A: zurück zum Startpunkt, Bot läuft weiter im Grinden', A.back && A.home && A.running && A.mode === 'grind', A.sts);
  const B = await run('B', { inv: full(), cfg: { sellFull: false }, ms: 4000 });
  check('B: Haken aus – kein Verkauf', !B.left && !B.calls.length && B.running, B.sts);
  const C = await run('C', { inv: [...full().slice(0, 3), null], ms: 4000 });
  check('C: Inventar nicht voll – kein Verkauf', !C.left && !C.calls.length, C.sts);
  const D = await run('D', { inv: full(), cfg: { sellRar: [4], tab: 'log' }, ms: 4000 });
  check('D: nichts mit der gewählten Seltenheit – kein Weg zum Händler, Hinweis', !D.left && !D.calls.length && /Inventar voll/.test(D.log), D.log.slice(0, 200));
  const E = await run('E', { inv: [ring('c1', 0, { bound: true }), { itemId: 'feast', qty: 5 }, ring('r1', 2), ring('c2', 0)] });
  check('E: gebundenes Teil bleibt, das andere wird verkauft', E.calls.includes('sell 3 c2 1') && !E.calls.some((c) => / c1 /.test(c)) && E.inv === 'c1,feast,r1,-', E.calls.join(',') + ' · ' + E.inv);
  const F = await run('F', { inv: [ring('c1', 0, { gear: { uid: 'c1', rarity: 0, fav: true } }), ring('t1', 0, { gear: { uid: 't1', rarity: 0, tags: ['Tank'] } }), ring('r1', 2), ring('c2', 0)] });
  check('F: Favorit und Set-Teil bleiben, nur das freie Common-Teil wird verkauft', F.calls.includes('sell 3 c2 1') && !F.calls.some((c) => / (c1|t1) /.test(c)) && F.inv === 'c1,t1,r1,-', F.calls.join(',') + ' · ' + F.inv);
  const G2 = await run('G', { inv: full(), ms: 9000, mid: async (W, calls) => {
    const btn = W.w.document.querySelector('[data-act="bot"]'); btn.click(); await wait(600);
    const s = W.store.getState(), inventory = s.me.inventory.slice(); inventory[1] = null; W.store.setState({ me: { ...s.me, inventory } });
    calls.push('restart'); btn.click(); await wait(300); } });
  const after = G2.calls.slice(G2.calls.indexOf('restart') + 1);
  check('G: nach Stopp/Start mit freiem Platz kein alter Verkaufslauf', G2.calls.includes('restart') && !after.length && !/Verkauf/.test(G2.sts.split(' | ').pop() || ''), G2.calls.join(',') + ' · ' + G2.sts.slice(-160));
  console.log(results.every(Boolean) ? 'OK – Verkaufen bei vollem Inventar' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
