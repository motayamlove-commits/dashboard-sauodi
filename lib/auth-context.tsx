"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { User, onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"
import { useRouter } from "next/navigation"
import {
  generateSessionId,
  registerSession,
  updateSessionHeartbeat,
  deleteSession,
  subscribeToSession,
  SessionRevokedError,
} from "./firebase/sessions"
import { changeUserPassword } from "./account-security"

const SESSION_STORAGE_KEY = "adminSessionId"

interface AuthContextType {
  user: User | null
  loading: boolean
  sessionId: string | null
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  sessionId: null,
  logout: async () => {},
  changePassword: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const router = useRouter()
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeSessionRef = useRef<(() => void) | null>(null)
  const currentSessionIdRef = useRef<string | null>(null)
  const remoteSignOutInProgressRef = useRef(false)

  const cleanupSession = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    if (unsubscribeSessionRef.current) {
      unsubscribeSessionRef.current()
      unsubscribeSessionRef.current = null
    }
  }, [])

  const forceLocalSignOut = useCallback(async () => {
    if (remoteSignOutInProgressRef.current) return
    remoteSignOutInProgressRef.current = true
    cleanupSession()
    localStorage.removeItem(SESSION_STORAGE_KEY)
    currentSessionIdRef.current = null
    setSessionId(null)
    setUser(null)
    try {
      await auth.signOut()
    } finally {
      router.replace("/login")
      remoteSignOutInProgressRef.current = false
    }
  }, [cleanupSession, router])

  const startSession = useCallback(async (firebaseUser: User) => {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY)
    const sid = existing || generateSessionId()
    localStorage.setItem(SESSION_STORAGE_KEY, sid)
    currentSessionIdRef.current = sid
    setSessionId(sid)

    try {
      await registerSession(sid, firebaseUser.uid, firebaseUser.email || "")
    } catch (error) {
      if (error instanceof SessionRevokedError) {
        await forceLocalSignOut()
        return
      }
      throw error
    }

    heartbeatRef.current = setInterval(() => {
      if (currentSessionIdRef.current) {
        updateSessionHeartbeat(currentSessionIdRef.current)
      }
    }, 30 * 1000)

    unsubscribeSessionRef.current = subscribeToSession(sid, () => {
      void forceLocalSignOut()
    })
  }, [forceLocalSignOut])

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setLoading(false)
        try {
          await startSession(firebaseUser)
        } catch (error) {
          console.error("Session registration error:", error)
          await forceLocalSignOut()
        }
      } else {
        cleanupSession()
        setUser(null)
        setLoading(false)
        currentSessionIdRef.current = null
        setSessionId(null)
      }
    })

    return () => {
      unsubscribeAuth()
      cleanupSession()
    }
  }, [cleanupSession, forceLocalSignOut, startSession])

  const logout = async () => {
    try {
      const sid = currentSessionIdRef.current
      cleanupSession()
      if (sid) {
        localStorage.removeItem(SESSION_STORAGE_KEY)
        await deleteSession(sid)
      }
      currentSessionIdRef.current = null
      setSessionId(null)
      await auth.signOut()
      router.replace("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const currentUser = auth.currentUser || user
    if (!currentUser) {
      throw Object.assign(new Error("No authenticated user"), { code: "auth/no-current-user" })
    }
    await changeUserPassword(currentUser, currentPassword, newPassword)
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionId, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
