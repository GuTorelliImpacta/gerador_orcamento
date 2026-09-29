export const OPERACOES = [
  { value: 'troca', label: 'Troca', sigla: 'T' },
  { value: 'ri', label: 'Remoção e instalação', sigla: 'R&I' },
  { value: 'reparacao', label: 'Reparação', sigla: 'R' },
  { value: 'pintura', label: 'Pintura', sigla: 'P' },
  { value: 'servico', label: 'Serviço', sigla: 'S' },
] as const
export type Operacao = (typeof OPERACOES)[number]['value']

export const CATEGORIAS = [
  { value: 'funilaria', label: 'Funilaria' },
  { value: 'mecanica', label: 'Mecânica' },
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'pintura', label: 'Pintura' },
  { value: 'tapecaria', label: 'Tapeçaria' },
  { value: 'vidracaria', label: 'Vidraçaria' },
  { value: 'reparacao', label: 'Reparação' },
  { value: 'servicos', label: 'Serviços' },
] as const
export type Categoria = (typeof CATEGORIAS)[number]['value']

export const STATUS = [
  { value: 'rascunho', label: 'Rascunho', cls: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100' },
  { value: 'enviado', label: 'Enviado', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
  { value: 'aprovado', label: 'Aprovado', cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  { value: 'recusado', label: 'Recusado', cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
  { value: 'expirado', label: 'Expirado', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100' },
] as const
export type Status = (typeof STATUS)[number]['value']

export const COMBUSTIVEIS = ['Gasolina', 'Etanol', 'Flex', 'Diesel', 'GNV', 'Elétrico', 'Híbrido'] as const

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const

export const FONTES = [
  { value: 'helvetica', label: 'Moderna (Helvetica)' },
  { value: 'times', label: 'Clássica (Times)' },
  { value: 'courier', label: 'Técnica (Courier)' },
] as const

export const LAYOUTS = [
  { value: 'classico', label: 'Clássico', desc: 'Cabeçalho tradicional, tabelas completas.' },
  { value: 'moderno', label: 'Moderno', desc: 'Faixa de cor e blocos em destaque.' },
  { value: 'compacto', label: 'Compacto', desc: 'Cabe orçamentos simples em uma página.' },
] as const
export type LayoutId = (typeof LAYOUTS)[number]['value']

export const siglaOperacao = (op: string) => OPERACOES.find((o) => o.value === op)?.sigla ?? op
export const labelOperacao = (op: string) => OPERACOES.find((o) => o.value === op)?.label ?? op
export const labelCategoria = (c: string | null) => CATEGORIAS.find((x) => x.value === c)?.label ?? c ?? ''
