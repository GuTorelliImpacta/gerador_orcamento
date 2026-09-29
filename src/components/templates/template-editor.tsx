'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PdfPreview } from '@/components/pdf/pdf-preview'
import { createClient } from '@/lib/supabase/client'
import { FONTES, LAYOUTS } from '@/lib/constants'
import { isHex, passesAA } from '@/lib/contrast'
import { samplePdfData } from '@/lib/pdf/sample'
import { cn } from '@/lib/utils'
import { useInvalidate, useTemplates, useWorkshop, type Template, type Workshop } from '@/hooks/use-workshop'

type Draft = Omit<Template, 'id' | 'workshop_id' | 'created_at'>

const toDraft = (t: Template): Draft => ({
  nome: t.nome, cor_primaria: t.cor_primaria, cor_secundaria: t.cor_secundaria, fonte: t.fonte, layout: t.layout,
  mostrar_fipe: t.mostrar_fipe, mostrar_chassi: t.mostrar_chassi, mostrar_codigo_peca: t.mostrar_codigo_peca,
  mostrar_assinatura: t.mostrar_assinatura, is_default: t.is_default,
})

function ColorField({ label, value, onChange, warn }: { label: string; value: string; onChange: (v: string) => void; warn?: string | null }) {
  return (
    <Field label={label} error={warn ?? undefined}>
      <div className="flex gap-2">
        <input type="color" aria-label={label} value={isHex(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} className="size-11 shrink-0 cursor-pointer rounded-lg border border-border bg-card p-1" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} aria-label={`${label} (código hex)`} />
      </div>
    </Field>
  )
}

export function TemplateEditor() {
  const { data: templates } = useTemplates()
  const { data: workshop } = useWorkshop()
  if (!templates || !templates.length) return <Skeleton className="h-96 w-full" />
  return <Editor templates={templates} workshop={workshop ?? null} />
}

function Editor({ templates, workshop }: { templates: Template[]; workshop: Workshop | null }) {
  const invalidate = useInvalidate()
  const first = templates.find((t) => t.is_default) ?? templates[0]
  const [selectedId, setSelectedId] = useState<string>(first.id)
  const [draft, setDraft] = useState<Draft>(toDraft(first))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const selected = templates.find((t) => t.id === selectedId) ?? first

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const preview = useMemo(() => {
    if (!draft) return null
    const data = samplePdfData(draft)
    if (workshop) {
      data.workshop = {
        ...data.workshop,
        nome: workshop.nome_fantasia || workshop.nome,
        logo_url: workshop.logo_url,
      }
    }
    return data
  }, [draft, workshop])

  const patch = (p: Partial<Draft>) => { setDraft({ ...draft, ...p }); setDirty(true) }
  const pick = (id: string) => {
    if (dirty && !confirm('Descartar as alterações não salvas deste layout?')) return
    const t = templates.find((x) => x.id === id)!
    setSelectedId(id); setDraft(toDraft(t)); setDirty(false)
  }

  const primaryWarn = isHex(draft.cor_primaria) && !passesAA(draft.cor_primaria, '#ffffff') ? 'Cor clara: títulos podem ficar difíceis de ler no papel.' : null
  const secondaryWarn = isHex(draft.cor_secundaria) && !passesAA(draft.cor_secundaria, '#ffffff') ? 'Baixo contraste com o fundo branco. Use um tom mais escuro.' : null
  const invalid = !isHex(draft.cor_primaria) || !isHex(draft.cor_secundaria) || !draft.nome.trim()

  async function save(makeDefault = false) {
    if (invalid) return toast.error('Confira o nome e as cores (formato #RRGGBB).')
    setSaving(true)
    const supabase = createClient()
    if (makeDefault) {
      await supabase.from('pdf_templates').update({ is_default: false }).eq('workshop_id', selected!.workshop_id).neq('id', selected!.id)
    }
    const { error } = await supabase.from('pdf_templates').update({ ...draft!, is_default: makeDefault || draft!.is_default }).eq('id', selected!.id)
    setSaving(false)
    if (error) return toast.error('Não foi possível salvar o layout.')
    setDirty(false)
    invalidate('templates')
    toast.success(makeDefault ? 'Layout definido como padrão' : 'Layout salvo')
  }

  async function create() {
    const { data, error } = await createClient()
      .from('pdf_templates')
      .insert({ workshop_id: selected!.workshop_id, nome: `Layout ${templates!.length + 1}`, cor_primaria: draft!.cor_primaria, cor_secundaria: draft!.cor_secundaria, fonte: draft!.fonte, layout: draft!.layout })
      .select()
      .single()
    if (error || !data) return toast.error('Não foi possível criar o layout.')
    invalidate('templates')
    setDirty(false); setSelectedId(data.id); setDraft(toDraft(data))
  }

  async function remove() {
    if (selected!.is_default) return toast.error('Defina outro layout como padrão antes de excluir este.')
    if (!confirm(`Excluir o layout "${selected!.nome}"?`)) return
    const { error } = await createClient().from('pdf_templates').delete().eq('id', selected!.id)
    if (error) return toast.error('Não foi possível excluir.')
    const fallback = templates.find((t) => t.is_default) ?? first
    setDirty(false); setSelectedId(fallback.id); setDraft(toDraft(fallback))
    invalidate('templates')
    toast.success('Layout excluído')
  }

  const toggle = (key: 'mostrar_fipe' | 'mostrar_chassi' | 'mostrar_codigo_peca' | 'mostrar_assinatura', label: string) => (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" className="size-5" checked={draft[key]} onChange={(e) => patch({ [key]: e.target.checked })} />
      {label}
    </label>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Layouts salvos">
          {templates.map((t) => (
            <button key={t.id} role="tab" aria-selected={t.id === selected.id} onClick={() => pick(t.id)}
              className={cn('flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm', t.id === selected.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card')}>
              {t.is_default && <Star className="size-3.5 fill-current" aria-label="Padrão" />} {t.nome}
            </button>
          ))}
          <Button variant="outline" onClick={create}><Plus className="size-4" aria-hidden /> Novo</Button>
        </div>

        <Card className="flex flex-col gap-4">
          <Field label="Nome do layout" htmlFor="tpl-nome"><Input id="tpl-nome" value={draft.nome} onChange={(e) => patch({ nome: e.target.value })} /></Field>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Modelo</legend>
            <div className="grid gap-2">
              {LAYOUTS.map((l) => (
                <label key={l.value} className={cn('flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3', draft.layout === l.value ? 'border-primary bg-primary/10' : 'border-border')}>
                  <input type="radio" name="layout" className="mt-1" checked={draft.layout === l.value} onChange={() => patch({ layout: l.value })} />
                  <span><span className="block font-medium">{l.label}</span><span className="text-xs text-muted">{l.desc}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Cor principal" value={draft.cor_primaria} onChange={(v) => patch({ cor_primaria: v })} />
            <ColorField label="Cor do texto" value={draft.cor_secundaria} onChange={(v) => patch({ cor_secundaria: v })} />
          </div>
          {(primaryWarn || secondaryWarn) && (
            <p role="status" className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {primaryWarn ?? secondaryWarn}
            </p>
          )}

          <Field label="Fonte" htmlFor="tpl-fonte">
            <Select id="tpl-fonte" value={draft.fonte} onChange={(e) => patch({ fonte: e.target.value })}>
              {FONTES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </Field>

          <div>
            <p className="text-sm font-medium">Mostrar no PDF</p>
            {toggle('mostrar_fipe', 'Valor FIPE')}
            {toggle('mostrar_chassi', 'Chassi')}
            {toggle('mostrar_codigo_peca', 'Código das peças')}
            {toggle('mostrar_assinatura', 'Campo de assinatura do cliente')}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save(false)} disabled={saving || !dirty}><Check className="size-4" aria-hidden /> Salvar</Button>
            {!selected.is_default && <Button variant="outline" onClick={() => save(true)} disabled={saving}><Star className="size-4" aria-hidden /> Usar como padrão</Button>}
            {!selected.is_default && <Button variant="ghost" onClick={remove}><Trash2 className="size-4" aria-hidden /> Excluir</Button>}
          </div>
        </Card>
      </div>

      <div className="min-w-0">{preview && <PdfPreview data={preview} />}</div>
    </div>
  )
}
