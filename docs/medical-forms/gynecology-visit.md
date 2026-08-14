# Gynecology consultation

## Purpose

نموذج زيارة نسائية يختلف عن متابعة الحمل. يعرض symptom-specific prompts حسب سبب الزيارة، مع قسم سردي للطبيب بدل أسئلة لا تستخدم.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| Visit reason/chief complaint | Text/enum | Yes | يحدد prompts المناسبة |
| Symptom onset and course | Text | Conditional | لا يظهر إلا عند وجود symptom |
| Symptom set | Structured | Conditional | pelvic pain, abnormal bleeding, discharge, urinary symptoms, menopausal symptoms |
| LMP and pregnancy possibility | Date/enum | Conditional | عند النزف/الألم/احتمال الحمل |
| Relevant gynecologic history | Read-only summary + addendum | Optional | لا يكرر البيانات |
| Examination performed | Structured checklist + narrative | Optional | general/external/pelvic/breast only when performed |
| Tests ordered | Relations | Optional | يربط Labs/Ultrasound بدل free text |
| Assessment/diagnoses | Structured diagnosis + narrative | Optional | للطبيب فقط |
| Treatment and follow-up | Text/date | Optional | قرار الطبيب |

## Why these fields

Merck يحدد أن التاريخ النسائي يبدأ بالسبب والأعراض، ثم menstrual/sexual/urinary and previous conditions/treatments. وACOG يوضح أن الفحص الحوضي ليس تلقائيًا لكل زيارة، لذلك لا يظهر كـrequired field؛ يسجل فقط ما تم فعليًا.
