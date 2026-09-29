import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'

/** Duplica um orçamento como rascunho novo (mesmos itens, valores congelados do original). */
export async function duplicateQuote(supabase: SupabaseClient<Database>, id: string): Promise<string> {
  const { data: q, error } = await supabase.from('quotes').select('*').eq('id', id).single()
  if (error || !q) throw error ?? new Error('not found')
  const { data: items } = await supabase.from('quote_items').select('*').eq('quote_id', id)

  const { id: _id, numero: _n, public_token: _t, created_at: _c, updated_at: _u, sent_at: _s, approved_at: _a, ...rest } = q
  void [_id, _n, _t, _c, _u, _s, _a]
  const { data: created, error: e2 } = await supabase
    .from('quotes')
    .insert({ ...rest, status: 'rascunho' })
    .select('id')
    .single()
  if (e2 || !created) throw e2 ?? new Error('insert failed')

  if (items?.length) {
    const { error: e3 } = await supabase.from('quote_items').insert(
      items.map(({ id: _iid, quote_id: _q, ...i }) => (void [_iid, _q], { ...i, quote_id: created.id })),
    )
    if (e3) throw e3
  }
  return created.id
}
