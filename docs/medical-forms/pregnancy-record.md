# Pregnancy record and obstetric history

## Purpose

كل حمل سجل مستقل مرتبط بالمريضة، حتى لا تختلط بيانات حمل 2026 بتاريخ حمل سابق. السجل مناسب للعيادة ولا يحاول أن يكون بديلًا عن ملف المستشفى أو سجل الولادة الكامل.

## Pregnancy header

| Field | Type | Required | Notes |
|---|---|---:|---|
| LMP | Date | Conditional | مطلوب إذا كان معروفًا أو يحدد الطبيب طريقة أخرى لـEDD |
| EDD | Date | Yes after confirmation | يحسب تلقائيًا من LMP أو يسجل كتاريخ متفق عليه من السونار |
| EDD method | Enum | Yes after confirmation | LMP / Early ultrasound / Other clinician assessment |
| Pregnancy number | Integer | Optional | رقم الحمل حسب التاريخ المتاح |
| Gravida / Para / Abortions / Living children | Integers | Optional | snapshot عند التسجيل؛ لا تعدل التاريخ السابق بصمت |
| Singleton/multiple | Enum | Optional | Unknown / Singleton / Multiple |
| Risk factors | Structured coded list + notes | Optional | عوامل الخطر يراجعها الطبيب |
| Assigned doctor | Relation | Yes | Primary أو case assignment |

## Previous pregnancy outcome (repeatable)

Year/date، outcome (live birth/stillbirth/miscarriage/termination/ectopic/other)، gestational age if known، mode of delivery، major complication، birth weight if known، notes. لا تُجبر المريضة على ملء قيم غير متاحة.

## Birth outcome

Date، hospital، delivery type، outcome، complications، notes، postpartum plan، and case close date. بيانات الطفل التفصيلية خارج نطاق النسخة الأولى وتضاف فقط إذا اعتمدتها العيادة.

## Why these fields

الحقول تتوافق مع عناصر الحجز والتاريخ التوليدي في NHS MSDS، ومبدأ تقييم عوامل الخطر في NICE، مع الاحتفاظ بالبساطة التشغيلية. Gravida/Para وغيرها snapshots وليست بديلًا عن صفوف outcomes السابقة.
