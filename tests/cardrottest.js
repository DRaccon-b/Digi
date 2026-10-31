// 3.1.40: Kartenrotation – farmt die ausgewählten Karten in Reihenfolge, jagt nur deren Mobs, überspringt volle Karten,
// stoppt, wenn alles voll ist; Abwählen wirkt sofort; gesperrte Map; volle Kartentasche wird gemeldet.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function world({ cards, locked, onSelect } = {}) {
  const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    mobs: [[360, 300, 'kunemon'], [420, 340, 'kunemon'], [470, 280, 'kunemon'], [380, 360, 'tsunomon'], [450, 380, 'tsunomon'], [330, 280, 'tanemon']],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    onKill(m, { state }) {
      if (m.defId !== 'kunemon') return;
      const bag = state.me.cards.map((x) => ({ ...x })), s = bag.find((x) => x.itemId === 'card_kunemon');
      if (s) s.qty++; else { const e = bag.find((x) => !x.itemId); if (e) Object.assign(e, { itemId: 'card_kunemon', qty: 1 }); }
      G.store.setState({ me: { ...state.me, cards: bag } });
    },
    setup({ content }) {
      Object.assign(content.digimon, { tsunomon: { name: 'Tsunomon' }, tanemon: { name: 'Tanemon' } });
      const card = (sp, base) => ({ id: `card_${sp}`, name: sp, training: { stat: 'de', points: 1, rarity: 0, baseUses: base, copiesPerPoint: 10 } });
      Object.assign(content.items, { card_kunemon: card('kunemon', 8), card_tsunomon: card('tsunomon', 30), card_tanemon: card('tanemon', 4) });
      content.spawns.native_forest.zones.meadow.entries = ['kunemon', 'tsunomon', 'tanemon'].map((sp) => ({ species: sp, level: [1, 3], drops: [{ itemId: `card_${sp}`, chance: 0.4 }] }));
      if (locked) content.maps.native_forest.entryQuest = 'q99_x';
    } });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, training: { card_kunemon: 5, card_tanemon: 4 }, cards: cards || [{ itemId: '', qty: 0 }, { itemId: '', qty: 0 }] } });
  const scene = G.w.dmo.game.scene.getScene('world'), sel = scene.select;
  G.selected = [];
  scene.select = (id) => { const e = G.ents.get(id); if (e) G.selected.push(e.defId); onSelect?.(G, e); return sel(id); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'cards', cardSel: ['card_tanemon', 'card_kunemon'], farmChannels: [1],
    hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
  G.w.eval(script);
  return G;
}
const start = async (G) => { await wait(1500); G.w.document.querySelector('[data-act="bot"]').click(); for (let i = 0; i < 20 && !running(G); i++) await wait(100); };
const running = (G) => /Stopp/.test(G.w.document.querySelector('[data-act="bot"]')?.textContent || '');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

(async () => {
  // A: volle Karte (Tanemon) überspringen, nur Kunemon jagen, nach 3 Kills fertig und aus
  {
    const G = world();
    await start(G);
    const t0 = Date.now();
    while (Date.now() - t0 < 40000 && running(G)) await wait(250);
    const txt = G.w.document.body.textContent;
    ok(G.kills === 3, `A: 3 Kills erwartet, ${G.kills}`);
    ok(G.selected.length && G.selected.every((s) => s === 'kunemon'), `A: nur Kunemon gewählt: ${G.selected.join(',')}`);
    ok(!running(G) && /Kartenrotation fertig/.test(txt), `A: fertig + gestoppt (läuft=${running(G)}) ${G.status()}`);
    G.w.close();
  }
  // B: nach dem ersten Kill alles abwählen -> nichts Neues mehr angreifen
  {
    const G = world();
    await start(G);
    const t0 = Date.now();
    while (Date.now() - t0 < 20000 && G.kills < 1) await wait(100);
    const D = G.w.document;
    D.querySelector('[data-tab="farm"]').click(); await wait(500);
    for (const id of ['card_kunemon', 'card_tanemon']) { const b = D.querySelector(`[data-card="${id}"]`); if (b?.checked) { b.checked = false; b.dispatchEvent(new G.w.Event('input', { bubbles: true })); } }
    const k = G.kills; await wait(6000);
    ok(G.kills <= k + 1, `B: nach dem Abwählen weitergejagt (${k} -> ${G.kills})`);
    ok(/Keine Karten ausgewählt/.test(G.status()), `B: Status ${G.status()}`);
    G.w.close();
  }
  // C: Map gesperrt -> keine erreichbare Karte, kein Kampf
  {
    const G = world({ locked: true });
    await start(G); await wait(5000);
    ok(G.kills === 0 && /keine erreichbare Karte/.test(G.status()), `C: ${G.kills} Kills, Status ${G.status()}`);
    G.w.close();
  }
  // D: Kartentasche voll (kein freier Platz, kein Kunemon-Stapel) -> Warnung im Log
  {
    const G = world({ cards: [{ itemId: 'card_other', qty: 5 }] });
    await start(G); await wait(4000);
    ok(/Kartentasche voll/.test(G.w.document.body.textContent), 'D: keine Warnung „Kartentasche voll“');
    G.w.close();
  }
  console.log(fails.length ? fails : 'alle Prüfungen gut');
  console.log(fails.length ? 'FEHLER' : 'OK – Kartenrotation farmt nach Priorität');
  process.exit(fails.length ? 1 : 0);
})();
