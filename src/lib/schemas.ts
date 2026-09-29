import { z } from 'zod'
import { digits } from './format'
import { isCpfCnpjValido, isPlacaValida } from './masks'

const optional = z.string().trim().optional().or(z.literal(''))
const phone = z.string().refine((v) => !digits(v) || [10, 11].includes(digits(v).length), 'Telefone inválido')
const email = z.string().trim().refine((v) => !v || z.email().safeParse(v).success, 'E-mail inválido')

export const workshopSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome da oficina'),
  nome_fantasia: optional,
  cnpj: z.string().refine((v) => isCpfCnpjValido(v), 'CNPJ/CPF inválido'),
  telefone: phone,
  whatsapp: phone,
  email,
  cep: z.string().refine((v) => !digits(v) || digits(v).length === 8, 'CEP inválido'),
  rua: optional,
  numero: optional,
  bairro: optional,
  cidade: optional,
  uf: z.string().max(2),
  responsavel_tecnico: optional,
})
export type WorkshopForm = z.infer<typeof workshopSchema>

export const settingsSchema = z.object({
  valor_hora_mao_de_obra: z.number().int().min(0),
  valor_hora_reparacao: z.number().int().min(0),
  valor_hora_pintura: z.number().int().min(0),
  desconto_padrao_pct: z.number().min(0, 'Mínimo 0%').max(100, 'Máximo 100%'),
  validade_padrao_dias: z.number().int().min(1, 'Mínimo 1 dia'),
  garantia_padrao_dias: z.number().int().min(0),
  formas_pagamento: z.string(),
  texto_condicoes: z.string(),
  texto_observacoes_padrao: z.string(),
  prefixo_numeracao: z.string().max(8, 'Máximo 8 caracteres'),
  proximo_numero: z.number().int().min(1),
})
export type SettingsForm = z.infer<typeof settingsSchema>

export const customerSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome'),
  cpf_cnpj: z.string().refine((v) => isCpfCnpjValido(v), 'CPF/CNPJ inválido'),
  telefone: phone,
  email,
})

export const plateSchema = z.string().refine((v) => !v || isPlacaValida(v), 'Placa inválida')
