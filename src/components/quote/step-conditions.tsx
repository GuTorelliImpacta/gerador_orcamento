'use client'

import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DecimalInput, MoneyInput } from '@/components/ui/masked-input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTemplates } from '@/hooks/use-workshop'
import type { QuoteDraft } from '@/lib/quote-service'

type Update = (fn: (d: QuoteDraft) => QuoteDraft) => void

export function StepConditions({ draft, update }: { draft: QuoteDraft; update: Update }) {
  const { data: templates } = useTemplates()
  const set = (p: Partial<QuoteDraft>) => update((d) => ({ ...d, ...p }))
  const setParams = (p: Partial<QuoteDraft['params']>) => update((d) => ({ ...d, params: { ...d.params, ...p } }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Desconto geral (%)" htmlFor="dg">
          <DecimalInput id="dg" value={draft.params.desconto_geral_pct || null} onValueChange={(n) => setParams({ desconto_geral_pct: Math.min(100, Math.max(0, n ?? 0)) })} />
        </Field>
        <Field label="Validade até" htmlFor="val">
          <Input id="val" type="date" value={draft.validade_ate} onChange={(e) => set({ validade_ate: e.target.value })} />
        </Field>
        <Field label="Garantia (dias)" htmlFor="gar">
          <DecimalInput id="gar" value={draft.garantia_dias} onValueChange={(n) => set({ garantia_dias: Math.round(n ?? 0) })} />
        </Field>
        <Field label="Layout do PDF" htmlFor="tpl">
          <Select id="tpl" value={draft.template_id ?? ''} onChange={(e) => set({ template_id: e.target.value || null })}>
            {templates?.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.is_default ? ' (padrão)' : ''}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Formas de pagamento" htmlFor="pag">
        <Input id="pag" value={draft.formas_pagamento} onChange={(e) => set({ formas_pagamento: e.target.value })} />
      </Field>
      <Field label="Observações" htmlFor="obs">
        <Textarea id="obs" value={draft.observacoes} onChange={(e) => set({ observacoes: e.target.value })} />
      </Field>
      <Field label="Condições (rodapé do PDF)" htmlFor="cond">
        <Textarea id="cond" value={draft.condicoes} onChange={(e) => set({ condicoes: e.target.value })} />
      </Field>

      <details className="rounded-lg border border-border p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Valores por hora deste orçamento</summary>
        <p className="mb-3 text-xs text-muted">Ficam congelados neste orçamento. Mudar em Configurações não altera orçamentos antigos.</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Mão de obra" htmlFor="h1"><MoneyInput id="h1" value={draft.params.valor_hora_mao_de_obra} onValueChange={(c) => setParams({ valor_hora_mao_de_obra: c })} /></Field>
          <Field label="Reparação" htmlFor="h2"><MoneyInput id="h2" value={draft.params.valor_hora_reparacao} onValueChange={(c) => setParams({ valor_hora_reparacao: c })} /></Field>
          <Field label="Pintura" htmlFor="h3"><MoneyInput id="h3" value={draft.params.valor_hora_pintura} onValueChange={(c) => setParams({ valor_hora_pintura: c })} /></Field>
        </div>
      </details>
    </div>
  )
}
