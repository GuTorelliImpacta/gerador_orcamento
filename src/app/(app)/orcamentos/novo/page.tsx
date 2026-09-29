import type { Metadata } from 'next'
import { QuoteWizard } from '@/components/quote/quote-wizard'

export const metadata: Metadata = { title: 'Novo orçamento' }

export default function NovoOrcamentoPage() {
  return <QuoteWizard />
}
