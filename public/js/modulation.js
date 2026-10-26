/* ============================================================
   modulation.js — Modulation ear-training exercise.
   Generates a modulating 8- or 16-chord progression, plays it, and
   grades the user's transcription.
   Depends on theory.js (NOTE_MAP, NOTE_NAMES, CHORD_QUALITIES)
   + audio.js (playChordSequence, playMidiNotes, pulse).
   ============================================================ */

const PROG_BASE_MIDI=48;                 // MIDI of C for the progression register (C3)
const MELODY_LOW=72, MELODY_HIGH=88;     // melody register (C5..E6)
const MELODY_NOTES=2;                    // melody notes per chord

// Major-key diatonic chords:  I   ii   iii  IV   V7  vi   vii°  (V is a dominant 7th)
const MAJOR_OFFSETS       =[0,2,4,5,7,9,11];
const MAJOR_DEGREE_QUALITY=["","m","m","","7","m","dim"];
const ROMAN=["I","ii","iii","IV","V","vi","vii°"];

// Modulation distances (semitones) that actually change the scale:
// up-2nd, up-4th, up-5th, down-2nd, up-min3rd, down-min3rd.
const MOD_INTERVALS=[2,5,7,10,3,9];

// Short diatonic progression templates per segment length (scale degrees 1..7).
const TEMPLATES={
  2:[[1,5],[2,5],[4,5],[5,1],[1,4],[6,2]],
  3:[[1,4,5],[2,5,1],[1,5,6],[6,4,5],[1,6,4],[4,5,1],[2,5,6]],
  4:[[1,5,6,4],[1,4,5,1],[2,5,1,6],[6,4,1,5],[1,6,4,5],[1,6,2,5],[4,5,1,6]],
  5:[[1,5,6,4,5],[1,4,2,5,1],[6,4,1,5,1],[1,6,4,2,5],[2,5,1,6,4]],
  6:[[1,6,2,5,1,4],[1,4,5,1,6,5],[2,5,1,6,4,5],[1,5,6,3,4,5],[6,2,5,1,4,5]]
};

// Segment-length splits per key count: 2 keys = 8 chords, 3 keys = 16 chords.
const SPLITS={
  2:[[4,4],[5,3],[3,5]],
  3:[[5,5,6],[6,5,5],[5,6,5],[6,6,4],[4,6,6],[6,4,6]]
};

let currentExercise=null;   // { chords:[{rootPC,quality,keyRoot,degree}], keys:[pc...], lengths:[...] }
let scored=false;           // has this exercise been counted in the tally yet?
let totalCorrect=0, totalQuestions=0;

/* ---------- helpers ---------- */
function randInt(n){ return Math.floor(Math.random()*n); }
function pick(arr){ return arr[randInt(arr.length)]; }

// A generated chord's display name, e.g. {rootPC:11,quality:"dim"} -> "Bdim".
function chordName(c){ return NOTE_NAMES[c.rootPC]+c.quality; }

// Roman-numeral + key label, e.g. "V / C".
function chordRoman(c){ return ROMAN[c.degree-1]+" / "+NOTE_NAMES[c.keyRoot]; }

// MIDI notes for a generated chord in the progression register.
function chordMidi(c){
  const ints=CHORD_QUALITIES[c.quality]||[0,4,7];
  return ints.map(i=>PROG_BASE_MIDI+c.rootPC+i);
}

// Give each chord a short melody made only of its own notes.
function addMelody(chords){
  let prev=79;
  chords.forEach(c=>{
    const pcs=chordMidi(c).map(m=>m%12);
    const cands=[];
    for(let m=MELODY_LOW;m<=MELODY_HIGH;m++) if(pcs.includes(m%12)) cands.push(m);
    c.melody=[];
    for(let i=0;i<MELODY_NOTES;i++){
      const near=cands.slice().sort((a,b)=>Math.abs(a-prev)-Math.abs(b-prev)).slice(0,3);
      prev=pick(near);
      c.melody.push(prev);
    }
  });
}

/* ---------- exercise generation ---------- */
function generateExercise(keyCount,withMelody){
  const lengths=pick(SPLITS[keyCount]);

  // Pick keys: each modulation moves by a scale-changing interval, never repeating the previous key.
  const keys=[randInt(12)];
  for(let i=1;i<keyCount;i++){
    let next;
    do{ next=(keys[i-1]+pick(MOD_INTERVALS))%12; }while(next===keys[i-1]);
    keys.push(next);
  }

  const chords=[];
  keys.forEach((keyRoot,ki)=>{
    pick(TEMPLATES[lengths[ki]]).forEach(deg=>{
      chords.push({
        rootPC:(keyRoot+MAJOR_OFFSETS[deg-1])%12,
        quality:MAJOR_DEGREE_QUALITY[deg-1],
        keyRoot, degree:deg
      });
    });
  });
  if(withMelody) addMelody(chords);
  return { chords, keys, lengths };
}

/* ---------- answer parsing / checking ---------- */
// Normalize any quality spelling to a canonical token (or null if unrecognized).
function canonQuality(q){
  switch((q||"").trim()){
    case "": case "maj": case "M": case "major": return "maj";
    case "m": case "min": case "-": case "minor": return "min";
    case "dim": case "o": case "°": return "dim";
    case "aug": case "+": return "aug";
    case "7": return "7";
    case "maj7": case "M7": return "maj7";
    case "m7": case "min7": case "-7": return "m7";
    default: return null;
  }
}

// "Bb m" / "A#min" / "Db" -> { rootPC, quality }, or null if unparseable.
function parseUserChord(text){
  const m=(text||"").trim().match(/^([A-Ga-g])([#b♯♭]?)\s*(.*)$/);
  if(!m) return null;
  const root=m[1].toUpperCase()+m[2].replace("♯","#").replace("♭","b");
  if(NOTE_MAP[root]===undefined) return null;
  const quality=canonQuality(m[3]);
  if(quality===null) return null;
  return { rootPC:NOTE_MAP[root], quality };
}

// Does the user's text match a generated chord? (enharmonic + spelling tolerant)
function isChordCorrect(text,answer){
  const p=parseUserChord(text);
  return !!p && p.rootPC===answer.rootPC && p.quality===canonQuality(answer.quality);
}

/* ---------- DOM rendering ---------- */
function renderSlots(){
  let html="";
  for(let i=0;i<currentExercise.chords.length;i++){
    html+=`
    <div class="slot" id="wrap${i}">
      <div class="slot-head">
        <span class="slot-num">${i+1}</span>
        <button class="play-btn slot-play" onclick="playSlot(${i},event)" title="Play chord ${i+1}" aria-label="Play chord ${i+1}">▶</button>
      </div>
      <input id="slot${i}" class="slot-input" placeholder="?" autocomplete="off" spellcheck="false" onkeydown="slotKey(event,${i})">
      <div class="slot-mark" id="mark${i}"></div>
    </div>`;
  }
  document.getElementById("slots").innerHTML=html;
}

function resetUI(){
  for(let i=0;i<currentExercise.chords.length;i++){
    document.getElementById("slot"+i).value="";
    document.getElementById("wrap"+i).classList.remove("correct","wrong","revealed");
    const mark=document.getElementById("mark"+i);
    mark.className="slot-mark"; mark.textContent="";
  }
  const score=document.getElementById("score");
  score.textContent=""; score.className="score";
  document.getElementById("keyplan").innerHTML="";
}

function showKeyPlan(){
  const keys=currentExercise.keys.map(k=>NOTE_NAMES[k]+" major").join("&nbsp;&nbsp;→&nbsp;&nbsp;");
  document.getElementById("keyplan").innerHTML=
    `<span class="k">Key plan</span><span class="v">${keys}</span>`;
}

/* ---------- actions ---------- */
function buildExercise(){
  const opt=document.getElementById("optKeys").value;
  const keyCount=opt==="random"?pick([2,2,3]):parseInt(opt,10);
  currentExercise=generateExercise(keyCount,document.getElementById("optMode").value==="melody");
  scored=false;
  renderSlots();
  resetUI();
}

// Generate a fresh progression and play it (the click is the audio gesture).
function newExercise(e){
  buildExercise();
  document.getElementById("slot0").focus();
  playExercise(e);
}

function playExercise(e){
  if(e) pulse(e);
  if(!currentExercise) return;
  stopAllAudio();   // cut off anything still playing before starting
  const dur=parseFloat(document.getElementById("optTempo").value)||0.85;
  playChordSequence(currentExercise.chords.map(chordMidi),{chordDur:dur,melody:currentExercise.chords.map(c=>c.melody)});
}

function playSlot(i,e){
  if(e) pulse(e);
  if(!currentExercise) return;
  stopAllAudio();   // interrupt the progression (or another slot) first
  const c=currentExercise.chords[i];
  playMidiNotes(chordMidi(c).concat(c.melody||[]),{dur:0.95,roll:0.02});
}

// Enter moves to the next slot; Enter on the last slot checks.
function slotKey(e,i){
  if(e.key!=="Enter") return;
  if(i<currentExercise.chords.length-1) document.getElementById("slot"+(i+1)).focus();
  else checkAnswers();
}

// Count each exercise once: the first Check (or Reveal) adds it to the total.
function updateTally(allCorrect){
  if(scored) return;
  scored=true;
  totalQuestions++;
  if(allCorrect) totalCorrect++;
  document.getElementById("tally").textContent=`${totalCorrect} / ${totalQuestions} questions correct`;
}

function checkAnswers(){
  if(!currentExercise) return;
  let correct=0;
  currentExercise.chords.forEach((ans,i)=>{
    const ok=isChordCorrect(document.getElementById("slot"+i).value,ans);
    const wrap=document.getElementById("wrap"+i);
    const mark=document.getElementById("mark"+i);
    wrap.classList.remove("correct","wrong","revealed");
    if(ok){ correct++; wrap.classList.add("correct"); mark.className="slot-mark ok"; mark.textContent="✓"; }
    else  { wrap.classList.add("wrong");   mark.className="slot-mark no"; mark.textContent="✗"; }
  });
  const total=currentExercise.chords.length;
  const score=document.getElementById("score");
  score.textContent=`${correct} / ${total} correct`;
  score.className="score"+(correct===total?" score-perfect":"");
  updateTally(correct===total);
}

// Fill in the correct chords + Roman numerals and reveal the key plan.
function revealAnswers(){
  if(!currentExercise) return;
  updateTally(false);
  currentExercise.chords.forEach((ans,i)=>{
    document.getElementById("slot"+i).value=chordName(ans);
    const wrap=document.getElementById("wrap"+i);
    wrap.classList.remove("correct","wrong"); wrap.classList.add("revealed");
    const mark=document.getElementById("mark"+i);
    mark.className="slot-mark reveal"; mark.textContent=chordRoman(ans);
  });
  showKeyPlan();
}

/* ---------- init ---------- */
buildExercise();   // generate + show '?' slots (no autoplay — audio needs a click)
