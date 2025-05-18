"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Client {
  id: string
  name: string
}

interface ClientComboboxProps {
  clients: Client[]
  value: string
  onChange: (value: string) => void
  isLoading?: boolean
  onAddClient?: () => void
  className?: string
}

export function ClientCombobox({
  clients,
  value,
  onChange,
  isLoading = false,
  onAddClient,
  className,
}: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Filter clients based on search query
  const filteredClients = React.useMemo(() => {
    if (!searchQuery) return clients
    return clients.filter((client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [clients, searchQuery])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value
            ? clients.find((client) => client.id === value)?.name || "Select a client"
            : "Select a client" + (onAddClient ? " *" : "...")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command className="w-full">
          <CommandInput
            placeholder="Search clients..."
            onValueChange={setSearchQuery}
            className="w-full"
          />
          <CommandList className="w-full">
            <CommandEmpty>
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                  <span>Loading clients...</span>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">No clients found</p>
                  {onAddClient && (
                    <Button
                      variant="link"
                      className="mt-2 p-0"
                      onClick={() => {
                        setOpen(false)
                        onAddClient()
                      }}
                    >
                      Add a client
                    </Button>
                  )}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup className="w-full">
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  className="w-full"
                  onSelect={(currentValue) => {
                    onChange(currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
