import { test } from "node:test";
import assert from "node:assert/strict";
import { load, CORE } from "./load.js";

function el(tag, id) {
  const e = {
    tag, id, children: [], style: {}, dataset: {}, attrs: {}, _html: "", className: "", value: "", textContent: "", listeners: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    append(...c) { this.children.push(...c); }, appendChild(c) { this.children.push(c); return c; },
    insertBefore(c) { this.children.push(c); return c; }, insertAdjacentHTML() {},
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }, focus() {}, select() {},
    scrollIntoView() {},
    querySelectorAll: () => [], querySelector: () => null, closest: () => null, getBoundingClientRect: () => ({ left: 0, top: 0 }),
    clientWidth: 0, hidden: false, disabled: false,
    get firstChild() { return this._html ? el("svg") : null; },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; if (!v) this.children = []; },
  };
  return e;
}

test("the whole page starts, and Harmonize loads its example", async () => {
  const byId = {}, store = {};
  const document = {
    createElement: el, createElementNS: (ns, t) => el(t), activeElement: null,
    getElementById: id => (byId[id] = byId[id] || el("div", id)),
    querySelector: () => el("div"), querySelectorAll: () => [], documentElement: { dataset: {}, lang: "en" },
  };
  const errors = [];
  const t = load([...CORE, "render.js", "audio.js", "editor.js", "app.js", "i18n.js"], {
    document, window: { addEventListener() {}, scrollTo() {} }, localStorage: { getItem: () => null, setItem: (k, v) => { store[k] = v; } }, setTimeout, clearTimeout,
    history: { replaceState() {} }, location: { hash: "#harmonize" }, performance, requestAnimationFrame() {},
    matchMedia: () => ({ matches: false }), Promise,
  });
  const onErr = e => errors.push(e);
  process.on("unhandledRejection", onErr);
  await new Promise(r => setTimeout(r, 50));
  process.off("unhandledRejection", onErr);
  assert.deepEqual(errors.map(e => e.stack), []);
  byId.harmClear.listeners.click[0]();
  const staff = byId.harmEditor.children[1];
  staff.listeners.mousedown[0]({ target: staff, clientX: 200, clientY: 60, preventDefault() {} });
  staff.listeners.mousedown[0]({ target: staff, clientX: 200, clientY: 60, preventDefault() {} });
  const saved = JSON.parse(store["tm-harm"]);
  assert.equal(saved.voices.S.length, 2);
  byId.harmExample.listeners.click[0]();
  assert.equal(JSON.parse(store["tm-harm"]).voices.S.length, 7);
});
