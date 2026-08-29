import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore"

import { isSessionActive, type SessionStatus } from "../session-policy"

export { isSessionActive }
export type { SessionStatus }

export interface AdminSession {
  sessionId: string
  uid: string
  email: string
  createdAt: any
  lastActive: any
  userAgent: string
  status?: SessionStatus
  revokedAt?: any
  isCurrentSession?: boolean
}

const SESSIONS_COLLECTION = "adminSessions"

export class SessionRevokedError extends Error {
  constructor() {
    super("This session has been revoked")
    this.name = "SessionRevokedError"
  }
}

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
}

export async function registerSession(
  sessionId: string,
  uid: string,
  email: string
): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId)
  const existing = await getDoc(sessionRef)

  // Never silently revive a session that an administrator revoked while the
  // device was offline or before the browser completed its auth callback.
  if (existing.exists() && existing.data()?.status === "revoked") {
    throw new SessionRevokedError()
  }

  await setDoc(
    sessionRef,
    {
      sessionId,
      uid,
      email,
      createdAt: existing.exists() ? existing.data()?.createdAt : serverTimestamp(),
      lastActive: serverTimestamp(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
      status: "active",
      revokedAt: null,
    },
    { merge: true }
  )
}

export async function updateSessionHeartbeat(sessionId: string): Promise<void> {
  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId)
    const current = await getDoc(sessionRef)
    if (!current.exists() || current.data()?.status === "revoked") return
    await updateDoc(sessionRef, { lastActive: serverTimestamp() })
  } catch {
    // Heartbeats are best-effort and should never interrupt the dashboard.
  }
}

/**
 * Mark a session as revoked without deleting the record. The target device's
 * realtime listener sees this state and signs out immediately.
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId)
  await updateDoc(sessionRef, {
    status: "revoked",
    revokedAt: serverTimestamp(),
    lastActive: serverTimestamp(),
  })
}

/**
 * Revoke every other session from a fresh Firestore snapshot. Batches are
 * committed in safe chunks so the operation remains valid beyond Firestore's
 * per-batch write limit and fails loudly if a batch cannot be committed.
 */
export async function revokeOtherSessions(currentSessionId: string): Promise<number> {
  const q = query(collection(db, SESSIONS_COLLECTION), orderBy("lastActive", "desc"))
  const snapshot = await getDocs(q)
  const targets = snapshot.docs.filter(
    (session) => session.id !== currentSessionId && isSessionActive(session.data() as AdminSession)
  )

  for (let index = 0; index < targets.length; index += 450) {
    const batch = writeBatch(db)
    const chunk = targets.slice(index, index + 450)
    chunk.forEach((session) => {
      batch.update(session.ref, {
        status: "revoked",
        revokedAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      })
    })
    await batch.commit()
  }

  return targets.length
}

/**
 * Kept for local logout compatibility. Remote administrative actions should
 * use revokeSession so the target browser receives an explicit signal.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId)
  await updateDoc(sessionRef, {
    status: "revoked",
    revokedAt: serverTimestamp(),
    lastActive: serverTimestamp(),
  })
}

export async function getAllSessions(): Promise<AdminSession[]> {
  const q = query(collection(db, SESSIONS_COLLECTION), orderBy("lastActive", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => ({ ...(d.data() as AdminSession), sessionId: d.id }))
    .filter(isSessionActive)
}

export function subscribeToSession(
  sessionId: string,
  onRevoked: () => void
): () => void {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId)
  const unsubscribe = onSnapshot(sessionRef, (snap) => {
    if (!snap.exists() || snap.data()?.status === "revoked") {
      onRevoked()
    }
  })
  return unsubscribe
}

export function subscribeToAllSessions(
  callback: (sessions: AdminSession[]) => void
): () => void {
  const q = query(collection(db, SESSIONS_COLLECTION), orderBy("lastActive", "desc"))
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs
      .map((d) => ({
        ...(d.data() as AdminSession),
        sessionId: d.id,
      }))
      .filter(isSessionActive)
    callback(sessions)
  })
  return unsubscribe
}
