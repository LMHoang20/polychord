/* ============================================================
   multinotes.js — Multinotes ear-training exercise.
   Plays up to 10 notes at once (C3–C6) and grades how many of
   each note name (C, C#, D, …) the user heard, ignoring octave.
   Depends on theory.js (NOTE_NAMES) + audio.js (playMidiNotes, pulse).
   ============================================================ */

const MULTI_LOW_MIDI=48;    // C3
const MULTI_HIGH_MIDI=84;   // C6
const MULTI_MAX_NOTES=10;

let currentNotes=null;      // sorted MIDI numbers, all different
let scored=false;           // has this exercise been counted in the tally yet?
let totalCorrect=0, totalQuestions=0;

/* ---------- helpers ---------- */
function randInt(n){ return Math.floor(Math.random()*n); }

/* ---------- exercise generation ---------- */
// `count` different MIDI notes between C3 and C6, lowest first.
function generateNotes(count){
  const pool=[];
  for(let m=MULTI_LOW_MIDI;m<=MULTI_HIGH_MIDI;m++) pool.push(m);
  const notes=[];
  while(notes.length<count) notes.push(pool.splice(randInt(pool.length),1)[0]);
  return notes.sort((a,b)=>a-b);
}

// How many notes there are of each note name: 12 counts, index 0 = C.
function countByName(midiNotes){
  const counts=new Array(12).fill(0);
  midiNotes.forEach(m=>counts[m%12]++);
  return counts;
}

// Is the typed number the right count for this note name? Blank means 0.
function isCountCorrect(text,answer){
  const t=(text||"").trim()||"0";
  return /^\d+$/.test(t) && parseInt(t,10)===answer;
}

/* ---------- DOM rendering ---------- */
function renderSlots(){
  let html="";
  for(let i=0;i<12;i++){
    html+=`
    <div class="slot" id="wrap${i}">
      <div class="slot-head">
        <span class="slot-num">${NOTE_NAMES[i]}</span>
      </div>
      <input id="slot${i}" class="slot-input" type="number" min="0" max="${MULTI_MAX_NOTES}" placeholder="0" autocomplete="off" onkeydown="slotKey(event,${i})">
      <div class="slot-mark" id="mark${i}"></div>
    </div>`;
  }
  document.getElementById("slots").innerHTML=html;
}

function resetUI(){
  for(let i=0;i<12;i++){
    document.getElementById("slot"+i).value="";
    document.getElementById("wrap"+i).classList.remove("correct","wrong","revealed");
    const mark=document.getElementById("mark"+i);
    mark.className="slot-mark"; mark.textContent="";
  }
  const score=document.getElementById("score");
  score.textContent=""; score.className="score";
}

/* ---------- actions ---------- */
function buildExercise(){
  const opt=document.getElementById("optCount").value;
  const count=opt==="random"?1+randInt(MULTI_MAX_NOTES):parseInt(opt,10);
  currentNotes=generateNotes(count);
  scored=false;
  resetUI();
}

// Generate fresh notes and play them (the click is the audio gesture).
function newExercise(e){
  buildExercise();
  document.getElementById("slot0").focus();
  playExercise(e);
}

function playExercise(e){
  if(e) pulse(e);
  if(!currentNotes) return;
  stopAllAudio();   // cut off anything still playing before starting
  playMidiNotes(currentNotes,{dur:2.2,roll:0});
}

// Enter moves to the next note; Enter on the last one checks.
function slotKey(e,i){
  if(e.key!=="Enter") return;
  if(i<11) document.getElementById("slot"+(i+1)).focus();
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
  if(!currentNotes) return;
  const counts=countByName(currentNotes);
  let correct=0;
  counts.forEach((ans,i)=>{
    const ok=isCountCorrect(document.getElementById("slot"+i).value,ans);
    const wrap=document.getElementById("wrap"+i);
    const mark=document.getElementById("mark"+i);
    wrap.classList.remove("correct","wrong","revealed");
    if(ok){ correct++; wrap.classList.add("correct"); mark.className="slot-mark ok"; mark.textContent="✓"; }
    else  { wrap.classList.add("wrong");   mark.className="slot-mark no"; mark.textContent="✗"; }
  });
  const score=document.getElementById("score");
  score.textContent=`${correct} / 12 correct`;
  score.className="score"+(correct===12?" score-perfect":"");
  updateTally(correct===12);
}

// Fill in the right counts and show the exact notes that played.
function revealAnswers(){
  if(!currentNotes) return;
  updateTally(false);
  const counts=countByName(currentNotes);
  counts.forEach((ans,i)=>{
    document.getElementById("slot"+i).value=ans;
    const wrap=document.getElementById("wrap"+i);
    wrap.classList.remove("correct","wrong"); wrap.classList.add("revealed");
    const mark=document.getElementById("mark"+i);
    const names=currentNotes.filter(m=>m%12===i).map(m=>NOTE_NAMES[i]+(Math.floor(m/12)-1));
    mark.className="slot-mark reveal"; mark.textContent=names.join(" ");
  });
}

/* ---------- init ---------- */
renderSlots();
buildExercise();   // generate notes (no autoplay — audio needs a click)
