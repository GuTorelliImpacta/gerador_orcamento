'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, CloudOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StepVehicle } from './step-vehicle'
import { StepItems } from './step-items'
import { StepConditions } from './step-conditions'
import { StepReview } from './step-review'
import { TotalsBar } from './totals-bar'
import { createClient } from '@/lib/supabase/client'
import { isPlacaValida } from '@/lib/masks'
import { draftFromDb, finalizeQuote, newDraft, persistDraft, type QuoteDraft } from '@/lib/quote-service'
import { useSettings, useTemplates, useWorkshop, type Workshop } from '@/hooks/use-workshop'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const STEPS = ['Veículo e cliente', 'Itens', 'Condições', 'Revisão e envio']
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function QuoteWizard({ quoteId }: { quoteId?: string }) {
  const { data: workshop } = useWorkshop()
  const { data: settings } = useSettings()
  const { data: templates } = useTemplates()

  const existing = useQuery({
    queryKey: ['quote-edit', quoteId],
    enabled: !!quoteId,
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => {
      const supabase = createClient()
      const [{ data: q, error }, { data: items }] = await Promise.all([
        supabase.from('quotes').select('*').eq('id', quoteId!).single(),
        supabase.from('quote_items').select('*').eq('quote_id', quoteId!),
      ])
      if (error) throw error
      return draftFromDb(q, items ?? [])
    },
  })

  let initial: QuoteDraft | null = null
  if (quoteId) initial = existing.data ?? null
  else if (settings && templates) initial = newDraft(settings, templates.find((t) => t.is_default)?.id ?? templates[0]?.id ?? null)

  if (!initial || !workshop || !settings) return <div className="mx-auto max-w-3xl"><Skeleton className="h-96 w-full" /></div>
  return <WizardInner key={quoteId ?? 'new'} initial={initial} workshop={workshop} prefix={settings.prefixo_numeracao} />
}

function WizardInner({ initial, workshop, prefix }: { initial: QuoteDraft; workshop: Workshop; prefix: string }) {
  const router = useRouter()
  const [draft, setDraft] = useState<QuoteDraft>(initial)
  const [step, setStep] = useState(0)
  const [state, setState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const ref = useRef<QuoteDraft>(initial)
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inflight = useRef<Promise<void> | null>(null)
  const again = useRef(false)

  const apply = useCallback((patch: Partial<QuoteDraft>) => {
    ref.current = { ...ref.current, ...patch }
    setDraft(ref.current)
  }, [])

  const save = useCallback((): Promise<void> => {
    if (inflight.current) { again.current = true; return inflight.current }
        const run = async () => {
      do {
        again.current = false
        dirty.current = false
        setState('saving')
        const snap = ref.current
        const res = await persistDraft(createClient(), workshop.id, snap, prefix)
        if (!snap.id) {
          apply({ id: res.id, numero: res.numero, public_token: res.public_token, criado_em: snap.criado_em ?? new Date().toISOString() })
          window.history.replaceState(null, '', `/orcamentos/${res.id}`)
        }
      } while (again.current)
      setState('saved')
      setSavedAt(new Date())
    }
    inflight.current = run()
      .catch(() => { dirty.current = true; setState('error') })
      .finally(() => { inflight.current = null })
    return inflight.current
  }, [workshop.id, prefix, apply])

  const update = useCallback((fn: (d: QuoteDraft) => QuoteDraft) => {
    ref.current = fn(ref.current)
    setDraft(ref.current)
    dirty.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(save, 800)
  }, [save])

  // aviso ao sair com alterações não salvas
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty.current || inflight.current) e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  const finalize = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    await inflight.current
    const done = await finalizeQuote(createClient(), workshop.id, ref.current, prefix)
    ref.current = done
    setDraft(done)
    dirty.current = false
    setState('saved')
    return done
  }, [workshop.id, prefix])

  async function goto(next: number) {
    if (next > step) {
      if (step === 0 && draft.placa && !isPlacaValida(draft.placa)) return toast.error('Confira a placa do veículo.')
      if (step === 1 && draft.items.length === 0) return toast.error('Adicione pelo menos um item ao orçamento.')
      if (timer.current) clearTimeout(timer.current)
      if (dirty.current || !draft.id) await save()
    }
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  const pct = ((step + 1) / STEPS.length) * 100
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-24">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold">{draft.numero ? `Orçamento nº ${prefix}${String(draft.numero).padStart(4, '0')}` : 'Novo orçamento'}</h1>
          <span className={cn('flex items-center gap-1 text-xs', state === 'error' ? 'text-danger' : 'text-muted')} role="status">
            {state === 'saving' && <><Loader2 className="size-3 animate-spin" aria-hidden /> Salvando…</>}
            {state === 'saved' && savedAt && <><Check className="size-3" aria-hidden /> Rascunho salvo às {savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>}
            {state === 'error' && <><CloudOff className="size-3" aria-hidden /> Não salvou — <button className="underline" onClick={() => save()}>tentar de novo</button></>}
          </span>
        </div>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label={`Etapa ${step + 1} de ${STEPS.length}: ${STEPS[step]}`} className="h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-muted">Etapa {step + 1} de {STEPS.length} · <strong className="text-foreground">{STEPS[step]}</strong></p>
      </header>

      {step === 0 && <StepVehicle draft={draft} update={update} />}
      {step === 1 && <StepItems draft={draft} update={update} />}
      {step === 2 && <StepConditions draft={draft} update={update} />}
      {step === 3 && <StepReview draft={draft} finalize={finalize} />}

      <div className="flex gap-2">
        {step > 0 ? (
          <Button variant="outline" size="lg" className="flex-1" onClick={() => goto(step - 1)}><ArrowLeft className="size-4" aria-hidden /> Voltar</Button>
        ) : (
          <Button variant="outline" size="lg" className="flex-1" onClick={() => router.push('/')}>Sair</Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button size="lg" className="flex-1" onClick={() => goto(step + 1)}>Próximo <ArrowRight className="size-4" aria-hidden /></Button>
        ) : (
          <Button size="lg" className="flex-1" onClick={async () => { await finalize().catch(() => {}); router.push('/'); router.refresh() }}>Concluir</Button>
        )}
      </div>

      {step > 0 && <TotalsBar draft={draft} />}
    </div>
  )
}
