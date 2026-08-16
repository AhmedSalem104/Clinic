# Clinic Management System

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/clinic-banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/clinic-banner-light.svg">
    <img src="docs/assets/clinic-banner-light.svg" alt="Clinic Management System — women's health clinic operations" width="100%">
  </picture>
</p>

<p align="center">
  <strong>نظام تشغيل متكامل لعيادة نساء وتوليد متعددة الأطباء</strong><br>
  <sub>حجز · استقبال · طابور لحظي · سجل طبي منظم · متابعة الحمل · تقارير · صلاحيات آمنة</sub>
</p>

<p align="center">
  <a href="https://clinic-seven-sand.vercel.app"><img src="https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"></a>
  <a href="https://github.com/AhmedSalem104/Clinic"><img src="https://img.shields.io/badge/GitHub-AhmedSalem104%2FClinic-181717?style=for-the-badge&logo=github" alt="GitHub repository"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/AhmedSalem104/Clinic?branch=main&style=flat-square&label=last%20commit" alt="Last commit">
  <img src="https://img.shields.io/github/repo-size/AhmedSalem104/Clinic?style=flat-square&label=repo%20size" alt="Repository size">
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A520-43853D?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 20 or newer">
  <img src="https://img.shields.io/badge/Frontend-Vanilla%20JS%20%2B%20Tailwind-2563EB?style=flat-square" alt="Vanilla JavaScript and Tailwind CSS">
  <img src="https://img.shields.io/badge/Database-SQL%20Server%20%2B%20mssql-CC2927?style=flat-square&logo=microsoftsqlserver&logoColor=white" alt="Microsoft SQL Server">
</p>

> **الحالة الحالية:** الواجهة عربية RTL، والمريضة تستطيع حجز أول موعد **بدون تسجيل دخول وبدون OTP** من فورم عام للمواعيد المتاحة. بعد الحجز تحصل على Patient ID ورقم الحجز ورقم الدور ورابط المتابعة، ويمكنها إنشاء حساب لاحقًا لربط الحجز ومتابعة دورها.
>
> **بوابة الإنتاج:** قبل تشغيل نسخة الإنتاج يجب ضبط `JWT_SECRET` وبيانات قاعدة البيانات في Vercel. رفع المستندات الطبية يُغلق تلقائيًا على Vercel إذا لم يتم إعداد مزود تخزين دائم؛ هذا يمنع نجاح الرفع بشكل وهمي إلى `/tmp` ثم فقدان الملف بعد انتهاء الـServerless Function.

## روابط سريعة

| الرابط | الاستخدام |
|---|---|
| [التجربة المباشرة](https://clinic-seven-sand.vercel.app) | النسخة المنشورة على Vercel |
| [الحجز العام بدون دخول](https://clinic-seven-sand.vercel.app/patient-booking.html) | فورم الحجز الأول للمريضة |
| [الإنتاج البديل](https://clinic-paaf.vercel.app) | رابط Vercel بديل |
| [دليل التشغيل الكامل](docs/PROJECT_GUIDE.md) | الـflows، الصلاحيات، الـAPI، قاعدة البيانات، النشر وحل المشاكل |
| [النماذج الطبية الواقعية](docs/medical-forms/) | مراجع وحقول Patient History وGynecology وAntenatal وUltrasound وغيرها |
| [GitHub Repository](https://github.com/AhmedSalem104/Clinic) | الكود، الإصدارات ونسخة README الحالية |

## فهرس الدليل

- [نظرة سريعة](#نظرة-سريعة)
- [الهدف والكيانات الأساسية](#الهدف)
- [المستخدمون والصلاحيات](#المستخدمون-والصلاحيات)
- [تسجيل المريضة والحجز العام والذاتي](#patient-registration-بدون-otp)
- [الحجز والطابور والـRealtime](#queue-management)
- [السجل الطبي والنماذج](#السجل-الطبي)
- [المعمارية والـAPI](#المعمارية)
- [قاعدة البيانات والأمان](#قاعدة-البيانات)
- [التشغيل المحلي والنشر](#التشغيل-المحلي)
- [الحدود الحالية وDefinition of Done](#الحدود-الحالية)

## نظرة سريعة

هذا المشروع ليس صفحة حجز منفردة؛ هو **Clinic Operating System** يفصل التشغيل اليومي عن السجل الطبي، ويعطي كل مستخدم واجهة وصلاحيات تناسب دوره.

| ما تم تسليمه | النتيجة العملية |
|---|---|
| Patient Registration بدون OTP | إنشاء حساب مريضة أو ربط حساب لاحقًا بملف الحجز باستخدام Patient ID + الهاتف |
| Public Guest Booking | حجز أول موعد بدون Login، مع Patient ID ورقم الحجز ورقم الدور ورابط متابعة |
| Patient Self-booking | اختيار الطبيب والخدمة والتاريخ والـslot والسعر من نفس New Booking Flow |
| Booking Security | إجبار `patientId` و`BookingSource=online` من جلسة المريضة، وعدم قبول حجز مريضة أخرى |
| Queue & Tracking | Queue Entry وPublic Tracking Token وEstimated Waiting Time |
| Clinical Separation | Appointment منفصل عن Visit، وCase منفصل عن Pregnancy، وبيانات Structured قابلة للتقارير |
| Role-based Access | Owner وDoctor وReception وPatient مع Server-side checks وAudit Logs |
| Modular Stack | HTML/CSS/Vanilla JS/Tailwind + Node/Express + SQL Server/mssql |

### طبقة الأمان وسلامة البيانات

- كل طلب محمي يعيد التحقق من أن الحساب ما زال نشطًا وأن `SessionVersion` لم تتغير. تعديل الدور أو كلمة المرور أو تعطيل الحساب يلغي الجلسات القديمة.
- ملف المريضة ومسارات التخصيص متاحة للحسابات التشغيلية المصرح بها فقط؛ الـReception يحصل على البيانات التشغيلية دون التشخيص أو الحمل أو الأدوية أو الحساسية أو الموقع الدقيق.
- إنشاء Visit أو Pregnancy أو Medication أو Lab أو Ultrasound أو Document أو Progress لا يتم إلا بعد التحقق داخل Transaction من تطابق `PatientId` مع كل `CaseId` و`VisitId` و`PregnancyId` و`AppointmentId` المرتبطة.
- أرقام الدور محمية بقفل Transaction و`UX_Queue_DoctorDateNumber` لمنع التكرار عند الحجز المتزامن.
- عند غياب Socket.IO على Vercel، تستخدم شاشتا الطابور والحجوزات polling كل 10 ثوانٍ مع تنظيف المؤقت عند التنقل، بينما يبقى Socket.IO هو المسار الفوري على الخوادم طويلة التشغيل.
- شغّل `npm run db:migrate` بعد سحب التغييرات لتطبيق `SessionVersion` وفهارس التزامن الجديدة بأمان.

### خريطة النظام في لقطة واحدة

```mermaid
flowchart LR
  Patient[المريضة] -->|حجز بدون دخول| PublicBooking[Public Booking Form]
  PublicBooking -->|اختيار موعد متاح| Booking[Booking Transaction]
  Patient -->|اختياري لاحقًا| Portal[Patient Portal]
  Portal -->|نفس شاشة الحجز| Booking
  Reception[Reception] --> Booking
  Owner[Clinic Owner] --> Booking
  Booking --> Availability[Availability + Pricing]
  Availability --> Appointment[Appointment]
  Appointment --> Queue[Queue Entry]
  Queue --> Realtime[Realtime Updates]
  Appointment --> Visit[Medical Visit]
  Visit --> Record[Medical Record]
  Record --> Reports[Reports + Progress]
```

### ما الذي يراه كل دور؟

```mermaid
flowchart TB
  Owner[Owner] --> Everything[كل الوحدات وكل السجلات]
  Doctor[Doctor] --> Assigned[Assigned Patients and Cases]
  Reception[Reception] --> Operations[Booking + Check-in + Queue]
  Patient[Patient] --> Own[Own Appointments + Queue Tracking]
  Reception -. ممنوع .-> Clinical[Clinical Notes and Medical Data]
  Patient -. ممنوع .-> Clinical
```

<details>
<summary><strong>افتح رحلة الحجز الذاتي خطوة بخطوة</strong></summary>

1. تفتح المريضة رابط **الحجز بدون تسجيل دخول**.
2. تكتب الاسم ورقم الهاتف فقط، ثم تختار الطبيب والخدمة والتاريخ والـslot الظاهر كمتاح.
3. يظهر السعر الحالي حسب Doctor + Service.
4. يؤكد الـBackend أن الـslot ما زال متاحًا داخل Transaction.
5. يتم إنشاء Patient مختصر بحالة `incomplete` ثم Appointment وQueue Entry عند احتياج الخدمة للطابور.
6. تظهر Patient ID ورقم الحجز ورقم الدور ورابط المتابعة.
7. عند الحضور يكمل الـReception باقي البيانات ويحوّل حالة الملف إلى `complete`.
8. يمكن للمريضة إنشاء حساب لاحقًا بإدخال Patient ID والهاتف، بدون OTP.

```mermaid
sequenceDiagram
  actor P as Patient
  participant UI as Shared Booking Form
  participant API as Express API
  participant DB as SQL Server
  P->>UI: Choose doctor, service, date and slot
  UI->>API: POST /api/appointments
  API->>API: Bind patientId from authenticated session
  API->>DB: Transaction: validate schedule, price and overlap
  alt slot available
    DB-->>API: Appointment + Queue Entry + tracking token
    API-->>UI: 201 Created
    UI-->>P: Confirmation and appointments list
  else slot already taken
    DB-->>API: Rollback / conflict
    API-->>UI: 409 OVERLAPPING_BOOKING
  end
```

</details>

## الهدف

النظام يفصل بين الكيانات التالية:

- Appointment: ما تم حجزه.
- Queue Entry: دور المريضة داخل طابور الطبيب.
- Visit: ما حدث طبيًا بالفعل.
- Medical Case: حالة مستقلة مثل PCOS أو Pregnancy.
- Pregnancy: سجل حمل مستقل مرتبط بحالة ومتابعات ونتيجة ولادة.
- Patient Account: حساب دخول مرتبط بسجل Patients من خلال PatientId.

الأهداف التشغيلية:

1. تقليل وقت الانتظار.
2. إعطاء المريضة Estimated Time وPeople Ahead.
3. تمكين الـReception من إدارة الحجز الهاتفي والـWalk-in.
4. وصول الطبيب إلى التاريخ الطبي المسموح به بسرعة.
5. حماية البيانات الطبية الحساسة.
6. دعم أكثر من طبيب داخل نفس العيادة.

## المستخدمون والصلاحيات

| المستخدم | ما يفعله | ما لا يراه |
|---|---|---|
| Clinic Owner | كل المرضى والأطباء والخدمات والأسعار والجداول والحجوزات والطابور والسجل الطبي والتقارير والمستخدمون والإعدادات وAudit Logs | لا توجد قيود تشغيلية داخل نطاقه |
| Doctor | المرضى والحالات المعيّنة له، Visits، Pregnancy، Medications، Allergies، Labs، Ultrasound، Documents، Progress والتقارير | مرضى غير Assigned له وإدارة المستخدمين |
| Reception | البحث، Add Patient، Booking، Phone Booking، Walk-in، Check-in، Queue، No Show، Cancel، Reschedule، Pause/Resume | Diagnosis وClinical Notes وتفاصيل الحمل والأدوية والتقارير الطبية |
| Patient | حجز أول موعد بدون Login، إنشاء حساب اختياري بدون OTP، رؤية مواعيدها، حالة الموعد، متابعة الدور والوقت المتوقع | السجل الطبي وDashboard العيادة ومرضى آخرون وإدارة الطابور والحجز باسم مريضة أخرى |

~~~mermaid
flowchart LR
  Owner[Clinic Owner] --> All[All Modules]
  Doctor[Doctor] --> Assigned[Assigned Patients and Cases]
  Doctor --> Clinical[Clinical Records and Reports]
  Reception[Reception] --> Operations[Booking and Queue]
  Reception -. denied .-> Clinical
  Patient[Patient] --> Portal[Appointments and Queue Tracking]
  Patient -. denied .-> Clinical
~~~

صلاحيات الـBackend هي طبقة الحماية الأساسية، وليس إخفاء الزر في الواجهة.

## Patient Registration بدون OTP

### الحجز الأول بدون تسجيل دخول

الرابط العام:

~~~text
/patient-booking.html
/book
~~~

الـFlow:

~~~mermaid
flowchart TD
  A[فتح فورم الحجز العام] --> B[الاسم ورقم الهاتف]
  B --> C[اختيار الطبيب والخدمة]
  C --> D[اختيار التاريخ والموعد المتاح]
  D --> E[عرض السعر]
  E --> F[تأكيد الحجز بدون Login أو OTP]
  F --> G[Patient ID + Booking Number + Queue Number]
  G --> H[رابط متابعة الدور]
  G --> I[الريسبشن يكمل البيانات عند الوصول]
  I --> J[اختياري: إنشاء حساب باستخدام Patient ID والهاتف]
~~~

الحجز العام لا يقبل `patientId` من المتصفح، ولا يستقبل Diagnosis أو Clinical Notes. الـBackend يبحث عن المريضة بالهاتف داخل Transaction، وينشئ سجلًا تشغيليًا مختصرًا إذا لم تكن موجودة، ثم يحجز الـslot ويمنع الـDouble Booking. الهاتف غير موثق لأن الـFlow بدون OTP؛ لذلك يظل استكمال الهوية والبيانات مسؤولية الريسبشن.

### الدخول

من Login اضغط:

~~~text
إنشاء حساب مريضة جديد
~~~

أو افتح:

~~~text
/patient-register.html
~~~

### الحقول

| الحقل | الحالة | الاستخدام |
|---|---|---|
| Full Name | Required | الاسم الظاهر في الحجوزات |
| Patient ID من الحجز | Optional | يربط الحساب لاحقًا بسجل الحجز مع مطابقة الهاتف |
| Date of Birth | Optional | كشف التكرار وحساب العمر |
| Phone | Required | البحث والتواصل وكشف التكرار |
| Email | Required | اسم الدخول الفريد |
| Password | Required، 8 أحرف على الأقل | bcrypt hash |
| Confirm Password | Required | منع أخطاء الإدخال |
| Preferred Contact Channel | Optional | Phone أو SMS أو WhatsApp |
| Alternate Phone | Optional | قناة احتياطية |
| Address | Optional | بيانات تشغيلية |
| Emergency Contact | Optional | اسم ورقم جهة الطوارئ |
| Consent | Required | الموافقة على إنشاء الحساب واستخدام بيانات التواصل |

لا يوجد OTP أو رمز تحقق، لذلك البريد والهاتف لا يعتبران موثقين تلقائيًا.

### Flow التسجيل

~~~mermaid
sequenceDiagram
  actor Patient as Patient
  participant UI as Registration Page
  participant API as Patient Portal API
  participant DB as SQL Server

  Patient->>UI: Fill registration form
  UI->>API: POST JSON without OTP
  API->>API: Validate and rate limit
  API->>DB: Begin transaction
  DB->>DB: Check email, phone and name plus DOB
  alt duplicate
    DB-->>API: 409 conflict
    API-->>UI: Contact clinic message
  else new identity
    DB->>DB: Insert Patient
    DB->>DB: Insert User with Role patient
    DB->>DB: Commit and Audit Log
    API-->>UI: 201 PatientCode
  end
~~~

### منع التكرار

يرفض النظام التسجيل إذا:

- البريد موجود في Users.
- الهاتف بعد التطبيع موجود في Patients.NormalizedPhone.
- الاسم المطبع مع تاريخ الميلاد يطابق سجلًا موجودًا.

لا يتم الربط التلقائي بمجرد الهاتف. لربط حجز عام بحساب لاحقًا يجب إدخال Patient ID من تأكيد الحجز مع نفس الهاتف؛ لا يوجد OTP، لذلك تظل المراجعة والاستكمال مسؤولية العيادة.

بعد نجاح التسجيل:

1. يظهر Patient ID.
2. تسجل المريضة الدخول من الصفحة الرئيسية.
3. ينتقل الحساب إلى Patient Portal.
4. تظهر المواعيد والبيانات التشغيلية فقط.
5. يظهر رابط متابعة الدور عند توفره.

الحجز الذاتي للمريضة المسجلة متاح من نفس شاشة **New Booking** المستخدمة بواسطة الـReception، لكن بواجهة مبسطة تثبت المريضة الحالية تلقائيًا. الحجز يمر بنفس قواعد الطبيب والخدمة والـslot والسعر ومنع الـDouble Booking، ويسجل <code>BookingSource=online</code>.

### استكمال بيانات الحجز في العيادة

يظهر الحجز العام في **كل المواعيد** للريسبشن، وفي مواعيد الطبيب المعيّنة له. يظهر بجانبه Badge **بيانات ناقصة**. يفتح الريسبشن ملف المريضة، يضغط **استكمال البيانات**، يجمع البيانات التشغيلية المتبقية، ثم يحدد **مكتمل**. السجل الطبي لا يضاف من هذا النموذج؛ يظل داخل وحدات الطبيب الطبية.

## استخدام النظام حسب الدور

### Owner

1. Login.
2. راجع الحجوزات العامة وحالات الملفات الناقصة.
3. أضف Doctors.
4. أضف Services ومددها.
5. أضف Pricing حسب Doctor + Service.
6. أضف Schedules وExceptions.
7. أنشئ Users للأطباء والـReception.
8. راجع Settings وAudit Logs.

### Reception

~~~mermaid
flowchart TD
  A[Login] --> B[Dashboard]
  B --> C[Search Patient]
  C --> D{Existing Patient?}
  D -- No --> E[Add Patient and Duplicate Detection]
  D -- Yes --> F[Open operational profile]
  E --> G[Booking or Walk-in]
  F --> H{Has appointment?}
  H -- Yes --> I[Check-in]
  H -- No --> G
  G --> J[Queue Entry]
  I --> J
  J --> K[Waiting, Start, Complete, Late, No Show]
~~~

### إنشاء الحجز

1. Search بالاسم أو الهاتف أو Patient ID، خصوصًا Patient ID الموجود في الحجز العام.
2. اختيار المريضة أو إنشاء Quick Patient.
3. اختيار الطبيب.
4. اختيار الخدمة.
5. اختيار التاريخ والـAvailable Slot.
6. عرض السعر الفعلي.
7. Confirm Booking.
8. إنشاء Queue Entry إذا كانت الخدمة تحتاج طابورًا.
9. إنشاء Public Tracking Token.
10. إرسال Notification عند توفر القناة.

Phone Booking يستخدم نفس New Booking Flow ولا يوجد نظام منفصل له.

### Walk-in

1. Search أو Add Patient.
2. اختيار Doctor وService.
3. عرض Estimated Wait Range.
4. Confirm.
5. إضافة الحجز والطابور حسب إعداد الخدمة.

### Doctor

1. افتح الحجوزات المعيّنة لك أو Queue/Visits.
2. اختر مريضة Assigned لك.
3. راجع الملخص والتنبيهات والحالة الحالية.
4. Start Visit.
5. أدخل البيانات المنظمة المناسبة لنوع الزيارة.
6. أضف Assessment وDiagnosis وTreatment Plan.
7. Save Draft أو Complete Visit.
8. أضف Follow-up أو Medication أو Lab أو Ultrasound عند الحاجة.

### Patient

1. للحجز الأول: افتحي **حجز موعد بدون تسجيل دخول**.
2. اختاري الطبيب والخدمة والتاريخ والـslot المتاح.
3. راجعي السعر ثم أكدي الحجز.
4. احتفظي بـPatient ID ورقم الحجز ورابط الدور.
5. عند الرغبة في المتابعة المستمرة، أنشئي حسابًا لاحقًا بنفس الهاتف وPatient ID.
6. بعد تسجيل الدخول يظهر Patient Portal بالمواعيد والدور والوقت المتوقع.
7. يمكن إلغاء الموعد حسب سياسة العيادة عندما تُفعّل صلاحية الإلغاء للمريضة.

### حجز المريضة لنفسها

```mermaid
flowchart TD
  A[Public Booking بدون دخول] --> B[بيانات مختصرة]
  B --> C[اختيار الطبيب والخدمة]
  C --> D[Choose Doctor]
  D --> E[Choose Service]
  E --> F[Choose Date and Available Slot]
  F --> G[Show Current Price]
  G --> H[Confirm Booking]
  H --> I[رقم الحجز والدور ورابط المتابعة]
  I --> J[حساب اختياري لاحقًا]
```

يستخدم هذا الـFlow نفس <code>POST /api/appointments</code>، لكن الـBackend يستبدل أي <code>patientId</code> أو <code>bookingSource</code> مرسلين من المتصفح بالقيم الآمنة من جلسة المريضة. المريضة ترى مواعيدها فقط، ولا تستطيع فتح موعد مريضة أخرى أو استخدام صلاحيات إدارة الحجوزات.

## Queue Management

الحالات المدعومة:

~~~text
Booked
Confirmed
Arrived
Waiting
InConsultation
Completed
Late
NoShow
Cancelled
Skipped
~~~

~~~mermaid
stateDiagram-v2
  [*] --> Booked
  Booked --> Confirmed
  Confirmed --> Arrived: Check-in
  Arrived --> Waiting
  Waiting --> InConsultation: Start
  Late --> InConsultation: Start
  InConsultation --> Completed: Complete
  Booked --> Cancelled
  Confirmed --> Cancelled
  Arrived --> NoShow
  Waiting --> Skipped
~~~

### وقت الانتظار

~~~text
Expected Duration
  = Service Base Duration
  + Doctor Historical Adjustment
  + Current Day Adjustment
~~~

بعد Complete Visit:

1. يحفظ النظام Actual Duration.
2. يحدث إحصائيات الطبيب والخدمة.
3. يعيد حساب Queue.
4. يحدث Expected Start وExpected End.
5. يعرض للمريضة Range تقريبيًا.

### Pause وResume

~~~mermaid
sequenceDiagram
  participant R as Reception
  participant API as Queue API
  participant DB as SQL Server
  participant RT as Realtime Layer
  participant P as Patient

  R->>API: Pause Doctor
  API->>DB: Save pause
  API->>DB: Recalculate queue
  API->>RT: doctor paused
  RT-->>P: New estimated range
  R->>API: Resume Queue
  API->>DB: Save resume and recalculate
  API->>RT: doctor resumed
~~~

## الشاشات والـRoutes

| Route | الشاشة | المستخدمون |
|---|---|---|
| /dashboard | Dashboard اليوم | Owner / Doctor / Reception |
| /patients | All Patients والبحث | Owner / Doctor / Reception حسب التعيين |
| /patients/new | Add Patient | Owner / Reception |
| /patients/:id | Patient Profile | Owner / Doctor / Reception ببيانات منقحة |
| /assignments | Patient/Case Assignments | Owner / Reception |
| /appointments | Calendar والحجوزات | Owner / Doctor / Reception |
| /appointments/new | New Booking / Patient Self-booking | Owner / Reception / Patient لحسابها فقط |
| /queue | Queue Management | Owner / Reception |
| /doctors | Doctors | Owner |
| /schedules | Schedules | Owner / Doctor |
| /services | Services | Owner / Doctor / Reception للعرض |
| /pricing | Pricing | Owner / Doctor / Reception للعرض |
| /visits | Medical Visits | Owner / Doctor |
| /cases | Medical Cases | Owner / Doctor |
| /history | Gynecologic/Obstetric History | Owner / Doctor |
| /pregnancy | Pregnancy | Owner / Doctor |
| /medications | Medications | Owner / Doctor |
| /allergies | Allergies | Owner / Doctor |
| /labs | Labs | Owner / Doctor |
| /ultrasound | Ultrasound | Owner / Doctor |
| /documents | Documents | Owner / Doctor |
| /progress | Progress | Owner / Doctor |
| /reports | Reports | Owner / Doctor |
| /notifications | Notifications | المستخدم المسموح |
| /users | Users & Roles | Owner |
| /settings | Settings | Owner |
| /patient-portal | Patient Portal | Patient فقط |
| /patient-booking.html | الحجز العام بدون دخول | Public Patient |
| /book | اختصار الحجز العام | Public Patient |

### الصفحات العامة

- /: Login.
- /patient-register.html: Patient Registration بدون OTP.
- /queue-tracking.html?token=...: متابعة الدور بدون كشف طبي.

## السجل الطبي

### Patient Profile

لا يتم تحميل التاريخ الطبي بالكامل في طلب واحد. يبدأ النظام بـ:

~~~text
Basic Data
Current Case
Current Medications
Important Allergies
Latest Visit
Current Pregnancy
Next Follow-up
Important Alerts
~~~

الـTabs والـTimeline يتم تحميلها عند الحاجة مع Pagination وLoad More.

### الوحدات الطبية

| الوحدة | الوظيفة |
|---|---|
| Visits | زيارة مستقلة عن Appointment، Draft ثم Complete |
| Cases | أكثر من حالة للمريضة |
| Pregnancy | حمل مستقل ومتابعات ونتيجة ولادة |
| Medications | الجرعة والطريق والتكرار والمدة والسبب والحالة |
| Allergies | Substance وReaction وSeverity وStatus وNotes |
| Labs | Result وUnit وReference Range وAbnormal Flag وStatus |
| Ultrasound | حقول مناسبة لنوع السونار التوليدي أو سونار الحوض |
| Documents | PDF وصور وتقارير مرتبطة بالمريضة والحالة والزيارة |
| Progress | Previous وCurrent وDifference وTrend مع مراجعة الطبيب |
| Reports | Patient Summary وProgress وPregnancy وMedication وLab Trends |

### النماذج الطبية

اختيار الحقول مبني على نماذج وممارسات واقعية. التفاصيل موجودة في:

- [Patient History](docs/medical-forms/patient-history.md)
- [Gynecology Visit](docs/medical-forms/gynecology-visit.md)
- [Pregnancy Record](docs/medical-forms/pregnancy-record.md)
- [Antenatal Visit](docs/medical-forms/antenatal-visit.md)
- [Ultrasound Record](docs/medical-forms/ultrasound-record.md)
- [Medication Record](docs/medical-forms/medication-record.md)
- [Allergy and Lab Records](docs/medical-forms/allergy-lab-records.md)

الحقول تصنف إلى Required وOptional وConditional وAuto-calculated وRead-only. البيانات المستخدمة للبحث أو المقارنة أو الرسم تخزن Structured، والسرد السريري يبقى Free Text. النظام لا ينفذ Automatic Diagnosis.

## المعمارية

### Technology Stack

~~~text
Frontend: HTML5 + CSS3 + Vanilla JavaScript + Tailwind CSS + Custom CSS + RTL
Backend: Node.js + Express.js
Database: Microsoft SQL Server + mssql
API: REST + JSON + fetch
Realtime: Socket.IO / WebSocket مع fallback
Alerts: SweetAlert2
Reports: Browser Print وhtml2pdf.js
Environment: dotenv و.env
Hosting: Vercel حاليًا وقابل للنقل إلى VPS/Docker
~~~

### Backend Flow

~~~mermaid
flowchart LR
  Browser[Vanilla JS and fetch] --> Route[Express Route]
  Route --> Controller[Controller]
  Controller --> Service[Business Logic]
  Service --> Repository[SQL Repository]
  Repository --> SQL[(Microsoft SQL Server)]
  Service --> Audit[Audit Logs]
  Service --> RT[Realtime Events]
  Service --> Notify[Notification Service]
~~~

القواعد:

- Route للتوجيه فقط.
- Controller لمعالجة HTTP.
- Service للـBusiness Logic.
- Repository لاستعلامات SQL.
- server.js للتشغيل والتصدير فقط.
- لا توجد SQL Queries داخل Route Handlers.
- جميع اتصالات الواجهة تمر عبر API Service Layer.

### Frontend Structure

~~~text
public/
  index.html
  patient-booking.html
  patient-register.html
  queue-tracking.html
  css/
  js/
    core/
      api-service.js
      auth.js
      router.js
      ui.js
    pages/
      patients.js
      appointments.js
      queue.js
      visits.js
      pregnancy.js
      patient-portal.js
    services/
      public-booking-service.js
    public-booking.js
    patient-register.js

src/
  app.js
  config/
  db/
  middleware/
  routes/
  services/
  modules/
  realtime/
  jobs/
  utils/
~~~

## API

### Authentication وPatient Portal

| Method | Endpoint | Auth | الاستخدام |
|---|---|---|---|
| POST | /api/auth/login | Public | تسجيل الدخول |
| GET | /api/auth/me | Auth | المستخدم الحالي |
| POST | /api/auth/logout | Optional | إنهاء الجلسة |
| POST | /api/patient-portal/register | Public + Rate Limit | إنشاء حساب المريضة |
| GET | /api/public/booking/options | Public + Rate Limit | الأطباء والخدمات النشطة للحجز |
| GET | /api/public/booking/available-slots | Public + Rate Limit | المواعيد المتاحة بدون بيانات طبية |
| POST | /api/public/booking | Public + Rate Limit | إنشاء Patient مختصر وحجز ذري |
| GET | /api/patient-portal/summary | Patient | المواعيد والبيانات التشغيلية |
| POST | /api/appointments | Owner / Reception / Patient لحسابها فقط | إنشاء حجز من شاشة New Booking المشتركة |
| GET | /api/public/queue/:token | Public Token | متابعة الدور |

### مجموعات API

~~~text
/api/dashboard
/api/patients
/api/doctors
/api/appointments
/api/queue
/api/services
/api/pricing
/api/schedules
/api/visits
/api/cases
/api/pregnancies
/api/medications
/api/allergies
/api/labs
/api/ultrasounds
/api/documents
/api/progress
/api/reports
/api/notifications
/api/users
/api/settings
/api/audit
/api/medical-history
~~~

استجابة النجاح:

~~~json
{
  "success": true,
  "data": {},
  "meta": {}
}
~~~

استجابة الخطأ:

~~~json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "رسالة واضحة للمستخدم"
  }
}
~~~

## قاعدة البيانات

الجداول الرئيسية:

~~~text
Doctors
Users
Patients
Services
Pricing
DoctorSchedules
ScheduleExceptions
DoctorServices
Appointments
QueueEntries
DoctorPauses
MedicalCases
PatientAssignments
Visits
Pregnancies
PregnancyVisits
ObstetricHistory
PatientGyneHistories
Medications
Allergies
LabTests
Ultrasounds
Documents
ProgressIndicators
Notifications
Settings
AuditLogs
~~~

حقول تشغيل الحجز العام داخل `Patients`:

~~~text
RegistrationSource: reception | public_booking | patient_portal
ProfileStatus: incomplete | complete
~~~

ربط حساب المريضة:

~~~text
Users.PatientId -> Patients.Id
Users.Role = 'patient'
Unique filtered index on Users.PatientId
~~~

### الأداء

Indexes موجودة على:

- Patient Phone وNormalized Name.
- Doctor + Appointment Date + Status.
- Patient + Appointment Date.
- Queue Doctor + Queue Date + Position.
- Visits وMedications وLabs وUltrasounds حسب Patient والتاريخ.
- Audit Logs حسب Entity وEntityId والتاريخ.

لا يتم تحميل كل المرضى أو كل Timeline إلى المتصفح؛ القوائم تستخدم Pagination وFiltering وSorting وServer-side Search.

### Transactions وConcurrency

التسجيل والحجز والعمليات متعددة الكتابات تستخدم Transactions. الحجز يمنع Double Booking من الـBackend عبر فحص overlap وأقفال SQL.

## الأمان والخصوصية

- Authentication وSecure Session/JWT.
- Server-side Role Authorization.
- Password Hashing باستخدام bcryptjs.
- Zod Validation في Frontend وBackend.
- Parameterized SQL Queries لمنع SQL Injection.
- Helmet وCORS وCompression وRate Limiting.
- Audit Logs للعمليات الحساسة.
- لا يتم Hard Delete للتاريخ الطبي.
- لا يتم تسجيل Passwords أو Tokens أو Clinical Notes كاملة.
- Reception لا يحصل على Clinical Data حتى لو استدعى API مباشرة.
- رفع الملفات مقيد بالحجم وMIME Type واسم تخزين آمن.
- SQL Server يحتفظ بملفات Documents Metadata، وليس Base64.

### ملاحظة التسجيل بدون OTP

البريد والهاتف وسيلتا تعريف وليسا إثبات ملكية. لا ترسل تقارير أو نتائج طبية حساسة اعتمادًا على التسجيل وحده. رابط الدور العام يعرض بيانات تشغيلية محدودة فقط.

## الملفات والتخزين

الأنواع المدعومة: PDF وJPEG وPNG وWebP ضمن حد MAX_UPLOAD_BYTES.

Metadata المستند:

~~~text
PatientId
CaseId
VisitId
DocumentType
FileName
MimeType
FileSizeBytes
StoragePath
DocumentDate
UploadedBy
~~~

على Vercel، /tmp مؤقت. يجب ربط Object Storage دائم قبل تفعيل رفع الملفات الإنتاجي.

## Realtime والإشعارات

الأحداث الرئيسية:

~~~text
queue:updated
queue:recalculated
doctor:paused
doctor:resumed
appointment:updated
~~~

Notification Service مصمم للفصل بين الحدث والقناة:

~~~text
NotificationService
  ├── WhatsAppLinkProvider: wa.me وwhatsapp://
  ├── WhatsAppApiProvider: مستقبلًا
  └── SmsProvider: مستقبلًا
~~~

يجب تطبيق Threshold لتغيّر Estimated Time، مثل 10 إلى 15 دقيقة، بدل إرسال إشعار لكل تغيير صغير.

## التشغيل المحلي

### المتطلبات

- Node.js 20 أو أحدث.
- SQL Server متاح.
- صلاحية إنشاء الجداول والفهارس.

### التثبيت

~~~powershell
npm install
Copy-Item .env.example .env
# ضع الأسرار في .env ولا ترفعها إلى Git
npm run db:migrate
npm run db:seed
npm run build:css
npm start
~~~

افتح:

~~~text
http://localhost:3000
~~~

### الاختبارات

~~~powershell
npm test
npm run check
npm run build:css
~~~

### Environment Variables

راجع .env.example واستخدم:

~~~text
NODE_ENV
PORT
APP_ORIGIN
CLINIC_TIME_ZONE
JWT_SECRET
JWT_EXPIRES_IN
COOKIE_SECURE
DB_SERVER
DB_DATABASE
DB_USER
DB_PASSWORD
DB_ENCRYPT
DB_TRUST_SERVER_CERTIFICATE
DB_MULTIPLE_ACTIVE_RESULT_SETS
DB_POOL_MAX
DB_POOL_MIN
DB_POOL_IDLE_TIMEOUT
UPLOAD_DIR
MAX_UPLOAD_BYTES
LOG_LEVEL
SEED_OWNER_EMAIL
SEED_OWNER_PASSWORD
SEED_DOCTOR_PASSWORD
SEED_RECEPTION_PASSWORD
~~~

لا تضع Database Password أو API Keys أو JWT Secret داخل Git أو Public JavaScript.

## النشر على Vercel

~~~mermaid
flowchart TD
  User[User] --> Vercel[Vercel]
  Vercel --> Static[HTML CSS ESM JavaScript]
  Vercel --> Function[Express Serverless Function]
  Function --> SQL[(Remote SQL Server)]
  Function --> Storage[Object Storage مستقبلًا]
~~~

ملف vercel.json يوجه Static assets من public وServerless Function من server.js.

قبل النشر:

1. npm test.
2. npm run check.
3. npm run build:css.
4. npm run db:migrate.
5. اختبر /api/health.
6. اختبر /patient-register.html.
7. تأكد أن Browser JavaScript يستخدم import ولا يحتوي require.
8. اختبر 400 للبيانات غير الصحيحة و409 للتكرار.
9. راجع Environment Variables في Vercel.

لا تستخدم Tailwind CDN في الإنتاج؛ CSS مبني محليًا عبر Tailwind CLI.

## اختبار التسجيل

~~~json
{
  "fullName": "Sara Ahmed",
  "dateOfBirth": "1992-04-12",
  "phone": "01012345678",
  "email": "sara@example.com",
  "password": "ChangeMe!123",
  "confirmPassword": "ChangeMe!123",
  "preferredContactChannel": "whatsapp",
  "consent": true
}
~~~

~~~text
POST /api/patient-portal/register
Content-Type: application/json
~~~

| الحالة | HTTP | Code |
|---|---:|---|
| بيانات غير صحيحة أو Consent ناقص | 400 | VALIDATION_ERROR |
| البريد موجود | 409 | EMAIL_EXISTS |
| الهاتف أو الاسم + تاريخ الميلاد موجود | 409 | PATIENT_EXISTS |
| Patient User غير مربوط بسجل | 403 | PATIENT_ACCOUNT_UNLINKED |
| طلب Portal بدون Session | 401 | UNAUTHENTICATED |

## Troubleshooting

### Vercel يرجع FUNCTION_INVOCATION_FAILED

راجع:

1. Function Logs.
2. DB Environment Variables.
3. JWT_SECRET.
4. اتصال Vercel بـSQL Server.
5. نجاح npm run db:migrate.
6. /api/health قبل اختبار الصفحات.

### require is not defined

ملف Browser تم تحميله كCommonJS. استخدم ES Modules وscript type=module، وتأكد من Routes ملفات public/js.

### تحذير Tailwind CDN

شغّل npm run build:css وتأكد أن الصفحة تستخدم public/css/tailwind.css المحلي.

### PATIENT_ACCOUNT_UNLINKED

اربط Users.PatientId بسجل المريضة الصحيح من Users & Roles، أو استخدم Patient Registration لإنشاء Patient وUser معًا.

### Reception يرى بيانات طبية

راجع Role وPermission والـBackend endpoint. يجب أن يرجع 403 عند عدم وجود medical:view.

## ما تم تنفيذه

- Multi-doctor clinic operations.
- Patients وAssignments.
- Doctors وSchedules.
- Services وPricing.
- Appointments وPhone Booking وWalk-in.
- Queue وReorder وPause/Resume.
- Dynamic Estimated Waiting Time.
- Visits منفصلة عن Appointments.
- Cases وPregnancy.
- Medications وAllergies وLabs وUltrasound.
- Documents وProgress وReports.
- Notifications وAudit Logs.
- Patient Registration بدون OTP.
- Public Guest Booking بدون Login أو OTP، مع ربط الحساب لاحقًا.
- Patient Portal للمواعيد ومتابعة الدور والحجز الذاتي من نفس شاشة New Booking.
- واجهة عربية RTL مع أيقونات موحدة للـSidebar وروابط الإجراءات وSweetAlert2 للتأكيدات.
- Patient self-booking permission منفصلة عن `appointments:manage`، مع تثبيت هوية المريضة من الـJWT.
- Vercel static/serverless deployment.
- Local production Tailwind build.
- Tests للصلاحيات والـWaiting Time والـMedical Validation والتسجيل.

## الحدود الحالية

- Public booking وPatient self-booking مفعّلان؛ أما إلغاء المريضة لموعدها ذاتيًا فيحتاج تفعيل Policy وصلاحية مستقلة قبل فتحه.
- Email/Phone verification غير موجود لأن التسجيل بدون OTP.
- SMS وWhatsApp Business API يحتاجان Provider فعلي.
- Object Storage دائم مطلوب لملفات Vercel.
- Jobs الثقيلة تحتاج Worker مستقلًا.
- PDF Server-side يمكن إضافته للتقارير الكبيرة.
- WebSocket دائم يحتاج VPS أو Realtime Provider.
- E2E Tests يمكن توسيعها لمسار الحجز الكامل.

## Definition of Done

كل Module يجب أن يحتوي على:

- Route وAPI.
- Controller وService وRepository.
- Frontend وBackend Validation.
- Loading وEmpty وError States.
- Pagination وSearch عند الحاجة.
- Server-side Permissions.
- Audit Log للعملية الحساسة.
- Responsive UI.
- Unit/Integration Tests.
- توثيق Workflow والحقول الطبية.

## خريطة الملفات

~~~text
server.js
src/app.js
src/config/
src/db/
src/middleware/
src/routes/
src/services/
src/modules/
public/index.html
public/patient-register.html
public/queue-tracking.html
public/css/
public/js/core/
public/js/pages/
database/schema.sql
scripts/migrate.js
scripts/seed.js
vercel.json
docs/PROJECT_GUIDE.md
docs/medical-forms/
~~~

هذا README يشرح النظام بالكامل على مستوى التشغيل والتقنية. أما docs/PROJECT_GUIDE.md فيحتوي على نسخة موسعة من الـflows والقرارات وقواعد التشغيل.
