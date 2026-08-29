import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  credential: vi.fn(() => ({ providerId: "password" })),
  reauthenticateWithCredential: vi.fn(),
  updatePassword: vi.fn(),
}))

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: { credential: mocks.credential },
  reauthenticateWithCredential: mocks.reauthenticateWithCredential,
  updatePassword: mocks.updatePassword,
}))

import {
  changeUserPassword,
  getPasswordChangeErrorMessage,
  validatePasswordChangeInput,
} from "./account-security"

describe("password change validation", () => {
  it("requires the current password", () => {
    expect(validatePasswordChangeInput("", "new-password", "new-password")).toBe(
      "missing-current-password"
    )
  })

  it("requires a new password with at least eight characters", () => {
    expect(validatePasswordChangeInput("old-password", "short", "short")).toBe(
      "weak-password"
    )
  })

  it("requires confirmation to match", () => {
    expect(
      validatePasswordChangeInput("old-password", "new-password", "different-password")
    ).toBe("password-mismatch")
  })

  it("accepts a valid password change", () => {
    expect(
      validatePasswordChangeInput("old-password", "new-password", "new-password")
    ).toBeNull()
  })
})

describe("password change errors", () => {
  it("maps invalid credentials to an Arabic message", () => {
    expect(getPasswordChangeErrorMessage({ code: "auth/invalid-credential" })).toBe(
      "كلمة المرور الحالية غير صحيحة"
    )
  })

  it("maps recent-login errors to a reauthentication message", () => {
    expect(getPasswordChangeErrorMessage({ code: "auth/requires-recent-login" })).toContain(
      "تسجيل الدخول من جديد"
    )
  })
})

describe("changeUserPassword", () => {
  const user = { email: "admin@example.com" } as Parameters<typeof changeUserPassword>[0]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reauthenticates with the old password before updating to the new one", async () => {
    await changeUserPassword(user, "old-password", "new-password")

    expect(mocks.credential).toHaveBeenCalledWith("admin@example.com", "old-password")
    expect(mocks.reauthenticateWithCredential).toHaveBeenCalledWith(user, { providerId: "password" })
    expect(mocks.updatePassword).toHaveBeenCalledWith(user, "new-password")
  })

  it("does not update the password when reauthentication fails", async () => {
    mocks.reauthenticateWithCredential.mockRejectedValueOnce({ code: "auth/invalid-credential" })

    await expect(changeUserPassword(user, "wrong-password", "new-password")).rejects.toMatchObject({
      code: "auth/invalid-credential",
    })
    expect(mocks.updatePassword).not.toHaveBeenCalled()
  })
})
