import type { Metadata } from 'next'
import { TemplateEditor } from '@/components/templates/template-editor'

export const metadata: Metadata = { title: 'Layout do PDF' }

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-bold">Layout do PDF</h1>
      <p className="mb-6 text-muted">Cores, fonte e blocos do orçamento. A pré-visualização usa dados fictícios.</p>
      <TemplateEditor />
    </div>
  )
}
