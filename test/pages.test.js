import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScripts } from "./load.js";

/* ---------- Polychord ---------- */
test("polychord: default C / D decodes to Cmaj13(#11)", () => {
  const p = loadScripts(["theory.js", "audio.js", "polychord.js"], { fields: { lower: "C", upper: "D" } });
  assert.equal(p.el("interp").value, "Cmaj13(#11)");
  assert.equal(p.el("decodeBtn").disabled, false);
  assert.match(p.el("result").innerHTML, /Pitch Collection/);
});

test("polychord: encode builds the polychord back from an interpretation", () => {
  const p = loadScripts(["theory.js", "audio.js", "polychord.js"], { fields: { lower: "C", upper: "D" } });
  p.el("interp").value = "G13";
  p.get("encode")();
  assert.equal(p.el("lower").value, "G");
  assert.equal(p.el("upper").value, "E");
  assert.equal(p.el("interp").value, "G13");
});

test("polychord: invalid chords disable Decode", () => {
  const p = loadScripts(["theory.js", "audio.js", "polychord.js"], { fields: { lower: "C", upper: "Dsus9" } });
  assert.equal(p.get("refreshValidation")(), false);
  assert.equal(p.el("decodeBtn").disabled, true);
  assert.match(p.el("validationMsg").textContent, /upper chord/);
});

/* ---------- Modulation ---------- */
const mod = () => loadScripts(["theory.js", "audio.js", "modulation.js"], { fields: { optKeys: "random" } });

test("modulation: exercises have 8 diatonic chords across 2–3 distinct consecutive keys", () => {
  const m = mod();
  const gen = m.get("generateExercise");
  const OFFSETS = m.get("MAJOR_OFFSETS"), QUAL = m.get("MAJOR_DEGREE_QUALITY");
  for (let run = 0; run < 200; run++) {
    const keyCount = run % 2 ? 3 : 2;
    const ex = gen(keyCount);
    const total = keyCount === 3 ? 16 : 8;
    assert.equal(ex.chords.length, total);
    assert.equal(ex.keys.length, keyCount);
    assert.equal(ex.lengths.reduce((a, b) => a + b, 0), total);
    for (let i = 1; i < ex.keys.length; i++) assert.notEqual(ex.keys[i], ex.keys[i - 1]);
    for (const c of ex.chords) {
      assert.equal(c.rootPC, (c.keyRoot + OFFSETS[c.degree - 1]) % 12);
      assert.equal(c.quality, QUAL[c.degree - 1]);
    }
  }
});

test("modulation: melody uses only notes of each chord", () => {
  const m = mod();
  const ex = m.get("generateExercise")(3, true);
  const midi = m.get("chordMidi");
  for (const c of ex.chords) {
    assert.ok(c.melody.length > 0);
    const pcs = midi(c).map(n => n % 12);
    for (const n of c.melody) assert.ok(pcs.includes(n % 12));
  }
  assert.equal(m.get("generateExercise")(2).chords[0].melody, undefined);
});

test("modulation: answer checking tolerates enharmonics and quality spellings", () => {
  const ok = mod().get("isChordCorrect");
  const Bbm = { rootPC: 10, quality: "m" }, Bdim = { rootPC: 11, quality: "dim" }, C = { rootPC: 0, quality: "" };
  for (const s of ["Bbm", "A#min", "bb -", "B♭ minor", "A♯m"]) assert.equal(ok(s, Bbm), true, s);
  for (const s of ["Bdim", "Bo", "B°", "Cb dim"]) assert.equal(ok(s, Bdim), true, s);
  assert.equal(ok("Cb", { rootPC: 11, quality: "" }), true);
  for (const s of ["C", "Cmaj", "CM", "c major"]) assert.equal(ok(s, C), true, s);
  for (const s of ["", "Cm", "D", "C7", "Csus4"]) assert.equal(ok(s, C), false, s);
});

test("modulation: tally counts each question once and only full marks as correct", () => {
  const m = mod();
  const n = () => m.data("currentExercise.chords.length");
  const answer = () => { for (let i = 0; i < n(); i++) m.el("slot" + i).value = m.data(`chordName(currentExercise.chords[${i}])`); };
  answer();
  m.get("checkAnswers")();
  m.get("checkAnswers")();   // checking again must not count twice
  assert.equal(m.el("tally").textContent, "1 / 1 questions correct");
  m.get("buildExercise")();
  m.get("checkAnswers")();   // blank answers: wrong
  assert.equal(m.el("tally").textContent, "1 / 2 questions correct");
  m.get("buildExercise")();
  m.get("revealAnswers")();
  assert.equal(m.el("tally").textContent, "1 / 3 questions correct");
});

/* ---------- Multinotes ---------- */
const multi = () => loadScripts(["theory.js", "audio.js", "multinotes.js"], { fields: { optCount: "random" } });

test("multinotes: generates different notes between C3 and C6", () => {
  const gen = multi().get("generateNotes");
  for (let run = 0; run < 200; run++) {
    const count = 1 + (run % 10);
    const notes = gen(count);
    assert.equal(notes.length, count);
    assert.equal(new Set(notes).size, count);
    for (const n of notes) assert.ok(n >= 48 && n <= 84);
  }
});

test("multinotes: counts notes by name, ignoring octave", () => {
  const counts = multi().data("countByName([60, 72, 64, 79])"); // C4, C5, E4, G5
  assert.deepEqual(counts, [2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0]);
});

test("multinotes: answer checking treats blank as 0", () => {
  const ok = multi().get("isCountCorrect");
  assert.equal(ok("2", 2), true);
  assert.equal(ok(" 2 ", 2), true);
  assert.equal(ok("", 0), true);
  assert.equal(ok("0", 0), true);
  assert.equal(ok("1", 2), false);
  assert.equal(ok("", 1), false);
  assert.equal(ok("abc", 0), false);
});

test("multinotes: tally counts each question once and only full marks as correct", () => {
  const m = multi();
  const answer = () => m.data("countByName(currentNotes)").forEach((n, i) => { m.el("slot" + i).value = String(n); });
  answer();
  m.get("checkAnswers")();
  m.get("checkAnswers")();   // checking again must not count twice
  assert.equal(m.el("tally").textContent, "1 / 1 questions correct");
  m.get("buildExercise")();
  m.get("checkAnswers")();   // blank answers: wrong (at least one note always plays)
  assert.equal(m.el("tally").textContent, "1 / 2 questions correct");
  m.get("buildExercise")();
  m.get("revealAnswers")();
  assert.equal(m.el("tally").textContent, "1 / 3 questions correct");
});

test("multinotes: every instrument in the box has a sound", () => {
  const names = multi().data("Object.keys(INSTRUMENTS)");
  assert.deepEqual(names, ["piano", "guitar", "violin", "horn", "flute"]);
});

/* ---------- Randomizer ---------- */
const rnd = search => loadScripts(["randomizer.js"], { search });
const cfgParam = cfg => "?cfg=" + encodeURIComponent(JSON.stringify(cfg));

test("randomizer: no ?cfg falls back to the default note/scale setup", () => {
  assert.deepEqual(rnd("").data("configs.map(c=>c.name)"), ["Note", "Scale / Quality"]);
});

test("randomizer: round-trips a shared config, including '%' in words", () => {
  const cfg = [{ name: "Tempo", type: "word", min: 1, max: 12, words: "50%, 75%, 100%" }];
  const r = rnd(cfgParam(cfg));
  assert.equal(r.get("configs[0].words"), "50%, 75%, 100%");
  assert.match(r.get("values[0]"), /^(50|75|100)%$/);
});

test("randomizer: malformed shared links don't break the page", () => {
  assert.deepEqual(rnd("?cfg=not-json").data("configs.map(c=>c.name)"), ["Note", "Scale / Quality"]);
  assert.equal(rnd(cfgParam({ a: 1 })).get("configs.length"), 2);
  const r = rnd(cfgParam([null, 7, { name: "Fret", type: "number", min: 0, max: 15 }]));
  assert.deepEqual(r.data("configs.map(c=>c.name)"), ["Fret"]);
  const v = r.get("values[0]");
  assert.ok(v >= 0 && v <= 15);
  const many = rnd(cfgParam(Array.from({ length: 20 }, (_, i) => ({ name: "x" + i }))));
  assert.equal(many.get("configs.length"), many.get("MAX"));
});
