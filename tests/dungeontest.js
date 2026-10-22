// Dungeon-Modus (Kera Easy): ein ganzer Lauf im Simulator sim/dungeon-keramon.js – 2 Bots, verkürzt (SCHNELL: Boss-HP und Enrage ÷ 10,
// echte Partner-Werte). Erwartet: Tür, Betreten, 7 Wellen, Tor, Boss mit allen Formen, alle draußen, Bots gestoppt.
const { spawnSync } = require('child_process');
const path = require('path');
const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'sim', 'dungeon-keramon.js')], {
  env: { ...process.env, GRUPPE: '2', SCHNELL: '1', DAUER: '170', V: '' }, encoding: 'utf8', timeout: 190000,
});
const out = (r.stdout || '') + (r.stderr || '');
const fail = (m) => { console.log(out.split('\n').slice(-40).join('\n')); console.log('FAIL: ' + m); process.exit(1); };
if (!/Ergebnis: ✅ geschafft und draußen/.test(out)) fail('Lauf nicht geschafft');
if (!/Welle 7\/7/.test(out)) fail('nicht alle Wellen');
if (!/Boss wird zu Infermon/.test(out)) fail('Boss-Formen fehlen');
if ((out.match(/Dungeon geschafft – Bot gestoppt/g) || []).length < 1) fail('Bots nicht gestoppt');
const heil = Number((out.match(/Terminals: (\d)\/6 heil/) || [])[1]);
if (!(heil >= 4)) fail(`zu viele Terminals verloren (${heil}/6 heil)`);
const hits = Number((out.match(/(\d+) getroffen · Spiegel/) || [])[1]);
const refl = Number((out.match(/Spiegel-Treffer (\d+)/) || [])[1]);
if (refl > 0) fail(`in den Spiegel geschlagen (${refl}×)`);
console.log(`ok – Dungeon-Lauf geschafft, Terminals ${heil}/6, Flächen-Treffer ${hits}, Spiegel 0`);
