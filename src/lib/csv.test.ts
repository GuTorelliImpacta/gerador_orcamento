import { describe, expect, it } from 'vitest'
import { parseCsv } from './csv'

describe('csv', () => {
  it('separador ; com aspas e CRLF', () => {
    expect(parseCsv('tipo;descricao;preco\r\npeca;"Filtro; de óleo";35,90\r\n')).toEqual([
      ['tipo', 'descricao', 'preco'],
      ['peca', 'Filtro; de óleo', '35,90'],
    ])
  })
  it('separador vírgula', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']])
  })
})
