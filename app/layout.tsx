import './globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Todo App',
  description: 'A minimal baseline todo app',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  )
}
