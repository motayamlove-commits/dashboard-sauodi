import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
}))

vi.mock("firebase/auth", () => ({
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}))

import { sendPasswordReset } from "./password-reset"

describe("sendPasswordReset", () => {
  const auth = {} as Parameters<typeof sendPasswordReset>[0]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("trims the email and delegates to Firebase", async () => {
    await sendPasswordReset(auth, "  bcare@mhmd.com  ")
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(auth, "bcare@mhmd.com")
  })

  it("rejects an empty email before contacting Firebase", async () => {
    await expect(sendPasswordReset(auth, "   ")).rejects.toMatchObject({
      code: "auth/invalid-email",
    })
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it("propagates Firebase reset failures for the UI to explain", async () => {
    mocks.sendPasswordResetEmail.mockRejectedValueOnce({ code: "auth/too-many-requests" })
    await expect(sendPasswordReset(auth, "bcare@mhmd.com")).rejects.toMatchObject({
      code: "auth/too-many-requests",
    })
  })
})
