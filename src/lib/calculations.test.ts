import { describe, expect, it } from 'vitest'
import { computeTotals, effectiveUnitPrice, lineNet, type CalcItem, type CalcParams } from './calculations'

const params: CalcParams = {
  valor_hora_mao_de_obra: 10000, // R$ 100/h
  valor_hora_reparacao: 12000,
  valor_hora_pintura: 15000,
  desconto_geral_pct: 0,
}
const peca = (o: Partial<CalcItem> = {}): CalcItem => ({
  tipo: 'peca', categoria_mao_de_obra: null, quantidade: 1, fornecimento: 'oficina',
  preco_unitario: 10000, horas: null, desconto_pct: 0, ...o,
})
const servico = (o: Partial<CalcItem> = {}): CalcItem => ({
  tipo: 'servico', categoria_mao_de_obra: 'mecanica', quantidade: 1, fornecimento: 'oficina',
  preco_unitario: 0, horas: null, desconto_pct: 0, ...o,
})

describe('linha', () => {
  it('peça: quantidade × preço × (1 − desconto)', () => {
    expect(lineNet(peca({ quantidade: 2, preco_unitario: 5000, desconto_pct: 10 }), params)).toBe(9000)
  })
  it('sem erro de ponto flutuante (0,1 + 0,2 e descontos quebrados)', () => {
    expect(lineNet(peca({ quantidade: 3, preco_unitario: 1999, desconto_pct: 33.33 }), params)).toBe(3998)
    expect(lineNet(peca({ quantidade: 1.5, preco_unitario: 1010 }), params)).toBe(1515)
  })
  it('serviço com horas usa valor/hora da categoria', () => {
    expect(effectiveUnitPrice(servico({ horas: 1.5 }), params)).toBe(15000)
    expect(effectiveUnitPrice(servico({ horas: 2, categoria_mao_de_obra: 'pintura' }), params)).toBe(30000)
    expect(effectiveUnitPrice(servico({ horas: 1, categoria_mao_de_obra: 'funilaria' }), params)).toBe(12000)
  })
  it('serviço sem horas usa valor fixo', () => {
    expect(lineNet(servico({ preco_unitario: 8000 }), params)).toBe(8000)
  })
})

describe('totais', () => {
  it('peças do cliente aparecem no resumo mas não somam no total', () => {
    const t = computeTotals([peca(), peca({ fornecimento: 'cliente', preco_unitario: 50000 })], params)
    expect(t.pecasOficina.liquido).toBe(10000)
    expect(t.pecasCliente.liquido).toBe(50000)
    expect(t.total).toBe(10000)
  })
  it('desconto geral sobre o subtotal, exibido separadamente', () => {
    const t = computeTotals([peca({ preco_unitario: 20000 }), servico({ horas: 1 })], { ...params, desconto_geral_pct: 10 })
    expect(t.subtotal).toBe(30000)
    expect(t.descontoGeral).toBe(3000)
    expect(t.total).toBe(27000)
  })
  it('mão de obra agrupada por categoria com percentual', () => {
    const t = computeTotals(
      [servico({ horas: 1 }), servico({ horas: 3, categoria_mao_de_obra: 'eletrica' })],
      params,
    )
    const mec = t.maoDeObra.find((c) => c.categoria === 'mecanica')!
    expect(mec.liquido).toBe(10000)
    expect(mec.pct).toBe(25)
    expect(t.maoDeObraTotal.liquido).toBe(40000)
  })
  it('bruto, descontos e líquido de peças', () => {
    const t = computeTotals([peca({ preco_unitario: 10000, desconto_pct: 15 })], params)
    expect(t.pecasOficina).toEqual({ bruto: 10000, descontos: 1500, liquido: 8500 })
  })
  it('orçamento vazio', () => {
    expect(computeTotals([], params).total).toBe(0)
  })
})
