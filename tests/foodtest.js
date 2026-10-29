// 3.1.8: Betriebsart „Food kaufen“ – zum Händler reisen (hier: Elecmon in Primary Village als Ersatz für Tentomon in Dream
// Ruins), ansprechen, Sortiment öffnen, je Sorte bis zur Zielmenge kaufen (vorhandene Stapel angerechnet, Bits beachtet),
// Shop schließen. 3.1.29: danach zurück zur Start-Map und Startposition (Native Forest 400/330), erst dann stoppt der Bot.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'F', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  setup({ content }) { content.items = { feast: { name: 'Feast', price: 1200, stack: 99 }, ds_drive: { name: 'DS Drive', price: 780, stack: 99 }, ramen: { name: 'Ramen', price: 1000, stack: 99 } };
    content.npcs.elecmon.shop = { items: [{ itemId: 'feast' }, { itemId: 'ds_drive' }, { itemId: 'ramen' }] }; } });
const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
const calls = [];
cmds.talk = (npc) => { calls.push(`talk ${npc}`); G.store.setState({ dialog: { npc } }); };
cmds.chooseDialog = (id) => { calls.push(`choose ${id}`); if (id === 'shop') G.store.setState({ shop: { npc: 'elecmon' } }); };
cmds.buy = (itemId, qty) => { calls.push(`buy ${itemId} ${qty}`); const s = G.store.getState(); const inv = [...s.me.inventory, { itemId, qty }];
  G.store.setState({ me: { ...s.me, inventory: inv, bits: s.me.bits - qty * (itemId === 'feast' ? 1200 : itemId === 'ds_drive' ? 780 : 1000) } }); };
cmds.closeShop = () => { calls.push('closeShop'); G.store.setState({ shop: null }); };
cmds.closeDialog = () => { calls.push('closeDialog'); G.store.setState({ dialog: null }); };
const st0 = G.store.getState();
// 40 Feast vorhanden: Feast auf 99 (59 nachkaufen), DS Drive auf 9, Ramen keins – Bits reichen genau dafür plus 500
G.store.setState({ me: { ...st0.me, bits: 59 * 1200 + 9 * 780 + 500, inventory: [{ itemId: 'feast', qty: 40 }] } });
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ foodBuy: true, foodMap: 'primary_village', foodNpc: 'elecmon', foodHp: 'feast', foodHpQty: 99, foodDs: 'ds_drive', foodDsQty: 9, foodTamer: '', foodTamerQty: 99,
  autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10 }));
G.w.eval(script);
(async () => {
  await wait(800);
  const mode = G.w.document.querySelector('[data-mode].on')?.dataset.mode;
  G.w.document.querySelector('[data-act="bot"]').click();
  let done = false;
  for (let i = 0; i < 120; i++) { await wait(250); if (calls.includes('closeShop')) { done = true; break; } }
  const shopMap = G.store.getState().world.mapId;
  let stopped = false;
  for (let i = 0; i < 240 && done; i++) { await wait(250); if (/Start/.test(G.w.document.querySelector('[data-act="bot"]')?.textContent || '') && G.store.getState().world.mapId === 'native_forest') { stopped = true; await wait(300); break; } }
  const s = G.store.getState(), t = G.ents.get('t:me') || {}, p0 = G.ents.get('p:me') || {};
  const r = { mode, done, shopMap, stopped, map: s.world.mapId, pos: [Math.round(p0.x), Math.round(p0.y)], tpos: [Math.round(t.x), Math.round(t.y)], calls, bits: s.me.bits, status: G.status(), btn: G.w.document.querySelector('[data-act="bot"]')?.textContent };
  console.log(r);
  const home = Math.min(Math.hypot(p0.x - 400, p0.y - 330), Math.hypot(t.x - 400, t.y - 330)) <= 60;
  const ok = mode === 'food' && done && shopMap === 'primary_village' && stopped && r.map === 'native_forest' && home && calls.includes('talk elecmon') && calls.includes('choose shop')
    && calls.some((c) => /^buy ds_drive 9$/.test(c)) && calls.some((c) => /^buy feast \d+$/.test(c)) && calls.includes('closeShop') && /Start/.test(r.btn);
  console.log(ok ? 'OK – hingereist, Sortiment geöffnet, nachgekauft, zurück zum Startpunkt, gestoppt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
