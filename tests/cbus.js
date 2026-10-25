// Gruppenkanal für Tests: verpackt selbst gebaute Fenster-Nachrichten im CDigi-Protokoll (cdigi/1) – das Skript
// verwirft Nachrichten ohne Hülle, Sitzung, Folgenummer und Zeitstempel.
//   const bus = require('./cbus')();      // Leader = Slot 0
//   bus.postMessage({ type: 'state', slot: 1, ... });
const { BroadcastChannel } = require('worker_threads');
module.exports = function cdigiBus(leader = 0) {
  const ch = new BroadcastChannel('cdigi-group-v1');
  const sessions = new Map();
  let seq = 0;
  const post = ch.postMessage.bind(ch);
  ch.postMessage = (m) => {
    if (!m || typeof m !== 'object') return post(m);
    const slot = Number.isInteger(m.slot) ? m.slot : leader;
    if (!sessions.has(slot)) sessions.set(slot, `test-${slot}-${Math.random().toString(36).slice(2)}`);
    const msg = { ...m, slot, protocol: 'cdigi/1', leader, session: sessions.get(slot), seq: ++seq, sentAt: Date.now() };
    if (msg.type === 'state') {
      if (typeof msg.inWorld !== 'boolean') msg.inWorld = true;
      if (!Array.isArray(msg.ents)) msg.ents = [];
    }
    return post(msg);
  };
  return ch;
};
