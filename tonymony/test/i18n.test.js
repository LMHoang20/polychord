import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { load } from "./load.js";

// Runs i18n.js against a tiny fake page with one translatable element.
function setup(saved) {
  const el = { dataset: { i18n: "donate" }, innerHTML: "♥ Donate" };
  const bar = { insertBefore(s) { this.select = s; } };
  const select = { dataset: {}, setAttribute() {}, appendChild() {}, addEventListener(_e, f) { this.onchange = f; } };
  const store = { lang: saved };
  const document = {
    documentElement: {},
    querySelector: () => bar,
    getElementById: () => null,
    querySelectorAll: () => [el],
    createElement: () => select,
  };
  const localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const context = vm.createContext({ document, localStorage });
  vm.runInContext(readFileSync(new URL("../public/js/i18n.js", import.meta.url), "utf8"), context);
  return { el, select, store, document, get: expr => vm.runInContext(expr, context) };
}

test("i18n: offers English plus the six requested languages", () => {
  assert.deepEqual(Object.keys(setup().get("LANGUAGES")), ["en", "vi", "zh", "th", "fr", "es", "ru"]);
});

test("i18n: every language has the same keys as Vietnamese", () => {
  const s = setup();
  const keys = Object.keys(s.get("I18N.vi")).sort();
  for (const lang of Object.keys(s.get("LANGUAGES")).filter(l => l !== "en")) {
    assert.deepEqual(Object.keys(s.get(`I18N.${lang}`)).sort(), keys, lang);
  }
});

test("i18n: saved language is applied on load, and English is restored", () => {
  const s = setup("fr");
  assert.equal(s.el.innerHTML, "♥ Faire un don");
  assert.equal(s.document.documentElement.lang, "fr");
  s.select.value = "en";
  s.select.onchange();
  assert.equal(s.el.innerHTML, "♥ Donate");
  assert.equal(s.store.lang, "en");
});

test("i18n: every checker message is translated in every language", () => {
  // A score that trips most rules: crossing, spacing, range, parallels, wrong chords, short parts…
  const mess = load().get(`checkScore(scoreFromText({ key: "C", scale: "major",
    S: "E5 D5 G5 C5 G6/h", A: "G4 A4 E4 E4 F4", T: "C4 C4 D4 F3 B3 C4", B: "C3 G3 G3 B2 B3",
    numerals: ["I", "V", "IV", "Ger+6", "viiø7", "xyz"] })).issues`);
  const msgs = mess.map(x => x.msg);
  msgs.push("Add Roman numerals under the bass to check the chords too. For now only voice leading is checked.",
    "Parallel octaves between the Soprano and Bass (C5/C3 → D5/D3).",
    "Direct (hidden) 5ths in the outer voices: the Soprano leaps into a perfect 5th in similar motion with the Bass.",
    "All four parts move up together. Move at least one part the other way for independent lines.",
    "All four parts move down together. Move at least one part the other way for independent lines.");
  assert.ok(msgs.length > 5);
  for (const lang of ["vi", "zh", "th", "fr", "es", "ru"]) {
    const s = setup(lang);
    for (const m of msgs) {
      const t = s.get("trMsg")(m);
      assert.notEqual(t, m, `${lang}: ${m}`);
      assert.ok(!/\$\d|undefined/.test(t), `${lang}: ${t}`);
    }
  }
  const vi = setup("vi");
  assert.equal(vi.get("trMsg")("The Alto part is empty."), "Bè Alto đang trống.");
  assert.equal(vi.get("trPos")("bar 2, beat 3"), "ô nhịp 2, phách 3");
});

test("i18n: English results are left as written", () => {
  const s = setup("en");
  assert.equal(s.get("trMsg")("The Alto part is empty."), "The Alto part is empty.");
  assert.equal(s.get("trPos")("bar 2, beat 3"), "bar 2, beat 3");
});

test("i18n: unknown saved language falls back to English", () => {
  assert.equal(setup("xx").el.innerHTML, "♥ Donate");
});
