import type { PdfData } from './types'

/** Carrega a lib de PDF sob demanda (fora do bundle inicial). */
export async function renderPdfBlob(data: PdfData): Promise<Blob> {
  const [{ pdf }, { QuoteDocument }] = await Promise.all([import('@react-pdf/renderer'), import('./document')])
  return pdf(QuoteDocument({ data })).toBlob()
}

export const pdfFileName = (numero: string, placa: string) =>
  `Orcamento-${numero}-${placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'SEM-PLACA'}.pdf`

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Compartilha o arquivo pelo menu nativo (mobile). Retorna false se o aparelho não suportar. */
export async function shareFile(blob: Blob, filename: string, text: string): Promise<boolean> {
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (typeof navigator === 'undefined' || !navigator.canShare?.({ files: [file] })) return false
  try {
    await navigator.share({ files: [file], text, title: filename })
    return true
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return true
    return false
  }
}
