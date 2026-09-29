import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Orçamento Rápido', template: '%s · Orçamento Rápido' },
  description: 'Orçamentos em PDF com a marca da sua oficina, em menos de 2 minutos.',
  applicationName: 'Orçamento Rápido',
  appleWebApp: { capable: true, title: 'Orçamentos', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
