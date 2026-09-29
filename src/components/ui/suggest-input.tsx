'use client'

import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from './input'

/** Campo com sugestões (autocomplete): busca com debounce e cache do TanStack Query. */
export function SuggestInput<T>({
  id, value, onChange, queryKey, fetcher, render, onPick, minChars = 2, placeholder, disabled,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  queryKey: string
  fetcher: (q: string) => Promise<T[]>
  render: (item: T) => React.ReactNode
  onPick: (item: T) => void
  minChars?: number
  placeholder?: string
  disabled?: boolean
}) {
  const [debounced, setDebounced] = useState(value)
  const [open, setOpen] = useState(false)
  const listId = useId()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 250)
    return () => clearTimeout(t)
  }, [value])

  const { data } = useQuery({
    queryKey: ['suggest', queryKey, debounced],
    queryFn: () => fetcher(debounced),
    enabled: open && debounced.length >= minChars,
    staleTime: 60_000,
  })

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && !!data?.length}
        aria-controls={listId}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      />
      {open && data && data.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {data.map((item, i) => (
            <li key={i} role="option" aria-selected={false}>
              <button type="button" className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-border/50" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(item); setOpen(false) }}>
                {render(item)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
