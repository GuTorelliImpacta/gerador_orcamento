import { computeTotals } from '@/lib/calculations'
import { formatBRL } from '@/lib/format'
import type { QuoteDraft } from '@/lib/quote-service'

/** Barra fixa inferior com totais ao vivo (acima da navegação no celular). */
export function TotalsBar({ draft }: { draft: QuoteDraft }) {
  const t = computeTotals(draft.items, draft.params)
  return (
    <div className="fixed inset-x-0 bottom-14 z-20 border-t border-border bg-card px-4 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:bottom-0 md:left-60" aria-live="polite">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 text-sm">
        <div className="flex flex-col text-muted">
          <span>Peças {formatBRL(t.pecasOficina.liquido)} · Mão de obra {formatBRL(t.maoDeObraTotal.liquido)}</span>
          {t.descontoGeral > 0 && <span>Desconto − {formatBRL(t.descontoGeral)}</span>}
        </div>
        <div className="text-right">
          <span className="block text-xs text-muted">Total ({draft.items.length} {draft.items.length === 1 ? 'item' : 'itens'})</span>
          <strong className="text-xl">{formatBRL(t.total)}</strong>
        </div>
      </div>
    </div>
  )
}
