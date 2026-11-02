// 3.2.3 (Nutzer 02.11.):
// A: Kartenrotation mit fester Digitation (cardForm) -> diese Form statt der automatisch besten (hier Flamedramon statt Raidramon).
// B: Restzeit aus dem Kill-Takt: gespeicherter Abstand zwischen zwei Kills (g) zählt statt Kampfzeit + 4 s (beim Pullen ist die
//    Kampfzeit je Monster lang, es sterben aber mehrere fast gleichzeitig). 12 offen / 0,448 × 5 s ≈ 2 min statt ≈ 15 min.
// C: Kills kurz hintereinander in der Kartenrotation -> der Abstand wird gemessen und gespeichert (g, gn).
// A2: „höchstmögliche Digitation“ aus einer Armor-Form (z. B. nach einer Dark-Tower-Map) -> von der Grundform aus suchen (ExVeemon).
// C2: drei Kills im selben Paket (Flächenschaden) zählen mit 0 ms -> Takt 200 ms statt 400 ms.
// D: Weltboss-Auswahl: BlackWarGreymon abgewählt -> „Weltboss an“ nennt nur Megidramon.
// E: Einstellungen → Events: je Weltboss ein Haken; abhaken schreibt cfg.wbOff.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function formRun(cardForm, start = 'veemon') {
  const G = makeWorld({ slot: 0, tag: 'A', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[900, 300, 'knightmon']],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content }) {
      Object.assign(content.digimon, {
        veemon: { name: 'Veemon', stage: 'rookie', element: 'neutral', attribute: 'free', base: { at: 30 }, growth: { at: 5 } },
        flamedramon: { name: 'Flamedramon', stage: 'armor', element: 'fire', attribute: 'free', base: { at: 225 }, growth: { at: 32.2 } },
        raidramon: { name: 'Raidramon', stage: 'armor', element: 'thunder', attribute: 'free', base: { at: 272 }, growth: { at: 38.9 } },
        exveemon: { name: 'ExVeemon', stage: 'champion', element: 'neutral', attribute: 'free', base: { at: 150 }, growth: { at: 20 } },
        knightmon: { name: 'Knightmon', element: 'steel', attribute: 'data' },
      });
      content.items.card_knightmon = { id: 'card_knightmon', name: 'Knightmon', training: { stat: 'de', points: 1, rarity: 0, baseUses: 100, copiesPerPoint: 10 } };
      content.spawns.native_forest.zones.meadow.entries = [{ species: 'knightmon', level: [1, 3], drops: [{ itemId: 'card_knightmon', chance: 0.4 }] }];
    } });
  const st = G.store.getState();
  const evos = ['veemon', 'flamedramon', 'raidramon', 'exveemon'].map((sp) => ({ species: sp, from: sp === 'veemon' ? '' : 'veemon', stage: sp === 'veemon' ? 'rookie' : sp === 'exveemon' ? 'champion' : 'armor', level: sp === 'veemon' ? 1 : 25, unlocked: true, dsCost: 10 }));
  G.store.setState({ me: { ...st.me, tamerDs: 300, training: {}, cards: [{ itemId: '', qty: 0 }],
    partner: { ...st.me.partner, species: start, stage: start === 'veemon' ? 'rookie' : 'armor', level: 116, evolutions: evos.map((e) => ({ ...e, canEvolveNow: e.from === start })) } } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.evolve = (sp) => { const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp, evolutions: s.me.partner.evolutions.map((e) => ({ ...e, canEvolveNow: e.from === sp })) } } }); };
  cmds.devolve = () => { const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: 'veemon', stage: 'rookie', evolutions: s.me.partner.evolutions.map((e) => ({ ...e, canEvolveNow: e.from === 'veemon' })) } } }); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'cards', cardSel: ['card_knightmon'], farmChannels: [1], hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'farm', cardForm }));
  G.w.eval(script);
  await wait(1500);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(start === 'veemon' ? 6000 : 12000);
  const sp = G.store.getState().me.partner.species, opts = [...(G.w.document.querySelector('[data-apsel="cardForm"]')?.options || [])].map((o) => o.value);
  G.w.close();
  return { sp, opts };
}

async function etaRun() {
  const G = makeWorld({ slot: 0, tag: 'B', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content }) {
      content.items.card_kunemon = { id: 'card_kunemon', name: 'Kunemon DE Card', training: { stat: 'de', points: 1, rarity: 0, baseUses: 20, copiesPerPoint: 10 } };
      content.spawns.native_forest.zones.meadow.entries = [{ species: 'kunemon', level: [1, 3], drops: [{ itemId: 'card_kunemon', chance: 0.4 }] }];
    } });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, training: { card_kunemon: 5 }, cards: [{ itemId: 'card_kunemon', qty: 3 }, { itemId: '', qty: 0 }] } });
  G.w.localStorage.setItem('digibot.cardKillMs', JSON.stringify({ kunemon: { ms: 30000, n: 20, e: 0.12, g: 5000, gn: 10 } }));
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'cards', cardSel: ['card_kunemon'], farmChannels: [1], hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'farm' }));
  G.w.eval(script);
  await wait(1500);
  const eta = G.w.document.querySelector('[data-f="cardeta"]')?.textContent || '';
  G.w.close();
  return eta;
}

async function gapRun(burst = false) {
  const G = makeWorld({ slot: 0, tag: 'C', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[430, 330], [450, 330], [470, 330], [490, 330], [510, 330]],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content }) {
      content.items.card_kunemon = { id: 'card_kunemon', name: 'Kunemon DE Card', training: { stat: 'de', points: 1, rarity: 0, baseUses: 200, copiesPerPoint: 10 } };
      content.spawns.native_forest.zones.meadow.entries = [{ species: 'kunemon', level: [1, 3], drops: [{ itemId: 'card_kunemon', chance: 0.4 }] }];
    } });
  const H = {};
  G.w.dmo.net.on = (name, fn) => { H[name] = fn; return () => {}; };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'cards', cardSel: ['card_kunemon'], farmChannels: [1], hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
  G.w.eval(script);
  await wait(1200);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(300);
  const ev = (evs) => H.evs?.(evs);
  for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:5']) ev([{ t: 'dmg', src: 'p:me', dst: id, amount: 100, outcome: 'hit' }]);
  const packs = burst ? [['m:1'], ['m:2', 'm:3', 'm:4'], ['m:5']] : [['m:1'], ['m:2'], ['m:3'], ['m:4']];
  for (const ids of packs) { await wait(400); ev(ids.map((id) => ({ t: 'die', id, killer: 'p:me' }))); ids.forEach((id) => G.ents.delete(id)); }
  await wait(300);
  const K = JSON.parse(G.w.localStorage.getItem('digibot.cardKillMs') || '{}').kunemon || {};
  G.w.close();
  return K;
}

async function wbRun() {
  const G = makeWorld({ slot: 0, tag: 'D', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content }) {
      content.digimon.blackwargreymon = { name: 'BlackWarGreymon' }; content.digimon.megidramon = { name: 'Megidramon' };
      content.spawns.native_forest.bosses = [{ species: 'blackwargreymon', level: 5, at: 'meadow', respawnMs: 10800000, worldBoss: { warnMs: 300000 } }];
      content.spawns.primary_village = { ...(content.spawns.primary_village || {}), bosses: [{ species: 'megidramon', level: 5, at: 'plaza', respawnMs: 10800000, worldBoss: { warnMs: 300000 } }] };
    } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', stab: 'events', wbOff: { blackwargreymon: true } }));
  G.w.eval(script);
  await wait(1500);
  const D = G.w.document;
  D.querySelector('[data-act="wboss"]').click(); await wait(300);
  const log = D.querySelector('.digibot__log')?.textContent || '';
  const line = (log.match(/Weltboss an.*?(?=\d\d:\d\d:\d\d|$)/) || [''])[0];
  D.querySelector('[data-tab="set"]').click(); await wait(600);
  const boxes = [...D.querySelectorAll('[data-wbon]')].map((b) => `${b.dataset.wbon}:${b.checked}`);
  const megi = D.querySelector('[data-wbon="megidramon"]');
  if (megi) { megi.checked = false; megi.dispatchEvent(new G.w.Event('change', { bubbles: true })); }
  await wait(300);
  const off = JSON.parse(G.w.localStorage.getItem('digibot.cfg')).wbOff || {};
  G.w.close();
  return { line, boxes, off };
}

(async () => {
  const a0 = await formRun(''), a1 = await formRun('flamedramon'), a2 = await formRun('__max', 'flamedramon');
  const b = await etaRun(), c = await gapRun(), c2 = await gapRun(true), d = await wbRun();
  console.log(JSON.stringify({ a0, a1, a2, b, c, c2, d }));
  const okA = a0.sp === 'raidramon' && a1.sp === 'flamedramon' && a1.opts.includes('') && a1.opts.includes('flamedramon');
  const okA2 = a2.sp === 'exveemon', okC2 = c2.gn >= 4 && c2.g > 100 && c2.g < 320;
  const okB = /noch ca\. 2 min/.test(b);
  const okC = c.gn >= 3 && c.g > 200 && c.g < 1500;
  const okD = /Megidramon/.test(d.line) && !/BlackWarGreymon/.test(d.line);
  const okE = d.boxes.includes('blackwargreymon:false') && d.boxes.includes('megidramon:true') && d.off.megidramon === true && d.off.blackwargreymon === true;
  console.log(okA ? 'OK     A: feste Karten-Digitation wird genommen (automatisch bleibt die beste)' : 'FEHLER A');
  console.log(okA2 ? 'OK     A2: höchstmögliche Form aus einer Armor-Form heraus' : 'FEHLER A2 ' + JSON.stringify(a2));
  console.log(okC2 ? 'OK     C2: gleichzeitige Kills zählen mit 0 ms' : 'FEHLER C2 ' + JSON.stringify(c2));
  console.log(okB ? 'OK     B: Restzeit aus dem Kill-Takt' : 'FEHLER B ' + b);
  console.log(okC ? 'OK     C: Kill-Abstand wird gemessen' : 'FEHLER C ' + JSON.stringify(c));
  console.log(okD ? 'OK     D: abgewählter Weltboss wird nicht angesteuert' : 'FEHLER D ' + d.line);
  console.log(okE ? 'OK     E: Weltboss-Haken unter Einstellungen → Events' : 'FEHLER E ' + JSON.stringify(d));
  process.exit(okA && okA2 && okB && okC && okC2 && okD && okE ? 0 : 1);
})();
