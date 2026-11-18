import { test } from "node:test";
import assert from "node:assert/strict";
import { load, CORE } from "./load.js";

function el(tag) {
  const e = {
    tag, children: [], style: {}, dataset: {}, attrs: {}, _html: "", className: "", value: "", textContent: "",
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    append(...c) { this.children.push(...c); }, appendChild(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {}, focus() {}, select() {},
    querySelectorAll: () => [], closest: () => null, getBoundingClientRect: () => ({ left: 0, top: 0 }),
    clientWidth: 0, hidden: false, disabled: false,
    get firstChild() { return this._html ? el("svg") : null; },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; if (!v) this.children = []; },
  };
  return e;
}

test("the editor draws a staff in every key and scale", () => {
  const document = { createElement: el, createElementNS: (ns, t) => el(t), activeElement: null };
  const t = load([...CORE, "render.js", "audio.js", "editor.js"], {
    document, window: { addEventListener() {} }, localStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout,
  });
  const bad = t.get(`(() => {
    const bad = [];
    Object.keys(SCALES).forEach(scale => tonicsFor(scale).forEach(tonic => {
      try {
        const root = document.createElement("div");
        createEditor(root, { voices: ["S"], initial: emptyScore({ tonic: parseNote(tonic), scale }) });
        if (!root.children.some(c => c.children.some(x => /<svg/.test(x._html)))) bad.push(tonic + " " + scale + ": no staff");
      } catch (err) { bad.push(tonic + " " + scale + ": " + err.message); }
    }));
    return bad.join("; ");
  })()`);
  assert.equal(bad, "");
});

test("a saved score that can't be drawn doesn't hide the staff", () => {
  const saved = JSON.stringify({ tonic: { l: 0, a: 0 }, scale: "major", time: [4, 4], numerals: { 0: 5 },
    voices: { S: [{ d: 48, n: { l: 0, a: 0 } }], A: [], T: [], B: [] } });
  const document = { createElement: el, createElementNS: (ns, t) => el(t), activeElement: null };
  const t = load([...CORE, "render.js", "audio.js", "editor.js"], {
    document, window: { addEventListener() {} }, localStorage: { getItem: () => saved, setItem() {} }, setTimeout, clearTimeout,
  });
  const html = t.get(`(() => {
    const root = document.createElement("div");
    createEditor(root, { voices: ["S"], storageKey: "tm-harm", initial: emptyScore() });
    return root.children.map(c => c.children.map(x => x._html).join("")).join("");
  })()`);
  assert.match(html, /<svg/);
});

test("the editor draws a staff in Harmonize (one voice)", () => {
  const document = { createElement: el, createElementNS: (ns, t) => el(t), activeElement: null };
  const t = load([...CORE, "render.js", "audio.js", "editor.js"], {
    document, window: { addEventListener() {} }, localStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout,
  });
  const html = t.get(`(() => {
    const root = document.createElement("div");
    createEditor(root, { voices: ["S"], storageKey: "tm-harm", initial: scoreFromText({ key: "G", scale: "major", numeralsOn: "S", S: "D5 E5 D5 C5 B4 A4 G4/h", numerals: ["I","IV","I","ii6","Cad64","V7","I"] }) });
    return root.children.map(c => c.children.map(x => x._html).join("")).join("");
  })()`);
  assert.match(html, /<svg/);
});
