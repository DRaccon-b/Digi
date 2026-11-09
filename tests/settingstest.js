// 3.2.0: neue Panel-Struktur.
// A: Reiter – kein „Food“-Reiter und keine Betriebsart Quest-Jagd mehr, dafür ⚙️ Einstellungen; alter gespeicherter Reiter
//    „food“ öffnet Einstellungen → Food. Skills (Rollen) liegen im Reiter Attacke, nicht mehr unter Digimon.
// B: Style – Preset „Hell“ setzt die CSS-Variablen am Panel und wird gespeichert; eine Einzelfarbe macht daraus „eigene“.
// C: Stopp-Bedingung „Level“ – Bot stoppt mit Grund in der Statuszeile.
// D: alte Einstellungen – feste Digitation (apEvo) wird zur Form „ohne Dark Tower“ der Map-Regel; levelEvo:false = keine.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
async function world(cfg) {
  const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, ...cfg }));
  G.w.eval(script);
  await wait(900);
  return G;
}
const saved = (G) => JSON.parse(G.w.localStorage.getItem('digibot.cfg') || '{}');
(async () => {
  {
    const G = await world({ tab: 'food' }), d = G.w.document;
    const tabs = [...d.querySelectorAll('[data-tab]')].map((b) => b.dataset.tab).join(',');
    check('A: Reiter ohne Food, mit Einstellungen', tabs === 'data,mon,attack,quest,farm,acc,set,log', tabs);
    check('A: keine Betriebsart Quest-Jagd', !d.querySelector('[data-mode="quest"]') && [...d.querySelectorAll('[data-mode]')].length === 6);
    check('A: alter Reiter „food“ → Einstellungen / Food', d.querySelector('[data-page="set"]').classList.contains('on') && d.querySelector('[data-spage="food"]').classList.contains('on') && !!d.querySelector('[data-spage="food"] [data-apsel="foodHp"]'));
    check('A: Skills im Reiter Attacke', !!d.querySelector('[data-page="attack"] [data-rolecfg="2"]') && !d.querySelector('[data-page="mon"] [data-rolecfg]'));
    check('A: Digitation je Map im Reiter Digimon', !!d.querySelector('[data-page="mon"] [data-apsel="levelEvoForm"]') && !d.querySelector('[data-apsel="apEvo"]') && !d.querySelector('[data-apflag="apMapEvo"]') && !d.querySelector('[data-apflag="levelEvo"]'));
    const subs = [...d.querySelectorAll('[data-stab]')].map((b) => b.dataset.stab).join(',');
    check('A: Unterreiter Food, Adds, Ausweichen, Warnung, Zeiten, Events, Style', subs === 'food,adds,dodge,alerts,times,events,style', subs); // Adds seit 3.2.16
    d.querySelector('[data-stab="alerts"]').click(); await wait(100);
    check('A: Unterreiter umschalten', d.querySelector('[data-spage="alerts"]').classList.contains('on') && !d.querySelector('[data-spage="food"]').classList.contains('on') && saved(G).stab === 'alerts');
    // B
    d.querySelector('[data-stab="style"]').click();
    d.querySelector('[data-stylepreset="light"]').click(); await wait(100);
    const pnl = d.querySelector('.digibot');
    check('B: Preset „Hell“ setzt Farben', pnl.style.getPropertyValue('--db-bg') === '#eef1f8' && saved(G).stylePreset === 'light' && saved(G).style.text === '#1b2033', pnl.style.getPropertyValue('--db-bg'));
    const inp = d.querySelector('[data-style="accent"]'); inp.value = '#ff00aa'; inp.dispatchEvent(new G.w.Event('input', { bubbles: true })); await wait(100);
    check('B: Einzelfarbe gespeichert, Preset „eigene“', saved(G).style.accent === '#ff00aa' && saved(G).stylePreset === 'custom' && pnl.style.getPropertyValue('--db-accent') === '#ff00aa');
    G.w.close();
  }
  {
    const G0 = await world({});
    const lvl = G0.store.getState().me.partner.level; G0.w.close();
    const G = await world({ stopLevel: lvl, tab: 'log' });
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(1200);
    const off = /Start/.test(G.w.document.querySelector('[data-act="bot"]').textContent);
    check('C: Stopp-Bedingung Level stoppt den Bot', off && /Stopp-Bedingung: Level/.test(G.status()), G.status());
    G.w.close();
  }
  {
    // echte alte Einstellungen enthalten die Map-Formen schon (seit 2.49 gespeichert) – die Übernahme muss trotzdem greifen
    const G = await world({ apEvo: 'garurumon', apMapEvo: false, levelEvo: true, levelEvoForm: '__max', levelEvoDark: '__armor', tab: 'mon' });
    const s = saved(G);
    const G2 = await world({ levelEvo: false, apEvo: '', apMapEvo: true, levelEvoForm: '__max', levelEvoDark: '__armor' });
    const s2 = saved(G2);
    check('D: alte feste Digitation → Form ohne Dark Tower', s.levelEvoForm === 'garurumon' && !('apEvo' in s) && !('apMapEvo' in s), JSON.stringify([s.levelEvoForm, s.apEvo]));
    check('D: levelEvo:false → keine Digitation', s2.levelEvoForm === '' && s2.levelEvoDark === '' && !('levelEvo' in s2), JSON.stringify([s2.levelEvoForm, s2.levelEvoDark]));
    G.w.close(); G2.w.close();
  }
  console.log(results.every(Boolean) ? 'OK – Panel-Struktur 3.2.0' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
