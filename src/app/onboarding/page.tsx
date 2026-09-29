'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PdfPreview } from '@/components/pdf/pdf-preview'
import { WorkshopFormCard } from '@/components/settings/workshop-form'
import { DefaultsFormCard } from '@/components/settings/defaults-form'
import { createClient } from '@/lib/supabase/client'
import { LAYOUTS } from '@/lib/constants'
import { samplePdfData } from '@/lib/pdf/sample'
import { cn } from '@/lib/utils'
import { useInvalidate, useTemplates, useWorkshop } from '@/hooks/use-workshop'

function CreateWorkshop({ onCreated }: { onCreated: () => void }) {
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await createClient().rpc('create_workshop', { p_nome: nome.trim() })
    setLoading(false)
    if (error) return toast.error('Não foi possível criar sua oficina. Tente de novo.')
    onCreated()
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Nome da oficina" htmlFor="nome">
          <Input id="nome" required minLength={2} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Auto Center do João" />
        </Field>
        <Button type="submit" size="lg" disabled={loading}>{loading ? 'Criando…' : 'Continuar'}</Button>
      </form>
    </Card>
  )
}

function LayoutStep({ onDone }: { onDone: () => void }) {
  const { data: templates } = useTemplates()
  const { data: workshop } = useWorkshop()
  const invalidate = useInvalidate()
  const [layout, setLayout] = useState<string | null>(null)
  const current = layout ?? templates?.find((t) => t.is_default)?.layout ?? 'classico'

  const data = useMemo(() => {
    const d = samplePdfData({ layout: current })
    if (workshop) d.workshop = { ...d.workshop, nome: workshop.nome_fantasia || workshop.nome, logo_url: workshop.logo_url }
    return d
  }, [current, workshop])

  async function save() {
    const def = templates?.find((t) => t.is_default)
    if (def) {
      const { error } = await createClient().from('pdf_templates').update({ layout: current }).eq('id', def.id)
      if (error) return toast.error('Não foi possível salvar o layout.')
      invalidate('templates')
    }
    onDone()
  }

  if (!templates) return <Skeleton className="h-64 w-full" />
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Layout do PDF">
        {LAYOUTS.map((l) => (
          <label key={l.value} className={cn('flex min-h-11 cursor-pointer flex-col rounded-lg border p-3', current === l.value ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
            <span className="flex items-center gap-2 font-medium">
              <input type="radio" name="layout" checked={current === l.value} onChange={() => setLayout(l.value)} /> {l.label}
            </span>
            <span className="text-xs text-muted">{l.desc}</span>
          </label>
        ))}
      </div>
      <PdfPreview data={data} className="h-[60vh] w-full rounded-lg border border-border bg-white" />
      <Button size="lg" onClick={save}>Concluir</Button>
    </div>
  )
}

const STEPS = ['Sua oficina', 'Valores padrão', 'Layout do PDF']

export default function OnboardingPage() {
  const router = useRouter()
  const invalidate = useInvalidate()
  const { data: workshop, isLoading, isError, refetch } = useWorkshop()
  const [step, setStep] = useState(0)

  async function finish() {
    if (workshop) await createClient().from('workshops').update({ onboarding_concluido: true }).eq('id', workshop.id)
    invalidate('workshop')
    router.replace('/')
    router.refresh()
  }

  const hasWorkshop = !!workshop && !isError

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{hasWorkshop ? 'Vamos configurar sua oficina' : 'Bem-vindo!'}</h1>
        {hasWorkshop ? (
          <>
            <ol className="flex gap-2" aria-label="Progresso">
              {STEPS.map((s, i) => (
                <li key={s} aria-current={i === step ? 'step' : undefined} className={cn('flex-1 rounded-full py-1 text-center text-xs', i <= step ? 'bg-primary text-primary-foreground' : 'bg-border text-muted')}>
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
            <button className="self-end text-sm text-muted underline" onClick={finish}>Pular por agora</button>
          </>
        ) : (
          <p className="text-muted">Como se chama a sua oficina?</p>
        )}
      </header>

      {isLoading ? <Skeleton className="h-64 w-full" /> : !hasWorkshop ? (
        <CreateWorkshop onCreated={() => refetch()} />
      ) : step === 0 ? (
        <Card><WorkshopFormCard submitLabel="Salvar e continuar" onSaved={() => setStep(1)} /></Card>
      ) : step === 1 ? (
        <Card><DefaultsFormCard submitLabel="Salvar e continuar" onSaved={() => setStep(2)} /></Card>
      ) : (
        <LayoutStep onDone={finish} />
      )}
    </main>
  )
}
