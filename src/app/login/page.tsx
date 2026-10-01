'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, Mail, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { createImplicitClient } from '@/lib/supabase/implicit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function LinkError() {
  const erro = useSearchParams().get('erro')
  if (erro !== 'link') return null
  return (
    <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-900">
      Esse link expirou ou já foi usado. Peça um novo abaixo.
    </p>
  )
}

const authMessage = (message: string) => {
  const m = message.toLowerCase()
  if (m.includes('rate limit') || m.includes('too many') || m.includes('seconds'))
    return 'Muitos e-mails em pouco tempo. Aguarde alguns minutos ou entre com e-mail e senha.'
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.'
  if (m.includes('not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
  if (m.includes('already registered')) return 'Esse e-mail já tem conta. Use "Entrar".'
  if (m.includes('password')) return 'A senha precisa ter pelo menos 8 caracteres.'
  return 'Não foi possível concluir. Confira os dados e tente de novo.'
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'link' | 'senha'>('link')
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState<'link' | 'confirm' | null>(null)

  const enter = () => {
    router.replace('/')
    router.refresh()
  }

  // Volta do link do e-mail: a sessão chega no fragmento da URL (#access_token=...&refresh_token=...).
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const p = new URLSearchParams(hash)
    const accessToken = p.get('access_token')
    const refreshToken = p.get('refresh_token')
    if (!accessToken && !p.get('error')) return
    window.history.replaceState(null, '', window.location.pathname)
    if (!accessToken || !refreshToken) {
      toast.error('Esse link expirou ou já foi usado. Peça um novo.')
      return
    }
    const id = toast.loading('Entrando…')
    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        toast.dismiss(id)
        if (error) toast.error('Não foi possível entrar com esse link. Peça um novo.')
        else {
          router.replace('/')
          router.refresh()
        }
      })
  }, [router])

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await createImplicitClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    setLoading(false)
    if (error) return toast.error(authMessage(error.message))
    setSent('link')
  }

  async function withPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (!creating) {
        const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password })
        if (error) return toast.error(authMessage(error.message))
        return enter()
      }
      const { data, error } = await createImplicitClient().auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      })
      if (error) return toast.error(authMessage(error.message))
      if (data.session) {
        // confirmação de e-mail desligada no Supabase: já entra direto
        await createClient().auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
        return enter()
      }
      setSent('confirm')
    } finally {
      setLoading(false)
    }
  }

  const tab = (value: 'link' | 'senha', label: string, Icon: typeof Mail) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => { setMode(value); setSent(null) }}
      className={cn(
        'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium',
        mode === value ? 'bg-primary text-primary-foreground' : 'bg-border/50',
      )}
    >
      <Icon className="size-4" aria-hidden /> {label}
    </button>
  )

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

      <Card className="flex flex-col gap-4">
        <div role="tablist" aria-label="Forma de entrar" className="flex gap-2">
          {tab('link', 'Link no e-mail', Mail)}
          {tab('senha', 'E-mail e senha', KeyRound)}
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Mail className="size-8 text-primary" aria-hidden />
            <p className="font-medium">Confira seu e-mail</p>
            <p className="text-sm text-muted">
              {sent === 'link'
                ? <>Enviamos um link de acesso para <strong>{email}</strong>. Toque nele para entrar (veja também a caixa de spam).</>
                : <>Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, volte e entre com sua senha.</>}
            </p>
            <Button variant="ghost" onClick={() => setSent(null)}>Voltar</Button>
          </div>
        ) : (
          <form onSubmit={mode === 'link' ? sendLink : withPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Seu e-mail</Label>
              <Input id="email" type="email" inputMode="email" autoComplete="email" required placeholder="voce@oficina.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {mode === 'senha' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} required minLength={8} placeholder="Mínimo de 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? 'Aguarde…' : mode === 'link' ? 'Receber link de acesso' : creating ? 'Criar conta' : 'Entrar'}
            </Button>
            {mode === 'senha' ? (
              <button type="button" className="min-h-11 text-sm text-primary underline" onClick={() => setCreating(!creating)}>
                {creating ? 'Já tenho conta — entrar' : 'Primeiro acesso? Criar conta'}
              </button>
            ) : (
              <p className="text-center text-xs text-muted">Sem senha. Se for seu primeiro acesso, a conta é criada na hora.</p>
            )}
          </form>
        )}
      </Card>
    </main>
  )
}
