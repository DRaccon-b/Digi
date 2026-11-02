// 3.2.0: Food automatisch nachkaufen (Einstellungen → Food). Betriebsart Grinden, Feast unter der Mindestmenge:
// A: Einkaufs-Map „aktuelle Map“ – auf Native Forest gibt es keinen Händler, also zum Ausweich-Händler (Test: Elecmon in Primary
//    Village), Feast bis zur Zielmenge auffüllen, zurück zum Startpunkt, Bot läuft weiter (kein Stopp, Betriebsart bleibt).
// B: genug Vorrat – kein Einkauf. C: Haken aus – kein Einkauf, obwohl knapp.
// D: Einkaufs-Map fest gewählt – Händler mit Food-Sortiment aus den Spieldaten erkannt (Auswahlliste), Einkauf dort.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };

async function run(tag, { have = 3, cfg = {}, ms = 30000 } = {}) {
  const G = makeWorld({ slot: 0, tag, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.items = { feast: { name: 'Feast', price: 1200, stack: 99 } };
      content.npcs.elecmon.shop = { items: [{ itemId: 'feast' }] }; } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  const calls = [];
  cmds.talk = (npc) => { calls.push(`talk ${npc}`); G.store.setState({ dialog: { npc } }); };
  cmds.chooseDialog = (id) => { calls.push(`choose ${id}`); if (id === 'shop') G.store.setState({ shop: { npc: 'elecmon' } }); };
  cmds.buy = (itemId, qty) => { calls.push(`buy ${itemId} ${qty}`); const s = G.store.getState();
    G.store.setState({ me: { ...s.me, inventory: [...s.me.inventory, { itemId, qty }], bits: s.me.bits - qty * 1200 } }); };
  cmds.closeShop = () => { calls.push('closeShop'); G.store.setState({ shop: null }); };
  cmds.closeDialog = () => { G.store.setState({ dialog: null }); };
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, bits: 1000000, inventory: [{ itemId: 'feast', qty: have }] } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'set', stab: 'food', lvlDiff: 10,
    foodHp: 'feast', foodHpQty: 20, foodDs: '', foodTamer: '', foodAuto: true, foodAutoMin: 10, foodMap: 'primary_village', foodNpc: 'elecmon', ...cfg }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const sts = new Set(); let back = false, left = false;
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    sts.add(G.status().slice(0, 60));
    const map = G.store.getState().world.mapId;
    if (map === 'primary_village') left = true;
    if (left && calls.includes('closeShop') && map === 'native_forest' && !/Food/.test(G.status())) { back = true; break; }
    await wait(200);
  }
  const s = G.store.getState(), p = G.ents.get('p:me') || {}, t = G.ents.get('t:me') || {};
  const home = Math.min(Math.hypot(p.x - 400, p.y - 330), Math.hypot(t.x - 400, t.y - 330)) <= 60;
  const feast = s.me.inventory.filter((i) => i.itemId === 'feast').reduce((n, i) => n + i.qty, 0);
  const opts = [...G.w.document.querySelectorAll('[data-apsel="foodAutoMap"] option')].map((o) => o.value + '=' + o.textContent);
  const r = { calls, left, back, home, feast, map: s.world.mapId, running: !/Start/.test(G.w.document.querySelector('[data-act="bot"]')?.textContent || ''),
    mode: G.w.document.querySelector('[data-mode].on')?.dataset.mode, sts: [...sts].join(' | ').slice(0, 300), opts };
  G.w.close();
  return r;
}

(async () => {
  const A = await run('A');
  console.log('A', A);
  check('A: knapp – Einkauf beim Händler, auf 20 aufgefüllt', A.left && A.calls.includes('talk elecmon') && A.calls.includes('buy feast 17') && A.feast === 20, A.calls.join(','));
  check('A: zurück zum Startpunkt, Bot läuft weiter im Grinden', A.back && A.home && A.running && A.mode === 'grind', A.sts);
  const B = await run('B', { have: 15, ms: 4000 });
  check('B: genug Vorrat – kein Einkauf', !B.left && !B.calls.length && B.running, B.sts);
  const C = await run('C', { cfg: { foodAuto: false }, ms: 4000 });
  check('C: Haken aus – kein Einkauf', !C.left && !C.calls.length, C.sts);
  const D = await run('D', { cfg: { foodAutoMap: 'primary_village', foodMap: '', foodNpc: '' } });
  check('D: Auswahlliste nennt Primary Village mit Händler', D.opts.some((o) => /^primary_village=Primary Village · Elecmon/.test(o)), D.opts.join(' / '));
  check('D: feste Einkaufs-Map – Einkauf dort und zurück', D.calls.includes('talk elecmon') && D.feast === 20 && D.back, D.calls.join(','));
  console.log(results.every(Boolean) ? 'OK – Food automatisch nachkaufen' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
