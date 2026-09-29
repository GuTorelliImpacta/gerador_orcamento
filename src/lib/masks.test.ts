import { describe, expect, it } from 'vitest'
import { isCnpjValido, isCpfCnpjValido, isCpfValido, isPlacaValida, maskCep, maskCpfCnpj, maskPhone, maskPlaca } from './masks'
import { centsToInput, parseMoneyToCents } from './format'

describe('máscaras', () => {
  it('CPF e CNPJ', () => {
    expect(maskCpfCnpj('12345678909')).toBe('123.456.789-09')
    expect(maskCpfCnpj('11222333000181')).toBe('11.222.333/0001-81')
  })
  it('telefone e CEP', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321')
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444')
    expect(maskCep('01310100')).toBe('01310-100')
  })
  it('placa antiga e Mercosul', () => {
    expect(maskPlaca('abc1234')).toBe('ABC-1234')
    expect(maskPlaca('abc1d23')).toBe('ABC1D23')
    expect(isPlacaValida('ABC-1234')).toBe(true)
    expect(isPlacaValida('ABC1D23')).toBe(true)
    expect(isPlacaValida('AB12')).toBe(false)
  })
})

describe('validação de documentos', () => {
  it('CPF', () => {
    expect(isCpfValido('123.456.789-09')).toBe(true)
    expect(isCpfValido('111.111.111-11')).toBe(false)
    expect(isCpfValido('123.456.789-00')).toBe(false)
  })
  it('CNPJ', () => {
    expect(isCnpjValido('11.222.333/0001-81')).toBe(true)
    expect(isCnpjValido('11.222.333/0001-82')).toBe(false)
  })
  it('opcional', () => {
    expect(isCpfCnpjValido('')).toBe(true)
    expect(isCpfCnpjValido('123')).toBe(false)
  })
})

describe('moeda', () => {
  it('converte para centavos sem erro de ponto flutuante', () => {
    expect(parseMoneyToCents('1.234,56')).toBe(123456)
    expect(parseMoneyToCents('19,90')).toBe(1990)
    expect(parseMoneyToCents('0,29')).toBe(29)
    expect(parseMoneyToCents('')).toBe(0)
    expect(centsToInput(123456)).toBe('1234,56')
  })
})
