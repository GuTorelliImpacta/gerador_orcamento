'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DecimalInput, MoneyInput } from '@/components/ui/masked-input'
import { Select } from '@/components/ui/select'
import { effectiveUnitPrice, lineNet, type CalcParams } from '@/lib/calculations'
import { CATEGORIAS, OPERACOES, type Categoria } from '@/lib/constants'
import { formatBRL } from '@/lib/format'
import type { DraftItem } from '@/lib/quote-service'

export function ItemRow({
  item, index, total, params, onChange, onRemove, onMove,
}: {
  item: DraftItem
  index: number
  total: number
  params: CalcParams
  onChange: (patch: Partial<DraftItem>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key })
  const isPeca = item.tipo === 'peca'
  const hasHours = !isPeca && !!item.horas && item.horas > 0
  const id = (n: string) => `${n}-${item.key}`
  const ops = OPERACOES.filter((o) => (isPeca ? o.value !== 'servico' : true))

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? 'z-10 opacity-80' : ''}>
      <Card className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <button type="button" aria-label={`Arrastar item ${index + 1}`} className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-lg hover:bg-border/50" {...attributes} {...listeners}>
            <GripVertical className="size-5 text-muted" aria-hidden />
          </button>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isPeca ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'}`}>{isPeca ? 'Peça' : 'Serviço'}</span>
          <Input aria-label="Descrição" placeholder={isPeca ? 'Descrição da peça' : 'Descrição do serviço'} value={item.descricao} onChange={(e) => onChange({ descricao: e.target.value })} className="flex-1" />
          <Button type="button" variant="ghost" size="icon" aria-label="Subir" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="size-4" aria-hidden /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Descer" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown className="size-4" aria-hidden /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Remover item" onClick={onRemove}><Trash2 className="size-4" aria-hidden /></Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Field label="Operação" htmlFor={id('op')}>
            <Select id={id('op')} value={item.operacao} onChange={(e) => onChange({ operacao: e.target.value })}>
              {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Qtd" htmlFor={id('qtd')}>
            <DecimalInput id={id('qtd')} value={item.quantidade} onValueChange={(n) => onChange({ quantidade: n && n > 0 ? n : 1 })} />
          </Field>
          {isPeca ? (
            <>
              <Field label="Código" htmlFor={id('cod')}><Input id={id('cod')} value={item.codigo} onChange={(e) => onChange({ codigo: e.target.value })} /></Field>
              <Field label="Fornecimento" htmlFor={id('forn')}>
                <Select id={id('forn')} value={item.fornecimento} onChange={(e) => onChange({ fornecimento: e.target.value as DraftItem['fornecimento'] })}>
                  <option value="oficina">Oficina</option>
                  <option value="cliente">Cliente</option>
                </Select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Categoria" htmlFor={id('cat')}>
                <Select id={id('cat')} value={item.categoria_mao_de_obra ?? 'servicos'} onChange={(e) => onChange({ categoria_mao_de_obra: e.target.value as Categoria })}>
                  {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </Field>
              <Field label="Horas" htmlFor={id('h')}>
                <DecimalInput id={id('h')} value={item.horas} onValueChange={(n) => onChange({ horas: n })} />
              </Field>
            </>
          )}
          <Field label={hasHours ? 'Valor/hora (auto)' : 'Preço (R$)'} htmlFor={id('preco')}>
            {hasHours ? (
              <Input id={id('preco')} readOnly value={formatBRL(effectiveUnitPrice(item, params))} />
            ) : (
              <MoneyInput id={id('preco')} value={item.preco_unitario} onValueChange={(c) => onChange({ preco_unitario: c })} />
            )}
          </Field>
          <Field label="Desc. %" htmlFor={id('desc')}>
            <DecimalInput id={id('desc')} value={item.desconto_pct || null} onValueChange={(n) => onChange({ desconto_pct: Math.min(100, Math.max(0, n ?? 0)) })} />
          </Field>
        </div>

        <p className="text-right text-sm">
          {isPeca && item.fornecimento === 'cliente' && <span className="mr-2 text-muted">Peça do cliente — não soma no total</span>}
          Líquido: <strong>{formatBRL(lineNet(item, params))}</strong>
        </p>
      </Card>
    </div>
  )
}
