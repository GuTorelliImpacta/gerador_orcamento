import { CadastrosTabs } from '@/components/crud/cadastros-tabs'

export default function CadastrosLayout({ children }: LayoutProps<'/cadastros'>) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Cadastros</h1>
      <CadastrosTabs />
      {children}
    </div>
  )
}
