import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-6 text-center text-white">
      <div>
        <p className="text-sm font-semibold text-sky-400">404</p>
        <h1 className="mt-3 text-3xl font-bold">الصفحة غير موجودة</h1>
        <p className="mt-3 text-slate-300">عذراً، تعذر العثور على الصفحة المطلوبة.</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-sky-600 px-5 py-3 font-semibold transition-colors hover:bg-sky-500"
        >
          العودة إلى لوحة التحكم
        </Link>
      </div>
    </main>
  );
}
