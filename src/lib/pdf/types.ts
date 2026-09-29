import type { Categoria } from '../constants'
import type { CalcItem } from '../calculations'

export interface PdfItem extends CalcItem {
  operacao: string
  codigo: string | null
  descricao: string
}

export interface PdfData {
  numero: string // já com prefixo
  criadoEm: string // ISO
  validadeAte: string | null
  garantiaDias: number
  formasPagamento: string
  condicoes: string
  observacoes: string
  km: number | null
  combustivel: string | null
  valorFipe: number | null
  params: {
    valor_hora_mao_de_obra: number
    valor_hora_reparacao: number
    valor_hora_pintura: number
    desconto_geral_pct: number
  }
  vehicle: { placa: string; cor: string; chassi: string; ano: number | null; marca: string; modelo: string; versao: string }
  customer: { nome: string; cpf_cnpj: string; telefone: string; email: string }
  items: PdfItem[]
  workshop: {
    nome: string
    cnpj: string
    telefone: string
    email: string
    endereco: string
    responsavel_tecnico: string
    logo_url: string | null
  }
  template: {
    cor_primaria: string
    cor_secundaria: string
    fonte: string
    layout: string
    mostrar_fipe: boolean
    mostrar_chassi: boolean
    mostrar_codigo_peca: boolean
    mostrar_assinatura: boolean
  }
}

export type { Categoria }
