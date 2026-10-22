#!/usr/bin/env node
// Testlauf: alle Tests in diesem Ordner parallel gegen ../digibot.user.js (nachgebaute Spielwelten mit jsdom).
//   node tests/run.js              alle Tests
//   node tests/run.js kohtest ...  nur diese
// Umgebung: JOBS (gleichzeitige Tests, Standard 8), TIMEOUT (Sekunden pro Test, Standard 200), V=1 (Ausgabe zeigen)
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dir = __dirname;
const script = path.resolve(dir, '..', 'digibot.user.js');
const helpers = new Set(['run.js', 'gw.js', 'fakeworld.js']);
const wanted = process.argv.slice(2);
const all = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !helpers.has(f)).map((f) => f.slice(0, -3)).sort();
const tests = wanted.length ? wanted : all;
const jobs = Number(process.env.JOBS) || Math.max(2, Math.min(8, os.cpus().length));
const timeoutMs = (Number(process.env.TIMEOUT) || 200) * 1000;

function runOne(name) {
  return new Promise((resolve) => {
    const file = path.join(dir, `${name}.js`);
    if (!fs.existsSync(file)) return resolve({ name, ok: false, secs: 0, out: 'Datei fehlt' });
    // ältere Tests bekommen zusätzlich die Spielwelt fakeworld.js als zweites Argument
    const args = [file, script];
    if (fs.readFileSync(file, 'utf8').includes('slice(2).map')) args.push(path.join(dir, 'fakeworld.js'));
    const t0 = Date.now();
    const child = spawn(process.execPath, args, { cwd: dir });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { out += `\n… Zeitlimit (${timeoutMs / 1000} s) überschritten`; child.kill(); }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ name, ok: code === 0, secs: Math.round((Date.now() - t0) / 1000), out });
    });
  });
}

(async () => {
  const queue = [...tests], results = [];
  const t0 = Date.now();
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (queue.length) {
      const r = await runOne(queue.shift());
      results.push(r);
      process.stdout.write(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name} (${r.secs} s)\n`);
      if (process.env.V) process.stdout.write(r.out + '\n');
    }
  }));
  const failed = results.filter((r) => !r.ok);
  for (const r of failed) {
    console.log(`\n--- ${r.name} ---`);
    console.log(r.out.trim().split('\n').filter((l) => !/^\s*[>*] /.test(l)).slice(-12).join('\n'));
  }
  console.log(`\n${results.length - failed.length}/${results.length} grün in ${Math.round((Date.now() - t0) / 1000)} s`);
  process.exit(failed.length ? 1 : 0);
})();
