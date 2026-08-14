# Patient and gynecologic history

## Purpose

تسجيل البيانات التي يحتاجها الطبيب لفهم سبب الزيارة والخلفية النسائية دون تحويل ملف المريضة إلى استبيان طويل. لا تظهر الأسئلة الحساسة للـReception.

## Patient identity (في شاشة المريضة)

| Field | Type | Required | Notes |
|---|---|---:|---|
| Full name | Text | Yes | الاسم التشغيلي الظاهر في الحجوزات |
| Date of birth | Date | No | يدخل عند توفره؛ العمر مشتق تلقائيًا |
| Primary phone | Phone | Yes | يستخدم للبحث ومنع التكرار |
| Alternate contact | Phone/text | No | عند الحاجة للتواصل |
| Preferred contact channel | Enum | No | SMS / WhatsApp / Phone |
| Address | Text | No | لا يطلب في الحجز السريع |
| Emergency contact | Text/phone | No | يضاف فقط عندما يلزم workflow العيادة |

## Gynecologic history (في أول زيارة أو عند الحاجة)

| Field | Type | Required | Notes |
|---|---|---:|---|
| Menarche age | Integer | Optional | نطاق منطقي 8–20 |
| Cycle interval | Integer days | Optional | قيمة قابلة للمقارنة |
| Menses duration | Integer days | Optional | قيمة قابلة للمقارنة |
| Cycle regularity | Enum | Conditional | Regular / Irregular / Unknown |
| LMP | Date | Conditional | مهم عند النزف أو احتمال الحمل |
| Menstrual flow | Enum | Optional | Light / Average / Heavy / Unknown |
| Clots | Boolean | Optional | يفتح ملاحظة إضافية عند نعم |
| Dysmenorrhea | Enum | Optional | None / Mild / Moderate / Severe |
| Current gynecologic symptoms | Structured symptom list + narrative | Conditional | نزف غير طبيعي، ألم حوض، إفرازات، أعراض بولية، أعراض سن اليأس |
| Prior gynecologic diagnoses | Repeatable coded/text entries | Optional | مثل fibroid, endometriosis, PCOS, infertility |
| Prior gynecologic procedures | Repeatable rows | Optional | الإجراء، التاريخ، السبب، المضاعفات |
| Contraceptive method | Enum/text | Conditional | يظهر عند مناقشة منع الحمل |
| STI/PID history | Structured status + notes | Conditional | لا يظهر إلا للطبيب |
| Cervical screening history | Date/result/follow-up | Conditional | لا يُطلب إن لم يكن متعلقًا بالزيارة |

## Why these fields

اختيرت من عناصر التاريخ النسائي المذكورة في Merck Manual (الدورة، الأعراض، الحالات والإجراءات السابقة، وسائل منع الحمل) ومن مبدأ ACOG أن نطاق الزيارة يعتمد على سبب المريضة وتاريخها. تم حذف الأسئلة التفصيلية التي لا تدخل في قرار أو تقرير داخل هذا النظام، ويمكن إضافة حقول محلية لاحقًا بعد اعتماد الطبيب.
