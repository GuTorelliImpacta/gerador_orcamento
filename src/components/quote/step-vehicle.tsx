'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DecimalInput, MaskedInput, MoneyInput } from '@/components/ui/masked-input'
import { Select } from '@/components/ui/select'
import { SuggestInput } from '@/components/ui/suggest-input'
import { FipeDialog } from './fipe-dialog'
import { createClient } from '@/lib/supabase/client'
import { COMBUSTIVEIS } from '@/lib/constants'
import { isPlacaValida, maskPhone, normalizePlaca } from '@/lib/masks'
import type { Row } from '@/lib/supabase/database.types'
import type { QuoteDraft } from '@/lib/quote-service'

type Update = (fn: (d: QuoteDraft) => QuoteDraft) => void

const modelLabel = (m: Row<'vehicle_models'>) => [m.marca, m.modelo, m.versao].filter(Boolean).join(' ')
const clean = (q: string) => q.replace(/[,()%*]/g, ' ')

export function StepVehicle({ draft, update }: { draft: QuoteDraft; update: Update }) {
  const [fipeOpen, setFipeOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const plateError = draft.placa && normalizePlaca(draft.placa).length >= 7 && !isPlacaValida(draft.placa) ? 'Placa inválida' : undefined

  async function lookupPlate(value: string) {
    const placa = normalizePlaca(value)
    if (!isPlacaValida(placa)) return
    const supabase = createClient()
    const { data: v } = await supabase.from('vehicles').select('*').eq('placa', placa).maybeSingle()
    if (!v) return
    const [{ data: c }, { data: m }] = await Promise.all([
      v.customer_id ? supabase.from('customers').select('*').eq('id', v.customer_id).maybeSingle() : Promise.resolve({ data: null }),
      v.vehicle_model_id ? supabase.from('vehicle_models').select('*').eq('id', v.vehicle_model_id).maybeSingle() : Promise.resolve({ data: null }),
    ])
    update((d) => ({
      ...d,
      vehicle_id: v.id, customer_id: c?.id ?? d.customer_id,
      km_entrada: d.km_entrada ?? v.km,
      customer: c ? { nome: c.nome, cpf_cnpj: c.cpf_cnpj ?? '', telefone: c.telefone ?? '', email: c.email ?? '' } : d.customer,
      vehicle: {
        ...d.vehicle, cor: v.cor ?? '', chassi: v.chassi ?? '', ano: v.ano,
        ...(m ? { marca: m.marca, modelo: m.modelo, versao: m.versao ?? '', vehicle_model_id: m.id } : {}),
      },
    }))
    toast.success('Veículo encontrado — dados preenchidos')
  }

  const setVehicle = (patch: Partial<QuoteDraft['vehicle']>) => update((d) => ({ ...d, vehicle: { ...d.vehicle, ...patch, ...('marca' in patch || 'modelo' in patch || 'versao' in patch ? { vehicle_model_id: patch.vehicle_model_id ?? null } : {}) } }))
  const setCustomer = (patch: Partial<QuoteDraft['customer']>) => update((d) => ({ ...d, customer: { ...d.customer, ...patch } }))

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="veic">
        <h2 id="veic" className="text-lg font-semibold">Veículo</h2>
        <Field label="Placa" htmlFor="placa" error={plateError} hint="Se o carro já passou por aqui, preenchemos o resto.">
          <MaskedInput
            id="placa" mask="placa" value={draft.placa} className="text-lg font-semibold tracking-widest uppercase"
            onValueChange={(v) => { update((d) => ({ ...d, placa: v, vehicle_id: null })); if (normalizePlaca(v).length === 7) lookupPlate(v) }}
          />
        </Field>

        <Field label="Modelo já cadastrado (busque pelo nome)" htmlFor="modelo-busca">
          <SuggestInput
            id="modelo-busca" value={modelSearch} onChange={setModelSearch} queryKey="models" placeholder="Ex.: Gol, Onix, Uno…"
            fetcher={async (q) => {
              const s = clean(q)
              const { data } = await createClient().from('vehicle_models').select('*').or(`marca.ilike.%${s}%,modelo.ilike.%${s}%`).limit(8)
              return (data ?? []) as Row<'vehicle_models'>[]
            }}
            render={(m) => <span>{modelLabel(m)} {m.ano_inicio ? <span className="text-muted">({m.ano_inicio}{m.ano_fim ? `–${m.ano_fim}` : ''})</span> : null}</span>}
            onPick={(m) => { setModelSearch(''); setVehicle({ marca: m.marca, modelo: m.modelo, versao: m.versao ?? '', vehicle_model_id: m.id }) }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Marca" htmlFor="marca"><Input id="marca" value={draft.vehicle.marca} onChange={(e) => setVehicle({ marca: e.target.value })} /></Field>
          <Field label="Modelo" htmlFor="modelo"><Input id="modelo" value={draft.vehicle.modelo} onChange={(e) => setVehicle({ modelo: e.target.value })} /></Field>
          <Field label="Versão" htmlFor="versao"><Input id="versao" value={draft.vehicle.versao} onChange={(e) => setVehicle({ versao: e.target.value })} /></Field>
          <Field label="Ano" htmlFor="ano"><DecimalInput id="ano" value={draft.vehicle.ano} onValueChange={(n) => setVehicle({ ano: n == null ? null : Math.round(n) })} /></Field>
          <Field label="Cor" htmlFor="cor"><Input id="cor" value={draft.vehicle.cor} onChange={(e) => setVehicle({ cor: e.target.value })} /></Field>
          <Field label="Quilometragem" htmlFor="km"><DecimalInput id="km" value={draft.km_entrada} onValueChange={(n) => update((d) => ({ ...d, km_entrada: n == null ? null : Math.round(n) }))} /></Field>
          <Field label="Combustível" htmlFor="comb">
            <Select id="comb" value={draft.combustivel} onChange={(e) => update((d) => ({ ...d, combustivel: e.target.value }))}>
              <option value="">—</option>
              {COMBUSTIVEIS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Chassi (opcional)" htmlFor="chassi"><Input id="chassi" value={draft.vehicle.chassi} maxLength={17} onChange={(e) => setVehicle({ chassi: e.target.value.toUpperCase() })} /></Field>
          <Field label="Valor FIPE (R$)" htmlFor="fipe" className="col-span-2">
            <div className="flex gap-2">
              <MoneyInput id="fipe" value={draft.valor_fipe} onValueChange={(c) => update((d) => ({ ...d, valor_fipe: c }))} />
              <Button type="button" variant="outline" className="shrink-0" onClick={() => setFipeOpen(true)}>Buscar FIPE</Button>
            </div>
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="cli">
        <h2 id="cli" className="text-lg font-semibold">Cliente</h2>
        <Field label="Nome" htmlFor="cli-nome">
          <SuggestInput
            id="cli-nome" value={draft.customer.nome} queryKey="customers" placeholder="Nome do cliente"
            onChange={(v) => update((d) => ({ ...d, customer_id: null, customer: { ...d.customer, nome: v } }))}
            fetcher={async (q) => {
              const s = clean(q)
              const { data } = await createClient().from('customers').select('*').or(`nome.ilike.%${s}%,telefone.ilike.%${s}%`).limit(6)
              return (data ?? []) as Row<'customers'>[]
            }}
            render={(c) => <span>{c.nome} {c.telefone ? <span className="text-muted">· {maskPhone(c.telefone)}</span> : null}</span>}
            onPick={(c) => update((d) => ({ ...d, customer_id: c.id, customer: { nome: c.nome, cpf_cnpj: c.cpf_cnpj ?? '', telefone: c.telefone ?? '', email: c.email ?? '' } }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefone / WhatsApp" htmlFor="cli-tel">
            <MaskedInput id="cli-tel" type="tel" mask="phone" value={draft.customer.telefone} onValueChange={(v) => setCustomer({ telefone: v })} />
          </Field>
          <Field label="CPF/CNPJ" htmlFor="cli-doc">
            <MaskedInput id="cli-doc" mask="cpfcnpj" value={draft.customer.cpf_cnpj} onValueChange={(v) => setCustomer({ cpf_cnpj: v })} />
          </Field>
          <Field label="E-mail" htmlFor="cli-email" className="col-span-2">
            <Input id="cli-email" type="email" inputMode="email" value={draft.customer.email} onChange={(e) => setCustomer({ email: e.target.value })} />
          </Field>
        </div>
      </section>

      <FipeDialog
        open={fipeOpen} onOpenChange={setFipeOpen} year={draft.vehicle.ano}
        onPick={(p) => {
          update((d) => ({
            ...d,
            valor_fipe: p.valor ?? d.valor_fipe,
            vehicle: { ...d.vehicle, marca: p.marca ?? d.vehicle.marca, modelo: p.modelo ?? d.vehicle.modelo, ano: p.ano ?? d.vehicle.ano, vehicle_model_id: p.marca || p.modelo ? null : d.vehicle.vehicle_model_id },
          }))
        }}
      />
    </div>
  )
}
