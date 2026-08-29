type FirebaseAuthError = {
  code?: unknown
}

function getFirebaseErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return ""
  }
  return String((error as FirebaseAuthError).code ?? "")
}

export function getLoginErrorMessage(error: unknown): string {
  switch (getFirebaseErrorCode(error)) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة. إذا كنت غيّرت كلمة المرور، استخدم خيار إعادة التعيين أدناه"
    case "auth/user-disabled":
      return "هذا الحساب معطّل. تواصل مع مسؤول Firebase لإعادة تفعيله"
    case "auth/invalid-email":
      return "البريد الإلكتروني غير صالح"
    case "auth/too-many-requests":
      return "تم حظر المحاولات مؤقتًا بسبب كثرتها. انتظر قليلًا ثم حاول مرة أخرى أو استخدم إعادة تعيين كلمة المرور"
    case "auth/network-request-failed":
      return "تعذر الاتصال بخدمة المصادقة. تحقق من الإنترنت وحاول مرة أخرى"
    case "auth/operation-not-allowed":
      return "تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في مشروع Firebase"
    case "auth/invalid-api-key":
      return "إعدادات Firebase غير صالحة في النسخة المنشورة"
    case "auth/app-deleted":
      return "تطبيق Firebase غير متاح حاليًا. تحقق من إعدادات المشروع"
    default: {
      const code = getFirebaseErrorCode(error)
      return code ? `تعذر تسجيل الدخول (رمز الخطأ: ${code})` : "تعذر تسجيل الدخول. حاول مرة أخرى"
    }
  }
}

export function getPasswordResetErrorMessage(error: unknown): string {
  switch (getFirebaseErrorCode(error)) {
    case "auth/invalid-email":
      return "أدخل بريدًا إلكترونيًا صالحًا"
    case "auth/user-not-found":
      return "لا يوجد حساب مرتبط بهذا البريد الإلكتروني"
    case "auth/too-many-requests":
      return "تم طلب رسائل كثيرة. انتظر قليلًا ثم حاول مرة أخرى"
    case "auth/network-request-failed":
      return "تعذر الاتصال بخدمة المصادقة. تحقق من الإنترنت وحاول مرة أخرى"
    case "auth/operation-not-allowed":
      return "إعادة تعيين كلمة المرور غير مفعّلة في مشروع Firebase"
    default: {
      const code = getFirebaseErrorCode(error)
      return code ? `تعذر إرسال رابط إعادة التعيين (رمز الخطأ: ${code})` : "تعذر إرسال رابط إعادة التعيين. حاول مرة أخرى"
    }
  }
}
