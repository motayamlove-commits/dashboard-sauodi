import { sendPasswordResetEmail, type Auth } from "firebase/auth"

export async function sendPasswordReset(auth: Auth, email: string): Promise<void> {
  const normalizedEmail = email.trim()
  if (!normalizedEmail) {
    throw Object.assign(new Error("Email is required"), { code: "auth/invalid-email" })
  }

  await sendPasswordResetEmail(auth, normalizedEmail)
}
