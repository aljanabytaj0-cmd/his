# دليل الإعداد — نظام إدارة المستشفى (المرحلة 1)

## ما تم بناؤه في هذه المرحلة
- صفحة تسجيل دخول (`index.html`)
- لوحة تحكم رئيسية مع إحصائيات حية (`dashboard.html`)
- وحدة **المرضى والملفات الطبية** كاملة: تسجيل، بحث، عرض، وسجل زيارات (`patients.html`)
- نظام صلاحيات حسب الدور (admin, reception, nurse, doctor, pharmacist, lab, accountant, hr)
- قواعد أمان Firestore أساسية (`firestore.rules`)

## خطوات التشغيل

### 1. عبّي بيانات Firebase
افتح `assets/js/firebase-config.js` وعوّض القيم بالبيانات التي نسختها من Firebase Console.

### 2. أنشئ أول حساب أدمن
بما إن النظام يمنع أي كتابة قبل وجود ملف موظف بدور "admin"، سوّي الخطوات التالية **يدوياً من Firebase Console** أول مرة فقط:

1. **Authentication → Users → Add user** → أدخل إيميلك وكلمة مرور
2. انسخ الـ **User UID** الذي يظهر بجدول المستخدمين
3. **Firestore Database → Start collection** → اسم المجموعة: `employees`
4. أنشئ مستند (document) بمعرّف (Document ID) = نفس الـ UID اللي نسخته، وأضف الحقول:
   ```
   name: "اسمك الكامل"        (string)
   role: "admin"              (string)
   active: true                (boolean)
   hospitalName: "اسم المستشفى" (string)
   ```
5. احفظ

الآن تكدر تسجل دخول بهذا الحساب من `index.html` وتوصل للوحة التحكم بكامل الصلاحيات.

### 3. طبّق قواعد الأمان
من Firebase Console → Firestore Database → Rules، الصق محتوى ملف `firestore.rules` واضغط Publish.
(أو عبر Firebase CLI: `firebase deploy --only firestore:rules`)

### 4. النشر على GitHub Pages (اختياري، بنفس أسلوب مشاريعك السابقة)
```bash
git init
git add .
git commit -m "المرحلة 1: الأساس + وحدة المرضى"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```
بعدها فعّل GitHub Pages من إعدادات المستودع (Settings → Pages → Branch: main).

## إضافة موظفين آخرين لاحقاً
كأدمن، بعد ما نبني وحدة "الموارد البشرية" رح يصير عندك واجهة لإضافة الموظفين مباشرة (تنشئ حساب Auth + ملف employee تلقائياً). حالياً وبمرحلة التأسيس، الإضافة تصير يدوياً بنفس طريقة خطوة 2 أعلاه.

## الوحدات القادمة (حسب الأولوية المتفق عليها)
1. ✅ تسجيل المرضى والملفات الطبية
2. ⬜ المواعيد والحجوزات
3. ⬜ الطوارئ والأسرّة
4. ⬜ الصيدلية والمخزون
5. ⬜ المختبر والأشعة
6. ⬜ الفوترة والحسابات المالية
7. ⬜ الموارد البشرية
8. ⬜ التقارير الشهرية

كل وحدة رح نبنيها بمحادثة/جلسة منفصلة نفس أسلوب هذه، وتترابط تلقائياً مع نفس نظام تسجيل الدخول والصلاحيات والقائمة الجانبية.

