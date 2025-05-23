"use client"

import * as React from "react"
import { X, Check, ChevronsUpDown, Plus } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface Client {
  id: string
  name: string
}

interface MultiClientSelectProps {
  clients: Client[]
  selectedClientIds: string[]
  onSelect: (clientIds: string[]) => void
  onAddClient?: () => void
  isLoading?: boolean
  className?: string
  placeholder?: string
}

export function MultiClientSelect({
  clients,
  selectedClientIds,
  onSelect,
  onAddClient,
  isLoading = false,
  className,
  placeholder = "Select clients..."
}: MultiClientSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Get selected client objects
  const selectedClients = React.useMemo(() => {
    return clients.filter(client => selectedClientIds.includes(client.id))
  }, [clients, selectedClientIds])

  // Filter clients based on search query
  const filteredClients = React.useMemo(() => {
    if (!searchQuery) return clients
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [clients, searchQuery])

  // Toggle client selection
  const toggleClient = (clientId: string) => {
    if (selectedClientIds.includes(clientId)) {
      onSelect(selectedClientIds.filter(id => id !== clientId))
    } else {
      onSelect([...selectedClientIds, clientId])
    }
  }

  // Remove a selected client
  const removeClient = (clientId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect(selectedClientIds.filter(id => id !== clientId))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-10",
            selectedClientIds.length > 0 ? "h-auto" : "h-10",
            className
          )}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selectedClients.length > 0 ? (
              selectedClients.map(client => (
                <Badge
                  key={client.id}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {client.name}
                  <span
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => removeClient(client.id, e)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </span>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command className="w-full">
          <CommandInput
            placeholder="Search clients..."
            onValueChange={setSearchQuery}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <div className="py-6 text-center text-sm">Loading clients...</div>
              ) : (
                <div className="py-6 text-center text-sm">
                  No clients found.
                  {onAddClient && (
                    <Button
                      variant="link"
                      className="h-auto p-0 pl-1 text-sm"
                      onClick={() => {
                        setOpen(false)
                        onAddClient()
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add new client
                    </Button>
                  )}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredClients.map(client => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={() => {
                    toggleClient(client.id)
                  }}
                >
                  <div className="flex items-center">
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        selectedClientIds.includes(client.id)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <span>{client.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
