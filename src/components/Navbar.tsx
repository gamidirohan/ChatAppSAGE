'use client'

import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Sun, Moon, Activity } from 'lucide-react'
import { checkApiHealth } from '@/lib/api'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function Navbar({ className = "" }: { className?: string }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [backendStatus, setBackendStatus] = useState<'loading' | 'online' | 'offline'>('loading')

  // Check backend health status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkApiHealth()
        setBackendStatus(health.status === 'ok' ? 'online' : 'offline')
      } catch (error) {
        console.error('Health check failed:', error)
        setBackendStatus('offline')
      }
    }

    // Check immediately
    checkHealth()

    // Then check every 30 seconds
    const interval = setInterval(checkHealth, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <nav className={`border-b py-3 px-4 bg-white dark:bg-gray-900 dark:border-gray-700 z-10 ${className}`}>
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="SAGE Logo"
            width={100}
            height={50}
            className="h-10 w-auto"
            priority
          />
        </Link>

        <div className="flex items-center gap-4">
          {/* Backend status indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mr-1 ${{
                    'loading': 'bg-yellow-500 animate-pulse',
                    'online': 'bg-green-500',
                    'offline': 'bg-red-500'
                  }[backendStatus]}`}></div>
                  <Activity className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Backend: {{
                  'loading': 'Checking connection...',
                  'online': 'Connected',
                  'offline': 'Disconnected'
                }[backendStatus]}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
                <div className="p-2">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="dark:bg-gray-700" />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="flex items-center cursor-pointer text-red-600 dark:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" onClick={() => router.push('/login')} className="dark:border-gray-700 dark:text-gray-300">
              Login
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
