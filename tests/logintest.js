// CDigi: Gruppenfenster melden sich nie selbst an. „⧉ Fenster öffnen“ öffnet fehlende Fenster nur mit Slot (#dbslot=N),
// ein Gruppenfenster ruft weder logout/login/enterWorld auf (auch nicht mit altem „&login=1“ im Link), gespeicherte
// Passwörter aus DigiBot verschwinden beim nächsten Speichern, der Charaktername wird gemerkt, „Gruppe starten“ startet.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', pass: 'alt-pw' }, { on: true, user: 'foll', pass: 'pw', char: 'Foll' }, { on: false, user: 'x' }, { on: true, user: 'third', pass: '' }] };
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
  // 1) Fenster öffnen im normalen Fenster (als „lead“ in der Charakterauswahl)
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

  // 2) Fenster von Account 2 (alter Link mit &login=1): dort ist noch „lead“ eingeloggt – CDigi meldet nichts an oder ab
  const B = make('https://play.digimmo.com.br/#dbslot=1&login=1');
  const calls = [];
  B.store.setState({ screen: 'charSelect', session: { username: 'lead', characters: [{ id: 'c1', name: 'Lead' }] } });
  const ents = new Map([['t:me', { id: 't:me', kind: 0, x: 100, y: 100 }], ['p:me', { id: 'p:me', kind: 1, x: 110, y: 100 }]]);
  B.w.dmo = {
    store: B.store, net: { connected: true, transferring: false, state: { entities: ents }, charId: null },
    game: { scene: { getScene: () => null } },
    client: { logout() { calls.push('logout'); }, async login(u) { calls.push('login:' + u); }, async enterWorld(id) { calls.push('enter:' + id); } },
  };
  B.w.eval(script);
  await wait(4000);
  const noAutoLogin = calls.length === 0;
  const status = B.w.document.querySelector('[data-f="grpinfo"]')?.textContent || '';
  // Anmeldung von Hand: foll betritt die Welt mit „Foll“
  B.w.dmo.net.charId = 'c8';
  B.store.setState({ screen: 'world', session: { username: 'foll', characters: [{ id: 'c8', name: 'Foll' }] }, world: { mapId: 'x', channel: 1 },
    me: { tamerEntityId: 't:me', quests: {}, hotbar: [], inventory: [], partner: { entityId: 'p:me', level: 5, hp: 10, maxHp: 10, ds: 1, maxDs: 1 } } });
  await wait(2500);
  const botOffAfterLogin = !B.w.document.querySelector('[data-act="bot"]')?.classList.contains('on');
  // CDigi startet die Gruppe erst, wenn das eigene (Leader-)Fenster in der Welt ist
  A.w.dmo.net.state.entities.set('t:lead', { id: 't:lead', kind: 0, x: 100, y: 100 }).set('p:lead', { id: 'p:lead', kind: 1, x: 110, y: 100 });
  A.store.setState({ screen: 'world', session: { username: 'lead', characters: [] }, world: { mapId: 'x', channel: 1 },
    me: { tamerEntityId: 't:lead', quests: {}, hotbar: [], inventory: [], partner: { entityId: 'p:lead', level: 5, hp: 10, maxHp: 10, ds: 1, maxDs: 1 } } });
  await wait(600);
  A.w.document.querySelector('[data-act="grp-start"]').click();
  const t1 = Date.now();
  while (Date.now() - t1 < 6000 && !B.w.document.querySelector('[data-act="bot"]')?.classList.contains('on')) await wait(200);
  const botOn = B.w.document.querySelector('[data-act="bot"]')?.classList.contains('on');
  const saved = JSON.parse(B.w.localStorage.getItem('cdigi.accounts'));
  const r = { slotA, urls, popupFeat: opened[0]?.feat, noAutoLogin, calls, botOffAfterLogin, botOn, savedChar: saved.list[1].char,
    noPasswords: !JSON.stringify(saved).includes('pw') && saved.list.every((a) => !('pass' in a)), hashGone: !B.w.location.hash, status };
  console.log(r);
  const ok = slotA === '0' && urls.join() === '#dbslot=1,#dbslot=3' && /popup,width=/.test(opened[0]?.feat || '') && noAutoLogin
    && botOffAfterLogin && botOn && r.savedChar === 'Foll' && r.noPasswords && r.hashGone;
  console.log(ok ? 'OK – Fenster öffnen ohne Login, Anmeldung bleibt manuell, keine Passwörter, Gruppe startet' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
