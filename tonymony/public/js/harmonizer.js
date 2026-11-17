/* ============================================================
   harmonizer.js: writes the other three parts for a given soprano
   or bass line, using the Roman numerals under it. No DOM.

   harmonize(score, {given: "S" | "B", count: 3})
     → { solutions: [{score, cost, check, auto}], problems: [text] }

   Every chord gets a list of voicings that satisfy the static rules
   (ranges, spacing, no crossing, complete chord, doubling). A k-best
   Viterbi search then strings voicings together, with rule breaks
   (parallels, augmented leaps, overlap, cross relations) as huge
   costs and smooth, conventional voice leading as small ones.
   Notes with no numeral get a diatonic chord picked for them.
   ============================================================ */

const HARD = 1000;
const MAX_VOICINGS = 160;   // per chord step, best static cost first
const K_BEST = 6;           // paths kept per voicing

function notesInRange(p, v) {
  const [lo, hi] = RANGE_MIDI[v], out = [];
  for (let o = 1; o <= 6; o++) {
    const n = { l: p.l, a: p.a, o }, m = noteMidi(n);
    if (m >= lo && m <= hi) out.push(n);
  }
  return out;
}

// Chords to try for one step of the given line.
function stepCandidates(score, key, given, ev, start) {
  const text = score.numerals[start];
  if (text) {
    const c = parseNumeral(text, key);
    return c && !c.error ? [{ label: text, chord: c, auto: false, cost: 0 }] : { error: c ? c.error : "empty numeral" };
  }
  const out = [];
  diatonicNumerals(key, false).forEach(label => {
    ["", "6"].forEach(fig => {
      const lab = label + fig, c = parseNumeral(lab, key);
      if (!c || c.error || c.quality === "A" || !findTone(c, ev.n)) return;
      if (given === "B" && findTone(c, ev.n).role !== c.bassRole) return;
      if (c.quality === "d" && fig === "") return;   // diminished triads in first inversion only
      out.push({ label: lab, chord: c, auto: true, cost: (fig ? 1 : 0) + (c.degree === 2 ? 1.5 : 0) });   // iii is rarer
    });
  });
  return out;
}

// Static cost of a 4-note voicing of a chord (HARD or more = not allowed).
function staticCost(chord, notes, given) {
  const tones = notes.map(n => findTone(chord, n));
  const count = r => tones.filter(t => t && t.role === r).length;
  let cost = 0;
  for (const t of chord.tones) {
    if (count(t.role) || !toneRequired(chord, t.role)) continue;
    if (t.role === "5" && chord.kind === "tertian" && count("1") >= 2) cost += chord.seventh ? 2 : 3;
    else return HARD * 2;
  }
  if (tones.filter(t => t && t.lt).length > 1) return HARD * 2;
  if (count("7") > 1 || count("b6") > 1 || count("#4") > 1) return HARD * 2;
  if (chord.kind === "tertian" && !chord.seventh) {
    const dbl = ["1", "3", "5"].find(r => count(r) >= 2);
    const inv = chord.inversion;
    if (inv === 0) cost += { "1": 0, "5": 1.5, "3": chord.quality === "M" ? 4 : 2 }[dbl] || 0;
    else if (inv === 1) cost += { "1": 0.5, "5": 0.5, "3": chord.quality === "d" ? 0 : chord.quality === "M" ? 3 : 1.5 }[dbl] || 0;
    else cost += dbl === "5" ? 0 : 4;
  }
  const m = notes.map(noteMidi);
  for (let i = 0; i < 3; i++) if (m[i] === m[i + 1]) cost += 2;
  // Stay in the comfortable middle of each range.
  VOICES.forEach((v, i) => {
    if (v === given) return;
    const [lo, hi] = RANGE_MIDI[v], pad = (hi - lo) * 0.2;
    if (m[i] < lo + pad) cost += 0.3 * (lo + pad - m[i]);
    if (m[i] > hi - pad) cost += 0.3 * (m[i] - hi + pad);
  });
  return cost;
}

function voicingsFor(cand, given, gNote) {
  const { chord } = cand;
  const options = v => {
    if (v === given) return [gNote];
    const tones = v === "B" ? chord.tones.filter(t => t.role === chord.bassRole) : chord.tones;
    return tones.flatMap(t => notesInRange(t, v));
  };
  const out = [];
  for (const b of options("B")) for (const t of options("T")) {
    const mb = noteMidi(b), mt = noteMidi(t);
    if (mt < mb || mt - mb > 24) continue;
    for (const a of options("A")) {
      const ma = noteMidi(a);
      if (ma < mt || ma - mt > 12) continue;
      for (const s of options("S")) {
        const ms = noteMidi(s);
        if (ms < ma || ms - ma > 12) continue;
        const notes = [s, a, t, b];
        const cost = staticCost(chord, notes, given) + cand.cost;
        if (cost >= HARD) continue;
        out.push({ notes, midi: notes.map(noteMidi), step: notes.map(noteStep), cost, cand });
      }
    }
  }
  return out.sort((x, y) => x.cost - y.cost).slice(0, MAX_VOICINGS);
}

// Cost of moving from voicing p to voicing q.
function transitionCost(p, q, given) {
  let cost = 0;
  const d = [0, 1, 2, 3].map(i => q.midi[i] - p.midi[i]);
  const gi = VOICES.indexOf(given);

  for (let i = 0; i < 4; i++) {
    const iv = interval(p.notes[i], q.notes[i]);
    if (iv.steps > 0 && iv.quality[0] === "A") cost += HARD;
    if (i === gi) continue;
    if (iv.simple === 6 && iv.steps < 7) cost += 8;   // 7th leap
    const a = Math.abs(d[i]);
    if (a > 12) cost += i === 3 ? 6 : HARD;
    cost += a * (i === 3 ? 0.4 : 1) + (i === 1 || i === 2 ? Math.max(0, a - 4) * 1.5 : 0);
    if (i === 0 && a > 7) cost += 3;
  }

  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    if (!d[i] || !d[j]) continue;
    const i1 = interval(p.notes[i], p.notes[j]), i2 = interval(q.notes[i], q.notes[j]);
    const same = Math.sign(d[i]) === Math.sign(d[j]);
    for (const is of [isPerfectFifth, isPerfectOctave]) {
      if (is(i1) && is(i2)) cost += same ? HARD : 12;
      else if (i === 0 && j === 3 && same && is(i2) && Math.abs(d[0]) > 2) cost += 5;
    }
  }
  if (Math.sign(d[0]) && Math.sign(d[0]) === -Math.sign(d[3])) cost -= 0.5;   // contrary outer voices

  for (let i = 0; i < 3; i++) {
    if (q.midi[i] < p.midi[i + 1] || q.midi[i + 1] > p.midi[i]) cost += HARD;
  }

  // Cross relations
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    if (i === j) continue;
    const a = p.notes[j], b = q.notes[i];
    if (a.l !== b.l || a.a === b.a) continue;
    const inOne = [0, 1, 2, 3].some(x => samePc(p.notes[x], a) && samePc(q.notes[x], b));
    if (!inOne) cost += HARD;
  }

  // Tendency tones (only when the chord changes)
  const pc = p.cand.chord, qc = q.cand.chord;
  if (p.cand !== q.cand) {
    const tonic = pc.key.tonic;
    for (let i = 0; i < 4; i++) {
      const t = findTone(pc, p.notes[i]);
      if (!t) continue;
      const steps = q.step[i] - p.step[i];
      if (pc.extended && t.role === "7" && !(steps === -1 && d[i] === -2)) cost += 8;
      else if (pc.extended && t.role === "3" && !(steps === 1 && d[i] === 1)) cost += 8;
      else if (t.role === "7" && !(steps === -1 || d[i] === 0)) cost += 8;
      else if (t.lt && (i === 0 || i === 3) && findTone(qc, tonic) && !(steps === 1 && samePc(q.notes[i], tonic))) cost += 8;
      else if (t.role === "b6" && d[i] !== -1) cost += 8;
      else if (t.role === "#4" && d[i] !== 1) cost += 8;
    }
    if (p.cand.auto || q.cand.auto) cost += progressionCost(pc, qc);
  }
  return cost;
}

// How natural a progression is, by scale degree (row = from, column = to),
// used when TonyMony picks the chords: tonic → predominant → dominant → tonic.
const PROGRESSION = [
  //  I    ii   iii  IV   V    vi   vii
  [2,   0.5, 1.5, 0,   0,   0.5, 1],    // I
  [3,   2,   4,   3,   0,   3,   0.5],  // ii
  [2,   3,   2,   0.5, 2,   0.5, 4],    // iii
  [0.5, 0.5, 4,   2,   0,   3,   0.5],  // IV
  [0,   4,   3,   4,   1.5, 0.5, 1],    // V
  [2,   0,   3,   0,   1,   2,   4],    // vi
  [0,   4,   4,   4,   1,   2,   2],    // vii
];
function progressionCost(a, b) {
  if (a.kind !== "tertian" || b.kind !== "tertian") return 0;
  return PROGRESSION[a.degree][b.degree];
}

function harmonize(score, opts) {
  const given = (opts && opts.given) || "S";
  const want = (opts && opts.count) || 3;
  const key = scoreKey(score);
  const problems = [];
  const events = voiceEvents(score, given);
  const steps = events.filter(e => !e.ev.r);
  if (!steps.length) return { solutions: [], problems: [`Write a ${VOICE_NAMES[given].toLowerCase()} line first.`] };

  // Voicings per step
  const layers = [];
  for (let si = 0; si < steps.length; si++) {
    const e = steps[si];
    const where = positionText(score, e.start);
    let cands = stepCandidates(score, key, given, e.ev, e.start);
    if (cands.error) { problems.push(`${where}: can't read "${score.numerals[e.start]}": ${cands.error}.`); return { solutions: [], problems }; }
    if (!cands.length) { problems.push(`${where}: no diatonic chord contains ${noteName(e.ev.n)}. Write a numeral there.`); return { solutions: [], problems }; }
    if (cands.some(c => c.auto)) {
      if (si === 0) cands.forEach(c => { if (c.chord.degree !== 0 || c.chord.inversion) c.cost += 2; });
      if (si === steps.length - 1) cands.forEach(c => { if (c.chord.degree !== 0 || c.chord.inversion) c.cost += 6; });
      if (si === steps.length - 2) cands.forEach(c => { if (c.chord.degree !== 4 && c.chord.degree !== 6) c.cost += 2; });
    } else {
      const c = cands[0].chord, tone = findTone(c, e.ev.n);
      if (!tone) problems.push(`${where}: ${noteName(e.ev.n)} isn't in ${cands[0].label} (${chordToneList(c)}), so the result will break the rules there.`);
      else if (given === "B" && tone.role !== c.bassRole) problems.push(`${where}: ${noteName(e.ev.n)} is the ${roleWord(tone.role)} of ${cands[0].label}, but the figure asks for the ${roleWord(c.bassRole)} in the bass.`);
    }
    const vs = cands.flatMap(c => voicingsFor(c, given, e.ev.n)).sort((a, b) => a.cost - b.cost).slice(0, MAX_VOICINGS);
    if (!vs.length) {
      problems.push(`${where}: there's no way to voice ${cands.map(c => c.label).join(" / ")} with ${noteName(e.ev.n)} in the ${VOICE_NAMES[given].toLowerCase()} inside the voice ranges and spacing rules.`);
      return { solutions: [], problems };
    }
    layers.push(vs);
  }

  // k-best Viterbi
  let prev = layers[0].map(v => [{ cost: v.cost, back: null }]);
  const tables = [prev];
  for (let i = 1; i < layers.length; i++) {
    const cur = layers[i].map(q => {
      const cands = [];
      layers[i - 1].forEach((p, pi) => {
        const tc = transitionCost(p, q, given) + q.cost;
        prev[pi].forEach((entry, k) => cands.push({ cost: entry.cost + tc, back: [pi, k] }));
      });
      cands.sort((a, b) => a.cost - b.cost);
      return cands.slice(0, K_BEST);
    });
    tables.push(cur);
    prev = cur;
  }

  const finals = [];
  prev.forEach((list, vi) => list.forEach((entry, k) => finals.push({ cost: entry.cost, vi, k })));
  finals.sort((a, b) => a.cost - b.cost);

  // Pick answers that really differ: first ones that change at least half the
  // steps' notes (or chords) from every answer so far, then fill up with any.
  const trace = f => {
    const path = [];
    let vi = f.vi, k = f.k;
    for (let i = layers.length - 1; i >= 0; i--) {
      path[i] = layers[i][vi];
      const back = tables[i][vi][k].back;
      if (back) [vi, k] = back;
    }
    return { path, cost: f.cost };
  };
  // Rule-breaking answers only when there's no clean one at all.
  let traced = finals.slice(0, 400).map(trace);
  if (traced.some(p => p.cost < HARD)) traced = traced.filter(p => p.cost < HARD);
  const diff = (x, y) => x.path.filter((v, i) => v.cand.label !== y.path[i].cand.label ||
    [0, 1, 2, 3].some(j => v.midi[j] !== y.path[i].midi[j] && v.midi[j] % 12 !== y.path[i].midi[j] % 12)).length;
  const paths = [];
  [Math.max(1, Math.ceil(steps.length / 2)), 1].forEach(min => {
    for (const p of traced) {
      if (paths.length >= want) return;
      if (!paths.includes(p) && paths.every(q => diff(p, q) >= min)) paths.push(p);
    }
  });
  paths.sort((a, b) => a.cost - b.cost);

  const solutions = paths.map(({ path, cost }) => {
    const out = emptyScore({ tonic: score.tonic, scale: score.scale, time: score.time.slice(), numerals: {} });
    Object.keys(score.numerals).forEach(t => { if (score.numerals[t]) out.numerals[t] = score.numerals[t]; });
    let si = 0, lastAuto = null;
    events.forEach(e => {
      if (e.ev.r) { VOICES.forEach(v => out.voices[v].push({ d: e.ev.d, r: true })); return; }
      const vc = path[si++];
      VOICES.forEach((v, i) => out.voices[v].push({ d: e.ev.d, n: Object.assign({}, vc.notes[i]) }));
      if (vc.cand.auto && vc.cand.label !== lastAuto) out.numerals[e.start] = vc.cand.label;
      lastAuto = vc.cand.auto ? vc.cand.label : null;
    });
    return { score: out, cost: Math.round(cost * 10) / 10, check: checkScore(out), auto: path.some(v => v.cand.auto) };
  });
  return { solutions, problems };
}
