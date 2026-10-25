// 2.14.0: (a) Neuer Tab steht in der Charakterauswahl des anderen Accounts -> „Dieses Fenster ist Account 2“ wählen
// meldet ab, loggt Account 2 ein und betritt die Welt. (b) Einstellungen je Account (Profil), kein Überschreiben.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'acc1', pass: 'test-pw-1', char: 'Char1' }, { on: true, user: 'acc2', pass: 'test-pw-2', char: 'Char2' }] };
function make(user, screen, extraStorage = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.BroadcastChannel = BroadcastChannel;
  let state = {};
  const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  w.localStorage.setItem('cdigi.accounts', JSON.stringify(accounts));
  w.localStorage.setItem('cdigi.cfg', JSON.stringify({ tab: 'acc', dodge: true, radius: 300 }));
  for (const [k, v] of Object.entries(extraStorage)) w.localStorage.setItem(k, JSON.stringify(v));
  const calls = [];
  const charsOf = { acc1: [{ id: 'c1', name: 'Char1' }], acc2: [{ id: 'c2', name: 'Char2' }] };
  const ents = new Map([['t:me', { id: 't:me', kind: 0, x: 100, y: 100 }], ['p:me', { id: 'p:me', kind: 1, x: 110, y: 100 }]]);
  const enter = (id) => store.setState({ screen: 'world', world: { mapId: 'x', channel: 1 }, me: { tamerEntityId: 't:me', quests: {}, hotbar: [], inventory: [], partner: { entityId: 'p:me', level: 5, hp: 10, maxHp: 10, ds: 1, maxDs: 1, skills: [] } } });
  w.dmo = {
    store, net: { connected: true, transferring: false, state: { entities: ents }, charId: null }, game: { scene: { getScene: () => null } },
    client: {
      logout() { calls.push('logout'); store.setState({ screen: 'login', session: { characters: [] } }); },
      async login(u, p) { calls.push(`login:${u}`); store.setState({ screen: 'charSelect', session: { username: u, characters: charsOf[u] } }); },
      async enterWorld(id) { calls.push('enter:' + id); w.dmo.net.charId = id; enter(id); },
    },
  };
  store.setState({ screen, session: { username: user, characters: charsOf[user] } });
  if (screen === 'world') { w.dmo.net.charId = charsOf[user][0].id; enter(); }
  w.eval(script);
  return { w, store, calls, get state() { return state; } };
}
(async () => {
  // (a) neuer Tab: Charakterauswahl von acc1, Fenster soll Account 2 sein
  const B = make('acc1', 'charSelect');
  await wait(800);
  const sel = B.w.document.querySelector('[data-accslot]');
  sel.value = '1';
  sel.dispatchEvent(new B.w.Event('input', { bubbles: true }));
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && B.state.screen !== 'world') await wait(200);
  check('Account-Wahl: abmelden, acc2 einloggen, Char2 betreten', B.calls.join(',') === 'logout,login:acc2,enter:c2' && B.state.screen === 'world', B.calls.join(','));

  // (b) Profile: acc1 ändert eine Einstellung, acc2 hat ein eigenes Profil
  const A = make('acc1', 'world', { 'cdigi.cfg@acc2': { tab: 'acc', dodge: true, radius: 555 } });
  await wait(1800);
  const dodge = A.w.document.querySelector('[data-apflag="dodge"]');
  dodge.checked = false; dodge.dispatchEvent(new A.w.Event('input', { bubbles: true }));
  await wait(300);
  const p1 = JSON.parse(A.w.localStorage.getItem('cdigi.cfg@acc1') || 'null');
  const shared = JSON.parse(A.w.localStorage.getItem('cdigi.cfg') || '{}');
  check('Profil acc1 angelegt und gespeichert (dodge aus)', p1 && p1.dodge === false, JSON.stringify({ dodge: p1?.dodge }));
  check('Gemeinsame Einstellungen nicht überschrieben', shared.dodge === true, JSON.stringify({ dodge: shared.dodge }));
  // Account-Wechsel im selben Fenster -> Profil von acc2 laden
  A.store.setState({ screen: 'charSelect', session: { username: 'acc2', characters: [{ id: 'c2', name: 'Char2' }] } });
  await wait(1800);
  const dodge2 = A.w.document.querySelector('[data-apflag="dodge"]').checked;
  const radius2 = A.w.document.querySelector('input[data-cfg="radius"]').value;
  check('Wechsel zu acc2: dessen Profil im Panel (dodge an, Radius 555)', dodge2 === true && radius2 === '555', JSON.stringify({ dodge2, radius2 }));
  const p1b = JSON.parse(A.w.localStorage.getItem('cdigi.cfg@acc1'));
  check('Profil acc1 bleibt unverändert', p1b.dodge === false && p1b.radius === 300, JSON.stringify({ dodge: p1b.dodge, radius: p1b.radius }));
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
