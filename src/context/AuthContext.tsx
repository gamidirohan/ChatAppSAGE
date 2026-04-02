'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AuthSession, User } from '@/types'

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  updateProfile: (updates: { name: string; email: string; avatar?: string }) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function parseJsonSafe(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        const payload = (await parseJsonSafe(response)) as AuthSession | null
        if (!cancelled) {
          setUser(payload?.user ?? null)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load auth session:', error)
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await parseJsonSafe(response)
      if (!response.ok) {
        throw new Error((payload as { detail?: string } | null)?.detail || 'Login failed')
      }
      setUser(payload as User)
      router.push('/chat')
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const payload = await parseJsonSafe(response)
      if (!response.ok) {
        throw new Error((payload as { detail?: string } | null)?.detail || 'Registration failed')
      }
      setUser(payload as User)
      router.push('/chat')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: { name: string; email: string; avatar?: string }) => {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const payload = await parseJsonSafe(response)
    if (!response.ok) {
      throw new Error((payload as { detail?: string } | null)?.detail || 'Profile update failed')
    }
    setUser(payload as User)
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, register, updateProfile, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
