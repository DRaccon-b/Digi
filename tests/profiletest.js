// CDigi 1.0.14: eine gemeinsame Einstellung für alle Accounts (statt Profil je Account). Beim ersten Anmelden wird das
// alte Profil dieses Accounts (cdigi.cfg@name) einmal übernommen, danach nie wieder ein Profil geladen. Ein Account-Wechsel
// im selben Fenster behält die Einstellungen; Änderungen landen in cdigi.cfg.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'acc1', char: 'Char1' }, { on: true, user: 'acc2', char: 'Char2' }] };
function make(user, extraStorage = {}) {
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
  const ents = new Map([['t:me', { id: 't:me', kind: 0, x: 100, y: 100 }], ['p:me', { id: 'p:me', kind: 1, x: 110, y: 100 }]]);
  w.dmo = { store, net: { connected: true, transferring: false, state: { entities: ents }, charId: 'c1' }, game: { scene: { getScene: () => null } }, client: {} };
  store.setState({ screen: 'world', session: { username: user, characters: [{ id: 'c1', name: 'Char1' }] }, world: { mapId: 'x', channel: 1 },
    me: { tamerEntityId: 't:me', quests: {}, hotbar: [], inventory: [], partner: { entityId: 'p:me', level: 5, hp: 10, maxHp: 10, ds: 1, maxDs: 1 } } });
  w.eval(script);
  return { w, store, get state() { return state; } };
}
const cfgOf = (W) => JSON.parse(W.w.localStorage.getItem('cdigi.cfg') || '{}');
(async () => {
  // altes Profil von acc1 (Radius 444) wird beim ersten Anmelden übernommen; acc2 hat ebenfalls ein altes Profil
  const A = make('acc1', { 'cdigi.cfg@acc1': { tab: 'acc', dodge: true, radius: 444 }, 'cdigi.cfg@acc2': { tab: 'acc', dodge: true, radius: 555 } });
  await wait(1800);
  const radius1 = A.w.document.querySelector('input[data-cfg="radius"]').value;
  check('Altes Profil von acc1 einmal übernommen (Radius 444)', radius1 === '444' && cfgOf(A).radius === 444 && A.w.localStorage.getItem('cdigi.cfg.shared.v1') === '1',
    JSON.stringify({ radius1, saved: cfgOf(A).radius }));
  const dodge = A.w.document.querySelector('[data-apflag="dodge"]');
  dodge.checked = false; dodge.dispatchEvent(new A.w.Event('input', { bubbles: true }));
  await wait(300);
  check('Änderung landet in der gemeinsamen Einstellung (dodge aus)', cfgOf(A).dodge === false, JSON.stringify({ dodge: cfgOf(A).dodge }));
  // Account-Wechsel im selben Fenster: kein Profil laden, Einstellungen bleiben
  A.store.setState({ screen: 'charSelect', session: { username: 'acc2', characters: [{ id: 'c2', name: 'Char2' }] } });
  await wait(1800);
  const dodge2 = A.w.document.querySelector('[data-apflag="dodge"]').checked;
  const radius2 = A.w.document.querySelector('input[data-cfg="radius"]').value;
  check('Wechsel zu acc2: Einstellungen bleiben (dodge aus, Radius 444)', dodge2 === false && radius2 === '444', JSON.stringify({ dodge2, radius2 }));
  check('Panel zeigt „für alle Accounts“', /alle Accounts/.test(A.w.document.querySelector('[data-f="prof"]')?.textContent || ''));
  // Umstieg von DigiBot: dessen Profil (digibot.cfg@name) wird ebenso einmal übernommen
  const D = make('acc1', { 'digibot.cfg@acc1': { tab: 'acc', dodge: true, radius: 333 } });
  await wait(1800);
  check('DigiBot-Profil einmal übernommen (Radius 333)', cfgOf(D).radius === 333, JSON.stringify({ radius: cfgOf(D).radius }));
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
