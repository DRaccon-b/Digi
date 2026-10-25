// 2.9.0: Gruppe starten öffnet Fenster je Account; Gruppen-Fenster meldet falschen Account ab, loggt ein, wählt den Charakter, startet den Bot
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', pass: '' }, { on: true, user: 'foll', pass: 'pw', char: 'Foll' }, { on: false, user: 'x' }, { on: true, user: 'third', pass: '' }] };
function make(url) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url, pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.BroadcastChannel = BroadcastChannel;
  let state = {};
  const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  w.localStorage.setItem('cdigi.accounts', JSON.stringify(accounts));
  w.localStorage.setItem('cdigi.cfg', JSON.stringify({ tab: 'acc' }));
  return { w, store, get state() { return state; } };
}
(async () => {
  // 1) Gruppe starten im normalen Fenster (als „lead“ eingeloggt)
  const A = make('https://play.digimmo.com.br/');
  const opened = [];
  A.w.open = (u, name, feat) => { opened.push({ u, name, feat }); return {}; };
  A.store.setState({ screen: 'charSelect', session: { username: 'lead', characters: [] } });
  A.w.dmo = { store: A.store, net: { connected: true, transferring: false, state: { entities: new Map() } }, client: {}, game: { scene: { getScene: () => null } } };
  A.w.eval(script);
  await wait(700);
  A.w.document.querySelector('[data-act="grp-login"]').click();
  await wait(300);
  const slotA = A.w.sessionStorage.getItem('digibot.slot');
  const urls = opened.map((o) => o.u.replace('https://play.digimmo.com.br/', ''));

  // 2) Fenster von Account 2: dort ist noch „lead“ eingeloggt (gemeinsamer Login-Speicher des Spiels)
  const B = make('https://play.digimmo.com.br/#dbslot=1&login=1');
  const calls = [];
  const chars = [{ id: 'c7', name: 'Other' }, { id: 'c8', name: 'Foll' }];
  B.store.setState({ screen: 'charSelect', session: { username: 'lead', characters: [{ id: 'c1', name: 'Lead' }] } });
  const ents = new Map([['t:me', { id: 't:me', kind: 0, x: 100, y: 100 }], ['p:me', { id: 'p:me', kind: 1, x: 110, y: 100 }]]);
  B.w.dmo = {
    store: B.store, net: { connected: true, transferring: false, state: { entities: ents }, charId: null },
    game: { scene: { getScene: () => null } },
    client: {
      logout() { calls.push('logout'); B.store.setState({ screen: 'login', session: { characters: [] } }); },
      async login(u, p) { calls.push(`login:${u}:${p ? 'pw' : ''}`); B.store.setState({ screen: 'charSelect', session: { username: u, characters: chars } }); },
      async enterWorld(id) {
        calls.push('enter:' + id); B.w.dmo.net.charId = id;
        B.store.setState({ screen: 'world', world: { mapId: 'x', channel: 1 }, me: { tamerEntityId: 't:me', quests: {}, hotbar: [], inventory: [], partner: { entityId: 'p:me', level: 5, hp: 10, maxHp: 10, ds: 1, maxDs: 1 } } });
      },
    },
  };
  B.w.eval(script);
  const t0 = Date.now();
  while (Date.now() - t0 < 12000 && B.state.screen !== 'world') await wait(200);
  await wait(4500);
  const botOffAfterLogin = !B.w.document.querySelector('[data-act="bot"]')?.classList.contains('on');
  A.w.document.querySelector('[data-act="grp-start"]').click();
  const t1 = Date.now();
  while (Date.now() - t1 < 6000 && !B.w.document.querySelector('[data-act="bot"]')?.classList.contains('on')) await wait(200);
  const botOn = B.w.document.querySelector('[data-act="bot"]')?.classList.contains('on');
  // Neu laden (Gruppe, aber kein Login-Auftrag) -> kein Einloggen
  const C = make('https://play.digimmo.com.br/#dbslot=1');
  const cCalls = [];
  C.store.setState({ screen: 'login', session: { characters: [] } });
  C.w.dmo = { store: C.store, net: { connected: true, transferring: false, state: { entities: new Map() } }, game: { scene: { getScene: () => null } }, client: { async login() { cCalls.push('login'); }, logout() { cCalls.push('logout'); } } };
  C.w.eval(script);
  await wait(3500);
  const noLoginOnReload = cCalls.length === 0;
  const savedChar = JSON.parse(B.w.localStorage.getItem('cdigi.accounts')).list[1];
  const r = { botOffAfterLogin, noLoginOnReload, slotA, urls, popupFeat: opened[0]?.feat, calls, botOn, savedChar: savedChar.char, hashGone: !B.w.location.hash };
  console.log(r);
  const ok = slotA === '0' && urls.join() === '#dbslot=1&login=1,#dbslot=3&login=1' && botOffAfterLogin && noLoginOnReload && /popup,width=/.test(opened[0]?.feat || '')
    && calls.join() === 'logout,login:foll:pw,enter:c8' && botOn && savedChar.char === 'Foll' && r.hashGone;
  console.log(ok ? 'OK – Fenster, Login, Charakter, Autostart' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
