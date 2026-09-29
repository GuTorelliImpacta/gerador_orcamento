import type { Metadata } from 'next'
import { LogOut } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { WorkshopFormCard } from '@/components/settings/workshop-form'
import { DefaultsFormCard } from '@/components/settings/defaults-form'
import { LoadDemoButton } from '@/components/settings/load-demo-button'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Configurações' }

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Dados da oficina</h2>
        <WorkshopFormCard />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Valores padrão e numeração</h2>
        <p className="mb-4 text-sm text-muted">Mudar estes valores não altera orçamentos que já foram criados.</p>
        <DefaultsFormCard advanced />
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Exemplos</h2>
        <p className="text-sm text-muted">Carrega peças, serviços e modelos de veículo de exemplo para você testar.</p>
        <LoadDemoButton />
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Conta</h2>
        <p className="text-sm text-muted">Você entrou como <strong>{data.user?.email}</strong>.</p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-border/50">
            <LogOut className="size-4" aria-hidden /> Sair
          </button>
        </form>
      </Card>
    </div>
  )
}
