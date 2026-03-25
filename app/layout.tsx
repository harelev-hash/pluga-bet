import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "פלוגה ב' 7007",
  description: "מערכת ניהול פלוגת מילואים",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full bg-slate-50">{children}</body>
    </html>
  )
}
