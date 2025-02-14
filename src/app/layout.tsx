import './globals.css'
import { Inter } from 'next/font/google'
import { cn } from "@/lib/utils" // Import cn utility

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Chat App',
  description: 'Next.js + shadcn + JSON-based chat',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "bg-background text-foreground")}> {/* Apply default bg/text */}
        {children}
      </body>
    </html>
  )
}