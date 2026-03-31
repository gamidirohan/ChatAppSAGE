'use client'

import { createContext, useState, useContext, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authenticateUser } from '@/lib/userData'

type User = {
  id: string
  name: string
  email: string
  avatar?: string
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  updateProfile: (updates: { name: string; email: string; avatar?: string }) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const saveSessionUser = (sessionUser: User) => {
    localStorage.setItem('user', JSON.stringify(sessionUser))
    setUser(sessionUser)
  }

  // Check if user is logged in on page load
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const authenticatedUser = await authenticateUser(email, password);
      
      if (!authenticatedUser) {
        throw new Error('Invalid credentials');
      }
      
      saveSessionUser(authenticatedUser)
      router.push('/chat')
    } catch (error) {
      console.error('Login failed', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Mock register function - would connect to API in real app
  const register = async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Registration failed');
      }

      saveSessionUser(payload)
      router.push('/chat')
    } catch (error) {
      console.error('Registration failed', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: { name: string; email: string; avatar?: string }) => {
    const currentUser = user
    if (!currentUser) {
      throw new Error('No authenticated user')
    }

    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Profile update failed')
      }

      saveSessionUser(payload)
    } catch (error) {
      console.error('Profile update failed', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('user')
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
