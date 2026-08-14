# Ultrasound record

## Workflow

يختار المستخدم نوع الفحص أولًا. بعدها تظهر مجموعة الحقول الخاصة بذلك النوع. التقرير يحتوي على قياسات شائعة قابلة للبحث، و`findings`/`impression` كسرد تخصصي، والمرفقات كـmetadata لا Base64.

## Common fields

Date، performed by، case، indication، technique (transabdominal/transvaginal/other)، study status، measurements، findings، impression، attachment(s).

## Obstetric ultrasound (conditional fields)

Gestational age، fetal count، fetal heart rate، CRL، BPD، HC، AC، FL، estimated fetal weight، placenta site/appearance، amniotic fluid assessment، presentation، cervix length when measured، anatomy summary، impression. لا تظهر biometry إذا لم تكن جزءًا من الفحص.

## Gynecologic pelvic ultrasound (conditional fields)

Uterus dimensions/orientation، myometrium، endometrial thickness، endometrial appearance، IUD location if present، right/left ovary dimensions and morphology، adnexa، free fluid، impression. لا نضع O-RADS rating كحقل إلزامي؛ يمكن للطبيب إدخاله عند انطباقه.

## Why these fields

AIUM يحدد الحد الأدنى لتسجيل الفحص التوليدي، بينما معيار ACR/ACOG/AIUM/SRU للحوض يقسم التقييم إلى الرحم وبطانة الرحم والملحقات/المبايض والـcul-de-sac. لذلك لا يستخدم النظام حقلًا عامًا باسم “Ultrasound result” فقط، ولا يطلب قياسات غير منطبقة على نوع الفحص.
