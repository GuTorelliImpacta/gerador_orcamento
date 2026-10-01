import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Cliente "implícito" só para ENVIAR e-mails de login/cadastro.
 * Sem PKCE, o link do e-mail traz a sessão no fragmento (#access_token=...) e funciona em
 * qualquer navegador/aparelho — inclusive com o e-mail padrão do Supabase (plano grátis, sem SMTP próprio).
 * A sessão em si é gravada nos cookies pelo cliente normal (setSession).
 */
export function createImplicitClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
}
