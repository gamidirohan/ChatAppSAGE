import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'

// Ensure uploads directory exists
import '@/app/api/ensure-uploads-dir'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col h-screen overflow-hidden`}>
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
