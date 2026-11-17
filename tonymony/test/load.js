// Loads TonyMony's plain <script> files into one shared sandbox, in order,
// the way the browser does. The core scripts don't touch the DOM.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const JS = new URL("../public/js/", import.meta.url);
export const CORE = ["theory.js", "score.js", "checker.js", "harmonizer.js"];

export function load(files = CORE, globals = {}) {
  const context = vm.createContext({ console, ...globals });
  for (const f of files) vm.runInContext(readFileSync(new URL(f, JS), "utf8"), context, { filename: f });
  return {
    // Top-level const/let live in the script scope, so go through an expression.
    get: expr => vm.runInContext(expr, context),
    // Plain-data copy in this realm, so deepStrictEqual sees ordinary objects.
    data: expr => JSON.parse(vm.runInContext(`JSON.stringify(${expr})`, context)),
    context,
  };
}

// Source text for a score built with scoreFromText (see score.js).
export function scoreSource(o) {
  return `scoreFromText(${JSON.stringify(o)})`;
}
