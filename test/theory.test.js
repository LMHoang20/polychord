import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScripts } from "./load.js";

const t = loadScripts(["theory.js"]);
const call = (fn, ...args) => t.get(fn)(...args);

test("parseChord returns pitch classes for each quality", () => {
  assert.deepEqual([...call("parseChord", "C")], [0, 4, 7]);
  assert.deepEqual([...call("parseChord", "Dm")], [2, 5, 9]);
  assert.deepEqual([...call("parseChord", "G7")], [7, 11, 2, 5]);
  assert.deepEqual([...call("parseChord", "Bbmaj7")], [10, 2, 5, 9]);
  assert.deepEqual([...call("parseChord", "F#dim")], [6, 9, 0]);
  assert.deepEqual([...call("parseChord", "x")], []);
});

test("enharmonic roots map to the same pitch class", () => {
  assert.equal(call("getChordRoot", "C#"), call("getChordRoot", "Db"));
  assert.equal(call("getChordRoot", "A#m7"), call("getChordRoot", "Bbm7"));
  assert.equal(call("getChordRoot", "H"), null);
});

test("parseDirectNotes de-duplicates and skips unknown tokens", () => {
  assert.deepEqual([...call("parseDirectNotes", "C E G C# Db zz")], [0, 4, 7, 1]);
});

test("detectUpperStructure covers every mapped interval", () => {
  const US = t.get("UPPER_STRUCTURES");
  for (const k of Object.keys(US)) {
    const r = call("detectUpperStructure", 0, +k);
    assert.equal(r.name, "C" + US[k][0]);
    assert.equal(r.category, US[k][1]);
  }
  assert.equal(call("detectUpperStructure", 0, 2).name, "Cmaj13(#11)"); // D over C
  assert.equal(call("detectUpperStructure", 7, 4).name, "G13");         // E over G
  for (const unmapped of [0, 5, 7]) assert.equal(call("detectUpperStructure", 0, unmapped), null);
  assert.equal(call("detectUpperStructure", null, 2), null);
});

test("SUFFIX_TO_INTERVAL is the exact inverse of UPPER_STRUCTURES", () => {
  const US = t.get("UPPER_STRUCTURES"), inv = t.get("SUFFIX_TO_INTERVAL");
  for (const k of Object.keys(US)) assert.equal(inv[US[k][0]], +k);
});

test("analyzeRoot names and scores a C major 7", () => {
  const r = call("analyzeRoot", 0, [0, 4, 7, 11]);
  assert.equal(r.name, "Cmaj7");
  assert.equal(r.intervals, "1 3 5 7");
  assert.equal(r.score, 40 + 35 + 10);
});
