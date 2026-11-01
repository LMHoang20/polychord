/* ============================================================
   i18n.js — language picker in the top menu.
   Elements marked data-i18n="key" are translated; English is the
   text already in the page. The choice is remembered in localStorage.
   Covers the menu on every page and the Modulation page.
   ============================================================ */

const LANGUAGES={
  en:"English", vi:"Tiếng Việt", zh:"中文", ja:"日本語",
  ko:"한국어", fr:"Français", es:"Español", ru:"Русский"
};

const I18N={
  vi:{
    home:"Trang chủ", multi:"Multinotes", mod:"Chuyển điệu", poly:"Polychord", rand:"Ngẫu nhiên", donate:"♥ Ủng hộ",
    modTitle:"Chuyển điệu", modSub:"Luyện tai nghe chuyển giọng — nghe một chuỗi 8 hoặc 16 hợp âm chuyển giọng và chép lại.",
    exercise:"Bài tập", modHint:"Tạo một chuỗi hợp âm đi qua 2–3 giọng (2 giọng = 8 hợp âm, 3 giọng = 16 hợp âm), rồi chép từng hợp âm bên dưới. Nhấn <b>Phát</b> để nghe (trình duyệt cần một cú nhấp để bắt đầu phát âm thanh).",
    keys:"Giọng", mode:"Chế độ", tempo:"Tốc độ", instrument:"Nhạc cụ", newEx:"🎲 Bài mới", play:"▶ Phát",
    transcription:"Bài chép của bạn", transHint:"Gõ từng hợp âm bạn nghe được — ví dụ <b>C</b>, <b>Am</b>, <b>G7</b>, <b>Bdim</b>. Chấp nhận đồng âm khác tên (C# = Db) và cách viết khác (m = min). Dùng ▶ ở mỗi ô để nghe lại một hợp âm; nhấn Enter để sang ô tiếp theo.",
    check:"Kiểm tra", reveal:"Hiện đáp án"
  },
  zh:{
    home:"首页", multi:"Multinotes", mod:"转调", poly:"复合和弦", rand:"随机器", donate:"♥ 捐赠",
    modTitle:"转调", modSub:"转调听音训练——聆听包含 8 或 16 个和弦的转调进行并记谱。",
    exercise:"练习", modHint:"生成一个经过 2–3 个调的和弦进行（2 个调 = 8 个和弦，3 个调 = 16 个和弦），然后在下方写出每个和弦。点击<b>播放</b>聆听（浏览器需要先点击才能播放音频）。",
    keys:"调数", mode:"模式", tempo:"速度", instrument:"乐器", newEx:"🎲 新练习", play:"▶ 播放",
    transcription:"你的记谱", transHint:"输入你听到的每个和弦——例如 <b>C</b>、<b>Am</b>、<b>G7</b>、<b>Bdim</b>。可接受等音写法（C# = Db）和不同的性质写法（m = min）。点击每格的 ▶ 可重听单个和弦；按 Enter 跳到下一格。",
    check:"检查答案", reveal:"显示答案"
  },
  ja:{
    home:"ホーム", multi:"Multinotes", mod:"転調", poly:"ポリコード", rand:"ランダマイザー", donate:"♥ 寄付",
    modTitle:"転調", modSub:"転調の聴音トレーニング — 8 または 16 コードの転調進行を聴いて書き取ります。",
    exercise:"練習", modHint:"2〜3 つの調を通るコード進行を作成し（2 調 = 8 コード、3 調 = 16 コード）、下に各コードを書き取ります。<b>再生</b>を押すと聴けます（ブラウザは音声の開始にクリックが必要です）。",
    keys:"調の数", mode:"モード", tempo:"テンポ", instrument:"楽器", newEx:"🎲 新しい問題", play:"▶ 再生",
    transcription:"あなたの書き取り", transHint:"聴こえた各コードを入力します — 例: <b>C</b>、<b>Am</b>、<b>G7</b>、<b>Bdim</b>。異名同音 (C# = Db) や表記の違い (m = min) も使えます。各欄の ▶ で 1 つのコードを再生、Enter で次の欄へ移動します。",
    check:"答え合わせ", reveal:"答えを見る"
  },
  ko:{
    home:"홈", multi:"Multinotes", mod:"전조", poly:"폴리코드", rand:"랜덤", donate:"♥ 후원",
    modTitle:"전조", modSub:"전조 청음 훈련 — 8개 또는 16개 코드의 전조 진행을 듣고 받아 적어 보세요.",
    exercise:"연습", modHint:"2–3개 조를 지나는 코드 진행을 만든 뒤(2개 조 = 코드 8개, 3개 조 = 코드 16개) 아래에 각 코드를 적으세요. <b>재생</b>을 눌러 들어 보세요(브라우저는 클릭해야 오디오가 시작됩니다).",
    keys:"조 개수", mode:"모드", tempo:"템포", instrument:"악기", newEx:"🎲 새 문제", play:"▶ 재생",
    transcription:"내 받아쓰기", transHint:"들리는 코드를 각각 입력하세요 — 예: <b>C</b>, <b>Am</b>, <b>G7</b>, <b>Bdim</b>. 이명동음(C# = Db)과 표기 차이(m = min)도 인정됩니다. 각 칸의 ▶로 코드 하나를 다시 듣고, Enter로 다음 칸으로 이동합니다.",
    check:"정답 확인", reveal:"정답 보기"
  },
  fr:{
    home:"Accueil", multi:"Multinotes", mod:"Modulation", poly:"Polyaccord", rand:"Aléatoire", donate:"♥ Faire un don",
    modTitle:"Modulation", modSub:"Travail de l'oreille sur les changements de tonalité — écoutez une progression modulante de 8 ou 16 accords et transcrivez-la.",
    exercise:"Exercice", modHint:"Générez une progression qui traverse 2 à 3 tonalités (2 tonalités = 8 accords, 3 tonalités = 16 accords), puis transcrivez chaque accord ci-dessous. Appuyez sur <b>Lecture</b> pour écouter (le navigateur exige un clic pour lancer le son).",
    keys:"Tonalités", mode:"Mode", tempo:"Tempo", instrument:"Instrument", newEx:"🎲 Nouvel exercice", play:"▶ Lecture",
    transcription:"Votre transcription", transHint:"Saisissez chaque accord entendu — p. ex. <b>C</b>, <b>Am</b>, <b>G7</b>, <b>Bdim</b>. Les enharmoniques (C# = Db) et les graphies de qualité (m = min) sont acceptés. Utilisez ▶ sur une case pour réécouter un accord ; Entrée passe à la suivante.",
    check:"Vérifier", reveal:"Révéler"
  },
  es:{
    home:"Inicio", multi:"Multinotes", mod:"Modulación", poly:"Poliacorde", rand:"Aleatorio", donate:"♥ Donar",
    modTitle:"Modulación", modSub:"Entrenamiento auditivo para cambios de tonalidad: escucha una progresión modulante de 8 o 16 acordes y transcríbela.",
    exercise:"Ejercicio", modHint:"Genera una progresión que pasa por 2–3 tonalidades (2 tonalidades = 8 acordes, 3 tonalidades = 16 acordes) y transcribe cada acorde abajo. Pulsa <b>Reproducir</b> para escuchar (el navegador necesita un clic para iniciar el audio).",
    keys:"Tonalidades", mode:"Modo", tempo:"Tempo", instrument:"Instrumento", newEx:"🎲 Nuevo ejercicio", play:"▶ Reproducir",
    transcription:"Tu transcripción", transHint:"Escribe cada acorde que oigas, p. ej. <b>C</b>, <b>Am</b>, <b>G7</b>, <b>Bdim</b>. Se aceptan enarmónicos (C# = Db) y variantes de calidad (m = min). Usa ▶ en una casilla para repetir un acorde; Enter pasa a la siguiente.",
    check:"Comprobar", reveal:"Mostrar"
  },
  ru:{
    home:"Главная", multi:"Multinotes", mod:"Модуляция", poly:"Полиаккорд", rand:"Рандомайзер", donate:"♥ Поддержать",
    modTitle:"Модуляция", modSub:"Тренировка слуха на смену тональности — прослушайте модулирующую последовательность из 8 или 16 аккордов и запишите её.",
    exercise:"Упражнение", modHint:"Создайте последовательность, проходящую через 2–3 тональности (2 тональности = 8 аккордов, 3 = 16 аккордов), затем запишите каждый аккорд ниже. Нажмите <b>Играть</b>, чтобы послушать (браузеру нужен щелчок для запуска звука).",
    keys:"Тональности", mode:"Режим", tempo:"Темп", instrument:"Инструмент", newEx:"🎲 Новое упражнение", play:"▶ Играть",
    transcription:"Ваша запись", transHint:"Вводите каждый услышанный аккорд — например, <b>C</b>, <b>Am</b>, <b>G7</b>, <b>Bdim</b>. Допускаются энгармонизмы (C# = Db) и разные написания (m = min). ▶ в ячейке повторяет один аккорд; Enter переходит к следующей.",
    check:"Проверить", reveal:"Показать"
  }
};

// The English text is whatever the page already says; remember it before translating.
function applyLanguage(lang){
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    if(el.dataset.en===undefined) el.dataset.en=el.innerHTML;
    const text=lang!=="en" && I18N[lang] && I18N[lang][el.dataset.i18n];
    el.innerHTML=text||el.dataset.en;
  });
}

function initLanguagePicker(){
  const links=document.querySelector(".nav-links");
  if(!links) return;
  let saved="en";
  try{ saved=localStorage.getItem("lang")||"en"; }catch(e){}
  if(!LANGUAGES[saved]) saved="en";

  const sel=document.createElement("select");
  sel.className="lang-select";
  sel.setAttribute("aria-label","Language");
  Object.keys(LANGUAGES).forEach(code=>{
    const o=document.createElement("option");
    o.value=code; o.textContent=LANGUAGES[code];
    sel.appendChild(o);
  });
  sel.value=saved;
  sel.addEventListener("change",()=>{
    try{ localStorage.setItem("lang",sel.value); }catch(e){}
    applyLanguage(sel.value);
  });
  links.appendChild(sel);
  applyLanguage(saved);
}

initLanguagePicker();
