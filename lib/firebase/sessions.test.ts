import { beforeEach, describe, expect, it, vi } from "vitest"

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(() => ({ type: "collection" })),
  doc: vi.fn((...parts: string[]) => ({ path: parts.join("/") })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(() => ({ type: "orderBy" })),
  query: vi.fn(() => ({ type: "query" })),
  serverTimestamp: vi.fn(() => "server-timestamp"),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({ db: { type: "db" } }))
vi.mock("firebase/firestore", () => firestoreMocks)

import { subscribeToAllSessions, subscribeToSession } from "./sessions"
import { getOtherActiveSessionIds, isSessionActive } from "../session-policy"

describe("session status", () => {
  it("treats legacy sessions without a status as active", () => {
    expect(isSessionActive({})).toBe(true)
  })

  it("excludes revoked sessions from active sessions", () => {
    expect(isSessionActive({ status: "revoked" })).toBe(false)
  })

  it("selects only active sessions other than the current one", () => {
    expect(
      getOtherActiveSessionIds(
        [
          { sessionId: "current", status: "active" },
          { sessionId: "other", status: "active" },
          { sessionId: "revoked", status: "revoked" },
          { sessionId: "legacy" },
        ],
        "current"
      )
    ).toEqual(["other", "legacy"])
  })
})

describe("session listeners", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("notifies the browser when its session is revoked or removed", () => {
    let listener: ((snapshot: { exists: () => boolean; data: () => unknown }) => void) | undefined
    const unsubscribe = vi.fn()
    firestoreMocks.onSnapshot.mockImplementationOnce((_ref, callback) => {
      listener = callback
      return unsubscribe
    })

    const onRevoked = vi.fn()
    const stopListening = subscribeToSession("session-1", onRevoked)

    listener?.({ exists: () => true, data: () => ({ status: "active" }) })
    expect(onRevoked).not.toHaveBeenCalled()

    listener?.({ exists: () => true, data: () => ({ status: "revoked" }) })
    listener?.({ exists: () => false, data: () => undefined })
    expect(onRevoked).toHaveBeenCalledTimes(2)

    stopListening()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it("only publishes active sessions to the settings list", () => {
    let listener: ((snapshot: { docs: Array<{ id: string; data: () => unknown }> }) => void) | undefined
    firestoreMocks.onSnapshot.mockImplementationOnce((_query, callback) => {
      listener = callback
      return vi.fn()
    })

    const callback = vi.fn()
    subscribeToAllSessions(callback)
    listener?.({
      docs: [
        { id: "active", data: () => ({ status: "active", email: "active@example.com" }) },
        { id: "legacy", data: () => ({ email: "legacy@example.com" }) },
        { id: "revoked", data: () => ({ status: "revoked", email: "revoked@example.com" }) },
      ],
    })

    expect(callback).toHaveBeenCalledWith([
      { sessionId: "active", status: "active", email: "active@example.com" },
      { sessionId: "legacy", email: "legacy@example.com" },
    ])
  })
})
