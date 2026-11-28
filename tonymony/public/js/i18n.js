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

// The Results area: labels, counts and the rule messages. $1, $2… are filled
// from the English message by trMsg below.
const I18N_RESULTS = {
  vi: {
    howChords: "Cách tôi đọc hợp âm của bạn", rulesSum: "Các quy tắc được kiểm tra",
    rulesErr: "<b>Lỗi:</b> 5 song song, 8 song song và đồng âm song song; nốt không thuộc hợp âm; thiếu âm gốc, âm 3 hoặc âm 7; nốt bè trầm sai so với thể đảo; gấp đôi âm dẫn, âm 7, ♭6 hoặc ♯4; chồng bè và chồng lấn; S–A hoặc A–T cách hơn một quãng tám, T–B cách hơn hai quãng tám; quãng giai điệu tăng; quan hệ chéo (một biến đổi hóa nên ở trong cùng một bè).",
    rulesWarn: "<b>Cảnh báo:</b> 5/8 ngược chiều; 5/8 ẩn ở hai bè ngoài; 5 không đều tiến vào bè trầm; bỏ nốt 5 mà không gấp đôi âm gốc; hợp âm 6/4 không gấp đôi bè trầm; nhảy quãng 7 hoặc hơn một quãng tám; nốt 7, âm dẫn và nốt của hợp âm 6 tăng chưa giải; nốt ngoài âm vực thường dùng; ô nhịp không đủ phách.",
    lvlError: "Lỗi", lvlWarn: "Cảnh báo", lvlNote: "Ghi chú",
    nothing: "Chưa có gì để kiểm tra.", noRule: "✓ Không vi phạm quy tắc nào",
    nErr: "$1 lỗi", nWarn: "$1 cảnh báo", pos: "ô nhịp $1, phách $2",
    cantChord: "không đọc được", bassLbl: "bè trầm",
    m_numeral: "Không đọc được \"$1\": $2.",
    m_nonum: "Hãy thêm số La Mã dưới bè trầm để kiểm tra cả hợp âm. Hiện chỉ kiểm tra cách tiến hành bè.",
    m_cross: "Chồng bè: $1 ($2) nằm dưới $3 ($4).",
    m_space: "Khoảng cách: $1 và $2 cách nhau $3. Hãy giữ trong $4.",
    m_range: "$1 nằm ngoài âm vực thường dùng của $2 ($3).",
    m_spell: "$1: $2 nên viết là $3 trong $4 ($5).",
    m_tone: "$1: $2 không thuộc $3 ($4).",
    m_toneNb: "$1: $2 không thuộc $3 ($4), và cũng không phải nốt qua hay nốt láy.",
    m_across: "$1: nốt này vắt qua vạch nhịp. Hãy rút ngắn để mỗi ô nhịp đủ $2.",
    m_empty: "Bè $1 đang trống.",
    m_stops: "Bè $1 dừng ở $2, trước các bè còn lại.",
    m_lastbar: "Ô nhịp cuối chưa đủ ($1 trên $2 phách).",
    m_no5: "$1 bỏ nốt 5 ($2). Chỉ chấp nhận khi âm gốc được gấp đôi.",
    m_miss: "$1 thiếu $2 ($3).",
    m_bass: "$1 cần $2 ($3) ở bè trầm, không phải $4.",
    m_dbl: "Không gấp đôi $1 ($2) trong $3.",
    m_six4: "Trong hợp âm 6/4, hãy gấp đôi bè trầm ($1).",
    m_aug: "$1: $2 → $3 là $4. Không cho phép quãng giai điệu tăng.",
    m_leap8: "$1: $2 → $3 nhảy hơn một quãng tám.",
    m_leap7: "$1: $2 → $3 nhảy quãng 7. Hãy tránh nhảy quãng 7.",
    m_par: "Song song $1 giữa $2 và $3 ($4).",
    m_con: "Ngược chiều $1 giữa $2 và $3: quãng đúng đi ngược chiều vẫn nghe như song song.",
    m_dir: "$1 ẩn ở hai bè ngoài: Soprano nhảy tới $2 cùng chiều với Bass.",
    m_une: "Quãng 5 không đều (giảm → đúng) giữa $1 và $2.",
    m_allUp: "Cả bốn bè cùng đi lên. Hãy cho ít nhất một bè đi ngược lại để các bè độc lập hơn.",
    m_allDown: "Cả bốn bè cùng đi xuống. Hãy cho ít nhất một bè đi ngược lại để các bè độc lập hơn.",
    m_ovBelow: "Chồng lấn: $1 đi tới $2, thấp hơn chỗ $3 vừa đứng ($4).",
    m_ovAbove: "Chồng lấn: $1 đi tới $2, cao hơn chỗ $3 vừa đứng ($4).",
    m_xrel: "Quan hệ chéo: $1 ở $2 → $3 ở $4. Hãy giữ biến đổi hóa trong cùng một bè ($5 → $6).",
    m_res7: "$1: nốt 7 của $2 ($3) cần giải xuống một bậc.",
    m_resLt: "$1: âm dẫn $2 cần đi lên $3.",
    m_resB6: "$1: nốt ♭6 của hợp âm $2 ($3) cần hạ nửa cung.",
    m_resS4: "$1: nốt ♯4 của hợp âm $2 ($3) cần lên nửa cung.",
  },
  zh: {
    howChords: "我如何理解你的和弦", rulesSum: "检查的规则",
    rulesErr: "<b>错误：</b>平行五度、八度和同度；不属于和弦的音；缺少根音、三音或七音；转位的低音不对；重复导音、七音、♭6 或 ♯4；声部交叉与重叠；S–A 或 A–T 相距超过八度，T–B 超过两个八度；增音程旋律进行；交叉关系（半音变化应留在同一声部）。",
    rulesWarn: "<b>警告：</b>反向五度/八度；外声部的隐伏五度/八度；进入低音的不等五度；省略五音却没有重复根音；六四和弦没有重复低音；七度或超过八度的跳进；未解决的七音、导音和增六和弦音；超出常用音域的音；小节拍数不对。",
    lvlError: "错误", lvlWarn: "警告", lvlNote: "提示",
    nothing: "还没有可检查的内容。", noRule: "✓ 没有违反规则",
    nErr: "$1 个错误", nWarn: "$1 个警告", pos: "第 $1 小节，第 $2 拍",
    cantChord: "无法识别", bassLbl: "低音",
    m_numeral: "无法识别“$1”：$2。",
    m_nonum: "在低音下方标上罗马数字，才能同时检查和弦。目前只检查声部进行。",
    m_cross: "声部交叉：$1（$2）低于$3（$4）。",
    m_space: "间距：$1和$2相距$3。请保持在$4以内。",
    m_range: "$1 超出$2的常用音域（$3）。",
    m_spell: "$1：在 $4（$5）中，$2 应写作 $3。",
    m_tone: "$1：$2 不在 $3（$4）中。",
    m_toneNb: "$1：$2 不在 $3（$4）中，而且它也不是经过音或邻音。",
    m_across: "$1：这个音跨过了小节线。请缩短，使每小节凑满 $2。",
    m_empty: "$1声部是空的。",
    m_stops: "$1声部在$2就结束了，早于其他声部。",
    m_lastbar: "最后一小节不完整（$2 拍中的 $1 拍）。",
    m_no5: "$1 省略了五音（$2）。只有在根音被重复时才可以。",
    m_miss: "$1 缺少$2（$3）。",
    m_bass: "$1 的低音需要 $2（$3），而不是 $4。",
    m_dbl: "不要在 $3 中重复$1（$2）。",
    m_six4: "六四和弦中，请重复低音（$1）。",
    m_aug: "$1：$2 → $3 是$4。不允许增音程的旋律进行。",
    m_leap8: "$1：$2 → $3 跳进超过一个八度。",
    m_leap7: "$1：$2 → $3 跳进七度。请避免七度跳进。",
    m_par: "$2和$3之间出现平行$1（$4）。",
    m_con: "$2和$3之间出现反向$1：反向进行的纯音程听起来仍像平行。",
    m_dir: "外声部出现隐伏$1：女高音与男低音同向跳进到$2。",
    m_une: "$1和$2之间出现不等五度（减五度 → 纯五度）。",
    m_allUp: "四个声部同时上行。请让至少一个声部反向进行，使各声部保持独立。",
    m_allDown: "四个声部同时下行。请让至少一个声部反向进行，使各声部保持独立。",
    m_ovBelow: "声部重叠：$1 移到 $2，低于$3刚才所在的位置（$4）。",
    m_ovAbove: "声部重叠：$1 移到 $2，高于$3刚才所在的位置（$4）。",
    m_xrel: "交叉关系：$2中的 $1 → $4中的 $3。请让半音变化留在同一声部（$5 → $6）。",
    m_res7: "$1：$2 的七音（$3）应级进下行解决。",
    m_resLt: "$1：导音 $2 应上行到 $3。",
    m_resB6: "$1：$2 的 ♭6（$3）应下行半音。",
    m_resS4: "$1：$2 的 ♯4（$3）应上行半音。",
  },
  th: {
    howChords: "ฉันอ่านคอร์ดของคุณอย่างไร", rulesSum: "กฎที่ตรวจ",
    rulesErr: "<b>ข้อผิดพลาด:</b> คู่ห้า คู่แปด และยูนิซันขนาน; โน้ตที่ไม่อยู่ในคอร์ด; ขาดรูท โน้ตตัวที่ 3 หรือ 7; โน้ตเบสผิดสำหรับการกลับคอร์ด; ซ้ำโน้ตลีดดิ้ง โน้ตตัวที่ 7 ♭6 หรือ ♯4; แนวเสียงไขว้และซ้อนทับ; S–A หรือ A–T ห่างเกินหนึ่งคู่แปด T–B เกินสองคู่แปด; ช่วงทำนองแบบเพิ่ม; ความสัมพันธ์ข้าม (การเปลี่ยนโครมาติกควรอยู่ในแนวเดียว)",
    rulesWarn: "<b>คำเตือน:</b> คู่ห้า/คู่แปดสวนทาง; คู่ห้า/คู่แปดแอบแฝงในแนวนอก; คู่ห้าไม่เท่ากันเข้าสู่เบส; ละโน้ตตัวที่ 5 โดยไม่ซ้ำรูท; คอร์ด 6/4 ที่ไม่ซ้ำเบส; การกระโดดคู่เจ็ดหรือเกินหนึ่งคู่แปด; โน้ตตัวที่ 7 ลีดดิ้ง และโน้ตออคเมนเต็ดซิกซ์ที่ยังไม่คลี่คลาย; โน้ตนอกช่วงเสียงปกติ; ห้องที่จำนวนจังหวะไม่ครบ",
    lvlError: "ผิดพลาด", lvlWarn: "คำเตือน", lvlNote: "หมายเหตุ",
    nothing: "ยังไม่มีอะไรให้ตรวจ", noRule: "✓ ไม่ผิดกฎข้อใด",
    nErr: "ผิดพลาด $1 จุด", nWarn: "คำเตือน $1 จุด", pos: "ห้อง $1 จังหวะ $2",
    cantChord: "อ่านไม่ได้", bassLbl: "เบส",
    m_numeral: "อ่าน \"$1\" ไม่ได้: $2",
    m_nonum: "ใส่เลขโรมันใต้แนวเบสเพื่อให้ตรวจคอร์ดด้วย ตอนนี้ตรวจเฉพาะการเคลื่อนที่ของแนวเสียง",
    m_cross: "แนวเสียงไขว้: $1 ($2) อยู่ต่ำกว่า $3 ($4)",
    m_space: "ระยะห่าง: $1 และ $2 ห่างกัน $3 ควรอยู่ภายใน$4",
    m_range: "$1 อยู่นอกช่วงเสียงปกติของ$2 ($3)",
    m_spell: "$1: $2 ควรเขียนเป็น $3 ใน $4 ($5)",
    m_tone: "$1: $2 ไม่อยู่ใน $3 ($4)",
    m_toneNb: "$1: $2 ไม่อยู่ใน $3 ($4) และไม่ใช่โน้ตผ่านหรือโน้ตข้างเคียง",
    m_across: "$1: โน้ตนี้ข้ามเส้นกั้นห้อง ควรทำให้สั้นลงเพื่อให้แต่ละห้องครบ $2",
    m_empty: "แนว$1ว่างเปล่า",
    m_stops: "แนว$1จบที่$2 ก่อนแนวอื่น",
    m_lastbar: "ห้องสุดท้ายไม่ครบ ($1 จาก $2 จังหวะ)",
    m_no5: "$1 ละโน้ตตัวที่ 5 ($2) ทำได้ต่อเมื่อซ้ำรูทเท่านั้น",
    m_miss: "$1 ขาด$2 ($3)",
    m_bass: "$1 ต้องการ $2 ($3) ในเบส ไม่ใช่ $4",
    m_dbl: "อย่าซ้ำ$1 ($2) ใน $3",
    m_six4: "ในคอร์ด 6/4 ให้ซ้ำโน้ตเบส ($1)",
    m_aug: "$1: $2 → $3 เป็น$4 ไม่อนุญาตให้ใช้ช่วงทำนองแบบเพิ่ม",
    m_leap8: "$1: $2 → $3 กระโดดเกินหนึ่งคู่แปด",
    m_leap7: "$1: $2 → $3 กระโดดคู่เจ็ด ควรหลีกเลี่ยงการกระโดดคู่เจ็ด",
    m_par: "$1ขนานระหว่าง$2และ$3 ($4)",
    m_con: "$1สวนทางระหว่าง$2และ$3: ช่วงเพอร์เฟกต์ที่เคลื่อนสวนทางก็ยังฟังเหมือนขนาน",
    m_dir: "$1แอบแฝงในแนวนอก: โซปราโนกระโดดเข้าสู่$2ในทิศทางเดียวกับเบส",
    m_une: "คู่ห้าไม่เท่ากัน (ดิมินิช → เพอร์เฟกต์) ระหว่าง$1และ$2",
    m_allUp: "ทั้งสี่แนวเคลื่อนขึ้นพร้อมกัน ควรให้อย่างน้อยหนึ่งแนวเคลื่อนไปทางตรงข้ามเพื่อให้แต่ละแนวเป็นอิสระ",
    m_allDown: "ทั้งสี่แนวเคลื่อนลงพร้อมกัน ควรให้อย่างน้อยหนึ่งแนวเคลื่อนไปทางตรงข้ามเพื่อให้แต่ละแนวเป็นอิสระ",
    m_ovBelow: "ซ้อนทับ: $1 ไป $2 ต่ำกว่าตำแหน่งที่$3เพิ่งอยู่ ($4)",
    m_ovAbove: "ซ้อนทับ: $1 ไป $2 สูงกว่าตำแหน่งที่$3เพิ่งอยู่ ($4)",
    m_xrel: "ความสัมพันธ์ข้าม: $1 ใน$2 → $3 ใน$4 ควรให้การเปลี่ยนโครมาติกอยู่ในแนวเดียวกัน ($5 → $6)",
    m_res7: "$1: $3 ซึ่งเป็นโน้ตตัวที่ 7 ของ $2 ควรคลี่คลายลงทีละขั้น",
    m_resLt: "$1: โน้ตลีดดิ้ง $2 ควรขึ้นไป $3",
    m_resB6: "$1: ♭6 ของ$2 ($3) ควรลงครึ่งเสียง",
    m_resS4: "$1: ♯4 ของ$2 ($3) ควรขึ้นครึ่งเสียง",
  },
  fr: {
    howChords: "Comment je lis vos accords", rulesSum: "Règles vérifiées",
    rulesErr: "<b>Erreurs :</b> quintes, octaves et unissons parallèles ; notes absentes de l'accord ; fondamentale, tierce ou septième manquante ; mauvaise basse pour le renversement ; sensible, septième, ♭6 ou ♯4 doublés ; croisement et chevauchement des voix ; S–A ou A–T à plus d'une octave, T–B à plus de deux octaves ; intervalles mélodiques augmentés ; fausses relations (un changement chromatique doit rester dans la même voix).",
    rulesWarn: "<b>Avertissements :</b> quintes/octaves par mouvement contraire ; quintes/octaves cachées aux voix extrêmes ; quintes inégales vers la basse ; quinte omise sans fondamentale doublée ; accords de 6/4 sans basse doublée ; sauts de septième ou de plus d'une octave ; septièmes, sensibles et notes de sixte augmentée non résolues ; notes hors de l'ambitus habituel ; mesures qui ne tombent pas juste.",
    lvlError: "Erreur", lvlWarn: "Avertissement", lvlNote: "Note",
    nothing: "Rien à vérifier pour l'instant.", noRule: "✓ Aucune règle enfreinte",
    nErr: "$1 erreur(s)", nWarn: "$1 avertissement(s)", pos: "mesure $1, temps $2",
    cantChord: "illisible", bassLbl: "basse",
    m_numeral: "Impossible de lire « $1 » : $2.",
    m_nonum: "Ajoutez des chiffrages romains sous la basse pour vérifier aussi les accords. Pour l'instant seule la conduite des voix est vérifiée.",
    m_cross: "Croisement de voix : $1 ($2) est sous $3 ($4).",
    m_space: "Espacement : $1 et $2 sont à $3 l'une de l'autre. Restez dans $4.",
    m_range: "$1 est hors de l'ambitus habituel de $2 ($3).",
    m_spell: "$1 : $2 devrait s'écrire $3 dans $4 ($5).",
    m_tone: "$1 : $2 n'est pas dans $3 ($4).",
    m_toneNb: "$1 : $2 n'est pas dans $3 ($4), et ce n'est ni une note de passage ni une broderie.",
    m_across: "$1 : cette note passe la barre de mesure. Raccourcissez-la pour que chaque mesure fasse $2.",
    m_empty: "La voix de $1 est vide.",
    m_stops: "La voix de $1 s'arrête à $2, avant les autres voix.",
    m_lastbar: "La dernière mesure est incomplète ($1 temps sur $2).",
    m_no5: "$1 omet la quinte ($2). Acceptable seulement si la fondamentale est doublée.",
    m_miss: "$1 : il manque $2 ($3).",
    m_bass: "$1 demande $2 ($3) à la basse, et non $4.",
    m_dbl: "Ne doublez pas $1 ($2) dans $3.",
    m_six4: "Dans un accord de 6/4, doublez la basse ($1).",
    m_aug: "$1 : $2 → $3 est une $4. Les intervalles mélodiques augmentés sont interdits.",
    m_leap8: "$1 : $2 → $3 saute de plus d'une octave.",
    m_leap7: "$1 : $2 → $3 saute d'une septième. Évitez les sauts de septième.",
    m_par: "$1 parallèles entre $2 et $3 ($4).",
    m_con: "$1 par mouvement contraire entre $2 et $3 : des intervalles justes en mouvement contraire sonnent encore comme des parallèles.",
    m_dir: "$1 cachées aux voix extrêmes : le soprano saute vers $2 en mouvement semblable avec la basse.",
    m_une: "Quintes inégales (diminuée → juste) entre $1 et $2.",
    m_allUp: "Les quatre voix montent ensemble. Faites aller au moins une voix en sens inverse pour garder des lignes indépendantes.",
    m_allDown: "Les quatre voix descendent ensemble. Faites aller au moins une voix en sens inverse pour garder des lignes indépendantes.",
    m_ovBelow: "Chevauchement : $1 va à $2, sous la position qu'avait $3 ($4).",
    m_ovAbove: "Chevauchement : $1 va à $2, au-dessus de la position qu'avait $3 ($4).",
    m_xrel: "Fausse relation : $1 à $2 → $3 à $4. Gardez le changement chromatique dans la même voix ($5 → $6).",
    m_res7: "$1 : la septième de $2 ($3) doit descendre par degré conjoint.",
    m_resLt: "$1 : la sensible $2 doit monter vers $3.",
    m_resB6: "$1 : le ♭6 de $2 ($3) doit descendre d'un demi-ton.",
    m_resS4: "$1 : le ♯4 de $2 ($3) doit monter d'un demi-ton.",
  },
  es: {
    howChords: "Cómo leo tus acordes", rulesSum: "Reglas comprobadas",
    rulesErr: "<b>Errores:</b> quintas, octavas y unísonos paralelos; notas que no están en el acorde; falta la fundamental, la 3.ª o la 7.ª; bajo equivocado para la inversión; sensible, 7.ª, ♭6 o ♯4 duplicados; cruce y superposición de voces; S–A o A–T a más de una octava, T–B a más de dos octavas; intervalos melódicos aumentados; falsas relaciones (un cambio cromático debe quedarse en la misma voz).",
    rulesWarn: "<b>Avisos:</b> quintas/octavas por movimiento contrario; quintas/octavas directas en las voces extremas; quintas desiguales hacia el bajo; quinta omitida sin fundamental duplicada; acordes de 6/4 sin el bajo duplicado; saltos de 7.ª o de más de una octava; 7.ªs, sensibles y notas de sexta aumentada sin resolver; notas fuera del registro habitual; compases que no suman.",
    lvlError: "Error", lvlWarn: "Aviso", lvlNote: "Nota",
    nothing: "Aún no hay nada que revisar.", noRule: "✓ Ninguna regla rota",
    nErr: "$1 error(es)", nWarn: "$1 aviso(s)", pos: "compás $1, tiempo $2",
    cantChord: "no se puede leer", bassLbl: "bajo",
    m_numeral: "No puedo leer \"$1\": $2.",
    m_nonum: "Añade números romanos bajo el bajo para revisar también los acordes. Por ahora solo se revisa la conducción de voces.",
    m_cross: "Cruce de voces: $1 ($2) está por debajo de $3 ($4).",
    m_space: "Espaciado: $1 y $2 están a $3 de distancia. Manténlas dentro de $4.",
    m_range: "$1 está fuera del registro habitual de $2 ($3).",
    m_spell: "$1: $2 debería escribirse $3 en $4 ($5).",
    m_tone: "$1: $2 no está en $3 ($4).",
    m_toneNb: "$1: $2 no está en $3 ($4), y tampoco es una nota de paso ni una bordadura.",
    m_across: "$1: esta nota cruza la línea divisoria. Acórtala para que cada compás sume $2.",
    m_empty: "La voz de $1 está vacía.",
    m_stops: "La voz de $1 termina en $2, antes que las demás.",
    m_lastbar: "El último compás está incompleto ($1 de $2 tiempos).",
    m_no5: "$1 omite la quinta ($2). Solo se admite si la fundamental está duplicada.",
    m_miss: "A $1 le falta $2 ($3).",
    m_bass: "$1 necesita $2 ($3) en el bajo, no $4.",
    m_dbl: "No dupliques $1 ($2) en $3.",
    m_six4: "En un acorde de 6/4, duplica el bajo ($1).",
    m_aug: "$1: $2 → $3 es una $4. No se permiten intervalos melódicos aumentados.",
    m_leap8: "$1: $2 → $3 salta más de una octava.",
    m_leap7: "$1: $2 → $3 salta una 7.ª. Evita los saltos de 7.ª.",
    m_par: "$1 paralelas entre $2 y $3 ($4).",
    m_con: "$1 por movimiento contrario entre $2 y $3: los intervalos justos en movimiento contrario siguen sonando paralelos.",
    m_dir: "$1 directas en las voces extremas: el soprano salta a $2 en movimiento directo con el bajo.",
    m_une: "Quintas desiguales (disminuida → justa) entre $1 y $2.",
    m_allUp: "Las cuatro voces suben juntas. Haz que al menos una voz vaya en sentido contrario para mantener líneas independientes.",
    m_allDown: "Las cuatro voces bajan juntas. Haz que al menos una voz vaya en sentido contrario para mantener líneas independientes.",
    m_ovBelow: "Superposición: $1 va a $2, por debajo de donde estaba $3 ($4).",
    m_ovAbove: "Superposición: $1 va a $2, por encima de donde estaba $3 ($4).",
    m_xrel: "Falsa relación: $1 en $2 → $3 en $4. Mantén el cambio cromático en la misma voz ($5 → $6).",
    m_res7: "$1: la 7.ª de $2 ($3) debe resolver bajando por grado conjunto.",
    m_resLt: "$1: la sensible $2 debe subir a $3.",
    m_resB6: "$1: el ♭6 de $2 ($3) debe bajar un semitono.",
    m_resS4: "$1: el ♯4 de $2 ($3) debe subir un semitono.",
  },
  ru: {
    howChords: "Как я читаю ваши аккорды", rulesSum: "Проверяемые правила",
    rulesErr: "<b>Ошибки:</b> параллельные квинты, октавы и примы; ноты не из аккорда; нет основного тона, терции или септимы; неверный бас для обращения; удвоенные вводный тон, септима, ♭6 или ♯4; перекрещивание и перекрытие голосов; S–A или A–T шире октавы, T–B шире двух октав; увеличенные мелодические интервалы; перекрёстные отношения (хроматическое изменение должно остаться в одном голосе).",
    rulesWarn: "<b>Предупреждения:</b> квинты/октавы в противоположном движении; скрытые квинты/октавы в крайних голосах; неравные квинты в бас; пропущенная квинта без удвоенного основного тона; секстаккорды-квартсекстаккорды 6/4 без удвоенного баса; скачки на септиму или больше октавы; неразрешённые септимы, вводные тоны и звуки увеличенной сексты; ноты вне привычного диапазона; такты с неверной суммой долей.",
    lvlError: "Ошибка", lvlWarn: "Предупреждение", lvlNote: "Заметка",
    nothing: "Пока нечего проверять.", noRule: "✓ Ни одно правило не нарушено",
    nErr: "Ошибок: $1", nWarn: "Предупреждений: $1", pos: "такт $1, доля $2",
    cantChord: "не удаётся прочитать", bassLbl: "бас",
    m_numeral: "Не удаётся прочитать «$1»: $2.",
    m_nonum: "Добавьте римские цифры под басом, чтобы проверять и аккорды. Сейчас проверяется только голосоведение.",
    m_cross: "Перекрещивание голосов: $1 ($2) ниже, чем $3 ($4).",
    m_space: "Расположение: интервал между голосами $1 и $2 — $3. Держите их в пределах $4.",
    m_range: "$1 вне привычного диапазона: $2 ($3).",
    m_spell: "$1: $2 следует записать как $3 в $4 ($5).",
    m_tone: "$1: $2 не входит в $3 ($4).",
    m_toneNb: "$1: $2 не входит в $3 ($4) и не является проходящим или вспомогательным звуком.",
    m_across: "$1: эта нота переходит через тактовую черту. Сократите её, чтобы каждый такт давал $2.",
    m_empty: "Голос «$1» пуст.",
    m_stops: "Голос «$1» заканчивается на $2, раньше остальных.",
    m_lastbar: "Последний такт неполный ($1 из $2 долей).",
    m_no5: "В $1 пропущена квинта ($2). Допустимо, только если удвоен основной тон.",
    m_miss: "В $1 не хватает: $2 ($3).",
    m_bass: "$1 требует в басу $2 ($3), а не $4.",
    m_dbl: "Не удваивайте $1 ($2) в $3.",
    m_six4: "В аккорде 6/4 удвойте бас ($1).",
    m_aug: "$1: $2 → $3 — это $4. Увеличенные мелодические интервалы недопустимы.",
    m_leap8: "$1: $2 → $3 — скачок больше октавы.",
    m_leap7: "$1: $2 → $3 — скачок на септиму. Избегайте скачков на септиму.",
    m_par: "Параллельные $1 между голосами $2 и $3 ($4).",
    m_con: "$1 в противоположном движении между голосами $2 и $3: чистые интервалы в противоположном движении всё равно звучат как параллельные.",
    m_dir: "Скрытые $1 в крайних голосах: сопрано скачком идёт к $2 в прямом движении с басом.",
    m_une: "Неравные квинты (уменьшённая → чистая) между голосами $1 и $2.",
    m_allUp: "Все четыре голоса идут вверх вместе. Пусть хотя бы один голос идёт в обратную сторону, чтобы линии были независимыми.",
    m_allDown: "Все четыре голоса идут вниз вместе. Пусть хотя бы один голос идёт в обратную сторону, чтобы линии были независимыми.",
    m_ovBelow: "Перекрытие: $1 идёт к $2, ниже того места, где только что был $3 ($4).",
    m_ovAbove: "Перекрытие: $1 идёт к $2, выше того места, где только что был $3 ($4).",
    m_xrel: "Перекрёстное отношение: $1 в голосе «$2» → $3 в голосе «$4». Оставьте хроматическое изменение в одном голосе ($5 → $6).",
    m_res7: "$1: септима аккорда $2 ($3) должна разрешиться вниз на ступень.",
    m_resLt: "$1: вводный тон $2 должен идти вверх к $3.",
    m_resB6: "$1: ♭6 аккорда $2 ($3) должна идти вниз на полтона.",
    m_resS4: "$1: ♯4 аккорда $2 ($3) должна идти вверх на полтона.",
  },
};
Object.keys(I18N_RESULTS).forEach(l => Object.assign(I18N[l], I18N_RESULTS[l]));

// Words that appear inside the English messages. Intervals are put together
// from a quality and a number: iv.fmt says in which order.
const I18N_WORDS = {
  vi: {
    Soprano: "Soprano", Alto: "Alto", Tenor: "Tenor", Bass: "Bass", "Every part": "Mọi bè",
    root: "âm gốc", "2nd": "âm 2", "3rd": "âm 3", "5th": "âm 5", "7th": "âm 7",
    "5ths": "quãng 5 đúng", octaves: "quãng 8 đúng", unisons: "quãng đồng âm",
    "an octave": "một quãng tám", "two octaves": "hai quãng tám",
    "the leading tone": "âm dẫn", "the 7th": "âm 7", "the ♭6": "nốt ♭6", "the ♯4": "nốt ♯4",
    iv: { fmt: "quãng $n $q", nth: "$n",
      q: { perfect: "đúng", major: "trưởng", minor: "thứ", augmented: "tăng", diminished: "giảm", "doubly augmented": "tăng đôi", "doubly diminished": "giảm đôi" },
      n: ["đồng âm", "2", "3", "4", "5", "6", "7", "8"] },
  },
  zh: {
    Soprano: "女高音", Alto: "女低音", Tenor: "男高音", Bass: "男低音", "Every part": "所有声部",
    root: "根音", "2nd": "二音", "3rd": "三音", "5th": "五音", "7th": "七音",
    "5ths": "五度", octaves: "八度", unisons: "同度",
    "an octave": "一个八度", "two octaves": "两个八度",
    "the leading tone": "导音", "the 7th": "七音", "the ♭6": "♭6", "the ♯4": "♯4",
    iv: { fmt: "$q$n", nth: "$n度",
      q: { perfect: "纯", major: "大", minor: "小", augmented: "增", diminished: "减", "doubly augmented": "倍增", "doubly diminished": "倍减" },
      n: ["同度", "二度", "三度", "四度", "五度", "六度", "七度", "八度"] },
  },
  th: {
    Soprano: "โซปราโน", Alto: "อัลโต", Tenor: "เทเนอร์", Bass: "เบส", "Every part": "ทุกแนว",
    root: "รูท", "2nd": "โน้ตตัวที่ 2", "3rd": "โน้ตตัวที่ 3", "5th": "โน้ตตัวที่ 5", "7th": "โน้ตตัวที่ 7",
    "5ths": "คู่ห้า", octaves: "คู่แปด", unisons: "ยูนิซัน",
    "an octave": "หนึ่งคู่แปด", "two octaves": "สองคู่แปด",
    "the leading tone": "โน้ตลีดดิ้ง", "the 7th": "โน้ตตัวที่ 7", "the ♭6": "♭6", "the ♯4": "♯4",
    iv: { fmt: "คู่$n$q", nth: "$n",
      q: { perfect: "เพอร์เฟกต์", major: "เมเจอร์", minor: "ไมเนอร์", augmented: "ออคเมนเต็ด", diminished: "ดิมินิช", "doubly augmented": "ดับเบิลออคเมนเต็ด", "doubly diminished": "ดับเบิลดิมินิช" },
      n: ["ยูนิซัน", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด"] },
  },
  fr: {
    Soprano: "soprano", Alto: "alto", Tenor: "ténor", Bass: "basse", "Every part": "Toutes les voix",
    root: "la fondamentale", "2nd": "la seconde", "3rd": "la tierce", "5th": "la quinte", "7th": "la septième",
    "5ths": "Quintes", octaves: "Octaves", unisons: "Unissons",
    "an octave": "une octave", "two octaves": "deux octaves",
    "the leading tone": "la sensible", "the 7th": "la septième", "the ♭6": "le ♭6", "the ♯4": "le ♯4",
    iv: { fmt: "$n $q", nth: "$ne",
      q: { perfect: "juste", major: "majeure", minor: "mineure", augmented: "augmentée", diminished: "diminuée", "doubly augmented": "doublement augmentée", "doubly diminished": "doublement diminuée" },
      n: ["unisson", "seconde", "tierce", "quarte", "quinte", "sixte", "septième", "octave"] },
  },
  es: {
    Soprano: "soprano", Alto: "contralto", Tenor: "tenor", Bass: "bajo", "Every part": "Todas las voces",
    root: "la fundamental", "2nd": "la 2.ª", "3rd": "la 3.ª", "5th": "la 5.ª", "7th": "la 7.ª",
    "5ths": "Quintas", octaves: "Octavas", unisons: "Unísonos",
    "an octave": "una octava", "two octaves": "dos octavas",
    "the leading tone": "la sensible", "the 7th": "la 7.ª", "the ♭6": "el ♭6", "the ♯4": "el ♯4",
    iv: { fmt: "$n $q", nth: "$n.ª",
      q: { perfect: "justa", major: "mayor", minor: "menor", augmented: "aumentada", diminished: "disminuida", "doubly augmented": "doblemente aumentada", "doubly diminished": "doblemente disminuida" },
      n: ["unísono", "2.ª", "3.ª", "4.ª", "5.ª", "6.ª", "7.ª", "octava"] },
  },
  ru: {
    Soprano: "сопрано", Alto: "альт", Tenor: "тенор", Bass: "бас", "Every part": "Все голоса",
    root: "основной тон", "2nd": "секунда", "3rd": "терция", "5th": "квинта", "7th": "септима",
    "5ths": "квинты", octaves: "октавы", unisons: "примы",
    "an octave": "октавы", "two octaves": "двух октав",
    "the leading tone": "вводный тон", "the 7th": "септиму", "the ♭6": "♭6", "the ♯4": "♯4",
    iv: { fmt: "$q $n", nth: "$n-я",
      q: { perfect: "чистая", major: "большая", minor: "малая", augmented: "увеличенная", diminished: "уменьшённая", "doubly augmented": "дважды увеличенная", "doubly diminished": "дважды уменьшённая" },
      n: ["прима", "секунда", "терция", "кварта", "квинта", "секста", "септима", "октава"] },
  },
};

// English message patterns, in the order they're tried, and the template key for each.
const MSG_PATTERNS = [
  [/^Can't read "(.*)": (.*)\.$/, "numeral"],
  [/^Add Roman numerals under the bass to check the chords too\. For now only voice leading is checked\.$/, "nonum"],
  [/^Voice crossing: the (\w+) \((\S+)\) is below the (\w+) \((\S+)\)\.$/, "cross"],
  [/^Spacing: (\w+) and (\w+) are (.+) apart\. Keep them within (an octave|two octaves)\.$/, "space"],
  [/^(\S+) is outside the usual (\w+) range \((.+)\)\.$/, "range"],
  [/^(\w+): (\S+) should be spelled (\S+) in (\S+) \((.*)\)\.$/, "spell"],
  [/^(\w+): (\S+) isn't in (\S+) \((.*)\), and it isn't a passing or neighbour tone\.$/, "toneNb"],
  [/^(\w+): (\S+) isn't in (\S+) \((.*)\)\.$/, "tone"],
  [/^(.+): this runs across the bar line\. Shorten it so each bar adds up to (\d+\/\d+)\.$/, "across"],
  [/^The (\w+) part is empty\.$/, "empty"],
  [/^The (\w+) part stops at (bar .+, beat [\d.]+), before the other parts\.$/, "stops"],
  [/^The last bar is incomplete \((.+) of (\d+) beats\)\.$/, "lastbar"],
  [/^(\S+) leaves out the 5th \((\S+)\)\. That's fine only when the root is doubled\.$/, "no5"],
  [/^(\S+) is missing its (\S+) \((\S+)\)\.$/, "miss"],
  [/^(\S+) needs (\S+) \(the (\S+)\) in the bass, not (\S+)\.$/, "bass"],
  [/^Don't double (the .+) \((\S+)\) in (\S+)\.$/, "dbl"],
  [/^In a 6\/4 chord, double the bass \((\S+)\)\.$/, "six4"],
  [/^(\w+): (\S+) → (\S+) is an (.+)\. Augmented melodic intervals aren't allowed\.$/, "aug"],
  [/^(\w+): (\S+) → (\S+) leaps more than an octave\.$/, "leap8"],
  [/^(\w+): (\S+) → (\S+) leaps a 7th\. Avoid 7th leaps\.$/, "leap7"],
  [/^Parallel (\S+) between the (\w+) and (\w+) \((.+)\)\.$/, "par"],
  [/^Contrary (\S+) between the (\w+) and (\w+): perfect intervals in contrary motion still sound parallel\.$/, "con"],
  [/^Direct \(hidden\) (\S+) in the outer voices: the Soprano leaps into a (perfect \S+) in similar motion with the Bass\.$/, "dir"],
  [/^Unequal 5ths \(diminished → perfect\) between the (\w+) and (\w+)\.$/, "une"],
  [/^All four parts move up together\. Move at least one part the other way for independent lines\.$/, "allUp"],
  [/^All four parts move down together\. Move at least one part the other way for independent lines\.$/, "allDown"],
  [/^Overlap: the (\w+) moves to (\S+), below where the (\w+) just was \((\S+)\)\.$/, "ovBelow"],
  [/^Overlap: the (\w+) moves to (\S+), above where the (\w+) just was \((\S+)\)\.$/, "ovAbove"],
  [/^Cross relation: (\S+) in the (\w+) → (\S+) in the (\w+)\. Keep a chromatic change in the same voice \((\S+) → (\S+)\)\.$/, "xrel"],
  [/^(\w+): the 7th of (\S+) \((\S+)\) should resolve down by step\.$/, "res7"],
  [/^(\w+): the leading tone (\S+) should rise to (\S+)\.$/, "resLt"],
  [/^(\w+): the ♭6 of the (.+) \((\S+)\) should fall a half step\.$/, "resB6"],
  [/^(\w+): the ♯4 of the (.+) \((\S+)\) should rise a half step\.$/, "resS4"],
];

// Translate one captured piece of a message: a voice, a role, an interval…
// Note names and chord names are left as they are.
function trWord(s, lang) {
  const W = I18N_WORDS[lang];
  if (W[s] !== undefined) return W[s];
  const iv = /^(doubly augmented|doubly diminished|perfect|major|minor|augmented|diminished) (\S+)$/.exec(s);
  if (iv) {
    const steps = ["unison", "2nd", "3rd", "4th", "5th", "6th", "7th", "octave"].indexOf(iv[2]);
    const n = steps >= 0 ? W.iv.n[steps] : W.iv.nth.replace("$n", parseInt(iv[2], 10));
    return W.iv.fmt.replace("$q", W.iv.q[iv[1]]).replace("$n", n);
  }
  return s.replace(/the (Soprano|Alto|Tenor|Bass)/g, (_m, v) => W[v]).replace(/^Every part$/, W["Every part"]);
}

// "bar 2, beat 3" in the chosen language.
function trPos(text) {
  const lang = document.documentElement.lang, m = /^bar (\d+), beat (.+)$/.exec(text);
  if (lang === "en" || !I18N[lang] || !m) return text;
  return I18N[lang].pos.replace("$1", m[1]).replace("$2", m[2]);
}

// A checker message in the chosen language; English, or anything not
// recognised, is shown as written.
function trMsg(msg) {
  const lang = document.documentElement.lang;
  if (lang === "en" || !I18N[lang]) return msg;
  for (const [re, key] of MSG_PATTERNS) {
    const m = re.exec(msg);
    if (!m) continue;
    const text = I18N[lang]["m_" + key].replace(/\$(\d)/g, (_x, i) => {
      const part = m[+i];
      return key === "stops" && i === "2" ? trPos(part) : key === "numeral" && i === "2" ? part : trWord(part, lang);
    });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  return msg;
}

// The English text is whatever the page already says; remember it before translating.
function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
    const text = lang !== "en" && I18N[lang] && I18N[lang][el.dataset.i18n];
    el.innerHTML = text || el.dataset.en;
  });
  // The results are built in code, so redraw them in the new language.
  if (typeof refreshResults === "function") refreshResults();
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
