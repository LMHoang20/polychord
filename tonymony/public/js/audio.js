/* ============================================================
   audio.js: plays a score on piano through the Web Audio API.
   Recordings: assets/piano/<midi>.mp3, one every 3 semitones from
   C2 to C7 (see assets/piano/CREDITS.txt); notes in between are
   the nearest recording re-pitched. Falls back to a soft synth.
   ============================================================ */

const SAMPLE_LOW = 36, SAMPLE_HIGH = 96, SAMPLE_STEP = 3;
let audioCtx = null, pianoBuffers = null, pianoLoading = null;
let playing = [];   // {src, gain}
let playTimer = null;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function loadPiano() {
  if (pianoBuffers || pianoLoading) return pianoLoading || Promise.resolve();
  const Decoder = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Decoder || typeof fetch !== "function") return Promise.resolve();
  const dec = new Decoder(1, 1, 44100), notes = [];
  for (let m = SAMPLE_LOW; m <= SAMPLE_HIGH; m += SAMPLE_STEP) notes.push(m);
  pianoLoading = Promise.all(notes.map(m => fetch(`assets/piano/${m}.mp3`)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(d => new Promise((ok, fail) => dec.decodeAudioData(d, ok, fail)))))
    .then(bufs => { pianoBuffers = Object.fromEntries(notes.map((m, i) => [m, bufs[i]])); })
    .catch(err => console.warn("Piano recordings didn't load, using the synth", err))
    .finally(() => { pianoLoading = null; });
  return pianoLoading;
}

function playNote(ctx, out, midi, start, dur) {
  const gain = ctx.createGain();
  const level = pianoBuffers ? 0.45 : 0.12;
  let src;
  if (pianoBuffers) {
    const m = Math.min(SAMPLE_HIGH, Math.max(SAMPLE_LOW, SAMPLE_LOW + Math.round((midi - SAMPLE_LOW) / SAMPLE_STEP) * SAMPLE_STEP));
    src = ctx.createBufferSource();
    src.buffer = pianoBuffers[m];
    src.playbackRate.value = Math.pow(2, (midi - m) / 12);
    gain.gain.setValueAtTime(level, start);
  } else {
    src = ctx.createOscillator();
    src.type = "triangle";
    src.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.015);
  }
  gain.gain.setValueAtTime(level, start + dur);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.35);
  src.connect(gain); gain.connect(out);
  src.start(start); src.stop(start + dur + 0.4);
  const item = { src, gain };
  playing.push(item);
  src.onended = () => { playing = playing.filter(x => x !== item); };
}

function stopScore() {
  clearTimeout(playTimer);
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  playing.forEach(({ src, gain }) => {
    try { gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0.0001, now, 0.02); src.stop(now + 0.1); } catch (err) { /* already stopped */ }
  });
  playing = [];
}

// Play every voice of a score. onEnd runs when it finishes (or is stopped early, not at all).
async function playScore(score, bpm, onEnd) {
  stopScore();
  const ctx = getAudio();
  await loadPiano();
  const out = ctx.createGain();
  out.gain.value = 0.8;
  out.connect(ctx.destination);
  const sec = 60 / bpm / TPQ;
  const t0 = ctx.currentTime + 0.08;
  let end = 0;
  VOICES.forEach(v => voiceEvents(score, v).forEach(e => {
    if (!e.ev.r) playNote(ctx, out, noteMidi(e.ev.n), t0 + e.start * sec, e.ev.d * sec * 0.96);
    end = Math.max(end, e.end * sec);
  }));
  playTimer = setTimeout(() => onEnd && onEnd(), (end + 0.5) * 1000);
}

// A single note or chord, as feedback while writing.
function previewNotes(notes) {
  const ctx = getAudio();
  loadPiano();
  const out = ctx.createGain();
  out.gain.value = 0.6;
  out.connect(ctx.destination);
  notes.forEach(n => playNote(ctx, out, noteMidi(n), ctx.currentTime + 0.02, 0.5));
}
