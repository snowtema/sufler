# Sufler

**English** | [Русский](README.ru.md)

A web teleprompter for recording video: [sufler.artemslizhik.com](https://sufler.artemslizhik.com). Your script is shown one word at a time in a single spot right under the camera, so your eyes don't wander across lines. Pace, pauses and emphasis are set with markup inside the text.

Everything runs in the browser: no server, no sign-up, no bundler. Plain HTML, CSS and JavaScript with zero dependencies. Open source under the [MIT](LICENSE) license.

## Features

- One word at a time in a fixed spot: speed in words per minute, adjustable block width, font size and position.
- Inline markup for pauses, emphasis, slower or faster passages, stops, stage cues and sections. Markup can be added automatically with a Claude skill or a prompt for any AI assistant.
- Local video recording in the browser: MP4 or WebM, up to 4K, 24/30/60 fps, with an option to see yourself behind the text. Takes survive a page reload.
- A mobile mode that works like an app, not a shrunken desktop page.
- Eight interface languages, with word segmentation for Japanese and Chinese.

## Running locally

All language versions are built from one template, `src/index.html`, so run the build before serving:

```bash
node scripts/build.mjs && python3 -m http.server 5173 -d public
# or the same way as in production (the build runs automatically):
npx wrangler dev
```

## Languages

Eight languages: English at the root (`/`), Russian (`/ru/`), Spanish (`/es/`), Italian (`/it/`), German (`/de/`), French (`/fr/`), Japanese (`/ja/`) and Chinese (`/zh/`). Every page is built from the `src/index.html` template and the `src/i18n/<lang>.json` dictionaries:

- `{{English text}}` in the template is an interface string; its translation comes from the dictionary's `strings` (the key is the English text);
- `{{@head}}`, `{{@langmenu}}`, `{{@about}}`, `{{@prompt}}`, `{{@i18n}}` are blocks that `scripts/build.mjs` generates from the dictionary: meta tags and JSON-LD, the language menu, the “What is Sufler” section with an FAQ, the AI prompt, and strings for JS;
- each dictionary also holds the demo text, the prompt, JS strings (plurals via `Intl.PluralRules`) and the OG image text.

The build fails if a language is missing a string. To build only some languages: `SUFLER_LANGS=en,ru node scripts/build.mjs`. The language switcher in the header remembers the choice.

Japanese and Chinese are written without spaces, so the parser splits them into words with `Intl.Segmenter` and understands their punctuation; slashes and tags can be written without spaces there.

## Markup

| Markup | What it does |
|---|---|
| `/` `//` `///` | Short, medium and long pause |
| `[PAUSE 2.5]` | Pause in seconds |
| `[STOP]` | Stop until Space is pressed |
| `*word*` | Emphasis |
| `[SLOW]…[/SLOW]`, `[FAST]…[/FAST]` | A slower or faster passage |
| `[any text]` | A cue above the word, not read aloud |
| `# Heading` | A section for jumping between takes |

Punctuation and blank lines add pauses automatically.

## Phones and tablets

On touch devices without a mouse (`hover: none`, `pointer: coarse`), Sufler works like an app rather than a shrunken desktop page:

- the script takes the full screen; markup chips scroll and stick to the keyboard while typing, next to “Paste” and “Done”;
- a fixed bottom bar holds the record button and “Start reading” with a chevron (its menu opens as a bottom sheet);
- settings live in a bottom sheet that closes with a swipe down;
- while reading, tap to pause; the pause screen has large buttons and steppers for speed and font size; the X button and the system “back” close the reader; no keyboard hints;
- recording works with the front or back camera; held upright, the video is vertical; “Save” opens the system share sheet.

To force the mobile mode on or off for debugging: `?device=mobile` or `?device=desktop`.

## Video recording

Turn on “Record video from camera” in the settings, and Sufler records the camera and microphone right in the browser (getUserMedia + MediaRecorder). Nothing is uploaded: finished takes are saved to your device.

- Each reading run is a separate take. Recording starts with the countdown and lasts until you leave the reader (Esc); pausing the reading doesn't pause the recording, and R starts a new take. The “Pause recording when reading pauses” setting changes that; in this mode, after the end of the text, recording pauses 2 seconds later so the last word isn't cut off.
- “See yourself behind the text” shows the camera behind the words like a mirror. The file contains the clean camera image, without the text.
- MP4 if the browser supports it, otherwise WebM. In Pro mode: 720p, 1080p or 4K and 24, 30 or 60 fps. If the camera can't do the chosen frame rate at this resolution, it lowers the resolution, and the settings say so.
- Takes are written to browser storage (OPFS) during recording in ~5-second segments: they don't pile up in the tab's memory, they survive a reload, and if the tab crashes mid-take, the take is restored and marked “recovered” (at most the last few seconds are lost). Without OPFS, takes live only in the open tab, and the browser warns before closing it.
- If the camera is unplugged or taken by another app, reading pauses and what was recorded is kept. If the selected camera disappears, Sufler switches to the default one and says so in the settings.

## SEO and GEO

- `src/index.html`: title, description, canonical, `hreflang` for every language, Open Graph and Twitter, JSON-LD `WebApplication`, and a “What is Sufler” section with short answers (the text is in the HTML itself, so crawlers see it without JavaScript).
- `public/robots.txt`: open to everyone, with AI search and assistants explicitly allowed.
- `public/llms.txt`: a description for AI assistants following the llms.txt standard.
- `llms-full.txt` (and `/<lang>/llms-full.txt`) and `sitemap.xml` are generated at deploy time (`scripts/build.mjs`): the full reference with the prompt in every language; the sitemap lists every version with `hreflang` and the build date.
- `public/og.png`, `public/og-<lang>.png`: link preview images for each language. The template is `scripts/og-template.html`, the text is in the dictionary's `og` field. To re-render (requires Google Chrome): `node scripts/og.mjs` or `node scripts/og.mjs ja zh`.

## Files

- `src/index.html` and `src/i18n/*.json`: the page template and the eight dictionaries (built into `public/index.html` and `public/<lang>/index.html`)
- `public/parser.js`: parses markup into a sequence of frames and calculates the duration
- `public/app.js`: the editor, settings, reader and recording
- `public/styles.css`: styles
- `wrangler.jsonc`: Cloudflare Workers config (static assets and the domain)

## Deploy

Every push to `main` deploys the site to Cloudflare via GitHub Actions (`.github/workflows/deploy.yml`). It needs a `CLOUDFLARE_API_TOKEN` repository secret: a token from the “Edit Cloudflare Workers” template with access to the site's zone.

To deploy your own copy, change `account_id` and the domain in `routes` in `wrangler.jsonc`, and the site address `SITE` in `scripts/build.mjs`. The site is plain static files from `public/`, so any other hosting works too: run `node scripts/build.mjs` and upload the `public/` folder.

Manually:

```bash
npx wrangler deploy
```

## Claude Code skill

`skill/sufler-markup/` contains a skill that marks up a speech on its own: it decides where to pause, where to slow down or speed up, what to emphasize, where to put a stop, and how to split the speech into sections. It never changes the author's words and checks the result with `scripts/check.js`. The skill's instructions are in Russian; it answers in the user's language.

The downloadable archive is on the site: [sufler-markup.zip](https://sufler.artemslizhik.com/sufler-markup.zip). It is built from `skill/` on every deploy (`build` in `wrangler.jsonc`), and the “Mark up automatically” dialog has installation instructions.

Installing from the repository:

```bash
cp -R skill/sufler-markup ~/.claude/skills/
```

For those who don't want to install the skill, the same dialog has a prompt for any AI assistant (ChatGPT, Gemini, Claude): the markup rules plus a place for your speech, copied with one click, optionally with the text from the editor already inserted. The prompt lives in the `src/i18n/<lang>.json` dictionaries (the `prompt` field) and repeats the skill's rules in condensed form. If you change the syntax or the rules, update both.

The check script uses its own copy of `parser.js`. After syntax changes, update it and reinstall the skill:

```bash
cp public/parser.js skill/sufler-markup/scripts/parser.js
cp -R skill/sufler-markup ~/.claude/skills/
```

## License

[MIT](LICENSE): you can use, modify and distribute it, including in commercial projects, as long as you keep the copyright notice.
