// Сборка перед деплоем и wrangler dev (запускается из wrangler.jsonc → build.command):
// страницы на всех языках из src/index.html + src/i18n/<язык>.json, архив скилла,
// llms-full.txt для каждого языка и sitemap.xml со всеми версиями.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';

const SITE = 'https://sufler.artemslizhik.com';
const ORDER = (process.env.SUFLER_LANGS || 'en,ru,es,it,de,fr,ja,zh').split(','); // SUFLER_LANGS=en,ru — собрать часть языков
const L = Object.fromEntries(ORDER.map((c) => [c, JSON.parse(readFileSync(`src/i18n/${c}.json`, 'utf8'))]));

const pathOf = (c) => (c === 'en' ? '/' : `/${c}/`);
const urlOf = (c) => SITE + pathOf(c);
const ogOf = (c) => `${SITE}/og${c === 'en' ? '' : '-' + c}.png`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (s) => String(s).replace(/"/g, '&quot;');
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

// FNV-1a: по нему страница узнаёт нетронутый демо-текст любой языковой версии
const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
};

const template = readFileSync('src/index.html', 'utf8').replace(/<!--\s*Шаблон страницы[\s\S]*?-->\n/, '');

// Метка версии у скриптов и стилей: после деплоя браузер не возьмёт старый файл из кэша
const version = (file) => hash(readFileSync(file, 'utf8')).toString(36);
const assets = Object.fromEntries(['app.js', 'parser.js', 'styles.css'].map((f) => [f, `/${f}?v=${version(`public/${f}`)}`]));

const blocks = {
  redirect: (c) => `  <script>try{var p=localStorage.getItem('sufler.lang');if(p&&p!==${json(c)}&&${json(ORDER)}.indexOf(p)>=0)location.replace(p==='en'?'/':'/'+p+'/')}catch(e){}</script>`,

  head: (c) => {
    const d = L[c], m = d.meta;
    const ld = {
      '@context': 'https://schema.org', '@type': 'WebApplication',
      name: d.brand, alternateName: m.ldAlternateName, url: urlOf(c), image: ogOf(c),
      description: m.ldDescription, applicationCategory: 'MultimediaApplication',
      operatingSystem: m.ldOs, browserRequirements: m.ldBrowser, inLanguage: d.hreflang,
      isAccessibleForFree: true, license: 'https://opensource.org/licenses/MIT', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: m.ldFeatures,
      creator: { '@type': 'Person', name: 'Artem Slizhik', url: 'https://artemslizhik.com/' },
    };
    return [
      `  <title>${esc(m.title)}</title>`,
      `  <meta name="description" content="${esc(m.description)}">`,
      `  <link rel="canonical" href="${urlOf(c)}">`,
      ...ORDER.map((x) => `  <link rel="alternate" hreflang="${L[x].hreflang}" href="${urlOf(x)}">`),
      `  <link rel="alternate" hreflang="x-default" href="${urlOf('en')}">`,
      `  <meta property="og:type" content="website">`,
      `  <meta property="og:site_name" content="${esc(d.brand)}">`,
      `  <meta property="og:locale" content="${d.ogLocale}">`,
      ...ORDER.filter((x) => x !== c).map((x) => `  <meta property="og:locale:alternate" content="${L[x].ogLocale}">`),
      `  <meta property="og:url" content="${urlOf(c)}">`,
      `  <meta property="og:title" content="${esc(m.ogTitle)}">`,
      `  <meta property="og:description" content="${esc(m.ogDescription)}">`,
      `  <meta property="og:image" content="${ogOf(c)}">`,
      `  <meta property="og:image:width" content="1200">`,
      `  <meta property="og:image:height" content="630">`,
      `  <meta property="og:image:alt" content="${esc(m.ogImageAlt)}">`,
      `  <meta name="twitter:card" content="summary_large_image">`,
      `  <meta name="twitter:title" content="${esc(m.ogTitle)}">`,
      `  <meta name="twitter:description" content="${esc(m.twitterDescription)}">`,
      `  <meta name="twitter:image" content="${ogOf(c)}">`,
      `  <script type="application/ld+json">${json(ld)}</script>`,
    ].join('\n');
  },

  langmenu: (c) => `        <div class="lang-menu" id="langMenu">
          <button type="button" class="lang-trigger" id="langTrigger" aria-haspopup="menu" aria-expanded="false" aria-controls="langList" aria-label="${esc(L[c].langLabel)}">
            <svg class="lang-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.7 5.5 3.7 9s-1.3 6.5-3.7 9c-2.4-2.5-3.7-5.5-3.7-9S9.6 5.5 12 3z"/></svg>
            <span>${c.toUpperCase()}</span>
            <svg class="lang-chevron" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>
          </button>
          <div class="lang-list" id="langList" role="menu" aria-labelledby="langTrigger" hidden>
${ORDER.map((x) => `            <a role="menuitemradio" aria-checked="${x === c}" href="${pathOf(x)}" hreflang="${L[x].hreflang}" lang="${L[x].htmlLang}" data-lang="${x}"><span class="lang-name">${esc(L[x].name)}</span><span class="lang-code">${x.toUpperCase()}</span></a>`).join('\n')}
          </div>
        </div>`,

  about: (c) => {
    const a = L[c].about;
    return `      <div class="about-intro">
        <h2>${a.title}</h2>
        <p>${a.intro}</p>
      </div>
      <dl class="about-faq">
${a.faq.map(([q, ans]) => `        <div><dt>${q}</dt><dd>${ans}</dd></div>`).join('\n')}
      </dl>
      <p class="about-meta">${a.meta}</p>`;
  },

  prompt: (c) => `          <pre id="promptText">${esc(L[c].prompt)}</pre>`,

  i18n: (c) => `  <script>window.SUFLER_I18N = ${json({ ...L[c].js, demo: L[c].demo, promptPlaceholder: L[c].promptPlaceholder, demoHashes: ORDER.map((x) => hash(L[x].demo)) })};</script>`,
};

function render(c) {
  const d = L[c];
  const missing = [];
  let html = template
    .replace(/\{\{#(\w+)\}\}\n?([\s\S]*?)\{\{\/\1\}\}\n?/g, (_, l, body) => (l === c ? body : ''))
    .replace(/\{\{(?![@=#/])([^{}\n]+?)\}\}/g, (_, en) => {
      if (c === 'en') return attr(en);
      const t = d.strings[en];
      if (t == null) missing.push(en);
      return attr(t ?? en);
    })
    .replace(/\{\{=(\w+)\}\}/g, (_, k) => esc(d[k]))
    .replace(/\{\{@lang\}\}/g, d.htmlLang)
    .replace(/(src|href)="\/(app\.js|parser\.js|styles\.css)"/g, (_, at, f) => `${at}="${assets[f]}"`)
    .replace(/\n[ \t]*<!--[\s\S]*?-->/g, '');
  if (missing.length) throw new Error(`Нет перевода (${c}):\n  ${missing.join('\n  ')}`);
  const left = html.match(/\{\{(?!@(redirect|head|langmenu|about|prompt|i18n)\}\})[^\n]{0,60}/);
  if (left) throw new Error(`В шаблоне остался неразобранный фрагмент (${c}): ${left[0]}`);
  // Сгенерированные блоки подставляем последними: в них могут быть фигурные скобки
  for (const [name, fn] of Object.entries(blocks)) html = html.replace(`{{@${name}}}`, () => fn(c));
  return html;
}

// ——— Страницы ———
for (const c of ORDER) {
  const file = c === 'en' ? 'public/index.html' : `public/${c}/index.html`;
  mkdirSync(file.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(file, render(c));
}

// ——— Архив скилла ———
rmSync('public/sufler-markup.zip', { force: true });
execSync("zip -qr -X ../public/sufler-markup.zip sufler-markup -x '*.DS_Store'", { cwd: 'skill', stdio: 'inherit' });

// ——— llms-full.txt: полный промпт разметки на каждом языке ———
for (const c of ORDER) {
  const d = L[c];
  const others = ORDER.filter((x) => x !== c).map((x) => `- ${L[x].name}: ${SITE}${pathOf(x)}llms-full.txt`).join('\n');
  writeFileSync(c === 'en' ? 'public/llms-full.txt' : `public/${c}/llms-full.txt`, `# ${d.brand} — ${d.llms.title}

> ${d.llms.intro.replace('{url}', urlOf(c))}

${SITE}/llms.txt
${SITE}/sufler-markup.zip

${others}

## ${d.llms.promptHeading}

${d.prompt}
`);
}

// ——— sitemap.xml со всеми языковыми версиями ———
const today = new Date().toISOString().slice(0, 10);
const alternates = [
  ...ORDER.map((x) => `    <xhtml:link rel="alternate" hreflang="${L[x].hreflang}" href="${urlOf(x)}"/>`),
  `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlOf('en')}"/>`,
].join('\n');
writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${ORDER.map((c) => `  <url>
    <loc>${urlOf(c)}</loc>
    <lastmod>${today}</lastmod>
${alternates}
  </url>`).join('\n')}
</urlset>
`);

console.log(`build: ${ORDER.length} languages, sufler-markup.zip, llms-full.txt, sitemap.xml`);
