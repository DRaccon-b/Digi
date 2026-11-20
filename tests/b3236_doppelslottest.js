// 3.2.36 (Review 20.11.): doppelt belegte Gruppen-Slots.
// A: Leader-Tab dupliziert (sessionStorage kopiert digibot.slot/digibot.group): dieses Fenster (Slot 0, gerade geladen)
//    hört eine Meldung von Slot 0 aus einem älteren Fenster -> Warnung „Slot … doppelt belegt“, Gruppe hier aus.
// B: Gegenrichtung – das andere Fenster mit Slot 0 ist jünger -> dieses (ältere) Fenster behält die Gruppe, warnt aber.
// C: nicht angemeldetes Fenster (Benutzer leer) klickt „Party einladen“, ein Leader-Fenster meldet sich schon ->
//    claimSlot darf nicht auf den Leader-Slot zurückfallen.
// D: nicht angemeldetes Fenster, kein Leader-Fenster da -> wie bisher Leader (das erste Fenster öffnet die anderen).
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: false, spread: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

// Meldung eines anderen Fensters im Bot-Format; Sitzung beginnt wie im Bot mit dem Ladezeitpunkt (Basis 36)
function peer(session, slot) {
  const ch = new BroadcastChannel('digibot-group-v1');
  let seq = 0;
  const send = () => ch.postMessage({ type: 'state', slot, role: slot === 0 ? 'leader' : 'follower', user: slot === 0 ? 'lead' : 'foll', name: 'X', inWorld: true,
    mapId: 'native_forest', channel: 1, x: 400, y: 330, bot: false, status: 'Bot aus', quests: {}, ents: [], talks: [], done: [], busy: null, noFight: false,
    task: null, hunt: [], targetId: null, mode: 'auto', protocol: 'digibot/1', leader: 0, session, seq: ++seq, sentAt: Date.now() });
  const t = setInterval(send, 300); send();
  return () => { clearInterval(t); ch.close(); };
}
const logText = (G) => G.w.document.body.textContent;

async function dup(older) {
  const G = makeWorld({ slot: 0, tag: 'L', accounts });
  G.w.eval(script);
  await wait(800);
  const ts = Date.now() + (older ? -3600000 : 3600000);
  const stop = peer(`${ts.toString(36)}-abcdef`, 0);
  await wait(2500);
  const out = { group: G.w.sessionStorage.getItem('digibot.group'), slot: G.w.sessionStorage.getItem('digibot.slot'), txt: logText(G) };
  stop(); G.w.close();
  return out;
}

async function unlogged(leaderThere) {
  const G = makeWorld({ slot: 1, tag: 'F', accounts, noHash: true });
  const st = G.store.getState();
  G.store.setState({ screen: 'login', session: { ...st.session, username: '' } });
  G.w.eval(script);
  const stop = leaderThere ? peer(`${(Date.now() - 60000).toString(36)}-lead00`, 0) : () => {};
  await wait(1500);
  G.w.document.querySelector('[data-act="grp-invite"]')?.click();
  await wait(500);
  const out = { group: G.w.sessionStorage.getItem('digibot.group'), slot: G.w.sessionStorage.getItem('digibot.slot'), txt: logText(G) };
  stop(); G.w.close();
  return out;
}

(async () => {
  const A = await dup(true);
  check('A', A.group !== '1' && /Slot 1 ist doppelt belegt/.test(A.txt), 'jüngeres Doppel-Fenster warnt und verlässt die Gruppe',
    () => `digibot.group=${A.group}, Warnung ${/doppelt belegt/.test(A.txt)}`);
  const B = await dup(false);
  check('B', B.group === '1' && B.slot === '0' && /Slot 1 ist doppelt belegt/.test(B.txt), 'älteres Fenster behält die Gruppe und warnt',
    () => `digibot.group=${B.group}, slot=${B.slot}, Warnung ${/doppelt belegt/.test(B.txt)}`);
  const C = await unlogged(true);
  check('C', C.slot !== '0', `nicht angemeldetes Fenster nimmt nicht den Leader-Slot (slot=${C.slot})`, () => `slot=${C.slot}, group=${C.group}`);
  const D = await unlogged(false);
  check('D', D.slot === '0' && D.group === '1', 'ohne Leader-Fenster wird das erste Fenster Leader wie bisher', () => `slot=${D.slot}, group=${D.group}`);
  process.exit(res.every(Boolean) ? 0 : 1);
})();
