import { test } from "node:test";
import assert from "node:assert/strict";
import { load, scoreSource } from "./load.js";

const t = load();
const check = o => t.data(`checkScore(${scoreSource(o)})`);
const rules = o => check(o).issues.filter(i => i.level !== "info").map(i => `${i.level}:${i.rule}`);

test("a correct I–IV–V7–I passes with no errors or warnings", () => {
  const r = check({ S: "E5 F5 D5 C5", A: "G4 A4 B4 C5", T: "C4 C4 F4 E4", B: "C3 F3 G3 C3", numerals: ["I", "IV", "V7", "I"] });
  assert.deepEqual(r.issues.filter(i => i.level !== "info"), []);
});

test("parallel 5ths and octaves are errors and mark the notes", () => {
  const r = check({ S: "G4 A4", A: "E4 F4", T: "C4 D4", B: "C3 D3", numerals: ["I", "ii"] });
  const msgs = r.issues.filter(i => i.rule === "parallel").map(i => i.msg);
  assert.equal(r.counts.error, 3);
  assert.ok(msgs.some(m => /Parallel 5ths between the Soprano and Tenor/.test(m)));
  assert.ok(msgs.some(m => /Parallel octaves between the Tenor and Bass/.test(m)));
  const mk = r.issues.find(i => /Soprano and Tenor/.test(i.msg)).marks;
  assert.deepEqual(mk, [{ v: "S", idx: 0 }, { v: "S", idx: 1 }, { v: "T", idx: 0 }, { v: "T", idx: 1 }]);
});

test("contrary octaves warn, oblique motion is fine", () => {
  assert.deepEqual(rules({ S: "C5 G5", A: "G4 G4", T: "E4 D4", B: "C3 G2", numerals: ["I", "V"] }).filter(r => r.endsWith("parallel")), ["warn:parallel"]);
  assert.deepEqual(rules({ S: "G4 G4", A: "E4 D4", T: "C4 B3", B: "C3 G2", numerals: ["I", "V"] }), []);
});

test("missing chord tones, wrong notes and wrong bass", () => {
  assert.ok(check({ S: "G4", A: "G4", T: "C4", B: "C3", numerals: ["I"] }).issues.some(i => i.rule === "missing" && /3rd \(E\)/.test(i.msg)));
  assert.ok(check({ S: "D5", A: "G4", T: "B3", B: "G2", numerals: ["V7"] }).issues.some(i => i.rule === "missing" && /7th \(F\)/.test(i.msg)));
  // An omitted 5th is fine when the root is doubled
  assert.deepEqual(rules({ S: "C5", A: "E4", T: "C4", B: "C3", numerals: ["I"] }), []);
  assert.ok(check({ S: "A4", A: "E4", T: "C4", B: "C3", numerals: ["I"] }).issues.some(i => i.rule === "chord-tone" && i.level === "error"));
  assert.ok(check({ S: "E5", A: "G4", T: "C4", B: "C3", numerals: ["I6"] }).issues.some(i => i.rule === "bass" && /E \(the 3rd\)/.test(i.msg)));
});

test("extended chords: only root, 3rd and 7th are required; 3rd rises a half step, 7th falls a whole step", () => {
  // V9 with no 5th or 13th is complete; B→C is fine, but F→E is only a half step
  const r = check({ S: "A4 G4", A: "F4 E4", T: "B3 C4", B: "G2 C3", numerals: ["V9", "I"] });
  assert.ok(!r.issues.some(i => i.rule === "missing"));
  assert.ok(r.issues.some(i => i.rule === "resolution" && /7th of V9.*whole step/.test(i.msg)));
  assert.ok(!r.issues.some(i => i.rule === "resolution" && /3rd/.test(i.msg)));
  const r2 = check({ S: "A4 G4", A: "F4 D4", T: "B3 D4", B: "G2 C3", numerals: ["V9", "I"] });
  assert.ok(r2.issues.some(i => i.rule === "resolution" && /3rd of V9.*half step/.test(i.msg)));
  assert.ok(check({ S: "A4", A: "F4", T: "D4", B: "G2", numerals: ["V9"] }).issues.some(i => i.rule === "missing" && /3rd/.test(i.msg)));
});

test("doubling: no doubled leading tone or 7th", () => {
  assert.ok(check({ S: "B4", A: "G4", T: "D4", B: "B2", numerals: ["V6"] }).issues.some(i => i.rule === "doubling" && /leading tone/.test(i.msg)));
  assert.ok(check({ S: "F5", A: "B4", T: "F4", B: "G2", numerals: ["V7"] }).issues.some(i => i.rule === "doubling" && /7th/.test(i.msg)));
});

test("spacing: S–A and A–T within an octave, T–B within two", () => {
  const r = check({ S: "G5", A: "E4", T: "C4", B: "C3", numerals: ["I"] });
  assert.ok(r.issues.some(i => i.rule === "spacing" && /Soprano and Alto/.test(i.msg)));
  const ok = check({ S: "G4", A: "E4", T: "C4", B: "C2", numerals: ["I"] });
  assert.ok(!ok.issues.some(i => i.rule === "spacing"));     // T–B = 2 octaves exactly
  const far = check({ S: "G4", A: "E4", T: "E4", B: "C2", numerals: ["I"] });
  assert.ok(far.issues.some(i => i.rule === "spacing" && /Tenor and Bass/.test(i.msg)));
});

test("voice crossing and overlap", () => {
  assert.ok(check({ S: "E4", A: "G4", T: "C4", B: "C3", numerals: ["I"] }).issues.some(i => i.rule === "crossing"));
  const r = check({ S: "C5 B4", A: "G4 D5", T: "E4 G4", B: "C3 G2", numerals: ["I", "V"] });
  assert.ok(r.issues.some(i => i.rule === "overlap"));
});

test("augmented melodic intervals are errors, chromatic semitones are not", () => {
  const r = check({ key: "A", scale: "harmonicMinor", S: "C5 B4", A: "F4 G#4", T: "A3 E4", B: "D3 E3", numerals: ["iv6", "V"] });
  assert.ok(r.issues.some(i => i.rule === "augmented" && /F4 → G♯4 is an augmented 2nd/.test(i.msg)));
  const chrom = check({ S: "E5 E5", A: "G4 G4", T: "C4 C#4", B: "C3 A2", numerals: ["I", "V/ii"] });
  assert.ok(!chrom.issues.some(i => i.rule === "augmented"));
});

test("cross relations: a chromatic change should stay in one voice", () => {
  const bad = check({ S: "C5 D5", A: "F4 A4", T: "A3 F#3", B: "F2 D3", numerals: ["IV", "V/V"] });
  assert.ok(bad.issues.some(i => i.rule === "cross-relation"));
  const good = check({ S: "C5 D5", A: "F4 F#4", T: "A3 A3", B: "F2 D3", numerals: ["IV", "V/V"] });
  assert.ok(!good.issues.some(i => i.rule === "cross-relation"));
});

test("tendency tones: unresolved 7th and leading tone warn", () => {
  const r = check({ S: "B4 E5", A: "F4 G4", T: "D4 C4", B: "G2 C3", numerals: ["V7", "I"] });
  assert.ok(r.issues.some(i => i.rule === "resolution" && /leading tone/.test(i.msg)));
  assert.ok(r.issues.some(i => i.rule === "resolution" && /7th/.test(i.msg)));
});

test("rhythm: notes across the bar line and short parts", () => {
  const r = check({ S: "C5/h. C5/h", A: "E4/h. E4/h", T: "G3/w", B: "C3/w", numerals: ["I"] });
  assert.ok(r.issues.some(i => i.rule === "rhythm" && /across the bar line/.test(i.msg)));
  assert.ok(r.issues.some(i => i.rule === "rhythm" && /stops at bar 2/.test(i.msg)));
});

test("unreadable numerals are reported", () => {
  const r = check({ S: "C5", A: "E4", T: "G3", B: "C3", numerals: ["Q7"] });
  assert.ok(r.issues.some(i => i.rule === "numeral" && i.level === "error"));
});
