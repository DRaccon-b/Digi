// 3.1.7: Anwesenheitskontrolle – der Bot stoppt (und rührt sie nicht an); hat der Spieler sie beantwortet, läuft der Bot
// von selbst weiter, wenn er vorher lief. War er aus, bleibt er aus.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function trial(running) {
  const G = makeWorld({ slot: 0, tag: running ? 'R' : 'O', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[430, 330, 'kunemon']],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10 }));
  G.w.eval(script);
  await wait(800);
  const btn = () => G.w.document.querySelector('[data-act="bot"]')?.textContent || '';
  if (running) G.w.document.querySelector('[data-act="bot"]').click();
  await wait(800);
  const before = btn();
  G.store.setState({ challenge: { id: 'c1' } }); // Kontrolle erscheint
  await wait(2500);
  const during = { btn: btn(), st: G.status() };
  G.store.setState({ challenge: null }); // Spieler hat geantwortet
  await wait(2500);
  const after = { btn: btn(), st: G.status() };
  G.w.close();
  return { running, before, during, after };
}
(async () => {
  const r = await trial(true), o = await trial(false);
  console.log(r, o);
  const ok = /Stopp/.test(r.before) && /Start/.test(r.during.btn) && /Anwesenheitskontrolle/.test(r.during.st) && /Stopp/.test(r.after.btn)
    && /Start/.test(o.before) && /Start/.test(o.after.btn);
  console.log(ok ? 'OK – stoppt bei der Kontrolle, läuft nach der Antwort weiter; aus bleibt aus' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
