/* ============================================================
   score.js: the score model. No DOM.

   score = {
     tonic: {l, a}, scale: "major", time: [4, 4],
     voices: { S: [event…], A: […], T: […], B: […] },
     numerals: { "<tick>": "V65" }     // Roman numeral at a beat
   }
   event = { d: <ticks>, n: {l, a, o} }   (a note)
         | { d: <ticks>, r: true }        (a rest)
   ============================================================ */

const TPQ = 48;   // ticks per quarter note
const DURATIONS = [
  { id: "w", ticks: 192, name: "Whole" },
  { id: "h", ticks: 96, name: "Half" },
  { id: "q", ticks: 48, name: "Quarter" },
  { id: "e", ticks: 24, name: "Eighth" },
  { id: "s", ticks: 12, name: "16th" },
];

function emptyScore(over) {
  return Object.assign({ tonic: { l: 0, a: 0 }, scale: "major", time: [4, 4], voices: { S: [], A: [], T: [], B: [] }, numerals: {} }, over || {});
}
function scoreKey(score) { return { tonic: score.tonic, scale: score.scale }; }
function cloneScore(score) { return JSON.parse(JSON.stringify(score)); }

// Base duration and whether it's dotted, from ticks.
function splitDuration(ticks) {
  for (const d of DURATIONS) {
    if (ticks === d.ticks) return { base: d, dots: 0 };
    if (ticks === d.ticks * 1.5) return { base: d, dots: 1 };
  }
  // Unusual length: show the nearest shorter value.
  return { base: DURATIONS.find(d => d.ticks <= ticks) || DURATIONS[DURATIONS.length - 1], dots: 0 };
}

function measureTicks(score) { return score.time[0] * (4 * TPQ / score.time[1]); }

// Events of a voice with start/end ticks.
function voiceEvents(score, v) {
  let t = 0;
  return score.voices[v].map((ev, idx) => { const e = { ev, idx, start: t, end: t + ev.d }; t += ev.d; return e; });
}
function voiceLength(score, v) { return score.voices[v].reduce((s, e) => s + e.d, 0); }
function scoreLength(score) {
  const n = Math.max(0, ...VOICES.map(v => voiceLength(score, v)));
  const lastNumeral = Math.max(-1, ...Object.keys(score.numerals).map(Number));
  return Math.max(n, lastNumeral + 1);
}
function measureCount(score) { return Math.max(1, Math.ceil(scoreLength(score) / measureTicks(score))); }

// Every tick where some voice starts an event, plus numeral ticks.
function onsetTicks(score) {
  const s = new Set();
  VOICES.forEach(v => voiceEvents(score, v).forEach(e => s.add(e.start)));
  Object.keys(score.numerals).forEach(t => { if (score.numerals[t]) s.add(+t); });
  return [...s].sort((a, b) => a - b);
}

// What each voice is doing at a tick: {ev, idx, start, attacked} or null.
function voiceAt(score, v, tick) {
  for (const e of voiceEvents(score, v)) {
    if (e.start <= tick && tick < e.end) return Object.assign(e, { attacked: e.start === tick });
  }
  return null;
}

// Roman numeral in force at a tick: the latest one at or before it.
function numeralAt(score, tick) {
  let best = null;
  for (const k of Object.keys(score.numerals)) {
    const t = +k;
    if (score.numerals[k] && t <= tick && (best === null || t > best.tick)) best = { tick: t, text: score.numerals[k] };
  }
  return best;
}

// Vertical slices: one per onset tick, with each voice's sounding note.
function sonorities(score) {
  return onsetTicks(score).map(tick => {
    const notes = {};
    VOICES.forEach(v => {
      const e = voiceAt(score, v, tick);
      notes[v] = e && !e.ev.r ? { n: e.ev.n, idx: e.idx, attacked: e.attacked, start: e.start, end: e.end } : null;
    });
    return { tick, notes, numeral: numeralAt(score, tick) };
  });
}

// "bar 3, beat 2" style position text.
function positionText(score, tick) {
  const mt = measureTicks(score), beat = 4 * TPQ / score.time[1];
  const bar = Math.floor(tick / mt) + 1;
  const b = (tick % mt) / beat + 1;
  return `bar ${bar}, beat ${Number.isInteger(b) ? b : b.toFixed(2).replace(/0+$/, "")}`;
}

// Build a score from compact text, for examples and tests:
// scoreFromText({key: "C", scale: "major", time: [4, 4],
//   S: "E5 F5 D5/h r", …, numerals: ["I", "IV", "", "V"]})
// A token is a note (C#4) or "r", with an optional /w /h /q /e /s duration
// (default quarter) and "." for dotted. Numerals go one per event of
// numeralsOn (the bass by default), "" to skip.
function scoreFromText(o) {
  const ticks = { w: 192, h: 96, q: 48, e: 24, s: 12 };
  const ev = tok => {
    const [p, du = "q"] = tok.split("/");
    const d = ticks[du[0]] * (du.endsWith(".") ? 1.5 : 1);
    return p === "r" ? { d, r: true } : { d, n: parseNote(p) };
  };
  const line = s => (s && s.trim() ? s.trim().split(/\s+/).map(ev) : []);
  const t = parseNote(o.key || "C");
  const sc = emptyScore({ tonic: { l: t.l, a: t.a }, scale: o.scale || "major", time: o.time || [4, 4] });
  VOICES.forEach(v => { sc.voices[v] = line(o[v]); });
  const nums = o.numerals || [];
  voiceEvents(sc, o.numeralsOn || "B").forEach((e, i) => { if (nums[i]) sc.numerals[e.start] = nums[i]; });
  return sc;
}

// Basic sanity for a loaded score (from storage or an import).
function validScore(s) {
  try {
    if (!s || !s.voices || !s.time || !s.tonic || !SCALES[s.scale]) return false;
    return VOICES.every(v => Array.isArray(s.voices[v]) && s.voices[v].every(e => e.d > 0 && (e.r || (e.n && e.n.l >= 0 && e.n.l < 7))));
  } catch (err) { return false; }
}
