// 2.20.1: Wie live bei SpencerD – Jagd im Jagdgebiet, langer Kampf, bewusstlos, Wiederbeleben weiter weg. Der Rückweg
// ins Jagdgebiet darf nicht als „nicht erreichbar“ gelten (alte Weg-Messung von vor dem Kampf -> 5 min übersprungen).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[420, 320]],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_h: { state: 1, counters: [0] } },
  setup({ content }) { content.quests.q_h = { id: 'q_h', name: 'Viele Kunemon', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 99 }] }; } });
G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
const keep = setInterval(() => { const m = G.ents.get('m:1'); if (m) m.hp = Math.max(m.hp, 250); }, 30); // zäh: Kampf dauert an
G.w.eval(script);
const setFaint = (v) => { const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, fainted: v } } }); };
(async () => {
  await wait(800);
  // weit weg starten: erst ins Jagdgebiet laufen
  const t = G.ents.get('t:me'); t.x = 1300; t.y = 1000;
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(26000); // hinlaufen + lange kämpfen
  setFaint(true); clearInterval(keep);
  const frozen = { x: 1300, y: 1000 }; t.x = frozen.x; t.y = frozen.y; // wiederbelebt weiter weg
  const hold = setInterval(() => { t.x = frozen.x; t.y = frozen.y; }, 20);
  await wait(4000);
  clearInterval(hold); setFaint(false);
  await wait(6000);
  const log = G.w.document.querySelector('.digibot__log')?.textContent || '';
  const d = Math.round(Math.hypot(t.x - 400, t.y - 325));
  const r = { banned: /nicht erreichbar/.test(log), backDist: d, status: G.status() };
  console.log(r);
  const ok = !r.banned && d < 1000; // unterwegs zurück (Start 1125 px entfernt)
  console.log(ok ? 'OK – nach dem Wiederbeleben zurück ins Jagdgebiet' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
