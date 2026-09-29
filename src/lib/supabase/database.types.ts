// Tipos do schema do Supabase (regenerar com `generate_typescript_types` após mudar migrations).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Required extends keyof Row> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>
  Update: Partial<Row>
  Relationships: []
}

type Cat = string | null

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' }
  public: {
    Tables: {
      workshops: Table<{
        id: string; nome: string; nome_fantasia: string | null; cnpj: string | null
        telefone: string | null; whatsapp: string | null; email: string | null
        cep: string | null; rua: string | null; numero: string | null; bairro: string | null
        cidade: string | null; uf: string | null; logo_url: string | null
        responsavel_tecnico: string | null; onboarding_concluido: boolean; created_at: string
      }, 'nome'>
      workshop_members: Table<{ user_id: string; workshop_id: string; created_at: string }, 'user_id' | 'workshop_id'>
      workshop_settings: Table<{
        workshop_id: string; valor_hora_mao_de_obra: number; valor_hora_reparacao: number
        valor_hora_pintura: number; desconto_padrao_pct: number; validade_padrao_dias: number
        garantia_padrao_dias: number; texto_condicoes: string; texto_observacoes_padrao: string
        formas_pagamento: string; prefixo_numeracao: string; proximo_numero: number
      }, 'workshop_id'>
      pdf_templates: Table<{
        id: string; workshop_id: string; nome: string; cor_primaria: string; cor_secundaria: string
        fonte: string; layout: string; mostrar_fipe: boolean; mostrar_chassi: boolean
        mostrar_codigo_peca: boolean; mostrar_assinatura: boolean; is_default: boolean; created_at: string
      }, 'workshop_id'>
      vehicle_models: Table<{
        id: string; workshop_id: string; marca: string; modelo: string; versao: string | null
        ano_inicio: number | null; ano_fim: number | null; codigo_fipe: string | null; created_at: string
      }, 'workshop_id' | 'marca' | 'modelo'>
      customers: Table<{
        id: string; workshop_id: string; nome: string; cpf_cnpj: string | null
        telefone: string | null; email: string | null; created_at: string
      }, 'workshop_id' | 'nome'>
      vehicles: Table<{
        id: string; workshop_id: string; customer_id: string | null; vehicle_model_id: string | null
        placa: string; cor: string | null; chassi: string | null; ano: number | null
        km: number | null; created_at: string
      }, 'workshop_id' | 'placa'>
      catalog_items: Table<{
        id: string; workshop_id: string; tipo: string; codigo: string | null; descricao: string
        preco_padrao: number; horas_padrao: number | null; categoria_mao_de_obra: Cat
        vezes_usado: number; created_at: string
      }, 'workshop_id' | 'tipo' | 'descricao'>
      quotes: Table<{
        id: string; workshop_id: string; numero: number; public_token: string
        customer_id: string | null; vehicle_id: string | null; template_id: string | null
        status: string; km_entrada: number | null; combustivel: string | null
        valor_fipe: number | null; valor_hora_mao_de_obra: number; valor_hora_reparacao: number
        valor_hora_pintura: number; desconto_geral_pct: number; garantia_dias: number
        formas_pagamento: string | null; observacoes: string | null; validade_ate: string | null
        snapshot: Json; total_pecas_cents: number; total_mao_de_obra_cents: number
        subtotal_cents: number; desconto_geral_cents: number; total_cents: number
        created_at: string; updated_at: string; sent_at: string | null; approved_at: string | null
      }, 'workshop_id'>
      quote_items: Table<{
        id: string; quote_id: string; ordem: number; operacao: string; categoria_mao_de_obra: Cat
        tipo: string; codigo: string | null; descricao: string; quantidade: number
        fornecimento: string; preco_unitario: number; horas: number | null
        desconto_pct: number; preco_liquido: number
      }, 'quote_id' | 'operacao' | 'descricao'>
    }
    Views: { [_ in never]: never }
    Functions: {
      create_workshop: { Args: { p_nome: string }; Returns: string }
      current_workshop_id: { Args: never; Returns: string }
      get_public_quote: { Args: { p_token: string }; Returns: Json }
      learn_catalog_item: {
        Args: {
          p_categoria: string | null; p_codigo: string | null; p_descricao: string
          p_horas: number | null; p_preco: number; p_tipo: string
        }
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
