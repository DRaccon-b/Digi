// Presets: 💾 speichert die Bot-Einstellungen als .txt (ohne Accounts/Passwörter, ohne Panel-Ansicht),
// 📂 lädt sie wieder – fremde Schlüssel wie „pass“ werden dabei verworfen, Accounts bleiben unverändert.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window; w.HTMLCanvasElement.prototype.getContext = () => null;
const acc = JSON.stringify({ leader: 0, list: [{ on: true, user: 'geheimuser', char: 'Fumiko', at: 0 }] });
w.localStorage.setItem('digibot.accounts', acc);
w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 55, tab: 'log', autopilot: true }));
let blob = null;
w.URL.createObjectURL = (b) => { blob = b; return 'blob:x'; };
w.URL.revokeObjectURL = () => {};
w.prompt = () => 'Mein Test';
w.eval(fake); w.eval(script);
setTimeout(async () => {
  const p = w.document.querySelector('.digibot');
  p.querySelector('[data-act="preset-save"]').click();
  const text = blob ? await new Promise((res) => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.readAsText(blob); }) : '';
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  const r = {
    saved: json.settings?.hpPot === 55 && json.settings?.autopilot === true && json.name === 'Mein Test',
    noSecrets: !/geheimuser|pass/i.test(text),
    noUi: !('tab' in json.settings) && !('open' in json.settings),
  };
  json.settings.hpPot = 70; json.settings.pass = 'x'; json.settings.tab = 'data'; json.settings.unbekannt = 1;
  const modified = 'DigiBot-Preset\nName: Mein Test\n\n' + JSON.stringify(json);
  w.HTMLInputElement.prototype.click = function () {
    if (this.type !== 'file') return;
    Object.defineProperty(this, 'files', { value: [{ text: async () => modified }] });
    this.dispatchEvent(new w.Event('change'));
  };
  p.querySelector('[data-act="preset-load"]').click();
  await new Promise((res) => setTimeout(res, 100));
  const cfg = JSON.parse(w.localStorage.getItem('digibot.cfg'));
  r.loaded = cfg.hpPot === 70;
  r.keptUi = cfg.tab === 'log';
  r.dropped = !('pass' in cfg) && !('unbekannt' in cfg);
  r.accounts = JSON.parse(w.localStorage.getItem('digibot.accounts')).list[0].user === 'geheimuser';
  w.HTMLInputElement.prototype.click = function () { if (this.type === 'file') { Object.defineProperty(this, 'files', { value: [{ text: async () => 'kaputt' }] }); this.dispatchEvent(new w.Event('change')); } };
  p.querySelector('[data-act="preset-load"]').click();
  await new Promise((res) => setTimeout(res, 100));
  r.badKept = JSON.parse(w.localStorage.getItem('digibot.cfg')).hpPot === 70;
  console.log(r);
  const ok = Object.values(r).every(Boolean);
  console.log(ok ? 'OK – Presets speichern/laden ohne Zugangsdaten' : 'FEHLER'); process.exit(ok ? 0 : 1);
}, 700);
