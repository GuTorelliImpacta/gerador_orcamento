import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysISO, digits } from './format'
import { computeTotals, effectiveUnitPrice, lineNet, type CalcItem, type CalcParams } from './calculations'
import type { Categoria } from './constants'
import type { Database, Json, Row } from './supabase/database.types'
import type { PdfData } from './pdf/types'
import { maskCpfCnpj, maskPhone, normalizePlaca } from './masks'

type Client = SupabaseClient<Database>

export interface DraftItem {
  key: string // = id da linha no banco
  tipo: 'peca' | 'servico'
  operacao: string
  categoria_mao_de_obra: Categoria | null
  codigo: string
  descricao: string
  quantidade: number
  fornecimento: 'oficina' | 'cliente'
  preco_unitario: number
  horas: number | null
  desconto_pct: number
}

export interface QuoteDraft {
  id?: string
  numero?: number
  public_token?: string
  status: string
  criado_em?: string
  template_id: string | null
  customer_id: string | null
  vehicle_id: string | null
  placa: string
  customer: { nome: string; cpf_cnpj: string; telefone: string; email: string }
  vehicle: { marca: string; modelo: string; versao: string; ano: number | null; cor: string; chassi: string; vehicle_model_id: string | null }
  km_entrada: number | null
  combustivel: string
  valor_fipe: number
  params: CalcParams
  garantia_dias: number
  formas_pagamento: string
  observacoes: string
  condicoes: string
  validade_ate: string
  items: DraftItem[]
}

export const newKey = () => crypto.randomUUID()

export function blankItem(tipo: 'peca' | 'servico', over: Partial<DraftItem> = {}): DraftItem {
  return {
    key: newKey(), tipo, operacao: tipo === 'peca' ? 'troca' : 'servico',
    categoria_mao_de_obra: tipo === 'servico' ? 'mecanica' : null,
    codigo: '', descricao: '', quantidade: 1, fornecimento: 'oficina',
    preco_unitario: 0, horas: null, desconto_pct: 0, ...over,
  }
}

export function newDraft(settings: Row<'workshop_settings'>, templateId: string | null): QuoteDraft {
  return {
    status: 'rascunho', template_id: templateId, customer_id: null, vehicle_id: null, placa: '',
    customer: { nome: '', cpf_cnpj: '', telefone: '', email: '' },
    vehicle: { marca: '', modelo: '', versao: '', ano: null, cor: '', chassi: '', vehicle_model_id: null },
    km_entrada: null, combustivel: '', valor_fipe: 0,
    params: {
      valor_hora_mao_de_obra: settings.valor_hora_mao_de_obra,
      valor_hora_reparacao: settings.valor_hora_reparacao,
      valor_hora_pintura: settings.valor_hora_pintura,
      desconto_geral_pct: Number(settings.desconto_padrao_pct),
    },
    garantia_dias: settings.garantia_padrao_dias,
    formas_pagamento: settings.formas_pagamento,
    observacoes: settings.texto_observacoes_padrao,
    condicoes: settings.texto_condicoes,
    validade_ate: addDaysISO(settings.validade_padrao_dias),
    items: [],
  }
}

type Snap = {
  placa?: string
  customer?: Partial<QuoteDraft['customer']>
  vehicle?: Partial<QuoteDraft['vehicle']> & { placa?: string }
  condicoes?: string
  numero_prefixo?: string
}

export function draftFromDb(q: Row<'quotes'>, items: Row<'quote_items'>[]): QuoteDraft {
  const s = (q.snapshot ?? {}) as Snap & Json
  const base = newDraftShell()
  return {
    ...base,
    id: q.id, numero: q.numero, public_token: q.public_token, status: q.status, criado_em: q.created_at,
    template_id: q.template_id, customer_id: q.customer_id, vehicle_id: q.vehicle_id,
    placa: s.vehicle?.placa ?? '',
    customer: { ...base.customer, ...s.customer },
    vehicle: { ...base.vehicle, ...s.vehicle, vehicle_model_id: s.vehicle?.vehicle_model_id ?? null },
    km_entrada: q.km_entrada, combustivel: q.combustivel ?? '', valor_fipe: q.valor_fipe ?? 0,
    params: {
      valor_hora_mao_de_obra: q.valor_hora_mao_de_obra, valor_hora_reparacao: q.valor_hora_reparacao,
      valor_hora_pintura: q.valor_hora_pintura, desconto_geral_pct: Number(q.desconto_geral_pct),
    },
    garantia_dias: q.garantia_dias, formas_pagamento: q.formas_pagamento ?? '', observacoes: q.observacoes ?? '',
    condicoes: s.condicoes ?? '', validade_ate: q.validade_ate ?? '',
    items: [...items].sort((a, b) => a.ordem - b.ordem).map((i) => ({
      key: i.id, tipo: i.tipo as DraftItem['tipo'], operacao: i.operacao,
      categoria_mao_de_obra: i.categoria_mao_de_obra as Categoria | null,
      codigo: i.codigo ?? '', descricao: i.descricao, quantidade: Number(i.quantidade),
      fornecimento: i.fornecimento as DraftItem['fornecimento'], preco_unitario: i.preco_unitario,
      horas: i.horas == null ? null : Number(i.horas), desconto_pct: Number(i.desconto_pct),
    })),
  }
}

function newDraftShell(): QuoteDraft {
  return newDraft(
    {
      workshop_id: '', valor_hora_mao_de_obra: 0, valor_hora_reparacao: 0, valor_hora_pintura: 0,
      desconto_padrao_pct: 0, validade_padrao_dias: 10, garantia_padrao_dias: 90, texto_condicoes: '',
      texto_observacoes_padrao: '', formas_pagamento: '', prefixo_numeracao: '', proximo_numero: 1,
    },
    null,
  )
}

export const toCalcItems = (d: QuoteDraft): CalcItem[] => d.items
export const draftTotals = (d: QuoteDraft) => computeTotals(d.items, d.params)

const snapshotOf = (d: QuoteDraft, prefix: string): Json => ({
  customer: { ...d.customer, cpf_cnpj: digits(d.customer.cpf_cnpj), telefone: digits(d.customer.telefone) },
  vehicle: { ...d.vehicle, placa: normalizePlaca(d.placa) },
  condicoes: d.condicoes,
  numero_prefixo: prefix,
})

/** Grava (cria ou atualiza) o rascunho e suas linhas. Retorna id e número do orçamento. */
export async function persistDraft(
  supabase: Client, workshopId: string, d: QuoteDraft, prefix: string,
): Promise<{ id: string; numero: number; public_token: string }> {
  const t = draftTotals(d)
  const fields = {
    template_id: d.template_id, customer_id: d.customer_id, vehicle_id: d.vehicle_id,
    km_entrada: d.km_entrada, combustivel: d.combustivel || null, valor_fipe: d.valor_fipe || null,
    valor_hora_mao_de_obra: d.params.valor_hora_mao_de_obra, valor_hora_reparacao: d.params.valor_hora_reparacao,
    valor_hora_pintura: d.params.valor_hora_pintura, desconto_geral_pct: d.params.desconto_geral_pct,
    garantia_dias: d.garantia_dias, formas_pagamento: d.formas_pagamento || null, observacoes: d.observacoes || null,
    validade_ate: d.validade_ate || null, snapshot: snapshotOf(d, prefix),
    placa: normalizePlaca(d.placa) || null, cliente_nome: d.customer.nome.trim() || null,
    total_pecas_cents: t.pecasOficina.liquido, total_mao_de_obra_cents: t.maoDeObraTotal.liquido,
    subtotal_cents: t.subtotal, desconto_geral_cents: t.descontoGeral, total_cents: t.total,
  }

  let id = d.id
  let numero = d.numero ?? 0
  let token = d.public_token ?? ''
  if (!id) {
    const { data, error } = await supabase.from('quotes').insert({ ...fields, workshop_id: workshopId }).select('id, numero, public_token').single()
    if (error) throw error
    id = data.id; numero = data.numero; token = data.public_token
  } else {
    const { error } = await supabase.from('quotes').update(fields).eq('id', id)
    if (error) throw error
  }

  if (d.items.length) {
    const rows = d.items.map((i, ordem) => ({
      id: i.key, quote_id: id!, ordem, operacao: i.operacao, tipo: i.tipo,
      categoria_mao_de_obra: i.tipo === 'servico' ? i.categoria_mao_de_obra ?? 'servicos' : null,
      codigo: i.codigo || null, descricao: i.descricao.trim() || '(sem descrição)', quantidade: i.quantidade || 1,
      fornecimento: i.tipo === 'peca' ? i.fornecimento : 'oficina',
      preco_unitario: effectiveUnitPrice(i, d.params), horas: i.tipo === 'servico' ? i.horas : null,
      desconto_pct: i.desconto_pct, preco_liquido: lineNet(i, d.params),
    }))
    const { error } = await supabase.from('quote_items').upsert(rows)
    if (error) throw error
    const { error: e2 } = await supabase.from('quote_items').delete().eq('quote_id', id).not('id', 'in', `(${d.items.map((i) => i.key).join(',')})`)
    if (e2) throw e2
  } else {
    const { error } = await supabase.from('quote_items').delete().eq('quote_id', id)
    if (error) throw error
  }
  return { id, numero, public_token: token }
}

/**
 * Finaliza: cadastra cliente/veículo/modelo (para reaproveitar nos próximos orçamentos),
 * ensina o catálogo com os itens usados e marca como "enviado" se ainda era rascunho.
 */
export async function finalizeQuote(supabase: Client, workshopId: string, d: QuoteDraft, prefix: string) {
  const wasDraft = d.status === 'rascunho'
  let customerId = d.customer_id
  if (d.customer.nome.trim()) {
    const payload = {
      nome: d.customer.nome.trim(), cpf_cnpj: digits(d.customer.cpf_cnpj) || null,
      telefone: digits(d.customer.telefone) || null, email: d.customer.email.trim() || null,
    }
    if (customerId) await supabase.from('customers').update(payload).eq('id', customerId)
    else {
      const { data } = await supabase.from('customers').insert({ ...payload, workshop_id: workshopId }).select('id').single()
      customerId = data?.id ?? null
    }
  }

  let modelId = d.vehicle.vehicle_model_id
  if (!modelId && d.vehicle.marca.trim() && d.vehicle.modelo.trim()) {
    // reaproveita modelo igual já cadastrado (evita duplicar o catálogo)
    let existing = supabase.from('vehicle_models').select('id').eq('workshop_id', workshopId)
      .ilike('marca', d.vehicle.marca.trim()).ilike('modelo', d.vehicle.modelo.trim())
    existing = d.vehicle.versao.trim() ? existing.ilike('versao', d.vehicle.versao.trim()) : existing.is('versao', null)
    const { data: found } = await existing.limit(1).maybeSingle()
    if (found) modelId = found.id
  }
  if (!modelId && d.vehicle.marca.trim() && d.vehicle.modelo.trim()) {
    const { data } = await supabase.from('vehicle_models').insert({
      workshop_id: workshopId, marca: d.vehicle.marca.trim(), modelo: d.vehicle.modelo.trim(),
      versao: d.vehicle.versao.trim() || null, ano_inicio: d.vehicle.ano,
    }).select('id').single()
    modelId = data?.id ?? null
  }

  let vehicleId = d.vehicle_id
  const placa = normalizePlaca(d.placa)
  if (placa) {
    const payload = {
      workshop_id: workshopId, placa, customer_id: customerId, vehicle_model_id: modelId,
      cor: d.vehicle.cor || null, chassi: d.vehicle.chassi || null, ano: d.vehicle.ano, km: d.km_entrada,
    }
    const { data } = await supabase.from('vehicles').upsert(payload, { onConflict: 'workshop_id,placa' }).select('id').single()
    vehicleId = data?.id ?? vehicleId
  }

  const next: QuoteDraft = { ...d, customer_id: customerId, vehicle_id: vehicleId, vehicle: { ...d.vehicle, vehicle_model_id: modelId } }
  const saved = await persistDraft(supabase, workshopId, next, prefix)

  if (wasDraft) {
    await Promise.all(
      next.items.filter((i) => i.descricao.trim()).map((i) =>
        supabase.rpc('learn_catalog_item', {
          p_tipo: i.tipo, p_codigo: i.codigo || null, p_descricao: i.descricao.trim(),
          p_preco: effectiveUnitPrice(i, next.params), p_horas: i.horas, p_categoria: i.tipo === 'servico' ? i.categoria_mao_de_obra : null,
        }),
      ),
    )
    await supabase.from('quotes').update({ status: 'enviado', sent_at: new Date().toISOString() }).eq('id', saved.id)
  }
  return { ...next, ...saved, status: wasDraft ? 'enviado' : d.status } satisfies QuoteDraft
}

export function draftToPdfData(
  d: QuoteDraft,
  workshop: Row<'workshops'>,
  template: Pick<Row<'pdf_templates'>, 'cor_primaria' | 'cor_secundaria' | 'fonte' | 'layout' | 'mostrar_fipe' | 'mostrar_chassi' | 'mostrar_codigo_peca' | 'mostrar_assinatura'> | null | undefined,
  prefix: string,
): PdfData {
  const endereco = [[workshop.rua, workshop.numero].filter(Boolean).join(', '), workshop.bairro, [workshop.cidade, workshop.uf].filter(Boolean).join('/')].filter(Boolean).join(' - ')
  return {
    numero: d.numero ? `${prefix}${String(d.numero).padStart(4, '0')}` : 'rascunho',
    criadoEm: d.criado_em ?? new Date().toISOString(),
    validadeAte: d.validade_ate || null, garantiaDias: d.garantia_dias, formasPagamento: d.formas_pagamento,
    condicoes: d.condicoes, observacoes: d.observacoes, km: d.km_entrada, combustivel: d.combustivel || null,
    valorFipe: d.valor_fipe || null, params: d.params,
    vehicle: { placa: d.placa, cor: d.vehicle.cor, chassi: d.vehicle.chassi, ano: d.vehicle.ano, marca: d.vehicle.marca, modelo: d.vehicle.modelo, versao: d.vehicle.versao },
    customer: {
      nome: d.customer.nome, cpf_cnpj: maskCpfCnpj(d.customer.cpf_cnpj), telefone: maskPhone(d.customer.telefone), email: d.customer.email,
    },
    items: d.items.map((i) => ({ ...i, codigo: i.codigo || null })),
    workshop: {
      nome: workshop.nome_fantasia || workshop.nome, cnpj: workshop.cnpj ? maskCpfCnpj(workshop.cnpj) : '',
      telefone: workshop.telefone ? maskPhone(workshop.telefone) : '', email: workshop.email ?? '', endereco,
      responsavel_tecnico: workshop.responsavel_tecnico ?? '', logo_url: workshop.logo_url,
    },
    template: {
      cor_primaria: template?.cor_primaria ?? '#1d4ed8', cor_secundaria: template?.cor_secundaria ?? '#0f172a',
      fonte: template?.fonte ?? 'helvetica', layout: template?.layout ?? 'classico',
      mostrar_fipe: template?.mostrar_fipe ?? true, mostrar_chassi: template?.mostrar_chassi ?? true,
      mostrar_codigo_peca: template?.mostrar_codigo_peca ?? true, mostrar_assinatura: template?.mostrar_assinatura ?? true,
    },
  }
}
