/* ============================================================
   donate.js — bank-transfer donation page.
   The QR is a static VietQR image (assets/donate-qr.png); this
   just powers the "copy account number" button.
   ============================================================ */

const ACCOUNT_NUMBER = "16002667";   // ACB — NGUYEN SONG TOAN

function flash(btn,msg){
  const original=btn.dataset.label||btn.textContent;
  btn.dataset.label=original;
  btn.textContent=msg;
  setTimeout(()=>{ btn.textContent=btn.dataset.label; },1500);
}

function copyAcct(e){
  const btn=e.currentTarget;
  const done=()=>flash(btn,"Copied ✓");
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(ACCOUNT_NUMBER).then(done).catch(()=>fallbackCopy(ACCOUNT_NUMBER,done));
  }else{
    fallbackCopy(ACCOUNT_NUMBER,done);
  }
}

function fallbackCopy(text,done){
  const ta=document.createElement("textarea");
  ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{ document.execCommand("copy"); }catch(err){}
  document.body.removeChild(ta);
  done();
}
