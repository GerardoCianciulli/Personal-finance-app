import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getAccounts } from '../api/client'
import type { User } from '../types'

interface Session {
  id: number
  name: string
  email: string
}

interface AuthContextValue {
  user: Session | null
  signUp(input: { name: string; email: string; password: string }): Promise<void>
  logIn(input: { email: string; password: string }): Promise<void>
  logOut(): void
}

export class AuthError extends Error {
  readonly field: 'email' | 'password'

  constructor(field: 'email' | 'password', message: string) {
    super(message)
    this.field = field
  }
}

const SESSION_KEY = 'personal-finance-app:session'

const AuthContext = createContext<AuthContextValue | null>(null)

/** Passwords are never stored in plain text, only as a salted SHA-256 hash */
async function hashPassword(email: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${email.toLowerCase()}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function readSession(): Session | null {
  try {
    const saved = localStorage.getItem(SESSION_KEY)
    return saved ? (JSON.parse(saved) as Session) : null
  } catch {
    return null
  }
}

async function findUser(email: string): Promise<User | undefined> {
  const users = await (await getAccounts()).list()
  return users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(readSession)

  const startSession = useCallback((u: User) => {
    const session: Session = { id: u.id, name: u.name, email: u.email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
  }, [])

  const signUp = useCallback<AuthContextValue['signUp']>(
    async ({ name, email, password }) => {
      if (await findUser(email)) throw new AuthError('email', 'An account with this email already exists')
      const accounts = await getAccounts()
      const created = await accounts.create({
        name: name.trim().replace(/\s+/g, ' '),
        email: email.trim(),
        passwordHash: await hashPassword(email.trim(), password),
      })
      startSession(created)
    },
    [startSession],
  )

  const logIn = useCallback<AuthContextValue['logIn']>(
    async ({ email, password }) => {
      const found = await findUser(email)
      // The password is hashed even for unknown emails, and both failures give the same message,
      // so the login form never reveals which email addresses have an account
      const passwordHash = await hashPassword(found?.email ?? email.trim(), password)
      if (!found || found.passwordHash !== passwordHash) {
        throw new AuthError('password', 'Incorrect email or password')
      }
      startSession(found)
    },
    [startSession],
  )

  const logOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  // A saved session for an account that no longer exists (e.g. the database was reset) is ended
  useEffect(() => {
    if (!user) return
    let cancelled = false
    getAccounts()
      .then((accounts) => accounts.list())
      .then((users) => {
        if (!cancelled && !users.some((u) => u.id === user.id)) logOut()
      })
      .catch(() => {
        // keep the session if the store can't be reached
      })
    return () => {
      cancelled = true
    }
  }, [user, logOut])

  const value = useMemo(() => ({ user, signUp, logIn, logOut }), [user, signUp, logIn, logOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
