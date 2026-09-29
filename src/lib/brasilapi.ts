import { digits } from './format'

const BASE = 'https://brasilapi.com.br/api'

async function getJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(String(res.status))
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

export interface CepResult {
  street: string
  neighborhood: string
  city: string
  state: string
}

export async function fetchCep(cep: string): Promise<CepResult | null> {
  const d = digits(cep)
  if (d.length !== 8) return null
  try {
    return await getJson<CepResult>(`${BASE}/cep/v2/${d}`)
  } catch {
    return null
  }
}

export interface FipeBrand { nome: string; valor: string }
export interface FipePrice {
  valor: string
  marca: string
  modelo: string
  anoModelo: number
  codigoFipe: string
  combustivel: string
}

export const fipeBrands = () => getJson<FipeBrand[]>(`${BASE}/fipe/marcas/v1/carros`)

/** Lista de nomes de modelos de uma marca (a API não devolve o código FIPE aqui). */
export async function fipeModels(brandCode: string): Promise<string[]> {
  const r = await getJson<{ modelo: string }[]>(`${BASE}/fipe/veiculos/v1/carros/${brandCode}`)
  return r.map((m) => m.modelo)
}

/** Preços por ano-modelo para um código FIPE (ex.: 001004-9). */
export const fipePrices = (fipeCode: string) => getJson<FipePrice[]>(`${BASE}/fipe/preco/v1/${fipeCode}`)

/** "R$ 45.678,00" → centavos */
export function fipeValueToCents(valor: string): number {
  const n = Number(valor.replace(/[^\d,]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
