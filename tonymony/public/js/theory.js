/* ============================================================
   theory.js: spelled pitches, intervals, keys, scales and Roman
   numerals. No DOM. Loaded first; the other scripts use its globals.

   A pitch class is {l, a}: letter index (C=0 … B=6) and accidental
   (-2 = double flat … +2 = double sharp). A note adds an octave:
   {l, a, o}, with C4 = middle C. Spelling matters: F→G# is an
   augmented 2nd, F→Ab a minor 3rd.
   ============================================================ */

const LETTERS = "CDEFGAB";
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const LETTER_FIFTHS = [0, 2, 4, -1, 1, 3, 5];   // place on the circle of fifths, C = 0
const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

function mod(n, m) { return ((n % m) + m) % m; }

/* ---------- Pitches ---------- */
function accText(a) { return a > 0 ? "♯".repeat(a) : "♭".repeat(-a); }
function accAscii(a) { return a > 0 ? "#".repeat(a) : "b".repeat(-a); }
function pcName(p) { return LETTERS[p.l] + accText(p.a); }
function noteName(n) { return pcName(n) + n.o; }
function noteStep(n) { return n.o * 7 + n.l; }
function noteMidi(n) { return 12 * (n.o + 1) + LETTER_PC[n.l] + n.a; }
function pcOf(p) { return mod(LETTER_PC[p.l] + p.a, 12); }
function samePc(p, q) { return p.l === q.l && p.a === q.a; }

// Spell pitch class pc on letter l (accidental kept within ±6).
function spell(l, pc) { return { l: mod(l, 7), a: mod(pc - LETTER_PC[mod(l, 7)] + 6, 12) - 6 }; }

// "F#4", "Bb3", "C##5", "Ebb" (octave optional, default 4).
function parseNote(str) {
  const m = String(str).trim().match(/^([A-Ga-g])(bb|b|##|#|x|♭♭|♭|♯♯|♯|𝄫|𝄪)?(-?\d)?$/);
  if (!m) return null;
  const a = { bb: -2, b: -1, "#": 1, "##": 2, x: 2, "♭♭": -2, "♭": -1, "♯♯": 2, "♯": 1, "𝄫": -2, "𝄪": 2 }[m[2]] || 0;
  return { l: LETTERS.indexOf(m[1].toUpperCase()), a, o: m[3] === undefined ? 4 : +m[3] };
}

/* ---------- Intervals ---------- */
// Interval between two notes, named from the lower to the higher (by staff
// position). {steps, semis, simple (0 = unison … 6 = 7th), quality, name}.
function interval(x, y) {
  let lo = x, hi = y;
  if (noteStep(y) < noteStep(x) || (noteStep(y) === noteStep(x) && noteMidi(y) < noteMidi(x))) { lo = y; hi = x; }
  const steps = noteStep(hi) - noteStep(lo);
  const semis = noteMidi(hi) - noteMidi(lo);
  const simple = steps % 7;
  const diff = semis - (MAJOR_SEMIS[simple] + 12 * Math.floor(steps / 7));
  let quality;
  if (simple === 0 || simple === 3 || simple === 4) quality = diff === 0 ? "P" : diff > 0 ? "A".repeat(diff) : "d".repeat(-diff);
  else quality = diff === 0 ? "M" : diff === -1 ? "m" : diff > 0 ? "A".repeat(diff) : "d".repeat(-diff - 1);
  return { steps, semis, simple, quality, name: quality + (steps + 1) };
}

const INTERVAL_WORDS = { P: "perfect", M: "major", m: "minor", A: "augmented", d: "diminished", AA: "doubly augmented", dd: "doubly diminished" };
const NUMBER_WORDS = ["unison", "2nd", "3rd", "4th", "5th", "6th", "7th", "octave"];
function intervalWords(iv) {
  const n = iv.steps <= 7 ? NUMBER_WORDS[iv.steps] : (iv.steps + 1) + "th";
  return (INTERVAL_WORDS[iv.quality] || iv.quality) + " " + n;
}
function isPerfectFifth(iv) { return iv.simple === 4 && iv.quality === "P"; }
function isPerfectOctave(iv) { return iv.simple === 0 && iv.quality === "P"; }

/* ---------- Scales and keys ---------- */
// minor: the scale has a minor 3rd, so Roman numerals follow minor-key
// conventions. sig: key-signature offset from the tonic's major key.
const SCALES = {
  major:         { name: "Major (Ionian)", semis: [0, 2, 4, 5, 7, 9, 11], minor: false, sig: 0 },
  naturalMinor:  { name: "Natural minor (Aeolian)", semis: [0, 2, 3, 5, 7, 8, 10], minor: true, sig: -3 },
  harmonicMinor: { name: "Harmonic minor", semis: [0, 2, 3, 5, 7, 8, 11], minor: true, sig: -3 },
  melodicMinor:  { name: "Melodic minor", semis: [0, 2, 3, 5, 7, 9, 11], minor: true, sig: -3 },
  harmonicMajor: { name: "Harmonic major", semis: [0, 2, 4, 5, 7, 8, 11], minor: false, sig: 0 },
  dorian:        { name: "Dorian", semis: [0, 2, 3, 5, 7, 9, 10], minor: true, sig: -2 },
  phrygian:      { name: "Phrygian", semis: [0, 1, 3, 5, 7, 8, 10], minor: true, sig: -4 },
  lydian:        { name: "Lydian", semis: [0, 2, 4, 6, 7, 9, 11], minor: false, sig: 1 },
  mixolydian:    { name: "Mixolydian", semis: [0, 2, 4, 5, 7, 9, 10], minor: false, sig: -1 },
};

const TONICS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B", "Cb"];

// Number of sharps (+) or flats (-) in the key signature.
function keySignature(key) {
  return LETTER_FIFTHS[key.tonic.l] + 7 * key.tonic.a + SCALES[key.scale].sig;
}
// Tonics that give a key signature of at most 7 sharps or flats for a scale.
function tonicsFor(scale) {
  return TONICS.filter(t => Math.abs(keySignature({ tonic: parseNote(t), scale })) <= 7);
}
// Accidental the key signature gives a letter.
function keyAccidental(sig, l) {
  const f = LETTER_FIFTHS[l];
  if (sig > 0) return f <= sig - 2 ? 1 : 0;
  if (sig < 0) return f >= 6 + sig ? -1 : 0;
  return 0;
}
function tonicPc(key) { return pcOf(key.tonic); }
function degreeNote(key, deg, semis) { return spell(key.tonic.l + deg, tonicPc(key) + semis); }
function scaleNotes(key, scale) { return SCALES[scale || key.scale].semis.map((s, d) => degreeNote(key, d, s)); }
function keyName(key) { return pcName(key.tonic) + " " + SCALES[key.scale].name.replace(/ \(.*\)/, "").toLowerCase(); }

/* ---------- Roman numerals ---------- */
const TRIAD_SEMIS = { M: [4, 7], m: [3, 7], d: [3, 6], A: [4, 8] };
const QUALITY_SUFFIX = { M: "", m: "m", d: "°", A: "+" };

// Inversion figures: [inversion, has a seventh].
const FIGURES = {
  "": [0, false], "5": [0, false], "53": [0, false],
  "6": [1, false], "63": [1, false], "64": [2, false],
  "7": [0, true], "753": [0, true], "65": [1, true], "653": [1, true],
  "43": [2, true], "643": [2, true], "42": [3, true], "2": [3, true], "642": [3, true],
};
const INVERSION_ROLE = ["1", "3", "5", "7"];

// Augmented sixths: [role, scale degree (0-based), semitones above the tonic].
const AUG6 = {
  It: [["b6", 5, 8], ["1", 0, 0], ["#4", 3, 6]],
  Fr: [["b6", 5, 8], ["1", 0, 0], ["2", 1, 2], ["#4", 3, 6]],
  Ger: [["b6", 5, 8], ["1", 0, 0], ["b3", 2, 3], ["#4", 3, 6]],
};

const SUPERSCRIPTS = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

function normalizeNumeral(text) {
  return String(text)
    .replace(/[⁰-⁹₀-₉¹²³]/g, c => SUPERSCRIPTS[c] || c)
    .replace(/\s+/g, "")
    .replace(/♭/g, "b").replace(/♯/g, "#")
    .replace(/[oº˚]/g, "°")
    .replace(/[ØΦ%]/g, "ø")
    .replace(/Δ|maj/g, "M")
    .replace(/(\d)\/(?=\d)/g, "$1");     // 6/4 → 64, but keep V/V
}

// Scales whose chord on a root gives the diatonic 7th for a plain "7".
function seventhScales(key) {
  const own = key.secondary ? [] : [key.scale];
  const std = SCALES[key.scale].minor
    ? ["naturalMinor", "harmonicMinor", "melodicMinor", "major"]
    : ["major", "naturalMinor", "harmonicMinor"];
  return own.concat(std.filter(s => !own.includes(s)));
}
function diatonicSeventh(key, rootPc, triad) {
  for (const id of seventhScales(key)) {
    const s = SCALES[id].semis;
    for (let d = 0; d < 7; d++) {
      if (mod(tonicPc(key) + s[d], 12) !== rootPc) continue;
      const iv = k => mod(s[(d + k) % 7] - s[d], 12);
      if (iv(2) === triad[0] && iv(4) === triad[1]) return iv(6);
    }
  }
  return 10;
}

// Parse one Roman numeral (no "/") in a key. Returns a chord or {error}.
function parseSingleNumeral(s, key) {
  const m = s.match(/^(bb|b|##|#)?(Ger|Fr|It|N|Cad|VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(.*)$/);
  if (!m) return { error: `"${s}" isn't a Roman numeral` };
  const [, acc, rn, rest0] = m;
  const minorKey = SCALES[key.scale].minor;
  const base = minorKey ? SCALES.naturalMinor.semis : MAJOR_SEMIS;
  const accShift = acc ? (acc[0] === "b" ? -acc.length : acc.length) : 0;

  if (AUG6[rn]) {
    if (!/^\+?(6|65|43|42|)?$/.test(rest0)) return { error: `Write ${rn}+6` };
    const tones = AUG6[rn].map(([role, deg, semis]) => Object.assign(degreeNote(key, deg, semis), { role }));
    return { kind: "aug6", type: rn, key, tones, bassRole: "b6", seventh: false, name: { It: "Italian", Fr: "French", Ger: "German" }[rn] + " +6" };
  }

  let rest = rest0, roman = rn, quality, inversion = 0, seventh = false, majSeventh = false;
  if (rn === "Cad") { roman = minorKey ? "i" : "I"; rest = "64"; }
  if (rn === "N") { roman = "II"; }
  const upper = roman === roman.toUpperCase();
  const deg = ROMAN.indexOf(roman.toUpperCase());

  let sym = "";
  if (/^[°ø+]/.test(rest)) { sym = rest[0]; rest = rest.slice(1); }
  if (rest[0] === "M") { majSeventh = true; rest = rest.slice(1); }
  if (rest.startsWith("+6")) return { error: `+6 goes with It, Fr or Ger` };
  // Extensions: 9, 11, 13, or 7 with alterations (V9, V13, V7#11, V7b9#5).
  const ext = rest.match(/^(9|11|13|7(?=[b#]))((?:[b#](?:5|9|11|13))*)$/);
  if (ext) {
    seventh = true;
  } else {
    if (!(rest in FIGURES)) return { error: `"${rest}" isn't a figure I know (try 6, 64, 7, 65, 43, 42, 9, 11, 13)` };
    [inversion, seventh] = FIGURES[rest];
  }
  if (majSeventh || sym === "ø") seventh = true;

  if (upper) {
    if (sym === "°" || sym === "ø") return { error: `Diminished chords are lowercase: ${roman.toLowerCase()}${sym}` };
    quality = sym === "+" ? "A" : "M";
  } else {
    if (sym === "+") return { error: `Augmented chords are uppercase: ${roman.toUpperCase()}+` };
    quality = sym ? "d" : "m";
  }

  // Root: the key's major (or natural minor) scale, moved by any accidental.
  // In minor, vii°/viiø sit on the raised 7th and vi°/viø on the raised 6th.
  let semis = base[deg] + accShift;
  if (rn === "N") semis = 1;
  else if (!acc && minorKey && quality === "d" && (deg === 5 || deg === 6)) semis += 1;
  const root = degreeNote(key, deg, semis);
  const rootPc = pcOf(root);
  const triad = TRIAD_SEMIS[quality];

  let sev = null, extName = "";
  if (seventh) {
    if (sym === "°") sev = 9;
    else if (sym === "ø") sev = 10;
    else if (majSeventh) sev = 11;
    else sev = diatonicSeventh(key, rootPc, triad);
  }
  const tones = [Object.assign({ l: root.l, a: root.a }, { role: "1" }),
    Object.assign(spell(root.l + 2, rootPc + triad[0]), { role: "3" }),
    Object.assign(spell(root.l + 4, rootPc + triad[1]), { role: "5" })];
  if (sev !== null) tones.push(Object.assign(spell(root.l + 6, rootPc + sev), { role: "7" }));

  // Extension tones. A 13th chord leaves out the 11th unless it is written (#11).
  if (ext) {
    const alts = {};
    for (const [, a, n] of ext[2].matchAll(/([b#])(\d+)/g)) alts[n] = a === "b" ? -1 : 1;
    const top = ext[1];
    const want = new Set(Object.keys(alts));
    if (top !== "7") want.add("9");
    if (top === "11") want.add("11");
    if (top === "13") want.add("13");
    if (alts[5]) tones[2] = Object.assign(spell(root.l + 4, rootPc + triad[1] + alts[5]), { role: "5" });
    // [letter steps above the root, semitones] for each natural extension
    const EXT = { "9": [8, 2], "11": [10, 5], "13": [12, 9] };
    ["9", "11", "13"].forEach(n => {
      if (want.has(n)) tones.push(Object.assign(spell(root.l + EXT[n][0], rootPc + EXT[n][1] + (alts[n] || 0)), { role: n }));
    });
    extName = top + ext[2];
  }

  // Leading tone: the 3rd of V, the root of vii (in the key, or the secondary key).
  const lt = degreeNote(key, 6, 11);
  const dominant = (deg === 4 && quality === "M" && !acc) || (deg === 6 && quality === "d" && !acc);
  if (dominant) tones.forEach(t => { if (samePc(t, lt)) t.lt = true; });

  return {
    kind: "tertian", key, degree: deg, quality, seventh: sev !== null, inversion,
    tones, bassRole: INVERSION_ROLE[inversion], dominant, extended: !!ext,
    name: pcName(root) + (ext ? chordSuffix(quality, sev).replace(/7$/, "") + extName : chordSuffix(quality, sev)),
  };
}

function chordSuffix(q, sev) {
  if (sev === null) return QUALITY_SUFFIX[q];
  if (q === "M") return sev === 11 ? "maj7" : "7";
  if (q === "m") return sev === 11 ? "m(maj7)" : "m7";
  if (q === "d") return sev === 9 ? "°7" : "ø7";
  return sev === 11 ? "+maj7" : "+7";
}

// Parse a Roman numeral such as "V65/V", "It+6", "N6", "viiø7", "bVI".
// key = {tonic:{l,a}, scale}. Returns a chord object or {error}.
function parseNumeral(text, key) {
  const s = normalizeNumeral(text);
  if (!s) return null;
  if (s.includes("/") && !/^[^/]+(\/[^/]+)+$/.test(s)) return { error: `"${text}" has an empty part around /` };
  const parts = s.split("/");
  let k = key;
  for (let i = parts.length - 1; i >= 1; i--) {
    const t = parseSingleNumeral(parts[i], k);
    if (t.error) return { error: `Can't read the target "${parts[i]}": ${t.error}` };
    if (t.kind !== "tertian" || (t.quality !== "M" && t.quality !== "m")) return { error: `The target of / must be a major or minor chord, not ${parts[i]}` };
    k = { tonic: { l: t.tones[0].l, a: t.tones[0].a }, scale: t.quality === "M" ? "major" : "naturalMinor", secondary: true };
  }
  const c = parseSingleNumeral(parts[0], k);
  if (c.error) return c;
  c.label = String(text).trim();
  c.text = s;
  return c;
}

// With four voices an extended chord can't sound every tone: only the root, 3rd and 7th must be there.
function toneRequired(chord, role) { return !chord.extended || role === "1" || role === "3" || role === "7"; }
function chordPcs(chord) { return chord.tones.map(pcOf); }
function chordToneList(chord) { return chord.tones.map(pcName).join(" "); }
function findTone(chord, p) { return chord.tones.find(t => samePc(t, p)) || null; }
function findTonePc(chord, pc) { return chord.tones.find(t => pcOf(t) === pc) || null; }

/* ---------- Chord palette ---------- */
// The diatonic triads (or seventh chords) of a key's scale, as Roman numerals
// that parse back to exactly those notes.
function diatonicNumerals(key, sevenths) {
  const notes = scaleNotes(key);
  const out = [];
  for (let d = 0; d < 7; d++) {
    const want = [0, 2, 4, 6].slice(0, sevenths ? 4 : 3).map(k => notes[(d + k) % 7]);
    const pcs = want.map(pcOf);
    const third = mod(pcs[1] - pcs[0], 12), fifth = mod(pcs[2] - pcs[0], 12);
    const q = Object.keys(TRIAD_SEMIS).find(k => TRIAD_SEMIS[k][0] === third && TRIAD_SEMIS[k][1] === fifth);
    if (!q) continue;   // e.g. a stack with a doubly-diminished 5th: no standard numeral
    const sev = sevenths ? mod(pcs[3] - pcs[0], 12) : null;
    const roman = q === "M" || q === "A" ? ROMAN[d] : ROMAN[d].toLowerCase();
    const syms = q === "A" ? ["+"] : q === "d" ? (sev === 10 ? ["ø"] : ["°"]) : [""];
    const tails = sevenths ? ["7", "M7"] : [""];
    let found = null;
    for (const acc of ["", "b", "#"]) {
      for (const sym of syms) for (const tail of tails) {
        const label = acc + roman + sym + tail;
        const c = parseNumeral(label, key);
        if (c && !c.error && c.tones.length === want.length && c.tones.every((t, i) => samePc(t, want[i]))) { found = label; break; }
      }
      if (found) break;
    }
    if (found) out.push(found);
  }
  return out;
}

/* ---------- Voice ranges ---------- */
const VOICES = ["S", "A", "T", "B"];
const VOICE_NAMES = { S: "Soprano", A: "Alto", T: "Tenor", B: "Bass" };
const RANGES = { S: ["C4", "G5"], A: ["G3", "D5"], T: ["C3", "G4"], B: ["E2", "C4"] };
const RANGE_MIDI = Object.fromEntries(VOICES.map(v => [v, RANGES[v].map(n => noteMidi(parseNote(n)))]));
