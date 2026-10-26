/* ============================================================
   theory.js — shared music-theory core (no DOM, no audio).
   Loaded first; other page scripts build on these globals.
   ============================================================ */

const NOTE_MAP={
  C:0,
  "C#":1,Db:1,
  D:2,
  "D#":3,Eb:3,
  E:4,
  F:5,
  "F#":6,Gb:6,
  G:7,
  "G#":8,Ab:8,
  A:9,
  "A#":10,Bb:10,
  B:11,Cb:11,"B#":0,"E#":5,Fb:4
};

const NOTE_NAMES=[
  "C","C#","D","Eb","E","F",
  "F#","G","Ab","A","Bb","B"
];

const CHORD_QUALITIES={
  "":[0,4,7],
  "m":[0,3,7],
  "dim":[0,3,6],
  "aug":[0,4,8],
  "7":[0,4,7,10],
  "maj7":[0,4,7,11],
  "m7":[0,3,7,10]
};

const UPPER_STRUCTURES={
  1:["7(b9,#11)","Altered"],
  2:["maj13(#11)","US II"],
  3:["7#9","Altered"],
  4:["maj7(#5,#9)","US III"],
  6:["7b5","Altered"],
  8:["7alt","Altered"],
  9:["13","US VI"],
  10:["13sus","Dominant Sus"],
  11:["maj7#11","Lydian"]
};

// Intervals (in semitones) that have NO mapped upper structure — shown when decode finds none.
const UNMAPPED_INTERVAL={0:"a unison",5:"a perfect 4th",7:"a perfect 5th"};

// Reverse of UPPER_STRUCTURES: name suffix -> interval, for parsing a typed interpretation.
const SUFFIX_TO_INTERVAL={};
Object.keys(UPPER_STRUCTURES).forEach(k=>{ SUFFIX_TO_INTERVAL[UPPER_STRUCTURES[k][0]]=+k; });

/* ---------- Chord parsing ---------- */
function getChordIntervals(chord){
  const m=chord.match(/^([A-G](#|b)?)/);
  if(!m) return null;
  const root=m[1];
  const rootPC=NOTE_MAP[root];
  const q=chord.substring(root.length);
  const ints=CHORD_QUALITIES[q]||[0,4,7];
  return { rootPC, ints };
}

function parseChord(chord){
  const data=getChordIntervals(chord);
  if(!data) return [];
  return data.ints.map(i=>(i+data.rootPC)%12);
}

function getChordRoot(chord){
  const m=chord.match(/^([A-G](#|b)?)/);
  if(!m) return null;
  return NOTE_MAP[m[1]];
}

function parseDirectNotes(text){
  const notes=[];
  text.trim().split(/\s+/).forEach(n=>{
    if(NOTE_MAP[n]!==undefined) notes.push(NOTE_MAP[n]);
  });
  return [...new Set(notes)];
}

/* ---------- Analysis helpers ---------- */
function intervalName(i){
  const map={0:"1",1:"b9",2:"9",3:"#9",4:"3",5:"11",6:"#11",7:"5",8:"#5",9:"13",10:"b7",11:"7"};
  return map[i]||i;
}

function detectUpperStructure(lowerRoot,upperRoot){
  if(lowerRoot===null||upperRoot===null) return null;
  const interval=(upperRoot-lowerRoot+12)%12;
  if(!UPPER_STRUCTURES[interval]) return null;
  return {
    name:NOTE_NAMES[lowerRoot]+UPPER_STRUCTURES[interval][0],
    category:UPPER_STRUCTURES[interval][1]
  };
}

function getScaleSuggestion(notes){
  const set=notes.join(",");
  if(set==="0,2,4,6,7,9") return "Lydian";
  if(set==="0,2,4,5,7,9,11") return "Major / Ionian";
  if(set==="0,2,3,5,7,8,10") return "Natural Minor";
  return "Unknown";
}

function analyzeRoot(root,notes){
  const rel=notes.map(n=>(n-root+12)%12).sort((a,b)=>a-b);
  let score=0;
  if(rel.includes(4)) score+=40;
  if(rel.includes(3)) score+=35;
  if(rel.includes(10)) score+=35;
  if(rel.includes(11)) score+=35;
  if(rel.includes(2)) score+=15;
  if(rel.includes(6)) score+=20;
  if(rel.includes(9)) score+=15;
  if(rel.includes(7)) score+=10;

  let name=NOTE_NAMES[root];
  const maj3=rel.includes(4), min3=rel.includes(3), b7=rel.includes(10), maj7=rel.includes(11);
  if(maj3&&maj7) name+="maj7";
  else if(maj3&&b7) name+="7";
  else if(min3&&b7) name+="m7";
  else if(min3) name+="m";
  if(rel.includes(2)) name+="(9)";
  if(rel.includes(6)) name+="(#11)";
  if(rel.includes(9)) name+="(13)";

  return { name, score, intervals:rel.map(intervalName).join(" ") };
}
