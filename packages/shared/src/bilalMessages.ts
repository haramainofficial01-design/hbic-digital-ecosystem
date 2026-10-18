import type { LanguageCode } from "./types";

const messages = {
  greeting: [
    "Welcome! I’m Bilal, your Masjid Bilal guide. Happy to help you find prayer times, Quran Academy information, ways to support the masjid, or help with the app. What would you like to explore?",
    "خوش آمدید! میں بلال ہوں، مسجد بلال میں آپ کا رہنما۔ اوقاتِ نماز، قرآن اکیڈمی، مسجد کی مدد کے طریقوں یا ایپ کے استعمال میں خوشی سے مدد کروں گا۔ آپ کیا جاننا چاہیں گے؟",
    "خوش آمدید! من بلال هستم، راهنمای شما در مسجد بلال. با خوشی در یافتن اوقات نماز، معلومات اکادمی قرآن، راه‌های کمک به مسجد یا استفاده از اپلیکیشن کمک می‌کنم. چه چیزی می‌خواهید بدانید؟",
    "أهلًا وسهلًا! أنا بلال، دليلك في مسجد بلال. يسعدني أن أساعدك في العثور على مواقيت الصلاة، ومعلومات أكاديمية القرآن، وطرق دعم المسجد، أو استخدام التطبيق. بماذا أساعدك؟"
  ],
  thanks: [
    "You’re very welcome! Glad I could help. Whenever you need a hand finding Masjid Bilal information, just ask.",
    "بہت خوشی ہوئی کہ میں مدد کر سکا! مسجد بلال کی معلومات چاہیے ہوں تو بلا جھجھک پوچھیے۔",
    "خواهش می‌کنم! خوشحالم که کمک کردم. هر وقت به معلومات مسجد بلال نیاز داشتید، با خیال راحت بپرسید.",
    "على الرحب والسعة! يسعدني أن أساعدك. متى احتجت إلى معلومات عن مسجد بلال، اسألني بكل سرور."
  ],
  private: [
    "Let’s get you to the right place. I can help with public information, but I can’t view or change personal accounts, payments, attendance or enrollment. Please use your secure Quran Academy account, or contact the office. Don’t enter personal or payment details here.",
    "آئیے، آپ کو صحیح جگہ تک پہنچائیں۔ میں عوامی معلومات میں مدد کر سکتا ہوں، لیکن ذاتی اکاؤنٹس، ادائیگی، حاضری یا داخلے کی تفصیلات دیکھ یا بدل نہیں سکتا۔ اپنا محفوظ قرآن اکیڈمی اکاؤنٹ استعمال کریں یا دفتر سے رابطہ کریں۔ یہاں ذاتی یا ادائیگی کی تفصیلات درج نہ کریں۔",
    "بیایید راه درست را پیدا کنیم. من در یافتن معلومات عمومی کمک می‌کنم، اما حساب شخصی، پرداخت، حاضری یا ثبت‌نام را دیده یا تغییر داده نمی‌توانم. از حساب مصون اکادمی قرآن خود استفاده کنید یا با دفتر تماس بگیرید. جزئیات شخصی یا پرداخت را اینجا وارد نکنید.",
    "دعني أوجّهك إلى المكان المناسب. يمكنني المساعدة بالمعلومات العامة، لكن لا يمكنني عرض الحسابات الشخصية أو المدفوعات أو الحضور أو التسجيل أو تعديلها. استخدم حسابك الآمن في أكاديمية القرآن أو تواصل مع المكتب. لا تدخل بيانات شخصية أو بيانات دفع هنا."
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
    "Let’s find the right next step. I couldn’t find a verified answer in HBIC’s published information, and I don’t want to steer you wrong. The office can confirm that detail. You can also ask me about prayer times, Quran Academy, donations, programs or using the app.",
    "آئیے، اگلا قدم تلاش کریں۔ HBIC کی شائع شدہ معلومات میں تصدیق شدہ جواب نہیں ملا، اس لیے اندازہ نہیں لگاؤں گا۔ دفتر اس بات کی تصدیق کر سکتا ہے۔ آپ اوقاتِ نماز، قرآن اکیڈمی، عطیات، پروگراموں یا ایپ کے استعمال کے بارے میں بھی پوچھ سکتے ہیں۔",
    "بیایید گام بعدی را پیدا کنیم. در معلومات نشرشده HBIC پاسخ تأییدشده‌ای نیافتم، پس حدس نمی‌زنم. دفتر می‌تواند این موضوع را تأیید کند. درباره اوقات نماز، اکادمی قرآن، کمک‌های مالی، برنامه‌ها یا استفاده از اپلیکیشن نیز پرسیده می‌توانید.",
    "لنبحث عن الخطوة المناسبة. لم أجد إجابة موثّقة في المعلومات المنشورة من HBIC، ولا أريد أن أخمّن. يمكن للمكتب تأكيد هذا التفصيل. يمكنك أيضًا السؤال عن مواقيت الصلاة وأكاديمية القرآن والتبرّعات والبرامج أو استخدام التطبيق."
  ],
  original: ["", "اصل شائع شدہ معلومات (انگریزی):", "معلومات اصلی نشرشده (انگلیسی):", "المعلومات الأصلية المنشورة (بالإنجليزية):"]
} as const;

export function companionMessage(language: LanguageCode = "en", key: keyof typeof messages) {
  return messages[key][language === "ur" ? 1 : language === "fa-AF" ? 2 : language === "ar" ? 3 : 0];
}

/** Small, explicit topic vocabulary; not a claim of general language understanding. */
export function companionQuestionTerms(question: string) {
  // Match common Arabic/Persian letter variants without altering the original
  // question or the published answer. The caller has already removed diacritics.
  const vocabulary = question.replace(/ك/g, "ک").replace(/ي/g, "ی").replace(/\u200c/g, " ");
  let result = question;
  for (const [pattern, terms] of [
    [/نماز|اذان|اقامت|اقامه|الصلاة|الصلاه|الاذان|الاقامة|مواقيت|الفجر|المغرب|العشاء/, " prayer times"],
    [/اگلی نماز|نماز بعدی|الصلاة القادمة|الصلاه القادمة/, " next prayer"],
    [/جمعہ|جمعه|الجمعة/, " jumuah"],
    [/اکیڈمی|اکادمی|اکادیمیة|اکادیمیه|دروس القران|کلاس قران|صنف قران|دروس الاطفال/, " academy"],
    [/فیس|شهریه|الرسوم|رسوم/, " academy fees tuition"],
    [/عطیہ|صدقه|صدقة|زکات|زکاة|تبرع|کمک مالی/, " donations"],
    [/رابطہ|تماس|اتصال|هاتف|فون/, " contact"],
    [/پتہ|پتا|ادرس|عنوان المسجد|العنوان|پارکنگ|پارکینگ|مواقف السیارات/, " address location"],
    [/رجسٹریشن|داخلہ|ثبت نام|(?:التسجیل|تسجیل)(?!ات| الصوت)|سجل طفلی/, " academy registration enroll"],
    [/تقویم|کیلنڈر|کلینڈر|جدول الدروس/, " parent calendar"],
    [/تلاوت|تلاوة|تلاوه|قراءة|قراة|تجوید|تلاوتی/, " quran reader recite"],
    [/ریکارڈنگ|ریکارڈ|ضبط|تسجیلات|التسجیل الصوتی|محفوظ|ذخیره/, " recordings storage"],
    [/غلطی|غلطیاں|اشتباه|اشتباهات|اخطاء|الدقة|دقت|درستگی/, " recite assist accuracy"],
    [/رویداد|تقریب|فعالیة|فعالیات/, " events"],
    [/رضاکار|داوطلب|تطوع/, " volunteer"],
    [/پروگرام|برنامه|برامج|برنامج/, " programs"],
    [/ایپ|اپلیکیشن|تطبیق|تنبیہ|اطلاعات|اعلان|اشعارات|اشعار/, " download app notifications"],
    [/آپ کون|نام شما|اسمک|من انت|بلال/, " who are you"]
  ] as const) if (pattern.test(vocabulary)) result += terms;
  if (/قران/.test(vocabulary) && /پڑھ|بخوان|بخوانم|اقرا|قراءة|قراة|مصحف|سور[ةہه]|ای[ةہه]/.test(vocabulary)) result += " read quran";
  return result;
}

/** Full-message social phrases only: a greeting must never hide a real question. */
export function companionSocialIntent(question: string): "greeting" | "thanks" | null {
  if (/^(?:hi|hello|hey|salam|salaam|assalamu alaikum|assalamu alaykum|as salamu alaykum|السلام علیکم|السلام عليكم|سلام|مرحبا|اهلا|اهلا وسهلا)$/.test(question)) return "greeting";
  if (/^(?:thanks|thank you|thank you bilal|thanks bilal|jazakallahu khairan|جزاک اللہ خیرا|شکریہ|بہت شکریہ|تشکر|سپاس|ممنون|شكرا|شكرا لك|جزاك الله خيرا)$/.test(question)) return "thanks";
  return null;
}
