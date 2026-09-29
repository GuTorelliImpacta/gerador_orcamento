'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { parseCsv } from '@/lib/csv'
import { parseDecimal, parseMoneyToCents } from '@/lib/format'
import { CATEGORIAS } from '@/lib/constants'
import { useWorkshop } from '@/hooks/use-workshop'

const HEADERS = ['tipo', 'codigo', 'descricao', 'preco', 'horas', 'categoria']
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const ALIASES: Record<string, string> = { 'descricao': 'descricao', 'descrição': 'descricao', 'nome': 'descricao', 'preco': 'preco', 'preço': 'preco', 'valor': 'preco', 'codigo': 'codigo', 'código': 'codigo', 'tipo': 'tipo', 'horas': 'horas', 'categoria': 'categoria' }

export function CsvImport({ onDone }: { onDone: () => void }) {
  const { data: workshop } = useWorkshop()
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  function downloadTemplate() {
    const csv = `${HEADERS.join(';')}\npeca;PA-1020;Pastilha de freio dianteira;189,90;;\nservico;;Troca de óleo e filtro;;0,5;mecanica\n`
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-catalogo.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  async function onFile(file: File) {
    if (!workshop) return
    setBusy(true)
    try {
      const rows = parseCsv(await file.text())
      if (rows.length < 2) throw new Error('vazio')
      const cols = rows[0].map((h) => ALIASES[norm(h)] ?? ALIASES[h.toLowerCase().trim()] ?? '')
      if (!cols.includes('descricao')) throw new Error('sem descrição')
      const cats = new Set<string>(CATEGORIAS.map((c) => c.value))
      const seen = new Set<string>()
      const items: Record<string, unknown>[] = []
      let skipped = 0
      for (const r of rows.slice(1)) {
        const get = (k: string) => r[cols.indexOf(k)]?.trim() ?? ''
        const descricao = get('descricao')
        const tipo = norm(get('tipo')).startsWith('serv') ? 'servico' : 'peca'
        const key = `${tipo}|${descricao}`
        if (!descricao || seen.has(key)) { skipped++; continue }
        seen.add(key)
        const cat = norm(get('categoria'))
        items.push({
          workshop_id: workshop.id,
          tipo,
          codigo: get('codigo') || null,
          descricao,
          preco_padrao: parseMoneyToCents(get('preco')),
          horas_padrao: parseDecimal(get('horas')),
          categoria_mao_de_obra: tipo === 'servico' && cats.has(cat) ? cat : null,
        })
      }
      if (!items.length) throw new Error('nada')
      const { error } = await createClient().from('catalog_items').upsert(items as never, { onConflict: 'workshop_id,tipo,descricao' })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['resource', 'catalog_items'] })
      onDone()
      toast.success(`${items.length} itens importados${skipped ? ` (${skipped} linhas ignoradas)` : ''}`)
    } catch {
      toast.error('Não consegui ler o arquivo. Baixe o modelo de planilha e use as mesmas colunas.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <>
      <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Importar arquivo CSV" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}><Upload className="size-4" aria-hidden /> {busy ? 'Importando…' : 'Importar CSV'}</Button>
      <Button variant="ghost" onClick={downloadTemplate} aria-label="Baixar planilha modelo"><Download className="size-4" aria-hidden /> Modelo</Button>
    </>
  )
}
