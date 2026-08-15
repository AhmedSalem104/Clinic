const translations = [
  ['Gynecologic & obstetric history', 'التاريخ النسائي والولادي'],
  ['Patient assignments', 'تخصيص الأطباء للمريضات'],
  ['Assignment history', 'سجل التخصيصات'],
  ['Medical summary', 'الملخص الطبي'],
  ['No appointments match these filters.', 'لا توجد حجوزات مطابقة للفلاتر الحالية.'],
  ['No appointments found.', 'لا توجد حجوزات.'],
  ['No documents uploaded.', 'لا توجد مستندات مرفوعة.'],
  ['No previous outcomes recorded.', 'لا توجد نتائج حمل وولادة سابقة مسجلة.'],
  ['No queue entries for this doctor and date.', 'لا توجد مريضات في طابور هذا الطبيب والتاريخ.'],
  ['No patients found.', 'لا توجد مريضات مطابقة.'],
  ['No assignments found.', 'لا توجد تخصيصات مسجلة.'],
  ['No timeline events found.', 'لا توجد أحداث في الخط الزمني.'],
  ['No important alerts recorded.', 'لا توجد تنبيهات مهمة مسجلة.'],
  ['No records found.', 'لا توجد سجلات.'],
  ['No active medications.', 'لا توجد أدوية نشطة.'],
  ['No pregnancy record.', 'لا يوجد سجل حمل.'],
  ['No lab tests.', 'لا توجد تحاليل.'],
  ['No ultrasound studies.', 'لا توجد فحوصات سونار.'],
  ['No visits found.', 'لا توجد زيارات.'],
  ['No cases found.', 'لا توجد حالات.'],
  ['No doctors yet.', 'لا يوجد أطباء بعد.'],
  ['No services yet.', 'لا توجد خدمات بعد.'],
  ['No schedules yet.', 'لا توجد جداول بعد.'],
  ['No users found.', 'لا يوجد مستخدمون.'],
  ['No data found.', 'لا توجد بيانات.'],
  ['No doctor selected.', 'لم يتم اختيار طبيب.'],
  ['Select a doctor to view the queue.', 'اختاري طبيبًا لعرض الطابور.'],
  ['Select a patient to open the history forms.', 'اختاري مريضة لفتح نماذج التاريخ الطبي.'],
  ['Select a patient to manage assignments.', 'اختاري مريضة لإدارة التخصيصات.'],
  ['Select a patient to view assignment history.', 'اختاري مريضة لعرض سجل التخصيصات.'],
  ['Select a patient to view the medical record.', 'اختاري مريضة لعرض السجل الطبي.'],
  ['Select the patient, doctor, service, date and an available slot.', 'اختاري المريضة والطبيب والخدمة والتاريخ والموعد المتاح.'],
  ['Select a doctor, service and date.', 'اختاري الطبيب والخدمة والتاريخ.'],
  ['Select doctor', 'اختاري الطبيب'],
  ['Select service', 'اختاري الخدمة'],
  ['Select case', 'اختاري الحالة'],
  ['Select patient', 'اختاري المريضة'],
  ['Search patient', 'بحث عن مريضة'],
  ['Search patient by name or phone', 'ابحثي باسم المريضة أو الهاتف'],
  ['Name, phone or Patient ID', 'الاسم أو الهاتف أو معرّف المريضة'],
  ['Search by name, phone or patient ID', 'ابحثي بالاسم أو الهاتف أو معرّف المريضة'],
  ['Today, upcoming, completed, cancelled and no-show appointments.', 'حجوزات اليوم والقادمة والمكتملة والملغاة والتي لم تحضر.'],
  ['New booking', 'حجز جديد'],
  ['Book a new appointment', 'حجز موعد جديد'],
  ['Confirm booking', 'تأكيد الحجز'],
  ['Booking confirmed', 'تم تأكيد الحجز'],
  ['Back to appointments', 'العودة إلى الحجوزات'],
  ['Back to my appointments', 'العودة إلى مواعيدي'],
  ['Reschedule appointment', 'إعادة جدولة الموعد'],
  ['Save reschedule', 'حفظ إعادة الجدولة'],
  ['Booking source', 'مصدر الحجز'],
  ['Operational notes', 'ملاحظات تشغيلية'],
  ['Available slots', 'المواعيد المتاحة'],
  ['Loading available slots…', 'جاري تحميل المواعيد المتاحة…'],
  ['No slots are available for this date.', 'لا توجد مواعيد متاحة في هذا التاريخ.'],
  ['Appointment', 'الموعد'],
  ['Appointments', 'الحجوزات'],
  ['Patient', 'المريضة'],
  ['Doctor', 'الطبيب'],
  ['Service', 'الخدمة'],
  ['Date', 'التاريخ'],
  ['Status', 'الحالة'],
  ['Source', 'المصدر'],
  ['Price', 'السعر'],
  ['Actions', 'الإجراءات'],
  ['All statuses', 'كل الحالات'],
  ['All dates', 'كل التواريخ'],
  ['Reschedule', 'إعادة جدولة'],
  ['Cancel', 'إلغاء'],
  ['Cancel appointment?', 'إلغاء الموعد؟'],
  ['Cancel appointment', 'إلغاء الموعد'],
  ['Could not cancel', 'تعذر الإلغاء'],
  ['Could not open patient profile', 'تعذر فتح ملف المريضة'],
  ['Could not load', 'تعذر التحميل'],
  ['Could not save', 'تعذر الحفظ'],
  ['Could not update', 'تعذر التحديث'],
  ['Could not record pause', 'تعذر تسجيل التوقف'],
  ['Queue management', 'إدارة الطابور'],
  ['Check-in, reorder, skip, pause and resume the doctor queue.', 'تسجيل الوصول وترتيب وتجاوز وإيقاف واستئناف طابور الطبيب.'],
  ['Add walk-in', 'إضافة مريضة بدون موعد'],
  ['Pause doctor', 'إيقاف الطبيب مؤقتًا'],
  ['Resume doctor', 'استئناف الطبيب'],
  ['Check-in', 'تسجيل الوصول'],
  ['Waiting', 'انتظار'],
  ['Start', 'بدء الكشف'],
  ['Complete', 'إكمال الكشف'],
  ['Late', 'متأخرة'],
  ['No show', 'لم تحضر'],
  ['Skip', 'تجاوز'],
  ['Queue updated', 'تم تحديث الطابور'],
  ['Queue update failed', 'تعذر تحديث الطابور'],
  ['Queue reorder failed', 'تعذر إعادة ترتيب الطابور'],
  ['Update queue entry?', 'تحديث عنصر الطابور؟'],
  ['Pause recorded', 'تم تسجيل التوقف'],
  ['Reason', 'السبب'],
  ['Save pause', 'حفظ التوقف'],
  ['Dashboard', 'لوحة التحكم'],
  ['Dashboard overview', 'نظرة عامة على العيادة'],
  ['Patients', 'المريضات'],
  ['All patients', 'كل المريضات'],
  ['Add patient', 'إضافة مريضة'],
  ['Add Patient', 'إضافة مريضة'],
  ['Patient ID', 'معرّف المريضة'],
  ['High Risk', 'متابعة خاصة'],
  ['Medical report', 'التقرير الطبي'],
  ['Book appointment', 'حجز موعد'],
  ['Doctor ID', 'معرّف الطبيب'],
  ['Medical record', 'السجل الطبي'],
  ['Medical', 'السجل الطبي'],
  ['Visits', 'الزيارات'],
  ['Cases', 'الحالات'],
  ['Pregnancy', 'الحمل'],
  ['Medications', 'الأدوية'],
  ['Allergies', 'الحساسيات'],
  ['Lab tests', 'التحاليل'],
  ['Ultrasound', 'السونار'],
  ['Documents', 'المستندات'],
  ['Progress', 'التطور'],
  ['Reports', 'التقارير'],
  ['Notifications', 'التنبيهات'],
  ['Users & Roles', 'المستخدمون والصلاحيات'],
  ['Settings', 'الإعدادات'],
  ['Doctors', 'الأطباء'],
  ['Schedules', 'الجداول'],
  ['Services', 'الخدمات'],
  ['Pricing', 'الأسعار'],
  ['Overview', 'نظرة عامة'],
  ['Timeline', 'الخط الزمني'],
  ['History', 'التاريخ الطبي'],
  ['Reports', 'التقارير'],
  ['Save', 'حفظ'],
  ['Save history', 'حفظ التاريخ'],
  ['Save gynecologic history', 'حفظ التاريخ النسائي'],
  ['Add outcome', 'إضافة نتيجة'],
  ['Add record', 'إضافة سجل'],
  ['Upload document', 'رفع مستند'],
  ['Document type', 'نوع المستند'],
  ['Document date', 'تاريخ المستند'],
  ['File', 'الملف'],
  ['Type', 'النوع'],
  ['Year', 'السنة'],
  ['Outcome', 'النتيجة'],
  ['Notes', 'ملاحظات'],
  ['Clinician notes', 'ملاحظات الطبيب'],
  ['Treatment plan', 'خطة العلاج'],
  ['Follow-up plan', 'خطة المتابعة'],
  ['Current diagnosis', 'التشخيص الحالي'],
  ['Primary doctor', 'الطبيب الأساسي'],
  ['Assignment type', 'نوع التخصيص'],
  ['New assignment', 'تخصيص جديد'],
  ['Primary doctor', 'الطبيب الأساسي'],
  ['Case doctor', 'طبيب الحالة'],
  ['Save assignment', 'حفظ التخصيص'],
  ['Assignment saved', 'تم حفظ التخصيص'],
  ['First visit', 'زيارة أولى'],
  ['Follow-up', 'متابعة'],
  ['Active', 'نشط'],
  ['Inactive', 'غير نشط'],
  ['Closed', 'مغلق'],
  ['Resolved', 'تم الحل'],
  ['Unknown', 'غير معروف'],
  ['Not recorded', 'غير مسجل'],
  ['Loading…', 'جاري التحميل…'],
  ['Loading...', 'جاري التحميل…'],
  ['Save', 'حفظ'],
  ['Close', 'إغلاق'],
  ['Back', 'رجوع'],
  ['Cancel', 'إلغاء'],
  ['Confirm', 'تأكيد'],
  ['Yes', 'نعم']
];

translations.push(
  ['Clinic Operations', 'تشغيل العيادة'],
  ['Documents', 'المستندات'],
  ['Upload document', 'رفع مستند'],
  ['Document type', 'نوع المستند'],
  ['Lab report', 'تقرير تحاليل'],
  ['Ultrasound report', 'تقرير سونار'],
  ['Hospital report', 'تقرير مستشفى'],
  ['External report', 'تقرير خارجي'],
  ['Document date', 'تاريخ المستند'],
  ['Uploaded by', 'رُفع بواسطة'],
  ['Lab tests', 'التحاليل'],
  ['Record lab test', 'تسجيل تحليل'],
  ['Test name', 'اسم التحليل'],
  ['Code when available', 'الكود عند توفره'],
  ['Requested date', 'تاريخ الطلب'],
  ['Collected date', 'تاريخ سحب العينة'],
  ['Result date', 'تاريخ ظهور النتيجة'],
  ['Numeric result', 'النتيجة الرقمية'],
  ['Text result', 'النتيجة النصية'],
  ['Reference range', 'المدى المرجعي'],
  ['Abnormal flag', 'علامة الانحراف'],
  ['Not interpreted', 'لم تُفسر'],
  ['Normal', 'طبيعية'],
  ['High', 'مرتفعة'],
  ['Low', 'منخفضة'],
  ['Critical', 'حرجة'],
  ['Ordered', 'مطلوب'],
  ['Collected', 'تم سحب العينة'],
  ['Resulted', 'ظهرت النتيجة'],
  ['No lab tests recorded.', 'لا توجد تحاليل مسجلة.'],
  ['Pregnancy records', 'سجلات الحمل'],
  ['Add pregnancy', 'إضافة حمل'],
  ['No pregnancy records found.', 'لا توجد سجلات حمل.'],
  ['Pregnancy', 'الحمل'],
  ['First Visit', 'أول زيارة'],
  ['First visit', 'أول زيارة'],
  ['Follow-up', 'متابعة'],
  ['Gynecology consultation', 'استشارة نساء'],
  ['Pregnancy follow-up', 'متابعة حمل'],
  ['Ultrasound visit', 'زيارة سونار'],
  ['Procedure', 'إجراء'],
  ['Clinical Notes', 'ملاحظات سريرية'],
  ['Clinician notes', 'ملاحظات الطبيب'],
  ['Assessment', 'التقييم'],
  ['Diagnosis', 'التشخيص'],
  ['Treatment', 'العلاج'],
  ['Treatment plan', 'خطة العلاج'],
  ['Open', 'فتح'],
  ['Print', 'طباعة'],
  ['Export PDF', 'تصدير PDF'],
  ['Not assigned', 'غير مسندة'],
  ['None', 'لا يوجد'],
  ['Unknown', 'غير معروف'],
  ['Reception', 'ريسبشن'],
  ['Owner', 'مالك العيادة'],
  ['SMS', 'رسالة نصية'],
  ['WhatsApp', 'واتساب'],
  ['lab_report', 'تقرير تحاليل'],
  ['ultrasound_report', 'تقرير سونار'],
  ['hospital_report', 'تقرير مستشفى'],
  ['external_report', 'تقرير خارجي'],
  ['first_visit', 'أول زيارة'],
  ['follow_up', 'متابعة'],
  ['gynecology', 'استشارة نساء'],
  ['pregnancy_follow_up', 'متابعة حمل'],
  ['ultrasound', 'زيارة سونار'],
  ['procedure', 'إجراء'],
  ['Book a new appointment', 'حجز موعد جديد'],
  ['Patient Medical Summary', 'الملخص الطبي للمريضة'],
  ['Gynecologic history', 'التاريخ النسائي'],
  ['Previous pregnancy outcomes', 'نتائج الأحمال السابقة'],
  ['Structured history used by the clinician during first visits and pregnancy review.', 'تاريخ منظم يستخدمه الطبيب أثناء الزيارة الأولى ومراجعة الحمل.'],
  ['Cycle, menstruation, contraception and relevant gynecologic background.', 'الدورة الشهرية والحيض ووسائل منع الحمل والخلفية النسائية المهمة.'],
  ['Repeatable outcome rows; unknown values remain optional.', 'يمكن إضافة أكثر من نتيجة، وتظل القيم غير المعروفة اختيارية.'],
  ['Menarche age', 'سن بدء الحيض'],
  ['Cycle interval (days)', 'الفاصل بين الدورات (بالأيام)'],
  ['Menses duration (days)', 'مدة الحيض (بالأيام)'],
  ['Cycle regularity', 'انتظام الدورة'],
  ['Not recorded', 'غير مسجل'],
  ['Regular', 'منتظمة'],
  ['Irregular', 'غير منتظمة'],
  ['LMP', 'آخر دورة'],
  ['Menstrual flow', 'غزارة الحيض'],
  ['Light', 'خفيفة'],
  ['Average', 'متوسطة'],
  ['Heavy', 'غزيرة'],
  ['Dysmenorrhea', 'ألم الدورة'],
  ['Mild', 'خفيف'],
  ['Moderate', 'متوسط'],
  ['Severe', 'شديد'],
  ['Clots', 'تجلطات'],
  ['Reported', 'مُبلغ عنها'],
  ['Contraception method', 'وسيلة منع الحمل'],
  ['STI / PID history', 'تاريخ العدوى المنقولة جنسيًا أو التهاب الحوض'],
  ['Cervical screening (date, result, follow-up)', 'فحص عنق الرحم (التاريخ والنتيجة والمتابعة)'],
  ['Save gynecologic history', 'حفظ التاريخ النسائي'],
  ['Year', 'السنة'],
  ['Outcome', 'النتيجة'],
  ['GA', 'العمر الحملي'],
  ['Mode', 'الطريقة'],
  ['Weight', 'الوزن'],
  ['Complication', 'المضاعفات'],
  ['Gestational age (weeks)', 'العمر الحملي (بالأسابيع)'],
  ['Delivery mode', 'طريقة الولادة'],
  ['Birth weight (g)', 'وزن المولود (جرام)'],
  ['Major complication', 'مضاعفة رئيسية'],
  ['Live birth', 'ولادة حية'],
  ['Stillbirth', 'ولادة جنين ميت'],
  ['Miscarriage', 'إجهاض'],
  ['Termination', 'إنهاء الحمل'],
  ['Ectopic', 'حمل خارج الرحم'],
  ['Patient assignments', 'تخصيص الأطباء للمريضات'],
  ['Assign a primary doctor or, for the owner, a doctor to a specific clinical case.', 'تخصيص طبيب أساسي أو، لمالك العيادة، طبيب لحالة طبية محددة.'],
  ['Search patient', 'البحث عن مريضة'],
  ['New assignment', 'تخصيص جديد'],
  ['The previous active assignment is closed and remains in history.', 'يُغلق التخصيص النشط السابق ويظل محفوظًا في السجل.'],
  ['Assignment history', 'سجل التخصيصات'],
  ['Assigned at', 'تاريخ التخصيص'],
  ['Ended at', 'تاريخ الانتهاء'],
  ['Primary doctor', 'الطبيب الأساسي'],
  ['Case doctor', 'طبيب الحالة'],
  ['Save assignment', 'حفظ التخصيص'],
  ['Assignment saved', 'تم حفظ التخصيص'],
  ['Assignment could not be saved', 'تعذر حفظ التخصيص'],
  ['No assignments found.', 'لا توجد تخصيصات مسجلة.'],
  ['No patients found.', 'لا توجد مريضات مطابقة.'],
  ['Select case', 'اختاري الحالة'],
  ['Search patient by name or phone', 'البحث باسم المريضة أو الهاتف']
  ,['structured', 'منظم']
  ,['Substance', 'المادة']
  ,['Reaction', 'التفاعل']
  ,['Severity', 'الشدة']
  ,['Gynecologic history saved', 'تم حفظ التاريخ النسائي']
  ,['Could not save history', 'تعذر حفظ التاريخ']
  ,['Outcome added', 'تمت إضافة النتيجة']
  ,['Could not save outcome', 'تعذر حفظ النتيجة']
  ,['This patient account is not linked to an active patient record.', 'حساب هذه المريضة غير مرتبط بسجل مريضة نشط.']
  ,['Encounter', 'زيارة طبية']
  ,['Appointment', 'موعد']
  ,['Patient', 'المريضة']
  ,['Doctor', 'الطبيب']
  ,['Service', 'الخدمة']
  ,['Source', 'المصدر']
  ,['Actions', 'الإجراءات']
  ,['Booked', 'محجوز']
  ,['Confirmed', 'مؤكد']
  ,['Arrived', 'وصلت']
  ,['Cancelled', 'ملغى']
  ,['No show', 'لم تحضر']
  ,['All statuses', 'كل الحالات']
  ,['Search patient by name or phone', 'ابحثي باسم المريضة أو الهاتف']
  ,['Quick medical summary', 'الملخص الطبي السريع']
  ,['Last visit', 'آخر زيارة']
  ,['Latest diagnosis', 'آخر تشخيص']
  ,['Current case', 'الحالة الحالية']
  ,['Active pregnancy', 'الحمل النشط']
  ,['Next appointment', 'الموعد القادم']
  ,['Allergy alerts', 'تنبيهات الحساسية']
  ,['Important alerts', 'تنبيهات مهمة']
  ,['High-risk flag', 'علامة خطورة مرتفعة']
  ,['clinician review required', 'تحتاج مراجعة الطبيب']
  ,['Recent appointments', 'أحدث الحجوزات']
  ,['An encounter is stored separately from the booking.', 'تُحفظ الزيارة الطبية بشكل مستقل عن الحجز.']
  ,['Visits', 'الزيارات']
  ,['Cases', 'الحالات']
  ,['Number', 'الرقم']
  ,['Method', 'الطريقة']
  ,['Drug', 'الدواء']
  ,['Dose / route', 'الجرعة والطريق']
  ,['Frequency', 'التكرار']
  ,['Indication', 'دواعي الاستخدام']
  ,['Start', 'البداية']
  ,['Allergies and restrictions', 'الحساسيات والموانع']
  ,['Recorded', 'تاريخ التسجيل']
  ,['Test', 'التحليل']
  ,['Reference', 'المدى المرجعي']
  ,['Flag', 'العلامة']
  ,['Ultrasound', 'السونار']
  ,['Performed by', 'الطبيب المنفذ']
  ,['Impression', 'الانطباع الطبي']
  ,['Progress indicators', 'مؤشرات التطور']
  ,['Trend', 'الاتجاه']
  ,['Validated', 'تمت المراجعة']
  ,['Trend labels require clinician review; they are not automated diagnoses.', 'تصنيفات الاتجاه تحتاج مراجعة الطبيب ولا تمثل تشخيصًا آليًا.']
  ,['Patient reports', 'تقارير المريضة']
  ,['Open the report builder to view, print or export a medical summary.', 'افتحي منشئ التقارير لعرض الملخص الطبي أو طباعته أو تصديره.']
  ,['Open reports', 'فتح التقارير']
  ,['Visit', 'زيارة']
  ,['Case', 'حالة']
  ,['Medication', 'دواء']
  ,['Lab', 'تحليل']
  ,['No timeline events found.', 'لا توجد أحداث في الخط الزمني.']
  ,['Other', 'أخرى']
  ,['entered_in_error', 'أُدخل بالخطأ']
  ,['neutral', 'غير مصنف']
  ,['improving', 'تحسن']
  ,['stable', 'مستقر']
  ,['worsening', 'يتدهور']
  ,['needs_review', 'يحتاج مراجعة']
  ,['skipped', 'تم تجاوزها']
  ,['obstetric_standard', 'سونار توليدي قياسي']
  ,['obstetric_detailed', 'سونار توليدي تفصيلي']
  ,['gynecological_pelvic', 'سونار حوض نسائي']
  ,['transabdominal', 'عبر البطن']
  ,['transvaginal', 'مهبلي']
  ,['early_ultrasound', 'سونار مبكر']
  ,['other_clinician_assessment', 'تقييم الطبيب']
);

const sortedTranslations = [...translations].sort(([left], [right]) => right.length - left.length);
const replaceText = (value) => sortedTranslations.reduce((text, [source, target]) => text.split(source).join(target), value);

export const localizePage = (root = document) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    if (node.parentElement?.closest('script,style')) return;
    const translated = replaceText(node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  });
  root.querySelectorAll?.('input[placeholder],textarea[placeholder],[aria-label],[title]').forEach((element) => {
    ['placeholder', 'aria-label', 'title'].forEach((attribute) => {
      if (element.hasAttribute(attribute)) element.setAttribute(attribute, replaceText(element.getAttribute(attribute)));
    });
  });
};
