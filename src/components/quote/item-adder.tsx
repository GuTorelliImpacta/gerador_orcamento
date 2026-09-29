'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatHours } from '@/lib/format'
import { blankItem, type DraftItem } from '@/lib/quote-service'
import type { Categoria } from '@/lib/constants'
import type { Row } from '@/lib/supabase/database.types'

/** Painel de adição rápida: busca no catálogo e adiciona em sequência sem fechar. */
export function ItemAdder({ onAdd }: { onAdd: (item: DraftItem) => void }) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim().replace(/[,()%*]/g, ' ')), 200)
    return () => clearTimeout(t)
  }, [q])

  const { data } = useQuery({
    queryKey: ['catalog-suggest', debounced],
    queryFn: async () => {
      let query = createClient().from('catalog_items').select('*').order('vezes_usado', { ascending: false }).limit(8)
      if (debounced) query = query.or(`descricao.ilike.%${debounced}%,codigo.ilike.%${debounced}%`)
      const { data } = await query
      return (data ?? []) as Row<'catalog_items'>[]
    },
    staleTime: 60_000,
  })

  const fromCatalog = (c: Row<'catalog_items'>): DraftItem =>
    blankItem(c.tipo as 'peca' | 'servico', {
      codigo: c.codigo ?? '', descricao: c.descricao, preco_unitario: c.preco_padrao,
      horas: c.horas_padrao == null ? null : Number(c.horas_padrao),
      categoria_mao_de_obra: c.tipo === 'servico' ? ((c.categoria_mao_de_obra as Categoria | null) ?? 'mecanica') : null,
    })

  return (
    <Card className="flex flex-col gap-3">
      <Input aria-label="Buscar peça ou serviço" placeholder="Buscar no catálogo (nome ou código)…" value={q} onChange={(e) => setQ(e.target.value)} />
      {data && data.length > 0 && (
        <ul className="flex flex-col gap-1">
          {data.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onAdd(fromCatalog(c))} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-border/50">
                {c.tipo === 'peca' ? <Package className="size-4 shrink-0 text-blue-600" aria-hidden /> : <Wrench className="size-4 shrink-0 text-green-600" aria-hidden />}
                <span className="min-w-0 flex-1 truncate">{c.descricao}{c.codigo ? <span className="text-muted"> · {c.codigo}</span> : null}</span>
                <span className="shrink-0 text-muted">{c.horas_padrao ? formatHours(Number(c.horas_padrao)) : c.preco_padrao ? formatBRL(c.preco_padrao) : ''}</span>
                <Plus className="size-4 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && data.length === 0 && debounced && <p className="text-sm text-muted">Nada no catálogo com “{debounced}”. Adicione como novo — ele será salvo para a próxima vez.</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => { onAdd(blankItem('peca', { descricao: debounced })); setQ('') }}>
          <Package className="size-4" aria-hidden /> {debounced ? 'Nova peça' : 'Peça avulsa'}
        </Button>
        <Button type="button" variant="outline" onClick={() => { onAdd(blankItem('servico', { descricao: debounced })); setQ('') }}>
          <Wrench className="size-4" aria-hidden /> {debounced ? 'Novo serviço' : 'Serviço avulso'}
        </Button>
      </div>
    </Card>
  )
}
