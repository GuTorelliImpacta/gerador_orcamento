import type { PdfData, PdfItem } from './types'

const item = (o: Partial<PdfItem>): PdfItem => ({
  tipo: 'peca', operacao: 'troca', categoria_mao_de_obra: null, codigo: null, descricao: '',
  quantidade: 1, fornecimento: 'oficina', preco_unitario: 0, horas: null, desconto_pct: 0, ...o,
})

/** Dados fictícios para pré-visualizar layouts. `extra` adiciona linhas para testar quebra de página. */
export function samplePdfData(template: Partial<PdfData['template']> = {}, extra = 0): PdfData {
  const items: PdfItem[] = [
    item({ codigo: 'PA-1020', descricao: 'Pastilha de freio dianteira', quantidade: 1, preco_unitario: 18990, desconto_pct: 5 }),
    item({ codigo: 'FO-0331', descricao: 'Filtro de óleo', quantidade: 1, preco_unitario: 3590, fornecimento: 'cliente' }),
    item({ operacao: 'ri', codigo: 'PC-8841', descricao: 'Para-choque dianteiro', preco_unitario: 42000 }),
    item({ operacao: 'pintura', descricao: 'Pintura do para-choque', tipo: 'servico', categoria_mao_de_obra: 'pintura', horas: 3 }),
    item({ operacao: 'servico', descricao: 'Troca de pastilhas e revisão dos freios', tipo: 'servico', categoria_mao_de_obra: 'mecanica', horas: 1.5 }),
    item({ operacao: 'servico', descricao: 'Alinhamento e balanceamento', tipo: 'servico', categoria_mao_de_obra: 'mecanica', preco_unitario: 12000 }),
    ...Array.from({ length: extra }, (_, i) =>
      item({ codigo: `X-${100 + i}`, descricao: `Item de teste número ${i + 1}`, preco_unitario: 1000 + i * 37, quantidade: 1 + (i % 3) }),
    ),
  ]
  return {
    numero: '0042',
    criadoEm: new Date().toISOString(),
    validadeAte: new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10),
    garantiaDias: 90,
    formasPagamento: 'PIX, cartão de débito e crédito em até 6x',
    condicoes: 'Peças trocadas ficam à disposição do cliente por 7 dias.',
    observacoes: 'Veículo entrou com pequeno amassado na porta traseira, já existente.',
    km: 84210,
    combustivel: 'Flex',
    valorFipe: 5623000,
    params: { valor_hora_mao_de_obra: 9000, valor_hora_reparacao: 11000, valor_hora_pintura: 13000, desconto_geral_pct: 3 },
    vehicle: { placa: 'ABC1D23', cor: 'Prata', chassi: '9BWZZZ377VT004251', ano: 2019, marca: 'Volkswagen', modelo: 'Gol', versao: '1.6 MSI' },
    customer: { nome: 'Maria Souza', cpf_cnpj: '123.456.789-09', telefone: '(11) 98765-4321', email: 'maria@email.com' },
    items,
    workshop: {
      nome: 'Auto Center Exemplo', cnpj: '11.222.333/0001-81', telefone: '(11) 3333-4444',
      email: 'contato@autocenter.com.br', endereco: 'Rua das Oficinas, 100 - Centro, São Paulo/SP',
      responsavel_tecnico: 'João Pereira', logo_url: null,
    },
    template: {
      cor_primaria: '#1d4ed8', cor_secundaria: '#0f172a', fonte: 'helvetica', layout: 'classico',
      mostrar_fipe: true, mostrar_chassi: true, mostrar_codigo_peca: true, mostrar_assinatura: true,
      ...template,
    },
  }
}
