# Antenatal follow-up visit

## Workflow

يفتح الطبيب الزيارة من Appointment/Queue، يرى ملخص الحمل والحساسية والأدوية، ثم يسجل القياسات التي أُخذت فعليًا. الحقول غير المنطبقة لا تظهر ولا تُحفظ كأصفار.

## Core encounter fields

Chief concern، relevant symptoms، examination summary، assessment، diagnosis، treatment plan، follow-up plan، next recommended date. هذه نصوص سريرية للطبيب وليست حقولًا للـReception.

## Maternal observations

| Field | Type | Required | Behavior |
|---|---|---:|---|
| Weight | kg decimal | Optional | يظهر trend عندما يتكرر |
| Blood pressure | systolic/diastolic mmHg | Optional | زوج رقمي؛ يراجع الطبيب القيم غير الطبيعية |
| Pulse | bpm | Optional | فقط إذا قيس |
| Temperature | °C | Optional | فقط إذا قيس |
| Urine protein | Enum | Optional/conditional | Negative / Trace / + / ++ / +++ / Not done |
| Edema | Enum | Optional | None / Mild / Moderate / Severe / Not assessed |
| Symptoms/concerns | Structured checklist + notes | Optional | مثل headache, visual symptoms, bleeding, abdominal pain, fluid loss, reduced movements |

## Fetal / pregnancy observations

| Field | Type | Required | Behavior |
|---|---|---:|---|
| Gestational age | Auto-calculated weeks+days | Read-only | من EDD أو LMP وتاريخ الزيارة |
| Fetal heart rate | bpm | Conditional | عندما يكون قابلًا للتقييم في هذه المرحلة |
| Fetal movements concern | Enum | Conditional | No concern / Concern reported / Not assessed; after 24 weeks يطلب الطبيب التقييم عند وجود قلق |
| Symphysis-fundal height | cm | Conditional | يظهر بعد 24 أسبوعًا في الحمل المفرد ما لم يكن هناك growth scan متكرر |
| Presentation/lie | Enum | Conditional | عندما تكون المرحلة أو الفحص مناسبة |
| Risk assessment outcome | Enum + notes | Optional | Routine / Needs review / Refer; لا يصدر النظام تشخيصًا آليًا |
| Linked labs/ultrasound | Relations | Optional | اختيار نتائج موجودة بدل إعادة كتابة التقرير |

## Why these fields

WHO يذكر قياس الضغط والوزن وفحص proteinuria وسماع نبض الجنين ضمن الممارسات الأساسية، وNICE يوصي بـurine protein في كل موعد حضوري وقياس fundal height بعد 24 أسبوعًا للحمل المفرد. تم جعلها conditional حتى لا يملأ الطبيب قياسات غير منطبقة، وإضافة symptoms/risk review وفق أهداف المتابعة الواقعية.
