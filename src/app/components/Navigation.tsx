'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MessageSquare, Upload, BarChart3, Home, Menu, X } from 'lucide-react'
import { checkApiHealth } from '@/lib/api'

export default function Navigation() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [apiStatus, setApiStatus] = useState<'loading' | 'online' | 'offline'>('loading')

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const health = await checkApiHealth()
        setApiStatus(health.status === 'ok' ? 'online' : 'offline')
      } catch (error) {
        setApiStatus('offline')
      }
    }

    checkStatus()
    // Check API status every 30 seconds
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: <Home className="h-5 w-5" />
    },
    {
      name: 'Chat',
      href: '/chat',
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      name: 'Upload',
      href: '/upload',
      icon: <Upload className="h-5 w-5" />
    },
    {
      name: 'Graph Debug',
      href: '/debug',
      icon: <BarChart3 className="h-5 w-5" />
    }
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6" />
            <span className="font-bold">Graph RAG Chat</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden ml-auto"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 mx-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span className="ml-2">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* API Status indicator */}
        <div className="ml-auto hidden md:flex items-center">
          <div className="flex items-center">
            <div
              className={cn(
                "h-2 w-2 rounded-full mr-2",
                apiStatus === 'online' ? "bg-green-500" :
                apiStatus === 'offline' ? "bg-red-500" :
                "bg-yellow-500"
              )}
            />
            <span className="text-sm text-muted-foreground">
              API: {apiStatus === 'loading' ? 'Checking...' : apiStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="space-y-1 p-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center py-2 px-3 text-sm font-medium rounded-md",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {item.icon}
                <span className="ml-2">{item.name}</span>
              </Link>
            ))}

            {/* API Status in mobile menu */}
            <div className="py-2 px-3 flex items-center">
              <div
                className={cn(
                  "h-2 w-2 rounded-full mr-2",
                  apiStatus === 'online' ? "bg-green-500" :
                  apiStatus === 'offline' ? "bg-red-500" :
                  "bg-yellow-500"
                )}
              />
              <span className="text-sm text-muted-foreground">
                API: {apiStatus === 'loading' ? 'Checking...' : apiStatus}
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
