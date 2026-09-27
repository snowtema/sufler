// Сборка перед деплоем и wrangler dev (запускается из wrangler.jsonc → build.command):
// страницы на двух языках из src/index.html, архив скилла, llms-full.txt и sitemap.xml.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';

const SITE = 'https://sufler.artemslizhik.com';
const LANGS = { en: { path: '/', file: 'public/index.html' }, ru: { path: '/ru/', file: 'public/ru/index.html' } };

// ——— Страницы ———
// {{English||Русский}} — в одну строку, {{#en}}…{{/en}} и {{#ru}}…{{/ru}} — блоки, {{@lang}} — код языка
const template = readFileSync('src/index.html', 'utf8').replace(/<!--\s*Шаблон страницы[\s\S]*?-->\n/, '');

function render(lang) {
  const html = template
    .replace(/\{\{#(en|ru)\}\}\n?([\s\S]*?)\{\{\/\1\}\}\n?/g, (_, l, body) => (l === lang ? body : ''))
    .replace(/\{\{([^{}\n]*?)\|\|([^{}\n]*?)\}\}/g, (_, en, ru) => (lang === 'en' ? en : ru))
    .replace(/\{\{@lang\}\}/g, lang)
    .replace(/\n[ \t]*<!--[\s\S]*?-->/g, ''); // служебные комментарии в готовую страницу не попадают
  const left = html.match(/\{\{[^\n]{0,60}/);
  if (left) throw new Error(`В шаблоне остался неразобранный фрагмент (${lang}): ${left[0]}`);
  return html;
}

const pages = {};
for (const [lang, { file }] of Object.entries(LANGS)) {
  pages[lang] = render(lang);
  mkdirSync(file.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(file, pages[lang]);
}

// ——— Архив скилла ———
rmSync('public/sufler-markup.zip', { force: true });
execSync("zip -qr -X ../public/sufler-markup.zip sufler-markup -x '*.DS_Store'", { cwd: 'skill', stdio: 'inherit' });

// ——— llms-full.txt: промпт живёт в одном месте — в окне «Разметить автоматически» ———
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const prompt = (lang) => {
  const m = pages[lang].match(/<pre id="promptText">([\s\S]*?)<\/pre>/);
  if (!m) throw new Error(`Не найден <pre id="promptText"> (${lang})`);
  return decode(m[1]).trim();
};

writeFileSync('public/llms-full.txt', `# Sufler — full markup reference

> Sufler (${SITE}) is a free online teleprompter for recording video: it shows your script one word at a time right under the camera, and the pace is controlled by markup inside the text. Below is the full prompt any AI assistant can use to mark up a speech for Sufler. Paste the marked-up text into the editor at ${SITE}.

Site summary: ${SITE}/llms.txt
Russian version: ${SITE}/ru/ (prompt in Russian: ${SITE}/ru/llms-full.txt)
Claude skill with result checking: ${SITE}/sufler-markup.zip

## Markup prompt

${prompt('en')}
`);

writeFileSync('public/ru/llms-full.txt', `# Суфлёр — полная справка по разметке

> Суфлёр (${SITE}/ru/) — бесплатный онлайн-телесуфлёр для записи видео: показывает текст по одному слову прямо под камерой, а темп задаётся разметкой внутри текста. Ниже — полный промпт, по которому любая нейросеть размечает текст выступления для Суфлёра. Размеченный текст вставляют в редактор на ${SITE}/ru/.

Краткое описание сайта (на английском): ${SITE}/llms.txt
Скилл для Claude с проверкой результата: ${SITE}/sufler-markup.zip

## Промпт для разметки

${prompt('ru')}
`);

// ——— sitemap.xml с языковыми версиями ———
const today = new Date().toISOString().slice(0, 10);
const alternates = [
  ...Object.entries(LANGS).map(([lang, { path }]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${SITE}${path}"/>`),
  `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`,
].join('\n');
writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${Object.values(LANGS).map(({ path }) => `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${today}</lastmod>
${alternates}
  </url>`).join('\n')}
</urlset>
`);

console.log('build: index.html (en), ru/index.html, sufler-markup.zip, llms-full.txt, ru/llms-full.txt, sitemap.xml');
