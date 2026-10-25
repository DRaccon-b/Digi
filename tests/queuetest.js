// CDigi 1.0.14: Quest-Runde – Accounts nacheinander in einem Fenster. Account 1 ist angemeldet, hat nichts mehr zu tun;
// dann meldet CDigi ab, Account 2 mit dem nur im Arbeitsspeicher gehaltenen Passwort an, betritt dessen Charakter, lässt
// den Autopiloten laufen und beendet die Runde. Das Passwort landet nie im localStorage.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const accounts = { leader: 0, list: [{ on: true, user: 'acc1', char: 'Char1' }, { on: true, user: 'acc2', char: 'Char2' }] };
  const G = makeWorld({ slot: 0, tag: 'Q', noHash: true, accounts, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
  const calls = [];
  const world = () => { const { me, world: wo } = G.state; return { me, world: wo }; };
  let saved = null;
  G.w.dmo.client = {
    logout() { calls.push('logout'); saved = world(); G.store.setState({ screen: 'login', session: { characters: [] }, me: null, target: null }); },
    async login(u, p) { calls.push(`login:${u}:${p}`); await wait(200); G.store.setState({ screen: 'charSelect', session: { username: u, characters: [{ id: 'c1', name: 'Char1' }, { id: 'c2', name: 'Char2' }] } }); },
    async enterWorld(id) { calls.push('enter:' + id); await wait(300); G.w.dmo.net.charId = id; G.store.setState({ screen: 'world', ...saved }); },
  };
  G.w.eval(script);
  await wait(1200);
  const pw = G.w.document.querySelector('[data-queue-password="1"]');
  pw.value = 'geheim2'; pw.dispatchEvent(new G.w.Event('input', { bubbles: true }));
  G.trustedClick('[data-act="queue-start"]');
  const t0 = Date.now(), sts = [];
  while (Date.now() - t0 < 40000 && !/Quest-Runde abgeschlossen/.test(G.w.document.body.textContent)) {
    const s = G.status(); if (s !== sts[sts.length - 1]) sts.push(s);
    await wait(150);
  }
  const all = Object.keys(G.w.localStorage).map((k) => G.w.localStorage.getItem(k)).join('|');
  const r = { calls, user: G.state.session?.username, done: /Quest-Runde abgeschlossen/.test(G.w.document.body.textContent), pwStored: all.includes('geheim2'), sts: sts.slice(0, 10) };
  console.log(r);
  G.w.close();
  const ok = calls.join() === 'logout,login:acc2:geheim2,enter:c2' && r.user === 'acc2' && r.done && !r.pwStored;
  console.log(ok ? 'OK – Quest-Runde: Account 1 fertig, Wechsel zu Account 2, Runde abgeschlossen, Passwort nicht gespeichert' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
