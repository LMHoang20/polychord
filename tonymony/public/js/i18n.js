/* ============================================================
   i18n.js — language picker in the top menu.
   Elements marked data-i18n="key" are translated; English is the
   text already in the page. The choice is remembered in localStorage.
   Covers the menu, section headings and buttons, and the Donate page.
   ============================================================ */

const LANGUAGES = {
  en: "English", vi: "Tiếng Việt", zh: "中文", th: "ไทย",
  fr: "Français", es: "Español", ru: "Русский",
};

const I18N = {
  vi: {
    tabCheck: "Kiểm tra bài", tabHarm: "Hòa âm giúp tôi", donate: "♥ Ủng hộ",
    checkTitle: "Kiểm tra hòa âm 4 bè của tôi",
    checkIntro: "Viết bè Soprano và Alto trên khuông khóa Sol, bè Tenor và Bass trên khuông khóa Fa, thêm số La Mã dưới mỗi hợp âm, và TonyMony sẽ đánh dấu mọi lỗi vi phạm quy tắc ngay khi bạn viết.",
    tempo: "Tốc độ", example: "Tải ví dụ", clear: "Xóa", results: "Kết quả",
    harmTitle: "Hòa âm giúp tôi",
    harmIntro: "Viết một giai điệu hoặc bè trầm, chọn hợp âm, và TonyMony sẽ viết ba bè còn lại. Bạn nhận được nhiều đáp án đúng để so sánh. Để trống hợp âm của một nốt và TonyMony sẽ chọn giúp.",
    giving: "Tôi đưa", melody: "Giai điệu (Soprano)", bass: "Bè trầm", harmonize: "Hòa âm", answers: "Số đáp án",
    donateTitle: "Ủng hộ TonyMony",
    donateSub: "Nếu công cụ này giúp ích cho việc học hòa âm của bạn, bạn có thể góp một chút để giữ cho nó luôn miễn phí và phát triển. Cảm ơn bạn! 🙏",
    scan: "Quét để ủng hộ",
    scanHint: "Mở ứng dụng ngân hàng Việt Nam (VietQR / napas 247), quét mã và thông tin chuyển khoản sẽ tự điền — hoặc chuyển thủ công:",
    bank: "Ngân hàng", acctName: "Tên tài khoản", acctNo: "Số tài khoản",
    copy: "Sao chép số tài khoản", copied: "Đã chép ✓", feedback: "Góp ý? Gửi email tới", back: "← Về TonyMony",
  },
  zh: {
    tabCheck: "检查我的作业", tabHarm: "为我配和声", donate: "♥ 捐赠",
    checkTitle: "检查我的四声部和声",
    checkIntro: "在高音谱表写女高音和女低音，在低音谱表写男高音和男低音，在每个和弦下标上罗马数字，TonyMony 会实时标出每一处违反规则的地方。",
    tempo: "速度", example: "载入示例", clear: "清除", results: "结果",
    harmTitle: "为我配和声",
    harmIntro: "写一条旋律或低音线，选择和弦，TonyMony 会写出其余三个声部。你会得到多个正确答案可供比较。某个音不填和弦，TonyMony 会替你选择。",
    giving: "我提供", melody: "旋律（女高音）", bass: "低音", harmonize: "配和声", answers: "答案数量",
    donateTitle: "支持 TonyMony",
    donateSub: "如果这些工具对你的和声学习有帮助，欢迎捐助，让它保持免费并不断完善。谢谢！🙏",
    scan: "扫码捐赠",
    scanHint: "打开任意越南银行应用（VietQR / napas 247），扫描二维码，转账信息会自动填写——或手动转账：",
    bank: "银行", acctName: "账户名", acctNo: "账号",
    copy: "复制账号", copied: "已复制 ✓", feedback: "有反馈？请发邮件至", back: "← 返回 TonyMony",
  },
  th: {
    tabCheck: "ตรวจงานของฉัน", tabHarm: "ช่วยทำฮาร์โมนี", donate: "♥ บริจาค",
    checkTitle: "ตรวจฮาร์โมนี 4 แนวของฉัน",
    checkIntro: "เขียนโซปราโนและอัลโตบนบรรทัดห้าเส้นกุญแจซอล เทเนอร์และเบสบนกุญแจฟา ใส่เลขโรมันใต้แต่ละคอร์ด แล้ว TonyMony จะทำเครื่องหมายทุกจุดที่ผิดกฎให้ทันที",
    tempo: "ความเร็ว", example: "โหลดตัวอย่าง", clear: "ล้าง", results: "ผลลัพธ์",
    harmTitle: "ช่วยทำฮาร์โมนี",
    harmIntro: "เขียนทำนองหรือแนวเบส เลือกคอร์ด แล้ว TonyMony จะเขียนอีกสามแนวให้ คุณจะได้หลายคำตอบที่ถูกต้องไว้เปรียบเทียบ หากเว้นคอร์ดของโน้ตตัวใดไว้ TonyMony จะเลือกให้",
    giving: "ฉันให้", melody: "ทำนอง (โซปราโน)", bass: "เบส", harmonize: "ทำฮาร์โมนี", answers: "จำนวนคำตอบ",
    donateTitle: "สนับสนุน TonyMony",
    donateSub: "หากเครื่องมือเหล่านี้ช่วยให้คุณเรียนฮาร์โมนีได้ดีขึ้น คุณสามารถร่วมสนับสนุนเพื่อให้ใช้ฟรีและพัฒนาต่อไปได้ ขอบคุณค่ะ/ครับ! 🙏",
    scan: "สแกนเพื่อบริจาค",
    scanHint: "เปิดแอปธนาคารของเวียดนามใดก็ได้ (VietQR / napas 247) สแกนรหัส ข้อมูลการโอนจะถูกกรอกให้อัตโนมัติ หรือโอนด้วยตนเอง:",
    bank: "ธนาคาร", acctName: "ชื่อบัญชี", acctNo: "เลขที่บัญชี",
    copy: "คัดลอกเลขที่บัญชี", copied: "คัดลอกแล้ว ✓", feedback: "ข้อเสนอแนะ? ส่งอีเมลถึง", back: "← กลับไป TonyMony",
  },
  fr: {
    tabCheck: "Vérifier mon travail", tabHarm: "Harmoniser pour moi", donate: "♥ Faire un don",
    checkTitle: "Vérifier mon harmonie à 4 voix",
    checkIntro: "Écrivez soprano et alto sur la portée de sol, ténor et basse sur la portée de fa, ajoutez un chiffrage romain sous chaque accord, et TonyMony signale en direct chaque règle enfreinte.",
    tempo: "Tempo", example: "Charger un exemple", clear: "Effacer", results: "Résultats",
    harmTitle: "Harmoniser pour moi",
    harmIntro: "Écrivez une mélodie ou une basse, choisissez les accords, et TonyMony écrit les trois autres voix. Vous obtenez plusieurs réponses correctes à comparer. Laissez l'accord d'une note vide et TonyMony en choisit un.",
    giving: "Je donne", melody: "Mélodie (soprano)", bass: "Basse", harmonize: "Harmoniser", answers: "Réponses",
    donateTitle: "Soutenir TonyMony",
    donateSub: "Si ces outils vous aident à travailler l'harmonie, vous pouvez contribuer à les garder gratuits et à les faire évoluer. Merci ! 🙏",
    scan: "Scanner pour donner",
    scanHint: "Ouvrez une application bancaire vietnamienne (VietQR / napas 247), scannez le code et le virement se remplit automatiquement — ou envoyez-le manuellement :",
    bank: "Banque", acctName: "Titulaire du compte", acctNo: "Numéro de compte",
    copy: "Copier le numéro de compte", copied: "Copié ✓", feedback: "Un avis ? Écrivez à", back: "← Retour à TonyMony",
  },
  es: {
    tabCheck: "Revisar mi trabajo", tabHarm: "Armonizar por mí", donate: "♥ Donar",
    checkTitle: "Revisar mi armonía a 4 voces",
    checkIntro: "Escribe soprano y contralto en el pentagrama de sol, tenor y bajo en el de fa, pon un número romano bajo cada acorde y TonyMony marca al instante cada regla que se rompe.",
    tempo: "Tempo", example: "Cargar ejemplo", clear: "Borrar", results: "Resultados",
    harmTitle: "Armonizar por mí",
    harmIntro: "Escribe una melodía o un bajo, elige los acordes y TonyMony escribe las otras tres voces. Obtienes varias respuestas correctas para comparar. Deja vacío el acorde de una nota y TonyMony elige uno.",
    giving: "Doy", melody: "Melodía (soprano)", bass: "Bajo", harmonize: "Armonizar", answers: "Respuestas",
    donateTitle: "Apoya TonyMony",
    donateSub: "Si estas herramientas te ayudan con la armonía, puedes contribuir para mantenerlas gratis y seguir mejorándolas. ¡Gracias! 🙏",
    scan: "Escanea para donar",
    scanHint: "Abre cualquier app bancaria de Vietnam (VietQR / napas 247), escanea el código y la transferencia se rellena sola, o envíala manualmente:",
    bank: "Banco", acctName: "Titular de la cuenta", acctNo: "Número de cuenta",
    copy: "Copiar número de cuenta", copied: "Copiado ✓", feedback: "¿Comentarios? Escribe a", back: "← Volver a TonyMony",
  },
  ru: {
    tabCheck: "Проверить мою работу", tabHarm: "Гармонизировать за меня", donate: "♥ Поддержать",
    checkTitle: "Проверить мою четырёхголосную гармонию",
    checkIntro: "Пишите сопрано и альт на скрипичном стане, тенор и бас на басовом, подпишите римскую цифру под каждым аккордом, и TonyMony сразу отметит каждое нарушение правил.",
    tempo: "Темп", example: "Загрузить пример", clear: "Очистить", results: "Результаты",
    harmTitle: "Гармонизировать за меня",
    harmIntro: "Напишите мелодию или бас, выберите аккорды, и TonyMony напишет остальные три голоса. Вы получите несколько правильных вариантов для сравнения. Оставьте аккорд у ноты пустым, и TonyMony выберет его сам.",
    giving: "Я задаю", melody: "Мелодию (сопрано)", bass: "Бас", harmonize: "Гармонизировать", answers: "Вариантов",
    donateTitle: "Поддержать TonyMony",
    donateSub: "Если эти инструменты помогают вам в изучении гармонии, вы можете помочь сохранить их бесплатными и развивать дальше. Спасибо! 🙏",
    scan: "Сканируйте, чтобы поддержать",
    scanHint: "Откройте любое вьетнамское банковское приложение (VietQR / napas 247), отсканируйте код, и перевод заполнится сам — или отправьте вручную:",
    bank: "Банк", acctName: "Имя владельца счёта", acctNo: "Номер счёта",
    copy: "Скопировать номер счёта", copied: "Скопировано ✓", feedback: "Отзыв? Пишите на", back: "← Назад в TonyMony",
  },
};

// The English text is whatever the page already says; remember it before translating.
function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
    const text = lang !== "en" && I18N[lang] && I18N[lang][el.dataset.i18n];
    el.innerHTML = text || el.dataset.en;
  });
}

// Used by the Donate page for the "Copied" flash.
function tr(key, fallback) {
  const lang = document.documentElement.lang;
  return (lang !== "en" && I18N[lang] && I18N[lang][key]) || fallback;
}

function initLanguagePicker() {
  const bar = document.querySelector(".nav-inner");
  if (!bar) return;
  let saved = "en";
  try { saved = localStorage.getItem("lang") || "en"; } catch (e) { /* ignore */ }
  if (!LANGUAGES[saved]) saved = "en";

  const sel = document.createElement("select");
  sel.className = "lang-select";
  sel.setAttribute("aria-label", "Language");
  Object.keys(LANGUAGES).forEach(code => {
    const o = document.createElement("option");
    o.value = code; o.textContent = LANGUAGES[code];
    sel.appendChild(o);
  });
  sel.value = saved;
  sel.addEventListener("change", () => {
    try { localStorage.setItem("lang", sel.value); } catch (e) { /* ignore */ }
    applyLanguage(sel.value);
  });
  const theme = document.getElementById("themeBtn");
  bar.insertBefore(sel, theme);
  applyLanguage(saved);
}

initLanguagePicker();
