import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Confirmação do link mágico por token_hash. Diferente do fluxo PKCE (/auth/callback),
 * funciona mesmo quando o e-mail abre em outro navegador/aparelho.
 * Exige o template de e-mail do Supabase apontando para esta rota (veja o README).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}/`)
  }
  return NextResponse.redirect(`${origin}/login?erro=link`)
}
