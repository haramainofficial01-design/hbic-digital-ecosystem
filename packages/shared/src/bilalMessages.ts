import type { LanguageCode } from "./types";

const messages = {
  private: [
    "I can help with public information, but I can’t view or change personal accounts, payments, attendance or enrollment. Please use your secure Quran Academy account, or contact the office. Don’t enter personal or payment details here.",
    "میں عوامی معلومات میں مدد کر سکتا ہوں، لیکن ذاتی اکاؤنٹس، ادائیگی، حاضری یا داخلے کی تفصیلات دیکھ یا بدل نہیں سکتا۔ اپنا محفوظ قرآن اکیڈمی اکاؤنٹ استعمال کریں یا دفتر سے رابطہ کریں۔ یہاں ذاتی یا ادائیگی کی تفصیلات درج نہ کریں۔",
    "من در یافتن معلومات عمومی کمک می‌کنم، اما حساب شخصی، پرداخت، حاضری یا ثبت‌نام را دیده یا تغییر داده نمی‌توانم. از حساب مصون اکادمی قرآن خود استفاده کنید یا با دفتر تماس بگیرید. جزئیات شخصی یا پرداخت را اینجا وارد نکنید.",
    "يمكنني المساعدة بالمعلومات العامة، لكن لا يمكنني عرض الحسابات الشخصية أو المدفوعات أو الحضور أو التسجيل أو تعديلها. استخدم حسابك الآمن في أكاديمية القرآن أو تواصل مع المكتب. لا تدخل بيانات شخصية أو بيانات دفع هنا."
  ],
  religious: [
    "Please ask a qualified teacher or contact the masjid team for a religious ruling, recitation assessment or Zakat eligibility question. I’m an information assistant, not an imam or a religious authority.",
    "دینی حکم، تلاوت کی جانچ یا زکوٰۃ کے مستحقین کے بارے میں کسی مستند استاد سے پوچھیں یا مسجد کی ٹیم سے رابطہ کریں۔ میں معلوماتی معاون ہوں، امام یا دینی مرجع نہیں۔",
    "برای حکم دینی، ارزیابی تلاوت یا پرسش درباره مستحقان زکات، از استاد واجد صلاحیت بپرسید یا با مسئولان مسجد تماس بگیرید. من راهنمای معلومات هستم، نه امام یا مرجع دینی.",
    "اسأل معلّمًا مؤهّلًا أو تواصل مع فريق المسجد بشأن الفتاوى أو تقييم التلاوة أو استحقاق الزكاة. أنا مساعد للمعلومات، ولست إمامًا أو مرجعًا دينيًا."
  ],
  political: [
    "I help with published Masjid Bilal services and app information. I don’t recommend political parties, candidates or referendum choices. Please consult the relevant official election authority for voting information.",
    "میں مسجد بلال کی شائع شدہ خدمات اور ایپ کی معلومات میں مدد کرتا ہوں۔ سیاسی جماعتوں، امیدواروں یا ریفرنڈم میں کسی انتخاب کی سفارش نہیں کرتا۔ ووٹنگ کی معلومات کے لیے متعلقہ سرکاری انتخابی ادارے سے رجوع کریں۔",
    "من درباره خدمات نشرشده مسجد بلال و معلومات اپلیکیشن کمک می‌کنم. حزب، نامزد یا گزینه همه‌پرسی را توصیه نمی‌کنم. برای معلومات رأی‌دهی به مرجع رسمی انتخابات مراجعه کنید.",
    "أساعد في العثور على خدمات مسجد بلال المنشورة ومعلومات التطبيق. لا أوصي بأحزاب أو مرشّحين أو خيارات استفتاء. راجع الجهة الانتخابية الرسمية المختصّة للحصول على معلومات التصويت."
  ],
  unavailable: [
    "I can’t verify the latest published information right now. Please try again shortly or contact the masjid. I won’t guess prayer times, fees or schedules.",
    "اس وقت تازہ شائع شدہ معلومات کی تصدیق نہیں ہو سکتی۔ کچھ دیر بعد کوشش کریں یا مسجد سے رابطہ کریں۔ میں اوقاتِ نماز، فیس یا شیڈول کا اندازہ نہیں لگاؤں گا۔",
    "اکنون تازه‌ترین معلومات نشرشده را تأیید کرده نمی‌توانم. کمی بعد دوباره کوشش کنید یا با مسجد تماس بگیرید. اوقات نماز، فیس یا برنامه را حدس نمی‌زنم.",
    "لا أستطيع التحقق من أحدث المعلومات المنشورة الآن. حاول بعد قليل أو تواصل مع المسجد. لن أخمّن مواقيت الصلاة أو الرسوم أو المواعيد."
  ],
  date: [
    "I only quote a prayer timetable verified for its stated Calgary date. I can’t infer another day’s adhan or iqamah from today’s schedule. Check the live Prayer Times page or contact the office for that date.",
    "میں صرف کیلگری کی درج شدہ تاریخ کے تصدیق شدہ اوقات بتاتا ہوں۔ آج کے شیڈول سے کسی اور دن کی اذان یا اقامت اخذ نہیں کر سکتا۔ مطلوبہ تاریخ کے لیے اوقاتِ نماز کا صفحہ دیکھیں یا دفتر سے رابطہ کریں۔",
    "من فقط جدول تأییدشده نماز را برای تاریخ درج‌شده به وقت کلگری نقل می‌کنم. از جدول امروز، اذان یا اقامت روز دیگر را حدس زده نمی‌توانم. صفحه زنده اوقات نماز را ببینید یا برای آن تاریخ با دفتر تماس بگیرید.",
    "أنقل فقط جدول الصلاة المتحقق منه لتاريخه المحدد في كالغاري. لا أستنتج أذان يوم آخر أو إقامته من جدول اليوم. راجع صفحة مواقيت الصلاة المباشرة أو تواصل مع المكتب بشأن ذلك التاريخ."
  ],
  unknown: [
    "I couldn’t find a verified answer in HBIC’s published information. The office can confirm that detail. You can also ask me about prayer times, Quran Academy, donations, programs or using the app.",
    "HBIC کی شائع شدہ معلومات میں تصدیق شدہ جواب نہیں ملا۔ دفتر اس بات کی تصدیق کر سکتا ہے۔ آپ اوقاتِ نماز، قرآن اکیڈمی، عطیات، پروگراموں یا ایپ کے استعمال کے بارے میں بھی پوچھ سکتے ہیں۔",
    "در معلومات نشرشده HBIC پاسخ تأییدشده‌ای نیافتم. دفتر می‌تواند این موضوع را تأیید کند. درباره اوقات نماز، اکادمی قرآن، کمک‌های مالی، برنامه‌ها یا استفاده از اپلیکیشن نیز پرسیده می‌توانید.",
    "لم أجد إجابة موثّقة في المعلومات المنشورة من HBIC. يمكن للمكتب تأكيد هذا التفصيل. يمكنك أيضًا السؤال عن مواقيت الصلاة وأكاديمية القرآن والتبرّعات والبرامج أو استخدام التطبيق."
  ],
  original: ["", "اصل شائع شدہ معلومات (انگریزی):", "معلومات اصلی نشرشده (انگلیسی):", "المعلومات الأصلية المنشورة (بالإنجليزية):"]
} as const;

export function companionMessage(language: LanguageCode = "en", key: keyof typeof messages) {
  return messages[key][language === "ur" ? 1 : language === "fa-AF" ? 2 : language === "ar" ? 3 : 0];
}

/** Small, explicit topic vocabulary; not a claim of general language understanding. */
export function companionQuestionTerms(question: string) {
  let result = question;
  for (const [pattern, terms] of [
    [/نماز|اذان|اقامت|الصلاة|الصلاه|الاذان|الاقامة|مواقيت|الفجر|المغرب|العشاء/, " prayer times"],
    [/اکیڈمی|اکادمی|اكاديمية|اکاديميه|دروس القران|قرآن کلاس/, " academy"],
    [/فیس|شهریه|شهريه|الرسوم|رسوم|فیس ماهانه/, " academy fees tuition"],
    [/عطیہ|عطيہ|صدقه|صدقة|زکات|زكاة|تبرع|کمک مالی/, " donation"],
    [/رابطہ|تماس|اتصال|هاتف|فون/, " contact"],
    [/تقویم|تقويم|کیلنڈر|کلینڈر|جدول الدروس/, " parent calendar"],
    [/تلاوت|تلاوة|تلاوه|قراءة|قراة|تجوید|تجويد|تلاوتی/, " quran reader recite"],
    [/رویداد|رويداد|تقریب|فعالية|فعاليات/, " events"],
    [/سلام|مرحبا|آپ کون|نام شما|اسمك/, " who are you"]
  ] as const) if (pattern.test(question)) result += terms;
  return result;
}
