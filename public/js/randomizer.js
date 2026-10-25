/* ============================================================
   randomizer.js — configurable practice randomizer.
   Up to MAX containers, each a number range or a word list.
   State is persisted in the URL (?cfg=...). No dependencies.
   ============================================================ */

const MAX=6;
let configs=[];
let values=[];

// Music/guitar-friendly starting setup (used when there's no ?cfg in the URL).
function defaultConfigs(){
  return [
    { name:"Note", type:"word", min:1, max:12,
      words:"C, C#, D, D#, E, F, F#, G, G#, A, A#, B" },
    { name:"Scale / Quality", type:"word", min:1, max:12,
      words:"major, minor, dorian, mixolydian, pentatonic, blues" }
  ];
}

// Escape user text before putting it into innerHTML / attributes.
function esc(s){
  return String(s).replace(/[&<>"']/g,c=>(
    {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]
  ));
}

function randomFromConfig(cfg){
  if(cfg.type==="number"){
    const min=Number(cfg.min), max=Number(cfg.max);
    if(Number.isNaN(min)||Number.isNaN(max)||max<min) return "—";
    return Math.floor(Math.random()*(max-min+1))+min;
  }
  const words=(cfg.words||"").split(",").map(w=>w.trim()).filter(Boolean);
  return words.length ? words[Math.floor(Math.random()*words.length)] : "—";
}

function render(){
  const containersEl=document.getElementById("containers");
  const configsEl=document.getElementById("configs");
  containersEl.innerHTML="";
  configsEl.innerHTML="";

  configs.forEach((cfg,i)=>{
    const card=document.createElement("div");
    card.className="rnd-card";
    card.innerHTML=`
      <div class="rnd-name">${esc(cfg.name)}</div>
      <div class="rnd-value">${esc(values[i])}</div>
      <button class="btn btn-primary rnd-roll" onclick="randomizeOne(${i})">Randomize</button>`;
    containersEl.appendChild(card);

    const conf=document.createElement("div");
    conf.className="rnd-config";
    conf.innerHTML=`
      <button class="rnd-del" onclick="deleteContainer(${i})" title="Delete" aria-label="Delete">×</button>
      <label>Name</label>
      <input value="${esc(cfg.name)}" onchange="updateCfg(${i},'name',this.value)">
      <label>Type</label>
      <select onchange="updateCfg(${i},'type',this.value)">
        <option value="number" ${cfg.type==="number"?"selected":""}>Number</option>
        <option value="word" ${cfg.type==="word"?"selected":""}>Words</option>
      </select>
      ${cfg.type==="number"
        ? `<label>Min</label>
           <input type="number" value="${esc(cfg.min)}" onchange="updateCfg(${i},'min',this.value)">
           <label>Max</label>
           <input type="number" value="${esc(cfg.max)}" onchange="updateCfg(${i},'max',this.value)">`
        : `<label>Words (comma-separated)</label>
           <textarea onchange="updateCfg(${i},'words',this.value)">${esc(cfg.words)}</textarea>`
      }`;
    configsEl.appendChild(conf);
  });

  document.getElementById("addBtn").disabled=configs.length>=MAX;
}

function randomizeOne(i){ values[i]=randomFromConfig(configs[i]); render(); }
function randomizeAll(){ values=configs.map(randomFromConfig); render(); }

function updateCfg(i,key,value){ configs[i][key]=value; updateURL(); render(); }

function deleteContainer(i){
  configs.splice(i,1); values.splice(i,1); updateURL(); render();
}

function addContainer(){
  if(configs.length>=MAX) return;
  configs.push({ name:`Item ${configs.length+1}`, type:"number", min:1, max:12, words:"C, D, E, F, G, A, B" });
  values.push(randomFromConfig(configs[configs.length-1]));
  updateURL(); render();
}

function updateURL(){
  try{
    history.replaceState(null,"","?cfg="+encodeURIComponent(JSON.stringify(configs)));
  }catch(e){ /* file:// or restricted context — skip persistence */ }
}

// ?cfg comes from shared links, so coerce each entry into a well-formed config
// (drops non-objects, caps at MAX) instead of trusting its shape.
function sanitizeConfigs(raw){
  if(!Array.isArray(raw)) return [];
  return raw.filter(c=>c&&typeof c==="object").slice(0,MAX).map((c,i)=>({
    name:String(c.name??`Item ${i+1}`),
    type:c.type==="number"?"number":"word",
    min:c.min??1,
    max:c.max??12,
    words:String(c.words??"")
  }));
}

function loadFromURL(){
  const params=new URLSearchParams(window.location.search);
  if(params.has("cfg")){
    // URLSearchParams.get() already percent-decodes.
    try{ configs=sanitizeConfigs(JSON.parse(params.get("cfg"))); }
    catch(e){ configs=[]; }
  }
  if(configs.length===0) configs=defaultConfigs();
  values=configs.map(randomFromConfig);
}

loadFromURL();
render();
