const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatBRL = (cents: number) => brl.format(cents / 100)

/** "1.234,56" | "1234.5" | "12" → centavos (inteiro). Vazio/ inválido → 0. */
export function parseMoneyToCents(input: string | number): number {
  if (typeof input === 'number') return Math.round(input * 100)
  const s = input.trim().replace(/[R$\s]/g, '')
  if (!s) return 0
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(normalized)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',')

export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export const formatHours = (h: number) => `${String(h).replace('.', ',')} h`

export function formatDate(iso: string | Date | null | undefined) {
  if (!iso) return ''
  const d = typeof iso === 'string' ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso) : iso
  return d.toLocaleDateString('pt-BR')
}

export function formatDateTime(d: Date = new Date()) {
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function addDaysISO(days: number, from: Date = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const digits = (s: string) => s.replace(/\D/g, '')
