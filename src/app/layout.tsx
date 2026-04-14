import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import Navbar from '@/components/Navbar'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'

// Ensure uploads directory exists
import '@/app/api/ensure-uploads-dir'

const appFont = localFont({
  src: './fonts/NotoSans-Regular.ttf',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'SAGE',
  description: 'SAGE - Chat application with GROQ-based Graph RAG',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${appFont.className} flex h-screen flex-col overflow-hidden bg-background text-foreground transition-colors`}>
        <AuthProvider>
          <ThemeProvider>
            <Navbar className="flex-shrink-0" />
            <main className="flex-1 min-h-0 overflow-auto">{children}</main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
