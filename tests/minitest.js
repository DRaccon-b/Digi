// 3.2.35 (Nutzer 20.11.): Mittlerer Knopf oben = Mini-Leiste – das Panel schrumpft auf ▶ Start/Weiter, ⏸ Pause, ■ Stopp.
// M1: Klick auf den mittleren Knopf -> Mini-Modus (Reiter/Inhalt weg, drei Steuerknöpfe da), bleibt nach Neuladen (cfg.mini).
// M2: ▶ startet den Bot, ⏸ pausiert (keine Angriffe mehr, Status „Pausiert“), ▶ macht weiter, ■ stoppt.
// M3: Wiederherstellen-Knopf holt das volle Panel zurück.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const check = (id, ok, okText, bad) => { res.push(ok); console.log(ok ? `OK     ${id}: ${okText}` : `FEHLER ${id}: ${bad()}`); };

function world() {
  const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    mobs: [[360, 300, 'kunemon'], [420, 340, 'kunemon'], [470, 280, 'kunemon']], quests: { q00_meet_gennai: { state: 3, counters: [] } },
    onKill(m) { m.hp = m.maxHp; } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10 }));
  G.keys = [];
  G.w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') G.keys.push(Date.now()); }, true);
  G.w.eval(script);
  return G;
}
const q = (G, s) => G.w.document.querySelector(s);
const vis = (G, el) => !!el && G.w.getComputedStyle(el).display !== 'none';
const running = (G) => /Stopp/.test(q(G, '[data-act="bot"]')?.textContent || '');

(async () => {
  const G = world();
  await wait(1200);
  const head = [...G.w.document.querySelectorAll('.digibot__head > button')];
  const mid = head.length === 3 ? head[1] : null;
  mid?.click(); await wait(400);
  const panel = q(G, '.digibot'), bar = q(G, '.digibot__minibar');
  const btns = ['mini-play', 'mini-pause', 'mini-stop'].map((a) => q(G, `[data-act="${a}"]`));
  const saved = JSON.parse(G.w.localStorage.getItem('digibot.cfg') || '{}').mini;
  check('M1', !!mid && panel.classList.contains('is-mini') && vis(G, bar) && btns.every((b) => vis(G, b)) && !vis(G, q(G, '.digibot__tabs')) && !vis(G, q(G, '.digibot__body')) && saved === true,
    'mittlerer Knopf -> Mini-Leiste mit Start, Pause, Stopp', () => `Knöpfe oben ${head.length}, mini ${panel.classList.contains('is-mini')}, Leiste ${vis(G, bar)}, Steuerknöpfe ${btns.map((b) => vis(G, b)).join(',')}, Reiter sichtbar ${vis(G, q(G, '.digibot__tabs'))}, gespeichert ${saved}`);
  btns[0]?.click(); await wait(4000);
  const k1 = G.keys.length, on1 = running(G);
  btns[1]?.click(); await wait(600);
  const k2 = G.keys.length; await wait(3000);
  const k3 = G.keys.length, paused = /Pausiert/.test(G.status()), on2 = running(G);
  btns[0]?.click(); await wait(3000);
  const k4 = G.keys.length;
  btns[2]?.click(); await wait(600);
  const off = !running(G);
  check('M2', on1 && k1 > 0 && k3 === k2 && paused && on2 && k4 > k3 && off, 'Start, Pause (keine Angriffe), Weiter, Stopp',
    () => `läuft ${on1} (Tasten ${k1}), Pause: Tasten ${k2}->${k3}, Status ${G.status()}, weiter: ${k4}, aus ${off}`);
  q(G, '[data-act="mini"]')?.click(); await wait(400);
  check('M3', !panel.classList.contains('is-mini') && vis(G, q(G, '.digibot__tabs')), 'volles Panel zurück', () => `mini ${panel.classList.contains('is-mini')}`);
  G.w.close();
  process.exit(res.every(Boolean) ? 0 : 1);
})();
