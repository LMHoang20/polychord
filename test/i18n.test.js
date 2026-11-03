import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Runs i18n.js against a tiny fake page with one translatable element.
function setup(saved) {
  const el = { dataset: { i18n: "home" }, innerHTML: "Home" };
  const links = { appendChild(s) { this.select = s; } };
  const select = { dataset: {}, setAttribute() {}, appendChild() {}, addEventListener(_e, f) { this.onchange = f; } };
  const store = { lang: saved };
  const document = {
    documentElement: {},
    querySelector: () => links,
    querySelectorAll: () => [el],
    createElement: () => select,
  };
  const localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const context = vm.createContext({ document, localStorage });
  vm.runInContext(readFileSync(new URL("../public/js/i18n.js", import.meta.url), "utf8"), context);
  return { el, select, store, document, get: expr => vm.runInContext(expr, context) };
}

test("i18n: every language has the same keys as Vietnamese", () => {
  const s = setup();
  const keys = Object.keys(s.get("I18N.vi")).sort();
  for (const lang of Object.keys(s.get("LANGUAGES")).filter(l => l !== "en")) {
    assert.deepEqual(Object.keys(s.get(`I18N.${lang}`)).sort(), keys, lang);
  }
});

test("i18n: offers the eight languages", () => {
  assert.deepEqual(Object.keys(setup().get("LANGUAGES")), ["en", "vi", "zh", "ja", "ko", "fr", "es", "ru"]);
});

test("i18n: saved language is applied on load, and English is restored", () => {
  const s = setup("fr");
  assert.equal(s.el.innerHTML, "Accueil");
  assert.equal(s.document.documentElement.lang, "fr");
  s.select.value = "en";
  s.select.onchange();
  assert.equal(s.el.innerHTML, "Home");
  assert.equal(s.store.lang, "en");
});

test("i18n: unknown saved language falls back to English", () => {
  assert.equal(setup("xx").el.innerHTML, "Home");
});
