import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// Each page loads plain <script> files that share globals, and app.js can
// start before a later script has run (it starts as soon as the music font is
// ready, which is immediate when the font is cached). So a script must not
// call a function that only a later script defines. Calls guarded with
// `typeof name === "function"` are fine.
const PUBLIC = new URL("../public/", import.meta.url);
const pages = readdirSync(PUBLIC).filter(f => f.endsWith(".html"));
const src = f => readFileSync(new URL(f, PUBLIC), "utf8");
const defined = code => new Set([...code.matchAll(/^(?:async\s+)?function\s+([\w$]+)|^(?:const|let|var)\s+([\w$]+)/gm)].map(m => m[1] || m[2]));

for (const page of pages) {
  test(`${page}: scripts only use functions from scripts loaded before them`, () => {
    const scripts = [...src(page).matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
    scripts.forEach((s, i) => {
      const code = src(s);
      const guarded = new Set([...code.matchAll(/typeof\s+([\w$]+)/g)].map(m => m[1]));
      for (const later of scripts.slice(i + 1)) {
        for (const name of defined(src(later))) {
          // Skip guarded calls, and names the script declares itself (a local helper).
          if (guarded.has(name) || new RegExp(`\\b(?:function|const|let|var)\\s+${name.replace("$", "\\$")}\\b`).test(code)) continue;
          const call = new RegExp(`(?<![\\w$.])${name.replace("$", "\\$")}\\s*\\(`);
          assert.ok(!call.test(code), `${page}: ${s} calls ${name}() from ${later}, which loads after it`);
        }
      }
    });
  });
}
