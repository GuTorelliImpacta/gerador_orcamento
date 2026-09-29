import { AppNav } from '@/components/layout/app-nav'
import { requireWorkshop } from '@/lib/workshop'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const { workshop } = await requireWorkshop()
  return (
    <div className="flex min-h-screen">
      <AppNav workshopName={workshop.nome_fantasia || workshop.nome} />
      <main className="min-w-0 flex-1 p-4 pb-32 md:p-8">{children}</main>
    </div>
  )
}
