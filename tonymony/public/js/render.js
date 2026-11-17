/* ============================================================
   render.js: draws a score as an SVG grand staff (S/A on the
   treble staff, T/B on the bass staff) with Roman numerals under
   it. Glyphs come from the Bravura music font (SMuFL code points).
   No DOM: returns the SVG markup plus hit areas for clicks.

   renderScore(score, {width, marks, selected, cursor, numeralTick,
                       editable}) → {svg, width, height, systems, notes}
   ============================================================ */

const SP = 10;                       // staff space in px; Bravura em = 4 spaces
const HEAD_W = 11.8, WHOLE_W = 16.9;
const STAFF_GAP = 76;                // between treble bottom line and bass top line
const SYS_TOP = 58, SYS_BOTTOM = 84; // room above treble / below bass (numerals live here)
const STEP_TOP = [38, 26];           // diatonic step of each staff's top line (F5, A3)
const STEM_UP = { S: true, A: false, T: true, B: false };
const STAFF_OF = { S: 0, A: 0, T: 1, B: 1 };

const GLYPH = {
  gClef: "", fClef: "", brace: "",
  head: { w: "", h: "", q: "" },
  acc: { "-2": "", "-1": "", "0": "", "1": "", "2": "" },
  rest: { w: "", h: "", q: "", e: "", s: "" },
  flagUp: { e: "", s: "" }, flagDown: { e: "", s: "" },
  dot: "",
};
const ACC_W = { "-2": 16, "-1": 9.5, "0": 7, "1": 10, "2": 10 };
const SHARP_STEPS = [38, 35, 39, 36, 33, 37, 34];   // treble positions of F# C# G# D# A# E# B#
const FLAT_STEPS = [34, 37, 33, 36, 32, 35, 31];    // Bb Eb Ab Db Gb Cb Fb

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function glyph(ch, x, y, extra) { return `<text class="g" x="${r1(x)}" y="${r1(y)}"${extra ? " " + extra : ""}>${ch}</text>`; }
function line(x1, y1, x2, y2, w, cls) { return `<line${cls ? ` class="${cls}"` : ""} x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke-width="${w}"/>`; }
function r1(n) { return Math.round(n * 10) / 10; }

function stepY(staffTop, staff, step) { return staffTop + (STEP_TOP[staff] - step) * SP / 2; }

// Step under a y position, for a voice's staff.
function stepAtY(sys, v, y) {
  const staff = STAFF_OF[v], top = staff ? sys.bassTop : sys.trebleTop;
  return STEP_TOP[staff] - Math.round((y - top) / (SP / 2));
}

// Split a numeral into the main symbol, stacked figures, and "/target".
function numeralParts(text) {
  const s = normalizeNumeral(text);
  const m = s.match(/^([^/]*?)(\d*)((?:\/.*)?)$/);
  return m ? { main: m[1], figs: m[2], tail: m[3] } : { main: s, figs: "", tail: "" };
}
function numeralWidth(text) {
  const p = numeralParts(text);
  return p.main.length * 10 + (p.figs ? 8 : 0) + p.tail.length * 9;
}
function numeralSvg(text, x, y, cls) {
  const p = numeralParts(text);
  let out = `<text class="${cls}" x="${r1(x)}" y="${r1(y)}"><tspan>${esc(p.main)}</tspan>`;
  if (p.figs.length === 1) out += `<tspan class="fig" dy="-8">${p.figs}</tspan>`;
  else if (p.figs) {
    out += `<tspan class="fig" dy="${-9 - (p.figs.length - 2) * 5}">${p.figs[0]}</tspan>`;
    for (let i = 1; i < p.figs.length; i++) out += `<tspan class="fig" dx="-6.6" dy="10">${p.figs[i]}</tspan>`;
  }
  const back = p.figs.length === 1 ? 8 : p.figs ? -1 + (p.figs.length - 2) * -5 : 0;
  if (p.tail) out += `<tspan dy="${back}">${esc(p.tail)}</tspan>`;
  return out + `</text>`;
}

function renderScore(score, opts) {
  opts = opts || {};
  const width = Math.max(300, opts.width || 900);
  const marks = opts.marks || {};
  const mt = measureTicks(score);
  const sig = keySignature(scoreKey(score));
  const cursor = opts.cursor;   // {v, tick}: where the next note of a voice goes

  // Events by voice, and the ticks that need a column.
  const evs = Object.fromEntries(VOICES.map(v => [v, voiceEvents(score, v)]));
  const ticks = new Set(onsetTicks(score));
  let total = scoreLength(score);
  if (cursor) { ticks.add(cursor.tick); total = Math.max(total, cursor.tick + 1); }
  const nMeasures = Math.max(1, Math.ceil(total / mt));
  for (let m = 0; m < nMeasures; m++) ticks.add(m * mt);
  const allTicks = [...ticks].filter(t => t < nMeasures * mt).sort((a, b) => a - b);

  // Which accidentals show: key signature, then whatever changed in the bar.
  const showAcc = {};   // "v:idx" → accidental to draw
  for (let m = 0; m < nMeasures; m++) {
    [0, 1].forEach(staff => {
      const state = {};
      const items = VOICES.filter(v => STAFF_OF[v] === staff)
        .flatMap(v => evs[v].filter(e => !e.ev.r && e.start >= m * mt && e.start < (m + 1) * mt).map(e => ({ v, e })))
        .sort((a, b) => a.e.start - b.e.start);
      items.forEach(({ v, e }) => {
        const st = noteStep(e.ev.n);
        const cur = st in state ? state[st] : keyAccidental(sig, e.ev.n.l);
        if (e.ev.n.a !== cur) { showAcc[v + ":" + e.idx] = e.ev.n.a; state[st] = e.ev.n.a; }
      });
    });
  }

  // Column widths
  const atTick = t => VOICES.map(v => evs[v].find(e => e.start === t)).filter(Boolean);
  const cols = allTicks.map((t, i) => {
    const m = Math.floor(t / mt);
    const next = Math.min(allTicks[i + 1] ?? Infinity, (m + 1) * mt);
    const dt = Math.max(6, next - t);
    let w = 30 + 19 * Math.log2(1 + dt / 12);
    const here = VOICES.map(v => ({ v, e: evs[v].find(e => e.start === t) })).filter(x => x.e);
    const nAcc = Math.max(0, ...[0, 1].map(s => here.filter(x => STAFF_OF[x.v] === s && (x.v + ":" + x.e.idx) in showAcc).length));
    const lead = nAcc ? 4 + nAcc * 11 : 0;
    if (here.some(x => x.e.ev.d === splitDuration(x.e.ev.d).base.ticks * 1.5)) w += 6;
    const second = [["S", "A"], ["T", "B"]].some(([u, l]) => {
      const a = here.find(x => x.v === u), b = here.find(x => x.v === l);
      return a && b && !a.e.ev.r && !b.e.ev.r && Math.abs(noteStep(a.e.ev.n) - noteStep(b.e.ev.n)) <= 1;
    });
    if (second) w += HEAD_W;
    const num = score.numerals[t];
    if (num) w = Math.max(w, numeralWidth(num) + 8 - lead);
    return { tick: t, m, w: w + lead, lead };
  });
  const measures = [];
  for (let m = 0; m < nMeasures; m++) {
    const c = cols.filter(x => x.m === m);
    measures.push({ m, cols: c, w: c.reduce((s, x) => s + x.w, 0) + 12 });
  }

  // Line breaks
  const margin = 12, braceW = 14;
  const headerW = first => 46 + Math.abs(sig) * 10 + 8 + (first ? 30 : 0);
  const systems = [];
  let curSys = null;
  measures.forEach(ms => {
    if (!curSys || (curSys.measures.length && curSys.w + ms.w > width - 2 * margin - braceW - curSys.header)) {
      curSys = { measures: [], w: 0, header: headerW(!systems.length) };
      systems.push(curSys);
    }
    curSys.measures.push(ms);
    curSys.w += ms.w;
  });

  const sysH = SYS_TOP + 40 + STAFF_GAP + 40 + SYS_BOTTOM;
  let out = "";
  const hitSystems = [], hitNotes = [];

  systems.forEach((sy, si) => {
    const y0 = si * sysH;
    const trebleTop = y0 + SYS_TOP, bassTop = trebleTop + 40 + STAFF_GAP;
    const x0 = margin + braceW, x1 = width - margin;
    const room = x1 - x0 - sy.header;  // header includes clef, key and time
    const last = si === systems.length - 1;
    const stretch = last ? Math.min(room / sy.w, 1.3) : room / sy.w;
    const xEnd = x0 + sy.header + sy.w * stretch;
    const tops = [trebleTop, bassTop];

    // Staves, brace, clefs, key and time signatures
    tops.forEach(top => { for (let i = 0; i < 5; i++) out += line(x0, top + i * SP, xEnd, top + i * SP, 1, "staff"); });
    out += line(x0, trebleTop, x0, bassTop + 40, 1.4);
    const braceH = bassTop + 40 - trebleTop;
    out += `<text class="g" transform="translate(${x0 - 4},${r1(bassTop + 40)}) scale(1,${r1(braceH / 40)})" x="-9" y="0">${GLYPH.brace}</text>`;
    out += glyph(GLYPH.gClef, x0 + 8, trebleTop + 30);
    out += glyph(GLYPH.fClef, x0 + 8, bassTop + 10);
    let kx = x0 + 46;
    for (let i = 0; i < Math.abs(sig); i++) {
      const st = sig > 0 ? SHARP_STEPS[i] : FLAT_STEPS[i];
      const ch = GLYPH.acc[sig > 0 ? 1 : -1];
      out += glyph(ch, kx, stepY(trebleTop, 0, st)) + glyph(ch, kx, stepY(bassTop, 1, st - 14));
      kx += 10;
    }
    if (si === 0) {
      const tx = kx + 6;
      tops.forEach(top => {
        [0, 1].forEach(row => {
          const digits = String(score.time[row]);
          digits.split("").forEach((d, i) => { out += glyph(String.fromCharCode(0xE080 + +d), tx + i * 17 - (digits.length - 1) * 8, top + 10 + row * 20); });
        });
      });
    }
    out += `<text class="mnum" x="${x0}" y="${trebleTop - 30}">${sy.measures[0].m + 1}</text>`;

    const hs = { index: si, y0, y1: y0 + sysH, trebleTop, bassTop, numY: bassTop + 40 + 46, x0, x1: xEnd, slots: [] };
    hitSystems.push(hs);

    let x = x0 + sy.header;
    sy.measures.forEach((ms, mi) => {
      let cx = x + 6 * stretch;
      ms.cols.forEach(col => {
        const hx = cx + col.lead;   // notehead x
        hs.slots.push({ tick: col.tick, x: hx, x0: cx, x1: cx + col.w * stretch });
        if (cursor && cursor.tick === col.tick) {
          const top = STAFF_OF[cursor.v] ? bassTop : trebleTop;
          out += `<rect class="cursor" x="${r1(hx - 4)}" y="${top - 14}" width="${HEAD_W + 8}" height="68" rx="4"/>`;
        }
        out += drawColumn(score, evs, col.tick, hx, tops, showAcc, marks, opts, hitNotes, si);
        // Numeral
        const num = score.numerals[col.tick];
        const ny = hs.numY;
        if (num) {
          const bad = marks["num:" + col.tick];
          const sel = opts.numeralTick === col.tick ? " sel" : "";
          out += numeralSvg(num, hx - 1, ny, `num${bad ? " " + bad : ""}${sel}`);
        } else if (opts.editable && atTick(col.tick).some(e => !e.ev.r)) {
          out += `<text class="num-add${opts.numeralTick === col.tick ? " sel" : ""}" x="${r1(hx + 1)}" y="${ny}">+</text>`;
        }
        cx += col.w * stretch;
      });
      x += ms.w * stretch;
      const finalBar = last && mi === sy.measures.length - 1 && ms.m === nMeasures - 1;
      if (finalBar) out += line(x - 6, trebleTop, x - 6, bassTop + 40, 1.2) + line(x - 1.5, trebleTop, x - 1.5, bassTop + 40, 4);
      else out += line(x, trebleTop, x, bassTop + 40, 1.2);
    });
  });

  const height = systems.length * sysH;
  const svg = `<svg class="score" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Score">${out}</svg>`;
  return { svg, width, height, systems: hitSystems, notes: hitNotes };
}

// Notes and rests that start at a tick.
function drawColumn(score, evs, tick, hx, tops, showAcc, marks, opts, hitNotes, si) {
  let out = "";
  [0, 1].forEach(staff => {
    const top = tops[staff];
    const [upV, downV] = staff ? ["T", "B"] : ["S", "A"];
    const items = [upV, downV].map(v => ({ v, e: evs[v].find(e => e.start === tick) })).filter(x => x.e);
    const notes = items.filter(x => !x.e.ev.r);
    // Upper voice shifts right when the two voices are a 2nd apart (or a unison with different heads).
    let shiftUp = 0;
    if (notes.length === 2) {
      const [a, b] = notes, ds = Math.abs(noteStep(a.e.ev.n) - noteStep(b.e.ev.n));
      const headA = splitDuration(a.e.ev.d).base.id, headB = splitDuration(b.e.ev.d).base.id;
      const kind = id => (id === "w" ? "w" : id === "h" ? "h" : "q");
      if (ds === 1 || (ds === 0 && (kind(headA) !== kind(headB) || noteMidi(a.e.ev.n) !== noteMidi(b.e.ev.n)))) shiftUp = HEAD_W;
    }
    const otherHasEvents = v => score.voices[v === upV ? downV : upV].length > 0;

    // Accidental columns: from the highest note down, step left when close.
    const accItems = notes.filter(x => (x.v + ":" + x.e.idx) in showAcc).sort((a, b) => noteStep(b.e.ev.n) - noteStep(a.e.ev.n));
    const accCol = {};
    accItems.forEach((x, i) => { accCol[x.v] = i > 0 && noteStep(accItems[0].e.ev.n) - noteStep(x.e.ev.n) < 6 ? 1 : 0; });

    // Both voices rest together: one shared rest in the middle of the staff.
    const sharedRest = items.length === 2 && items.every(x => x.e.ev.r) && items[0].e.ev.d === items[1].e.ev.d;
    items.forEach(({ v, e }, n) => {
      const { base, dots } = splitDuration(e.ev.d);
      const key = v + ":" + e.idx;
      const sel = opts.selected && opts.selected.v === v && opts.selected.idx === e.idx;
      const cls = ["note", "v-" + v, marks[key] || "", sel ? "sel" : "", opts.activeVoice === v ? "active" : ""].filter(Boolean).join(" ");
      let g = "";
      const up = STEM_UP[v];
      if (e.ev.r) {
        const off = sharedRest || !otherHasEvents(v) ? 0 : up ? -SP : SP;
        if (sharedRest && n === 1) { hitNotes.push({ v, idx: e.idx, x: hx + 5, y: top + 2 * SP + 6, sys: si, rest: true }); out += `<g class="${cls}" data-v="${v}" data-idx="${e.idx}"></g>`; return; }
        const ry = base.id === "w" ? top + SP + off : top + 2 * SP + off;
        g += glyph(GLYPH.rest[base.id], hx, ry);
        if (dots) g += glyph(GLYPH.dot, hx + 16, top + 1.5 * SP + off);
        hitNotes.push({ v, idx: e.idx, x: hx + 5, y: ry - 5, sys: si, rest: true });
      } else {
        const st = noteStep(e.ev.n);
        const y = stepY(top, staff, st);
        const x = hx + (v === upV ? shiftUp : 0);
        const hw = base.id === "w" ? WHOLE_W : HEAD_W;
        // Ledger lines
        const lo = staff ? 18 : 30, hi = staff ? 26 : 38;
        for (let s = hi + 2; s <= st; s += 2) g += line(x - 4, stepY(top, staff, s), x + hw + 4, stepY(top, staff, s), 1.2, "ledger");
        for (let s = lo - 2; s >= st; s -= 2) g += line(x - 4, stepY(top, staff, s), x + hw + 4, stepY(top, staff, s), 1.2, "ledger");
        if (key in showAcc) {
          const a = showAcc[key];
          g += glyph(GLYPH.acc[a], hx - ACC_W[a] - 3 - (accCol[v] || 0) * 11, y);
        }
        g += glyph(GLYPH.head[base.id === "w" ? "w" : base.id === "h" ? "h" : "q"], x, y);
        if (base.id !== "w") {
          const len = base.id === "s" ? 38 : 35;
          if (up) {
            const sx = x + HEAD_W - 0.6;
            g += line(sx, y - 1.7, sx, y - len, 1.2);
            if (GLYPH.flagUp[base.id]) g += glyph(GLYPH.flagUp[base.id], sx - 0.6, y - len);
          } else {
            const sx = x + 0.6;
            g += line(sx, y + 1.7, sx, y + len, 1.2);
            if (GLYPH.flagDown[base.id]) g += glyph(GLYPH.flagDown[base.id], sx - 0.6, y + len);
          }
        }
        if (dots) {
          const onLine = st % 2 === 0;
          const dy = onLine ? (up ? -SP / 2 : SP / 2) : 0;
          g += glyph(GLYPH.dot, x + hw + 4, y + dy);
        }
        hitNotes.push({ v, idx: e.idx, x: x + hw / 2, y, sys: si });
      }
      out += `<g class="${cls}" data-v="${v}" data-idx="${e.idx}">${g}</g>`;
    });
  });
  return out;
}
