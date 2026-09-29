'use client'

import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DecimalInput, MaskedInput, MoneyInput } from '@/components/ui/masked-input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { useWorkshop } from '@/hooks/use-workshop'

export type FieldDef = {
  name: string
  label: string
  kind: 'text' | 'cpfcnpj' | 'phone' | 'money' | 'decimal' | 'int' | 'select' | 'email'
  required?: boolean
  options?: { value: string; label: string }[]
  /** retorna mensagem de erro */
  validate?: (value: unknown, form: Record<string, unknown>) => string | undefined
  visibleIf?: (form: Record<string, unknown>) => boolean
  span2?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any> & { id: string }

const digitsOnly = (s: string) => s.replace(/\D/g, '')
const PAGE = 20

function toForm(fields: FieldDef[], row?: AnyRow, defaults: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    const v = row ? row[f.name] : defaults[f.name]
    if (f.kind === 'money') out[f.name] = (v as number) ?? 0
    else if (f.kind === 'decimal' || f.kind === 'int') out[f.name] = v ?? null
    else out[f.name] = (v as string) ?? ''
  }
  return out
}

function toDb(fields: FieldDef[], form: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    const v = form[f.name]
    if (f.visibleIf && !f.visibleIf(form)) out[f.name] = f.kind === 'money' ? 0 : null
    else if (f.kind === 'cpfcnpj' || f.kind === 'phone') out[f.name] = digitsOnly(String(v ?? '')) || null
    else if (f.kind === 'money') out[f.name] = Number(v ?? 0)
    else if (f.kind === 'decimal' || f.kind === 'int') out[f.name] = v == null || v === '' ? null : f.kind === 'int' ? Math.round(Number(v)) : Number(v)
    else out[f.name] = String(v ?? '').trim() || (f.required ? '' : null)
  }
  return out
}

export interface ResourceManagerProps {
  table: 'customers' | 'vehicle_models' | 'catalog_items'
  singular: string
  fields: FieldDef[]
  searchColumns: string[]
  orderBy: { column: string; ascending?: boolean }
  row: (r: AnyRow) => { title: string; subtitle?: string; right?: string }
  filter?: Record<string, string>
  defaults?: Record<string, unknown>
  emptyText: string
  deleteRpc?: 'delete_customer'
  deleteWarning?: string
  toolbar?: React.ReactNode
  /** para revalidar ao terminar imports externos */
  refreshKey?: number
}

export function ResourceManager(p: ResourceManagerProps) {
  const { data: workshop } = useWorkshop()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<AnyRow | 'new' | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim().replace(/[,()%*]/g, ' ')); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const filterKey = JSON.stringify(p.filter ?? {})
  const queryKey = ['resource', p.table, debounced, page, filterKey, p.refreshKey]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = createClient().from(p.table).select('*', { count: 'exact' })
      for (const [k, v] of Object.entries(p.filter ?? {})) q = q.eq(k, v)
      if (debounced) q = q.or(p.searchColumns.map((c) => `${c}.ilike.%${debounced}%`).join(','))
      const { data, error, count } = await q
        .order(p.orderBy.column, { ascending: p.orderBy.ascending ?? true })
        .range(page * PAGE, page * PAGE + PAGE - 1)
      if (error) throw error
      return { rows: data as unknown as AnyRow[], count: count ?? 0 }
    },
  })

  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey: ['resource', p.table] }), [qc, p.table])

  const open = (row: AnyRow | 'new') => {
    setEditing(row)
    setForm(toForm(p.fields, row === 'new' ? undefined : row, { ...p.defaults, ...p.filter }))
    setErrors({})
  }

  const save = useMutation({
    mutationFn: async () => {
      const errs: Record<string, string> = {}
      for (const f of p.fields) {
        if (f.visibleIf && !f.visibleIf(form)) continue
        const v = form[f.name]
        if (f.required && (v == null || String(v).trim() === '')) errs[f.name] = 'Campo obrigatório'
        else if (f.validate) {
          const m = f.validate(v, form)
          if (m) errs[f.name] = m
        }
      }
      setErrors(errs)
      if (Object.keys(errs).length) throw new Error('validation')
      const payload = toDb(p.fields, form)
      const supabase = createClient()
      if (editing === 'new') {
        const { error } = await supabase.from(p.table).insert({ ...p.filter, ...payload, workshop_id: workshop!.id } as never)
        if (error) throw error
      } else {
        const { error } = await supabase.from(p.table).update(payload as never).eq('id', (editing as AnyRow).id)
        if (error) throw error
      }
    },
    onSuccess: () => { toast.success('Salvo'); setEditing(null); invalidate() },
    onError: (e: Error) => {
      if (e.message === 'validation') return
      toast.error(/duplicate|unique/i.test(e.message) ? 'Já existe um item igual a este.' : 'Não foi possível salvar. Tente de novo.')
    },
  })

  async function remove(row: AnyRow) {
    const msg = `Excluir "${p.row(row).title}"?${p.deleteWarning ? `\n\n${p.deleteWarning}` : ''}`
    if (!confirm(msg)) return
    const supabase = createClient()
    const { error } = p.deleteRpc
      ? await supabase.rpc(p.deleteRpc, { p_id: row.id })
      : await supabase.from(p.table).delete().eq('id', row.id)
    if (error) return toast.error('Não foi possível excluir.')
    invalidate()
    toast.success('Excluído', {
      action: p.deleteRpc ? undefined : {
        label: 'Desfazer',
        onClick: async () => {
          const { error: e2 } = await supabase.from(p.table).insert(row as never)
          if (e2) toast.error('Não foi possível desfazer.')
          else invalidate()
        },
      },
    })
  }

  const pages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted" aria-hidden />
          <Input aria-label="Buscar" placeholder="Buscar…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {p.toolbar}
        <Button onClick={() => open('new')}><Plus className="size-4" aria-hidden /> Novo</Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : data && data.rows.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {data.rows.map((r) => {
            const v = p.row(r)
            return (
              <li key={r.id}>
                <Card className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{v.title}</p>
                    {v.subtitle && <p className="truncate text-sm text-muted">{v.subtitle}</p>}
                  </div>
                  {v.right && <span className="shrink-0 text-sm font-medium">{v.right}</span>}
                  <Button variant="ghost" size="icon" aria-label={`Editar ${v.title}`} onClick={() => open(r)}><Pencil className="size-4" aria-hidden /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Excluir ${v.title}`} onClick={() => remove(r)}><Trash2 className="size-4" aria-hidden /></Button>
                </Card>
              </li>
            )
          })}
        </ul>
      ) : (
        <Card className="py-10 text-center text-muted">
          {debounced ? 'Nada encontrado para essa busca.' : p.emptyText}
        </Card>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Paginação">
          <Button variant="outline" size="icon" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></Button>
          <span className="text-sm">Página {page + 1} de {pages}</span>
          <Button variant="outline" size="icon" aria-label="Próxima página" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></Button>
        </nav>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === 'new' ? `Novo ${p.singular}` : `Editar ${p.singular}`}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="grid gap-3 sm:grid-cols-2" noValidate>
            {p.fields.filter((f) => !f.visibleIf || f.visibleIf(form)).map((f) => {
              const id = `f-${f.name}`
              const set = (v: unknown) => setForm((s) => ({ ...s, [f.name]: v }))
              const val = form[f.name]
              return (
                <Field key={f.name} label={f.label + (f.required ? ' *' : '')} htmlFor={id} error={errors[f.name]} className={f.span2 ? 'sm:col-span-2' : undefined}>
                  {f.kind === 'select' ? (
                    <Select id={id} value={String(val ?? '')} onChange={(e) => set(e.target.value)}>
                      {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  ) : f.kind === 'money' ? (
                    <MoneyInput id={id} value={Number(val ?? 0)} onValueChange={set} />
                  ) : f.kind === 'decimal' || f.kind === 'int' ? (
                    <DecimalInput id={id} value={(val as number | null) ?? null} onValueChange={set} />
                  ) : f.kind === 'cpfcnpj' ? (
                    <MaskedInput id={id} mask="cpfcnpj" value={String(val ?? '')} onValueChange={set} />
                  ) : f.kind === 'phone' ? (
                    <MaskedInput id={id} type="tel" mask="phone" value={String(val ?? '')} onValueChange={set} />
                  ) : (
                    <Input id={id} type={f.kind === 'email' ? 'email' : 'text'} inputMode={f.kind === 'email' ? 'email' : undefined} value={String(val ?? '')} onChange={(e) => set(e.target.value)} />
                  )}
                </Field>
              )
            })}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
