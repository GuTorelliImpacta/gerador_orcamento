import type { Categoria } from './constants'

/**
 * Cálculos do orçamento. Tudo em centavos (inteiros); percentuais viram pontos-base
 * (1% = 100 bp) para evitar erro de ponto flutuante. Arredonda a cada linha.
 */

export type ItemTipo = 'peca' | 'servico'

export interface CalcItem {
  tipo: ItemTipo
  categoria_mao_de_obra: Categoria | null
  quantidade: number
  fornecimento: 'oficina' | 'cliente'
  preco_unitario: number
  horas: number | null
  desconto_pct: number
}

export interface CalcParams {
  valor_hora_mao_de_obra: number
  valor_hora_reparacao: number
  valor_hora_pintura: number
  desconto_geral_pct: number
}

export function hourlyRate(categoria: Categoria | null, p: CalcParams): number {
  if (categoria === 'pintura') return p.valor_hora_pintura
  if (categoria === 'reparacao' || categoria === 'funilaria') return p.valor_hora_reparacao
  return p.valor_hora_mao_de_obra
}

const bp = (pct: number) => Math.round(pct * 100)
const applyPct = (cents: number, pct: number) => Math.round((cents * (10000 - bp(pct))) / 10000)

/** Serviço com horas → horas × valor/hora da categoria; senão usa o valor informado. */
export function effectiveUnitPrice(item: CalcItem, p: CalcParams): number {
  if (item.tipo === 'servico' && item.horas && item.horas > 0) {
    return Math.round((Math.round(item.horas * 100) * hourlyRate(item.categoria_mao_de_obra, p)) / 100)
  }
  return item.preco_unitario
}

export function lineGross(item: CalcItem, p: CalcParams): number {
  return Math.round((Math.round(item.quantidade * 100) * effectiveUnitPrice(item, p)) / 100)
}

export function lineNet(item: CalcItem, p: CalcParams): number {
  return applyPct(lineGross(item, p), item.desconto_pct)
}

export interface Bucket {
  bruto: number
  descontos: number
  liquido: number
}

export interface LaborBucket extends Bucket {
  categoria: Categoria
  pct: number // % do total de mão de obra (0–100, 1 casa)
}

export interface QuoteTotals {
  pecasOficina: Bucket
  pecasCliente: Bucket
  maoDeObra: LaborBucket[]
  maoDeObraTotal: Bucket
  subtotal: number
  descontoGeral: number
  total: number
}

const empty = (): Bucket => ({ bruto: 0, descontos: 0, liquido: 0 })
const add = (b: Bucket, gross: number, net: number) => {
  b.bruto += gross
  b.liquido += net
  b.descontos += gross - net
}

export function computeTotals(items: CalcItem[], p: CalcParams): QuoteTotals {
  const pecasOficina = empty()
  const pecasCliente = empty()
  const maoDeObraTotal = empty()
  const byCat = new Map<Categoria, Bucket>()

  for (const it of items) {
    const gross = lineGross(it, p)
    const net = applyPct(gross, it.desconto_pct)
    if (it.tipo === 'peca') {
      add(it.fornecimento === 'cliente' ? pecasCliente : pecasOficina, gross, net)
    } else {
      const cat = it.categoria_mao_de_obra ?? 'servicos'
      const b = byCat.get(cat) ?? empty()
      add(b, gross, net)
      byCat.set(cat, b)
      add(maoDeObraTotal, gross, net)
    }
  }

  const maoDeObra: LaborBucket[] = [...byCat.entries()].map(([categoria, b]) => ({
    categoria,
    ...b,
    pct: maoDeObraTotal.liquido ? Math.round((b.liquido / maoDeObraTotal.liquido) * 1000) / 10 : 0,
  }))

  const subtotal = pecasOficina.liquido + maoDeObraTotal.liquido
  const descontoGeral = Math.round((subtotal * bp(p.desconto_geral_pct)) / 10000)
  return {
    pecasOficina,
    pecasCliente,
    maoDeObra,
    maoDeObraTotal,
    subtotal,
    descontoGeral,
    total: subtotal - descontoGeral,
  }
}
