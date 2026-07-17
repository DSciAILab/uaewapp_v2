'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface CreatableComboboxProps {
  /** Existing values to pick from (e.g. every team already in the database). */
  options: string[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
}

/**
 * A combobox that also accepts a value not in the list (UAE-20).
 *
 * Team Gym and Fighting Style are open sets — 292 gyms already, and new ones
 * arrive every event. A closed dropdown would force the staff to misfile a new
 * gym under a wrong one; a plain text box loses the benefit of picking an
 * existing spelling. This does both: type to filter, and if nothing matches,
 * "Add …" commits what you typed.
 */
export function CreatableCombobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select or type…',
  searchPlaceholder = 'Search or type to add…',
  disabled = false,
  className,
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const trimmed = query.trim()
  const lower = trimmed.toLowerCase()
  const filtered = trimmed
    ? options.filter((o) => o.toLowerCase().includes(lower))
    : options
  const exact = options.some((o) => o.toLowerCase() === lower)

  const commit = (v: string) => {
    onValueChange(v)
    setQuery('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
          disabled={disabled}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList className="max-h-[300px]">
            {filtered.length === 0 && !trimmed && <CommandEmpty>No options yet.</CommandEmpty>}
            {trimmed && !exact && (
              <CommandGroup>
                <CommandItem value={`__add__${trimmed}`} onSelect={() => commit(trimmed)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((o) => (
                  <CommandItem key={o} value={o} onSelect={() => commit(o)}>
                    <Check className={cn('mr-2 h-4 w-4', value === o ? 'opacity-100' : 'opacity-0')} />
                    {o}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
