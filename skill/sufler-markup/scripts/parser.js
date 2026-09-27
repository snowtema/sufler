/* Суфлёр — разбор размеченного текста в последовательность кадров. Без зависимостей. */
(function (root) {
  'use strict';

  const ALIASES = {
    'ПАУЗА': 'PAUSE', 'КОРОТКАЯ': 'SHORT', 'КОРОТКО': 'SHORT', 'ДЛИННАЯ': 'LONG', 'ДОЛГАЯ': 'LONG',
    'СРЕДНЯЯ': 'MEDIUM', 'СТОП': 'STOP', 'ЖДАТЬ': 'STOP', 'МЕДЛЕННО': 'SLOW', 'БЫСТРО': 'FAST',
    'НОРМА': 'NORMAL', 'НОРМАЛЬНО': 'NORMAL', 'СКОРОСТЬ': 'SPEED',
  };
  const SPEED_PRESETS = { SLOW: 0.75, FAST: 1.3 };
  const PARA_UNITS = 1.5;          // пауза на пустой строке, в «словах»
  const SENTENCE_UNITS = 1.2;      // . ! ? …
  const CLAUSE_UNITS = 0.6;        // , ; : —
  const EMPH_FACTOR = 1.15;

  const LETTER = /[\p{L}\p{N}]/u;
  const VOWELS = /[аеёиоуыэюяaeiouy]/gi;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /** Разбирает содержимое квадратных скобок. Всё, что не команда, — ремарка. */
  function parseTag(inner) {
    const raw = inner.trim();
    const cmd = raw.toUpperCase()
      .replace(/[A-ZА-ЯЁ]+/g, (w) => ALIASES[w] || w)
      .replace(/\s+/g, ' ');
    let m;
    if ((m = cmd.match(/^PAUSE(?:[\s_:-]*(SHORT|MEDIUM|LONG))?$/))) {
      return { kind: 'pause', size: (m[1] || 'MEDIUM').toLowerCase() };
    }
    if ((m = cmd.match(/^PAUSE[\s_:=-]*(\d+(?:[.,]\d+)?)\s*(MS|МС|SEC|СЕК|S|С)?$/))) {
      let seconds = parseFloat(m[1].replace(',', '.'));
      if (m[2] === 'MS' || m[2] === 'МС') seconds /= 1000;
      return { kind: 'pause', seconds: clamp(seconds, 0, 60) };
    }
    if (/^(STOP|WAIT|HOLD)$/.test(cmd)) return { kind: 'stop' };
    if (/^(SLOW|FAST)$/.test(cmd)) return { kind: 'speed', factor: SPEED_PRESETS[cmd], name: cmd };
    if ((m = cmd.match(/^SPEED[\s:=X×-]*(\d+(?:[.,]\d+)?)\s*[X×]?$/))) {
      return { kind: 'speed', factor: clamp(parseFloat(m[1].replace(',', '.')), 0.3, 3), name: 'SPEED' };
    }
    if ((m = cmd.match(/^\/\s*(SLOW|FAST|SPEED)$/))) return { kind: 'speedEnd', name: m[1] };
    if (cmd === 'NORMAL') return { kind: 'normal' };
    return { kind: 'cue', text: raw };
  }

  function syllables(word) {
    const vowels = (word.match(VOWELS) || []).length;
    const digits = (word.match(/\d/g) || []).length;
    return Math.max(1, vowels, Math.ceil(digits * 1.5));
  }

  function trailingPunct(word) {
    const m = word.match(/([.!?…,;:—–-]+)[»"”’')\]]*$/u);
    if (!m) return 0;
    return /[.!?…]/.test(m[1]) ? SENTENCE_UNITS : CLAUSE_UNITS;
  }

  /**
   * Текст → токены: word | pause | stop.
   * У слов есть src/srcEnd (смещения в исходнике) для старта с курсора.
   */
  function parse(text) {
    const tokens = [];
    const sections = [];
    let speedStack = [];
    let emph = false;
    let pendingCue = null;
    let pendingPara = false;
    let newSentence = true;
    let sentence = -1;
    let lastWord = null;
    let wordCount = 0;

    const speed = () => speedStack.reduce((a, b) => a * b, 1);
    const push = (t) => {
      if (pendingCue) { t.cue = pendingCue; pendingCue = null; }
      tokens.push(t);
    };

    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    let offset = 0;

    for (const line of lines) {
      const lineStart = offset;
      offset += line.length + 1;
      const trimmed = line.trim();

      if (!trimmed) { if (lastWord) pendingPara = true; continue; }
      if (trimmed[0] === '#') {
        sections.push({ title: trimmed.replace(/^#+\s*/, '') || 'Раздел', token: tokens.length, src: lineStart });
        if (lastWord) pendingPara = true;
        newSentence = true;
        continue;
      }

      const re = /\[[^\]\n]*\]|[^\s[]+|\[/g;
      let m;
      while ((m = re.exec(line))) {
        const raw = m[0];
        const start = lineStart + m.index;

        if (pendingPara) {
          pendingPara = false;
          newSentence = true;
          push({ type: 'pause', para: true, speed: speed(), src: start });
        }

        // [команда] или [ремарка]
        if (raw[0] === '[' && raw.length > 1) {
          const tag = parseTag(raw.slice(1, -1));
          if (tag.kind === 'pause') push({ type: 'pause', size: tag.size, seconds: tag.seconds, src: start });
          else if (tag.kind === 'stop') { push({ type: 'stop', src: start }); newSentence = true; }
          else if (tag.kind === 'speed') speedStack.push(tag.factor);
          else if (tag.kind === 'speedEnd') speedStack.pop();
          else if (tag.kind === 'normal') speedStack = [];
          else if (tag.text) pendingCue = pendingCue ? pendingCue + ' · ' + tag.text : tag.text;
          continue;
        }

        // / // /// — паузы
        if (/^\/+$/.test(raw)) {
          push({ type: 'pause', size: raw.length === 1 ? 'short' : raw.length === 2 ? 'medium' : 'long', src: start });
          continue;
        }

        const startsEmph = /^[«"“„'(]*\*/.test(raw);
        const endsEmph = /\*[»"”’')\].,!?…:;—–-]*$/.test(raw);
        const word = raw.replace(/\*/g, '');
        if (!word) { emph = !emph; continue; }

        // Отдельно стоящая пунктуация («—», «?!») приклеивается к предыдущему слову
        if (!LETTER.test(word)) {
          if (lastWord && tokens[tokens.length - 1] === lastWord) {
            lastWord.text += /^[—–-]+$/.test(word) ? ' ' + word : word;
            lastWord.punct = Math.max(lastWord.punct, trailingPunct(lastWord.text));
            lastWord.srcEnd = start + raw.length;
            if (lastWord.punct === SENTENCE_UNITS) newSentence = true;
          }
          continue;
        }

        if (startsEmph) emph = true;
        const isEmph = emph;
        if (endsEmph) emph = false;

        if (newSentence) { sentence++; newSentence = false; }
        const punct = trailingPunct(word);
        const t = {
          type: 'word', text: word, emph: isEmph, syl: syllables(word), punct,
          speed: speed(), sentence, src: start, srcEnd: start + raw.length,
        };
        push(t);
        lastWord = t;
        wordCount++;
        if (punct === SENTENCE_UNITS) newSentence = true;
      }
    }

    return { tokens, sections, wordCount, sentenceCount: sentence + 1 };
  }

  /** Токены → кадры. chunk — сколько слов показывать за раз (1–3). */
  function buildFrames(parsed, chunk) {
    const { tokens, sections } = parsed;
    const frames = [];
    let cur = null;
    tokens.forEach((t, i) => {
      if (t.type === 'word') {
        const prev = cur && cur.words[cur.words.length - 1];
        const join = cur && cur.words.length < chunk && !t.cue && prev.sentence === t.sentence && !prev.punct;
        if (join) cur.words.push(t);
        else {
          cur = { type: 'words', words: [t], cue: t.cue, sentence: t.sentence, token: i, src: t.src };
          frames.push(cur);
        }
      } else {
        cur = null;
        frames.push(Object.assign({ token: i }, t));
      }
    });

    let s = -1;
    let sentence = -1;
    for (const f of frames) {
      while (s + 1 < sections.length && sections[s + 1].token <= f.token) s++;
      f.section = s;
      if (f.type === 'words') sentence = f.sentence;
      else f.sentence = sentence;
    }
    return frames;
  }

  function wordUnits(w, settings) {
    const len = settings.lengthAware ? clamp(0.55 + 0.2 * w.syl, 0.75, 2.4) : 1;
    return len * (w.emph ? EMPH_FACTOR : 1);
  }

  function wordMs(w, settings) {
    const base = 60000 / settings.wpm;
    return (wordUnits(w, settings) + w.punct * settings.punctFactor) * base / w.speed;
  }

  function frameMs(f, settings) {
    if (f.type === 'words') return f.words.reduce((a, w) => a + wordMs(w, settings), 0);
    if (f.type === 'pause') {
      if (f.para) return PARA_UNITS * settings.punctFactor * (60000 / settings.wpm) / f.speed;
      return 1000 * (f.seconds != null ? f.seconds : settings.pauses[f.size]);
    }
    return 0;
  }

  function orpIndex(len) {
    if (len <= 1) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    if (len <= 13) return 3;
    return 4;
  }

  /** Делит слово на части вокруг буквы фокуса (ORP). */
  function splitOrp(text) {
    const chars = Array.from(text);
    const first = chars.findIndex((c) => LETTER.test(c));
    if (first < 0) return { pre: '', pivot: text, post: '' };
    let last = first;
    for (let i = first; i < chars.length && !/\s/.test(chars[i]); i++) if (LETTER.test(chars[i])) last = i;
    const i = first + orpIndex(last - first + 1);
    return { pre: chars.slice(0, i).join(''), pivot: chars[i], post: chars.slice(i + 1).join('') };
  }

  const api = { parse, parseTag, buildFrames, frameMs, wordMs, splitOrp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Sufler = api;
})(typeof window !== 'undefined' ? window : globalThis);
