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

// Instrument recipes: harmonic strengths for two oscillators (first entry =
// fundamental), attack (s), how much level is left at the end of the note
// (1 = held, lower = plucked), how bright the note starts (filter cutoff as a
// multiple of the pitch; it closes as the note fades, like a real string),
// and vibrato depth in cents.
const INSTRUMENTS={
  piano:  {a:[1,0.5,0.25,0.12,0.06,0.03],b:[1,0.2],attack:0.005,sustain:0.12,bright:7,vib:0,detune:3},
  guitar: {a:[1,0.8,0.5,0.3,0.2,0.1,0.06,0.04],   b:[1,0.3],attack:0.004,sustain:0.08,bright:9, vib:0},
  violin: {a:[1,0.7,0.6,0.5,0.4,0.3,0.2,0.15,0.1,0.06],b:[1,0.5,0.3],attack:0.09,sustain:1,bright:7,vib:12},
  horn:   {a:[1,0.8,0.5,0.35,0.2,0.12,0.07],      b:[1,0.3],attack:0.06,sustain:1,   bright:5, vib:5},
  flute:  {a:[1,0.25,0.1,0.04],                   b:[1,0.05],attack:0.05,sustain:1,  bright:4, vib:8}
};

// Build (and cache) a wave from a list of harmonic strengths.
const waveCache=new Map();
function harmonicWave(ctx,partials){
  let w=waveCache.get(partials);
  if(!w||w.ctx!==ctx){
    const real=new Float32Array(partials.length+1), imag=new Float32Array(partials.length+1);
    partials.forEach((p,i)=>{ imag[i+1]=p; });
    w={ctx,wave:ctx.createPeriodicWave(real,imag)};
    waveCache.set(partials,w);
  }
  return w.wave;
}

function playVoice(ctx,freq,start,dur,level,dest,instrument){
  const ins=INSTRUMENTS[instrument]||INSTRUMENTS.piano;
  const osc=ctx.createOscillator();
  const osc2=ctx.createOscillator();
  const gain=ctx.createGain();
  const tone=ctx.createBiquadFilter();
  osc.setPeriodicWave(harmonicWave(ctx,ins.a));
  osc2.setPeriodicWave(harmonicWave(ctx,ins.b));
  osc.frequency.value=freq;
  osc2.frequency.value=freq;
  osc2.detune.value=ins.detune||4;   // subtle warmth (wider = richer)
  const attack=ins.attack, release=0.45;
  tone.type="lowpass";
  tone.frequency.setValueAtTime(Math.min(freq*ins.bright,12000),start);
  tone.frequency.exponentialRampToValueAtTime(Math.max(freq*2,200),start+dur+release);
  gain.gain.setValueAtTime(0.0001,start);
  gain.gain.exponentialRampToValueAtTime(level,start+attack);
  gain.gain.exponentialRampToValueAtTime(level*ins.sustain,start+dur);
  gain.gain.exponentialRampToValueAtTime(0.0001,start+dur+release);
  osc.connect(gain); osc2.connect(gain); gain.connect(tone); tone.connect(dest);
  osc.start(start); osc2.start(start);
  const stop=start+dur+release+0.05;
  osc.stop(stop); osc2.stop(stop);

  if(ins.vib){                       // gentle vibrato for bowed / blown sounds
    const lfo=ctx.createOscillator();
    const depth=ctx.createGain();
    lfo.frequency.value=5.2;
    depth.gain.value=ins.vib;
    lfo.connect(depth); depth.connect(osc.detune); depth.connect(osc2.detune);
    lfo.start(start+attack); lfo.stop(stop);
  }

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
  filter.frequency.value=6500;
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
  filter.frequency.value=6500;
  master.gain.value=0.85;
  master.connect(filter);
  filter.connect(ctx.destination);

  const chordDur=opts.chordDur!=null?opts.chordDur:0.85;
  const gap=opts.gap!=null?opts.gap:0.06;
  const roll=opts.roll!=null?opts.roll:0.02;
  let t=ctx.currentTime+0.08;
  chordsMidi.forEach((midi,idx)=>{
    if(!midi||!midi.length) { t+=chordDur+gap; return; }
    const level=Math.min(0.16,0.5/midi.length);
    midi.forEach((m,j)=>playVoice(ctx,midiToFreq(m),t+j*roll,chordDur,level,master));
    const tune=opts.melody&&opts.melody[idx];
    if(tune) tune.forEach((m,j)=>playVoice(ctx,midiToFreq(m),t+j*chordDur/tune.length,chordDur/tune.length,0.14,master));
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
