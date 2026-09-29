'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Row } from '@/lib/supabase/database.types'

export type Workshop = Row<'workshops'>
export type Settings = Row<'workshop_settings'>
export type Template = Row<'pdf_templates'>

export function useWorkshop() {
  return useQuery({
    queryKey: ['workshop'],
    queryFn: async () => {
      const { data, error } = await createClient().from('workshops').select('*').single()
      if (error) throw error
      return data as Workshop
    },
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await createClient().from('workshop_settings').select('*').single()
      if (error) throw error
      return data as Settings
    },
  })
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('pdf_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at')
      if (error) throw error
      return data as Template[]
    },
  })
}

export function useInvalidate() {
  const qc = useQueryClient()
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
}
