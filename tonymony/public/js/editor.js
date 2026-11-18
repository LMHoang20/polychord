/* ============================================================
   editor.js: interactive score editor (settings, toolbar, chord
   chips, clickable grand staff, Roman numeral entry, undo).

   const ed = createEditor(rootElement, {
     storageKey, voices: ["S","A","T","B"], initial: score,
     onChange(score) })
   ed.getScore(), ed.setScore(score), ed.setMarks(marks),
   ed.setVoices(list), ed.select(v, idx), ed.render()
   ============================================================ */

const VOICE_CENTER = { S: 72, A: 65, T: 57, B: 48 };
const DUR_GLYPH = { w: "", h: "", q: "", e: "", s: "" };
const ACC_BUTTONS = [[-2, "", "Double flat"], [-1, "", "Flat ( - )"], [0, "", "Natural ( n )"], [1, "", "Sharp ( = )"], [2, "", "Double sharp"]];
const EXTRA_CHORDS = ["V7", "viiø7", "vii°7", "Cad64", "N6", "It+6", "Fr+6", "Ger+6", "V/V", "V7/V", "vii°7/V", "V7/IV", "V7/ii", "V7/vi", "bVI", "iv"];
const FIGURE_CHIPS = ["6", "64", "7", "65", "43", "42"];
const SYMBOL_CHIPS = [["+", "Augmented"], ["°", "Diminished"], ["ø", "Half-diminished"]];

function h(tag, attrs, html) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  });
  if (html !== undefined) el.innerHTML = html;
  return el;
}

function createEditor(root, opts) {
  let score = opts.initial ? cloneScore(opts.initial) : emptyScore();
  try {
    const saved = opts.storageKey && JSON.parse(localStorage.getItem(opts.storageKey));
    if (validScore(saved)) score = saved;
  } catch (err) { /* storage blocked or bad data: keep the default */ }

  let voices = opts.voices || VOICES.slice();
  let active = voices[0];
  let dur = 48, dotted = false, restMode = false, pendingAcc = null;
  let selected = null;        // {v, idx}
  let numeralTick = null;     // tick whose numeral is being typed
  let marks = {}, layout = null;
  const undo = [], redo = [];

  /* ---------- DOM ---------- */
  root.classList.add("editor");
  root.innerHTML = "";
  const settings = h("div", { class: "ed-settings" });
  const tonicSel = h("select", { "aria-label": "Key" });
  const scaleSel = h("select", { "aria-label": "Scale" });
  const tnum = h("select", { "aria-label": "Beats per bar" });
  const tden = h("select", { "aria-label": "Beat unit" });
  Object.keys(SCALES).forEach(id => scaleSel.appendChild(h("option", { value: id }, SCALES[id].name)));
  [2, 3, 4, 5, 6, 7, 9, 12].forEach(n => tnum.appendChild(h("option", { value: n }, n)));
  [2, 4, 8].forEach(n => tden.appendChild(h("option", { value: n }, n)));
  settings.append(
    field("Key", tonicSel), field("Scale", scaleSel),
    field("Time", h("span", { class: "time-pick" }), tp => { tp.append(tnum, h("span", {}, "/"), tden); }),
  );
  function field(label, control, fill) {
    const f = h("label", { class: "field" });
    f.append(h("span", { class: "field-label" }, label), control);
    if (fill) fill(control);
    return f;
  }

  const toolbar = h("div", { class: "ed-toolbar", role: "toolbar", "aria-label": "Note entry" });
  const voiceSeg = h("div", { class: "seg voices", role: "group", "aria-label": "Voice" });
  const durSeg = h("div", { class: "seg", role: "group", "aria-label": "Duration" });
  DURATIONS.forEach((d, i) => durSeg.appendChild(h("button", { type: "button", class: "tool smufl", "data-dur": d.ticks, title: `${d.name} ( ${i + 1} )`, "aria-label": d.name }, DUR_GLYPH[d.id])));
  const dotBtn = h("button", { type: "button", class: "tool dot", title: "Dotted ( . )", "aria-label": "Dotted" }, "•");
  //" ");
  //"";   // just the augmentation dot, no note
  const restBtn = h("button", { type: "button", class: "tool smufl", title: "Rest ( R )", "aria-label": "Rest" }, "");
  durSeg.append(dotBtn, restBtn);
  const accSeg = h("div", { class: "seg", role: "group", "aria-label": "Accidental" });
  ACC_BUTTONS.forEach(([a, g, name]) => accSeg.appendChild(h("button", { type: "button", class: "tool smufl acc", "data-acc": a, title: name, "aria-label": name }, g)));
  const actSeg = h("div", { class: "seg", role: "group", "aria-label": "Edit" });
  const undoBtn = h("button", { type: "button", class: "tool", title: "Undo (Ctrl/⌘+Z)", "aria-label": "Undo" }, "↶");
  const redoBtn = h("button", { type: "button", class: "tool", title: "Redo (Ctrl/⌘+Shift+Z)", "aria-label": "Redo" }, "↷");
  const delBtn = h("button", { type: "button", class: "tool", title: "Delete note (Backspace)", "aria-label": "Delete note" }, "⌫");
  actSeg.append(undoBtn, redoBtn, delBtn);
  toolbar.append(voiceSeg, durSeg, accSeg, actSeg);

  const chips = h("div", { class: "ed-chips" });
  const staffBox = h("div", { class: "ed-staff", tabindex: "0", "aria-label": "Score. Click to add notes." });
  const svgHolder = h("div", { class: "ed-svg" });
  const numInput = h("input", { class: "num-input", type: "text", spellcheck: "false", autocomplete: "off", "aria-label": "Roman numeral", placeholder: "V65" });
  staffBox.append(svgHolder, numInput);
  const status = h("p", { class: "ed-status", "aria-live": "polite" });
  root.append(settings, toolbar, chips, staffBox, status);

  /* ---------- state helpers ---------- */
  const key = () => scoreKey(score);
  const evAt = (v, idx) => score.voices[v][idx];
  const voiceEnd = v => voiceLength(score, v);

  function commit(mutate, opts2) {
    undo.push(JSON.stringify(score));
    if (undo.length > 200) undo.shift();
    redo.length = 0;
    mutate();
    changed(opts2);
  }
  function changed(o) {
    if (selected && !evAt(selected.v, selected.idx)) selected = null;
    try { if (opts.storageKey) localStorage.setItem(opts.storageKey, JSON.stringify(score)); } catch (err) { /* ignore */ }
    if (!(o && o.quiet)) syncControls();
    render();
    if (opts.onChange) opts.onChange(score);
  }

  function syncControls() {
    const tonics = tonicsFor(score.scale);
    const cur = pcName(score.tonic).replace("♯", "#").replace("♭", "b");
    tonicSel.innerHTML = "";
    tonics.forEach(t => tonicSel.appendChild(h("option", { value: t }, t.replace("#", "♯").replace(/(?<=[A-G])b/, "♭"))));
    tonicSel.value = tonics.includes(cur) ? cur : tonics[0];
    scaleSel.value = score.scale;
    tnum.value = score.time[0];
    tden.value = score.time[1];

    voiceSeg.innerHTML = "";
    voices.forEach(v => voiceSeg.appendChild(h("button", { type: "button", class: `tool voice v-${v}${v === active ? " on" : ""}`, "data-v": v, title: `${VOICE_NAMES[v]} (Alt+${VOICES.indexOf(v) + 1})`, "aria-pressed": v === active }, `<b>${v}</b><span>${VOICE_NAMES[v]}</span>`)));
    voiceSeg.hidden = voices.length < 2;

    const selEv = selected && evAt(selected.v, selected.idx);
    const showDur = selEv ? splitDuration(selEv.d) : { base: DURATIONS.find(d => d.ticks === dur), dots: dotted ? 1 : 0 };
    durSeg.querySelectorAll("[data-dur]").forEach(b => b.classList.toggle("on", +b.dataset.dur === showDur.base.ticks));
    dotBtn.classList.toggle("on", !!showDur.dots);
    restBtn.classList.toggle("on", selEv ? !!selEv.r : restMode);
    const accOn = selEv && !selEv.r ? (showAccidentalOf(selEv) ? selEv.n.a : null) : pendingAcc;
    accSeg.querySelectorAll("[data-acc]").forEach(b => b.classList.toggle("on", accOn !== null && +b.dataset.acc === accOn));
    undoBtn.disabled = !undo.length;
    redoBtn.disabled = !redo.length;
    delBtn.disabled = !selEv && !score.voices[active].length;
    buildChips();
  }
  function showAccidentalOf(ev) { return ev.n.a !== keyAccidental(keySignature(key()), ev.n.l); }

  function buildChips() {
    chips.innerHTML = "";
    const k = key();
    const groups = [
      ["Triads", diatonicNumerals(k, false)],
      ["7ths", diatonicNumerals(k, true)],
      ["More", EXTRA_CHORDS.filter(c => { const p = parseNumeral(c, k); return p && !p.error; })],
    ];
    groups.forEach(([label, list]) => {
      const row = h("div", { class: "chip-row" });
      row.appendChild(h("span", { class: "chip-label" }, label));
      [...new Set(list)].forEach(c => row.appendChild(h("button", { type: "button", class: "chip", "data-num": c, title: chordTitle(c) }, esc(c))));
      chips.appendChild(row);
    });
    const figs = h("div", { class: "chip-row" });
    figs.appendChild(h("span", { class: "chip-label" }, "Figures"));
    FIGURE_CHIPS.forEach(f => figs.appendChild(h("button", { type: "button", class: "chip fig-chip", "data-fig": f, title: `Add figure ${f}` }, f)));
    figs.appendChild(h("button", { type: "button", class: "chip fig-chip", "data-fig": "", title: "Remove the chord at this beat" }, "✕"));
    chips.appendChild(figs);
    const syms = h("div", { class: "chip-row" });
    syms.appendChild(h("span", { class: "chip-label" }, "Symbols"));
    SYMBOL_CHIPS.forEach(([s, name]) => syms.appendChild(h("button", { type: "button", class: "chip fig-chip", "data-sym": s, title: `${name}: put ${s} on the chord at this beat` }, s)));
    chips.appendChild(syms);
  }
  function chordTitle(c) {
    const p = parseNumeral(c, key());
    return p && !p.error ? `${c}: ${p.name} (${chordToneList(p)})` : c;
  }

  /* ---------- editing ---------- */
  function lastNoteBefore(v, idx) {
    for (let i = (idx ?? score.voices[v].length) - 1; i >= 0; i--) if (!score.voices[v][i].r) return score.voices[v][i].n;
    return null;
  }
  function inputTicks() { return dotted ? dur * 1.5 : dur; }

  function appendEvent(ev) {
    commit(() => { score.voices[active].push(ev); });
    selected = null;
    pendingAcc = null;
    syncControls();
    if (!ev.r) previewChord(active, score.voices[active].length - 1);
  }
  function previewChord(v, idx) {
    try { previewNotes([evAt(v, idx).n]); } catch (err) { /* no audio */ }
  }

  function noteFromStep(step, acc) {
    const l = mod(step, 7), o = Math.floor(step / 7);
    return { l, a: acc ?? keyAccidental(keySignature(key()), l), o };
  }
  function clampStep(v, step) {
    const [lo, hi] = RANGE_MIDI[v];
    const loStep = noteStep({ l: 0, a: 0, o: Math.floor(lo / 12) - 1 }) - 4;
    const hiStep = noteStep({ l: 0, a: 0, o: Math.floor(hi / 12) - 1 }) + 11;
    return Math.max(loStep, Math.min(hiStep, step));
  }
  // The note of letter l closest to a reference pitch.
  function nearestLetter(l, refMidi) {
    let best = null;
    for (let o = 1; o <= 7; o++) {
      const n = { l, a: keyAccidental(keySignature(key()), l), o };
      if (!best || Math.abs(noteMidi(n) - refMidi) < Math.abs(noteMidi(best) - refMidi)) best = n;
    }
    return best;
  }

  function target() {   // selected note, or the last note of the active voice
    if (selected) return selected;
    const list = score.voices[active];
    return list.length ? { v: active, idx: list.length - 1 } : null;
  }
  function modifyTarget(fn, preview) {
    const t = target();
    if (!t) return;
    commit(() => fn(evAt(t.v, t.idx)));
    if (preview && !evAt(t.v, t.idx).r) previewChord(t.v, t.idx);
  }

  function setDuration(ticks) {
    dur = ticks;
    if (selected) commit(() => { evAt(selected.v, selected.idx).d = dotted ? ticks * 1.5 : ticks; });
    else syncControls();
  }
  function toggleDot() {
    if (selected) {
      const ev = evAt(selected.v, selected.idx), sd = splitDuration(ev.d);
      commit(() => { ev.d = sd.dots ? sd.base.ticks : sd.base.ticks * 1.5; });
      return;
    }
    dotted = !dotted;
    syncControls();
  }
  function toggleRest() {
    if (selected) {
      const ev = evAt(selected.v, selected.idx);
      commit(() => {
        if (ev.r) { delete ev.r; ev.n = lastNoteBefore(selected.v, selected.idx) || nearestLetter(0, VOICE_CENTER[selected.v]); }
        else { ev.r = true; delete ev.n; }
      });
      return;
    }
    restMode = !restMode;
    syncControls();
  }
  function setAccidental(a, fromKeyboard) {
    const t = selected || (fromKeyboard ? target() : null);
    if (t && !evAt(t.v, t.idx).r) {
      const ev = evAt(t.v, t.idx);
      commit(() => { ev.n.a = ev.n.a === a && !fromKeyboard ? keyAccidental(keySignature(key()), ev.n.l) : a; });
      previewChord(t.v, t.idx);
      return;
    }
    pendingAcc = pendingAcc === a ? null : a;
    syncControls();
  }
  function moveStep(delta) {
    const t = target();
    if (!t || evAt(t.v, t.idx).r) return;
    modifyTarget(ev => { ev.n = noteFromStep(noteStep(ev.n) + delta); }, true);
  }
  function deleteTarget() {
    const t = target();
    if (!t) return;
    commit(() => { score.voices[t.v].splice(t.idx, 1); });
    selected = selected && t.idx > 0 ? { v: t.v, idx: t.idx - 1 } : null;
    syncControls();
    render();
  }
  function selectNote(v, idx) {
    if (!voices.includes(v)) return;
    selected = { v, idx };
    active = v;
    closeNumeral(true);
    syncControls();
    render();
  }
  function stepSelection(d) {
    const t = target();
    if (!t) return;
    const idx = t.idx + (selected ? d : d < 0 ? 0 : 1);
    if (idx >= 0 && idx < score.voices[t.v].length) selectNote(t.v, idx);
    else { selected = null; syncControls(); render(); }
  }
  function setActive(v) {
    if (!voices.includes(v)) return;
    active = v;
    selected = null;
    syncControls();
    render();
  }

  /* ---------- Roman numerals ---------- */
  function noteTicks() {
    return onsetTicks(score).filter(t => VOICES.some(v => { const e = voiceAt(score, v, t); return e && e.attacked; }));
  }
  function openNumeral(tick) {
    numeralTick = tick;
    render();
    const slot = layout && layout.systems.flatMap(s => s.slots.map(x => Object.assign({ numY: s.numY }, x))).find(x => x.tick === tick);
    if (!slot) return;
    numInput.style.left = Math.max(0, slot.x - 8) + "px";
    numInput.style.top = (slot.numY - 22) + "px";
    numInput.value = score.numerals[tick] || "";
    numInput.classList.add("open");
    numInput.focus();
    numInput.select();
    status.textContent = `Chord at ${positionText(score, tick)}: type a Roman numeral (Enter to save, Tab for the next beat).`;
  }
  function setNumeral(tick, text) {
    const t = String(text || "").trim();
    if ((score.numerals[tick] || "") === t) return;
    commit(() => { if (t) score.numerals[tick] = t; else delete score.numerals[tick]; }, { quiet: true });
  }
  function closeNumeral(save) {
    if (numeralTick === null) return;
    const tick = numeralTick;
    numeralTick = null;
    numInput.classList.remove("open");
    if (save) setNumeral(tick, numInput.value);
    status.textContent = "";
    render();
  }
  function nextNumeralTick(tick, d) {
    const ticks = noteTicks();
    const i = ticks.indexOf(tick);
    return ticks[i + d] ?? null;
  }
  function chipTick() {
    if (numeralTick !== null) return numeralTick;
    if (selected) return voiceEvents(score, selected.v)[selected.idx].start;
    const ticks = noteTicks();
    return ticks.find(t => !score.numerals[t]) ?? ticks[ticks.length - 1] ?? null;
  }
  function useChip(btn) {
    const tick = chipTick();
    if (tick === null) { status.textContent = "Write some notes first, then pick chords for them."; return; }
    if (btn.dataset.num !== undefined) {
      if (numeralTick !== null) { numInput.value = btn.dataset.num; closeNumeral(true); }
      else setNumeral(tick, btn.dataset.num);
      const nx = nextNumeralTick(tick, 1);
      if (nx !== null && !selected) openNumeral(nx);
    } else if (btn.dataset.sym !== undefined) {
      const sym = btn.dataset.sym;
      const cur = numeralTick !== null ? numInput.value : score.numerals[tick] || "";
      // ° and ø go on lowercase numerals, + on uppercase ones
      const value = cur.replace(/^([#b]*)([IViv]+)[°ø+]?/, (m, acc, rn) => acc + (sym === "+" ? rn.toUpperCase() : rn.toLowerCase()) + sym);
      if (value === cur) { status.textContent = "Pick a chord first, then add the symbol."; return; }
      if (numeralTick !== null) { numInput.value = value; numInput.focus(); }
      else setNumeral(tick, value);
    } else {
      const fig = btn.dataset.fig;
      const cur = numeralTick !== null ? numInput.value : score.numerals[tick] || "";
      const base = cur.replace(/^([^/\d]*)\d*/, "$1");
      const value = fig === "" ? "" : base.replace(/^([^/]*)/, "$1" + fig);
      if (numeralTick !== null) { numInput.value = value; numInput.focus(); }
      else setNumeral(tick, value);
    }
  }

  /* ---------- rendering ---------- */
  function render() {
    const width = Math.max(320, staffBox.clientWidth || 900);
    const cursorTick = voices.includes(active) && !selected ? voiceEnd(active) : null;
    layout = renderScore(score, {
      width, marks, selected, editable: true, activeVoice: active, numeralTick,
      cursor: cursorTick !== null ? { v: active, tick: cursorTick } : null,
    });
    svgHolder.innerHTML = layout.svg;
    const svg = svgHolder.firstChild;
    svg.classList.add("editing");
    ghost = null;   // rebuilt on the next mouse move
  }

  /* ---------- pointer ---------- */
  let ghost = null;
  function pointIn(e) {
    const r = svgHolder.firstChild.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function hitTest(p) {
    if (!layout) return null;
    const sys = layout.systems.find(s => p.y >= s.y0 && p.y < s.y1);
    if (!sys) return null;
    if (p.y > sys.bassTop + 40 + 22) {
      const slot = sys.slots.find(s => p.x >= s.x0 - 2 && p.x < s.x1);
      return slot ? { kind: "numeral", tick: slot.tick } : null;
    }
    let best = null, bd = 1e9;
    layout.notes.filter(n => n.sys === sys.index && voices.includes(n.v)).forEach(n => {
      const dx = Math.abs(n.x - p.x), dy = Math.abs(n.y - p.y);
      if (dx > 10 || dy > (n.rest ? 16 : 6)) return;
      const d = dx + dy + (n.v === active ? 0 : 3);
      if (d < bd) { bd = d; best = n; }
    });
    if (best) return { kind: "note", v: best.v, idx: best.idx };
    // Repitch: click in the selected note's column
    if (selected) {
      const start = voiceEvents(score, selected.v)[selected.idx].start;
      const slot = sys.slots.find(s => s.tick === start);
      if (slot && p.x >= slot.x0 && p.x < slot.x1) return { kind: "repitch", step: clampStep(selected.v, stepAtY(sys, selected.v, p.y)) };
    }
    return { kind: "add", step: clampStep(active, stepAtY(sys, active, p.y)), sys };
  }

  staffBox.addEventListener("mousedown", e => {
    if (e.target === numInput || !svgHolder.firstChild) return;
    const hit = hitTest(pointIn(e));
    if (!hit) return;
    e.preventDefault();
    staffBox.focus({ preventScroll: true });
    if (hit.kind === "numeral") { closeNumeral(true); openNumeral(hit.tick); return; }
    closeNumeral(true);
    if (hit.kind === "note") { selectNote(hit.v, hit.idx); return; }
    if (hit.kind === "repitch") {
      const ev = evAt(selected.v, selected.idx);
      commit(() => { ev.r ? (delete ev.r, ev.n = noteFromStep(hit.step)) : (ev.n = noteFromStep(hit.step)); });
      previewChord(selected.v, selected.idx);
      return;
    }
    if (selected) { selected = null; syncControls(); }
    appendEvent(restMode ? { d: inputTicks(), r: true } : { d: inputTicks(), n: noteFromStep(hit.step, pendingAcc) });
  });

  staffBox.addEventListener("mousemove", e => {
    if (!svgHolder.firstChild) return;
    const p = pointIn(e), hit = hitTest(p);
    const svg = svgHolder.firstChild;
    if (!ghost || ghost.ownerSVGElement !== svg) {
      ghost = document.createElementNS("http://www.w3.org/2000/svg", "g");
      ghost.setAttribute("class", "ghost");
      svg.appendChild(ghost);
    }
    staffBox.classList.toggle("over-note", !!hit && hit.kind === "note");
    staffBox.classList.toggle("over-num", !!hit && hit.kind === "numeral");
    if (!hit || (hit.kind !== "add" && hit.kind !== "repitch") || restMode) { ghost.innerHTML = ""; return; }
    const v = hit.kind === "repitch" ? selected.v : active;
    const sys = layout.systems.find(s => p.y >= s.y0 && p.y < s.y1);
    let x;
    if (hit.kind === "repitch") x = sys.slots.find(s => s.tick === voiceEvents(score, selected.v)[selected.idx].start).x;
    else {
      const slot = layout.systems.flatMap(s => s.slots.map(x => Object.assign({ sys: s.index }, x))).find(s => s.tick === voiceEnd(active));
      x = slot && slot.sys === sys.index ? slot.x : p.x - HEAD_W / 2;
    }
    const staff = STAFF_OF[v], top = staff ? sys.bassTop : sys.trebleTop;
    const y = stepY(top, staff, hit.step);
    let g = "";
    const lo = staff ? 18 : 30, hi = staff ? 26 : 38;
    for (let s = hi + 2; s <= hit.step; s += 2) g += line(x - 4, stepY(top, staff, s), x + HEAD_W + 4, stepY(top, staff, s), 1.2);
    for (let s = lo - 2; s >= hit.step; s -= 2) g += line(x - 4, stepY(top, staff, s), x + HEAD_W + 4, stepY(top, staff, s), 1.2);
    const n = noteFromStep(hit.step, hit.kind === "add" ? pendingAcc : undefined);
    ghost.innerHTML = g + glyph(GLYPH.head.q, x, y) + `<text class="ghost-label" x="${r1(x + HEAD_W + 8)}" y="${r1(y + 4)}">${esc(noteName(n))}</text>`;
  });
  staffBox.addEventListener("mouseleave", () => { if (ghost) ghost.innerHTML = ""; });

  /* ---------- toolbar ---------- */
  toolbar.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.v) setActive(b.dataset.v);
    else if (b.dataset.dur) setDuration(+b.dataset.dur);
    else if (b === dotBtn) toggleDot();
    else if (b === restBtn) toggleRest();
    else if (b.dataset.acc !== undefined) setAccidental(+b.dataset.acc);
    else if (b === undoBtn) doUndo();
    else if (b === redoBtn) doRedo();
    else if (b === delBtn) deleteTarget();
  });
  chips.addEventListener("mousedown", e => { if (e.target.closest(".chip")) e.preventDefault(); });   // keep the numeral box open
  chips.addEventListener("click", e => { const b = e.target.closest(".chip"); if (b) useChip(b); });

  tonicSel.addEventListener("change", () => commit(() => { score.tonic = parseNote(tonicSel.value); delete score.tonic.o; }));
  scaleSel.addEventListener("change", () => commit(() => {
    score.scale = scaleSel.value;
    const ok = tonicsFor(score.scale).map(t => parseNote(t)).some(p => samePc(p, score.tonic));
    if (!ok) { const p = parseNote(tonicsFor(score.scale)[0]); score.tonic = { l: p.l, a: p.a }; }
  }));
  tnum.addEventListener("change", () => commit(() => { score.time = [+tnum.value, score.time[1]]; }));
  tden.addEventListener("change", () => commit(() => { score.time = [score.time[0], +tden.value]; }));

  function doUndo() {
    if (!undo.length) return;
    redo.push(JSON.stringify(score));
    score = JSON.parse(undo.pop());
    changed();
  }
  function doRedo() {
    if (!redo.length) return;
    undo.push(JSON.stringify(score));
    score = JSON.parse(redo.pop());
    changed();
  }

  /* ---------- numeral input ---------- */
  numInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); closeNumeral(true); staffBox.focus({ preventScroll: true }); }
    else if (e.key === "Escape") { e.preventDefault(); closeNumeral(false); staffBox.focus({ preventScroll: true }); }
    else if (e.key === "Tab") {
      e.preventDefault();
      const t = numeralTick, nx = nextNumeralTick(t, e.shiftKey ? -1 : 1);
      closeNumeral(true);
      if (nx !== null) openNumeral(nx); else staffBox.focus({ preventScroll: true });
    }
    e.stopPropagation();
  });
  numInput.addEventListener("input", () => {
    const p = parseNumeral(numInput.value, key());
    numInput.classList.toggle("invalid", !!(p && p.error));
    status.textContent = !p ? "" : p.error ? p.error : `${normalizeNumeral(numInput.value)} = ${p.name}: ${chordToneList(p)}`;
  });
  numInput.addEventListener("blur", () => { setTimeout(() => { if (document.activeElement !== numInput) closeNumeral(true); }, 120); });

  /* ---------- keyboard ---------- */
  staffBox.addEventListener("keydown", e => {
    if (e.target !== staffBox) return;
    const k = e.key, mod_ = e.metaKey || e.ctrlKey;
    if (mod_ && k.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
    if (mod_ && k.toLowerCase() === "y") { e.preventDefault(); doRedo(); return; }
    if (mod_) return;
    if (e.altKey && /^Digit[1-4]$/.test(e.code)) { e.preventDefault(); setActive(VOICES[+e.code.slice(5) - 1]); return; }
    if (/^[a-g]$/i.test(k) && !e.altKey) {
      e.preventDefault();
      const l = LETTERS.indexOf(k.toUpperCase());
      if (selected && !evAt(selected.v, selected.idx).r) {
        const ref = noteMidi(evAt(selected.v, selected.idx).n);
        modifyTarget(ev => { ev.n = nearestLetter(l, ref); }, true);
      } else {
        const prev = lastNoteBefore(active);
        selected = null;
        appendEvent({ d: inputTicks(), n: nearestLetter(l, prev ? noteMidi(prev) : VOICE_CENTER[active]) });
      }
      return;
    }
    const keys = {
      ArrowUp: () => moveStep(e.shiftKey ? 7 : 1), ArrowDown: () => moveStep(e.shiftKey ? -7 : -1),
      ArrowLeft: () => stepSelection(-1), ArrowRight: () => stepSelection(1),
      Backspace: deleteTarget, Delete: deleteTarget,
      Escape: () => { selected = null; syncControls(); render(); },
      ".": toggleDot, "-": () => setAccidental(-1, true), "=": () => setAccidental(1, true), "+": () => setAccidental(1, true),
      n: () => setAccidental(0, true), N: () => setAccidental(0, true),
      r: () => (selected ? toggleRest() : appendEvent({ d: inputTicks(), r: true })),
      R: () => (selected ? toggleRest() : appendEvent({ d: inputTicks(), r: true })),
      "0": () => (selected ? toggleRest() : appendEvent({ d: inputTicks(), r: true })),
      Enter: () => { const t = chipTick(); if (t !== null) openNumeral(selected ? voiceEvents(score, selected.v)[selected.idx].start : t); },
    };
    if (/^[1-5]$/.test(k)) { e.preventDefault(); setDuration(DURATIONS[+k - 1].ticks); return; }
    if (keys[k]) { e.preventDefault(); keys[k](); }
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (staffBox.clientWidth) render(); }, 120); });

  syncControls();
  render();

  return {
    getScore: () => score,
    setScore(s, opts2) {
      commit(() => { score = cloneScore(s); });
      selected = null;
      numeralTick = null;
      if (opts2 && opts2.active) active = opts2.active;
      syncControls();
      render();
    },
    setMarks(m) { marks = m || {}; render(); },
    setVoices(list) { voices = list.slice(); if (!voices.includes(active)) active = voices[0]; selected = null; syncControls(); render(); },
    select(v, idx) { selectNote(v, idx); staffBox.scrollIntoView({ block: "nearest", behavior: "smooth" }); },
    render,
    focus() { staffBox.focus({ preventScroll: true }); },
  };
}
