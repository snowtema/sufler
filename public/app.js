(function () {
  'use strict';

  const P = window.Sufler;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const STORE = 'sufler.v1';

  // ——— Язык интерфейса: берётся из <html lang>, страницы собираются из src/index.html ———
  const LANG = document.documentElement.lang === 'ru' ? 'ru' : 'en';
  const ruPlural = (n, forms) => {
    const a = n % 10, b = n % 100;
    return forms[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 1 : 2];
  };
  const I18N = {
    en: {
      words: (n) => `${n} ${n === 1 ? 'word' : 'words'}`,
      stops: (n) => `, plus ${n} ${n === 1 ? 'stop' : 'stops'}`,
      dur: (m, s) => (m ? `${m} min ${s} s` : `${s} s`),
      stats: (dur, words, stops) => `About <b>${dur}</b>, ${words}${stops}`,
      durationNote: (words, wpm, stops) => `${words} at ${wpm} wpm${stops}`,
      addText: 'Add text to start',
      noText: 'No text yet',
      wpm: (v) => `${v} wpm`,
      decimal: '.',
      wrapPlaceholder: 'text',
      sectionPlaceholder: 'Section',
      sampleWord: 'Sufler',
      previewPlay: 'Check pace',
      previewStop: 'Stop',
      statusEnd: 'The end',
      statusStop: 'Stop. Press Space to continue',
      hudWhere: (n, total, left, wpm) => `<span>Word ${n} of ${total}</span>&emsp;<span>${left} left</span>&emsp;<span>${wpm} wpm</span>`,
      again: 'Play again ',
      cont: 'Continue ',
      camFailed: (msg) => `Camera unavailable, reading without recording: ${msg}`,
      toastSpeed: (v) => `Speed ${v} words per minute`,
      toastFont: (v) => `Font ${v} px`,
      toastWidth: (v) => `Width ${v} px`,
      toastPos: (x, y) => `Position ${x} % × ${y} %`,
      mirrorOn: 'Mirrored',
      mirrorOff: 'Not mirrored',
      recErr: { NotAllowedError: 'camera access is blocked in the browser settings', NotFoundError: 'no camera or microphone found', NotReadableError: 'the camera is busy in another app', unknown: 'unknown error' },
      camError: (msg) => `Couldn’t turn on the camera: ${msg}.`,
      camera: 'Camera',
      microphone: 'Microphone',
      recStatus: (paused, t) => `${paused ? 'Recording paused' : 'Recording'}, ${t}`,
      camOn: 'Turn camera off',
      camOff: 'Turn camera on',
      kb: 'KB',
      mb: 'MB',
      downloaded: ', downloaded',
      takesBtn: (n) => (n ? `Takes: ${n}` : 'No takes yet'),
      takesEmpty: 'Nothing here yet. Turn on recording and start reading.',
      take: (n) => `Take ${n}`,
      download: 'Download',
      del: 'Delete',
      confirmDel: 'Delete for good?',
      noRecorder: 'This browser can’t record video',
      promptPlaceholder: 'PASTE YOUR SPEECH HERE',
      copied: 'Copied',
      copyFailed: 'Couldn’t copy',
    },
    ru: {
      words: (n) => `${n} ${ruPlural(n, ['слово', 'слова', 'слов'])}`,
      stops: (n) => `, плюс ${n} ${ruPlural(n, ['остановка', 'остановки', 'остановок'])}`,
      dur: (m, s) => (m ? `${m} мин ${s} с` : `${s} с`),
      stats: (dur, words, stops) => `Около <b>${dur}</b>, ${words}${stops}`,
      durationNote: (words, wpm, stops) => `${words} при ${wpm} сл/мин${stops}`,
      addText: 'Добавьте текст, чтобы начать',
      noText: 'Текста пока нет',
      wpm: (v) => `${v} сл/мин`,
      decimal: ',',
      wrapPlaceholder: 'текст',
      sectionPlaceholder: 'Раздел',
      sampleWord: 'Суфлёр',
      previewPlay: 'Проверить темп',
      previewStop: 'Стоп',
      statusEnd: 'Конец',
      statusStop: 'Стоп. Пробел — дальше',
      hudWhere: (n, total, left, wpm) => `<span>Слово ${n} из ${total}</span>&emsp;<span>осталось ${left}</span>&emsp;<span>${wpm} сл/мин</span>`,
      again: 'Ещё раз ',
      cont: 'Продолжить ',
      camFailed: (msg) => `Камера недоступна, читаем без записи: ${msg}`,
      toastSpeed: (v) => `Скорость ${v} слов в минуту`,
      toastFont: (v) => `Шрифт ${v} px`,
      toastWidth: (v) => `Ширина ${v} px`,
      toastPos: (x, y) => `Позиция ${x} % × ${y} %`,
      mirrorOn: 'Зеркально',
      mirrorOff: 'Без зеркала',
      recErr: { NotAllowedError: 'доступ к камере запрещён в настройках браузера', NotFoundError: 'камера или микрофон не найдены', NotReadableError: 'камера занята другим приложением', unknown: 'неизвестная ошибка' },
      camError: (msg) => `Не удалось включить камеру: ${msg}.`,
      camera: 'Камера',
      microphone: 'Микрофон',
      recStatus: (paused, t) => `${paused ? 'Запись на паузе' : 'Идёт запись'}, ${t}`,
      camOn: 'Выключить камеру',
      camOff: 'Включить камеру',
      kb: 'КБ',
      mb: 'МБ',
      downloaded: ', скачан',
      takesBtn: (n) => (n ? `Дубли: ${n}` : 'Дублей пока нет'),
      takesEmpty: 'Пока пусто. Включите запись и начните чтение.',
      take: (n) => `Дубль ${n}`,
      download: 'Скачать',
      del: 'Удалить',
      confirmDel: 'Точно удалить?',
      noRecorder: 'Этот браузер не умеет записывать видео',
      promptPlaceholder: 'ВСТАВЬТЕ СЮДА ТЕКСТ ВЫСТУПЛЕНИЯ',
      copied: 'Скопировано',
      copyFailed: 'Не удалось скопировать',
    },
  };
  const T = I18N[LANG];

  const DEFAULTS = {
    wpm: 140, chunk: 1, punctFactor: 1, lengthAware: true,
    pauses: { short: 0.5, medium: 1, long: 2 },
    width: 640, fontSize: 84, posX: 50, posY: 16,
    font: 'Onest', weight: 600, theme: 'dark', align: 'orp',
    guides: true, frame: false, flip: false,
    countdown: 3, fullscreen: true, progress: false,
    beep: true, mode: 'simple',
    record: false, camId: '', micId: '', recQuality: '1080', selfView: false, recPause: false,
  };
  // Что настраивается в простом режиме; остальное там берётся из DEFAULTS
  const SIMPLE_KEYS = ['mode', 'wpm', 'fontSize', 'width', 'posX', 'posY', 'beep', 'record', 'camId', 'micId', 'selfView', 'recPause'];
  const POS_PRESETS = { camera: [50, 16], center: [50, 50] };

  const DEMO_EN = `# Intro
Hi! / This is Sufler, // and in one minute I’ll show you how to record video *without your eyes drifting*.

[look at the camera]
Words appear one at a time, / always in the same spot — right under the camera. [PAUSE-SHORT] Your eyes stay put, / and viewers feel you’re talking to them.

# How to mark up
Pauses are slashes: / short, // normal /// and long.
Key words go between asterisks — *like this*.
[SLOW] A tricky idea can be read more slowly, [/SLOW] [FAST] and the obvious part can go faster. [/FAST]

[STOP]
# Wrap-up
Need to switch slides? / Add a stop, and reading waits until you press Space. [PAUSE 1.5]
Thanks for watching! [smile]`;

  const DEMO_RU = `# Вступление
Привет! / Это Суфлёр, // и за минуту я покажу, как записывать видео *без бегающего взгляда*.

[смотри в камеру]
Слова появляются по одному, / всегда в одной и той же точке — прямо под камерой. [PAUSE-SHORT] Глаза остаются на месте, / и зритель видит, что вы говорите с ним.

# Как размечать текст
Паузы ставятся косыми чертами: / короткая, // обычная /// и длинная.
Важные слова выделяются звёздочками — *вот так*.
[SLOW] Сложную мысль можно проговорить медленнее, [/SLOW] [FAST] а очевидное пробежать быстрее. [/FAST]

[STOP]
# Финал
Нужно переключить слайд? / Поставьте стоп, и чтение подождёт, пока вы не нажмёте пробел. [PAUSE 1.5]
Спасибо, что досмотрели! [улыбнись]`;
  const DEMO = LANG === 'ru' ? DEMO_RU : DEMO_EN;

  let S = structuredClone(DEFAULTS);
  let C = S; // действующие настройки с учётом режима
  let text = DEMO;

  function refresh() {
    if (S.mode === 'pro') { C = S; return; }
    C = structuredClone(DEFAULTS);
    for (const k of SIMPLE_KEYS) C[k] = S[k];
  }

  // ——— Хранилище ———
  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.text === 'string') text = data.text;
      if (data.settings) {
        S = Object.assign(structuredClone(DEFAULTS), data.settings);
        S.pauses = Object.assign({}, DEFAULTS.pauses, data.settings.pauses);
      }
    } catch (_) { /* приватный режим или битые данные — работаем с умолчаниями */ }
  }
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE, JSON.stringify({ text, settings: S })); } catch (_) { /* нет доступа */ }
    }, 250);
  }

  let parsed = null;
  let parsedFor = null;
  function getParsed() {
    if (parsedFor !== text) { parsed = P.parse(text); parsedFor = text; }
    return parsed;
  }

  // ——— Форматирование ———
  const fmtDur = (ms) => {
    const s = Math.round(ms / 1000), m = Math.floor(s / 60), r = s % 60;
    return T.dur(m, r);
  };
  const fmtClock = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ——— Редактор ———
  const ta = $('text');
  const mirror = $('mirror');

  function highlight(src) {
    const re = /(^[ \t]*#.*$)|(\[[^\]\n]*\])|((?<=^|\s)\/+(?=\s|$))|(\*[^*\n]+\*)/gm;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
      if (!m[0]) { re.lastIndex++; continue; }
      let cls = 'm-emph';
      if (m[1] != null) cls = 'm-sec';
      else if (m[2] != null) cls = P.parseTag(m[2].slice(1, -1)).kind === 'cue' ? 'm-cue' : 'm-cmd';
      else if (m[3] != null) cls = 'm-cmd';
      out += esc(src.slice(last, m.index)) + `<mark class="${cls}">${esc(m[0])}</mark>`;
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last)) + '\n ';
  }

  function renderMirror() {
    mirror.innerHTML = highlight(ta.value);
    mirror.scrollTop = ta.scrollTop;
  }

  let statsTimer = 0;
  function onText() {
    text = ta.value;
    renderMirror();
    save();
    clearTimeout(statsTimer);
    statsTimer = setTimeout(() => { updateStats(); renderMonitor(); }, 120);
  }

  function updateStats() {
    const p = getParsed();
    const el = $('stats');
    if (!p.wordCount) {
      el.textContent = T.addText;
      $('durationValue').textContent = '0:00';
      $('durationNote').textContent = T.noText;
      return;
    }
    const frames = P.buildFrames(p, C.chunk);
    let total = 0, stops = 0;
    for (const f of frames) { total += P.frameMs(f, C); if (f.type === 'stop') stops++; }
    const words = T.words(p.wordCount);
    const stopsNote = stops ? T.stops(stops) : '';
    el.innerHTML = T.stats(fmtDur(total), words, stopsNote);
    $('durationValue').textContent = fmtClock(total);
    $('durationNote').textContent = T.durationNote(words, C.wpm, stopsNote);
  }

  function insertText(str, selectFrom, selectTo) {
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.focus();
    ta.setSelectionRange(s, e);
    if (!document.execCommand('insertText', false, str)) {
      ta.setRangeText(str, s, e, 'end');
      onText();
    }
    if (selectFrom != null) ta.setSelectionRange(s + selectFrom, s + selectTo);
  }

  function onToolbar(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { value } = ta;
    const s = ta.selectionStart, eIdx = ta.selectionEnd;

    if (btn.dataset.insert) {
      const padL = s > 0 && !/\s/.test(value[s - 1]) ? ' ' : '';
      const padR = eIdx < value.length && !/\s/.test(value[eIdx]) ? ' ' : '';
      const token = btn.dataset.insert;
      const isCue = token.startsWith('[') && P.parseTag(token.slice(1, -1)).kind === 'cue';
      const str = padL + token + (padR || ' ');
      // У ремарки сразу выделяем текст внутри скобок, чтобы его можно было перепечатать
      if (isCue) insertText(str, padL.length + 1, padL.length + token.length - 1);
      else insertText(str);
    } else if (btn.dataset.wrap) {
      const [before, after] = btn.dataset.wrap.split('|');
      const sel = value.slice(s, eIdx);
      const body = sel || T.wrapPlaceholder;
      insertText(before + body + after, before.length, before.length + body.length);
    } else if (btn.dataset.line) {
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      ta.setSelectionRange(lineStart, lineStart);
      const str = btn.dataset.line + T.sectionPlaceholder + '\n';
      insertText(str, btn.dataset.line.length, btn.dataset.line.length + T.sectionPlaceholder.length);
    }
  }

  // ——— Настройки ———
  const RANGES = {
    wpm: (v) => T.wpm(v),
    punctFactor: (v) => `×${v.toFixed(1).replace('.', T.decimal)}`,
    width: (v) => `${v} px`,
    fontSize: (v) => `${v} px`,
    posX: (v) => `${v} %`,
    posY: (v) => `${v} %`,
  };
  const CHECKS = ['lengthAware', 'guides', 'frame', 'flip', 'fullscreen', 'progress', 'beep', 'record', 'selfView', 'recPause'];
  const SEGS = { mode: String, chunk: Number, weight: Number, theme: String, align: String, countdown: Number, recQuality: String };
  const PAUSE_INPUTS = { pShort: 'short', pMedium: 'medium', pLong: 'long' };

  function setFill(input) {
    const min = Number(input.min), max = Number(input.max);
    input.style.setProperty('--p', ((Number(input.value) - min) / (max - min)) * 100 + '%');
  }

  function syncUI() {
    for (const [k, fmt] of Object.entries(RANGES)) {
      $(k).value = S[k];
      $(k + 'Out').textContent = fmt(S[k]);
      setFill($(k));
    }
    for (const k of CHECKS) $(k).checked = !!S[k];
    for (const k of Object.keys(SEGS)) {
      for (const b of $(k).querySelectorAll('button')) {
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(b.dataset.v === String(S[k])));
      }
    }
    for (const [id, key] of Object.entries(PAUSE_INPUTS)) $(id).value = S.pauses[key];
    $('font').value = S.font;
    for (const b of $('posPreset').querySelectorAll('button')) {
      const [x, y] = POS_PRESETS[b.dataset.v];
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(S.posX === x && S.posY === y));
    }
    document.body.dataset.mode = S.mode;
    document.body.dataset.record = S.record;
  }

  function onSettingsChange() {
    refresh();
    save();
    updateStats();
    renderMonitor();
    if (!stage.hidden) { computeTimeline(); applyStage(); }
  }

  function bindSettings() {
    for (const [k, fmt] of Object.entries(RANGES)) {
      $(k).addEventListener('input', () => {
        S[k] = Number($(k).value);
        $(k + 'Out').textContent = fmt(S[k]);
        setFill($(k));
        if (k === 'posX' || k === 'posY') syncUI();
        onSettingsChange();
      });
    }
    for (const k of CHECKS) $(k).addEventListener('change', () => { S[k] = $(k).checked; onSettingsChange(); });
    for (const [k, cast] of Object.entries(SEGS)) {
      $(k).addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        S[k] = cast(b.dataset.v);
        syncUI();
        onSettingsChange();
        if (k === 'weight' || k === 'mode') loadFont();
      });
    }
    for (const [id, key] of Object.entries(PAUSE_INPUTS)) {
      $(id).addEventListener('input', () => {
        const v = parseFloat($(id).value);
        if (!Number.isNaN(v)) { S.pauses[key] = clamp(v, 0, 60); onSettingsChange(); }
      });
    }
    $('font').addEventListener('change', () => { S.font = $('font').value; onSettingsChange(); loadFont(); });
    $('posPreset').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      [S.posX, S.posY] = POS_PRESETS[b.dataset.v];
      syncUI();
      onSettingsChange();
    });
    $('reset').addEventListener('click', () => {
      S = Object.assign(structuredClone(DEFAULTS), { mode: S.mode });
      syncUI();
      onSettingsChange();
      loadFont();
    });
  }

  function loadFont() {
    if (!document.fonts || !document.fonts.load) return;
    document.fonts.load(`${C.weight} 40px "${C.font}"`).then(() => {
      renderMonitor();
      if (!stage.hidden) renderFrame();
    }).catch(() => {});
  }

  // ——— Звук обратного отсчёта ———
  let audioCtx = null;
  function ensureAudio() {
    if (!C.beep) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (_) { audioCtx = null; }
  }
  function beep(freq, ms) {
    if (!C.beep || !audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  }
  const beepTick = () => beep(880, 110);
  const beepGo = () => beep(1320, 170);

  // ——— Отрисовка слова (общая для сцены и мини-монитора) ———
  const measureCtx = document.createElement('canvas').getContext('2d');
  function textWidth(str, size) {
    measureCtx.font = `${C.weight} ${size}px "${C.font}", system-ui, sans-serif`;
    return measureCtx.measureText(str).width;
  }

  /** Рисует слова в el и подгоняет шрифт под ширину avail. */
  function drawWords(el, words, size, avail) {
    const orp = C.align === 'orp' && words.length === 1;
    el.className = 'word' + (orp ? ' orp' : '');
    let need;
    if (orp) {
      const w = words[0];
      const { pre, pivot, post } = P.splitOrp(w.text);
      const e = w.emph ? ' emph' : '';
      el.innerHTML = `<span class="pre${e}">${esc(pre)}</span><span class="pivot${e}">${esc(pivot)}</span><span class="post${e}">${esc(post)}</span>`;
      need = 2 * Math.max(textWidth(pre, size), textWidth(post, size)) + textWidth(pivot, size);
    } else {
      el.innerHTML = words.map((w) => w.emph ? `<span class="emph">${esc(w.text)}</span>` : esc(w.text)).join(' ');
      need = textWidth(words.map((w) => w.text).join(' '), size);
    }
    const fit = need > avail ? Math.max(10, size * (avail / need) * 0.98) : size;
    el.style.fontSize = fit + 'px';
  }

  function restartAnimation(el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  function drawStatus(el, str, cls) {
    el.className = 'word ' + cls;
    el.textContent = str;
    el.style.fontSize = '';
  }

  // ——— Мини-монитор ———
  function renderMonitor() {
    const scr = $('monitorScreen');
    const sw = window.screen.width || 1920, sh = window.screen.height || 1080;
    scr.style.aspectRatio = `${sw} / ${sh}`;
    scr.dataset.theme = C.theme;
    attachCam($('monitorCam'), scr);
    const k = scr.clientWidth / sw;
    if (!k) return;
    const b = $('monitorBlock');
    b.style.left = C.posX + '%';
    b.style.top = C.posY + '%';
    b.style.width = C.width * k + 'px';
    b.style.padding = `0 ${16 * k}px`;
    b.style.fontFamily = `"${C.font}", system-ui, sans-serif`;
    b.style.fontWeight = C.weight;
    b.style.transform = `translate(-50%, -50%)${C.flip ? ' scaleX(-1)' : ''}`;
    const el = $('monitorWord');
    if (preview.frame) {
      if (preview.frame.type === 'words') drawWords(el, preview.frame.words, C.fontSize * k, (C.width - 32) * k);
      else { el.className = 'word'; el.textContent = ''; }
      return;
    }
    const first = getParsed().tokens.find((t) => t.type === 'word') || { text: T.sampleWord, emph: false };
    drawWords(el, [first], C.fontSize * k, (C.width - 32) * k);
  }

  // Проигрывает начало текста прямо в мини-мониторе, чтобы проверить темп без полноэкранного режима
  const preview = { timer: 0, frame: null, list: [], i: 0 };

  function startPreview() {
    const all = P.buildFrames(getParsed(), C.chunk).filter((f) => f.type !== 'stop');
    const list = [];
    let words = 0;
    for (const f of all) {
      list.push(f);
      if (f.type === 'words') {
        words += f.words.length;
        if (words >= 12 && f.words[f.words.length - 1].punct >= 1.2) break;
      }
      if (words >= 30) break;
    }
    if (!list.length) return;
    Object.assign(preview, { list, i: 0 });
    $('monitor').classList.add('live');
    $('monitorPlay').textContent = T.previewStop;
    stepPreview();
  }

  function stepPreview() {
    if (preview.i >= preview.list.length) { stopPreview(); return; }
    preview.frame = preview.list[preview.i++];
    renderMonitor();
    preview.timer = setTimeout(stepPreview, P.frameMs(preview.frame, C));
  }

  function stopPreview() {
    clearTimeout(preview.timer);
    preview.frame = null;
    $('monitor').classList.remove('live');
    $('monitorPlay').textContent = T.previewPlay;
    renderMonitor();
  }

  // ——— Сцена чтения ———
  const stage = $('stage');
  const block = $('block');
  const line = $('line');
  const wordEl = $('word');
  const cueEl = $('cue');
  const pausebar = $('pausebar');
  const pausebarFill = pausebar.firstElementChild;
  const progressFill = $('stageProgress').firstElementChild;

  let frames = [];
  let cum = [];
  let wordIdx = [];
  let totalWords = 0;
  let idx = 0;
  let state = 'idle';
  let frameElapsed = 0;
  let playClock = 0;
  let cueUntil = -1;
  let countdownLeft = 0;
  let shownCount = null;
  let navigated = false;
  let lastNow = 0;
  let raf = 0;
  let watchdog = 0;
  let wakeLock = null;

  function computeTimeline() {
    cum = new Array(frames.length + 1);
    wordIdx = new Array(frames.length);
    cum[0] = 0;
    let w = 0;
    frames.forEach((f, i) => {
      wordIdx[i] = w;
      if (f.type === 'words') w += f.words.length;
      cum[i + 1] = cum[i] + P.frameMs(f, C);
    });
    totalWords = w;
  }

  function setState(s) {
    state = s;
    stage.dataset.state = s;
    if (s === 'paused' || s === 'ended') renderHud();
  }

  function applyStage() {
    stage.dataset.theme = C.theme;
    stage.dataset.flip = C.flip;
    stage.dataset.guides = C.guides;
    stage.dataset.align = C.align;
    stage.dataset.frame = C.frame;
    stage.dataset.progress = C.progress;
    attachCam($('stageCam'), stage);
    block.style.left = C.posX + '%';
    block.style.top = C.posY + '%';
    block.style.width = C.width + 'px';
    block.style.fontSize = C.fontSize + 'px';
    block.style.fontFamily = `"${C.font}", system-ui, sans-serif`;
    block.style.fontWeight = C.weight;
    line.style.height = C.fontSize * 1.25 + 'px';
    renderFrame();
  }

  function renderFrame() {
    const f = frames[idx];
    pausebar.classList.toggle('on', state !== 'countdown' && f && f.type === 'pause');
    if (state === 'countdown') {
      drawStatus(wordEl, String(Math.max(1, Math.ceil(countdownLeft / 1000))), 'countdown');
      wordEl.style.fontSize = C.fontSize + 'px';
    } else if (state === 'ended') {
      drawStatus(wordEl, T.statusEnd, 'status');
    } else if (!f) {
      drawStatus(wordEl, '', 'status');
    } else if (f.type === 'words') {
      drawWords(wordEl, f.words, C.fontSize, C.width - 32);
    } else if (f.type === 'stop') {
      drawStatus(wordEl, T.statusStop, 'status');
    } else {
      drawStatus(wordEl, '', 'status');
      pausebarFill.style.transform = `scaleX(${1 - frameElapsed / Math.max(1, P.frameMs(f, C))})`;
    }
    renderCue();
    renderProgress();
  }

  function renderCue() {
    const f = frames[idx];
    const live = state === 'playing' || state === 'waiting';
    const show = state !== 'countdown' && state !== 'ended' && (live ? playClock < cueUntil : !!(f && f.cue));
    if (!live && f && f.cue) cueEl.textContent = f.cue;
    cueEl.classList.toggle('on', show);
  }

  function renderProgress() {
    if (!frames.length) return;
    const total = cum[frames.length] || 1;
    progressFill.style.width = clamp((cum[idx] + frameElapsed) / total, 0, 1) * 100 + '%';
  }

  function enterFrame() {
    const f = frames[idx];
    if (f.cue) {
      cueEl.textContent = f.cue;
      cueUntil = playClock + Math.max(1800, P.frameMs(f, C));
    }
    if (f.type === 'stop') { frameElapsed = 0; setState('waiting'); }
    renderFrame();
  }

  function tick(now) {
    const dt = Math.min(1100, now - lastNow);
    lastNow = now;
    if (rec.current) {
      $('recTime').textContent = fmtClock(recElapsed());
      const hudRec = document.getElementById('hudRec');
      if (hudRec) hudRec.textContent = recStatus();
    }

    if (state === 'countdown') {
      countdownLeft -= dt;
      if (countdownLeft <= 0) { beepGo(); setState('playing'); enterFrame(); return; }
      const n = Math.ceil(countdownLeft / 1000);
      if (n !== shownCount) { shownCount = n; beepTick(); renderFrame(); restartAnimation(wordEl); }
      return;
    }
    if (state !== 'playing') return;

    playClock += dt;
    frameElapsed += dt;
    let dur = P.frameMs(frames[idx], C);
    while (state === 'playing' && frameElapsed >= dur) {
      frameElapsed -= dur;
      if (idx + 1 >= frames.length) { finish(); return; }
      idx++;
      enterFrame();
      dur = P.frameMs(frames[idx], C);
    }
    const f = frames[idx];
    if (f.type === 'pause') pausebarFill.style.transform = `scaleX(${1 - frameElapsed / Math.max(1, dur)})`;
    if (C.progress) renderProgress();
    if (cueEl.classList.contains('on') && playClock >= cueUntil) cueEl.classList.remove('on');
  }

  function startPlayback(withCountdown) {
    navigated = false;
    clearTimeout(rec.tailTimer);
    if (C.record && rec.stream) { if (rec.current) resumeTake(); else startTake(); }
    frameElapsed = withCountdown ? 0 : frameElapsed;
    if (withCountdown && C.countdown > 0) {
      countdownLeft = C.countdown * 1000;
      shownCount = C.countdown;
      ensureAudio();
      beepTick();
      setState('countdown');
      renderFrame();
    } else {
      setState('playing');
      if (withCountdown) enterFrame(); else renderFrame();
    }
  }

  function pause() {
    if (C.recPause) pauseTake();
    if (state === 'countdown') frameElapsed = 0;
    setState('paused');
    renderFrame();
  }

  function finish() {
    // Последнее слово обычно договаривают чуть позже, чем оно исчезает, поэтому дубль не обрываем:
    // в непрерывном режиме запись идёт до выхода, в режиме с паузой — встаёт на паузу через 2 с
    if (rec.current && C.recPause) rec.tailTimer = setTimeout(pauseTake, 2000);
    idx = frames.length - 1;
    frameElapsed = P.frameMs(frames[idx], C);
    setState('ended');
    renderFrame();
  }

  function togglePlay() {
    if (state === 'playing' || state === 'countdown') pause();
    else if (state === 'paused') startPlayback(navigated);
    else if (state === 'waiting') {
      if (idx + 1 >= frames.length) { finish(); return; }
      idx++;
      frameElapsed = 0;
      setState('playing');
      enterFrame();
    } else if (state === 'ended') restart();
  }

  function restart() {
    stopTake(); // перезапуск с начала — новый дубль
    idx = 0;
    playClock = 0;
    cueUntil = -1;
    startPlayback(true);
  }

  function goTo(i) {
    if (state !== 'paused') setState('paused');
    idx = clamp(i, 0, frames.length - 1);
    frameElapsed = 0;
    navigated = true;
    renderFrame();
    renderHud();
  }

  function findWords(from, dir) {
    for (let i = from; i >= 0 && i < frames.length; i += dir) if (frames[i].type === 'words') return i;
    return -1;
  }

  function step(dir) {
    const i = findWords(idx + dir, dir);
    if (i >= 0) goTo(i); else if (state !== 'paused') goTo(idx);
  }

  function sentenceStart(s) {
    return frames.findIndex((f) => f.type === 'words' && f.sentence === s);
  }

  function jumpSentence(dir) {
    const f = frames[idx];
    const cur = f ? f.sentence : 0;
    if (dir < 0) {
      const start = sentenceStart(cur);
      // Если уже стоим в начале предложения — к предыдущему
      const target = start >= 0 && (start < idx || (state === 'playing' && frameElapsed > 400)) ? start : sentenceStart(cur - 1);
      goTo(target >= 0 ? target : findWords(0, 1));
    } else {
      const next = frames.findIndex((g, i) => i > idx && g.type === 'words' && g.sentence > cur);
      if (next >= 0) goTo(next);
    }
  }

  function jumpSection(s) {
    const sec = getParsed().sections[s];
    const i = frames.findIndex((f) => f.type === 'words' && f.token >= sec.token);
    if (i >= 0) goTo(i);
  }

  function renderHud() {
    const f = frames[idx];
    const passed = cum[idx] + frameElapsed;
    const left = (cum[frames.length] || 0) - passed;
    const recNote = rec.current ? `&emsp;<span class="hud-rec" id="hudRec">${recStatus()}</span>` : '';
    $('hudWhere').innerHTML = T.hudWhere(Math.min(totalWords, wordIdx[idx] + 1), totalWords, fmtClock(left), C.wpm) + recNote;

    const p = getParsed();
    $('hudSections').innerHTML = p.sections.map((s, i) =>
      `<button type="button" data-section="${i}" aria-current="${f && f.section === i}">${esc(s.title)}</button>`).join('');

    const ctx = $('hudContext');
    if (f && state !== 'ended') {
      const current = new Set(f.type === 'words' ? f.words : []);
      const words = p.tokens.filter((t) => t.type === 'word' && t.sentence === f.sentence);
      ctx.innerHTML = words.map((w) => current.has(w) ? `<span class="cur">${esc(w.text)}</span>` : esc(w.text)).join(' ');
    } else ctx.textContent = '';

    $('hudPlay').firstChild.textContent = state === 'ended' ? T.again : T.cont;
  }

  let toastTimer = 0;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 1100);
  }

  function stageSettingChanged(msg) {
    refresh();
    save();
    computeTimeline();
    applyStage();
    if (state === 'paused') renderHud();
    if (msg) toast(msg);
  }

  async function requestWakeLock() {
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch (_) { wakeLock = null; }
  }

  async function openStage(fromCursor) {
    if (preview.frame) stopPreview();
    let recFailed = null;
    if (C.record && getParsed().wordCount) {
      try { await getStream(); } catch (err) { recFailed = err; }
    }
    rec.takesAtOpen = rec.takes.length;
    const p = getParsed();
    frames = P.buildFrames(p, C.chunk);
    if (!p.wordCount) { ta.focus(); updateStats(); return; }
    computeTimeline();

    idx = findWords(0, 1);
    if (fromCursor) {
      const pos = ta.selectionStart;
      const i = frames.findIndex((f) => f.type === 'words' && f.words[f.words.length - 1].srcEnd > pos);
      if (i >= 0) idx = i;
    }
    frameElapsed = 0;
    playClock = 0;
    cueUntil = -1;

    stage.hidden = false;
    document.body.style.overflow = 'hidden';
    applyStage();
    if (C.fullscreen && !document.fullscreenElement && stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
    requestWakeLock();
    startPlayback(true);
    if (recFailed) toast(T.camFailed(recErrorText(recFailed)));
    lastNow = performance.now();
    stopLoop();
    const loop = (now) => { raf = requestAnimationFrame(loop); tick(now); };
    raf = requestAnimationFrame(loop);
    // Если браузер считает вкладку скрытой, rAF не вызывается — подстраховываемся таймером
    watchdog = setInterval(() => { const now = performance.now(); if (now - lastNow > 120) tick(now); }, 50);
  }

  function stopLoop() {
    cancelAnimationFrame(raf);
    clearInterval(watchdog);
  }

  function closeStage() {
    stopLoop();
    if (rec.current) {
      // Дубль дописывается асинхронно — окно с ним откроется, когда файл будет готов
      rec.showOnFinalize = true;
      stopTake().then(() => { if (!rec.previewWanted) releaseStream(); });
    } else {
      if (!rec.previewWanted) releaseStream();
      if (rec.takes.length > rec.takesAtOpen) openTakes();
    }
    state = 'idle';
    stage.hidden = true;
    document.body.style.overflow = '';
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    syncUI();
    renderMonitor();
    updateStats();
    // Курсор в редакторе — на слове, где остановились: «С курсора» продолжит отсюда
    const i = findWords(Math.min(idx, frames.length - 1), -1);
    if (i >= 0) {
      ta.focus();
      ta.setSelectionRange(frames[i].src, frames[i].src);
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
  }

  function onStageKey(e) {
    if (stage.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    const c = e.code;
    let handled = true;
    if (k === ' ' || k === 'Enter' || k === 'PageDown' || c === 'KeyK') togglePlay();
    else if (k === 'Escape') { if (state === 'paused' || state === 'ended') closeStage(); else pause(); }
    else if (k === 'ArrowRight') e.shiftKey ? jumpSentence(1) : step(1);
    else if (k === 'ArrowLeft') e.shiftKey ? jumpSentence(-1) : step(-1);
    else if (k === 'PageUp') jumpSentence(-1);
    else if (k === 'Home') goTo(findWords(0, 1));
    else if (k === 'ArrowUp' || k === 'ArrowDown') {
      S.wpm = clamp(C.wpm + (k === 'ArrowUp' ? 10 : -10), 60, 360);
      stageSettingChanged(T.toastSpeed(C.wpm));
    } else if (c === 'Equal' || c === 'Minus' || c === 'NumpadAdd' || c === 'NumpadSubtract') {
      S.fontSize = clamp(C.fontSize + (c === 'Equal' || c === 'NumpadAdd' ? 4 : -4), 24, 220);
      stageSettingChanged(T.toastFont(C.fontSize));
    } else if (c === 'BracketRight' || c === 'BracketLeft') {
      S.width = clamp(C.width + (c === 'BracketRight' ? 20 : -20), 160, 2400);
      stageSettingChanged(T.toastWidth(C.width));
    } else if (c === 'KeyR') restart();
    else if (c === 'KeyF') toggleFullscreen();
    else if (c === 'KeyM' && S.mode === 'pro') { S.flip = !S.flip; stageSettingChanged(C.flip ? T.mirrorOn : T.mirrorOff); }
    else handled = false;
    if (handled) e.preventDefault();
  }

  // Перетаскивание блока и изменение ширины на паузе; простой клик — пауза/продолжить
  let drag = null;
  function onPointerDown(e) {
    if (e.button !== 0 || e.target.closest('.hud-panel, .hud-btn')) return;
    const handle = e.target.closest('[data-handle]');
    const inBlock = e.target.closest('.block');
    const mode = state === 'paused' ? (handle ? 'resize' : inBlock ? 'move' : null) : null;
    drag = { x: e.clientX, y: e.clientY, mode, moved: false, posX: C.posX, posY: C.posY };
    if (mode) { stage.setPointerCapture(e.pointerId); stage.classList.add('dragging'); }
  }
  function onPointerMove(e) {
    if (!drag || !drag.mode) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    const r = stage.getBoundingClientRect();
    if (drag.mode === 'move') {
      S.posX = Math.round(clamp(drag.posX + (dx / r.width) * 100 * (C.flip ? -1 : 1), 0, 100));
      S.posY = Math.round(clamp(drag.posY + (dy / r.height) * 100, 0, 100));
    } else {
      const cx = r.left + r.width * (C.flip ? 100 - C.posX : C.posX) / 100;
      S.width = Math.round(clamp(2 * Math.abs(e.clientX - cx), 160, r.width * 2));
    }
    refresh();
    applyStage();
  }
  function onPointerUp() {
    if (!drag) return;
    const d = drag;
    drag = null;
    stage.classList.remove('dragging');
    if (d.moved) stageSettingChanged(d.mode === 'move' ? T.toastPos(C.posX, C.posY) : T.toastWidth(C.width));
    else togglePlay();
  }

  function bindStage() {
    document.addEventListener('keydown', onStageKey);
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', () => { drag = null; stage.classList.remove('dragging'); });

    const hudClick = (id, fn) => $(id).addEventListener('click', (e) => { e.currentTarget.blur(); fn(); });
    hudClick('hudPlay', togglePlay);
    hudClick('hudBackSentence', () => jumpSentence(-1));
    hudClick('hudRestart', restart);
    hudClick('exitStage', closeStage);
    $('hudSections').addEventListener('click', (e) => {
      const b = e.target.closest('[data-section]');
      if (b) { b.blur(); jumpSection(Number(b.dataset.section)); }
    });

    // Esc в полноэкранном режиме браузер забирает себе — ставим на паузу по выходу из него
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && !stage.hidden && (state === 'playing' || state === 'countdown')) pause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !stage.hidden && !wakeLock) requestWakeLock();
    });
  }

  // ——— Запись видео: всё в браузере (getUserMedia + MediaRecorder), файлы скачиваются локально ———
  const QUALITY = { 720: [1280, 720, 5e6], 1080: [1920, 1080, 10e6], 2160: [3840, 2160, 30e6] };
  const rec = { stream: null, current: null, takes: [], counter: 0, mime: null, previewWanted: false, takesAtOpen: 0, showOnFinalize: false, meter: null };
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  function pickMime() {
    const list = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return list.find((m) => MediaRecorder.isTypeSupported(m)) || '';
  }

  function recErrorText(err) {
    return (err && T.recErr[err.name]) || (err && err.message) || T.recErr.unknown;
  }

  function showRecError(err) {
    const el = $('recError');
    el.hidden = !err;
    el.textContent = err ? T.camError(recErrorText(err)) : '';
  }

  async function getStream() {
    if (rec.stream) return rec.stream;
    const [w, h] = QUALITY[C.recQuality] || QUALITY[1080];
    const video = { width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: 30 } };
    const audio = {};
    if (C.camId) video.deviceId = { exact: C.camId };
    if (C.micId) audio.deviceId = { exact: C.micId };
    try {
      rec.stream = await navigator.mediaDevices.getUserMedia({ video, audio: C.micId ? audio : true });
    } catch (err) {
      if (err.name !== 'OverconstrainedError' && err.name !== 'NotFoundError') { showRecError(err); throw err; }
      // Выбранное устройство отключили — берём устройства по умолчанию
      delete video.deviceId;
      try { rec.stream = await navigator.mediaDevices.getUserMedia({ video, audio: true }); } catch (err2) { showRecError(err2); throw err2; }
    }
    showRecError(null);
    const v = $('camVideo');
    v.srcObject = rec.stream;
    v.play().catch(() => {});
    startMeter();
    await fillDevices();
    renderRecUI();
    return rec.stream;
  }

  function releaseStream() {
    stopMeter();
    if (rec.stream) rec.stream.getTracks().forEach((t) => t.stop());
    rec.stream = null;
    $('camVideo').srcObject = null;
    renderRecUI();
  }

  async function fillDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const fill = (sel, kind, trackKind, current, fallback) => {
      const list = devices.filter((d) => d.kind === kind && d.deviceId);
      if (!list.length) return;
      sel.innerHTML = list.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `${fallback} ${i + 1}`)}</option>`).join('');
      const track = rec.stream && rec.stream.getTracks().find((t) => t.kind === trackKind);
      const ids = list.map((d) => d.deviceId);
      sel.value = [track && track.getSettings().deviceId, current, ids[0]].find((id) => id && ids.includes(id));
    };
    fill($('camSelect'), 'videoinput', 'video', C.camId, T.camera);
    fill($('micSelect'), 'audioinput', 'audio', C.micId, T.microphone);
  }

  function startMeter() {
    stopMeter();
    if (!rec.stream.getAudioTracks().length) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(rec.stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const bar = $('micLevel');
      const loop = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        bar.style.transform = `scaleX(${Math.min(1, peak / 80)})`;
        rec.meter.raf = requestAnimationFrame(loop);
      };
      rec.meter = { ctx, raf: requestAnimationFrame(loop) };
    } catch (_) { rec.meter = null; }
  }

  function stopMeter() {
    if (rec.meter) { cancelAnimationFrame(rec.meter.raf); rec.meter.ctx.close().catch(() => {}); rec.meter = null; }
    $('micLevel').style.transform = 'scaleX(0)';
  }

  function startTake() {
    if (!rec.stream) return;
    if (rec.mime === null) rec.mime = pickMime();
    const bps = (QUALITY[C.recQuality] || QUALITY[1080])[2];
    let recorder;
    try { recorder = new MediaRecorder(rec.stream, rec.mime ? { mimeType: rec.mime, videoBitsPerSecond: bps } : { videoBitsPerSecond: bps }); }
    catch (_) { recorder = new MediaRecorder(rec.stream); }
    const take = { recorder, chunks: [], n: ++rec.counter, date: new Date(), elapsed: 0, since: performance.now() };
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) take.chunks.push(e.data); };
    take.done = new Promise((resolve) => { recorder.onstop = () => { finalizeTake(take); resolve(); }; });
    recorder.start(1000); // куски по секунде: при сбое вкладки не теряется всё
    rec.current = take;
    renderRecBadge();
  }

  function pauseTake() {
    const t = rec.current;
    if (t && t.recorder.state === 'recording') { t.recorder.pause(); t.elapsed += performance.now() - t.since; }
    renderRecBadge();
  }

  function resumeTake() {
    const t = rec.current;
    if (t && t.recorder.state === 'paused') { t.recorder.resume(); t.since = performance.now(); }
    renderRecBadge();
  }

  function stopTake() {
    clearTimeout(rec.tailTimer);
    const t = rec.current;
    if (!t) return Promise.resolve();
    if (t.recorder.state === 'recording') t.elapsed += performance.now() - t.since;
    rec.current = null;
    if (t.recorder.state !== 'inactive') t.recorder.stop();
    renderRecBadge();
    return t.done;
  }

  function recStatus() {
    const paused = rec.current && rec.current.recorder.state !== 'recording';
    return T.recStatus(paused, fmtClock(recElapsed()));
  }

  function recElapsed() {
    const t = rec.current;
    if (!t) return 0;
    return t.elapsed + (t.recorder.state === 'recording' ? performance.now() - t.since : 0);
  }

  function finalizeTake(take) {
    const type = take.recorder.mimeType || rec.mime || 'video/webm';
    const blob = new Blob(take.chunks, { type });
    if (blob.size) {
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      const d = take.date;
      const two = (x) => String(x).padStart(2, '0');
      const stamp = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}_${two(d.getHours())}-${two(d.getMinutes())}`;
      rec.takes.push({ n: take.n, url: URL.createObjectURL(blob), size: blob.size, duration: take.elapsed, ext, name: `sufler-take-${take.n}_${stamp}.${ext}`, saved: false });
      renderTakes();
    }
    if (rec.showOnFinalize) { rec.showOnFinalize = false; if (rec.takes.length > rec.takesAtOpen) openTakes(); }
  }

  function renderRecBadge() {
    const t = rec.current;
    stage.dataset.rec = t ? t.recorder.state : '';
    $('recTime').textContent = fmtClock(recElapsed());
  }

  /** Показывает камеру фоном под текстом, если включено «Видеть себя». */
  function attachCam(video, host) {
    const want = C.record && C.selfView && rec.stream ? rec.stream : null;
    host.dataset.selfview = String(!!want);
    if (video.srcObject !== want) {
      video.srcObject = want;
      if (want) video.play().catch(() => {});
    }
  }

  function renderRecUI() {
    renderMonitor();
    if (!stage.hidden) attachCam($('stageCam'), stage);
    const on = !!rec.stream;
    $('camPreview').classList.toggle('on', on);
    $('camToggle').textContent = on ? T.camOn : T.camOff;
  }

  const fmtSize = (b) => {
    const mb = b / 1048576;
    if (mb < 1) return `${Math.max(1, Math.round(b / 1024))} ${T.kb}`;
    return mb >= 10 ? `${Math.round(mb)} ${T.mb}` : `${mb.toFixed(1).replace('.', T.decimal)} ${T.mb}`;
  };

  function takeMeta(t) {
    return `${fmtClock(t.duration)}, ${fmtSize(t.size)}, ${t.ext.toUpperCase()}${t.saved ? T.downloaded : ''}`;
  }

  function renderTakes() {
    const btn = $('takesOpen');
    btn.disabled = !rec.takes.length;
    btn.textContent = T.takesBtn(rec.takes.length);
    const list = $('takesList');
    if (!rec.takes.length) { list.innerHTML = `<li class="takes-empty">${T.takesEmpty}</li>`; return; }
    list.innerHTML = rec.takes.slice().reverse().map((t) => `
      <li class="take" data-n="${t.n}">
        <video src="${t.url}" controls preload="metadata" playsinline></video>
        <div class="take-info">
          <b>${T.take(t.n)}</b>
          <span class="take-meta">${takeMeta(t)}</span>
          <div class="take-actions">
            <a class="btn btn-dark btn-small" href="${t.url}" download="${esc(t.name)}" data-save>${T.download}</a>
            <button type="button" class="btn btn-small" data-delete>${T.del}</button>
          </div>
        </div>
      </li>`).join('');
  }

  function openTakes() {
    renderTakes();
    const d = $('takesDialog');
    if (!d.open) d.showModal();
  }

  function onTakesClick(e) {
    const li = e.target.closest('.take');
    if (!li) return;
    const t = rec.takes.find((x) => x.n === Number(li.dataset.n));
    if (!t) return;
    if (e.target.closest('[data-save]')) {
      t.saved = true;
      li.querySelector('.take-meta').textContent = takeMeta(t);
    } else if (e.target.closest('[data-delete]')) {
      const b = e.target.closest('[data-delete]');
      // Удаление без возврата: подтверждаем вторым нажатием
      if (!b.classList.contains('confirm')) {
        b.classList.add('confirm');
        b.textContent = T.confirmDel;
        setTimeout(() => { b.classList.remove('confirm'); b.textContent = T.del; }, 3000);
        return;
      }
      URL.revokeObjectURL(t.url);
      rec.takes = rec.takes.filter((x) => x !== t);
      renderTakes();
    }
  }

  function bindRecording() {
    if (!canRecord) {
      $('record').disabled = true;
      $('record').closest('.switch').title = T.noRecorder;
    }
    $('record').addEventListener('change', () => {
      if (S.record) { rec.previewWanted = true; getStream().catch(() => {}); } else { rec.previewWanted = false; releaseStream(); showRecError(null); }
    });
    $('camToggle').addEventListener('click', () => {
      if (rec.stream) { rec.previewWanted = false; releaseStream(); } else { rec.previewWanted = true; getStream().catch(() => {}); }
    });
    const restartStream = () => { if (rec.stream && !rec.current) { releaseStream(); getStream().catch(() => {}); } };
    $('camSelect').addEventListener('change', () => { S.camId = $('camSelect').value; onSettingsChange(); restartStream(); });
    $('micSelect').addEventListener('change', () => { S.micId = $('micSelect').value; onSettingsChange(); restartStream(); });
    $('recQuality').addEventListener('click', (e) => { if (e.target.closest('button')) restartStream(); });
    if (navigator.mediaDevices) navigator.mediaDevices.addEventListener('devicechange', () => { if (rec.stream) fillDevices(); });
    $('takesOpen').addEventListener('click', openTakes);
    $('takesList').addEventListener('click', onTakesClick);
    // Нескачанные дубли пропадут вместе со вкладкой — предупреждаем
    window.addEventListener('beforeunload', (e) => {
      if (rec.current || rec.takes.some((t) => !t.saved)) { e.preventDefault(); e.returnValue = ''; }
    });
    renderTakes();
  }

  // ——— Промпт для любой нейросети ———
  const PROMPT_PLACEHOLDER = T.promptPlaceholder;

  async function copyText(str) {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch (_) {
      // Нет доступа к Clipboard API (например, страница открыта как файл) — старый способ
      const tmp = document.createElement('textarea');
      tmp.value = str;
      tmp.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      $('skillDialog').appendChild(tmp);
      tmp.select();
      const ok = document.execCommand('copy');
      tmp.remove();
      return ok;
    }
  }

  function flashCopied(btn, ok) {
    const label = btn.dataset.label || (btn.dataset.label = btn.textContent);
    btn.textContent = ok ? T.copied : T.copyFailed;
    btn.classList.toggle('copied', ok);
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = label; btn.classList.remove('copied'); }, 1600);
  }

  function bindPromptDialog() {
    const prompt = () => $('promptText').textContent;
    $('copyPrompt').addEventListener('click', async (e) => flashCopied(e.currentTarget, await copyText(prompt())));
    $('copyPromptWithText').addEventListener('click', async (e) => {
      flashCopied(e.currentTarget, await copyText(prompt().replace(PROMPT_PLACEHOLDER, ta.value.trim())));
    });
    const tabs = [[$('tabPrompt'), $('panelPrompt')], [$('tabSkill'), $('panelSkill')]];
    for (const [tab] of tabs) {
      tab.addEventListener('click', () => {
        for (const [t, panel] of tabs) {
          t.setAttribute('aria-selected', String(t === tab));
          panel.hidden = t !== tab;
        }
      });
    }
  }

  // ——— Запуск ———
  function init() {
    load();
    refresh();
    ta.value = text;
    syncUI();
    renderMirror();
    updateStats();
    bindSettings();
    bindStage();

    ta.addEventListener('input', onText);
    ta.addEventListener('scroll', () => { mirror.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openStage(true); }
    });
    $('toolbar').addEventListener('click', onToolbar);
    const langLink = $('langSwitch');
    langLink.addEventListener('click', () => { try { localStorage.setItem('sufler.lang', langLink.dataset.lang); } catch (_) { /* нет доступа */ } });
    let savedLang = null;
    try { savedLang = localStorage.getItem('sufler.lang'); } catch (_) { /* нет доступа */ }
    if (LANG === 'en' && !savedLang && (navigator.languages || [navigator.language]).some((l) => /^ru\b/i.test(l))) {
      langLink.textContent = langLink.title;
      langLink.classList.add('suggest');
    }
    $('start').addEventListener('click', () => openStage(false));
    $('startCursor').addEventListener('click', () => openStage(true));
    $('monitorPlay').addEventListener('click', () => (preview.frame ? stopPreview() : startPreview()));

    const skillDialog = $('skillDialog');
    for (const b of document.querySelectorAll('[data-skill-open]')) {
      b.addEventListener('click', () => {
        $('copyPromptWithText').disabled = !ta.value.trim();
        skillDialog.showModal();
      });
    }
    bindPromptDialog();
    for (const d of document.querySelectorAll('dialog.dialog')) {
      d.querySelector('[data-dialog-close]').addEventListener('click', () => d.close());
      // Клик по затемнению вокруг окна закрывает его
      d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    }
    bindRecording();

    new ResizeObserver(() => { renderMonitor(); renderMirror(); }).observe($('monitorScreen'));
    new ResizeObserver(() => { mirror.scrollTop = ta.scrollTop; }).observe(ta);
    renderMonitor();
    loadFont();
    if (document.fonts) document.fonts.ready.then(() => { renderMirror(); renderMonitor(); });
  }

  init();
})();
