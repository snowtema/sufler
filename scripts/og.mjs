// OG-картинки для всех языков из src/i18n/<язык>.json и scripts/og-template.html.
// Нужен установленный Google Chrome. Запуск: node scripts/og.mjs [en ru ...]
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['en', 'ru', 'es', 'it', 'de', 'fr', 'ja', 'zh'];
const template = readFileSync('scripts/og-template.html', 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

for (const c of langs) {
  const d = JSON.parse(readFileSync(`src/i18n/${c}.json`, 'utf8'));
  const [pre, pivot, post] = d.og.word;
  const html = template
    .replace('{{lang}}', d.htmlLang).replace('{{brand}}', esc(d.brand))
    .replace('{{headline}}', esc(d.og.headline)).replace('{{sub}}', esc(d.og.sub)).replace('{{cue}}', esc(d.og.cue))
    .replace('{{pre}}', esc(pre)).replace('{{pivot}}', esc(pivot)).replace('{{post}}', esc(post));
  const dir = mkdtempSync(join(tmpdir(), 'sufler-og-'));
  const page = join(dir, 'og.html');
  writeFileSync(page, html);
  const out = resolve(`public/og${c === 'en' ? '' : '-' + c}.png`);
  // Headless Chrome иногда не закрывается сам после скриншота — ограничиваем по времени
  spawnSync(CHROME, ['--headless=new', `--user-data-dir=${join(dir, 'profile')}`, '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=1200,630', '--virtual-time-budget=8000', `--screenshot=${out}`, `file://${page}`], { timeout: 30000, stdio: 'ignore' });
  rmSync(dir, { recursive: true, force: true });
  console.log(`og: ${out}`);
}
