import { test } from "node:test";
import assert from "node:assert/strict";
import { load } from "./load.js";

const t = load();
const run = (o, given, count = 3) => t.data(`(() => {
  const r = harmonize(scoreFromText(${JSON.stringify(o)}), { given: ${JSON.stringify(given)}, count: ${count} });
  return { problems: r.problems, solutions: r.solutions.map(s => ({
    counts: s.check.counts, numerals: s.score.numerals,
    v: Object.fromEntries(VOICES.map(v => [v, s.score.voices[v].map(e => e.r ? "r" : noteName(e.n)).join(" ")])) })) };
})()`);

test("harmonizes a melody with the chosen chords, without breaking rules", () => {
  const r = run({ key: "G", numeralsOn: "S", S: "D5 E5 D5 C5 B4 A4 G4/h", numerals: ["I", "IV", "I", "ii6", "Cad64", "V7", "I"] }, "S");
  assert.deepEqual(r.problems, []);
  assert.equal(r.solutions.length, 3);
  r.solutions.forEach(s => {
    assert.equal(s.counts.error, 0);
    assert.equal(s.v.S, "D5 E5 D5 C5 B4 A4 G4");   // the melody is kept
  });
  assert.equal(r.solutions[0].counts.warn, 0);
  assert.equal(r.solutions[0].v.B.split(" ")[3], "C3");   // ii6 has the 3rd in the bass
});

test("answers really differ from each other", () => {
  const r = run({ key: "C", numeralsOn: "S", S: "E5 D5 C5 B4 C5/h", numerals: ["I", "V", "vi", "V", "I"] }, "S", 3);
  const inner = r.solutions.map(s => s.v.A + "|" + s.v.T);
  assert.equal(new Set(inner).size, 3);
});

test("harmonizes a given bass, and minor-key chromatic chords", () => {
  const r = run({ key: "A", scale: "harmonicMinor", B: "A2 D3 F3 E3 A2/h", numerals: ["i", "iv", "It+6", "V", "i"] }, "B");
  assert.deepEqual(r.problems, []);
  assert.ok(r.solutions.length >= 1);
  assert.equal(r.solutions[0].counts.error, 0);
  assert.equal(r.solutions[0].v.B, "A2 D3 F3 E3 A2");
  assert.match(r.solutions[0].v.S + r.solutions[0].v.A + r.solutions[0].v.T, /D♯/);   // It+6 has its ♯4
});

test("picks diatonic chords when none are given", () => {
  const r = run({ key: "C", S: "C5 D5 E5 D5 C5/h" }, "S");
  assert.ok(r.solutions.length >= 1);
  const s = r.solutions[0];
  assert.equal(s.counts.error, 0);
  assert.equal(s.numerals[0], "I");
  assert.ok(Object.values(s.numerals).length >= 3);
});

test("explains problems instead of failing silently", () => {
  assert.match(run({ key: "C", S: "" }, "S").problems[0], /melody|soprano/i);
  assert.match(run({ key: "C", numeralsOn: "S", S: "C5", numerals: ["Q"] }, "S").problems[0], /can't read/);
  const off = run({ key: "C", numeralsOn: "S", S: "F5 E5", numerals: ["I", "I"] }, "S");
  assert.match(off.problems[0], /F5 isn't in I/);
});
