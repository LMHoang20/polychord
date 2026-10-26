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
      v.sources.forEach(s=>s.stop(now+0.12));
    }catch(err){ /* node may already be stopped */ }
  });
  activeVoices=[];
}

function midiToFreq(m){ return 440*Math.pow(2,(m-69)/12); }

/* ---------- Instruments ---------- */
// Real recordings from the FluidR3 GM soundfont (CC BY 3.0, see
// assets/instruments/CREDITS.txt): one every SAMPLE_STEP semitones from
// SAMPLE_LOW to SAMPLE_HIGH, at assets/instruments/<instrument>/<midi>.mp3.
// Notes in between play the nearest recording, sped up or slowed down.
const INSTRUMENTS=["piano","harpsichord","organ","harp","guitar","strings",
                   "violin","cello","flute","oboe","clarinet","horn"];
const SAMPLE_LOW=36, SAMPLE_HIGH=96, SAMPLE_STEP=3;   // C2–C7, every minor third
const SAMPLE_GAIN=2.5;   // recordings are normalized to a peak of 1
const RELEASE=0.45;      // fade-out after a note's duration (s)

const samples={};        // instrument -> {midi: AudioBuffer}, once all have loaded
const loading=new Map(); // instrument -> promise, while its recordings download
let instrument="piano";  // what plays; pages change it with setInstrument()

// Which recording plays a MIDI note, and at what speed.
function nearestSample(midi){
  const steps=Math.round((midi-SAMPLE_LOW)/SAMPLE_STEP);
  const m=Math.min(SAMPLE_HIGH,Math.max(SAMPLE_LOW,SAMPLE_LOW+steps*SAMPLE_STEP));
  return {midi:m,rate:Math.pow(2,(midi-m)/12)};
}

// "multi" means every note gets a random instrument. Returns a promise that
// resolves once the recordings are in (or failed, so the synth plays).
function setInstrument(name){
  instrument=name;
  return Promise.all((name==="multi"?INSTRUMENTS:[name]).map(loadInstrument));
}

// Download and decode an instrument's recordings in the background. Until
// they're all in, its notes play on the synth.
function loadInstrument(name){
  const Decoder=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(loading.has(name)) return loading.get(name);
  if(!INSTRUMENTS.includes(name)||samples[name]||!Decoder||typeof fetch!=="function") return Promise.resolve();
  // An offline context decodes without needing a click first; the buffers
  // play in the real one.
  const decoder=new Decoder(1,1,44100);
  const notes=[];
  for(let m=SAMPLE_LOW;m<=SAMPLE_HIGH;m+=SAMPLE_STEP) notes.push(m);
  const done=Promise.all(notes.map(m=>
    fetch(`assets/instruments/${name}/${m}.mp3`)
      .then(r=>{ if(!r.ok) throw new Error(`${r.status} ${r.url}`); return r.arrayBuffer(); })
      .then(data=>new Promise((ok,fail)=>decoder.decodeAudioData(data,ok,fail)))
  )).then(buffers=>{
    normalize(buffers);
    samples[name]=Object.fromEntries(notes.map((m,i)=>[m,buffers[i]]));
  }).catch(err=>{
    console.warn(`Couldn't load the ${name} recordings, using the synth`,err);
  }).finally(()=>loading.delete(name));
  loading.set(name,done);
  return done;
}

// Scale an instrument's recordings together so the loudest peak is 1, which
// evens out volume between instruments but keeps it natural across the range.
function normalize(buffers){
  let peak=0;
  buffers.forEach(b=>{
    for(let c=0;c<b.numberOfChannels;c++) for(const x of b.getChannelData(c)) peak=Math.max(peak,Math.abs(x));
  });
  if(!peak) return;
  buffers.forEach(b=>{
    for(let c=0;c<b.numberOfChannels;c++){
      const d=b.getChannelData(c);
      for(let i=0;i<d.length;i++) d[i]/=peak;
    }
  });
}

// One output per playback: synth voices go through a lowpass to soften
// them, recordings go straight to the master volume.
function makeOutput(ctx){
  const master=ctx.createGain();
  master.gain.value=0.85;
  master.connect(ctx.destination);
  const filter=ctx.createBiquadFilter();
  filter.type="lowpass";
  filter.frequency.value=4200;
  filter.connect(master);
  return {master,filter};
}

function playVoice(ctx,midi,start,dur,level,out){
  const name=instrument==="multi"?INSTRUMENTS[Math.floor(Math.random()*INSTRUMENTS.length)]:instrument;
  const gain=ctx.createGain();
  let sources;
  if(samples[name]){
    const {midi:m,rate}=nearestSample(midi);
    const src=ctx.createBufferSource();
    src.buffer=samples[name][m];
    src.playbackRate.value=rate;
    gain.gain.setValueAtTime(level*SAMPLE_GAIN,start);
    gain.gain.setValueAtTime(level*SAMPLE_GAIN,start+dur);
    gain.gain.exponentialRampToValueAtTime(0.0001,start+dur+RELEASE);
    src.connect(gain); gain.connect(out.master);
    sources=[src];
  }else{
    // Synth fallback: triangle + slightly detuned sine.
    const osc=ctx.createOscillator();
    const osc2=ctx.createOscillator();
    osc.type="triangle";
    osc2.type="sine";
    osc.frequency.value=midiToFreq(midi);
    osc2.frequency.value=midiToFreq(midi);
    osc2.detune.value=4;               // subtle warmth
    const attack=0.012;
    gain.gain.setValueAtTime(0.0001,start);
    gain.gain.exponentialRampToValueAtTime(level,start+attack);
    gain.gain.setValueAtTime(level,start+dur);
    gain.gain.exponentialRampToValueAtTime(0.0001,start+dur+RELEASE);
    osc.connect(gain); osc2.connect(gain); gain.connect(out.filter);
    sources=[osc,osc2];
  }
  const stop=start+dur+RELEASE+0.05;
  sources.forEach(s=>{ s.start(start); s.stop(stop); });

  // track so stopAllAudio() can cut it short; self-remove when it finishes
  const voice={sources,gain};
  activeVoices.push(voice);
  sources[0].onended=()=>{ const i=activeVoices.indexOf(voice); if(i>=0) activeVoices.splice(i,1); };
}

function playMidiNotes(midiNotes,opts){
  opts=opts||{};
  if(!midiNotes||!midiNotes.length) return;
  const ctx=getCtx();
  const out=makeOutput(ctx);

  const n=midiNotes.length;
  const level=Math.min(0.16,0.5/n);   // keep headroom, avoid clipping
  const dur=opts.dur!=null?opts.dur:1.0;
  const roll=opts.roll!=null?opts.roll:0.045;
  const t0=ctx.currentTime+0.04;
  midiNotes.forEach((mNote,i)=>playVoice(ctx,mNote,t0+i*roll,dur,level,out));
}

// baseMidi = MIDI note of C in the chosen octave (C3=48, C4=60)
function chordToMidi(chord,baseMidi){
  const data=getChordIntervals(chord);
  if(!data) return [];
  return data.ints.map(i=>baseMidi+data.rootPC+i);
}

// Play a series of chords (each an array of MIDI notes) one after another.
// opts.melody (optional): per chord, MIDI notes played evenly across it.
// Returns the total scheduled length in seconds.
function playChordSequence(chordsMidi,opts){
  opts=opts||{};
  if(!chordsMidi||!chordsMidi.length) return 0;
  const ctx=getCtx();
  const out=makeOutput(ctx);

  const chordDur=opts.chordDur!=null?opts.chordDur:0.85;
  const gap=opts.gap!=null?opts.gap:0.06;
  const roll=opts.roll!=null?opts.roll:0.02;
  let t=ctx.currentTime+0.08;
  chordsMidi.forEach((midi,idx)=>{
    if(!midi||!midi.length) { t+=chordDur+gap; return; }
    const level=Math.min(0.16,0.5/midi.length);
    midi.forEach((m,j)=>playVoice(ctx,m,t+j*roll,chordDur,level,out));
    const tune=opts.melody&&opts.melody[idx];
    if(tune) tune.forEach((m,j)=>playVoice(ctx,m,t+j*chordDur/tune.length,chordDur/tune.length,0.14,out));
    t+=chordDur+gap;
  });
  return t-(ctx.currentTime);
}

// Pages with an instrument picker (#optInstrument) start loading its choice
// now, so the first ▶ already sounds real.
setInstrument((document.getElementById("optInstrument")||{}).value||"piano");

/* ---------- Small DOM utilities ---------- */
function val(id){ return document.getElementById(id).value.trim(); }

function pulse(e){
  const b=e&&e.currentTarget;
  if(!b) return;
  b.classList.remove("pulsing");
  void b.offsetWidth;            // restart animation
  b.classList.add("pulsing");
}
