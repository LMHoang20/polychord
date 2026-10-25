/* ============================================================
   polychord.js — Polychord Analyzer page logic.
   Depends on theory.js + audio.js. Runs init on load.
   ============================================================ */

/* ---------- Page playback handlers ---------- */
function playLower(e){ pulse(e); playMidiNotes(chordToMidi(val("lower"),LOWER_OCTAVE_C)); }
function playUpper(e){ pulse(e); playMidiNotes(chordToMidi(val("upper"),UPPER_OCTAVE_C)); }
function playPolychord(e){
  pulse(e);
  const notes=[...chordToMidi(val("lower"),LOWER_OCTAVE_C),...chordToMidi(val("upper"),UPPER_OCTAVE_C)];
  playMidiNotes(notes,{roll:0.03});
}
function playSingle(pc,e){ pulse(e); playMidiNotes([UPPER_OCTAVE_C+pc],{dur:0.85,roll:0}); }

/* ---------- Input validation (gates the Decode button) ---------- */
// A chord is valid only if it has a real root (A–G, optional #/b) AND a
// recognized quality. CHORD_QUALITIES[""] is the major triad, so a bare root is fine.
function isValidChord(chord){
  const m=chord.trim().match(/^([A-G](#|b)?)(.*)$/);
  if(!m||NOTE_MAP[m[1]]===undefined) return false;
  return CHORD_QUALITIES[m[3]]!==undefined;
}

function validateInputs(){
  const direct=val("directNotes");
  if(direct){
    // Direct notes override the chords: every token must be a known note name.
    const tokens=direct.split(/\s+/).filter(Boolean);
    const bad=tokens.filter(t=>NOTE_MAP[t]===undefined);
    const ok=tokens.length>0 && bad.length===0;
    return { mode:"notes", valid:ok, lowerOk:true, upperOk:true, directOk:ok, bad };
  }
  const lowerOk=isValidChord(val("lower"));
  const upperOk=isValidChord(val("upper"));
  return { mode:"chord", valid:lowerOk&&upperOk, lowerOk, upperOk, directOk:true, bad:[] };
}

function setFieldValid(id,ok){
  document.getElementById(id).classList.toggle("input-invalid",!ok);
}

// Re-check inputs and reflect the result in the UI (red fields, message,
// disabled Decode button). Returns whether the inputs are valid.
function refreshValidation(){
  const v=validateInputs();
  setFieldValid("lower",v.lowerOk);
  setFieldValid("upper",v.upperOk);
  setFieldValid("directNotes",v.directOk);
  document.getElementById("decodeBtn").disabled=!v.valid;

  let text="";
  if(!v.valid){
    if(v.mode==="notes"){
      text=v.bad.length
        ? "Unrecognized note"+(v.bad.length>1?"s":"")+": "+v.bad.join(", ")
        : "Enter at least one note (e.g. C D E F#).";
    }else{
      const parts=[];
      if(!v.lowerOk) parts.push("lower");
      if(!v.upperOk) parts.push("upper");
      text="Unrecognized "+parts.join(" & ")+" chord"+(parts.length>1?"s":"")
          +". Use a root (A–G, optional #/b) + quality: m, dim, aug, 7, maj7, m7.";
    }
  }
  const msg=document.getElementById("validationMsg");
  msg.textContent=text;
  msg.style.display=text?"block":"none";
  return v.valid;
}

/* ====================================================================
   DECODE : chords / notes  ->  upper structure (right) + analysis (bottom)
   ==================================================================== */
function decode(){
  if(!refreshValidation()) return;   // safety net; Decode is also disabled when invalid
  const lower=val("lower"), upper=val("upper"), direct=val("directNotes");

  let notes=[], upperStructure=null, lowerRoot=null, interval=null;

  if(direct){
    notes=parseDirectNotes(direct);
  }else{
    notes=[...new Set([...parseChord(lower),...parseChord(upper)])];
    lowerRoot=getChordRoot(lower);
    const upperRoot=getChordRoot(upper);
    upperStructure=detectUpperStructure(lowerRoot,upperRoot);
    if(lowerRoot!==null && upperRoot!==null) interval=(upperRoot-lowerRoot+12)%12;
  }
  notes.sort((a,b)=>a-b);

  showUpperStructure({ mode:direct?"notes":"chord", lower, upper, lowerRoot, interval, upperStructure });
  renderAnalysis(notes);
}

// Reflect a decode result in the right-hand Upper Structure panel.
function showUpperStructure(s){
  const display=document.getElementById("usDisplay");

  if(s.mode==="notes"){
    setEncodeFromField();   // keep the Encode button in sync with whatever's typed
    display.innerHTML=`<p class="us-note">Upper Structure is read from chord input. Clear Direct Notes to detect one — or type an interpretation below and <b>Encode</b>.</p>`;
    return;
  }
  if(s.upperStructure){
    setInterpField(s.upperStructure.name);   // fill the field so Encode round-trips it
    display.innerHTML=`
      <div class="kv"><span class="k">Detected</span><span class="v">${s.upper} / ${s.lower}</span></div>
      <div class="kv"><span class="k">Interpretation</span><span class="v v-big">${s.upperStructure.name}</span></div>
      <div class="kv"><span class="k">Category</span><span class="v"><span class="badge">${s.upperStructure.category}</span></span></div>`;
  }else{
    setInterpField("");      // nothing to encode from this pair
    const why=UNMAPPED_INTERVAL[s.interval]
      ? ` Roots are ${UNMAPPED_INTERVAL[s.interval]} apart — not a mapped upper structure.` : "";
    display.innerHTML=`<p class="us-note">No upper structure for <b>${s.upper} / ${s.lower}</b>.${why} Type one below and <b>Encode</b> to build it.</p>`;
  }
}

/* ====================================================================
   ENCODE : an interpretation (e.g. Cmaj13(#11))  ->  polychord chords (left)
   ==================================================================== */
// "Cmaj13(#11)" -> { root:0, interval:2 }, or null if the root/suffix isn't recognized.
function parseInterpretation(text){
  const m=text.trim().match(/^([A-G](#|b)?)(.*)$/);
  if(!m||NOTE_MAP[m[1]]===undefined) return null;
  const interval=SUFFIX_TO_INTERVAL[m[3]];
  if(interval===undefined) return null;
  return { root:NOTE_MAP[m[1]], interval };
}

// Toggle the Encode button + red field based on the current interpretation text.
function setEncodeFromField(){
  const text=val("interp");
  const parsed=text?parseInterpretation(text):null;
  document.getElementById("interp").classList.toggle("input-invalid",!!text&&!parsed);
  document.getElementById("encodeBtn").disabled=!parsed;
  return parsed;
}

// Programmatically set the interpretation field (used by decode) and resync Encode.
function setInterpField(text){
  document.getElementById("interp").value=text;
  setEncodeFromField();
}

// User typing in the Interpretation field: validate + preview what Encode will build.
function refreshInterp(){
  const parsed=setEncodeFromField();
  const text=val("interp");
  const display=document.getElementById("usDisplay");
  if(parsed){
    const [suffix,cat]=UPPER_STRUCTURES[parsed.interval];
    const upperRoot=(parsed.root+parsed.interval)%12;
    display.innerHTML=`
      <div class="kv"><span class="k">Will build</span><span class="v">${NOTE_NAMES[upperRoot]} / ${NOTE_NAMES[parsed.root]}</span></div>
      <div class="kv"><span class="k">Interpretation</span><span class="v v-big">${NOTE_NAMES[parsed.root]}${suffix}</span></div>
      <div class="kv"><span class="k">Category</span><span class="v"><span class="badge">${cat}</span></span></div>`;
  }else if(!text){
    display.innerHTML=`<p class="us-note">Type an interpretation (e.g. <b>Cmaj13(#11)</b>) to build its polychord.</p>`;
  }else{
    display.innerHTML=`<p class="us-note us-error">Unrecognized interpretation — root (A–G, optional #/b) + a known structure, e.g. <b>Cmaj13(#11)</b>, <b>G13</b>, <b>Fmaj7#11</b>.</p>`;
  }
}

// Build the polychord (major triads) from the interpretation and decode it.
function encode(e){
  const parsed=parseInterpretation(val("interp"));
  if(!parsed) return;   // guard; the button is also disabled when invalid
  pulse(e);
  const upperRoot=(parsed.root+parsed.interval)%12;
  document.getElementById("lower").value=NOTE_NAMES[parsed.root];
  document.getElementById("upper").value=NOTE_NAMES[upperRoot];
  document.getElementById("directNotes").value="";   // chords take over from direct notes
  decode();                                           // refresh the panel + bottom analysis
}

/* ---------- Bottom analysis cards ---------- */
function renderAnalysis(notes){
  const candidates=notes.map(root=>analyzeRoot(root,notes)).sort((a,b)=>b.score-a.score);

  const chips=notes.map(n=>
    `<button class="chip" onclick="playSingle(${n},event)" title="Play ${NOTE_NAMES[n]}">${NOTE_NAMES[n]}</button>`
  ).join("");

  let html=`
  <div class="card span-2">
    <h2>Pitch Collection</h2>
    <div class="chips">${chips||'<span class="us-note">No notes.</span>'}</div>
  </div>
  <div class="card">
    <h2>Pitch Class Set</h2>
    <div class="pcs">[${notes.join(", ")}]</div>
  </div>
  <div class="card">
    <h2>Scale Suggestion</h2>
    <div class="scale">${getScaleSuggestion(notes)}</div>
  </div>`;

  const maxScore=candidates.length?Math.max(1,candidates[0].score):1;
  const rows=candidates.map((c,idx)=>{
    const pct=Math.round(c.score/maxScore*100);
    return `
    <tr>
      <td><span class="chord-name">${c.name}</span>${idx===0?'<span class="best">Best</span>':''}</td>
      <td><div class="score-cell"><div class="score-bar"><div class="score-fill" style="width:${pct}%"></div></div><span class="score-num">${c.score}</span></div></td>
      <td class="intervals">${c.intervals}</td>
    </tr>`;
  }).join("");

  html+=`
  <div class="card span-2">
    <h2>Interpretations</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Chord</th><th>Score</th><th>Intervals</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;

  document.getElementById("result").innerHTML=html;
}

/* ---------- Init ---------- */
// Autocomplete for the interpretation field: every root × every structure.
document.getElementById("interpList").innerHTML=
  NOTE_NAMES.flatMap(n=>
    Object.keys(UPPER_STRUCTURES).map(k=>`<option value="${n}${UPPER_STRUCTURES[k][0]}">`)
  ).join("");

// Left inputs gate Decode; the interpretation field gates Encode — both live.
["lower","upper","directNotes"].forEach(id=>
  document.getElementById(id).addEventListener("input",refreshValidation)
);
document.getElementById("interp").addEventListener("input",refreshInterp);

decode();   // initial render (default C / D -> US II; fills the interpretation field)
