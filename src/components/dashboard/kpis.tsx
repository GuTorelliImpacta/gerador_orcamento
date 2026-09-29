'use client'

import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { formatBRL } from '@/lib/format'

export function Kpis() {
  const { data } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => {
      const start = new Date()
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      const { data, error } = await createClient()
        .from('quotes')
        .select('status, total_cents')
        .gte('created_at', start.toISOString())
        .neq('status', 'rascunho')
        .limit(1000)
      if (error) throw error
      const total = data.length
      const aprovados = data.filter((q) => q.status === 'aprovado')
      const decididos = data.filter((q) => q.status === 'aprovado' || q.status === 'recusado').length
      return {
        total,
        taxa: decididos ? Math.round((aprovados.length / decididos) * 100) : null,
        valor: aprovados.reduce((s, q) => s + q.total_cents, 0),
      }
    },
  })

  const item = (label: string, value: string | undefined) => (
    <Card className="flex flex-col gap-1 p-3">
      <span className="text-xs text-muted">{label}</span>
      {value === undefined ? <Skeleton className="h-7 w-20" /> : <strong className="text-xl">{value}</strong>}
    </Card>
  )

  return (
    <div className="grid grid-cols-3 gap-2">
      {item('Orçamentos no mês', data && String(data.total))}
      {item('Taxa de aprovação', data && (data.taxa == null ? '—' : `${data.taxa}%`))}
      {item('Aprovado no mês', data && formatBRL(data.valor))}
    </div>
  )
}
