(function () {
  'use strict';

  const P = window.Sufler;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const STORE = 'sufler.v1';

  const DEFAULTS = {
    wpm: 140, chunk: 1, punctFactor: 1, lengthAware: true,
    pauses: { short: 0.5, medium: 1, long: 2 },
    width: 640, fontSize: 84, posX: 50, posY: 16,
    font: 'Onest', weight: 600, theme: 'dark', align: 'orp',
    guides: true, frame: false, flip: false,
    countdown: 3, fullscreen: true, progress: false,
    beep: true, mode: 'simple',
  };
  // Что настраивается в простом режиме; остальное там берётся из DEFAULTS
  const SIMPLE_KEYS = ['mode', 'wpm', 'fontSize', 'width', 'posX', 'posY', 'beep'];
  const POS_PRESETS = { camera: [50, 16], center: [50, 50] };

  const DEMO = `# Вступление
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
  const plural = (n, forms) => {
    const a = n % 10, b = n % 100;
    return forms[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 1 : 2];
  };
  const fmtDur = (ms) => {
    const s = Math.round(ms / 1000), m = Math.floor(s / 60), r = s % 60;
    return m ? `${m} мин ${r} с` : `${r} с`;
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
      el.textContent = 'Добавьте текст, чтобы начать';
      $('durationValue').textContent = '0:00';
      $('durationNote').textContent = 'Текста пока нет';
      return;
    }
    const frames = P.buildFrames(p, C.chunk);
    let total = 0, stops = 0;
    for (const f of frames) { total += P.frameMs(f, C); if (f.type === 'stop') stops++; }
    const words = `${p.wordCount} ${plural(p.wordCount, ['слово', 'слова', 'слов'])}`;
    const stopsNote = stops ? `, плюс ${stops} ${plural(stops, ['остановка', 'остановки', 'остановок'])}` : '';
    el.innerHTML = `Около <b>${fmtDur(total)}</b>, ${words}${stopsNote}`;
    $('durationValue').textContent = fmtClock(total);
    $('durationNote').textContent = `${words} при ${C.wpm} сл/мин${stopsNote}`;
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
      const body = sel || 'текст';
      insertText(before + body + after, before.length, before.length + body.length);
    } else if (btn.dataset.line) {
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      ta.setSelectionRange(lineStart, lineStart);
      const str = btn.dataset.line + 'Раздел\n';
      insertText(str, btn.dataset.line.length, btn.dataset.line.length + 6);
    }
  }

  // ——— Настройки ———
  const RANGES = {
    wpm: (v) => `${v} сл/мин`,
    punctFactor: (v) => `×${v.toFixed(1).replace('.', ',')}`,
    width: (v) => `${v} px`,
    fontSize: (v) => `${v} px`,
    posX: (v) => `${v} %`,
    posY: (v) => `${v} %`,
  };
  const CHECKS = ['lengthAware', 'guides', 'frame', 'flip', 'fullscreen', 'progress', 'beep'];
  const SEGS = { mode: String, chunk: Number, weight: Number, theme: String, align: String, countdown: Number };
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
    const first = getParsed().tokens.find((t) => t.type === 'word') || { text: 'Суфлёр', emph: false };
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
    $('monitorPlay').textContent = 'Стоп';
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
    $('monitorPlay').textContent = 'Проверить темп';
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
      drawStatus(wordEl, 'Конец', 'status');
    } else if (!f) {
      drawStatus(wordEl, '', 'status');
    } else if (f.type === 'words') {
      drawWords(wordEl, f.words, C.fontSize, C.width - 32);
    } else if (f.type === 'stop') {
      drawStatus(wordEl, 'Стоп. Пробел — дальше', 'status');
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
    if (state === 'countdown') frameElapsed = 0;
    setState('paused');
    renderFrame();
  }

  function finish() {
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
    $('hudWhere').innerHTML = `<span>Слово ${Math.min(totalWords, wordIdx[idx] + 1)} из ${totalWords}</span>&emsp;<span>осталось ${fmtClock(left)}</span>&emsp;<span>${C.wpm} сл/мин</span>`;

    const p = getParsed();
    $('hudSections').innerHTML = p.sections.map((s, i) =>
      `<button type="button" data-section="${i}" aria-current="${f && f.section === i}">${esc(s.title)}</button>`).join('');

    const ctx = $('hudContext');
    if (f && state !== 'ended') {
      const current = new Set(f.type === 'words' ? f.words : []);
      const words = p.tokens.filter((t) => t.type === 'word' && t.sentence === f.sentence);
      ctx.innerHTML = words.map((w) => current.has(w) ? `<span class="cur">${esc(w.text)}</span>` : esc(w.text)).join(' ');
    } else ctx.textContent = '';

    $('hudPlay').firstChild.textContent = state === 'ended' ? 'Ещё раз ' : 'Продолжить ';
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

  function openStage(fromCursor) {
    if (preview.frame) stopPreview();
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
      stageSettingChanged(`Скорость ${C.wpm} слов в минуту`);
    } else if (c === 'Equal' || c === 'Minus' || c === 'NumpadAdd' || c === 'NumpadSubtract') {
      S.fontSize = clamp(C.fontSize + (c === 'Equal' || c === 'NumpadAdd' ? 4 : -4), 24, 220);
      stageSettingChanged(`Шрифт ${C.fontSize} px`);
    } else if (c === 'BracketRight' || c === 'BracketLeft') {
      S.width = clamp(C.width + (c === 'BracketRight' ? 20 : -20), 160, 2400);
      stageSettingChanged(`Ширина ${C.width} px`);
    } else if (c === 'KeyR') restart();
    else if (c === 'KeyF') toggleFullscreen();
    else if (c === 'KeyM' && S.mode === 'pro') { S.flip = !S.flip; stageSettingChanged(C.flip ? 'Зеркально' : 'Без зеркала'); }
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
    if (d.moved) stageSettingChanged(d.mode === 'move' ? `Позиция ${C.posX} % × ${C.posY} %` : `Ширина ${C.width} px`);
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

  // ——— Промпт для любой нейросети ———
  const PROMPT_PLACEHOLDER = 'ВСТАВЬТЕ СЮДА ТЕКСТ ВЫСТУПЛЕНИЯ';

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
    btn.textContent = ok ? 'Скопировано' : 'Не удалось скопировать';
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
    skillDialog.querySelector('[data-dialog-close]').addEventListener('click', () => skillDialog.close());
    // Клик по затемнению вокруг окна закрывает его
    skillDialog.addEventListener('click', (e) => { if (e.target === skillDialog) skillDialog.close(); });

    new ResizeObserver(() => { renderMonitor(); renderMirror(); }).observe($('monitorScreen'));
    new ResizeObserver(() => { mirror.scrollTop = ta.scrollTop; }).observe(ta);
    renderMonitor();
    loadFont();
    if (document.fonts) document.fonts.ready.then(() => { renderMirror(); renderMonitor(); });
  }

  init();
})();
