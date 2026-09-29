import { FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Orçamentos</h1>
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <FileText className="size-8 text-muted" aria-hidden />
        <p className="font-medium">Você ainda não tem orçamentos</p>
        <p className="text-sm text-muted">Crie o primeiro em 2 minutos.</p>
      </Card>
    </div>
  )
}
