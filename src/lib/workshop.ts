import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Retorna a oficina do usuário logado; redireciona para o onboarding se ainda não existir. */
export async function requireWorkshop() {
  const supabase = await createClient()
  const { data: workshop } = await supabase.from('workshops').select('*').maybeSingle()
  if (!workshop) redirect('/onboarding')
  return { supabase, workshop }
}
