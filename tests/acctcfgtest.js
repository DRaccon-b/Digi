// 3.2.6 (Nutzer 03.11.: zwei Fenster, eins questet mit einem Digimon, gibt mit einem anderen ab – das andere Fenster überschrieb
// die Wahl). Einstellungen, die sich auf die Digimon eines Accounts beziehen (Quest-/Abgabe-Digimon, Digitation je Map,
// Karten-Digitation), gelten je Account; alles andere bleibt gemeinsam.
// A: Fenster von Account a mit eigener Wahl; ein anderes Fenster (Account b) speichert seine Einstellungen -> a behält Quest-/
//    Abgabe-Digimon und Digitation, übernimmt aber die gemeinsame Trank-Schwelle.
// B: die Wahl von a liegt je Account gespeichert vor (digibot.acct.a).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const G = makeWorld({ slot: 0, tag: 'A', noHash: true, accounts: { leader: 0, list: [{ user: 'a' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] } } });
  const mine = { autopilot: false, hpPot: 30, dsPot: 0, tdsPot: 0, tab: 'mon', apQuestPartner: 'qa', apTurninPartner: 'ta', levelEvoForm: 'garurumon', levelEvoDark: '', cardForm: 'garurumon' };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify(mine));
  G.w.eval(script);
  await wait(1500);
  // anderes Fenster (Account b) speichert
  const other = { ...mine, hpPot: 55, apQuestPartner: 'qb', apTurninPartner: 'tb', levelEvoForm: 'agumon', cardForm: 'agumon' };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify(other));
  G.w.dispatchEvent(new G.w.StorageEvent('storage', { key: 'digibot.cfg', newValue: JSON.stringify(other) }));
  await wait(800);
  const D = G.w.document, val = (k) => D.querySelector(`[data-apsel="${k}"]`)?.value;
  const hp = D.querySelector('input[data-cfg="hpPot"]')?.value;
  const r = { q: val('apQuestPartner'), t: val('apTurninPartner'), evo: val('levelEvoForm'), hp, acct: JSON.parse(G.w.localStorage.getItem('digibot.acct.a') || 'null') };
  G.w.close();
  console.log(JSON.stringify(r));
  const okA = r.q === 'qa' && r.t === 'ta' && r.evo === 'garurumon' && String(r.hp) === '55';
  const okB = r.acct?.apQuestPartner === 'qa' && r.acct?.apTurninPartner === 'ta' && r.acct?.cardForm === 'garurumon';
  console.log(okA ? 'OK     A: eigenes Quest-/Abgabe-Digimon und Digitation bleiben, gemeinsame Werte kommen an' : 'FEHLER A ' + JSON.stringify(r));
  console.log(okB ? 'OK     B: Wahl je Account gespeichert' : 'FEHLER B ' + JSON.stringify(r.acct));
  process.exit(okA && okB ? 0 : 1);
})();
