import { createContext, useContext, useState, ReactNode } from 'react'

// Exported as a plain object so it works at runtime (no type-only export issue)
export const ROLES = {
  ADMIN:       'ADMIN',
  STUDENT:     'STUDENT',
  INVIGILATOR: 'INVIGILATOR',
} as const

export type AuthRole = keyof typeof ROLES

export interface AuthUser {
  name:   string
  email?: string
  rollNo?: string
  role:   AuthRole
  token:  string
}

interface AuthCtx {
  user:   AuthUser | null
  login:  (user: AuthUser) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx>({ user: null, login: () => {}, logout: () => {} })

const STORAGE_KEY = 'examops_auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch { return null }
  })

  const login = (u: AuthUser) => {
    setUser(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
