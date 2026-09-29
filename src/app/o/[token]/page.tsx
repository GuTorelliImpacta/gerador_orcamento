import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicQuote } from '@/components/quote/public-quote'
import { buildPdfData } from '@/lib/pdf/build'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/database.types'

export const metadata: Metadata = {
  title: 'Seu orçamento',
  robots: { index: false, follow: false },
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type PublicPayload = {
  quote: Omit<Row<'quotes'>, 'workshop_id'>
  items: Row<'quote_items'>[]
  workshop: Omit<Row<'workshops'>, 'id'>
  template: Omit<Row<'pdf_templates'>, 'workshop_id'> | null
}

export default async function PublicQuotePage({ params }: PageProps<'/o/[token]'>) {
  const { token } = await params
  if (!UUID.test(token)) notFound()

  const supabase = await createClient()
  const { data } = await supabase.rpc('get_public_quote', { p_token: token })
  if (!data) notFound()

  const p = data as unknown as PublicPayload
  const pdf = buildPdfData(p.quote, p.items, p.workshop, p.template)
  return <PublicQuote pdf={pdf} status={p.quote.status} totalCents={p.quote.total_cents} />
}
