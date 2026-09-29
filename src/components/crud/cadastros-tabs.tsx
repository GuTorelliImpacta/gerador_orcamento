'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/cadastros/catalogo', label: 'Peças e serviços' },
  { href: '/cadastros/modelos', label: 'Modelos de veículo' },
  { href: '/cadastros/clientes', label: 'Clientes' },
]

export function CadastrosTabs() {
  const pathname = usePathname()
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-border" aria-label="Cadastros">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={pathname === t.href ? 'page' : undefined}
          className={cn('flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium', pathname === t.href ? 'border-primary text-primary' : 'border-transparent text-muted')}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
