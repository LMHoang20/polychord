/* ============================================================
   app.js: page wiring. Tabs, light/dark theme, the "Check my
   work" panel and the "Harmonize for me" panel.
   ============================================================ */

const EXAMPLES = {
  // I–IV–V–vi | ii6–V7–I with two mistakes in bar 1 beat 3.
  check: () => scoreFromText({
    key: "C", scale: "major",
    S: "E5 F5 D5 C5 D5 D5 C5/h",
    A: "G4 A4 G4 E4 F4 F4 E4/h",
    T: "C4 C4 D4 C4 A3 B3 C4/h",
    B: "C3 F3 G3 A3 F3 G3 C3/h",
    numerals: ["I", "IV", "V", "vi", "ii6", "V7", "I"],
  }),
  harmonize: () => scoreFromText({
    key: "G", scale: "major", numeralsOn: "S",
    S: "D5 E5 D5 C5 B4 A4 G4/h",
    numerals: ["I", "IV", "I", "ii6", "Cad64", "V7", "I"],
  }),
};

/* ---------- Theme ---------- */
function initTheme() {
  const btn = document.getElementById("themeBtn");
  let saved = null;
  try { saved = localStorage.getItem("tm-theme"); } catch (err) { /* ignore */ }
  const apply = t => {
    document.documentElement.dataset.theme = t;
    btn.textContent = t === "dark" ? "☀︎ Light" : "☾ Dark";
    btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === "dark" ? "#13121c" : "#f6f4ef";
  };
  apply(saved || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  btn.addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    apply(t);
    try { localStorage.setItem("tm-theme", t); } catch (err) { /* ignore */ }
  });
}

/* ---------- Tabs ---------- */
function initTabs(onShow) {
  const tabs = [...document.querySelectorAll("[role=tab]")];
  const show = id => {
    tabs.forEach(t => {
      const on = t.dataset.tab === id;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    try { localStorage.setItem("tm-tab", id); } catch (err) { /* ignore */ }
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    onShow(id);
  };
  tabs.forEach(t => {
    t.addEventListener("click", () => show(t.dataset.tab));
    t.addEventListener("keydown", e => {
      const i = tabs.indexOf(t), d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); show(n.dataset.tab); }
    });
  });
  let start = location.hash.slice(1);
  if (!tabs.some(t => t.dataset.tab === start)) { try { start = localStorage.getItem("tm-tab"); } catch (err) { start = null; } }
  if (!tabs.some(t => t.dataset.tab === start)) start = "check";
  return { show, start };
}

/* ---------- Shared bits ---------- */
const LEVEL_TEXT = { error: "Error", warn: "Warning", info: "Note" };
const LEVEL_KEY = { error: "lvlError", warn: "lvlWarn", info: "lvlNote" };

// Text from i18n.js for the chosen language ($1 filled in), or the English given.
function say(key, en, n) { return tr(key, en).replace("$1", n); }

function marksFor(issues) {
  const m = {};
  issues.forEach(x => {
    const cls = x.level === "error" ? "err" : x.level === "warn" ? "warn" : null;
    if (!cls) return;
    x.marks.forEach(k => { const id = k.v + ":" + k.idx; if (m[id] !== "err") m[id] = cls; });
    if (x.rule === "numeral") m["num:" + x.tick] = "err";
  });
  return m;
}

function summaryHtml(counts, hasNotes) {
  if (!hasNotes) return `<span class="sum-empty">${tr("nothing", "Nothing to check yet.")}</span>`;
  if (!counts.error && !counts.warn) return `<span class="badge ok">${tr("noRule", "✓ No rule broken")}</span>`;
  return [counts.error ? `<span class="badge err">${say("nErr", `${counts.error} error${counts.error > 1 ? "s" : ""}`, counts.error)}</span>` : "",
    counts.warn ? `<span class="badge warn">${say("nWarn", `${counts.warn} warning${counts.warn > 1 ? "s" : ""}`, counts.warn)}</span>` : ""].join(" ");
}

function issueListHtml(score, issues) {
  return issues.map((x, i) => `<li class="issue ${x.level}" data-i="${i}" tabindex="0">
      <span class="lvl">${tr(LEVEL_KEY[x.level], LEVEL_TEXT[x.level])}</span>
      <span class="where">${trPos(positionText(score, x.tick))}</span>
      <span class="msg">${esc(trMsg(x.msg))}</span></li>`).join("");
}

function chordListHtml(score, chords) {
  const ticks = Object.keys(chords).map(Number).sort((a, b) => a - b);
  if (!ticks.length) return "";
  return ticks.map(t => {
    const c = chords[t];
    const text = esc(score.numerals[t]);
    if (!c || c.error) return `<li><b>${text}</b> <span class="bad">${tr("cantChord", "can't read this")}</span></li>`;
    const bassTone = c.tones.find(x => x.role === c.bassRole);
    return `<li><span class="where">${trPos(positionText(score, t))}</span> <b>${text}</b> = ${esc(c.name)}: ${esc(chordToneList(c))}${bassTone ? ` <span class="muted">(${tr("bassLbl", "bass")} ${esc(pcName(bassTone))})</span>` : ""}</li>`;
  }).join("");
}

function playButton(btn, getScore, getBpm) {
  let on = false;
  const reset = () => { on = false; btn.textContent = "▶ Play"; btn.classList.remove("on"); };
  btn.addEventListener("click", () => {
    if (on) { stopScore(); reset(); return; }
    document.querySelectorAll(".play.on").forEach(b => b !== btn && b.click());
    on = true;
    btn.textContent = "■ Stop";
    btn.classList.add("on");
    playScore(getScore(), getBpm(), reset);
  });
  btn.textContent = "▶ Play";
  return reset;
}

/* ---------- Check my work ---------- */
let refreshResults = null;   // redraws the results; i18n.js calls it when the language changes

function initCheck(openTab) {
  const results = document.getElementById("checkResults");
  const summary = document.getElementById("checkSummary");
  const list = document.getElementById("issueList");
  const chordList = document.getElementById("chordList");
  const bpm = document.getElementById("checkBpm");
  let last = null;

  const ed = createEditor(document.getElementById("checkEditor"), {
    storageKey: "tm-check", initial: EXAMPLES.check(), onChange: run,
  });

  function run(score) {
    const res = checkScore(score);
    last = { score, res };
    const hasNotes = VOICES.some(v => score.voices[v].some(e => !e.r));
    summary.innerHTML = summaryHtml(res.counts, hasNotes);
    list.innerHTML = issueListHtml(score, res.issues);
    chordList.innerHTML = chordListHtml(score, res.chords);
    document.getElementById("chordBox").hidden = !chordList.innerHTML;
    ed.setMarks(marksFor(res.issues));
    results.classList.toggle("clean", hasNotes && !res.counts.error && !res.counts.warn);
  }

  const focusIssue = (li, on) => {
    if (!last) return;
    const x = last.res.issues[+li.dataset.i];
    const m = marksFor(last.res.issues);
    if (on) x.marks.forEach(k => { m[k.v + ":" + k.idx] = (m[k.v + ":" + k.idx] || "") + " focus"; });
    ed.setMarks(m);
  };
  list.addEventListener("mouseover", e => { const li = e.target.closest(".issue"); if (li) focusIssue(li, true); });
  list.addEventListener("mouseout", e => { const li = e.target.closest(".issue"); if (li) focusIssue(li, false); });
  list.addEventListener("click", e => {
    const li = e.target.closest(".issue");
    if (!li || !last) return;
    const x = last.res.issues[+li.dataset.i];
    if (x.marks.length) ed.select(x.marks[x.marks.length - 1].v, x.marks[x.marks.length - 1].idx);
  });
  list.addEventListener("keydown", e => { if (e.key === "Enter") e.target.click(); });

  playButton(document.getElementById("checkPlay"), ed.getScore, () => +bpm.value || 72);
  document.getElementById("checkExample").addEventListener("click", () => ed.setScore(EXAMPLES.check()));
  document.getElementById("checkClear").addEventListener("click", () => {
    const s = ed.getScore();
    ed.setScore(emptyScore({ tonic: s.tonic, scale: s.scale, time: s.time }), { active: "S" });
    ed.focus();
  });

  run(ed.getScore());
  refreshResults = () => run(ed.getScore());
  return { editor: ed, load: score => { ed.setScore(score); openTab("check"); window.scrollTo({ top: 0, behavior: "smooth" }); } };
}

/* ---------- Harmonize for me ---------- */
function initHarmonize(check) {
  const givenSeg = document.getElementById("givenSeg");
  const countSel = document.getElementById("answerCount");
  const out = document.getElementById("answers");
  const problems = document.getElementById("harmProblems");
  const bpm = document.getElementById("harmBpm");
  let given = "S";
  let drawers = [];   // redraw functions of the current answer cards
  window.addEventListener("resize", () => drawers.forEach(d => d()));
  try { if (localStorage.getItem("tm-given") === "B") given = "B"; } catch (err) { /* ignore */ }

  const ed = createEditor(document.getElementById("harmEditor"), {
    storageKey: "tm-harm", voices: [given], initial: EXAMPLES.harmonize(), onChange: () => { out.innerHTML = ""; problems.hidden = true; },
  });
  // Only the given line is used; drop anything else a saved score carries.
  const keepGiven = s => { const c = cloneScore(s); VOICES.forEach(v => { if (v !== given) c.voices[v] = []; }); return c; };

  function syncGiven() {
    givenSeg.querySelectorAll("button").forEach(b => { b.classList.toggle("on", b.dataset.v === given); b.setAttribute("aria-pressed", b.dataset.v === given); });
    document.getElementById("givenHint").textContent = given === "S"
      ? "Next: click the treble staff to write the melody (or type the letters A–G), then click the + under each note to give its chord, or pick one from the chord buttons. Then press Harmonize."
      : "Next: click the bass staff to write the bass (or type the letters A–G), then click the + under each note to give its chord, or pick one from the chord buttons. The figure (6, 64, 65…) must match the bass note. Then press Harmonize.";
  }
  givenSeg.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.v === given) { ed.focus(); return; }   // already chosen: go straight to writing
    const from = given;
    given = b.dataset.v;
    try { localStorage.setItem("tm-given", given); } catch (err) { /* ignore */ }
    // Move the line to the other voice, by whole octaves into its range.
    const s = cloneScore(ed.getScore());
    const notes = s.voices[from].filter(x => !x.r);
    if (notes.length) {
      const avg = notes.reduce((a, x) => a + noteMidi(x.n), 0) / notes.length;
      const shift = Math.round((VOICE_CENTER[given] - avg) / 12);
      s.voices[from].forEach(x => { if (!x.r) x.n.o += shift; });
    }
    s.voices[given] = s.voices[from];
    s.voices[from] = [];
    ed.setVoices([given]);
    ed.setScore(s, { active: given });
    syncGiven();
    ed.focus();
  });

  document.getElementById("harmGo").addEventListener("click", () => {
    const score = keepGiven(ed.getScore());
    const t0 = performance.now();
    const res = harmonize(score, { given, count: +countSel.value });
    const ms = Math.round(performance.now() - t0);
    problems.hidden = !res.problems.length;
    problems.innerHTML = res.problems.map(p => `<li>${esc(p)}</li>`).join("");
    out.innerHTML = "";
    drawers = [];
    if (!res.solutions.length) {
      if (!res.problems.length) problems.innerHTML = "<li>No answer found.</li>";
      problems.hidden = false;
      return;
    }
    res.solutions.forEach((sol, i) => out.appendChild(answerCard(sol, i)));
    out.insertAdjacentHTML("afterbegin", `<p class="muted small">${res.solutions.length} answer${res.solutions.length > 1 ? "s" : ""} in ${ms} ms, best first.${res.solutions.some(s => s.auto) ? " Notes without a chord got one picked for them (shown in the answer)." : ""}</p>`);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function answerCard(sol, i) {
    const card = h("article", { class: "card answer" });
    const issues = sol.check.issues.filter(x => x.level !== "info");
    card.innerHTML = `<header class="answer-head">
        <h3>Answer ${i + 1}</h3>
        <div class="answer-sum">${summaryHtml(sol.check.counts, true)}</div>
        <div class="answer-actions"><button type="button" class="btn play"></button><button type="button" class="btn ghost open">Edit in checker</button></div>
      </header>
      <div class="answer-score"></div>
      ${issues.length ? `<details class="answer-issues"><summary>What to look at</summary><ul class="issues">${issueListHtml(sol.score, issues)}</ul></details>` : ""}`;
    const box = card.querySelector(".answer-score");
    const draw = () => {
      const r = renderScore(sol.score, { width: Math.max(320, box.clientWidth || out.clientWidth - 40), marks: marksFor(sol.check.issues) });
      box.innerHTML = r.svg;
    };
    requestAnimationFrame(draw);
    drawers.push(draw);
    playButton(card.querySelector(".play"), () => sol.score, () => +bpm.value || 72);
    card.querySelector(".open").addEventListener("click", () => check.load(sol.score));
    return card;
  }

  syncGiven();
  if (ed.getScore().voices[given].length === 0 && VOICES.some(v => v !== given && ed.getScore().voices[v].length)) ed.setScore(keepGiven(ed.getScore()));
  document.getElementById("harmExample").addEventListener("click", () => {
    const ex = EXAMPLES.harmonize();
    if (given === "B") { ex.voices.B = ex.voices.S.map(x => x.r ? x : { d: x.d, n: Object.assign({}, x.n, { o: x.n.o - 2 }) }); ex.voices.S = []; ex.numerals = {}; }
    ed.setScore(ex, { active: given });
  });
  document.getElementById("harmClear").addEventListener("click", () => {
    const s = ed.getScore();
    ed.setScore(emptyScore({ tonic: s.tonic, scale: s.scale, time: s.time }), { active: given });
    ed.focus();
  });
  return { editor: ed };
}

/* ---------- Start ---------- */
function start() {
  initTheme();
  let check, harm;
  const tabs = initTabs(id => {
    // An editor can only measure its width while visible.
    if (id === "check" && check) check.editor.render();
    if (id === "harmonize" && harm) harm.editor.render();
  });
  check = initCheck(tabs.show);
  harm = initHarmonize(check);
  tabs.show(tabs.start);
}

// Draw once the music font is in, so the first render has real glyphs.
(document.fonts && document.fonts.load ? Promise.race([document.fonts.load("40px Bravura"), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve())
  .catch(() => {}).then(start);
