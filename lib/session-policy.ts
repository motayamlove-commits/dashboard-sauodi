export type SessionStatus = "active" | "revoked"

export function isSessionActive(session: { status?: SessionStatus }): boolean {
  return session.status !== "revoked"
}

export function getOtherActiveSessionIds(
  sessions: Array<{ sessionId: string; status?: SessionStatus }>,
  currentSessionId: string
): string[] {
  return sessions
    .filter((session) => session.sessionId !== currentSessionId && isSessionActive(session))
    .map((session) => session.sessionId)
}
