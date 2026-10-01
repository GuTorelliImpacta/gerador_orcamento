'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LinkError() {
  const erro = useSearchParams().get('erro')
  if (erro !== 'link') return null
  return (
    <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-900">
      Esse link expirou ou já foi usado. Peça um novo abaixo.
    </p>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  async function onVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setVerifying(false)
    if (error) {
      toast.error('Código inválido ou expirado. Confira os números ou peça um novo.')
      return
    }
    router.replace('/')
    router.refresh()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      toast.error('Não foi possível enviar o link. Confira o e-mail e tente de novo.')
      return
    }
    setSent(true)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Wrench className="size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold">Orçamento Rápido</h1>
        <p className="text-muted">Monte o orçamento da sua oficina em menos de 2 minutos.</p>
      </div>

      <Suspense><LinkError /></Suspense>

      <Card>
        {sent ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Mail className="size-8 text-primary" aria-hidden />
            <p className="font-medium">Confira seu e-mail</p>
            <p className="text-sm text-muted">
              Enviamos um link de acesso para <strong>{email}</strong>. É só tocar nele para entrar.
            </p>
            <form onSubmit={onVerify} className="mt-2 flex w-full flex-col gap-2 border-t border-border pt-4 text-left">
              <Label htmlFor="code">Ou digite o código do e-mail</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,8}"
                maxLength={8}
                placeholder="000000"
                className="text-center text-lg tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <Button type="submit" disabled={verifying || code.length < 6}>
                {verifying ? 'Entrando…' : 'Entrar com o código'}
              </Button>
            </form>
            <Button variant="ghost" onClick={() => { setSent(false); setCode('') }}>
              Usar outro e-mail
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Seu e-mail</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="voce@oficina.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? 'Enviando…' : 'Entrar com link no e-mail'}
            </Button>
            <p className="text-center text-xs text-muted">Sem senha. Se for seu primeiro acesso, a conta é criada na hora.</p>
          </form>
        )}
      </Card>
    </main>
  )
}
