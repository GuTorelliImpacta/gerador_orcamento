import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Kpis } from '@/components/dashboard/kpis'
import { QuoteList } from '@/components/dashboard/quote-list'

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        href="/orcamentos/novo"
        className="hidden min-h-16 items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow hover:opacity-90 md:flex"
      >
        <Plus className="size-6" aria-hidden /> Novo orçamento
      </Link>
      <Kpis />
      <h1 className="text-xl font-bold">Orçamentos recentes</h1>
      <QuoteList />
    </div>
  )
}
