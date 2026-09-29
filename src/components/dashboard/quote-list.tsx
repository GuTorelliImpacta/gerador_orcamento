'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, Copy, Download, FileText, MoreVertical, Pencil, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { STATUS } from '@/lib/constants'
import { formatBRL, formatDate } from '@/lib/format'
import { maskPlaca } from '@/lib/masks'
import { buildPdfData } from '@/lib/pdf/build'
import { downloadBlob, pdfFileName, renderPdfBlob } from '@/lib/pdf/generate'
import { duplicateQuote } from '@/lib/quote-actions'
import { useSettings } from '@/hooks/use-workshop'
import type { Row } from '@/lib/supabase/database.types'

const PAGE = 15
const today = () => new Date().toISOString().slice(0, 10)

/** "Enviado" com validade vencida é exibido como "expirado". */
export const effectiveStatus = (q: Pick<Row<'quotes'>, 'status' | 'validade_ate'>) =>
  q.status === 'enviado' && q.validade_ate && q.validade_ate < today() ? 'expirado' : q.status

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS.find((x) => x.value === status) ?? STATUS[0]
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
}

export function QuoteList() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: settings } = useSettings()
  const prefix = settings?.prefixo_numeracao ?? ''
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [menu, setMenu] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim().replace(/[,()%*]/g, ' ')); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', debounced, status, page],
    queryFn: async () => {
      let q = createClient().from('quotes').select('*', { count: 'exact' })
      if (status === 'expirado') q = q.eq('status', 'enviado').lt('validade_ate', today())
      else if (status === 'enviado') q = q.eq('status', 'enviado').or(`validade_ate.is.null,validade_ate.gte.${today()}`)
      else if (status) q = q.eq('status', status)
      if (debounced) {
        const plate = debounced.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        q = q.or(`cliente_nome.ilike.%${debounced}%${plate ? `,placa.ilike.%${plate}%` : ''}`)
      }
      const { data, count, error } = await q.order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1)
      if (error) throw error
      return { rows: data as Row<'quotes'>[], count: count ?? 0 }
    },
  })

  const refresh = () => { qc.invalidateQueries({ queryKey: ['quotes'] }); qc.invalidateQueries({ queryKey: ['kpis'] }) }

  const setStatusMut = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => {
      const { error } = await createClient().from('quotes').update({ status: next, approved_at: next === 'aprovado' ? new Date().toISOString() : null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: refresh,
    onError: () => toast.error('Não foi possível atualizar o status.'),
  })

  async function duplicate(id: string) {
    setMenu(null)
    try {
      const newId = await duplicateQuote(createClient(), id)
      toast.success('Orçamento duplicado como rascunho')
      router.push(`/orcamentos/${newId}`)
    } catch {
      toast.error('Não foi possível duplicar.')
    }
  }

  async function download(q: Row<'quotes'>) {
    setMenu(null)
    try {
      const supabase = createClient()
      const [{ data: items }, { data: workshop }, { data: tpl }] = await Promise.all([
        supabase.from('quote_items').select('*').eq('quote_id', q.id),
        supabase.from('workshops').select('*').single(),
        q.template_id ? supabase.from('pdf_templates').select('*').eq('id', q.template_id).maybeSingle() : Promise.resolve({ data: null }),
      ])
      const pdf = buildPdfData(q, items ?? [], workshop ?? {}, tpl)
      downloadBlob(await renderPdfBlob(pdf), pdfFileName(pdf.numero, q.placa ?? ''))
    } catch {
      toast.error('Não foi possível gerar o PDF.')
    }
  }

  const pages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted" aria-hidden />
          <Input aria-label="Buscar por placa ou nome do cliente" placeholder="Buscar por placa ou cliente…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select aria-label="Filtrar por status" className="w-auto min-w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
          <option value="">Todos os status</option>
          {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : data && data.rows.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {data.rows.map((q) => {
            const st = effectiveStatus(q)
            const snap = (q.snapshot ?? {}) as { vehicle?: { marca?: string; modelo?: string } }
            const car = [snap.vehicle?.marca, snap.vehicle?.modelo].filter(Boolean).join(' ')
            return (
              <li key={q.id} className="relative">
                <Card className="flex items-center gap-3 p-3">
                  <Link href={`/orcamentos/${q.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{q.placa ? maskPlaca(q.placa) : 'Sem placa'}</span>
                      <StatusBadge status={st} />
                    </span>
                    <span className="truncate text-sm">{[q.cliente_nome, car].filter(Boolean).join(' · ') || 'Sem cliente'}</span>
                    <span className="text-xs text-muted">nº {prefix}{String(q.numero).padStart(4, '0')} · {formatDate(q.created_at)}</span>
                  </Link>
                  <strong className="shrink-0">{formatBRL(q.total_cents)}</strong>
                  <Button variant="ghost" size="icon" aria-label="Mais ações" aria-expanded={menu === q.id} onClick={() => setMenu(menu === q.id ? null : q.id)}><MoreVertical className="size-5" aria-hidden /></Button>
                </Card>
                {menu === q.id && (
                  <div role="menu" className="absolute right-2 top-16 z-20 flex w-52 flex-col rounded-lg border border-border bg-card p-1 shadow-lg">
                    <MenuItem icon={Pencil} label={q.status === 'rascunho' ? 'Continuar editando' : 'Abrir / editar'} onClick={() => router.push(`/orcamentos/${q.id}`)} />
                    <MenuItem icon={Copy} label="Duplicar" onClick={() => duplicate(q.id)} />
                    <MenuItem icon={Download} label="Baixar PDF" onClick={() => download(q)} />
                    {q.status !== 'rascunho' && q.status !== 'aprovado' && <MenuItem icon={Check} label="Marcar como aprovado" onClick={() => { setMenu(null); setStatusMut.mutate({ id: q.id, next: 'aprovado' }) }} />}
                    {q.status !== 'rascunho' && q.status !== 'recusado' && <MenuItem icon={X} label="Marcar como recusado" onClick={() => { setMenu(null); setStatusMut.mutate({ id: q.id, next: 'recusado' }) }} />}
                    {(q.status === 'aprovado' || q.status === 'recusado') && <MenuItem icon={FileText} label="Voltar para enviado" onClick={() => { setMenu(null); setStatusMut.mutate({ id: q.id, next: 'enviado' }) }} />}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <FileText className="size-8 text-muted" aria-hidden />
          {debounced || status ? (
            <p className="text-muted">Nenhum orçamento encontrado com esses filtros.</p>
          ) : (
            <>
              <p className="font-medium">Você ainda não tem orçamentos</p>
              <p className="text-sm text-muted">Crie o primeiro em 2 minutos.</p>
              <Button asChild className="mt-2"><Link href="/orcamentos/novo">Criar primeiro orçamento</Link></Button>
            </>
          )}
        </Card>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Paginação">
          <Button variant="outline" size="icon" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></Button>
          <span className="text-sm">Página {page + 1} de {pages}</span>
          <Button variant="outline" size="icon" aria-label="Próxima página" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></Button>
        </nav>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick }: { icon: typeof Copy; label: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-border/50">
      <Icon className="size-4" aria-hidden /> {label}
    </button>
  )
}
