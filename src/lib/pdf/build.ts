import type { Json } from '../supabase/database.types'
import type { Row } from '../supabase/database.types'
import { maskCpfCnpj, maskPhone } from '../masks'
import type { Categoria } from '../constants'
import type { PdfData, PdfItem } from './types'

type Snapshot = {
  customer?: Partial<PdfData['customer']>
  vehicle?: Partial<PdfData['vehicle']>
  numero_prefixo?: string
}

export function buildPdfData(
  quote: Omit<Row<'quotes'>, 'workshop_id'> & { workshop_id?: string },
  items: Row<'quote_items'>[],
  workshop: Partial<Row<'workshops'>>,
  template: Row<'pdf_templates'> | Omit<Row<'pdf_templates'>, 'workshop_id'> | null,
): PdfData {
  const snap = (quote.snapshot ?? {}) as Snapshot & Json
  const c = snap.customer ?? {}
  const v = snap.vehicle ?? {}
  const endereco = [
    [workshop.rua, workshop.numero].filter(Boolean).join(', '),
    workshop.bairro,
    [workshop.cidade, workshop.uf].filter(Boolean).join('/'),
  ]
    .filter(Boolean)
    .join(' - ')

  return {
    numero: `${snap.numero_prefixo ?? ''}${String(quote.numero).padStart(4, '0')}`,
    criadoEm: quote.created_at,
    validadeAte: quote.validade_ate,
    garantiaDias: quote.garantia_dias,
    formasPagamento: quote.formas_pagamento ?? '',
    condicoes: (snap as { condicoes?: string }).condicoes ?? '',
    observacoes: quote.observacoes ?? '',
    km: quote.km_entrada,
    combustivel: quote.combustivel,
    valorFipe: quote.valor_fipe,
    params: {
      valor_hora_mao_de_obra: quote.valor_hora_mao_de_obra,
      valor_hora_reparacao: quote.valor_hora_reparacao,
      valor_hora_pintura: quote.valor_hora_pintura,
      desconto_geral_pct: Number(quote.desconto_geral_pct),
    },
    vehicle: {
      placa: v.placa ?? '', cor: v.cor ?? '', chassi: v.chassi ?? '', ano: v.ano ?? null,
      marca: v.marca ?? '', modelo: v.modelo ?? '', versao: v.versao ?? '',
    },
    customer: {
      nome: c.nome ?? '', cpf_cnpj: c.cpf_cnpj ? maskCpfCnpj(c.cpf_cnpj) : '',
      telefone: c.telefone ? maskPhone(c.telefone) : '', email: c.email ?? '',
    },
    items: [...items]
      .sort((a, b) => a.ordem - b.ordem)
      .map<PdfItem>((i) => ({
        tipo: i.tipo as PdfItem['tipo'],
        operacao: i.operacao,
        categoria_mao_de_obra: i.categoria_mao_de_obra as Categoria | null,
        codigo: i.codigo,
        descricao: i.descricao,
        quantidade: Number(i.quantidade),
        fornecimento: i.fornecimento as PdfItem['fornecimento'],
        preco_unitario: i.preco_unitario,
        horas: i.horas == null ? null : Number(i.horas),
        desconto_pct: Number(i.desconto_pct),
      })),
    workshop: {
      nome: workshop.nome_fantasia || workshop.nome || '',
      cnpj: workshop.cnpj ? maskCpfCnpj(workshop.cnpj) : '',
      telefone: workshop.telefone ? maskPhone(workshop.telefone) : '',
      email: workshop.email ?? '',
      endereco,
      responsavel_tecnico: workshop.responsavel_tecnico ?? '',
      logo_url: workshop.logo_url ?? null,
    },
    template: {
      cor_primaria: template?.cor_primaria ?? '#1d4ed8',
      cor_secundaria: template?.cor_secundaria ?? '#0f172a',
      fonte: template?.fonte ?? 'helvetica',
      layout: template?.layout ?? 'classico',
      mostrar_fipe: template?.mostrar_fipe ?? true,
      mostrar_chassi: template?.mostrar_chassi ?? true,
      mostrar_codigo_peca: template?.mostrar_codigo_peca ?? true,
      mostrar_assinatura: template?.mostrar_assinatura ?? true,
    },
  }
}
