'use client'

import { useMemo, useState } from 'react'
import { Copy, Download, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PdfPreview } from '@/components/pdf/pdf-preview'
import { downloadBlob, pdfFileName, renderPdfBlob, shareFile } from '@/lib/pdf/generate'
import { draftToPdfData, type QuoteDraft } from '@/lib/quote-service'
import { computeTotals } from '@/lib/calculations'
import { digits, formatBRL, formatDate } from '@/lib/format'
import { useTemplates, useWorkshop, useSettings } from '@/hooks/use-workshop'

export function StepReview({
  draft, finalize,
}: {
  draft: QuoteDraft
  /** garante que o orçamento está salvo e finalizado; devolve o rascunho atualizado */
  finalize: () => Promise<QuoteDraft>
}) {
  const { data: workshop } = useWorkshop()
  const { data: templates } = useTemplates()
  const { data: settings } = useSettings()
  const [busy, setBusy] = useState<string | null>(null)
  const prefix = settings?.prefixo_numeracao ?? ''
  const template = templates?.find((t) => t.id === draft.template_id) ?? templates?.find((t) => t.is_default)

  const data = useMemo(() => (workshop ? draftToPdfData(draft, workshop, template, prefix) : null), [draft, workshop, template, prefix])

  const link = (d: QuoteDraft) => `${window.location.origin}/o/${d.public_token}`

  async function makeBlob() {
    const fin = await finalize()
    const pdfData = draftToPdfData(fin, workshop!, template, prefix)
    return { fin, pdfData, blob: await renderPdfBlob(pdfData) }
  }

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name)
    try {
      await fn()
    } catch {
      toast.error('Não foi possível concluir. Tente de novo.')
    } finally {
      setBusy(null)
    }
  }

  const download = () => run('pdf', async () => {
    const { fin, pdfData, blob } = await makeBlob()
    downloadBlob(blob, pdfFileName(pdfData.numero, fin.placa))
    toast.success('PDF baixado')
  })

  const whatsapp = () => run('wa', async () => {
    const { fin, pdfData, blob } = await makeBlob()
    const total = formatBRL(computeTotals(fin.items, fin.params).total)
    const nome = workshop!.nome_fantasia || workshop!.nome
    const msg = `Olá${fin.customer.nome ? `, ${fin.customer.nome.split(' ')[0]}` : ''}! Segue o orçamento nº ${pdfData.numero} da ${nome}${fin.vehicle.modelo ? ` para o seu ${fin.vehicle.modelo}` : ''}: total de ${total}${fin.validade_ate ? `, válido até ${formatDate(fin.validade_ate)}` : ''}.\nVeja e baixe o PDF: ${link(fin)}`
    const file = pdfFileName(pdfData.numero, fin.placa)
    if (await shareFile(blob, file, msg)) return
    // Sem compartilhamento de arquivo (desktop): baixa o PDF e abre o WhatsApp com a mensagem pronta.
    downloadBlob(blob, file)
    const phone = digits(fin.customer.telefone)
    const to = phone ? `55${phone}` : ''
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
    toast.message('PDF baixado — anexe-o na conversa do WhatsApp.')
  })

  const copy = () => run('link', async () => {
    const fin = await finalize()
    await navigator.clipboard.writeText(link(fin))
    toast.success('Link copiado')
  })

  if (!data) return null
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Button size="lg" onClick={download} disabled={!!busy}><Download className="size-5" aria-hidden /> {busy === 'pdf' ? 'Gerando…' : 'Baixar PDF'}</Button>
        <Button size="lg" variant="outline" onClick={whatsapp} disabled={!!busy}><MessageCircle className="size-5" aria-hidden /> {busy === 'wa' ? 'Preparando…' : 'Enviar por WhatsApp'}</Button>
        <Button size="lg" variant="outline" onClick={copy} disabled={!!busy}><Copy className="size-5" aria-hidden /> Copiar link</Button>
      </div>
      <p className="text-sm text-muted">Ao baixar, enviar ou copiar o link, o orçamento é marcado como “enviado”. O link abre uma página onde o cliente vê e baixa o PDF.</p>
      <PdfPreview data={data} />
    </div>
  )
}
