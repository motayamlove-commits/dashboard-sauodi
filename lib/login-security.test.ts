import { describe, expect, it } from "vitest"
import { getLoginErrorMessage, getPasswordResetErrorMessage } from "./login-security"

describe("login security messages", () => {
  it("explains invalid credentials and points to password reset", () => {
    expect(getLoginErrorMessage({ code: "auth/invalid-credential" })).toContain("إعادة التعيين")
    expect(getLoginErrorMessage({ code: "auth/wrong-password" })).toContain("غير صحيحة")
    expect(getLoginErrorMessage({ code: "auth/user-not-found" })).toContain("غير صحيحة")
  })

  it("distinguishes disabled accounts and disabled providers", () => {
    expect(getLoginErrorMessage({ code: "auth/user-disabled" })).toContain("معطّل")
    expect(getLoginErrorMessage({ code: "auth/operation-not-allowed" })).toContain("غير مفعّل")
  })

  it("reports throttling and network failures clearly", () => {
    expect(getLoginErrorMessage({ code: "auth/too-many-requests" })).toContain("مؤقتًا")
    expect(getLoginErrorMessage({ code: "auth/network-request-failed" })).toContain("الاتصال")
  })

  it("keeps unknown Firebase codes visible for diagnosis", () => {
    expect(getLoginErrorMessage({ code: "auth/some-new-error" })).toContain("auth/some-new-error")
    expect(getLoginErrorMessage(new Error("unknown"))).toContain("تعذر تسجيل الدخول")
  })

  it("maps password reset failures without exposing credentials", () => {
    expect(getPasswordResetErrorMessage({ code: "auth/invalid-email" })).toContain("صالحًا")
    expect(getPasswordResetErrorMessage({ code: "auth/user-not-found" })).toContain("لا يوجد حساب")
    expect(getPasswordResetErrorMessage({ code: "auth/too-many-requests" })).toContain("رسائل كثيرة")
  })
})
