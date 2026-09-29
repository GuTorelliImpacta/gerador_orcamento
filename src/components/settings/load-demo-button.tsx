'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export function LoadDemoButton() {
  const [busy, setBusy] = useState(false)
  async function load() {
    setBusy(true)
    const { error } = await createClient().rpc('load_demo_data')
    setBusy(false)
    if (error) toast.error('Não foi possível carregar os exemplos.')
    else toast.success('Exemplos carregados em Cadastros')
  }
  return (
    <Button variant="outline" onClick={load} disabled={busy} className="self-start">
      {busy ? 'Carregando…' : 'Carregar exemplos'}
    </Button>
  )
}
