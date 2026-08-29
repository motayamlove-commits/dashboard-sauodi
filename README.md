# dashboard-sauodi

المصدر الحالي للوحة تحكم BCare، مبني باستخدام Next.js وReact وTypeScript وFirebase Authentication وFirestore.

## التشغيل المحلي

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## التحقق والبناء

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm run build
```

## متغيرات البيئة

يحتاج التطبيق إلى قيم Firebase التالية في ملف `.env.local`:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

لا يحتوي هذا المستودع على ملفات البيئة الفعلية أو بيانات اعتماد قواعد البيانات. يجب إدخال القيم من إعدادات مشروع Firebase الخاص بك، والتأكد من ضبط قواعد Authentication وFirestore قبل التشغيل.

## بنية المشروع

- `app/`: صفحات Next.js ومسارات API.
- `components/`: مكونات الواجهة، بما فيها الإعدادات والجلسات.
- `lib/`: تكامل Firebase ومنطق المصادقة وتغيير كلمة المرور وإبطال الجلسات.
- `public/`: الأصول العامة المستخدمة في الواجهة.
