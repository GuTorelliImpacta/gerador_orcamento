'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { fipeBrands, fipeModels, fipePrices, fipeValueToCents } from '@/lib/brasilapi'

export interface FipePick { marca?: string; modelo?: string; ano?: number; valor?: number }

export function FipeDialog({ open, onOpenChange, year, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; year: number | null; onPick: (p: FipePick) => void }) {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const brands = useQuery({ queryKey: ['fipe-brands'], queryFn: fipeBrands, enabled: open, staleTime: Infinity, retry: 1 })
  const models = useQuery({ queryKey: ['fipe-models', brand], queryFn: () => fipeModels(brand), enabled: open && !!brand, staleTime: Infinity, retry: 1 })
  const failed = brands.isError || models.isError

  async function applyPrice() {
    setBusy(true)
    try {
      const list = await fipePrices(code.trim())
      const hit = (year && list.find((p) => p.anoModelo === year)) || list[0]
      if (!hit) throw new Error('vazio')
      onPick({ marca: hit.marca, modelo: hit.modelo, ano: hit.anoModelo, valor: fipeValueToCents(hit.valor) })
      onOpenChange(false)
      toast.success(`FIPE ${hit.anoModelo}: ${hit.valor}`)
    } catch {
      toast.error('Não encontramos esse código FIPE. Preencha o valor manualmente.')
    } finally {
      setBusy(false)
    }
  }

  function applyModel() {
    const b = brands.data?.find((x) => x.valor === brand)
    onPick({ marca: b?.nome, modelo: model })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Buscar na tabela FIPE" description="Escolha marca e modelo, ou informe o código FIPE para trazer o valor.">
        {failed && <p role="alert" className="mb-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">A consulta FIPE está indisponível agora. Você pode preencher os dados manualmente.</p>}
        <div className="flex flex-col gap-3">
          <Field label="Marca" htmlFor="fipe-marca">
            <Select id="fipe-marca" value={brand} onChange={(e) => { setBrand(e.target.value); setModel('') }} disabled={brands.isLoading}>
              <option value="">{brands.isLoading ? 'Carregando…' : 'Selecione'}</option>
              {brands.data?.map((b) => <option key={b.valor} value={b.valor}>{b.nome}</option>)}
            </Select>
          </Field>
          <Field label="Modelo" htmlFor="fipe-modelo">
            <Select id="fipe-modelo" value={model} onChange={(e) => setModel(e.target.value)} disabled={!brand || models.isLoading}>
              <option value="">{models.isLoading ? 'Carregando…' : 'Selecione'}</option>
              {models.data?.map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Button type="button" variant="outline" disabled={!model} onClick={applyModel}>Usar marca e modelo</Button>
          <hr className="border-border" />
          <Field label="Código FIPE (para trazer o valor)" htmlFor="fipe-code" hint="Ex.: 001004-9. Usamos o ano do veículo para escolher o valor.">
            <Input id="fipe-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Button type="button" disabled={!code.trim() || busy} onClick={applyPrice}>{busy ? 'Buscando…' : 'Buscar valor FIPE'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
