import { digits } from './format'

export function maskCpfCnpj(v: string) {
  const d = digits(v).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function maskPhone(v: string) {
  const d = digits(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function maskCep(v: string) {
  const d = digits(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Aceita padrão antigo (ABC-1234) e Mercosul (ABC1D23). Retorna com hífen só no antigo. */
export function maskPlaca(v: string) {
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
  // 5º caractere numérico → padrão antigo, exibe hífen após 3 letras
  if (s.length > 3 && /^[A-Z]{3}\d{1}\d/.test(s)) return `${s.slice(0, 3)}-${s.slice(3)}`
  return s
}

export const normalizePlaca = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')
export const isPlacaValida = (v: string) => /^[A-Z]{3}\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(normalizePlaca(v))

function allEqual(d: string) {
  return /^(\d)\1+$/.test(d)
}

export function isCpfValido(v: string) {
  const d = digits(v)
  if (d.length !== 11 || allEqual(d)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

export function isCnpjValido(v: string) {
  const d = digits(v)
  if (d.length !== 14 || allEqual(d)) return false
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * weights[i]
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

/** Vazio é válido (campo opcional); preenchido precisa ser CPF ou CNPJ válido. */
export function isCpfCnpjValido(v: string) {
  const d = digits(v)
  if (!d) return true
  return d.length === 11 ? isCpfValido(d) : d.length === 14 ? isCnpjValido(d) : false
}
