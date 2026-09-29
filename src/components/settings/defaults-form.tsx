'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DecimalInput, MoneyInput } from '@/components/ui/masked-input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { settingsSchema, type SettingsForm } from '@/lib/schemas'
import { useInvalidate, useSettings } from '@/hooks/use-workshop'

type MoneyName = 'valor_hora_mao_de_obra' | 'valor_hora_reparacao' | 'valor_hora_pintura'

export function DefaultsFormCard({
  submitLabel = 'Salvar', advanced = false, onSaved,
}: { submitLabel?: string; advanced?: boolean; onSaved?: () => void }) {
  const { data: settings } = useSettings()
  const invalidate = useInvalidate()
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  })

  useEffect(() => {
    if (settings) reset(settings)
  }, [settings, reset])

  useEffect(() => {
    if (!isDirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  if (!settings) return <Skeleton className="h-72 w-full" />

  async function onSubmit(v: SettingsForm) {
    const payload = advanced ? v : { ...v, prefixo_numeracao: settings!.prefixo_numeracao, proximo_numero: settings!.proximo_numero }
    const { error } = await createClient().from('workshop_settings').update(payload).eq('workshop_id', settings!.workshop_id)
    if (error) {
      toast.error('Não foi possível salvar. Tente de novo.')
      return
    }
    invalidate('settings')
    toast.success('Valores padrão salvos')
    reset(v)
    onSaved?.()
  }

  const money = (name: MoneyName, label: string) => (
    <Field label={label} htmlFor={name}>
      <Controller control={control} name={name} render={({ field }) => (
        <MoneyInput id={name} value={field.value ?? 0} onValueChange={field.onChange} />
      )} />
    </Field>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        {money('valor_hora_mao_de_obra', 'Hora de mão de obra (R$)')}
        {money('valor_hora_reparacao', 'Hora de reparação (R$)')}
        {money('valor_hora_pintura', 'Hora de pintura (R$)')}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Desconto padrão (%)" htmlFor="desconto" error={errors.desconto_padrao_pct?.message}>
          <Controller control={control} name="desconto_padrao_pct" render={({ field }) => (
            <DecimalInput id="desconto" value={field.value ?? 0} onValueChange={(n) => field.onChange(n ?? 0)} />
          )} />
        </Field>
        <Field label="Validade do orçamento (dias)" htmlFor="validade" error={errors.validade_padrao_dias?.message}>
          <Controller control={control} name="validade_padrao_dias" render={({ field }) => (
            <DecimalInput id="validade" value={field.value ?? 10} onValueChange={(n) => field.onChange(Math.round(n ?? 0))} />
          )} />
        </Field>
        <Field label="Garantia (dias)" htmlFor="garantia">
          <Controller control={control} name="garantia_padrao_dias" render={({ field }) => (
            <DecimalInput id="garantia" value={field.value ?? 90} onValueChange={(n) => field.onChange(Math.round(n ?? 0))} />
          )} />
        </Field>
      </div>
      <Field label="Formas de pagamento" htmlFor="formas_pagamento">
        <Input id="formas_pagamento" {...register('formas_pagamento')} />
      </Field>
      <Field label="Condições (aparecem no rodapé do PDF)" htmlFor="texto_condicoes">
        <Textarea id="texto_condicoes" {...register('texto_condicoes')} placeholder="Ex.: Peças trocadas ficam à disposição do cliente por 7 dias." />
      </Field>
      <Field label="Observações padrão" htmlFor="obs">
        <Textarea id="obs" {...register('texto_observacoes_padrao')} />
      </Field>
      {advanced && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prefixo da numeração" htmlFor="prefixo" error={errors.prefixo_numeracao?.message} hint="Ex.: OS- gera OS-0001">
            <Input id="prefixo" {...register('prefixo_numeracao')} />
          </Field>
          <Field label="Próximo número" htmlFor="proximo" error={errors.proximo_numero?.message}>
            <Controller control={control} name="proximo_numero" render={({ field }) => (
              <DecimalInput id="proximo" value={field.value ?? 1} onValueChange={(n) => field.onChange(Math.max(1, Math.round(n ?? 1)))} />
            )} />
          </Field>
        </div>
      )}
      <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : submitLabel}</Button>
    </form>
  )
}
