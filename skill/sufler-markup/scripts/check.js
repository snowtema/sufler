#!/usr/bin/env node
/*
 * Проверка разметки для Суфлёра.
 *   node check.js marked.txt [--original orig.txt] [--wpm 140] [--target 2:00]
 * Печатает длительность, статистику и предупреждения. Код выхода 1 — есть ошибки
 * (слова разошлись с оригиналом, незакрытые [SLOW]/[FAST]/[SPEED]).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require(path.join(__dirname, 'parser.js'));

const args = process.argv.slice(2);
const opt = { wpm: 140 };
const rest = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--original') opt.original = args[++i];
  else if (args[i] === '--wpm') opt.wpm = Number(args[++i]);
  else if (args[i] === '--target') opt.target = args[++i];
  else rest.push(args[i]);
}
if (!rest.length) {
  console.error('Использование: node check.js <размеченный.txt | -> [--original исходный.txt] [--wpm 140] [--target 2:00]');
  process.exit(2);
}
const read = (f) => fs.readFileSync(f === '-' ? 0 : f, 'utf8');
const text = read(rest[0]);

const settings = (wpm) => ({ wpm, lengthAware: true, punctFactor: 1, pauses: { short: 0.5, medium: 1, long: 2 } });
const parsed = P.parse(text);
const frames = P.buildFrames(parsed, 1);
const totalMs = (wpm) => frames.reduce((a, f) => a + P.frameMs(f, settings(wpm)), 0);
const plural = (n, f) => { const a = n % 10, b = n % 100; return f[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 1 : 2]; };
const clock = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

const errors = [];
const warnings = [];
const words = parsed.tokens.filter((t) => t.type === 'word');

// ——— Статистика ———
const manualPauses = parsed.tokens.filter((t) => t.type === 'pause' && !t.para).length;
const stops = parsed.tokens.filter((t) => t.type === 'stop').length;
const emphWords = words.filter((w) => w.emph).length;
const cues = parsed.tokens.filter((t) => t.cue).map((t) => t.cue);

// ——— Теги скорости и ремарки (по исходнику, строки-разделы пропускаем) ———
const body = text.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
const stack = [];
for (const m of body.matchAll(/\[([^\]\n]*)\]/g)) {
  const tag = P.parseTag(m[1]);
  if (tag.kind === 'speed') stack.push({ raw: m[0], name: tag.name });
  else if (tag.kind === 'speedEnd') {
    const open = stack.pop();
    if (!open) errors.push(`Лишний закрывающий тег ${m[0]}: открывающего нет`);
    else if (open.name !== tag.name) errors.push(`${open.raw} закрыт тегом ${m[0]}: теги должны совпадать`);
  }
  else if (tag.kind === 'cue') {
    const t = tag.text;
    if (/^[\/A-Z0-9 _.:=-]+$/.test(t) && /[A-Z]/.test(t)) warnings.push(`Ремарка «${t}» похожа на опечатку в команде — она не выполнится, а покажется над словом`);
    else if (t.length > 40) warnings.push(`Ремарка «${t.slice(0, 40)}…» длинная — над словом её не успеть прочитать, лучше 1–3 слова`);
  }
}
for (const open of stack) errors.push(`Не закрыт ${open.raw}: замедление или ускорение продлится до конца текста`);

// ——— Акценты ———
const stars = (body.replace(/\[[^\]\n]*\]/g, '').match(/\*/g) || []).length;
if (stars % 2) warnings.push('Нечётное число звёздочек — где-то акцент не закрыт');
let run = 0, maxRun = 0;
for (const w of words) {
  if (w.emph) { run++; maxRun = Math.max(maxRun, run); } else { run = 0; }
}
if (maxRun > 6) warnings.push(`Акцент растянулся на ${maxRun} слов подряд — выделяйте ключевое слово, а не фразу`);
if (words.length >= 30 && emphWords / words.length > 0.12) warnings.push(`Акцентов слишком много: ${emphWords} из ${words.length} слов. Когда выделено всё — не выделено ничего`);

// ——— Места без вдоха ———
let stretch = [];
const flush = () => {
  if (stretch.length > 22) warnings.push(`${stretch.length} ${plural(stretch.length, ['слово', 'слова', 'слов'])} подряд без паузы и знаков: «${stretch.slice(0, 6).map((w) => w.text).join(' ')}…» — поставьте / там, где можно вдохнуть`);
  stretch = [];
};
for (const t of parsed.tokens) {
  if (t.type === 'word') { stretch.push(t); if (t.punct) flush(); } else flush();
}
flush();

// ——— Особенности показа по одному слову ———
const splitNums = text.match(/\d[  ]\d{3}(?!\d)/g);
if (splitNums) warnings.push(`Числа с пробелами (${[...new Set(splitNums)].slice(0, 3).join(', ')}) покажутся по частям, как отдельные слова. Лучше словами или сокращённо («2,5 млн»)`);
const longWords = words.filter((w) => w.text.replace(/[^\p{L}\p{N}]/gu, '').length > 18).map((w) => w.text);
if (longWords.length) warnings.push(`Очень длинные слова (${longWords.slice(0, 3).join(', ')}) — шрифт на них уменьшится`);

// ——— Сверка слов с оригиналом ———
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]/gu, '');
function wordList(src) {
  return P.parse(src).tokens.filter((t) => t.type === 'word').map((t) => norm(t.text)).filter(Boolean);
}
function diff(a, b) {
  const n = a.length, m = b.length;
  if (n * m > 30e6) return null;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const hunks = [];
  let i = 0, j = 0, del = [], add = [], at = 0;
  const push = () => { if (del.length || add.length) hunks.push({ at, del, add }); del = []; add = []; };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { push(); i++; j++; at = i; }
    else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) add.push(b[j++]);
    else del.push(a[i++]);
  }
  push();
  return hunks;
}
if (opt.original) {
  const a = wordList(read(opt.original));
  const b = words.map((w) => norm(w.text)).filter(Boolean);
  const hunks = diff(a, b);
  if (hunks === null) {
    if (a.join(' ') !== b.join(' ')) errors.push('Слова отличаются от оригинала (текст слишком длинный для подробного сравнения)');
  } else if (hunks.length) {
    errors.push(`Слова отличаются от оригинала в ${hunks.length} местах:`);
    for (const h of hunks.slice(0, 12)) {
      const ctx = a.slice(Math.max(0, h.at - 3), h.at).join(' ');
      const what = h.del.length && h.add.length ? `«${h.del.join(' ')}» → «${h.add.join(' ')}»`
        : h.del.length ? `пропущено «${h.del.join(' ')}»` : `добавлено «${h.add.join(' ')}»`;
      errors.push(`   после «…${ctx}»: ${what}`);
    }
  }
}

// ——— Вывод ———
const out = [];
out.push(`Слов: ${words.length}, предложений: ${parsed.sentenceCount}, разделов: ${parsed.sections.length}${parsed.sections.length ? ' (' + parsed.sections.map((s) => s.title).join(' / ') + ')' : ''}`);
out.push(`Пауз вручную: ${manualPauses}, стопов: ${stops}, слов с акцентом: ${emphWords}, ремарок: ${cues.length}`);
out.push(`Длительность при ${opt.wpm} сл/мин: ${clock(totalMs(opt.wpm))}${stops ? ' + время на стопах' : ''}  (при 120: ${clock(totalMs(120))}, при 160: ${clock(totalMs(160))})`);

if (opt.target) {
  const tm = opt.target.includes(':') ? opt.target.split(':').reduce((a, v) => a * 60 + Number(v), 0) * 1000 : Number(opt.target) * 1000;
  if (totalMs(400) > tm) out.push(`Цель ${clock(tm)}: не уложиться даже на 400 сл/мин — нужно сокращать текст или паузы`);
  else if (totalMs(60) < tm) out.push(`Цель ${clock(tm)}: текст короче даже на 60 сл/мин`);
  else {
    let lo = 60, hi = 400;
    for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (totalMs(mid) > tm) lo = mid; else hi = mid; }
    const need = Math.round(hi / 5) * 5;
    out.push(`Цель ${clock(tm)}: скорость ≈ ${need} сл/мин${need > 180 ? ' — это быстро для речи, лучше сократить текст' : ''}`);
  }
}
if (cues.length) out.push(`Ремарки: ${cues.map((c) => `[${c}]`).join(' ')}`);
if (errors.length) { out.push('', 'ОШИБКИ:'); errors.forEach((e) => out.push('  ' + e)); }
if (warnings.length) { out.push('', 'Предупреждения:'); warnings.forEach((w) => out.push('  • ' + w)); }
if (!errors.length && !warnings.length) out.push('', 'Замечаний нет.');
console.log(out.join('\n'));
process.exit(errors.length ? 1 : 0);
