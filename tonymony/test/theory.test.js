import { test } from "node:test";
import assert from "node:assert/strict";
import { load } from "./load.js";

const t = load();
const tones = (numeral, key = "C", scale = "major") =>
  t.get(`(() => { const c = parseNumeral(${JSON.stringify(numeral)}, { tonic: parseNote(${JSON.stringify(key)}), scale: ${JSON.stringify(scale)} }); return c.error ? "ERROR: " + c.error : chordToneList(c) + " / bass " + c.bassRole; })()`);

test("intervals follow spelling, not just semitones", () => {
  const iv = (a, b) => t.get(`interval(parseNote("${a}"), parseNote("${b}")).name`);
  assert.equal(iv("F4", "G#4"), "A2");
  assert.equal(iv("F4", "Ab4"), "m3");
  assert.equal(iv("G#4", "F4"), "A2");      // same interval either direction
  assert.equal(iv("B3", "F4"), "d5");
  assert.equal(iv("F3", "B3"), "A4");
  assert.equal(iv("C3", "G4"), "P12");
  assert.equal(iv("C4", "C4"), "P1");
});

test("key signatures", () => {
  const sig = (k, s) => t.get(`keySignature({ tonic: parseNote("${k}"), scale: "${s}" })`);
  assert.equal(sig("D", "major"), 2);
  assert.equal(sig("C", "harmonicMinor"), -3);
  assert.equal(sig("D", "dorian"), 0);
  assert.equal(sig("F#", "naturalMinor"), 3);
  assert.equal(t.get(`keyAccidental(2, 3)`), 1);    // F# in D major
  assert.equal(t.get(`keyAccidental(-3, 5)`), -1);  // Ab in Eb major
  assert.equal(t.get(`keyAccidental(-3, 3)`), 0);   // F natural in Eb major
});

test("Roman numerals in major: triads, inversions and sevenths", () => {
  assert.equal(tones("I"), "C E G / bass 1");
  assert.equal(tones("ii6"), "D F A / bass 3");
  assert.equal(tones("iii6"), "E G B / bass 3");
  assert.equal(tones("IV64"), "F A C / bass 5");
  assert.equal(tones("V7"), "G B D F / bass 1");
  assert.equal(tones("V65"), "G B D F / bass 3");
  assert.equal(tones("V43"), "G B D F / bass 5");
  assert.equal(tones("V42"), "G B D F / bass 7");
  assert.equal(tones("IV7"), "F A C E / bass 1");     // diatonic 7th: major 7th here
  assert.equal(tones("viiø7"), "B D F A / bass 1");
  assert.equal(tones("vii°7"), "B D F A♭ / bass 1");
  assert.equal(tones("Cad64"), "C E G / bass 5");
  assert.equal(tones("V6/4"), "G B D / bass 5");
  assert.equal(tones("viio7"), "B D F A♭ / bass 1");  // typed "o" for °
});

test("Roman numerals: extensions and alterations", () => {
  assert.equal(tones("V9"), "G B D F A / bass 1");
  assert.equal(tones("V13"), "G B D F A E / bass 1");
  assert.equal(tones("V7#11"), "G B D F C♯ / bass 1");
  assert.equal(tones("V7b9"), "G B D F A♭ / bass 1");
  assert.equal(tones("V7#5"), "G B D♯ F / bass 1");
  assert.equal(tones("IV11"), "F A C E G B♭ / bass 1");
  assert.equal(tones("V+"), "G B D♯ / bass 1");
  assert.equal(tones("vii°"), "B D F / bass 1");
  const name = n => t.get(`parseNumeral(${JSON.stringify(n)}, { tonic: parseNote("C"), scale: "major" }).name`);
  assert.equal(name("V7#11"), "G7#11");
  assert.equal(name("IVM9"), "Fmaj9");
  assert.equal(name("ii9"), "Dm9");
});

test("letter-name chord symbols", () => {
  assert.equal(tones("C+"), "C E G♯ / bass 1");
  assert.equal(tones("Cdim"), "C E♭ G♭ / bass 1");
  assert.equal(tones("Cdim7"), "C E♭ G♭ B♭♭ / bass 1");
  assert.equal(tones("Dm7b5"), "D F A♭ C / bass 1");
  assert.equal(tones("C7"), "C E G B♭ / bass 1");
  assert.equal(tones("Cmaj7"), "C E G B / bass 1");
  assert.equal(tones("E7#11"), "E G♯ B D A♯ / bass 1");
  assert.equal(tones("G13"), "G B D F A E / bass 1");
  assert.equal(tones("Bbm"), "B♭ D♭ F / bass 1");
  assert.equal(tones("Cad64"), "C E G / bass 5");   // still the cadential 6/4
  const name = n => t.get(`parseNumeral(${JSON.stringify(n)}, { tonic: parseNote("C"), scale: "major" }).name`);
  assert.equal(name("E7#11"), "E7#11");
  assert.match(tones("H7"), /ERROR/);
});

test("Roman numerals: chromatic chords", () => {
  assert.equal(tones("N6"), "D♭ F A♭ / bass 3");
  assert.equal(tones("It+6"), "A♭ C F♯ / bass b6");
  assert.equal(tones("Fr+6"), "A♭ C D F♯ / bass b6");
  assert.equal(tones("Ger+6"), "A♭ C E♭ F♯ / bass b6");
  assert.equal(tones("V7/V"), "D F♯ A C / bass 1");
  assert.equal(tones("vii°7/ii"), "C♯ E G B♭ / bass 1");
  assert.equal(tones("V65/vi"), "E G♯ B D / bass 3");
  assert.equal(tones("bVI"), "A♭ C E♭ / bass 1");
  assert.equal(tones("bVI7"), "A♭ C E♭ G / bass 1");  // borrowed from minor
  assert.equal(tones("V/V/V"), "A C♯ E / bass 1");
});

test("Roman numerals in minor keys use the leading tone where it belongs", () => {
  assert.equal(tones("i", "C", "harmonicMinor"), "C E♭ G / bass 1");
  assert.equal(tones("V7", "C", "naturalMinor"), "G B D F / bass 1");
  assert.equal(tones("vii°7", "C", "naturalMinor"), "B D F A♭ / bass 1");
  assert.equal(tones("VII", "C", "harmonicMinor"), "B♭ D F / bass 1");
  assert.equal(tones("III+", "C", "harmonicMinor"), "E♭ G B / bass 1");
  assert.equal(tones("#vi°", "C", "naturalMinor"), "A C E♭ / bass 1");
  assert.equal(tones("ii°6", "A", "harmonicMinor"), "B D F / bass 3");
  assert.equal(tones("It+6", "A", "harmonicMinor"), "F A D♯ / bass b6");
});

test("bad numerals give a readable error", () => {
  assert.match(tones("X"), /ERROR/);
  assert.match(tones("V8"), /ERROR.*figure/);
  assert.match(tones("VII°"), /ERROR.*lowercase/);
  assert.match(tones("V/vii°"), /ERROR.*major or minor/);
});

test("chord palettes cover every scale and parse back to the same notes", () => {
  const pal = (s, sev) => t.data(`diatonicNumerals({ tonic: parseNote("C"), scale: "${s}" }, ${sev})`).join(" ");
  assert.equal(pal("major", false), "I ii iii IV V vi vii°");
  assert.equal(pal("harmonicMinor", false), "i ii° III+ iv V VI vii°");
  assert.equal(pal("melodicMinor", false), "i ii III+ IV V vi° vii°");
  assert.equal(pal("harmonicMajor", false), "I ii° iii iv V bVI+ vii°");
  assert.equal(pal("harmonicMinor", true), "i7 iiø7 III+7 iv7 V7 VI7 vii°7");
  for (const s of Object.keys(t.get("SCALES"))) {
    assert.equal(t.data(`diatonicNumerals({ tonic: parseNote("D"), scale: "${s}" }, false)`).length, 7, s);
    assert.equal(t.data(`diatonicNumerals({ tonic: parseNote("D"), scale: "${s}" }, true)`).length, 7, s);
  }
});
