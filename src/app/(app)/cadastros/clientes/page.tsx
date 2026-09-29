'use client'

import { ResourceManager } from '@/components/crud/resource-manager'
import { isCpfCnpjValido } from '@/lib/masks'
import { maskCpfCnpj, maskPhone } from '@/lib/masks'

export default function ClientesPage() {
  return (
    <ResourceManager
      table="customers"
      singular="cliente"
      searchColumns={['nome', 'cpf_cnpj', 'telefone']}
      orderBy={{ column: 'nome' }}
      emptyText="Você ainda não tem clientes. Eles são salvos automaticamente quando você faz um orçamento."
      deleteRpc="delete_customer"
      deleteWarning="Os dados pessoais dele também são apagados dos orçamentos já emitidos (LGPD)."
      row={(r) => ({
        title: r.nome,
        subtitle: [r.telefone && maskPhone(r.telefone), r.cpf_cnpj && maskCpfCnpj(r.cpf_cnpj)].filter(Boolean).join(' · '),
      })}
      fields={[
        { name: 'nome', label: 'Nome', kind: 'text', required: true, span2: true },
        { name: 'cpf_cnpj', label: 'CPF/CNPJ', kind: 'cpfcnpj', validate: (v) => (isCpfCnpjValido(String(v ?? '')) ? undefined : 'CPF/CNPJ inválido') },
        { name: 'telefone', label: 'Telefone', kind: 'phone', validate: (v) => { const d = String(v ?? '').replace(/\D/g, ''); return !d || d.length === 10 || d.length === 11 ? undefined : 'Telefone inválido' } },
        { name: 'email', label: 'E-mail', kind: 'email', span2: true, validate: (v) => (!v || /^\S+@\S+\.\S+$/.test(String(v)) ? undefined : 'E-mail inválido') },
      ]}
    />
  )
}
