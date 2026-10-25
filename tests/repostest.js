// 2.8.1: „unreachable“ -> erst zweimal Position wechseln und neu angreifen, beim dritten Mal sperren
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;
w.eval(fake);
const F = w.__fake, scene = w.dmo.game.scene.getScene('world');
const taps = [];
scene.controlledId = () => 't:me';
scene.tapGround = (x, y) => { taps.push({ x: Math.round(x), y: Math.round(y) }); const t = F.ents.get('t:me'), p = F.ents.get('p:me'); t.x = x; t.y = y; p.x = x + 5; p.y = y; };
scene.deps.commands = { partnerFollow() {} };
for (const id of ['m:3', 'm:4', 'm:5', 'm:6']) F.ents.delete(id);
const keys = [];
w.addEventListener('keydown', (e) => keys.push({ c: e.code, t: Date.now() }), true);
w.localStorage.setItem('cdigi.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 10, radius: 400 }));
w.eval(script);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const status = () => w.document.querySelector('[data-f="status"]').textContent;
const refuse = () => F.store.setState({ toasts: [{ kind: 'error', code: 'unreachable', text: 'Your partner cannot reach that target.' }] });
(async () => {
  await wait(600);
  w.document.querySelector('[data-act="bot"]').click();
  await wait(800);
  const first = F.store.getState().target?.id;
  const m = F.ents.get(first);
  // 1. Meldung -> Positionswechsel
  refuse(); await wait(400);
  const tap1 = taps[taps.length - 1];
  const d1 = tap1 && Math.round(Math.hypot(tap1.x - m.x, tap1.y - m.y));
  const t1 = Date.now(); await wait(1200);
  const reattack1 = keys.some((k) => k.c === 'Digit1' && k.t > t1);
  const sameTarget1 = F.store.getState().target?.id === first;
  // 2. Meldung -> zweiter Positionswechsel
  refuse(); await wait(400);
  const tap2 = taps[taps.length - 1];
  await wait(1200);
  // 3. Meldung -> sperren und wechseln
  refuse(); await wait(1500);
  const after = F.store.getState().target?.id;
  console.log({ first, tap1, d1, reattack1, sameTarget1, tap2, after, status: status() });
  const ok = !!tap1 && d1 > 30 && d1 < 90 && reattack1 && sameTarget1 && tap2 && (tap2.x !== tap1.x || tap2.y !== tap1.y) && after && after !== first;
  console.log(ok ? 'OK – erst Position wechseln, dann sperren' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
