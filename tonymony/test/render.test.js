import { test } from "node:test";
import assert from "node:assert/strict";
import { load, scoreSource } from "./load.js";

const t = load(["theory.js", "score.js", "checker.js", "harmonizer.js", "render.js"]);
const render = (o, opts = {}) => t.data(`(() => { const r = renderScore(${scoreSource(o)}, ${JSON.stringify(opts)}); return { svg: r.svg, systems: r.systems.length, notes: r.notes, slots: r.systems.flatMap(s => s.slots.map(x => x.tick)) }; })()`);

test("draws clefs, key signature, notes and numerals", () => {
  const r = render({ key: "D", S: "F#5 E5", A: "A4 A4", T: "D4 C#4", B: "D3 A2", numerals: ["I", "V"] }, { width: 900 });
  assert.match(r.svg, /^<svg class="score"/);
  assert.ok(r.svg.includes("") && r.svg.includes(""));          // G and F clefs
  assert.equal(r.svg.split("").length - 1, 4);                         // 2 sharps × 2 staves, no extra accidentals
  assert.equal(r.notes.length, 8);
  assert.match(r.svg, /<tspan>V<\/tspan>/);
  assert.deepEqual(r.slots, [0, 48]);
});

test("accidentals show only when they differ from the key and the bar", () => {
  const r = render({ key: "C", S: "F#5 F#5 F5 C5", A: "A4 A4 A4 A4", T: "C4 C4 C4 C4", B: "D3 D3 D3 C3" });
  assert.equal(r.svg.split("").length - 1, 1);   // one sharp: the repeat needs none
  assert.equal(r.svg.split("").length - 1, 1);   // then a natural
});

test("long scores wrap onto more systems", () => {
  const S = Array(16).fill("C5").join(" ");
  assert.equal(render({ S }, { width: 600 }).systems > 1, true);
  assert.equal(render({ S: "C5" }, { width: 600 }).systems, 1);
});

test("user text in numerals is escaped", () => {
  const r = render({ S: "C5", B: "C3", numerals: ["<img src=x>"] });
  assert.ok(!r.svg.includes("<img"));
  assert.ok(r.svg.includes("&lt;img"));
});

test("stepAtY maps clicks back to staff positions", () => {
  const sys = { trebleTop: 100, bassTop: 216 };
  assert.equal(t.get(`noteName(Object.assign({ a: 0 }, (s => ({ l: s % 7, o: Math.floor(s / 7) }))(stepAtY(${JSON.stringify(sys)}, "S", 130))))`), "G4");
  assert.equal(t.get(`noteName(Object.assign({ a: 0 }, (s => ({ l: s % 7, o: Math.floor(s / 7) }))(stepAtY(${JSON.stringify(sys)}, "B", 246))))`), "B2");
});
