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
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
      
      localStorage.setItem('user', JSON.stringify(authenticatedUser))
      setUser(authenticatedUser)
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
      // This would be an API call in a real app
      // Mock successful registration
      const mockUser = {
        id: Date.now().toString(),
        name,
        email
      }
      
      localStorage.setItem('user', JSON.stringify(mockUser))
      setUser(mockUser)
      router.push('/chat')
    } catch (error) {
      console.error('Registration failed', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
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
