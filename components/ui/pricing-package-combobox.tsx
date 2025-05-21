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

interface PricingPackage {
  id: string
  name: string
  price: number
}

interface PricingPackageComboboxProps {
  packages: PricingPackage[]
  value: string
  onChange: (value: string) => void
  onPriceChange?: (price: number) => void
  isLoading?: boolean
  onAddPackage?: () => void
  className?: string
}

export function PricingPackageCombobox({
  packages,
  value,
  onChange,
  onPriceChange,
  isLoading = false,
  onAddPackage,
  className,
}: PricingPackageComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Filter packages based on search query
  const filteredPackages = React.useMemo(() => {
    if (!searchQuery) return packages
    return packages.filter((pkg) =>
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [packages, searchQuery])

  // Handle selection with price change
  const handleSelect = React.useCallback((packageId: string) => {
    onChange(packageId)
    
    if (onPriceChange) {
      const selectedPackage = packages.find(pkg => pkg.id === packageId)
      if (selectedPackage) {
        onPriceChange(selectedPackage.price)
      }
    }
    
    setOpen(false)
  }, [onChange, onPriceChange, packages])

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
            ? packages.find((pkg) => pkg.id === value)?.name || "Select a package"
            : "Select a package" + (onAddPackage ? " *" : "...")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command className="w-full">
          <CommandInput
            placeholder="Search packages..."
            onValueChange={setSearchQuery}
            className="w-full"
          />
          <CommandList className="w-full">
            <CommandEmpty>
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                  <span>Loading packages...</span>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">No packages found</p>
                  {onAddPackage && (
                    <Button
                      variant="link"
                      className="mt-2 p-0"
                      onClick={() => {
                        setOpen(false)
                        onAddPackage()
                      }}
                    >
                      Add a package
                    </Button>
                  )}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup className="w-full">
              {filteredPackages.map((pkg) => (
                <CommandItem
                  key={pkg.id}
                  value={pkg.id}
                  className="w-full"
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === pkg.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">{pkg.name}</span>
                  <span className="text-muted-foreground">${pkg.price.toFixed(2)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
