// Сборка перед деплоем и wrangler dev (запускается из wrangler.jsonc → build.command):
// архив скилла, llms-full.txt из промпта в index.html и sitemap.xml с датой сборки.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const SITE = 'https://sufler.artemslizhik.com';

rmSync('public/sufler-markup.zip', { force: true });
execSync("zip -qr -X ../public/sufler-markup.zip sufler-markup -x '*.DS_Store'", { cwd: 'skill', stdio: 'inherit' });

// Промпт живёт в одном месте — в окне «Разметить автоматически»
const html = readFileSync('public/index.html', 'utf8');
const match = html.match(/<pre id="promptText">([\s\S]*?)<\/pre>/);
if (!match) throw new Error('В public/index.html не найден <pre id="promptText">');
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

writeFileSync('public/llms-full.txt', `# Суфлёр — полная справка по разметке

> Суфлёр (${SITE}) — бесплатный онлайн-телесуфлёр для записи видео: показывает текст по одному слову прямо под камерой, а темп задаётся разметкой внутри текста. Ниже — полный промпт, по которому любая нейросеть размечает текст выступления для Суфлёра. Размеченный текст вставляют в редактор на ${SITE}.

Краткое описание сайта: ${SITE}/llms.txt
Скилл для Claude с проверкой результата: ${SITE}/sufler-markup.zip

## Промпт для разметки

${decode(match[1]).trim()}
`);

const today = new Date().toISOString().slice(0, 10);
writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${today}</lastmod>
  </url>
</urlset>
`);

console.log('build: sufler-markup.zip, llms-full.txt, sitemap.xml');
