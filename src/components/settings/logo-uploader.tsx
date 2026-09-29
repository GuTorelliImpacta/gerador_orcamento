'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { resizeLogo } from '@/lib/image'
import { useInvalidate, useWorkshop } from '@/hooks/use-workshop'

export function LogoUploader() {
  const { data: workshop } = useWorkshop()
  const invalidate = useInvalidate()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(file: File) {
    if (!workshop) return
    setBusy(true)
    try {
      const blob = await resizeLogo(file)
      const ext = blob.type === 'image/png' ? 'png' : 'jpg'
      const path = `${workshop.id}/logo-${Date.now()}.${ext}`
      const supabase = createClient()
      const up = await supabase.storage.from('logos').upload(path, blob, { contentType: blob.type })
      if (up.error) throw up.error
      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      const { error } = await supabase.from('workshops').update({ logo_url: data.publicUrl }).eq('id', workshop.id)
      if (error) throw error
      invalidate('workshop')
      toast.success('Logo atualizada')
    } catch {
      toast.error('Não foi possível enviar a logo. Use uma imagem PNG ou JPG.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!workshop) return
    const { error } = await createClient().from('workshops').update({ logo_url: null }).eq('id', workshop.id)
    if (error) toast.error('Não foi possível remover a logo.')
    else invalidate('workshop')
  }

  return (
    <div className="flex items-center gap-4">
      <div className="grid size-24 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-card">
        {workshop?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={workshop.logo_url} alt="Logo da oficina" className="size-full object-contain" />
        ) : (
          <ImagePlus className="size-7 text-muted" aria-hidden />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Escolher logo"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Enviando…' : workshop?.logo_url ? 'Trocar logo' : 'Enviar logo'}
        </Button>
        {workshop?.logo_url && (
          <Button type="button" variant="ghost" onClick={remove}>
            <Trash2 className="size-4" aria-hidden /> Remover
          </Button>
        )}
        <p className="text-xs text-muted">PNG ou JPG. Redimensionamos e comprimimos (máx. 500 KB).</p>
      </div>
    </div>
  )
}
