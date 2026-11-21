// 3.2.45 (Nutzer 21.11.): Option „Nach geschafftem Lauf wiederholen“ – nach dem Sieg über MaloMyotismon und dem Hinausgehen
// nicht stoppen, sondern den nächsten Lauf beginnen (höchstens dgRepeatN Läufe, 0 = unbegrenzt).
// Simulator sim/raid-malomyotismon.js (Boss-HP ÷ 20), danach 4 s draußen zusehen:
//  R1: Option an (2 Läufe)  -> Bot läuft weiter, Status „nächster Lauf“ bzw. Weg zur Tür, nicht „Bot gestoppt“.
//  R0: Option aus (Standard) -> „Dungeon geschafft – Bot gestoppt“ wie bisher.
//  RN: Option an, höchstens 1 Lauf -> nach dem 1. Lauf gestoppt.
const { spawn } = require('child_process');
const path = require('path');
const script = process.argv[2] || path.join(__dirname, '..', 'digibot.user.js');
const sim1 = (cfg) => new Promise((resolve) => {
  const c = spawn(process.execPath, [path.join(__dirname, '..', 'sim', 'raid-malomyotismon.js')], { env: { ...process.env, SKRIPT: script, HP_TEIL: '20', TEMPO: '4', NACH: '4', CFG: JSON.stringify(cfg), V: '' } });
  let o = ''; c.stdout.on('data', (x) => { o += x; }); c.stderr.on('data', (x) => { o += x; });
  c.on('close', () => resolve(((o.match(/Danach: Status (.*?) · Log/) || [])[1] || '') + (/Ergebnis: ✅/.test(o) ? '' : ' [Lauf nicht geschafft]')));
});
// Lauf im Simulator selbst verloren (unter Last möglich): einmal wiederholen – geprüft wird das Verhalten danach, nicht der Kampf
const sim = async (cfg) => { const r = await sim1(cfg); return /nicht geschafft/.test(r) ? sim1(cfg) : r; };
(async () => {
  const r1 = await sim({ dgRepeat: true, dgRepeatN: 2 }), r0 = await sim({}), rn = await sim({ dgRepeat: true, dgRepeatN: 1 });
  const res = [];
  const check = (id, ok, txt, st) => { res.push(ok); console.log(ok ? `OK     ${id}: ${txt}` : `FEHLER ${id}: Status ${st}`); };
  check('R1', !/gestoppt|nicht geschafft|nicht gefunden/.test(r1) && /nächster Lauf|Tür|Reise|laufe|Lade|betrete|Warte/i.test(r1), `Wiederholen an: läuft weiter (${r1})`, r1);
  check('R0', /Dungeon geschafft – Bot gestoppt/.test(r0), 'Option aus: stoppt wie bisher', r0);
  check('RN', /gestoppt/.test(rn) && !/nicht geschafft/.test(rn), 'höchstens 1 Lauf: danach gestoppt', rn);
  process.exit(res.every(Boolean) ? 0 : 1);
})();
