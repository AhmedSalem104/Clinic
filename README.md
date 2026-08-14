# Clinic Management System

نظام إدارة عيادة نساء وتوليد متعددة الأطباء، مبني على HTML/CSS/Vanilla JavaScript وNode.js/Express وMicrosoft SQL Server.

## التشغيل

1. انسخ `.env.example` إلى `.env` وضع بيانات SQL Server في متغيرات البيئة فقط.
2. ثبّت الحزم: `npm install`.
3. أنشئ الجداول: `npm run db:migrate`.
4. أنشئ مستخدم المالك والبيانات التجريبية: `npm run db:seed`.
5. شغّل التطبيق: `npm run dev` أو `npm start`.
6. افتح `http://localhost:3000`.

بيانات المستخدم التجريبية الافتراضية بعد `seed`:

- المالك: `owner@clinic.local`
- الطبيب: `doctor1@clinic.local`
- الاستقبال: `reception@clinic.local`
- كلمة المرور الافتراضية للحسابات الجديدة: `ChangeMe!123`

غيّر كلمات المرور فورًا في بيئة حقيقية. يضبط `CLINIC_TIME_ZONE` افتراضيًا على `Africa/Cairo` حتى تتطابق جداول العمل مع توقيت العيادة، ويمكن تغييره من البيئة.

## البنية

- `src/modules`: وحدات المجال بطبقات route/controller/service/repository.
- `src/db`: اتصال SQL Server وعمليات الترحيل.
- `public/js`: واجهة Vanilla JS مقسمة حسب الوحدات، مع API service layer.
- `database/schema.sql`: جداول وفهارس النظام.
- `scripts`: migration وseed.
- `docs/medical-forms`: توثيق الحقول الطبية المختارة ومراجع نماذج النساء والتوليد.

## التشغيل الموجود

يشمل الإصدار وحدات المرضى والتخصيصات والأطباء والجداول والخدمات والأسعار والحجوزات والطابور والحالات والزيارات والحمل والتاريخ النسائي/الولادي والأدوية والحساسيات والتحاليل والسونار والمستندات والتطور والتقارير والإشعارات والمستخدمين والإعدادات وسجل التدقيق.

كل حجز يولّد رابط متابعة عامًا آمنًا في `/queue-tracking.html?token=...`، مع تحديثات Socket.IO وfallback دوري. لا تظهر البيانات الطبية في هذا الرابط.

التطبيق لا يضع أسرارًا في الواجهة أو المستودع. الملفات الطبية تحفظ كـmetadata في SQL Server، بينما ملف التخزين قابل للنقل إلى object storage لاحقًا. على Vercel يستخدم النظام `/tmp` كحل مؤقت حتى تعمل Serverless Function؛ يجب ضبط Object Storage دائم قبل تفعيل رفع مستندات الإنتاج.

## ملاحظات النشر

يعمل Express على Vercel عبر `vercel.json`. Socket.IO يحتاج بيئة تشغيل طويلة الاتصال (VPS/Docker أو مزود WebSocket) في الإنتاج؛ الواجهة تحتوي على fallback آمن لإعادة التحقق عند الحاجة.
