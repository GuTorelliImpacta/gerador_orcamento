'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MaskedInput } from '@/components/ui/masked-input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { LogoUploader } from './logo-uploader'
import { createClient } from '@/lib/supabase/client'
import { fetchCep } from '@/lib/brasilapi'
import { digits } from '@/lib/format'
import { maskCep, maskCpfCnpj, maskPhone } from '@/lib/masks'
import { workshopSchema, type WorkshopForm } from '@/lib/schemas'
import { UFS } from '@/lib/constants'
import { useInvalidate, useWorkshop, type Workshop } from '@/hooks/use-workshop'

const toForm = (w: Workshop): WorkshopForm => ({
  nome: w.nome ?? '',
  nome_fantasia: w.nome_fantasia ?? '',
  cnpj: w.cnpj ? maskCpfCnpj(w.cnpj) : '',
  telefone: w.telefone ? maskPhone(w.telefone) : '',
  whatsapp: w.whatsapp ? maskPhone(w.whatsapp) : '',
  email: w.email ?? '',
  cep: w.cep ? maskCep(w.cep) : '',
  rua: w.rua ?? '',
  numero: w.numero ?? '',
  bairro: w.bairro ?? '',
  cidade: w.cidade ?? '',
  uf: w.uf ?? '',
  responsavel_tecnico: w.responsavel_tecnico ?? '',
})

export function WorkshopFormCard({ submitLabel = 'Salvar', onSaved }: { submitLabel?: string; onSaved?: () => void }) {
  const { data: workshop } = useWorkshop()
  const invalidate = useInvalidate()
  const [cepBusy, setCepBusy] = useState(false)
  const { register, control, handleSubmit, setValue, setFocus, reset, formState: { errors, isSubmitting, isDirty } } =
    useForm<WorkshopForm>({ resolver: zodResolver(workshopSchema) })

  useEffect(() => {
    if (workshop) reset(toForm(workshop))
  }, [workshop, reset])

  useEffect(() => {
    if (!isDirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  if (!workshop) return <Skeleton className="h-96 w-full" />

  async function lookupCep(value: string) {
    if (digits(value).length !== 8) return
    setCepBusy(true)
    const r = await fetchCep(value)
    setCepBusy(false)
    if (!r) {
      toast.message('CEP não encontrado. Preencha o endereço manualmente.')
      return
    }
    setValue('rua', r.street ?? '', { shouldDirty: true })
    setValue('bairro', r.neighborhood ?? '', { shouldDirty: true })
    setValue('cidade', r.city ?? '', { shouldDirty: true })
    setValue('uf', r.state ?? '', { shouldDirty: true })
    setFocus('numero')
  }

  async function onSubmit(v: WorkshopForm) {
    const { error } = await createClient()
      .from('workshops')
      .update({
        nome: v.nome,
        nome_fantasia: v.nome_fantasia || null,
        cnpj: digits(v.cnpj) || null,
        telefone: digits(v.telefone) || null,
        whatsapp: digits(v.whatsapp) || null,
        email: v.email || null,
        cep: digits(v.cep) || null,
        rua: v.rua || null,
        numero: v.numero || null,
        bairro: v.bairro || null,
        cidade: v.cidade || null,
        uf: v.uf || null,
        responsavel_tecnico: v.responsavel_tecnico || null,
      })
      .eq('id', workshop!.id)
    if (error) {
      toast.error('Não foi possível salvar. Tente de novo.')
      return
    }
    invalidate('workshop')
    toast.success('Dados da oficina salvos')
    reset(v)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <LogoUploader />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da oficina *" htmlFor="nome" error={errors.nome?.message}>
          <Input id="nome" {...register('nome')} />
        </Field>
        <Field label="Nome fantasia" htmlFor="nome_fantasia">
          <Input id="nome_fantasia" {...register('nome_fantasia')} />
        </Field>
        <Field label="CNPJ" htmlFor="cnpj" error={errors.cnpj?.message}>
          <Controller control={control} name="cnpj" render={({ field }) => (
            <MaskedInput id="cnpj" mask="cpfcnpj" value={field.value} onValueChange={field.onChange} />
          )} />
        </Field>
        <Field label="Responsável técnico" htmlFor="responsavel_tecnico">
          <Input id="responsavel_tecnico" {...register('responsavel_tecnico')} />
        </Field>
        <Field label="Telefone" htmlFor="telefone" error={errors.telefone?.message}>
          <Controller control={control} name="telefone" render={({ field }) => (
            <MaskedInput id="telefone" type="tel" mask="phone" value={field.value} onValueChange={field.onChange} />
          )} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp?.message}>
          <Controller control={control} name="whatsapp" render={({ field }) => (
            <MaskedInput id="whatsapp" type="tel" mask="phone" value={field.value} onValueChange={field.onChange} />
          )} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email?.message} className="sm:col-span-2">
          <Input id="email" type="email" inputMode="email" {...register('email')} />
        </Field>
        <Field label="CEP" htmlFor="cep" error={errors.cep?.message} hint={cepBusy ? 'Buscando endereço…' : 'Preenchemos o endereço pelo CEP'}>
          <Controller control={control} name="cep" render={({ field }) => (
            <MaskedInput id="cep" mask="cep" value={field.value} onValueChange={(v) => { field.onChange(v); lookupCep(v) }} />
          )} />
        </Field>
        <Field label="Rua" htmlFor="rua"><Input id="rua" {...register('rua')} /></Field>
        <Field label="Número" htmlFor="numero"><Input id="numero" {...register('numero')} /></Field>
        <Field label="Bairro" htmlFor="bairro"><Input id="bairro" {...register('bairro')} /></Field>
        <Field label="Cidade" htmlFor="cidade"><Input id="cidade" {...register('cidade')} /></Field>
        <Field label="UF" htmlFor="uf">
          <Select id="uf" {...register('uf')}>
            <option value="">—</option>
            {UFS.map((u) => <option key={u}>{u}</option>)}
          </Select>
        </Field>
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : submitLabel}</Button>
    </form>
  )
}
