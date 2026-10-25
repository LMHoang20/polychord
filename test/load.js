// Loads the site's plain <script> files into a sandbox, the way a browser
// would: one shared global scope, scripts run in order. A minimal fake DOM
// covers what the page scripts touch at init time.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const PUBLIC = new URL("../public/js/", import.meta.url);

function fakeElement(id, value = "") {
  const classes = new Set();
  return {
    id, value, innerHTML: "", textContent: "", className: "", disabled: false,
    style: {}, dataset: {},
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      toggle: (c, on) => (on ?? !classes.has(c)) ? classes.add(c) : classes.delete(c),
      contains: c => classes.has(c),
    },
    focus() {}, addEventListener() {}, appendChild() {},
  };
}

// fields: initial element values by id, e.g. { lower: "C" }. search: location.search.
export function loadScripts(files, { fields = {}, search = "" } = {}) {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, fakeElement(id, fields[id] ?? ""));
      return elements.get(id);
    },
    createElement: tag => fakeElement(tag),
  };
  const history = { replaceState(_s, _t, url) { window.location.search = url; } };
  const window = { location: { search } };
  const context = vm.createContext({ document, window, history, URLSearchParams, console });

  for (const f of files) {
    vm.runInContext(readFileSync(new URL(f, PUBLIC), "utf8"), context, { filename: f });
  }
  // Top-level const/let live in the context's script scope, not on the global
  // object, so read everything through an evaluated expression.
  return {
    get: expr => vm.runInContext(expr, context),
    // Plain-data copy in this realm, so deepStrictEqual sees ordinary arrays/objects.
    data: expr => JSON.parse(vm.runInContext(`JSON.stringify(${expr})`, context)),
    el: id => document.getElementById(id),
  };
}
