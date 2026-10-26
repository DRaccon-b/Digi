// Gruppenkanal für Tests: Nachrichten nachgebauter Gruppenfenster im Format des Bots verschicken
// (Kanal …-v1, protocol/session/seq/sentAt/leader), damit die nachgebauten Gruppenfenster verstanden werden.
const { BroadcastChannel } = require('worker_threads');
module.exports = function shim(name, leader = 0) {
  const ch = new BroadcastChannel(`${name}-v1`);
  const session = `test-${Math.random().toString(36).slice(2)}`;
  let seq = 0;
  return {
    postMessage(m) { ch.postMessage({ ...m, protocol: 'digibot/1', leader, session, seq: ++seq, sentAt: Date.now() }); },
    set onmessage(fn) { ch.onmessage = fn; },
    get onmessage() { return ch.onmessage; },
    addEventListener: (...a) => ch.addEventListener(...a),
    close: () => ch.close(),
    unref: () => ch.unref?.(),
  };
};
