'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Home, Package, Plus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/cadastros', label: 'Cadastros', icon: Package },
  { href: '/templates', label: 'Layout PDF', icon: FileText },
  { href: '/configuracoes', label: 'Ajustes', icon: Settings },
]

export function AppNav({ workshopName }: { workshopName: string }) {
  const pathname = usePathname()
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <>
      {/* Desktop: barra lateral */}
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border bg-card p-4 md:flex">
        <p className="mb-4 truncate px-2 text-lg font-bold">{workshopName}</p>
        <Link
          href="/orcamentos/novo"
          className="mb-3 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="size-5" aria-hidden /> Novo orçamento
        </Link>
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-border/50',
              active(href) && 'bg-border/60 text-primary',
            )}
          >
            <Icon className="size-5" aria-hidden /> {label}
          </Link>
        ))}
      </aside>

      {/* Mobile: FAB + barra inferior */}
      <Link
        href="/orcamentos/novo"
        aria-label="Novo orçamento"
        className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
      >
        <Plus className="size-7" aria-hidden />
      </Link>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card md:hidden" aria-label="Principal">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? 'page' : undefined}
            className={cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs',
              active(href) ? 'text-primary' : 'text-muted',
            )}
          >
            <Icon className="size-5" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </>
  )
}

