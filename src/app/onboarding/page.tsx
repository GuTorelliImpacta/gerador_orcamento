'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Passo mínimo da Fase 1: cria a oficina. O onboarding completo (CEP, logo, valores) vem na Fase 2.
export default function OnboardingPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await createClient().rpc('create_workshop', { p_nome: nome.trim() })
    if (error) {
      setLoading(false)
      toast.error('Não foi possível criar sua oficina. Tente de novo.')
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Bem-vindo!</h1>
        <p className="text-muted">Como se chama a sua oficina?</p>
      </div>
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome da oficina</Label>
            <Input id="nome" required minLength={2} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Auto Center do João" />
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? 'Criando…' : 'Continuar'}
          </Button>
        </form>
      </Card>
    </main>
  )
}
