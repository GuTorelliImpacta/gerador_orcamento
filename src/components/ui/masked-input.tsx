'use client'

import * as React from 'react'
import { Input } from './input'
import { centsToInput } from '@/lib/format'
import { maskCep, maskCpfCnpj, maskPhone, maskPlaca } from '@/lib/masks'

const MASKS = { cpfcnpj: maskCpfCnpj, phone: maskPhone, cep: maskCep, placa: maskPlaca } as const
export type MaskName = keyof typeof MASKS

type Base = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>

export function MaskedInput({
  mask, value, onValueChange, ...props
}: Base & { mask: MaskName; value: string; onValueChange: (v: string) => void }) {
  const inputMode = mask === 'placa' ? 'text' : 'numeric'
  return (
    <Input
      {...props}
      inputMode={inputMode}
      autoCapitalize={mask === 'placa' ? 'characters' : undefined}
      value={MASKS[mask](value ?? '')}
      onChange={(e) => onValueChange(MASKS[mask](e.target.value))}
    />
  )
}

/** Moeda em centavos: o usuário digita só números, o valor "sobe" da direita (R$ 0,01 → 0,12 → 1,23). */
export function MoneyInput({
  value, onValueChange, ...props
}: Base & { value: number; onValueChange: (cents: number) => void }) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={value ? centsToInput(value) : ''}
      placeholder={props.placeholder ?? '0,00'}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '').slice(0, 9)
        onValueChange(d ? parseInt(d, 10) : 0)
      }}
    />
  )
}

/** Número decimal (horas, quantidade, %): aceita vírgula ou ponto. */
export function DecimalInput({
  value, onValueChange, ...props
}: Base & { value: number | null; onValueChange: (n: number | null) => void }) {
  const [text, setText] = React.useState(value == null ? '' : String(value).replace('.', ','))
  const last = React.useRef(value)
  React.useEffect(() => {
    if (value !== last.current) {
      last.current = value
      setText(value == null ? '' : String(value).replace('.', ','))
    }
  }, [value])
  return (
    <Input
      {...props}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d,.]/g, '')
        setText(t)
        const n = t === '' ? null : Number(t.replace(',', '.'))
        const next = n != null && Number.isFinite(n) ? n : null
        last.current = next
        onValueChange(next)
      }}
    />
  )
}
