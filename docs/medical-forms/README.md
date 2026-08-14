# Medical form design record

هذه الملفات هي سجل تصميم النماذج الطبية، وليست بروتوكولًا علاجيًا. صُممت النماذج لتسجيل ما يحدث في زيارة عيادة نساء وتوليد بصورة مختصرة وقابلة للبحث، مع ترك القرار السريري للطبيب وعدم بناء تشخيص آلي.

## طريقة اختيار الحقول

اعتمد التصميم على أربعة أنواع من المصادر:

1. إرشادات الرعاية السابقة للولادة من WHO وNICE لتحديد القياسات المتكررة في متابعة الحمل.
2. مراجع التاريخ النسائي والتوليدي من ACOG وMerck Manual لتحديد ما يُسأل عنه عند الحاجة.
3. معايير AIUM/ACR/ACOG لتقسيم تقرير السونار إلى فحص توليدي أو حوض نسائي بدل نموذج واحد عام.
4. نماذج البيانات الواقعية/التشغيلية مثل NHS Maternity Services Data Set وموارد HL7 FHIR لتحديد العلاقات بين المريضة والزيارة والملاحظة والتقرير والدواء والحساسية.

## قواعد تنفيذ مشتركة

- `Required`: لا يمكن حفظ النموذج بدونه.
- `Optional`: يخزن عند توفره أو الحاجة إليه.
- `Conditional`: يظهر حسب نوع الزيارة أو الحالة أو مرحلة الحمل.
- `Auto-calculated`: يحسب من بيانات موثقة ولا يعاد إدخاله يدويًا.
- `Read-only`: يعرض من سجل مرتبط ولا يكرر الإدخال.
- النص الحر يقتصر على السرد السريري، بينما القيم المستخدمة للبحث أو المقارنة تخزن في أعمدة مهيكلة.
- Reception لا يفتح هذه النماذج؛ الـBackend يطبق الصلاحية حتى لو استُدعيت الواجهة مباشرة.

## مصادر مرجعية

- [WHO recommendations on antenatal care](https://iris.who.int/bitstream/10665/250796/1/9789241549912-eng.pdf)
- [NICE NG201 Antenatal care](https://www.nice.org.uk/guidance/ng201/chapter/recommendations)
- [ACOG: The Initial Reproductive Health Visit](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/10/the-initial-reproductive-health-visit)
- [Merck Manual: Obstetric and Gynecologic History](https://www.merckmanuals.com/professional/gynecology-and-obstetrics/approach-to-the-gynecologic-patient/obstetric-and-gynecologic-history)
- [NHS Maternity Services Data Set](https://digital.nhs.uk/data-and-information/data-collections-and-data-sets/data-sets/maternity-services-data-set)
- [AIUM Obstetric Practice Parameter](https://www.aium.org/resources/practice-parameters/obstetric-%28standard%29)
- [ACR/ACOG/AIUM/SRU Female Pelvis Practice Parameter](https://www.acr.org/-/media/ACR/Files/Practice-Parameters/US-Pelvis.pdf)
- [HL7 FHIR Resource Guide](https://fhir.hl7.org/fhir/resourceguide.html)
