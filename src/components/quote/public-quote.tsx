'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PdfPreview } from '@/components/pdf/pdf-preview'
import { computeTotals } from '@/lib/calculations'
import { formatBRL, formatDate } from '@/lib/format'
import { downloadBlob, pdfFileName, renderPdfBlob } from '@/lib/pdf/generate'
import type { PdfData } from '@/lib/pdf/types'

export function PublicQuote({ pdf, status, totalCents }: { pdf: PdfData; status: string; totalCents: number }) {
  const [busy, setBusy] = useState(false)
  const total = totalCents ?? computeTotals(pdf.items, pdf.params).total

  async function download() {
    setBusy(true)
    try {
      downloadBlob(await renderPdfBlob(pdf), pdfFileName(pdf.numero, pdf.vehicle.placa))
    } catch {
      toast.error('Não foi possível gerar o PDF. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted">{pdf.workshop.nome}</p>
        <h1 className="text-2xl font-bold">Orçamento nº {pdf.numero}</h1>
        <p className="text-muted">
          {[pdf.vehicle.marca, pdf.vehicle.modelo, pdf.vehicle.placa].filter(Boolean).join(' · ')}
        </p>
      </header>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Total</p>
          <p className="text-3xl font-bold">{formatBRL(total)}</p>
          {pdf.validadeAte && <p className="text-sm text-muted">Válido até {formatDate(pdf.validadeAte)}</p>}
          {status === 'aprovado' && <p className="mt-1 text-sm font-medium text-green-700">Orçamento aprovado</p>}
        </div>
        <Button size="lg" onClick={download} disabled={busy}><Download className="size-5" aria-hidden /> {busy ? 'Gerando…' : 'Baixar PDF'}</Button>
      </Card>

      <PdfPreview data={pdf} />
    </main>
  )
}
