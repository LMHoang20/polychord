/* ============================================================
   checker.js: checks a 4-part (SATB) score against common-practice
   voice-leading rules. No DOM.

   checkScore(score) → { issues, counts, chords }
   issue = { level: "error" | "warn" | "info", rule, tick, msg,
             marks: [{v, idx}] }   (marks = the notes involved)
   ============================================================ */

const PAIRS = [["S", "A"], ["S", "T"], ["S", "B"], ["A", "T"], ["A", "B"], ["T", "B"]];
const ADJACENT = [["S", "A"], ["A", "T"], ["T", "B"]];
const SPACING = { "S,A": 12, "A,T": 12, "T,B": 24 };   // max semitones between neighbours
const LEVEL_ORDER = { error: 0, warn: 1, info: 2 };

function vn(v) { return VOICE_NAMES[v]; }
function nn(n) { return noteName(n); }
function pairName(a, b) { return `${vn(a)} and ${vn(b)}`; }
function roleWord(role) {
  return { "1": "root", "3": "3rd", "5": "5th", "7": "7th", "9": "9th", "11": "11th", "13": "13th", b6: "♭6", "#4": "♯4", "2": "2nd", b3: "♭3" }[role] || role;
}

function checkScore(score) {
  const key = scoreKey(score);
  const issues = [];
  const add = (level, rule, tick, msg, marks) => issues.push({ level, rule, tick, msg, marks: marks || [] });
  const chords = {};

  // Roman numerals
  Object.keys(score.numerals).forEach(t => {
    const text = score.numerals[t];
    if (!text) return;
    const c = parseNumeral(text, key);
    chords[t] = c;
    if (c && c.error) add("error", "numeral", +t, `Can't read "${text}": ${c.error}.`);
  });
  const chordAt = num => (num && chords[num.tick] && !chords[num.tick].error ? chords[num.tick] : null);

  checkRhythm(score, add);

  const sons = sonorities(score);
  const hasNotes = sons.some(s => VOICES.some(v => s.notes[v]));
  if (hasNotes && !Object.values(score.numerals).some(Boolean)) {
    add("info", "numeral", 0, "Add Roman numerals under the bass to check the chords too. For now only voice leading is checked.");
  }

  sons.forEach((s, i) => {
    const chord = chordAt(s.numeral);
    const onset = s.numeral && s.numeral.tick === s.tick;
    const attacked = v => s.notes[v] && s.notes[v].attacked;
    const mark = v => ({ v, idx: s.notes[v].idx });

    // Crossing and spacing between neighbouring voices
    ADJACENT.forEach(([u, w]) => {
      const a = s.notes[u], b = s.notes[w];
      if (!a || !b || !(a.attacked || b.attacked)) return;
      const gap = noteMidi(a.n) - noteMidi(b.n);
      if (gap < 0) add("error", "crossing", s.tick, `Voice crossing: the ${vn(u)} (${nn(a.n)}) is below the ${vn(w)} (${nn(b.n)}).`, [mark(u), mark(w)]);
      const max = SPACING[u + "," + w];
      if (gap > max) add("error", "spacing", s.tick, `Spacing: ${pairName(u, w)} are ${intervalWords(interval(a.n, b.n))} apart. Keep them within ${max === 12 ? "an octave" : "two octaves"}.`, [mark(u), mark(w)]);
    });

    // Ranges
    VOICES.forEach(v => {
      if (!attacked(v)) return;
      const m = noteMidi(s.notes[v].n), [lo, hi] = RANGE_MIDI[v];
      if (m < lo || m > hi) add("warn", "range", s.tick, `${nn(s.notes[v].n)} is outside the usual ${vn(v)} range (${RANGES[v][0]}–${RANGES[v][1]}).`, [mark(v)]);
    });

    // Chord tones
    if (chord) {
      VOICES.forEach(v => {
        const x = s.notes[v];
        if (!x || !(x.attacked || onset)) return;
        if (findTone(chord, x.n)) return;
        const enh = findTonePc(chord, pcOf(x.n));
        if (enh) { add("warn", "spelling", s.tick, `${vn(v)}: ${nn(x.n)} should be spelled ${pcName(enh)} in ${s.numeral.text} (${chordToneList(chord)}).`, [mark(v)]); return; }
        const prev = prevNote(score, v, x), next = nextNote(score, v, x);
        const step = y => y && Math.abs(noteStep(y.n) - noteStep(x.n)) === 1;
        if (onset) {
          // A held note that then steps down into the chord is a suspension.
          const suspension = !x.attacked && next && noteStep(next.n) === noteStep(x.n) - 1 && findTone(chord, next.n);
          if (!suspension) add("error", "chord-tone", s.tick, `${vn(v)}: ${nn(x.n)} isn't in ${s.numeral.text} (${chordToneList(chord)}).`, [mark(v)]);
        } else if (!(step(prev) && step(next))) {
          add("warn", "chord-tone", s.tick, `${vn(v)}: ${nn(x.n)} isn't in ${s.numeral.text} (${chordToneList(chord)}), and it isn't a passing or neighbour tone.`, [mark(v)]);
        }
      });

      if (onset && VOICES.every(v => s.notes[v])) checkChord(s, chord, add, mark);
    }

    if (i > 0) checkMotion(sons[i - 1], s, chordAt(sons[i - 1].numeral), chord, add);
  });

  issues.sort((a, b) => a.tick - b.tick || LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  const counts = { error: 0, warn: 0, info: 0 };
  issues.forEach(x => counts[x.level]++);
  return { issues, counts, chords };
}

function prevNote(score, v, x) {
  const ev = score.voices[v][x.idx - 1];
  return ev && !ev.r ? { n: ev.n } : null;
}
function nextNote(score, v, x) {
  const ev = score.voices[v][x.idx + 1];
  return ev && !ev.r ? { n: ev.n } : null;
}

// Every note longer than the bar, notes across bar lines, voices of unequal length.
function checkRhythm(score, add) {
  const mt = measureTicks(score);
  const lens = Object.fromEntries(VOICES.map(v => [v, voiceLength(score, v)]));
  const longest = Math.max(...Object.values(lens));
  const across = new Map();   // start tick → marks of events crossing a bar line
  VOICES.forEach(v => voiceEvents(score, v).forEach(e => {
    if (Math.floor(e.start / mt) === Math.floor((e.end - 1) / mt)) return;
    if (!across.has(e.start)) across.set(e.start, []);
    across.get(e.start).push({ v, idx: e.idx });
  }));
  across.forEach((marks, t) => {
    const who = marks.length === 4 ? "Every part" : marks.map(m => `the ${vn(m.v)}`).join(", ").replace(/^t/, "T");
    add("warn", "rhythm", t, `${who}: this runs across the bar line. Shorten it so each bar adds up to ${score.time[0]}/${score.time[1]}.`, marks);
  });
  VOICES.forEach(v => {
    if (longest > 0 && lens[v] === 0) add("warn", "rhythm", 0, `The ${vn(v)} part is empty.`);
    else if (lens[v] < longest) add("warn", "rhythm", lens[v], `The ${vn(v)} part stops at ${positionText(score, lens[v])}, before the other parts.`, [{ v, idx: score.voices[v].length - 1 }]);
  });
  if (longest % mt) add("info", "rhythm", longest, `The last bar is incomplete (${(longest % mt) / (4 * TPQ / score.time[1])} of ${score.time[0]} beats).`);
}

// Completeness, bass note and doubling, for a chord where all four voices sound.
function checkChord(s, chord, add, mark) {
  const tones = VOICES.map(v => ({ v, n: s.notes[v].n, t: findTone(chord, s.notes[v].n) }));
  const count = role => tones.filter(x => x.t && x.t.role === role).length;
  const label = s.numeral.text;
  const all = VOICES.map(mark);

  chord.tones.forEach(t => {
    if (count(t.role) > 0 || !toneRequired(chord, t.role)) return;
    if (t.role === "5" && chord.kind === "tertian" && !t.needed) {
      if (count("1") < 2) add("warn", "missing", s.tick, `${label} leaves out the 5th (${pcName(t)}). That's fine only when the root is doubled.`, all);
      return;
    }
    add("error", "missing", s.tick, `${label} is missing its ${roleWord(t.role)} (${pcName(t)}).`, all);
  });

  const bass = tones[3];
  if (bass.t && bass.t.role !== chord.bassRole) {
    const want = chord.tones.find(t => t.role === chord.bassRole);
    add("error", "bass", s.tick, `${label} needs ${pcName(want)} (the ${roleWord(chord.bassRole)}) in the bass, not ${pcName(bass.n)}.`, [mark("B")]);
  }

  const doubled = (pred, what) => {
    const xs = tones.filter(x => x.t && pred(x.t));
    if (xs.length > 1) add("error", "doubling", s.tick, `Don't double ${what} (${pcName(xs[0].n)}) in ${label}.`, xs.map(x => mark(x.v)));
  };
  doubled(t => t.lt, "the leading tone");
  doubled(t => t.role === "7", "the 7th");
  doubled(t => t.role === "b6", "the ♭6");
  doubled(t => t.role === "#4", "the ♯4");

  if (chord.kind === "tertian" && !chord.seventh && chord.inversion === 2 && count("5") < 2) {
    add("warn", "doubling", s.tick, `In a 6/4 chord, double the bass (${pcName(bass.n)}).`, all);
  }
}

// Voice leading from sonority p to s.
function checkMotion(p, s, prevChord, chord, add) {
  const moved = v => p.notes[v] && s.notes[v] && s.notes[v].attacked && noteMidi(p.notes[v].n) !== noteMidi(s.notes[v].n);
  const both = v => p.notes[v] && s.notes[v];
  const marks = vs => vs.flatMap(v => [{ v, idx: p.notes[v].idx }, { v, idx: s.notes[v].idx }]);

  // Melodic intervals
  VOICES.forEach(v => {
    if (!both(v) || !s.notes[v].attacked) return;
    const a = p.notes[v].n, b = s.notes[v].n;
    const iv = interval(a, b);
    if (iv.steps > 0 && iv.quality[0] === "A") add("error", "augmented", s.tick, `${vn(v)}: ${nn(a)} → ${nn(b)} is an ${intervalWords(iv)}. Augmented melodic intervals aren't allowed.`, marks([v]));
    else if (iv.semis > 12) add("warn", "leap", s.tick, `${vn(v)}: ${nn(a)} → ${nn(b)} leaps more than an octave.`, marks([v]));
    else if (iv.simple === 6 && iv.steps < 7) add("warn", "leap", s.tick, `${vn(v)}: ${nn(a)} → ${nn(b)} leaps a 7th. Avoid 7th leaps.`, marks([v]));
  });

  // Parallel, contrary and direct 5ths and octaves
  PAIRS.forEach(([u, w]) => {
    if (!both(u) || !both(w)) return;
    const i1 = interval(p.notes[u].n, p.notes[w].n), i2 = interval(s.notes[u].n, s.notes[w].n);
    const du = noteMidi(s.notes[u].n) - noteMidi(p.notes[u].n);
    const dw = noteMidi(s.notes[w].n) - noteMidi(p.notes[w].n);
    if (!moved(u) || !moved(w)) return;
    const same = Math.sign(du) === Math.sign(dw);
    [[isPerfectFifth, "5ths"], [isPerfectOctave, "octaves"]].forEach(([is, name]) => {
      const nm = name === "octaves" && i1.steps === 0 && i2.steps === 0 ? "unisons" : name;
      if (is(i1) && is(i2)) {
        if (same) add("error", "parallel", s.tick, `Parallel ${nm} between the ${pairName(u, w)} (${nn(p.notes[u].n)}/${nn(p.notes[w].n)} → ${nn(s.notes[u].n)}/${nn(s.notes[w].n)}).`, marks([u, w]));
        else add("warn", "parallel", s.tick, `Contrary ${nm} between the ${pairName(u, w)}: perfect intervals in contrary motion still sound parallel.`, marks([u, w]));
      } else if (is(i2) && same && u === "S" && w === "B" && Math.abs(du) > 2) {
        add("warn", "direct", s.tick, `Direct (hidden) ${name} in the outer voices: the Soprano leaps into a perfect ${name === "5ths" ? "5th" : "octave"} in similar motion with the Bass.`, marks([u, w]));
      }
    });
    if (w === "B" && same && i1.simple === 4 && i1.quality === "d" && isPerfectFifth(i2)) {
      add("warn", "parallel", s.tick, `Unequal 5ths (diminished → perfect) between the ${pairName(u, w)}.`, marks([u, w]));
    }
  });

  // All four parts moving the same way
  if (VOICES.every(moved)) {
    const dirs = VOICES.map(v => Math.sign(noteMidi(s.notes[v].n) - noteMidi(p.notes[v].n)));
    if (dirs.every(d => d === dirs[0])) add("warn", "same-direction", s.tick, `All four parts move ${dirs[0] > 0 ? "up" : "down"} together. Move at least one part the other way for independent lines.`, marks(VOICES));
  }

  // Overlap: a voice moves past where its neighbour just was.
  ADJACENT.forEach(([u, w]) => {
    if (!both(u) || !both(w)) return;
    const pu = noteMidi(p.notes[u].n), pw = noteMidi(p.notes[w].n);
    if (s.notes[u].attacked && noteMidi(s.notes[u].n) < pw) add("error", "overlap", s.tick, `Overlap: the ${vn(u)} moves to ${nn(s.notes[u].n)}, below where the ${vn(w)} just was (${nn(p.notes[w].n)}).`, marks([u, w]));
    else if (s.notes[w].attacked && noteMidi(s.notes[w].n) > pu) add("error", "overlap", s.tick, `Overlap: the ${vn(w)} moves to ${nn(s.notes[w].n)}, above where the ${vn(u)} just was (${nn(p.notes[u].n)}).`, marks([u, w]));
  });

  // Cross relation: a chromatic change should stay in one voice.
  const reported = new Set();
  VOICES.forEach(v => {
    const b = s.notes[v];
    if (!b || !b.attacked) return;
    VOICES.forEach(w => {
      const a = p.notes[w];
      if (w === v || !a || a.n.l !== b.n.l || a.n.a === b.n.a) return;
      const inOneVoice = VOICES.some(x => p.notes[x] && s.notes[x] && p.notes[x].n.l === a.n.l && p.notes[x].n.a === a.n.a && s.notes[x].n.l === b.n.l && s.notes[x].n.a === b.n.a);
      const k = LETTERS[a.n.l] + a.n.a + b.n.a;
      if (inOneVoice || reported.has(k)) return;
      reported.add(k);
      add("error", "cross-relation", s.tick, `Cross relation: ${pcName(a.n)} in the ${vn(w)} → ${pcName(b.n)} in the ${vn(v)}. Keep a chromatic change in the same voice (${pcName(a.n)} → ${pcName(b.n)}).`, [{ v: w, idx: a.idx }, { v, idx: b.idx }]);
    });
  });

  // Tendency tones, when the chord changes
  if (!prevChord || !chord || !s.numeral || p.numeral.tick === s.numeral.tick || s.numeral.tick !== s.tick) return;
  const tonic = prevChord.key.tonic;
  VOICES.forEach(v => {
    if (!both(v)) return;
    const a = p.notes[v].n, b = s.notes[v].n;
    const t = findTone(prevChord, a);
    if (!t) return;
    const d = noteMidi(b) - noteMidi(a), steps = noteStep(b) - noteStep(a);
    if (prevChord.extended && t.role === "7" && !(steps === -1 && d === -2)) {
      add("warn", "resolution", s.tick, `${vn(v)}: the 7th of ${p.numeral.text} (${nn(a)}) should resolve down a whole step.`, marks([v]));
    } else if (prevChord.extended && t.role === "3" && !(steps === 1 && d === 1)) {
      add("warn", "resolution", s.tick, `${vn(v)}: the 3rd of ${p.numeral.text} (${nn(a)}) should resolve up a half step.`, marks([v]));
    } else if (t.role === "7" && !(steps === -1 || d === 0)) {
      add("warn", "resolution", s.tick, `${vn(v)}: the 7th of ${p.numeral.text} (${nn(a)}) should resolve down by step.`, marks([v]));
    } else if (t.lt && (v === "S" || v === "B") && findTone(chord, tonic) && !(steps === 1 && samePc(b, tonic))) {
      add("warn", "resolution", s.tick, `${vn(v)}: the leading tone ${nn(a)} should rise to ${pcName(tonic)}.`, marks([v]));
    } else if (t.role === "b6" && !(steps === -1 && d === -1)) {
      add("warn", "resolution", s.tick, `${vn(v)}: the ♭6 of the ${prevChord.name} (${nn(a)}) should fall a half step.`, marks([v]));
    } else if (t.role === "#4" && !(steps === 1 && d === 1)) {
      add("warn", "resolution", s.tick, `${vn(v)}: the ♯4 of the ${prevChord.name} (${nn(a)}) should rise a half step.`, marks([v]));
    }
  });
}
