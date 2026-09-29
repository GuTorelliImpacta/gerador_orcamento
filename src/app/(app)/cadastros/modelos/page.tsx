'use client'

import { ResourceManager } from '@/components/crud/resource-manager'

export default function ModelosPage() {
  return (
    <ResourceManager
      table="vehicle_models"
      singular="modelo"
      searchColumns={['marca', 'modelo', 'versao']}
      orderBy={{ column: 'marca' }}
      emptyText="Nenhum modelo salvo ainda. Cadastre aqui ou direto ao criar um orçamento."
      row={(r) => ({
        title: `${r.marca} ${r.modelo}${r.versao ? ` ${r.versao}` : ''}`,
        subtitle: r.ano_inicio ? `${r.ano_inicio}${r.ano_fim ? `–${r.ano_fim}` : ''}` : undefined,
      })}
      fields={[
        { name: 'marca', label: 'Marca', kind: 'text', required: true },
        { name: 'modelo', label: 'Modelo', kind: 'text', required: true },
        { name: 'versao', label: 'Versão', kind: 'text', span2: true },
        { name: 'ano_inicio', label: 'Ano inicial', kind: 'int' },
        { name: 'ano_fim', label: 'Ano final', kind: 'int' },
        { name: 'codigo_fipe', label: 'Código FIPE (opcional)', kind: 'text', span2: true },
      ]}
    />
  )
}
