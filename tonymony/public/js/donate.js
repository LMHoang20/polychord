/* ============================================================
   donate.js — powers the "copy account number" button on the Donate page.
   ============================================================ */

const ACCOUNT_NUMBER = "16002667";   // ACB — NGUYEN SONG TOAN

function copyAcct(btn) {
  const original = btn.innerHTML;
  const done = () => {
    btn.textContent = tr("copied", "Copied ✓");
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(ACCOUNT_NUMBER).then(done).catch(() => fallbackCopy(done));
  } else {
    fallbackCopy(done);
  }
}

function fallbackCopy(done) {
  const ta = document.createElement("textarea");
  ta.value = ACCOUNT_NUMBER; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand("copy"); } catch (err) { /* ignore */ }
  document.body.removeChild(ta);
  done();
}

document.getElementById("copyBtn").addEventListener("click", e => copyAcct(e.currentTarget));
