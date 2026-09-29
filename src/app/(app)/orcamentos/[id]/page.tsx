import type { Metadata } from 'next'
import { QuoteWizard } from '@/components/quote/quote-wizard'

export const metadata: Metadata = { title: 'Orçamento' }

export default async function EditarOrcamentoPage({ params }: PageProps<'/orcamentos/[id]'>) {
  const { id } = await params
  return <QuoteWizard quoteId={id} />
}
