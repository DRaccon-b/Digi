// 3.2.33 (Nutzer 19.11.): Kartenrotation in der Gruppe – Option „weiterfarmen, bis alle in der Gruppe voll sind“.
// Leader hat alle ausgewählten Karten voll, ein Mitläufer braucht noch Kunemon-Karten (meldet cardNeed über den Gruppenbus).
// A: Option an -> der Leader farmt weiter (Kunemon-Kills), Bot läuft.
// B: Option aus -> „Kartenrotation fertig“, Bot gestoppt (wie bisher).
// C: Option an, aber kein Mitläufer meldet sich -> fertig und gestoppt.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, spread: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };

function world(cardGroupAll) {
  const G = makeWorld({ slot: 0, tag: 'L', accounts,
    mobs: [[360, 300, 'kunemon'], [420, 340, 'kunemon'], [470, 280, 'kunemon'], [380, 360, 'kunemon']],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content }) {
      content.items.card_kunemon = { id: 'card_kunemon', name: 'kunemon', training: { stat: 'de', points: 1, rarity: 0, baseUses: 8, copiesPerPoint: 10 } };
      content.spawns.native_forest.zones.meadow.entries = [{ species: 'kunemon', level: [1, 3], drops: [{ itemId: 'card_kunemon', chance: 0.4 }] }];
    } });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, training: { card_kunemon: 8 }, cards: [{ itemId: '', qty: 0 }] } }); // Leader: voll
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'cards', cardSel: ['card_kunemon'], farmChannels: [1],
    cardGroupAll, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
  G.w.eval(script);
  return G;
}
const running = (G) => /Stopp/.test(G.w.document.querySelector('[data-act="bot"]')?.textContent || '');
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

async function run(cardGroupAll, follower) {
  const G = world(cardGroupAll);
  const bus = require('./groupbus')('digibot-group');
  const tick = follower ? setInterval(() => bus.postMessage({ type: 'state', slot: 1, role: 'follower', name: 'Foll', inWorld: true, mapId: 'native_forest', channel: 1, x: 400, y: 330,
    bot: true, status: 'folge', quests: {}, ents: ['t:foll', 'p:foll'], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: null, mode: 'farm', farm: true,
    cardNeed: ['card_kunemon'] }), 300) : null;
  await wait(1500);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(9000);
  const out = { run: running(G), kills: G.kills, txt: G.w.document.body.textContent, status: G.status() };
  if (tick) clearInterval(tick);
  bus.close(); G.w.close();
  return out;
}

(async () => {
  const A = await run(true, true);
  check('A', A.run && A.kills >= 1, `Option an – Leader farmt für den Mitläufer weiter (${A.kills} Kills)`, () => `läuft ${A.run}, Kills ${A.kills}, Status ${A.status}`);
  const B = await run(false, true);
  check('B', !B.run && /Kartenrotation fertig/.test(B.txt), 'Option aus – fertig und gestoppt wie bisher', () => `läuft ${B.run}, Status ${B.status}`);
  const C = await run(true, false);
  check('C', !C.run && /Kartenrotation fertig/.test(C.txt), 'Option an, kein Mitläufer – fertig und gestoppt', () => `läuft ${C.run}, Status ${C.status}`);
  process.exit(res.every(Boolean) ? 0 : 1);
})();
