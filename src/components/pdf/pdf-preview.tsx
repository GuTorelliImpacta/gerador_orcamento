'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { renderPdfBlob } from '@/lib/pdf/generate'
import type { PdfData } from '@/lib/pdf/types'

/** Pré-visualização ao vivo: regenera o PDF (com debounce) e mostra num iframe. */
export function PdfPreview({ data, className }: { data: PdfData; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const key = JSON.stringify(data)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const blob = await renderPdfBlob(JSON.parse(key) as PdfData)
        if (cancelled) return
        const next = URL.createObjectURL(blob)
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return next
        })
        setError(false)
      } catch {
        if (!cancelled) setError(true)
      }
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key])

  if (error) return <p className="rounded-lg border border-border p-4 text-sm text-danger">Não foi possível gerar a pré-visualização.</p>
  if (!url) return <Skeleton className={className ?? 'h-[70vh] w-full'} />
  return (
    <div className="flex flex-col gap-2">
      <iframe title="Pré-visualização do PDF" src={`${url}#toolbar=0&navpanes=0`} className={className ?? 'h-[70vh] w-full rounded-lg border border-border bg-white'} />
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 self-end text-sm text-primary underline">
        Abrir em tela cheia <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  )
}
