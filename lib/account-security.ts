import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from "firebase/auth"

export const MIN_PASSWORD_LENGTH = 8

export type PasswordValidationError =
  | "missing-current-password"
  | "weak-password"
  | "password-mismatch"
  | null

export function validatePasswordChangeInput(
  currentPassword: string,
  newPassword: string,
  confirmation: string
): PasswordValidationError {
  if (!currentPassword.trim()) return "missing-current-password"
  if (newPassword.length < MIN_PASSWORD_LENGTH) return "weak-password"
  if (newPassword !== confirmation) return "password-mismatch"
  return null
}

export function getPasswordChangeErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : ""

  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "كلمة المرور الحالية غير صحيحة"
    case "auth/requires-recent-login":
      return "انتهت جلسة التحقق. يرجى تسجيل الدخول من جديد ثم المحاولة"
    case "auth/weak-password":
      return "كلمة المرور الجديدة ضعيفة. استخدم 8 أحرف على الأقل"
    case "auth/network-request-failed":
      return "تعذر الاتصال بالخدمة. تحقق من الإنترنت وحاول مرة أخرى"
    case "auth/too-many-requests":
      return "تمت محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى"
    case "auth/no-current-user":
      return "انتهت جلسة الدخول. يرجى تسجيل الدخول من جديد"
    case "auth/missing-email":
      return "لا يوجد اعتماد بريد وكلمة مرور مرتبط بهذا الحساب"
    default:
      return "تعذر تغيير كلمة المرور. حاول مرة أخرى"
  }
}

export function assertNewPasswordPolicy(newPassword: string): void {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw Object.assign(new Error(`Password must contain at least ${MIN_PASSWORD_LENGTH} characters`), {
      code: "auth/weak-password",
    })
  }
}

function requireEmail(user: User): string {
  if (!user.email) {
    throw Object.assign(new Error("No email/password credential is linked to this account"), {
      code: "auth/missing-email",
    })
  }
  return user.email
}

export async function reauthenticateUser(
  user: User,
  currentPassword: string
): Promise<void> {
  const email = requireEmail(user)
  const credential = EmailAuthProvider.credential(email, currentPassword)
  await reauthenticateWithCredential(user, credential)
}

export async function updateUserPassword(user: User, newPassword: string): Promise<void> {
  assertNewPasswordPolicy(newPassword)
  await updatePassword(user, newPassword)
}

export async function changeUserPassword(
  user: User,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  assertNewPasswordPolicy(newPassword)
  await reauthenticateUser(user, currentPassword)
  await updateUserPassword(user, newPassword)
}
