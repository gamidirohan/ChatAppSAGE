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
  title: 'Chat App',
  description: 'Chat application with GROQ-based Graph RAG',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <AuthProvider>
          <ThemeProvider>
            <Navbar className="flex-shrink-0" />
            <main className="flex-grow">{children}</main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}