/* ============================================================
   audio.js — shared Web Audio playback + small DOM utilities.
   Depends on theory.js (getChordIntervals). Page-agnostic.
   ============================================================ */

// MIDI note of C in the register each part plays in (C3=48, C4=60).
// Change these to move the lower/upper chord up or down an octave (±12 per octave).
const LOWER_OCTAVE_C=48;   // C3 — lower chord
const UPPER_OCTAVE_C=60;   // C4 — upper chord + single notes

let audioCtx=null;
let activeVoices=[];   // currently-scheduled voices, so playback can be stopped early

function getCtx(){
  if(!audioCtx){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  }
  if(audioCtx.state==="suspended") audioCtx.resume();
  return audioCtx;
}

// Immediately silence anything currently playing (quick fade-out to avoid clicks).
function stopAllAudio(){
  if(!audioCtx) return;
  const now=audioCtx.currentTime;
  activeVoices.slice().forEach(v=>{
    try{
      const g=v.gain.gain;
      if(g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
      else g.cancelScheduledValues(now);
      g.setTargetAtTime(0.0001,now,0.012);   // smooth ~60ms release
      v.osc.stop(now+0.12);
      v.osc2.stop(now+0.12);
    }catch(err){ /* node may already be stopped */ }
  });
  activeVoices=[];
}

function midiToFreq(m){ return 440*Math.pow(2,(m-69)/12); }

// Oscillator recipes per instrument: two wave types, attack (s), and how much
// of the level is left at the end of the note (1 = held, lower = plucked).
const INSTRUMENTS={
  piano:  {a:"triangle",b:"sine",    attack:0.012,sustain:1},
  guitar: {a:"sawtooth",b:"triangle",attack:0.005,sustain:0.15},
  violin: {a:"sawtooth",b:"sawtooth",attack:0.09, sustain:1},
  horn:   {a:"sawtooth",b:"sine",    attack:0.06, sustain:1},
  flute:  {a:"sine",    b:"triangle",attack:0.05, sustain:1}
};

function playVoice(ctx,freq,start,dur,level,dest,instrument){
  const ins=INSTRUMENTS[instrument]||INSTRUMENTS.piano;
  const osc=ctx.createOscillator();
  const osc2=ctx.createOscillator();
  const gain=ctx.createGain();
  osc.type=ins.a;
  osc2.type=ins.b;
  osc.frequency.value=freq;
  osc2.frequency.value=freq;
  osc2.detune.value=4;               // subtle warmth
  const attack=ins.attack, release=0.45;
  gain.gain.setValueAtTime(0.0001,start);
  gain.gain.exponentialRampToValueAtTime(level,start+attack);
  gain.gain.exponentialRampToValueAtTime(level*ins.sustain,start+dur);
  gain.gain.exponentialRampToValueAtTime(0.0001,start+dur+release);
  osc.connect(gain); osc2.connect(gain); gain.connect(dest);
  osc.start(start); osc2.start(start);
  const stop=start+dur+release+0.05;
  osc.stop(stop); osc2.stop(stop);

  // track so stopAllAudio() can cut it short; self-remove when it finishes
  const voice={osc,osc2,gain};
  activeVoices.push(voice);
  osc.onended=()=>{ const i=activeVoices.indexOf(voice); if(i>=0) activeVoices.splice(i,1); };
}

function playMidiNotes(midiNotes,opts){
  opts=opts||{};
  if(!midiNotes||!midiNotes.length) return;
  const ctx=getCtx();
  const master=ctx.createGain();
  const filter=ctx.createBiquadFilter();
  filter.type="lowpass";
  filter.frequency.value=4200;
  master.gain.value=0.85;
  master.connect(filter);
  filter.connect(ctx.destination);

  const n=midiNotes.length;
  const level=Math.min(0.16,0.5/n);   // keep headroom, avoid clipping
  const dur=opts.dur!=null?opts.dur:1.0;
  const roll=opts.roll!=null?opts.roll:0.045;
  const t0=ctx.currentTime+0.04;
  const names=Object.keys(INSTRUMENTS);
  midiNotes.forEach((mNote,i)=>{
    // "multi" gives every note its own random instrument
    const ins=opts.instrument==="multi"?names[Math.floor(Math.random()*names.length)]:opts.instrument;
    playVoice(ctx,midiToFreq(mNote),t0+i*roll,dur,level,master,ins);
  });
}

// baseMidi = MIDI note of C in the chosen octave (C3=48, C4=60)
function chordToMidi(chord,baseMidi){
  const data=getChordIntervals(chord);
  if(!data) return [];
  return data.ints.map(i=>baseMidi+data.rootPC+i);
}

// Play a series of chords (each an array of MIDI notes) one after another.
// Returns the total scheduled length in seconds.
function playChordSequence(chordsMidi,opts){
  opts=opts||{};
  if(!chordsMidi||!chordsMidi.length) return 0;
  const ctx=getCtx();
  const master=ctx.createGain();
  const filter=ctx.createBiquadFilter();
  filter.type="lowpass";
  filter.frequency.value=4200;
  master.gain.value=0.85;
  master.connect(filter);
  filter.connect(ctx.destination);

  const chordDur=opts.chordDur!=null?opts.chordDur:0.85;
  const gap=opts.gap!=null?opts.gap:0.06;
  const roll=opts.roll!=null?opts.roll:0.02;
  let t=ctx.currentTime+0.08;
  chordsMidi.forEach(midi=>{
    if(!midi||!midi.length) { t+=chordDur+gap; return; }
    const level=Math.min(0.16,0.5/midi.length);
    midi.forEach((m,j)=>playVoice(ctx,midiToFreq(m),t+j*roll,chordDur,level,master));
    t+=chordDur+gap;
  });
  return t-(ctx.currentTime);
}

/* ---------- Small DOM utilities ---------- */
function val(id){ return document.getElementById(id).value.trim(); }

function pulse(e){
  const b=e&&e.currentTarget;
  if(!b) return;
  b.classList.remove("pulsing");
  void b.offsetWidth;            // restart animation
  b.classList.add("pulsing");
}
