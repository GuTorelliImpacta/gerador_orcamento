'use client'

import { useState } from 'react'
import { CsvImport } from '@/components/crud/csv-import'
import { ResourceManager } from '@/components/crud/resource-manager'
import { CATEGORIAS } from '@/lib/constants'
import { formatBRL, formatHours } from '@/lib/format'
import { cn } from '@/lib/utils'

const TIPOS = [
  { value: 'peca', label: 'Peças' },
  { value: 'servico', label: 'Serviços' },
]

export default function CatalogoPage() {
  const [tipo, setTipo] = useState('peca')
  const [refresh, setRefresh] = useState(0)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="tablist" aria-label="Tipo de item">
        {TIPOS.map((t) => (
          <button key={t.value} role="tab" aria-selected={tipo === t.value} onClick={() => setTipo(t.value)}
            className={cn('min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium', tipo === t.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card')}>
            {t.label}
          </button>
        ))}
      </div>
      <ResourceManager
        key={tipo}
        table="catalog_items"
        singular={tipo === 'peca' ? 'peça' : 'serviço'}
        filter={{ tipo }}
        refreshKey={refresh}
        searchColumns={['descricao', 'codigo']}
        orderBy={{ column: 'vezes_usado', ascending: false }}
        toolbar={<CsvImport onDone={() => setRefresh((n) => n + 1)} />}
        emptyText="Nada por aqui ainda. O catálogo aprende sozinho: cada item novo que você digita num orçamento é salvo."
        row={(r) => ({
          title: r.descricao,
          subtitle: [r.codigo, r.horas_padrao ? formatHours(Number(r.horas_padrao)) : '', r.vezes_usado ? `usado ${r.vezes_usado}×` : ''].filter(Boolean).join(' · '),
          right: r.preco_padrao ? formatBRL(r.preco_padrao) : undefined,
        })}
        fields={[
          { name: 'descricao', label: 'Descrição', kind: 'text', required: true, span2: true },
          { name: 'codigo', label: 'Código', kind: 'text' },
          { name: 'preco_padrao', label: 'Preço padrão (R$)', kind: 'money' },
          ...(tipo === 'servico'
            ? [
                { name: 'horas_padrao', label: 'Horas padrão', kind: 'decimal' as const },
                { name: 'categoria_mao_de_obra', label: 'Categoria de mão de obra', kind: 'select' as const, options: CATEGORIAS.map((c) => ({ value: c.value, label: c.label })) },
              ]
            : []),
        ]}
        defaults={{ categoria_mao_de_obra: 'mecanica' }}
      />
    </div>
  )
}
